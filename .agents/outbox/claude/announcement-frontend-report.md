# Report — Frontend Announcement Publication Flow (ex TASK-020-F)

## Stato

`READY_FOR_REVIEW`

## Nota per l'orchestratore

Questo lavoro copre esattamente lo scope di `.agents/inbox/codex/task-020-frontend.md`
(Angular per il flusso `Announcement`), ma è stato realizzato da Claude Code
(Agente A) su richiesta diretta dell'utente in sessione interattiva, non tramite
il canale inbox/outbox. `task-020-frontend.md` risulta ancora presente
nell'inbox di Codex (non l'ho toccato, per non modificare il task di un altro
agente): se Codex non ha già iniziato a lavorarci, va probabilmente ritirato
per evitare lavoro duplicato/conflitti.

## Riepilogo

Migrato il frontend (`apps/web`) dal modello `Listing` al modello canonico
`Announcement`, dopo aver confermato con l'utente che `Announcement` (contratti
frozen, TASK-021/2c69ac6) sostituisce `Listing`/`Publication` come modello
centrale.

- `AnnouncementsService` nuovo: CRUD (`POST/GET/PUT /api/announcements`),
  gestione canale (`PUT .../channels/mock`), validazione dry-run
  (`POST .../channels/mock/validate`), pubblicazione mock
  (`POST .../channels/mock/publish`), storico (`GET .../publications`).
- `app.component.ts/.html/.css` riscritti: form unico creazione/modifica
  (titolo, descrizione, prezzo in euro → `priceAmount` in centesimi, valuta,
  categoria, condizione via select, quantità), pannello canale mock
  (toggle abilitazione + configurazione categoria), rendering degli
  `issues[]` di validazione per severità (`ERROR`/`WARNING`/`INFO`), azione
  di pubblicazione con aggiornamento stato canale e storico pubblicazioni
  indipendente, badge di stato complessivo dell'annuncio
  (`DRAFT`/`READY`/`PARTIALLY_PUBLISHED`/`PUBLISHED`).
- Rimossi `listings.service.ts`/`publications.service.ts` (e relativi spec):
  il frontend non punta più a `/api/listings`.
- Aggiornati `README.md` e `docs/architecture/overview.md` per registrare la
  decisione "Announcement è canonico" (il backend `Listing`/`Publication`
  resta nel codice, non rimosso, ma non riceve più sviluppo).

## Fix collaterale (fuori scope file-based, ma bloccante)

`packages/domain/src/index.ts` esportava due tipi omonimi `PublicationStatus`
(Listing minuscolo, Announcement maiuscolo); `packages/contracts/src/announcement.ts`
importava quello sbagliato — bug segnalato come CHANGE_REQUEST nel report
`task-021.md` e mai risolto. Corretto esportando quello di Announcement come
`AnnouncementPublicationStatus` e aggiornando l'import nei contratti. Non ho
toccato altro in `packages/domain`/`packages/contracts`.

## Checkpoint di sicurezza

Quasi tutto il lavoro pregresso su `feat/backend-init` (Listing backend,
`apps/web`, `packages/*`, docker-compose, docs, file `.agents/`) era ancora
non committato (rischio di perdita). Committato come checkpoint separato
(`e5addb7`) prima di iniziare il lavoro sul frontend, su richiesta esplicita
dell'utente.

## File modificati

Commit `ea044ea` — `feat(web): migrate frontend to the Announcement publication flow`:
- `apps/web/src/app/announcements.service.ts` (nuovo)
- `apps/web/src/app/app.component.ts`, `.html`, `.css`, `.spec.ts`
- rimossi `apps/web/src/app/listings.service.ts(.spec.ts)`,
  `publications.service.ts(.spec.ts)`
- `README.md`, `docs/architecture/overview.md`,
  `docs/integration/frontend-next-steps.md`

Commit `e5addb7` (checkpoint + fix, precedente):
- `packages/domain/src/index.ts`, `packages/contracts/src/announcement.ts`
- tutto il resto del working tree pregresso non committato

## Verifiche eseguite

- `pnpm --filter @marketplace-hub/web type-check` → OK
- `pnpm --filter @marketplace-hub/web lint` (`ng lint`, sotto Node 20 portatile
  scaricato in locale, non installato nel sistema — Node di sistema resta
  v18.19.1, invariato) → "All files pass linting."
- `pnpm --filter @marketplace-hub/web test` (`ng test --browsers=ChromeHeadless`)
  → 6/6 test verdi (create, edit, empty state, backend unreachable,
  validate+publish+history)
- `pnpm --filter @marketplace-hub/web build` → build di produzione OK
- `pnpm --filter @marketplace-hub/api typecheck` → OK (verifica che il fix in
  `packages/domain` non rompa il backend)
- `pnpm --filter @marketplace-hub/domain build`, `pnpm --filter @marketplace-hub/contracts build` → OK
- Verifica visiva: `ng serve` locale + screenshot via Chrome Headless Shell,
  form e layout confermati corretti. Non è stato possibile verificare il
  flusso end-to-end reale (create → enable channel → validate → publish →
  storico) contro un backend vivo: Docker non è disponibile in questa sessione
  WSL (`docker` non è nel `PATH`, integrazione WSL di Docker Desktop non
  attiva), quindi Postgres non è avviabile. Il flusso HTTP è comunque
  verificato a livello di contratto dai test unitari (`HttpTestingController`
  con URL/verbi/body attesi identici a quelli reali).

## Limitazioni note

- Nessun endpoint `DELETE` per `Announcement` nel backend (coerente con gli
  endpoint frozen): la UI non offre eliminazione, a differenza della vecchia
  UI `Listing`.
- Non ho verificato il flusso end-to-end con Postgres reale (vedi sopra) —
  raccomando un giro rapido `docker compose up -d postgres && pnpm dev` prima
  del merge.
