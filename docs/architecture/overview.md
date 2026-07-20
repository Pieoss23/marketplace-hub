# Panoramica architetturale

> **Aggiornamento 20 luglio 2026**: il modello centrale canonico è ora
> `Announcement` (`packages/domain/src/announcement.ts`, contratti "frozen" in
> `packages/contracts/src/announcement.ts`, documentati in
> `docs/domain/announcement.md` e `docs/api/announcement-publication-api.md`).
> Il modello `Listing`/`Publication` descritto più sotto è la prima
> iterazione V1 ed è considerato superato dal pivot verso `Announcement`
> (multi-canale con configurazione e validazione per connettore, stato
> pubblicazione indipendente per canale); resta nel codice (`apps/api/src/listings`,
> `apps/api/src/publications`) e non è stato rimosso, ma non riceve più nuovo
> sviluppo. Il frontend (`apps/web`) è stato migrato interamente al flusso
> `Announcement`.

Marketplace Hub adotta un monorepo pnpm semplice, senza orchestratori aggiuntivi. L'applicazione conserva un unico annuncio centrale e prepara configurazioni e pubblicazioni indipendenti per ciascun marketplace.

## Componenti

- `apps/web` è il client Angular standalone. Usa i contratti condivisi per comunicare via REST e non contiene dettagli dei payload esterni.
- `apps/api` ospita il backend NestJS, responsabile dei casi d'uso, della persistenza e dell'orchestrazione dei connettori.
- PostgreSQL è il database applicativo, accessibile dal backend tramite Prisma. Frontend e connettori non vi accedono direttamente.
- `packages/domain` ospita il modello di dominio puro e indipendente dai framework.
- `packages/contracts` definisce i contratti condivisi ai confini API, a partire da `HealthResponse`.
- `packages/connector-sdk` ospita il contratto tecnico comune dei connettori.

## Evoluzione a connettori

Il backend orchestra connettori che validano la configurazione specifica, trasformano l'annuncio centrale in un payload esterno e pubblicano senza accedere al database (`PublishListingUseCase`, dettagli in `docs/architecture/publication-use-case.md`). Ogni pubblicazione mantiene uno stato indipendente (`docs/architecture/adr-002-publication-persistence.md`). La prima iterazione usa esclusivamente un `MockConnector` (`docs/architecture/mock-connector.md`); non vengono inventate API o capacità di marketplace reali.

Il flusso previsto è: client web → API REST → caso d'uso applicativo → dominio e connettore → persistenza. I modelli esterni restano confinati nel connettore e non diventano il modello centrale.

## Persistenza dell'annuncio centrale

`apps/api` persiste `Listing` tramite Prisma (`Listing` + `ListingImage`, prezzo in unità minori) dietro `ListingsRepository`, che è l'unico punto di contatto con Prisma. `ListingsService` esegue `validateListing` (dominio) prima di ogni creazione o aggiornamento, così gli errori strutturati restano definiti nel dominio e non duplicati nei DTO. Il modello tecnico temporaneo `TechnicalPing`, usato solo per verificare la plumbing di Prisma, è stato rimosso ora che esiste un modello reale. `AllExceptionsFilter` espone un campo opzionale `errors` quando l'eccezione lo fornisce (dominio o class-validator), oltre al `message` standard.
