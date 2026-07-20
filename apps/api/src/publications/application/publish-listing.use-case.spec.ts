import type { Listing, ValidationResult } from '@marketplace-hub/domain';
import { MockConnector } from '../../connectors/mock/mock.connector';
import { InMemoryPublicationStore } from '../infrastructure/in-memory-publication.store';
import { type ListingValidator, PublishListingUseCase } from './publish-listing.use-case';

const listing: Listing = {
  id: 'listing-1',
  title: 'Mechanical keyboard',
  description: 'Used mechanical keyboard in good condition.',
  price: { amountMinor: 7500, currency: 'EUR' },
  images: [{ url: 'https://example.test/keyboard.jpg', position: 0 }],
  createdAt: new Date('2026-07-12T08:00:00.000Z'),
  updatedAt: new Date('2026-07-12T08:00:00.000Z'),
};

const validListing: ListingValidator = () => ({ valid: true, errors: [] });

describe('PublishListingUseCase', () => {
  it('runs validation, transformation and mock publication in order', async () => {
    const store = new InMemoryPublicationStore();
    const publishedAt = new Date('2026-07-12T10:00:00.000Z');
    const connector = new MockConnector(
      () => 'mock-external-1',
      () => publishedAt,
    );
    const useCase = new PublishListingUseCase(
      connector,
      store,
      validListing,
      () => 'publication-1',
      createClock(),
    );

    const result = await useCase.execute({
      listing,
      configuration: { category: 'electronics' },
    });

    expect(result).toEqual({
      success: true,
      publication: {
        id: 'publication-1',
        listingId: 'listing-1',
        marketplaceId: 'mock',
        status: 'published',
        externalId: 'mock-external-1',
        createdAt: new Date('2026-07-12T09:00:00.000Z'),
        updatedAt: publishedAt,
      },
      errors: [],
    });
    expect(store.getHistory('publication-1').map(({ status }) => status)).toEqual([
      'draft',
      'validating',
      'ready',
      'publishing',
      'published',
    ]);
  });

  it('stops before connector validation when general validation fails', async () => {
    const store = new InMemoryPublicationStore();
    const connector = new MockConnector();
    const connectorValidation = jest.spyOn(connector, 'validate');
    const errors = [
      {
        code: 'listing.title.required',
        field: 'title',
        message: 'Title is required.',
      },
    ] as const;
    const invalidListing: ListingValidator = (): ValidationResult => ({
      valid: false,
      errors,
    });
    const useCase = new PublishListingUseCase(
      connector,
      store,
      invalidListing,
      () => 'publication-1',
      createClock(),
    );

    const result = await useCase.execute({
      listing,
      configuration: { category: 'electronics' },
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(errors);
    expect(result.publication.status).toBe('failed');
    expect(connectorValidation).not.toHaveBeenCalled();
    expect(store.getHistory('publication-1').map(({ status }) => status)).toEqual([
      'draft',
      'validating',
      'failed',
    ]);
  });

  it('persists connector validation failure independently', async () => {
    const store = new InMemoryPublicationStore();
    const useCase = new PublishListingUseCase(
      new MockConnector(),
      store,
      validListing,
      () => 'publication-1',
      createClock(),
    );

    const result = await useCase.execute({
      listing,
      configuration: { category: ' ' },
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      {
        code: 'mock.category.required',
        field: 'configuration.category',
        message: 'Mock category is required.',
      },
    ]);
    expect(store.findById('publication-1')?.status).toBe('failed');
  });

  it('saves a structured failure when mock publication throws', async () => {
    const store = new InMemoryPublicationStore();
    const connector = new MockConnector();
    jest.spyOn(connector, 'publish').mockRejectedValue(new Error('Mock unavailable'));
    const useCase = new PublishListingUseCase(
      connector,
      store,
      validListing,
      () => 'publication-1',
      createClock(),
    );

    const result = await useCase.execute({
      listing,
      configuration: { category: 'electronics' },
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      {
        code: 'publication.publish.failed',
        field: 'publication',
        message: 'Mock unavailable',
      },
    ]);
    expect(result.publication).toMatchObject({
      status: 'failed',
      lastError: 'Mock unavailable',
    });
  });

  it('keeps the state of separate publications independent', async () => {
    const store = new InMemoryPublicationStore();
    const ids = ['publication-1', 'publication-2'];
    const connector = new MockConnector();
    const useCase = new PublishListingUseCase(
      connector,
      store,
      validListing,
      () => ids.shift() ?? 'unexpected-publication',
      createClock(),
    );

    await useCase.execute({
      listing,
      configuration: { category: 'electronics' },
    });
    await useCase.execute({
      listing,
      configuration: { category: 'collectibles' },
    });

    expect(store.findById('publication-1')?.status).toBe('published');
    expect(store.findById('publication-2')?.status).toBe('published');
    expect(store.getHistory('publication-1')).toHaveLength(5);
    expect(store.getHistory('publication-2')).toHaveLength(5);
  });
});

function createClock(): () => Date {
  let milliseconds = Date.parse('2026-07-12T09:00:00.000Z');
  return () => {
    const current = new Date(milliseconds);
    milliseconds += 1000;
    return current;
  };
}
