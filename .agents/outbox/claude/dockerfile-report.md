# Report — Dockerfile di produzione per apps/api

## Stato

`READY_FOR_REVIEW`

## Contesto

Capstone del filone di hardening: gli ultimi increment (readiness probe, shutdown
hooks, validazione env) hanno senso solo dentro un container. Mancava il Dockerfile
per l'API — ora c'è, ed è **verificato con build reale + smoke test**.

## Design

`apps/api/Dockerfile` (multi-stage, Node 20 per `engines.node`) + `.dockerignore`
alla radice (il build context è la radice del monorepo: serve lockfile + `packages/*`).

- **base**: `node:20-slim`, `corepack enable` (pnpm 10.30.0 da `packageManager`),
  `openssl` installato (necessario al query engine di Prisma).
- **build**: copia i manifest di *tutti* i workspace (servono a pnpm per validare il
  frozen-lockfile) →  `pnpm install --frozen-lockfile --filter @marketplace-hub/api...`
  (installa solo il sottoalbero dell'API) → **`prisma generate` PRIMA della build**
  (i tipi del client Prisma sono un prerequisito di `tsc`) → `pnpm --filter …api… build`
  (compila domain/contracts/connector-sdk + api) → `pnpm deploy --prod --legacy /app`
  (bundle di produzione con dev-deps eliminate).
- **runner**: `node:20-slim`, `NODE_ENV=production`, utente non-root `node`,
  `CMD node dist/main.js`.

## Tre trappole reali risolte durante la verifica (build iterata, non indovinata)

1. **Ordine build/generate**: `nest build` girava prima di `prisma generate` → 44
   errori TS (`PrismaClient`, delegate `.listing`/`.publication` inesistenti). In
   locale non si vedeva perché il client era già generato da sessioni precedenti.
   Invertito l'ordine.
2. **`pnpm deploy` in pnpm 10** rifiuta i workspace non-injected senza `--legacy`.
   Aggiunto il flag.
3. **Client Prisma assente dal bundle**: `prisma generate` scrive nella dir sibling
   `.prisma` dentro lo store pnpm, che `deploy` non copia → il container crashava a
   startup con `MODULE_NOT_FOUND` su `.prisma/client`. Aggiunto un passo che copia
   `.prisma` accanto al `@prisma/client` deployato (path globbato, robusto a un bump
   di versione).

Aggiunto anche `"files": ["dist", "prisma"]` a `apps/api/package.json`: senza, `pnpm
deploy` non includerebbe `dist` (gitignored). Cambiamento innocuo (il package è
`private`, `files` conta solo per pack/deploy).

## Verifica (eseguita davvero in questo ambiente)

```
docker build -f apps/api/Dockerfile -t marketplace-hub-api:test .   # build OK
docker run --network reseller_cross_default \
  -e DATABASE_URL=postgresql://…@postgres:5432/… -e JWT_SECRET=… marketplace-hub-api:test
```
- Container avviato: NestJS parte pulito, tutte le rotte montate.
- `GET /api/health` → `{status:"ok",...}`.
- `GET /api/health/ready` → **200 `{status:"ready",database:"up"}`** — prova che il
  client Prisma è nel bundle e la connessione a Postgres funziona dal container (sulla
  rete compose `reseller_cross_default`, host `postgres`).

`.env` è escluso dal build context (`.dockerignore`) — nessun segreto finisce
nell'immagine; le variabili si passano a runtime con `-e`.

## Limiti noti / follow-up

- **Immagine 673MB**: corretta ma pesante (slim + node_modules di prod completi +
  engine Prisma). Ottimizzabile in seguito (base distroless/alpine, prune ulteriore) —
  non fatto ora per privilegiare correttezza e verificabilità.
- Nessun `HEALTHCHECK` nel Dockerfile né orchestrazione: la readiness probe esiste
  (`/api/health/ready`), ma il wiring a un `HEALTHCHECK`/probe k8s è lasciato a chi
  fa il deploy.
- L'immagine di test `marketplace-hub-api:test` è rimasta in locale (rimuovibile con
  `docker rmi marketplace-hub-api:test`).

## File principali

- `apps/api/Dockerfile` (nuovo)
- `.dockerignore` (nuovo, radice)
- `apps/api/package.json` (campo `files`)
