import type { Listing } from '@marketplace-hub/domain';
import { ListingDto } from './dto/listing.dto';

export function toListingDto(listing: Listing): ListingDto {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: { amountMinor: listing.price.amountMinor, currency: listing.price.currency },
    images: listing.images.map((image) => ({ url: image.url, position: image.position })),
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}
