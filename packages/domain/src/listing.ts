export const MARKETPLACE_IDS = ['mock'] as const;

export type MarketplaceId = (typeof MARKETPLACE_IDS)[number];

export interface Money {
  readonly amountMinor: number;
  readonly currency: string;
}

export interface ListingImage {
  readonly url: string;
  readonly position: number;
}

export interface Listing {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly price: Money;
  readonly images: readonly ListingImage[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MarketplaceConfiguration<TConfiguration = unknown> {
  readonly marketplaceId: MarketplaceId;
  readonly configuration: TConfiguration;
}
