# Report — Readiness probe con verifica del database

## Stato

`READY_FOR_REVIEW`

## Contesto

Continuazione del filone di hardening backend. `GET /api/health` restituiva sempre
`{status:'ok'}` staticamente, **anche a database irraggiungibile** — `HealthService.check()`
non toccava mai Postgres. Come readiness probe per un orchestratore era fuorviante:
segnalava "sano" mentre il DB era giù, continuando a instradare traffico verso
un'istanza che non può servirlo.

`GET /api/health` resta invariato come **liveness** ping (lo usa così l'indicatore
"Backend operativo" del frontend, e il suo contratto tipizza `status` come letterale
`'ok'`): il gap era un endpoint di **readiness** separato.

## Scelta

Nessuna nuova dipendenza: `@nestjs/terminus` è l'opzione canonica ma sproporzionata
per un singolo check DB in un'app piccola. Check fatto a mano con il `PrismaService`
esistente (`$queryRaw\`SELECT 1\``), coerente con lo stile "sottile ed esplicito" del
repo e banalmente testabile con gli stessi mock già usati negli spec.

## Riepilogo

- Nuovo tipo `ReadinessResponse` in `packages/contracts` (`HealthResponse` invariato)
  + DTO Swagger `ReadinessResponseDto`.
- `HealthService.checkReadiness()`: inietta `PrismaService`, esegue `SELECT 1`; su
  successo `{status:'ready', database:'up'}`, su errore lo cattura e restituisce
  `{status:'not_ready', database:'down'}` (l'errore non viene propagato — è il
  controller a decidere lo status HTTP).
- `GET /api/health/ready`: **200** quando pronto, **503 Service Unavailable** quando no
  (via `@Res({ passthrough: true })` per impostare lo status preservando il body
  tipizzato, invece di lanciare un'eccezione che passerebbe da `AllExceptionsFilter`
  cambiando forma alla risposta).

## Test e verifiche

- `health.service.spec.ts`: DB su → `ready`; DB giù (`$queryRaw` rigetta) → `not_ready`
  con errore assorbito, non propagato.
- `health.controller.spec.ts`: percorso ready → body `ready` + `res.status(200)`;
  percorso down → body `not_ready` + `res.status(503)`.
- `health.e2e-spec.ts`: `GET /api/health/ready` → 200 + `status:'ready'` +
  `database:'up'` contro il Postgres reale già usato dalla suite. Il percorso 503 (DB
  giù) è coperto dal test unitario; simularlo in e2e vorrebbe dire abbattere il
  container condiviso a metà suite — non ne vale la pena.
- 132/132 test verdi, lint e typecheck puliti.

## File principali

- `packages/contracts/src/health-response.ts`, `index.ts`
- `apps/api/src/health/readiness-response.dto.ts` (nuovo)
- `apps/api/src/health/health.service.ts`, `health.controller.ts`
- `apps/api/src/health/health.service.spec.ts`, `health.controller.spec.ts`
- `apps/api/test/health.e2e-spec.ts`

## Nota

I tre commit precedenti (refresh token, retry pubblicazione, batch hardening) sono
ancora **solo locali** — il push è andato in timeout (nessuna credenziale GitHub in
questo ambiente). Da spingere dal terminale dell'utente.
