import type { MarketplaceId } from './listing.js';

export const PUBLICATION_STATUSES = [
  'draft',
  'validating',
  'ready',
  'publishing',
  'published',
  'failed',
] as const;

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export interface Publication {
  readonly id: string;
  readonly listingId: string;
  readonly marketplaceId: MarketplaceId;
  readonly status: PublicationStatus;
  readonly externalId?: string;
  readonly lastError?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
