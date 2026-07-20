 # Handoff frontend e package condivisi

> **Stato**: handoff storico del 10 luglio 2026. I punti in "Conflitti da
> verificare al merge" risultano risolti (ownership di `contracts`, versioni
> TypeScript allineate, porta/prefisso API coerenti col proxy, script e
> lockfile root presenti, configurazione Git reale). Il contenuto resta come
> riferimento sulle assunzioni iniziali, non riflette lo stato corrente
> dell'implementazione: vedi `docs/architecture/overview.md` per quello.

## Output prodotto

- applicazione Angular standalone in `apps/web`, con routing, `HttpClient`, ambiente, proxy locale, ESLint, Prettier e test;
- package compilabili `contracts`, `domain` e `connector-sdk`;
- contratto health esportato da `@marketplace-hub/contracts`;
- documenti in `docs/architecture`, `docs/project-plan` e `docs/integration`.

## Assunzioni

- in sviluppo il backend ascolta su `http://localhost:3000`;
- il browser usa sempre il percorso relativo `/api`, così deployment e sviluppo condividono lo stesso contratto;
- `timestamp` è una stringa ISO 8601 e viene formattata solo dalla UI;
- il backend gestisce il prefisso `/api`;
- `domain` e `connector-sdk` restano volutamente privi di concetti applicativi in questa fase.

## Contratto health

```http
GET /api/health
```

```json
{
  "status": "ok",
  "service": "marketplace-hub-api",
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

La definizione TypeScript canonica è `HealthResponse` in `packages/contracts/src/health-response.ts`. Il frontend la importa dal solo entry point pubblico `@marketplace-hub/contracts`.

## Comandi

Dopo avere integrato i workspace root:

```bash
pnpm install
pnpm --filter @marketplace-hub/contracts build
pnpm --filter @marketplace-hub/web build
pnpm --filter @marketplace-hub/web lint
pnpm --filter @marketplace-hub/web type-check
pnpm --filter @marketplace-hub/web test
pnpm --filter @marketplace-hub/domain type-check
pnpm --filter @marketplace-hub/connector-sdk type-check
```

Per lo sviluppo, avviare il backend sulla porta 3000 e poi eseguire `pnpm --filter @marketplace-hub/web start`.

## Conflitti da verificare al merge

- ownership condivisa di `packages/contracts`, in particolare nome package, modulo ESM ed export health;
- versioni TypeScript e convenzioni `tsconfig` stabilite nei file root;
- porta del backend e prefisso globale `/api` rispetto al proxy frontend;
- script root e lockfile creati dall'altro agente;
- eventuale documentazione architetturale creata in parallelo;
- presenza di una configurazione Git reale prima della creazione del commit.
