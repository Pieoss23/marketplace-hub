import type {
  Announcement,
  ProductCondition,
  ValidationIssue,
} from '@marketplace-hub/domain';

export interface ConnectorCapabilities {
  readonly name: string;
  readonly supportedConditions: readonly ProductCondition[];
  readonly supportedCurrencies: readonly string[];
}

export interface AnnouncementPublishResult {
  readonly externalListingId: string;
  readonly externalUrl: string;
  readonly publishedAt: Date;
}

export interface AnnouncementConnector<TConfiguration = unknown, TPayload = unknown> {
  readonly code: string; // e.g. 'mock'

  getCapabilities(): ConnectorCapabilities;

  validate(
    announcement: Announcement,
    configuration: TConfiguration,
  ): readonly ValidationIssue[];

  map(announcement: Announcement, configuration: TConfiguration): TPayload;

  publish(payload: TPayload): Promise<AnnouncementPublishResult>;
}
