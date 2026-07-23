import type { PrismaService } from '../../prisma/prisma.service';
import { PrismaAnnouncementRepository } from './prisma-announcement.repository';

const createdAt = new Date('2026-07-12T09:00:00.000Z');
const updatedAt = new Date('2026-07-12T09:01:00.000Z');

describe('PrismaAnnouncementRepository', () => {
  it('maps a created announcement record back to the domain shape', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'announcement-1',
      title: 'Tastiera meccanica',
      description: 'Usata, buone condizioni.',
      priceAmount: 15000,
      currency: 'EUR',
      categoryCode: 'electronics',
      condition: 'USED_GOOD',
      quantity: 1,
      status: 'READY',
      createdAt,
      updatedAt,
    });
    const prisma = { announcement: { create } } as unknown as PrismaService;
    const repository = new PrismaAnnouncementRepository(prisma);

    const result = await repository.create(
      {
        title: 'Tastiera meccanica',
        description: 'Usata, buone condizioni.',
        priceAmount: 15000,
        currency: 'EUR',
        categoryCode: 'electronics',
        condition: 'USED_GOOD',
        quantity: 1,
      },
      'READY',
    );

    expect(result).toEqual({
      id: 'announcement-1',
      title: 'Tastiera meccanica',
      description: 'Usata, buone condizioni.',
      price: 15000,
      currency: 'EUR',
      categoryCode: 'electronics',
      condition: 'USED_GOOD',
      quantity: 1,
      status: 'READY',
      createdAt,
      updatedAt,
    });
  });

  it('returns null on update when the announcement does not exist', async () => {
    const update = jest.fn().mockRejectedValue({ code: 'P2025' });
    const prisma = { announcement: { update } } as unknown as PrismaService;
    const repository = new PrismaAnnouncementRepository(prisma);

    await expect(
      repository.update(
        'missing',
        {
          title: 'x',
          description: 'y',
          priceAmount: 100,
          currency: 'EUR',
          categoryCode: 'c',
          condition: 'NEW',
          quantity: 1,
        },
        'READY',
      ),
    ).resolves.toBeNull();
  });

  it('rethrows unrelated errors on update', async () => {
    const error = new Error('connection lost');
    const update = jest.fn().mockRejectedValue(error);
    const prisma = { announcement: { update } } as unknown as PrismaService;
    const repository = new PrismaAnnouncementRepository(prisma);

    await expect(
      repository.update(
        'id',
        {
          title: 'x',
          description: 'y',
          priceAmount: 100,
          currency: 'EUR',
          categoryCode: 'c',
          condition: 'NEW',
          quantity: 1,
        },
        'READY',
      ),
    ).rejects.toBe(error);
  });

  it('deletes an existing announcement', async () => {
    const deleteFn = jest.fn().mockResolvedValue({});
    const prisma = { announcement: { delete: deleteFn } } as unknown as PrismaService;
    const repository = new PrismaAnnouncementRepository(prisma);

    await expect(repository.delete('announcement-1')).resolves.toBe(true);
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 'announcement-1' } });
  });

  it('returns false on delete when the announcement does not exist', async () => {
    const deleteFn = jest.fn().mockRejectedValue({ code: 'P2025' });
    const prisma = { announcement: { delete: deleteFn } } as unknown as PrismaService;
    const repository = new PrismaAnnouncementRepository(prisma);

    await expect(repository.delete('missing')).resolves.toBe(false);
  });

  it('rethrows unrelated errors on delete', async () => {
    const error = new Error('connection lost');
    const deleteFn = jest.fn().mockRejectedValue(error);
    const prisma = { announcement: { delete: deleteFn } } as unknown as PrismaService;
    const repository = new PrismaAnnouncementRepository(prisma);

    await expect(repository.delete('announcement-1')).rejects.toBe(error);
  });

  it('upserts a channel by announcementId/connectorCode', async () => {
    const upsert = jest.fn().mockResolvedValue({
      id: 'channel-1',
      announcementId: 'announcement-1',
      connectorCode: 'mock',
      enabled: true,
      configuration: { category: 'electronics' },
      validationStatus: 'PENDING',
      validationErrors: null,
      validatedAt: null,
      createdAt,
      updatedAt,
    });
    const prisma = { announcementChannel: { upsert } } as unknown as PrismaService;
    const repository = new PrismaAnnouncementRepository(prisma);

    const result = await repository.upsertChannel('announcement-1', 'mock', {
      enabled: true,
      configuration: { category: 'electronics' },
    });

    expect(upsert).toHaveBeenCalledWith({
      where: {
        announcementId_connectorCode: { announcementId: 'announcement-1', connectorCode: 'mock' },
      },
      create: {
        announcementId: 'announcement-1',
        connectorCode: 'mock',
        enabled: true,
        configuration: { category: 'electronics' },
      },
      update: { enabled: true, configuration: { category: 'electronics' } },
    });
    expect(result.enabled).toBe(true);
    expect(result.validationStatus).toBe('PENDING');
  });

  it('keeps only the latest publication per channel', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'pub-2',
        announcementId: 'a1',
        announcementChannelId: 'channel-1',
        connectorCode: 'mock',
        status: 'PUBLISHED',
        externalListingId: 'mock_2',
        externalUrl: 'https://mock.marketplace.local/listings/2',
        lastError: null,
        publishedAt: updatedAt,
        createdAt: updatedAt,
        updatedAt,
      },
      {
        id: 'pub-1',
        announcementId: 'a1',
        announcementChannelId: 'channel-1',
        connectorCode: 'mock',
        status: 'FAILED',
        externalListingId: null,
        externalUrl: null,
        lastError: 'boom',
        publishedAt: null,
        createdAt,
        updatedAt: createdAt,
      },
    ]);
    const prisma = { announcementPublication: { findMany } } as unknown as PrismaService;
    const repository = new PrismaAnnouncementRepository(prisma);

    const result = await repository.findLatestPublicationsByChannel('a1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pub-2');
    expect(result[0].status).toBe('PUBLISHED');
  });
});
