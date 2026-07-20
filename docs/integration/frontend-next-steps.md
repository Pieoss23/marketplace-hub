# Prossimo passo: frontend annuncio e pubblicazione

## Stato al 12 luglio 2026

Il backend copre l'intero perimetro V1 descritto in `AGENTS.md`:

- annuncio centrale (`Listing`) persistito, CRUD completo su `GET/POST /api/listings`, `GET/PATCH/DELETE /api/listings/:id`;
- configurazione marketplace, validazione generale e specifica, trasformazione payload e pubblicazione tramite `MockConnector`, documentate in `docs/integration/publications-api.md` (`POST /api/listings/:listingId/publications/mock`, `GET /api/listings/:listingId/publications`);
- 32 test (unit + e2e) verdi, lint e typecheck puliti su `apps/api`.

`apps/web` contiene ancora soltanto la pagina di health-check (`docs/project-plan/v1-scope.md` la descrive come punto di partenza volutamente minimale). Non esiste ancora un form per creare/modificare l'annuncio, la selezione del marketplace mock, né una vista dello stato delle pubblicazioni.

## Proposta per il prossimo incremento frontend

- form di creazione/modifica dell'annuncio centrale, collegato a `CreateListingRequest` / `UpdateListingRequest` / `ListingResponse` (`@marketplace-hub/contracts`);
- elenco annunci e vista di dettaglio;
- azione "pubblica su mock" collegata a `CreateMockPublicationRequest` / `PublishListingResponse`, con visualizzazione degli errori strutturati restituiti dall'API;
- vista dello stato delle pubblicazioni per annuncio (`PublicationResponse[]`), coerente con gli stati indipendenti già modellati nel backend.

## Nota di coordinamento

Questo file segnala l'intenzione di lavorare sul frontend descritto sopra. Se un'altra sessione ha già in corso o in programma questo lavoro, aggiornare questa nota prima di procedere per evitare sovrapposizioni, seguendo la stessa convenzione di `docs/integration/agent-handoff.md`.
