import type { Listing } from './listing.js';

export interface ValidationError {
  readonly code: string;
  readonly field: string;
  readonly message: string;
}

export type ValidationResult =
  | { readonly valid: true; readonly errors: readonly [] }
  | { readonly valid: false; readonly errors: readonly ValidationError[] };

const ISO_4217_CODE = /^[A-Z]{3}$/;

export function validateListing(listing: Listing): ValidationResult {
  const errors: ValidationError[] = [];

  if (listing.title.trim().length === 0) {
    errors.push({
      code: 'listing.title.required',
      field: 'title',
      message: 'Title is required.',
    });
  }

  if (listing.description.trim().length === 0) {
    errors.push({
      code: 'listing.description.required',
      field: 'description',
      message: 'Description is required.',
    });
  }

  if (!Number.isSafeInteger(listing.price.amountMinor) || listing.price.amountMinor < 0) {
    errors.push({
      code: 'listing.price.invalid_amount',
      field: 'price.amountMinor',
      message: 'Price must be a non-negative integer in minor currency units.',
    });
  }

  if (!ISO_4217_CODE.test(listing.price.currency)) {
    errors.push({
      code: 'listing.price.invalid_currency',
      field: 'price.currency',
      message: 'Currency must be a three-letter uppercase code.',
    });
  }

  const positions = new Set<number>();
  for (const [index, image] of listing.images.entries()) {
    if (!isHttpUrl(image.url)) {
      errors.push({
        code: 'listing.image.invalid_url',
        field: `images.${index}.url`,
        message: 'Image URL must use HTTP or HTTPS.',
      });
    }

    if (!Number.isSafeInteger(image.position) || image.position < 0 || positions.has(image.position)) {
      errors.push({
        code: 'listing.image.invalid_position',
        field: `images.${index}.position`,
        message: 'Image position must be a unique non-negative integer.',
      });
    }
    positions.add(image.position);
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
