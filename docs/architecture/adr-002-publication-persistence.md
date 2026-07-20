# ADR-002 — Persistenza di configurazioni e pubblicazioni

## Stato

Accettata il 12 luglio 2026.

## Contesto

La configurazione specifica di ogni marketplace deve restare separata dall’annuncio centrale e ogni pubblicazione deve mantenere uno stato indipendente. Il caso d’uso applicativo salva ogni transizione attraverso `PublicationStore`.

## Decisione

- `MarketplaceConfiguration` conserva una configurazione JSON separata per coppia annuncio/marketplace.
- La coppia `listingId` e `marketplaceId` è univoca per la configurazione.
- `Publication` conserva stato, identificativo esterno ed eventuale ultimo errore senza incorporare payload specifici.
- Sono consentite più pubblicazioni per la stessa coppia annuncio/marketplace, così tentativi distinti mantengono identità e stato indipendenti.
- La cancellazione dell’annuncio elimina a cascata configurazioni e pubblicazioni collegate.
- `PrismaPublicationStore` implementa la porta applicativa tramite `upsert`, permettendo di salvare le transizioni successive della stessa pubblicazione.
- Il connettore continua a non conoscere Prisma e il database.

## Conseguenze

Il futuro endpoint di pubblicazione potrà creare tentativi indipendenti e delegare l’orchestrazione al caso d’uso. La configurazione JSON rimane confinata al livello di persistenza e dovrà essere validata dal connettore prima dell’uso.
