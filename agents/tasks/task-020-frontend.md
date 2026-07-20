# TASK-020-F — Frontend Implementation: Announcement Publication Flow

## Objective
Refactor and implement the frontend interface in Angular (`apps/web`) to support the new frozen `Announcement` contracts, including multi-channel configuration, dry-run validation display, and publication attempt status history.

---

## 1. Scope & Frozen Contracts Reference
You must integrate with the new announcement REST endpoints:
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

---

## 2. Allowed & Forbidden Files

- **Authorized Files**:
  - `apps/web/**` (all Angular frontend source files, templates, styles, tests, and configuration files)
- **Forbidden Files**:
  - `apps/api/**` (must not touch NestJS backend)
  - `packages/domain/**` (contracts are frozen)
  - `packages/contracts/**` (contracts are frozen)
  - `packages/connector-sdk/**` (contracts are frozen)

---

## 3. Acceptance Criteria & UI Requirements

### Forms & UI Inputs
1. **Creation / Modification Form**:
   - Inputs for: Title (max 120 chars), Description, Price (in Euros, mapped to/from cents), Currency (default EUR), Category Code, Product Condition (select dropdown with options: `NEW`, `LIKE_NEW`, `USED_GOOD`, `USED_ACCEPTABLE`, `FOR_PARTS`), and Quantity.
   - Support both Creation (`POST /api/announcements`) and Replacement Update (`PUT /api/announcements/:id`).

### Channel & Validation UI
1. **Connector Integration**:
   - Provide UI controls to manage the `mock` channel: toggle enablement and input configuration (category string).
   - Provide a "Validate Channel" action triggering `POST /api/announcements/:id/channels/mock/validate`.
   - Render the validation issues returned (`issues[]`), highlighting the severity (`ERROR`, `WARNING`, `INFO`).

2. **Publishing & History UI**:
   - Enable publishing via `POST /api/announcements/:id/channels/mock/publish`.
   - Show publication state changes and retrieve independent publication history from `GET /api/announcements/:id/publications`.
   - Render the overall status of the announcement (`DRAFT`, `READY`, `PARTIALLY_PUBLISHED`, `PUBLISHED`).

---

## 4. Verification & Reporting

### Verification commands
Run these to verify formatting and types:
```bash
pnpm --filter @marketplace-hub/web lint
pnpm --filter @marketplace-hub/web typecheck
```

### Result Format
Submit a markdown report at `.agents/outbox/codex/task-020-frontend-report.md` summarizing:
- Form fields and UI components refactored.
- Integration screenshots (or console flow logs) demonstrating successful publication and validation issues handling.
- Green linting and typechecking outputs.
