import type { Publication } from '@marketplace-hub/domain';
import type { PrismaService } from '../../prisma/prisma.service';
import { PrismaPublicationStore } from './prisma-publication.store';

describe('PrismaPublicationStore', () => {
  it('upserts a complete publication snapshot', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      publication: { upsert },
    } as unknown as PrismaService;
    const store = new PrismaPublicationStore(prisma);
    const publication: Publication = {
      id: 'publication-1',
      listingId: 'listing-1',
      marketplaceId: 'mock',
      status: 'published',
      externalId: 'mock-external-1',
      createdAt: new Date('2026-07-12T09:00:00.000Z'),
      updatedAt: new Date('2026-07-12T09:01:00.000Z'),
    };

    await store.save(publication);

    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'publication-1' },
      create: {
        id: 'publication-1',
        listingId: 'listing-1',
        marketplaceId: 'mock',
        status: 'published',
        externalId: 'mock-external-1',
        lastError: null,
        createdAt: new Date('2026-07-12T09:00:00.000Z'),
        updatedAt: new Date('2026-07-12T09:01:00.000Z'),
      },
      update: {
        status: 'published',
        externalId: 'mock-external-1',
        lastError: null,
        updatedAt: new Date('2026-07-12T09:01:00.000Z'),
      },
    });
  });

  it('persists a failure and clears an absent external id', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      publication: { upsert },
    } as unknown as PrismaService;
    const store = new PrismaPublicationStore(prisma);

    await store.save({
      id: 'publication-1',
      listingId: 'listing-1',
      marketplaceId: 'mock',
      status: 'failed',
      lastError: 'Mock unavailable',
      createdAt: new Date('2026-07-12T09:00:00.000Z'),
      updatedAt: new Date('2026-07-12T09:01:00.000Z'),
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: 'failed',
          externalId: null,
          lastError: 'Mock unavailable',
        }),
      }),
    );
  });

  it('upserts a marketplace configuration separately from the listing', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      marketplaceConfiguration: { upsert },
    } as unknown as PrismaService;
    const store = new PrismaPublicationStore(prisma);

    await store.saveConfiguration('listing-1', 'mock', {
      category: 'electronics',
    });

    expect(upsert).toHaveBeenCalledWith({
      where: {
        listingId_marketplaceId: {
          listingId: 'listing-1',
          marketplaceId: 'mock',
        },
      },
      create: {
        listingId: 'listing-1',
        marketplaceId: 'mock',
        configuration: { category: 'electronics' },
      },
      update: { configuration: { category: 'electronics' } },
    });
  });

  it('maps publication records back to domain values', async () => {
    const createdAt = new Date('2026-07-12T09:00:00.000Z');
    const updatedAt = new Date('2026-07-12T09:01:00.000Z');
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'publication-1',
        listingId: 'listing-1',
        marketplaceId: 'mock',
        status: 'failed',
        externalId: null,
        lastError: 'Mock unavailable',
        createdAt,
        updatedAt,
      },
    ]);
    const prisma = {
      publication: { findMany },
    } as unknown as PrismaService;
    const store = new PrismaPublicationStore(prisma);

    await expect(store.findByListingId('listing-1')).resolves.toEqual([
      {
        id: 'publication-1',
        listingId: 'listing-1',
        marketplaceId: 'mock',
        status: 'failed',
        lastError: 'Mock unavailable',
        createdAt,
        updatedAt,
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { listingId: 'listing-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
