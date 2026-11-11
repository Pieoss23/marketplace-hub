# Marketplace Hub

[![CI](https://github.com/Pieoss23/marketplace-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/Pieoss23/marketplace-hub/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Un annuncio, scritto una volta, pubblicato su più marketplace attraverso
connettori intercambiabili. Il dominio non sa nulla dei marketplace, i
connettori non sanno nulla della persistenza, e ogni tentativo di
pubblicazione ha uno stato proprio e tracciabile.

Monorepo pnpm con API NestJS, frontend Angular, estensione browser e
PostgreSQL via Prisma.

> **Stato:** progetto personale in sviluppo. Le fondamenta — dominio,
> contratti, persistenza, autenticazione, connettore mock — sono
> implementate e coperte da test; i connettori verso marketplace reali no.
> La sezione [Note sul modello dati](#note-sul-modello-dati) spiega cosa è
> canonico e cosa è prima iterazione.

## Cosa dimostra questo progetto

Se stai valutando il codice, questi sono i punti su cui vale la pena
guardare:

- **Architettura a dipendenze dichiarate.** `docs/architecture/dependency-rules.md`
  fissa cosa può importare cosa: il package `domain` non conosce NestJS,
  Angular, Prisma né alcun SDK esterno; i payload dei marketplace non
  entrano mai nel modello centrale; non sono ammessi cicli fra package.
- **SDK per connettori.** `packages/connector-sdk` definisce il contratto
  che un marketplace deve rispettare. Aggiungere un canale significa
  scrivere un adattatore, non toccare il dominio.
- **Stato di pubblicazione separato dall'annuncio.** Un annuncio pubblicato
  su tre canali ha tre esiti indipendenti, ognuno con il proprio stato e
  storico (`docs/decisions/adr-003-publication-state-model.md`).
- **Decisioni documentate.** Tre ADR spiegano perché il dominio e il
  contratto connettore sono fatti così, come viene persistita la
  pubblicazione e come è modellato il suo stato.
- **Prezzi in unità minori.** Importi salvati come interi
  (`priceAmountMinor` + `priceCurrency`), per non affidare il denaro alla
  virgola mobile.
- **Integrazione continua.** La pipeline esegue build, lint, type-check,
  migrazioni e test a ogni push.

## Struttura

```
packages/
  domain          modello di dominio puro, senza framework
  contracts       tipi di trasporto condivisi
  connector-sdk   contratto che ogni connettore marketplace implementa
apps/
  api             NestJS + Prisma + PostgreSQL
  web             frontend Angular
  extension       estensione browser
docs/
  architecture/   panoramica, regole di dipendenza, ADR
  api/            contratto degli endpoint
  domain/         modello di dominio
```

## Documentazione

- [Panoramica dell'architettura](docs/architecture/overview.md)
- [Regole di dipendenza](docs/architecture/dependency-rules.md)
- [ADR 001 — dominio centrale e contratto connettore](docs/architecture/adr-001-core-domain-and-connector-contract.md)
- [ADR 002 — persistenza della pubblicazione](docs/architecture/adr-002-publication-persistence.md)
- [ADR 003 — modello di stato della pubblicazione](docs/decisions/adr-003-publication-state-model.md)
- [API annunci e pubblicazione](docs/api/announcement-publication-api.md)
- [Connettore mock](docs/architecture/mock-connector.md)

## Note sul modello dati

Il modello centrale canonico è `Announcement`. Il modello
`Listing`/`Publication` (endpoint `/api/listings`) è la prima iterazione:
resta nel codice ma è superato, e sia il frontend sia lo sviluppo attivo
usano `/api/announcements`. Dettagli in
[docs/architecture/overview.md](docs/architecture/overview.md) e
[docs/api/announcement-publication-api.md](docs/api/announcement-publication-api.md).

## Licenza

MIT — vedi [LICENSE](LICENSE).

---

## Prerequisiti

- Node.js `^20.19.0 || ^22.12.0 || ^24.0.0`
- pnpm `10.x` (`corepack enable` oppure `npm i -g pnpm`)
- Docker e Docker Compose, per avviare PostgreSQL in locale

> **WSL**: se `pnpm -v` risolve a un eseguibile sotto `/mnt/c/...` (pnpm
> installato lato Windows), i comandi che toccano `node_modules` falliscono
> con errori sul percorso UNC (`\\wsl.localhost\...`). Anteponi al `PATH` la
> versione Linux, ad es. `export PATH="$HOME/.local/share/pnpm:$PATH"`, oppure
> usa sempre il percorso assoluto `~/.local/share/pnpm/pnpm`. Analogamente,
> se `docker` non è nel `PATH` di WSL, verifica che l'integrazione WSL di
> Docker Desktop sia attiva per questa distro.

## Installazione

```bash
pnpm install
```

## Configurazione ambiente

Copia il file di esempio e personalizzalo se necessario:

```bash
cp .env.example .env
```

Variabili principali:

| Variabile | Descrizione | Default |
| --- | --- | --- |
| `API_PORT` | Porta HTTP del backend | `3000` |
| `API_GLOBAL_PREFIX` | Prefisso globale delle route | `api` |
| `CORS_ORIGIN` | Origin consentita dal backend | `http://localhost:4200` |
| `POSTGRES_USER` | Utente PostgreSQL | `marketplace_hub` |
| `POSTGRES_PASSWORD` | Password PostgreSQL | `marketplace_hub` |
| `POSTGRES_DB` | Database PostgreSQL | `marketplace_hub` |
| `POSTGRES_PORT` | Porta esposta da Postgres | `5432` |
| `DATABASE_URL` | Connection string usata da Prisma | vedi `.env.example` |
| `JWT_SECRET` | Segreto di firma dei token di sessione | dev-only, da sostituire fuori da locale |
| `JWT_EXPIRES_IN_SECONDS` | Durata del token in secondi | `604800` (7 giorni) |

## Avvio di PostgreSQL

```bash
docker compose up -d postgres
```

Il dato è persistito nel volume Docker `postgres_data`.

## Prisma

Genera il client Prisma (non richiede un database attivo):

```bash
pnpm db:generate
```

Applica le migrazioni (richiede PostgreSQL attivo):

```bash
pnpm db:migrate
```

Apri Prisma Studio:

```bash
pnpm db:studio
```

Lo schema (`apps/api/prisma/schema.prisma`) definisce `Listing` e
`ListingImage`, la persistenza del modello di dominio puro `Listing`
(`@marketplace-hub/domain`). Il prezzo è salvato in unità minori
(`priceAmountMinor` + `priceCurrency`) per evitare arrotondamenti in virgola
mobile. `MarketplaceConfiguration` e `Publication` persistono, separati
dall'annuncio, la configurazione per marketplace e lo stato indipendente di
ogni tentativo di pubblicazione (dettagli in
`docs/architecture/adr-002-publication-persistence.md`).

## Avvio del backend

```bash
pnpm dev
```

L'API sarà disponibile su `http://localhost:3000/api`, con:

- health check: `GET /api/health`
- autenticazione: `POST /api/auth/signup`, `POST /api/auth/login`,
  `GET /api/auth/me`
- annuncio centrale (modello canonico, richiede `Authorization: Bearer
  <accessToken>` su **tutti** gli endpoint, letture incluse): `GET/POST
  /api/announcements`, `GET/PUT/DELETE /api/announcements/:id`, canali e
  pubblicazione mock (dettagli in
  `docs/api/announcement-publication-api.md`)
- endpoint `/api/listings` (modello superato, non richiede più sviluppo:
  vedi `docs/architecture/overview.md`)
- documentazione OpenAPI: `GET /api/docs`

Gli errori di validazione (sia a livello di DTO che di dominio) includono un
campo `errors` con oggetti strutturati `{ code, field, message }`, oltre al
campo `message` standard di NestJS.

## Validazione del progetto

Prima di eseguire le verifiche, controlla che Node e pnpm siano quelli Linux e
rispettino le versioni dichiarate dal repository:

```bash
node --version
pnpm --version
command -v node
command -v pnpm
```

### Verifica rapida

Lint, type-check e build non richiedono servizi esterni:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

I test unitari dei package e dell'API possono essere eseguiti senza PostgreSQL:

```bash
pnpm --filter @marketplace-hub/domain test
pnpm --filter @marketplace-hub/contracts test
pnpm --filter @marketplace-hub/connector-sdk test
pnpm --filter @marketplace-hub/api exec jest --runInBand src
pnpm --filter @marketplace-hub/extension test
```

I test del frontend richiedono Chrome o Chromium disponibile in modalità
headless:

```bash
pnpm --filter @marketplace-hub/web test
```

### Verifica completa

La suite API include anche i test e2e di `/api/announcements`,
`/api/listings` e delle relative pubblicazioni. Questi test condividono un
database PostgreSQL reale e vengono eseguiti in serie. Prepara l'ambiente e
lancia l'intera suite con:

```bash
cp .env.example .env
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

La validazione è completa quando tutti i comandi terminano con codice `0`.
Per verificare rapidamente il database usa `docker compose ps`: il servizio
`postgres` deve risultare `healthy`.

La stessa sequenza è eseguita dalla pipeline GitHub Actions in
`.github/workflows/ci.yml` su ogni push e pull request. La pipeline usa
PostgreSQL 16, applica le migrazioni con `prisma migrate deploy` e avvia i test
Angular con Chrome Headless.

> **WSL**: errori UNC o `UtilBindVsockAnyPort` indicano normalmente che
> `node`, `pnpm` o `docker` stanno risolvendo a eseguibili Windows, oppure che
> l'integrazione WSL di Docker Desktop non è attiva. Correggi prima il `PATH` e
> ripeti i quattro controlli iniziali; non sono errori della suite applicativa.

## Build

```bash
pnpm build
```

## Lint e type-check

```bash
pnpm lint
pnpm typecheck
```

## Struttura del monorepo

```text
marketplace-hub/
├── apps/
│   ├── api/                  # backend NestJS
│   ├── web/                  # frontend Angular
│   └── extension/            # esperimento Chrome
├── packages/
│   ├── domain/                # tipi ed enum del dominio
│   ├── contracts/              # contratti API condivisi
│   └── connector-sdk/         # interfacce dei connettori
├── docs/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

Per costruzione, caricamento unpacked e prova manuale dell'estensione consulta
[`apps/extension/README.md`](./apps/extension/README.md).
