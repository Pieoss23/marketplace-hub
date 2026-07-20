import type { Listing, Publication } from '@marketplace-hub/domain';
import { MockConnector } from '../connectors/mock/mock.connector';
import type { ListingsService } from '../listings/listings.service';
import type { PrismaPublicationStore } from './infrastructure/prisma-publication.store';
import { PublicationsService } from './publications.service';

const listing: Listing = {
  id: 'listing-1',
  title: 'Mechanical keyboard',
  description: 'Used mechanical keyboard in good condition.',
  price: { amountMinor: 7500, currency: 'EUR' },
  images: [{ url: 'https://example.test/keyboard.jpg', position: 0 }],
  createdAt: new Date('2026-07-12T08:00:00.000Z'),
  updatedAt: new Date('2026-07-12T08:00:00.000Z'),
};

describe('PublicationsService', () => {
  it('loads the listing, saves mock configuration and publishes it', async () => {
    const listingsService = {
      findOne: jest.fn().mockResolvedValue(listing),
    } as unknown as ListingsService;
    const publicationStore = {
      saveConfiguration: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as PrismaPublicationStore;
    const service = new PublicationsService(
      listingsService,
      new MockConnector(() => 'mock-external-1'),
      publicationStore,
    );

    const result = await service.publishMock('listing-1', {
      category: 'electronics',
    });

    expect(listingsService.findOne).toHaveBeenCalledWith('listing-1');
    expect(publicationStore.saveConfiguration).toHaveBeenCalledWith('listing-1', 'mock', {
      category: 'electronics',
    });
    expect(result.success).toBe(true);
    expect(result.publication).toMatchObject({
      listingId: 'listing-1',
      marketplaceId: 'mock',
      status: 'published',
      externalId: 'mock-external-1',
    });
    expect(publicationStore.save).toHaveBeenCalledTimes(5);
  });

  it('delegates publication queries to the store', async () => {
    const publications: Publication[] = [];
    const listingsService = {} as ListingsService;
    const publicationStore = {
      findByListingId: jest.fn().mockResolvedValue(publications),
    } as unknown as PrismaPublicationStore;
    const service = new PublicationsService(listingsService, new MockConnector(), publicationStore);

    await expect(service.findByListingId('listing-1')).resolves.toBe(publications);
    expect(publicationStore.findByListingId).toHaveBeenCalledWith('listing-1');
  });
});
