# Report — Login/Signup e autenticazione JWT

## Stato

`READY_FOR_REVIEW`

## Aggiornamento — conflitto risolto

Codex ha aggiunto login/sessione all'estensione (`apps/extension/src/lib/auth-client.ts`,
gestione sessione in `chrome.storage`, `fetchAnnouncements` ora richiede
`accessToken` e gestisce il `401` re-invitando l'utente ad accedere). Questo
chiude la condizione che mi aveva fatto lasciare le letture pubbliche: ho
riportato `JwtAuthGuard` a livello di classe su `AnnouncementsController` (tutti
gli endpoint, incluse le letture, richiedono autenticazione), aggiornato i test
e2e di conseguenza (110/110 verdi) e la documentazione
(`docs/architecture/overview.md`, `docs/api/announcement-publication-api.md`).
Nessuna azione ulteriore necessaria da parte di Codex su questo punto.

## Nota per l'orchestratore / Codex

Lavoro svolto su richiesta diretta dell'utente in sessione interattiva (non tramite
task file in `.agents/inbox/claude/`). Tocca `apps/api` e `apps/web`; non ho
toccato `apps/extension` (di competenza di Codex).

**Da allineare con Codex**: durante il lavoro ho osservato una modifica
concorrente allo stesso file (`apps/api/src/announcements/announcements.controller.ts`)
che spostava `@UseGuards(JwtAuthGuard)` a livello di classe (proteggendo anche
`GET /api/announcements` e `GET /api/announcements/:id`), accompagnata da un
test e2e che si aspettava `401` su quelle rotte senza token. L'ho riportato a
guardia solo sui metodi di mutazione (create/update/delete/enableChannel/
validate/publish), lasciando le letture pubbliche, perché
`apps/extension` (Codex) legge `/api/announcements` senza alcuna gestione di
token — confermato sia leggendo il codice dell'estensione sia
`docs/architecture/extension-web-integration.md`, che descrive esplicitamente
questo confine. Se l'intento di Codex era invece richiedere autenticazione
anche in lettura, è una decisione di prodotto che va presa insieme (implica
aggiungere login all'estensione stessa) e non risolta a colpi di commit
alternati sullo stesso controller.

## Riepilogo

### Backend (`apps/api/src/auth/`)

- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`.
- Password hashing con `node:crypto` `scrypt` (nessuna dipendenza nativa
  aggiuntiva tipo bcrypt); JWT via `@nestjs/jwt` (nuova dipendenza diretta).
- `JwtAuthGuard` + decorator `@CurrentUser()`; applicato per-endpoint sui soli
  metodi di mutazione di `AnnouncementsController`.
- Nuovo modello `User` in Prisma (`apps/api/prisma/schema.prisma`), migrazione
  `20260723163400_add_users` scritta a mano (Docker non disponibile all'inizio
  della sessione) e poi **applicata per davvero** con `prisma migrate deploy`
  contro Postgres locale una volta che Docker è diventato disponibile.
- Contratti condivisi aggiunti in `packages/contracts/src/auth.ts`
  (`SignupRequest`, `LoginRequest`, `AuthResponse`, `PublicUserResponse`).
- Config: `JWT_SECRET` / `JWT_EXPIRES_IN_SECONDS` in `.env.example` (fallback
  dev-only in codice, da sostituire fuori da locale).

### Frontend (`apps/web/src/app/auth/`)

- `AuthService` (signal-based, sessione in `localStorage`), `authInterceptor`
  (allega `Authorization: Bearer` quando presente), `authGuard` (redirect a
  `/login` con `returnUrl`).
- `LoginComponent` / `SignupComponent`.
- Nuovo `ShellComponent` come root bootstrap (barra sessione + logout) al
  posto di `AppComponent` diretto — **`AppComponent` non è stato toccato**,
  deliberatamente, per non collidere con le modifiche concorrenti di Codex lì
  (deep link `?announcementId=`, evidenziazione annuncio).
- `apps/web/src/index.html` aggiornato (`<app-shell>` invece di `<app-root>`).

## Test e verifiche

- Backend: 109/109 (unit + e2e reali contro Postgres via `docker compose up -d postgres`),
  lint e typecheck puliti.
- Frontend: 31/31, lint/typecheck/build puliti.
- Verifica manuale end-to-end con browser reale (Playwright + Chrome Headless
  Shell già in cache) contro `ng serve` + backend reale: signup → redirect a
  `/` con sessione visibile → annunci caricati → logout → deep link non
  autenticato `?announcementId=...` correttamente rediretto a
  `/login?returnUrl=...` (compatibile con la feature di Codex).

## File principali

- `apps/api/src/auth/**` (nuovo)
- `apps/api/src/announcements/announcements.controller.ts` (guardia per-endpoint)
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260723163400_add_users/`
- `packages/contracts/src/auth.ts`, `packages/contracts/src/index.ts`
- `apps/web/src/app/auth/**` (nuovo), `apps/web/src/app/shell.component.*` (nuovo)
- `apps/web/src/app/app.config.ts`, `app.routes.ts`, `main.ts`, `src/index.html`

## Limitazioni note

- Nessun refresh token: JWT a lunga durata (7 giorni di default), scelta
  deliberata per tenere il frontend semplice in questa fase V1.
- Nessuna verifica email, reset password, o ruoli/permessi: solo
  autenticazione di base come richiesto.
- Le letture di `Announcement` restano pubbliche (vedi nota sopra): non c'è
  isolamento dati per utente, coerente con "un singolo annuncio centrale" di
  `docs/project-plan/v1-scope.md`, non un requisito esplicito dell'utente ma
  una lettura ragionevole data l'ambiguità — segnalata qui per eventuale
  revisione.
