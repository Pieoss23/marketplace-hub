import type { Announcement, ValidationIssue } from '@marketplace-hub/domain';

export interface AnnouncementChannelPayload {
  readonly connectorCode: string;
  readonly title: string;
  readonly description: string;
  readonly price: { readonly amount: number; readonly currency: string };
  readonly categoryCode: string;
  readonly condition: string;
  readonly quantity: number;
  readonly configuration: Record<string, unknown>;
}

export interface AnnouncementChannelPublishResult {
  readonly externalListingId: string;
  readonly externalUrl: string;
}

/**
 * Connector contract scoped to this Announcement vertical slice. Not the
 * same as `MarketplaceConnector` in `@marketplace-hub/connector-sdk`, whose
 * method signatures hardcode `Listing` (the old central model) and can't be
 * reused for `Announcement` without modifying connector-sdk, which is
 * outside TASK-021's allowed paths.
 */
export interface AnnouncementChannelConnector {
  readonly connectorCode: string;
  validate(announcement: Announcement, configuration: Record<string, unknown>): ValidationIssue[];
  map(
    announcement: Announcement,
    configuration: Record<string, unknown>,
  ): AnnouncementChannelPayload;
  publish(payload: AnnouncementChannelPayload): Promise<AnnouncementChannelPublishResult>;
}
