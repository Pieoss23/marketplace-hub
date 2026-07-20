# ADR-003 — Announcement & Publication State Model

## Status
Accepted.

## Context
In V1, we had a simplified model called `Listing` and a `Publication` model. In order to scale to multiple publishing channels and establish a robust architecture for cross-posting, we need to transition to a more comprehensive state machine for the central announcement and its publication attempts across channels.

We need to support:
- Channel configuration and toggle (enabling/disabling channels per announcement).
- Pre-publication validation for individual channels.
- Aggregated overall status on the central announcement based on active channels.

## Decision

1. **Renaming / Transition**:
   - Transition the core entity from `Listing` to `Announcement` to better reflect its cross-publishing nature.
   - Introduce `AnnouncementStatus` (`DRAFT`, `READY`, `PARTIALLY_PUBLISHED`, `PUBLISHED`) to represent the aggregated status of the central listing.
   - Introduce `PublicationStatus` (`READY`, `PUBLISHING`, `PUBLISHED`, `FAILED`) to track independent publication jobs on individual channels.

2. **Aggregation Rule**:
   - `DRAFT`: The announcement itself has validation errors or has no active channels.
   - `READY`: The announcement is valid, and all active channels are configured but none are published yet.
   - `PARTIALLY_PUBLISHED`: At least one active channel is successfully `PUBLISHED`, while at least one other active channel is in `FAILED` or `READY` state.
   - `PUBLISHED`: All active channels are successfully `PUBLISHED`.

3. **Validation and SDK Contract**:
   - Introduce `ValidationIssue` with explicit severities (`ERROR`, `WARNING`, `INFO`).
   - Block publication to any channel if any issue of severity `ERROR` is found.
   - Standardize `AnnouncementConnector` interface to include `code`, `getCapabilities`, `validate`, `map`, and `publish`.

4. **API Integration**:
   - Define strict contracts (`CreateAnnouncementRequest`, `AnnouncementResponse`, etc.) mapped to domain models behind NestJS.
   - Maintain strict DTO decoupling: controllers return `AnnouncementResponse` containing mapped channel statuses.

## Consequences
- The database schema (Prisma) and NestJS services will require refactoring or migration to adopt the `Announcement` model.
- Claude Code (backend) and Codex CLI (frontend) will carry out the code implementation of this model, preserving clean boundaries between domain, API transport, and persistence.
