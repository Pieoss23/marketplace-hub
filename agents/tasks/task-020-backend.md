# TASK-020-B — Backend Implementation: Announcement Publication Flow

## Objective
Implement the backend API endpoints, domain service logic, database migrations (Prisma), and SDK connector matching the new frozen `Announcement` contracts.

---

## 1. Scope & Frozen Contracts Reference
You must implement the backend logic to support the following endpoints:
```http
POST /api/announcements
GET /api/announcements
GET /api/announcements/:id
PUT /api/announcements/:id

PUT /api/announcements/:id/channels/:connectorCode
POST /api/announcements/:id/channels/:connectorCode/validate
POST /api/announcements/:id/channels/:connectorCode/publish

GET /api/announcements/:id/publications
```

### Reference Files
- Domain definitions: [announcement.ts](file:///home/poss/dev/reseller_cross/packages/domain/src/announcement.ts)
- API Contract definitions: [announcement.ts](file:///home/poss/dev/reseller_cross/packages/contracts/src/announcement.ts)
- SDK Interface definitions: [announcement-connector.ts](file:///home/poss/dev/reseller_cross/packages/connector-sdk/src/announcement-connector.ts)

---

## 2. Allowed & Forbidden Files

- **Authorized Files**:
  - `apps/api/**` (all NestJS backend controllers, services, repositories, modules, tests, and prisma files)
- **Forbidden Files**:
  - `apps/web/**` (must not touch frontend files)
  - `packages/domain/**` (contracts are frozen)
  - `packages/contracts/**` (contracts are frozen)
  - `packages/connector-sdk/**` (contracts are frozen)

---

## 3. Acceptance Criteria & Domain Rules

### Database & Models
1. **Migrations**: Create a database migration to update or introduce the `Announcement` model, replacing or alongside `Listing` if necessary, ensuring it persists all required fields: `id`, `title`, `description`, `price` (cents), `currency`, `categoryCode`, `condition`, `quantity`, `status`, and date fields.
2. **Channel Config**: Enable persisting the channel configurations with `connectorCode` and its JSON configuration dynamically, linked to the announcement.

### Validation & Publication logic
1. **validateAnnouncement**: Perform domain validation before any announcement creation or update. If invalid, return an `ApiErrorResponse` (status `422 Unprocessable Entity`) containing the list of `ValidationIssue`.
2. **MockConnector**:
   - Refactor/implement `MockConnector` to implement `AnnouncementConnector` interface.
   - For validation, require `category` to be defined in configuration. If the central title is longer than 80 characters, push a connector-specific `ValidationIssue`.
   - Map title, description, price, condition, etc. to payload.
   - Return a simulated external ID (`mock-external-<uuid>`), simulated URL (`http://mock-marketplace.local/listing/<id>`), and `publishedAt` date. Ensure clock and uuid generator are replaceable in tests.
3. **Publication Status Workflow**:
   - Transitions: `READY` (created attempt) -> `PUBLISHING` (job active) -> `PUBLISHED` or `FAILED`.
   - Update the overall `AnnouncementStatus` based on the status of all active channels (refer to [adr-003-publication-state-model.md](file:///home/poss/dev/reseller_cross/docs/decisions/adr-003-publication-state-model.md)).

---

## 4. Verification & Reporting

### Verification commands
Run these to verify formatting, types, and test suite:
```bash
pnpm --filter @marketplace-hub/api lint
pnpm --filter @marketplace-hub/api typecheck
pnpm --filter @marketplace-hub/api test
```

### Result Format
Submit a markdown report at `.agents/outbox/claude/task-020-backend-report.md` summarizing:
- Prisma migration steps.
- Endpoint implementation details.
- Green test suite execution log.
