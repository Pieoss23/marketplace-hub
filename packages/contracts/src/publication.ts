export interface CreateMockPublicationRequest {
  category: string;
}

export interface PublicationErrorResponse {
  code: string;
  field: string;
  message: string;
}

export interface PublicationResponse {
  id: string;
  listingId: string;
  marketplaceId: 'mock';
  status: 'draft' | 'validating' | 'ready' | 'publishing' | 'published' | 'failed';
  externalId?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishListingResponse {
  success: boolean;
  publication: PublicationResponse;
  errors: PublicationErrorResponse[];
}
