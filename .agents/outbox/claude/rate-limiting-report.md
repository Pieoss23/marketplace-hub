# Report — Rate limiting sugli endpoint di autenticazione

## Stato

`READY_FOR_REVIEW`

## Contesto

Incremento richiesto direttamente dall'utente in sessione interattiva. Il "reset
password" proposto come alternativa è stato scartato dall'utente: il progetto non ha
alcuna infrastruttura email (nessun nodemailer/SMTP, V1 dichiaratamente mock-only), e
la scelta della modalità di consegna del token era una decisione di prodotto non
presa. Ho quindi cercato un altro gap reale e trovato: **nessun rate limiting
esisteva nell'API**, in particolare `POST /api/auth/login` non aveva alcuna
protezione da brute-force.

## Riepilogo

- Aggiunta dipendenza `@nestjs/throttler@^6.5.0`.
- `apps/api/src/app.module.ts`: `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])`
  + `{ provide: APP_GUARD, useClass: ThrottlerGuard }` — limite di base (60
  richieste/minuto per IP) su tutta l'API come difesa DoS generica.
- `apps/api/src/auth/auth.controller.ts`: override `@Throttle(...)` più stretti sugli
  endpoint effettivamente "indovinabili": `signup` (20/min — anti account-spam),
  `login` (10/min — la vera superficie di brute-force sulla password), `refresh`
  (20/min — più permissivo perché il traffico da rinnovo silenzioso/multi-tab è
  fisiologicamente a raffica). `me`/`logout` restano al solo limite globale: entrambi
  richiedono già un token/refresh-token valido, quindi non sono superficie di
  indovina-credenziali.
- Limiti dimensionati contando le chiamate reali nella suite e2e esistente
  (`auth.e2e-spec.ts` riusa una singola istanza dell'app Nest tra tutti i suoi test,
  quindi i contatori persistono nell'intero file): 11 signup, 3 login, 6 refresh —
  tutti i limiti scelti stanno comodamente sopra questi numeri.
- Nessuna nuova variabile d'ambiente: i limiti sono costanti nel codice, non c'è oggi
  un bisogno reale di differenziarli per ambiente in un progetto V1 senza deploy
  multipli.

## Test e verifiche

- **Nuovo file isolato** `apps/api/test/auth-rate-limit.e2e-spec.ts`: istanza Nest
  dedicata (contatori del throttler indipendenti da `auth.e2e-spec.ts`), spara 11
  richieste rapide a `POST /api/auth/login` con credenziali fisse e inesistenti —
  `ThrottlerGuard` gira prima dell'handler, quindi le prime 10 risultano `401`
  (credenziali sbagliate, la guardia le lascia passare) e l'11ª è `429`. Dimostra che
  la guardia è davvero collegata alla rotta, non solo configurata.
- **Suite e2e esistente invariata e verde**: `auth.e2e-spec.ts` (11 signup/3 login/6
  refresh nello stesso'istanza app) continua a passare senza modifiche — è di per sé
  la controprova che i limiti scelti non collidono con l'uso legittimo/di test.
- **121/121 test verdi** (era 120 prima, +1 il nuovo file), lint e typecheck puliti.

## File principali

- `apps/api/package.json` (nuova dipendenza)
- `apps/api/src/app.module.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/test/auth-rate-limit.e2e-spec.ts` (nuovo)

## Nota

Nessuna modifica al frontend: un 429 da questi endpoint viene già mostrato
correttamente dall'`extractErrorMessages` esistente in `apps/web` (legge
`error.error.message` da qualunque risposta non-2xx, incluso il body di default di
`ThrottlerException`).
