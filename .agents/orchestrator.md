# Orchestrator Dashboard — Marketplace Hub

This dashboard tracks the multi-agent coordination workflow between the Orchestrator, **Claude Code**, and **Codex CLI**.

## System Roles & Flow
- **Orchestrator**: Defines contracts, coordinates task distribution, reviews diffs, runs integration tests, merges branches, and manages communication.
- **Claude Code**: Works on assigned tasks in `.agents/inbox/claude/` and posts results to `.agents/outbox/claude/`.
- **Codex CLI**: Works on assigned tasks in `.agents/inbox/codex/` and posts results to `.agents/outbox/codex/`.

---

## Current Workspace State (12 July 2026)

### 1. Project Packages
- [domain](file:///home/poss/dev/reseller_cross/packages/domain): Core business rules (Listing, Publication, validation rules).
- [contracts](file:///home/poss/dev/reseller_cross/packages/contracts): Shared DTOs and API payloads (CreateListingRequest, PublicationResponse, etc.).
- [connector-sdk](file:///home/poss/dev/reseller_cross/packages/connector-sdk): Connector interfaces (MarketplaceConnector, PublishResult, etc.).
- [apps/api](file:///home/poss/dev/reseller_cross/apps/api): NestJS backend exposing CRUD endpoints and mock publication.
- [apps/web](file:///home/poss/dev/reseller_cross/apps/web): Angular standalone frontend providing the V1 UI.

### 2. Active Branch
- `feat/backend-init` (fresh development environment).

### 3. Build & Test Verification
- **Build Status**: Green (all packages build successfully via `pnpm build`).
- **Domain/SDK Tests**: Passed.
- **Web UI Headless Tests**: Pending local environment setup (ChromeHeadless binary missing in sandbox, tests are technically structured).

---

## Shared Contracts Baseline

### API Contracts (`packages/contracts`)
- **HealthResponse**: `{ status: "ok" | "error"; service: string; timestamp: string }`
- **CreateListingRequest / UpdateListingRequest / ListingResponse**: Central listing models.
- **CreateMockPublicationRequest / PublicationResponse / PublishListingResponse**: Independent publication attempt models.

---

## Multi-Agent Coordination Protocol

Every task written to the agent inboxes must define:
1. **Objective**: Description of the requested change.
2. **Target Branch**: Git branch where the work must take place.
3. **Authorized Files**: Explicit list of files/folders the agent is allowed to create or edit.
4. **Forbidden Files**: Files/folders the agent must never touch (e.g., config, database schema, or other packages).
5. **Dependencies**: External or internal packages to install or reference.
6. **Acceptance Criteria**: Concrete specifications to meet.
7. **Required Tests**: Expected unit/integration test coverage.
8. **Result Format**: Format of the handoff message inside the outbox.
