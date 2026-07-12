/**
 * Local replacement for the `PublicationStatus` type exported from
 * `@marketplace-hub/domain`, which currently resolves to the OLD
 * Listing-publication union ('draft' | 'validating' | 'ready' |
 * 'publishing' | 'published' | 'failed') because `packages/domain/src/index.ts`
 * re-exports two different `PublicationStatus` types under the same name and
 * only the old one wins as a *type* export. The values below match
 * `docs/api/announcement-publication-api.md` and TASK-021. See the
 * CHANGE_REQUEST in `.agents/outbox/claude/task-021.md` — this file is a
 * workaround, not a fix, because `packages/domain` and `packages/contracts`
 * are outside TASK-021's allowed paths.
 */
export const ANNOUNCEMENT_PUBLICATION_STATUSES = [
  'READY',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
] as const;

export type AnnouncementPublicationStatus = (typeof ANNOUNCEMENT_PUBLICATION_STATUSES)[number];
