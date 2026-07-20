import assert from 'node:assert/strict';
import test from 'node:test';
import { validateListing } from '../dist/index.js';

const validListing = {
  id: 'listing-1',
  title: 'Mechanical keyboard',
  description: 'Used mechanical keyboard in good condition.',
  price: { amountMinor: 7500, currency: 'EUR' },
  images: [{ url: 'https://example.test/keyboard.jpg', position: 0 }],
  createdAt: new Date('2026-07-12T08:00:00.000Z'),
  updatedAt: new Date('2026-07-12T08:00:00.000Z'),
};

test('accepts a valid central listing', () => {
  assert.deepEqual(validateListing(validListing), { valid: true, errors: [] });
});

test('returns structured errors for invalid general fields', () => {
  const result = validateListing({
    ...validListing,
    title: ' ',
    price: { amountMinor: 10.5, currency: 'eur' },
  });

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.errors.map(({ code, field }) => ({ code, field })),
    [
      { code: 'listing.title.required', field: 'title' },
      { code: 'listing.price.invalid_amount', field: 'price.amountMinor' },
      { code: 'listing.price.invalid_currency', field: 'price.currency' },
    ],
  );
});

test('rejects invalid URLs and duplicate image positions', () => {
  const result = validateListing({
    ...validListing,
    images: [
      { url: 'file:///tmp/image.jpg', position: 0 },
      { url: 'https://example.test/second.jpg', position: 0 },
    ],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.errors.map(({ code, field }) => ({ code, field })),
    [
      { code: 'listing.image.invalid_url', field: 'images.0.url' },
      { code: 'listing.image.invalid_position', field: 'images.1.position' },
    ],
  );
});
