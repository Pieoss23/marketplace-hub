import type {
  Listing,
  MarketplaceId,
  ValidationResult,
} from '@marketplace-hub/domain';

export interface PublishResult {
  readonly externalId: string;
  readonly publishedAt: Date;
}

export interface MarketplaceConnector<TConfiguration, TPayload> {
  readonly marketplaceId: MarketplaceId;

  validate(listing: Listing, configuration: TConfiguration): ValidationResult;

  transform(listing: Listing, configuration: TConfiguration): TPayload;

  publish(payload: TPayload): Promise<PublishResult>;
}
