# Report — Refresh token per l'autenticazione JWT

## Stato

`READY_FOR_REVIEW`

## Contesto

Incremento richiesto direttamente dall'utente in sessione interattiva (non tramite task
file in `.agents/inbox/claude/`) sopra la V1 Announcement, già completa. Prima di questo
lavoro l'autenticazione emetteva un solo JWT (7 giorni), senza alcuna revoca lato
server — `AuthService.logout()` sul frontend si limitava a svuotare `localStorage`
(limite dichiarato esplicitamente in `auth-report.md`, "Limitazioni note").

## Riepilogo

### Backend (`apps/api`)

- Nuovo modello Prisma `RefreshToken` (hash SHA-256 del token opaco, mai il valore
  grezzo; `onDelete: Cascade` da `User`), migrazione
  `20260724165519_add_refresh_tokens` applicata per davvero contro Postgres locale.
- `AuthConfig` esteso con `refreshTokenExpiresInSeconds` (default 30 giorni).
  **`JWT_EXPIRES_IN_SECONDS` di default abbassato da 7 giorni a 15 minuti** — è il punto
  centrale della feature: un access token che trapela ora vive minuti, non giorni.
- `AuthService.refresh(rawToken)`: rotazione transazionale (`$transaction`) — il token
  presentato viene revocato e uno nuovo viene emesso atomicamente. Riuso di un token già
  revocato è trattato come segnale di compromissione: **tutte** le sessioni attive
  dell'utente vengono revocate, forzando un nuovo login ovunque (non solo rifiuto della
  singola richiesta).
- `AuthService.logout(rawToken)`: nuova revoca reale lato server (prima non esisteva).
- Nuovi endpoint pubblici `POST /api/auth/refresh` e `POST /api/auth/logout` (pubblici
  perché autenticano tramite il refresh token stesso, che può sopravvivere a un access
  token già scaduto).
- Contratti condivisi estesi in `packages/contracts/src/auth.ts`:
  `AuthResponse.refreshToken` (ora richiesto), `RefreshRequest`, `LogoutRequest`.

### Frontend (`apps/web`)

- `AuthService`: sessione ora include `refreshToken`; nuovo `refreshSession()` con
  deduplica delle chiamate concorrenti (`shareReplay` + flag `refreshInFlight`, un solo
  `POST /auth/refresh` anche con N richieste 401 simultanee); `logout()` invia una
  revoca best-effort al server oltre a pulire lo stato locale.
- Nuovo `authRefreshInterceptor` (registrato dopo `authInterceptor` in
  `app.config.ts`): su un 401 (esclusi gli endpoint di auth stessi) tenta un refresh
  silenzioso e ripete la richiesta originale una volta; se il refresh fallisce, forza
  `logout()` e redirect a `/login`. Rimane un interceptor funzionale (nessun
  `HttpBackend` necessario — il `next` di un interceptor funzionale è già "il resto
  della catena da qui in poi", non un restart).

## Test e verifiche

- **Backend**: 119/119 verdi (unit + e2e reali contro Postgres via
  `docker compose up -d postgres`), lint e typecheck puliti, `nest build` pulito.
  Nuovi casi: rotazione, token sconosciuto, token scaduto-ma-non-revocato (nessuna
  revoca di massa), riuso di token revocato (revoca di massa + verifica che anche il
  token della prima rotazione risulti ucciso), logout → refresh successivo rifiutato.
- **Contracts**: build pulita.
- **Frontend**: `tsc --noEmit` pulito sia su `tsconfig.app.json` che su
  `tsconfig.spec.json` (include tutti gli spec, nuovi e modificati); `eslint .`
  invocato direttamente (bypassando il wrapper `ng`) pulito.
- **`ng build` / `ng test` / `ng serve` non eseguibili in questo ambiente**: la
  toolchain Angular CLI installata (yargs@18 nella catena di `@angular/cli`) richiede
  Node ≥20.19/22.12 a runtime — non solo come check di versione bypassabile, ma perché
  `require()` di un modulo `.mjs` ESM-only di yargs fallisce sotto Node 18 in CJS a
  prescindere. Questa macchina ha solo Node 18.19.1 disponibile (nessun nvm/fnm/volta
  installato). Confermato non essere una regressione di questa sessione: `auth-report.md`
  del 23/07 riportava "Frontend: 31/31, lint/typecheck/build puliti" con lo stesso
  ambiente, quindi qualcosa nelle dipendenze (`@angular/cli`/`yargs`) è cambiato tra il
  23/07 e oggi in modo indipendente da questo lavoro. Non ho tentato di downgradare le
  dipendenze né di installare un Node alternativo per non rischiare di rompere lo stato
  condiviso del monorepo su cui lavora anche Codex. **Verifica manuale in browser reale
  (silent refresh, logout, redirect su refresh fallito) non eseguita per questo
  motivo** — da fare non appena Node ≥20.19 sarà disponibile in questo ambiente, o in CI
  se già lì configurato con la versione corretta.

## File principali

- `apps/api/prisma/schema.prisma`,
  `apps/api/prisma/migrations/20260724165519_add_refresh_tokens/`
- `apps/api/src/auth/refresh-token.util.ts` (nuovo)
- `apps/api/src/auth/auth.service.ts`, `auth.service.spec.ts`
- `apps/api/src/auth/auth.controller.ts`, `auth-api.exception.ts`
- `apps/api/src/auth/dto/refresh.dto.ts`, `dto/logout.dto.ts` (nuovi),
  `dto/auth-response.dto.ts`
- `apps/api/src/config/configuration.ts`
- `apps/api/test/auth.e2e-spec.ts`
- `packages/contracts/src/auth.ts`, `index.ts`
- `apps/web/src/app/auth/auth.service.ts`,
  `auth-refresh.interceptor.ts` (nuovo), `auth-refresh.interceptor.spec.ts` (nuovo)
- `apps/web/src/app/app.config.ts`
- `apps/web/src/app/auth/auth.service.spec.ts`, `auth.interceptor.spec.ts`,
  `auth.guard.spec.ts`, `login.component.spec.ts`, `signup.component.spec.ts`,
  `apps/web/src/app/shell.component.spec.ts` (fixture aggiornate con `refreshToken`)
- `.env.example`, `.env` (root)

## Nota per l'orchestratore / Codex

Tocca `packages/contracts/src/auth.ts` (campo `refreshToken` reso obbligatorio su
`AuthResponse`) e `apps/api`/`apps/web`. **Non ho toccato `apps/extension`**, di
competenza di Codex. Verificato che il cambiamento è non-breaking lì:
`apps/extension/src/lib/auth-client.ts` e `apps/extension/src/lib/config.ts` importano
`AuthResponse` solo come tipo e controllano a runtime solo `accessToken` +
`user.{id,email}`; i fixture dei test (`apps/extension/test/auth-client.spec.ts`) sono
oggetti non tipizzati passati a `JSON.stringify`. L'estensione ignorerà semplicemente il
nuovo campo `refreshToken` e continuerà a richiedere un nuovo login sul 401, come oggi.
Adottare il refresh lì è un'opzione futura, non un requisito di questo cambiamento.
