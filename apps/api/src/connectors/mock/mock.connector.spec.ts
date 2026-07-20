import type { Listing } from '@marketplace-hub/domain';
import { MockConnector } from './mock.connector';

const listing: Listing = {
  id: 'listing-1',
  title: 'Mechanical keyboard',
  description: 'Used mechanical keyboard in good condition.',
  price: { amountMinor: 7500, currency: 'EUR' },
  images: [
    { url: 'https://example.test/second.jpg', position: 1 },
    { url: 'https://example.test/first.jpg', position: 0 },
  ],
  createdAt: new Date('2026-07-12T08:00:00.000Z'),
  updatedAt: new Date('2026-07-12T08:00:00.000Z'),
};

describe('MockConnector', () => {
  it('accepts a valid mock configuration', () => {
    const connector = new MockConnector();

    expect(connector.validate(listing, { category: 'electronics' })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('returns structured connector-specific validation errors', () => {
    const connector = new MockConnector();
    const result = connector.validate({ ...listing, title: 'a'.repeat(81) }, { category: ' ' });

    expect(result).toEqual({
      valid: false,
      errors: [
        {
          code: 'mock.category.required',
          field: 'configuration.category',
          message: 'Mock category is required.',
        },
        {
          code: 'mock.title.too_long',
          field: 'title',
          message: 'Mock title must not exceed 80 characters.',
        },
      ],
    });
  });

  it('transforms the central listing into an isolated mock payload', () => {
    const connector = new MockConnector();

    expect(connector.transform(listing, { category: 'electronics' })).toEqual({
      category: 'electronics',
      title: 'Mechanical keyboard',
      description: 'Used mechanical keyboard in good condition.',
      price: { amountMinor: 7500, currency: 'EUR' },
      imageUrls: ['https://example.test/first.jpg', 'https://example.test/second.jpg'],
    });
  });

  it('publishes without external calls and returns an independently generated result', async () => {
    const publishedAt = new Date('2026-07-12T09:30:00.000Z');
    const connector = new MockConnector(
      () => 'mock-external-1',
      () => publishedAt,
    );
    const payload = connector.transform(listing, {
      category: 'electronics',
    });

    await expect(connector.publish(payload)).resolves.toEqual({
      externalId: 'mock-external-1',
      publishedAt,
    });
  });
});
