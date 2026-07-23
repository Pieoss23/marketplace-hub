# Marketplace Hub

Monorepo pnpm per Marketplace Hub.

> **Nota**: il modello centrale canonico è `Announcement` (vedi
> `docs/architecture/overview.md`). Il modello `Listing`/`Publication`
> descritto più sotto (endpoint `/api/listings`) è la prima iterazione V1,
> resta nel codice ma è superato: sia il frontend (`apps/web`) sia lo sviluppo
> attivo usano `/api/announcements` (dettagli in
> `docs/api/announcement-publication-api.md`).

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
- annuncio centrale: `GET/POST /api/listings`, `GET/PATCH/DELETE /api/listings/:id`
- pubblicazione mock e stato: `POST /api/listings/:listingId/publications/mock`,
  `GET /api/listings/:listingId/publications` (dettagli in
  `docs/integration/publications-api.md`)
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
