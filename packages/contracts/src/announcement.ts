import type {
  AnnouncementPublicationStatus as PublicationStatus,
  AnnouncementStatus,
  ProductCondition,
  ValidationIssue,
} from '@marketplace-hub/domain';

export interface CreateAnnouncementRequest {
  readonly title: string;
  readonly description: string;
  readonly priceAmount: number; // in cents
  readonly currency: string;
  readonly categoryCode: string;
  readonly condition: ProductCondition;
  readonly quantity: number;
}

export type UpdateAnnouncementRequest = CreateAnnouncementRequest;

export interface ChannelPublicationResponse {
  readonly connectorCode: string;
  readonly enabled: boolean;
  readonly status: PublicationStatus;
  readonly externalListingId?: string;
  readonly externalUrl?: string;
  readonly lastError?: string;
  readonly publishedAt?: string;
}

export interface AnnouncementResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly price: number; // in cents
  readonly currency: string;
  readonly categoryCode: string;
  readonly condition: ProductCondition;
  readonly quantity: number;
  readonly status: AnnouncementStatus;
  readonly channels: readonly ChannelPublicationResponse[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EnableAnnouncementChannelRequest {
  readonly connectorCode: string;
  readonly enabled: boolean;
  readonly configuration: Record<string, unknown>;
}

export interface ChannelValidationResponse {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly validatedAt: string;
}

export interface PublishAnnouncementResponse {
  readonly publicationId: string;
  readonly status: PublicationStatus;
  readonly connectorCode: string;
  readonly externalListingId?: string;
  readonly externalUrl?: string;
  readonly publishedAt?: string;
}

export interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly details?: unknown;
}
