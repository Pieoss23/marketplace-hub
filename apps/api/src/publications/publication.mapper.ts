import type { Publication } from '@marketplace-hub/domain';
import type { PublishListingResult } from './application/publish-listing.use-case';
import { PublicationDto, PublishListingResponseDto } from './dto/publication.dto';

export function toPublicationDto(publication: Publication): PublicationDto {
  return {
    id: publication.id,
    listingId: publication.listingId,
    marketplaceId: publication.marketplaceId,
    status: publication.status,
    ...(publication.externalId !== undefined && { externalId: publication.externalId }),
    ...(publication.lastError !== undefined && { lastError: publication.lastError }),
    createdAt: publication.createdAt.toISOString(),
    updatedAt: publication.updatedAt.toISOString(),
  };
}

export function toPublishListingResponse(result: PublishListingResult): PublishListingResponseDto {
  return {
    success: result.success,
    publication: toPublicationDto(result.publication),
    errors: result.errors.map((error) => ({ ...error })),
  };
}
