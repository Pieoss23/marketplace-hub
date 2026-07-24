# Report — Shutdown pulito e compressione risposte

## Stato

`READY_FOR_REVIEW`

## Contesto

Quarto incremento di hardening in questa sessione (dopo refresh token, rate
limiting, helmet). Due gap piccoli ma reali trovati in `main.ts`, raggruppati in un
solo incremento perché entrambe modifiche minime nello stesso punto di bootstrap.

## Riepilogo

1. **`app.enableShutdownHooks()`** — `PrismaService` implementa già
   `OnModuleDestroy`/`$disconnect()`, ma Nest invoca gli hook di distruzione del
   ciclo di vita solo su `app.close()` esplicito, non su segnali di processo
   (SIGTERM/SIGINT), a meno di chiamare questo metodo. In un deploy reale (container
   che riceve SIGTERM) la connessione Postgres non veniva mai chiusa in modo pulito
   — il codice di cleanup esistente era di fatto morto fuori dai test (dove
   `afterAll` chiama `app.close()` direttamente, un percorso diverso dal segnale).
2. **`compression`** — nessuna compressione delle risposte, aggiunta come standard
   accanto a CORS/rate-limit/helmet già presenti.

## Nota importante — un limite di test dichiarato esplicitamente

`enableShutdownHooks()` **non ha un test automatico dedicato**, e lo dichiaro
apertamente invece di far finta di una copertura che non c'è: cambia comportamento
solo quando il processo riceve davvero un segnale OS. Ogni test e2e esistente chiama
già `app.close()` direttamente in `afterAll`, che innesca `onModuleDestroy`
indipendentemente da questa impostazione — è un percorso di codice diverso dalla
gestione dei segnali. Testare in sicurezza il percorso dei segnali richiederebbe
lanciare un processo figlio reale e inviargli un SIGTERM vero, verificando che esca
pulito — un investimento di test sproporzionato rispetto alla riga di produzione
corretta, e non l'ho aggiunto non richiesto.

## Test e verifiche

- Nuovo `apps/api/test/compression.e2e-spec.ts`: sfrutta la route
  `GET /api/docs-json` che `SwaggerModule.setup(...)` registra automaticamente di
  default (confermato leggendo il sorgente del pacchetto installato, non presunto) —
  documento OpenAPI abbastanza grande da superare la soglia di default di
  `compression` (1024 byte), nessun payload fittizio necessario. Asserisce
  `content-encoding: gzip` con `Accept-Encoding: gzip`.
- 122/122 test verdi (era 121, +1 nuovo file), lint e typecheck puliti.

## File principali

- `apps/api/package.json` (nuove dipendenze: `compression`, `@types/compression`)
- `apps/api/src/main.ts`
- `apps/api/test/compression.e2e-spec.ts` (nuovo)
