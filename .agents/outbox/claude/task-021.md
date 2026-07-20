# TASK-021 — Implement announcement publication backend

## Stato

`READY_FOR_REVIEW`

## Riepilogo

Implementato il vertical slice `Announcement` come funzionalità **aggiuntiva**, separata da `Listing`/`Publication` (già esistenti, non toccati): CRUD minimo dell'annuncio, configurazione per canale (`AnnouncementChannel`), validazione generale (`validateAnnouncement`, dominio) + specifica del connettore (`MockChannelConnector`, due regole: titolo ≤80 caratteri, descrizione ≥20 caratteri), pubblicazione mock orchestrata (`PublishAnnouncementUseCase`), persistenza dello stato di ogni tentativo di pubblicazione, endpoint per lo storico pubblicazioni.

Ho seguito `docs/domain/announcement.md`, `docs/architecture/publication-flow.md` e `docs/api/announcement-publication-api.md` — comparsi durante l'esecuzione del task (inizialmente mancanti; ho aspettato che apparissero prima di procedere sulle parti che ne dipendevano, senza inventare il loro contenuto).

## File modificati

34 file, tutti sotto i path autorizzati (`apps/api/**`, `prisma/**`, test, nessun file in `packages/**` o `apps/web/**`):

- `apps/api/prisma/schema.prisma` — modelli additivi (vedi sotto)
- `apps/api/prisma/migrations/20260712143418_add_announcement_publication_flow/`
- `apps/api/src/announcements/**` — controller, DTO, application services, connettori, repository, mapper, eccezioni/filtro errori (29 file nuovi)
- `apps/api/src/app.module.ts` — registrato `AnnouncementsModule`
- `apps/api/test/announcements.e2e-spec.ts`
- `apps/api/jest.config.js` — vedi "Decisioni tecniche" (fix di un flake pre-esistente, non introdotto da me)

## Migrazione creata

`20260712143418_add_announcement_publication_flow`: enum `ProductCondition`, `AnnouncementStatus`, `ChannelValidationStatus`, `PublicationStatus`; modelli `Announcement`, `AnnouncementChannel`, `AnnouncementPublication`.

**Prezzo**: intero in centesimi (`Announcement.priceAmount Int`), coerente con `Announcement.price` già definito così in `@marketplace-hub/domain`. Nessuna libreria aggiuntiva.

**Naming**: il terzo modello si chiama `AnnouncementPublication`, non `Publication` come nel testo del task, per evitare una collisione con il modello `Publication` già esistente (feature Listing). È altrimenti esattamente la "Publication" descritta nel task.

## Endpoint implementati

Esattamente quelli congelati in `docs/api/announcement-publication-api.md`:

```
POST   /api/announcements
GET    /api/announcements
GET    /api/announcements/:id
PUT    /api/announcements/:id
PUT    /api/announcements/:id/channels/:connectorCode
POST   /api/announcements/:id/channels/:connectorCode/validate   (200, non 201: @HttpCode esplicito)
POST   /api/announcements/:id/channels/:connectorCode/publish    (200, non 201: @HttpCode esplicito)
GET    /api/announcements/:id/publications
```

Errori nel formato `ApiErrorResponse` congelato (`{code, message, field?, details?}`), via un `AnnouncementErrorFilter` scoped al controller (`@UseFilters`), per non toccare il filtro globale già usato da Listing/Publication.

## Test eseguiti

`pnpm --filter @marketplace-hub/api lint|typecheck|test|build` — tutti puliti. `pnpm db:migrate`/`db:generate` eseguiti contro Postgres reale (Docker). Suite completa (unit + e2e): **19/19 suite, 77/77 test**, verificato stabile su 3 esecuzioni consecutive dopo il fix del punto seguente.

Copertura: repository (Prisma mockato), application service, status calculator, MockChannelConnector, publish orchestrator (incluso il caso di fallimento del connettore e la doppia pubblicazione), e2e end-to-end con Postgres reale (10 scenari, coprono tutti i 9 minimi richiesti + doppia pubblicazione). Verificato manualmente anche via curl contro un'istanza reale del server (create → enable channel → validate → publish → history → doppia pubblicazione 409).

## Decisioni tecniche

1. **Doppia pubblicazione**: `409 Conflict` (`PUBLICATION_ALREADY_IN_PROGRESS`) se l'ultimo tentativo per quel canale è `PUBLISHING` o `PUBLISHED`; un tentativo `FAILED` può essere ripubblicato (crea un nuovo record).
2. **Stato generale dell'annuncio**: calcolato da un helper condiviso (`AnnouncementStatusCalculator`), usato sia da create/update sia dal flusso di pubblicazione, per evitare che una modifica dei testi retrocedesse silenziosamente un annuncio già `PUBLISHED`/`PARTIALLY_PUBLISHED`. Algoritmo: validazione generale fallita → `DRAFT`; altrimenti, se nessun canale abilitato → `READY`; se tutti i canali abilitati sono `PUBLISHED` → `PUBLISHED`; se solo alcuni → `PARTIALLY_PUBLISHED`; altrimenti `READY`. Coerente con `docs/architecture/publication-flow.md` §4 e `docs/domain/announcement.md`.
3. **Connettore mock locale**: non ho implementato `MarketplaceConnector` da `@marketplace-hub/connector-sdk` (le sue firme sono specifiche per `Listing`, non generiche) né ho modificato quel package (fuori dai path autorizzati). Ho creato un contratto locale `AnnouncementChannelConnector` interamente dentro `apps/api/src/announcements/connectors/`.
4. **Fix jest.config.js (`maxWorkers: 1`)**: i file e2e condividono un solo Postgres con `deleteMany()` per tabella in `afterEach`; eseguiti in worker paralleli, il cleanup di un file poteva cancellare righe che un altro file stava ancora usando (osservato: violazione di foreign key intermittente tra `listings.e2e-spec.ts` e `publications.e2e-spec.ts`, non causata dai miei file). Non è un problema che ho introdotto, ma rientra nei path autorizzati ("test backend") e blocca `pnpm test` in modo non deterministico per tutti, quindi l'ho corretto. Verificato stabile su 3 run.
5. **Bug DI in `MockChannelConnector`**: il parametro `generateId: () => string = () => randomUUID()` non veniva risolto da Nest (`Nest can't resolve dependencies... argument Function at index [0]`), e falliva la compilazione dell'intero `AppModule` nei test (bloccando *anche* `listings.e2e-spec.ts`/`publications.e2e-spec.ts`, non miei). Risolto con `@Optional()` sul parametro.

## CHANGE_REQUEST per AGY

**Bug nei contratti condivisi** (non ho modificato nulla, essendo `packages/domain/**` e `packages/contracts/**` fuori dai miei path autorizzati): `packages/contracts/src/announcement.ts` importa `PublicationStatus` da `@marketplace-hub/domain`, ma `packages/domain/src/index.ts` esporta **due** tipi con lo stesso nome `PublicationStatus` (uno da `publication.ts`, valori minuscoli `'draft'|'validating'|...` della feature Listing; uno da `announcement.ts`, valori maiuscoli `'READY'|'PUBLISHING'|'PUBLISHED'|'FAILED'`). Solo il primo è esportato come *type*, quindi `ChannelPublicationResponse.status` e `PublishAnnouncementResponse.status` risultano tipati con l'union sbagliata (quella minuscola di Listing), pur essendo pensati per i valori maiuscoli di Announcement. Compila senza errori (nessuno dei due package istanzia il tipo con un valore letterale), ma chiunque importi questi contratti e assegni `status: 'PUBLISHED'` a runtime otterrebbe un errore di tipo.

Suggerimento: in `packages/domain/src/index.ts`, esportare anche il *type* da `announcement.ts` sotto un alias (es. `export type { PublicationStatus as AnnouncementPublicationStatus } from './announcement.js';`) e aggiornare `packages/contracts/src/announcement.ts` per importare quello.

**Workaround adottato** (solo nei miei file, non nei contratti): ho definito localmente `AnnouncementPublicationStatus` in `apps/api/src/announcements/domain/announcement-publication-status.ts` con i valori corretti, e i DTO di risposta (`ChannelPublicationResponseDto`, `PublishAnnouncementResponseDto`) non fanno `implements` delle interfacce dei contratti per questo campo — replicano comunque la forma esatta documentata in `docs/api/announcement-publication-api.md`, verificata via e2e reali.

## Limitazioni

- Nessun endpoint `DELETE` per `Announcement` (non richiesto dagli endpoint congelati).
- Nessuna validazione del contenuto di `configuration` oltre alle due regole del mock connector esplicitamente richieste (non ho inventato ulteriori regole).
- La transizione `DRAFT → READY` è calcolata a ogni create/update; non esiste un endpoint separato "valida l'intero annuncio" (solo per-canale via `/validate`), non essendo tra gli endpoint congelati.

## Commit

`2c69ac6` — `feat(api): implement announcement publication flow` (branch `feat/backend-init`).

Nota: il primo tentativo di commit (poi annullato con `git reset --soft` prima di ripetere lo staging, nessuna perdita di dati) aveva incluso per errore file già in staging da un altro agente (`packages/domain`, `packages/contracts`, `packages/connector-sdk`, alcuni `docs/`, `.agents/inbox/*`) — non miei, non modificati da me. Il commit finale (`2c69ac6`) contiene esclusivamente i 34 file elencati sopra.
