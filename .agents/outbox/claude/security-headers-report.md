# Report — Security header HTTP via helmet

## Stato

`READY_FOR_REVIEW`

## Contesto

Terzo incremento di hardening in questa sessione (dopo refresh token e rate
limiting), stessa logica di prosecuzione. Il checklist di sicurezza base di NestJS
elenca CORS, rate limiting e `helmet` come i tre pilastri; CORS c'era già,
rate limiting è stato aggiunto in questa sessione, `helmet` mancava del tutto
(nessuna dipendenza, nessun riferimento in `apps/api`).

## Riepilogo

- Aggiunta dipendenza `helmet`.
- `apps/api/src/main.ts`: `app.use(helmet({ contentSecurityPolicy: false }))` subito
  dopo `app.enableCors(...)`. CSP disabilitata deliberatamente: è pensata per HTML
  renderizzato lato server e romperebbe la pagina Swagger UI già servita su
  `/api/docs` (script/stili inline bloccati) — comportamento noto e documentato
  dell'interazione helmet+Swagger, non specifico di questo progetto. Tutte le altre
  protezioni helmet restano attive (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, HSTS, ecc.).

## Nota tecnica rilevante

`main.ts`'s `bootstrap()` non viene mai eseguito dai test e2e: ogni file
`*.e2e-spec.ts` costruisce la propria `INestApplication` direttamente da `AppModule`
via `Test.createTestingModule(...)`, riapplicando manualmente prefix/pipe quando
serve (pattern già esistente, duplicato per file). Aggiungere `helmet` solo a
`main.ts` sarebbe stato reale per l'app in esecuzione ma **non testato**. Ho quindi
aggiunto la stessa chiamata `app.use(helmet({ contentSecurityPolicy: false }))` anche
in `health.e2e-spec.ts` (l'endpoint pubblico più semplice), seguendo lo stesso
pattern di duplicazione già in uso, invece di introdurre un helper di bootstrap
condiviso (refactor più ampio, fuori scope).

## Test e verifiche

- `health.e2e-spec.ts` esteso: asserisce `x-content-type-options: nosniff`,
  `x-frame-options: SAMEORIGIN` presenti e `content-security-policy` **assente**
  (prova esplicita che la disattivazione è intenzionale, non una dimenticanza).
- 121/121 test verdi (nessun nuovo file, stesso conteggio di prima — solo asserzioni
  aggiunte a un test esistente), lint e typecheck puliti.

## File principali

- `apps/api/package.json` (nuova dipendenza)
- `apps/api/src/main.ts`
- `apps/api/test/health.e2e-spec.ts`
