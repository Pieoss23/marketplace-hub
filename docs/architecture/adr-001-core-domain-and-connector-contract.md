# ADR-001 — Dominio centrale e contratto dei connettori

## Stato

Accettata il 12 luglio 2026.

## Contesto

La V1 richiede un solo annuncio centrale, configurazioni separate per marketplace e pubblicazioni con stato indipendente. I payload esterni non devono diventare parte del modello centrale e il primo connettore sarà esclusivamente mock.

## Decisione

- `Listing` è il modello centrale e non contiene campi specifici di marketplace.
- Il denaro usa `amountMinor`, un intero non negativo, e un codice valuta maiuscolo di tre lettere. Questa rappresentazione evita calcoli monetari in virgola mobile senza introdurre una libreria.
- Le immagini sono riferimenti HTTP/HTTPS ordinati tramite una posizione esplicita. Upload e storage dei file restano fuori da questo incremento.
- `MarketplaceConfiguration<TConfiguration>` mantiene separati identificativo del marketplace e configurazione specifica.
- Ogni `Publication` appartiene a una coppia annuncio/marketplace e possiede uno stato indipendente.
- `MarketplaceConnector<TConfiguration, TPayload>` definisce validazione specifica, trasformazione e pubblicazione. Il connettore riceve dati e restituisce risultati, senza accedere alla persistenza.
- `MarketplaceId` ammette per ora soltanto `mock`; non vengono modellati marketplace reali.
- La validazione restituisce `ValidationResult` con errori strutturati composti da `code`, `field` e `message`.
- Il package `domain` espone build ESM e CommonJS: il frontend può importare l’entry point ESM e il backend NestJS CommonJS può usare lo stesso dominio a runtime.

## Conseguenze

I casi d’uso dell’API potranno orchestrare validazione generale, validazione del connettore, trasformazione, pubblicazione e persistenza senza introdurre dipendenze infrastrutturali nel dominio. L’aggiunta di un marketplace richiederà una scelta esplicita sull’estensione di `MarketplaceId` e una sua configurazione dedicata.
