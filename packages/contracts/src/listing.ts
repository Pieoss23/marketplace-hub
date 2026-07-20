export interface MoneyDto {
  amountMinor: number;
  currency: string;
}

export interface ListingImageDto {
  url: string;
  position: number;
}

export interface ListingResponse {
  id: string;
  title: string;
  description: string;
  price: MoneyDto;
  images: ListingImageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  price: MoneyDto;
  images: ListingImageDto[];
}

export type UpdateListingRequest = Partial<CreateListingRequest>;
