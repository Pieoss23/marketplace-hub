Struttura del repository

Non userei subito Nx: per la prima versione aggiunge un ulteriore livello da comprendere e da governare. Un semplice monorepo pnpm è sufficiente.

marketplace-hub/
├── apps/
│   ├── api/                  # NestJS
│   └── web/                  # Angular
│
├── packages/
│   ├── contracts/            # DTO e contratti condivisi
│   ├── domain/               # tipi ed enum del dominio
│   └── connector-sdk/        # interfacce dei connettori
│
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── domain/
│   └── project-plan/
│
├── infra/
│   └── docker/
│
├── AGENTS.md
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json


Separazione importante

**packages/domain**
contiene concetti generali:
Announcement
Money
ProductCondition
InternalCategory
PublicationStatus
ValidationIssue

**packages/connector-sdk**
contiene il contratto tecnico:
MarketplaceConnector
ConnectorCapabilities
ConnectorValidationResult
PublishResult

