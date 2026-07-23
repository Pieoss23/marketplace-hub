import type { Announcement } from '@marketplace-hub/domain';
import type { AnnouncementRepository } from './announcement-repository';
import { AnnouncementStatusCalculator } from './announcement-status-calculator';

function buildRepository(): jest.Mocked<AnnouncementRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
    findChannel: jest.fn(),
    findChannels: jest.fn(),
    upsertChannel: jest.fn(),
    updateChannelValidation: jest.fn(),
    createPublication: jest.fn(),
    updatePublication: jest.fn(),
    findLatestPublication: jest.fn(),
    findPublicationsByAnnouncementId: jest.fn(),
    findLatestPublicationsByChannel: jest.fn(),
  };
}

const validAnnouncement: Announcement = {
  id: 'a1',
  title: 'Tastiera meccanica',
  description: 'Usata, in buone condizioni, tastiera meccanica vintage.',
  price: 15000,
  currency: 'EUR',
  categoryCode: 'electronics',
  condition: 'USED_GOOD',
  quantity: 1,
  status: 'DRAFT',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AnnouncementStatusCalculator', () => {
  it('returns DRAFT when general validation fails', async () => {
    const repository = buildRepository();
    const calculator = new AnnouncementStatusCalculator(repository);

    await expect(calculator.compute({ ...validAnnouncement, title: '' })).resolves.toBe('DRAFT');
    expect(repository.findChannels).not.toHaveBeenCalled();
  });

  it('returns READY when valid with no enabled channels', async () => {
    const repository = buildRepository();
    repository.findChannels.mockResolvedValue([]);
    const calculator = new AnnouncementStatusCalculator(repository);

    await expect(calculator.compute(validAnnouncement)).resolves.toBe('READY');
  });

  it('returns PUBLISHED when every enabled channel is published', async () => {
    const repository = buildRepository();
    repository.findChannels.mockResolvedValue([
      {
        id: 'c1',
        announcementId: 'a1',
        connectorCode: 'mock',
        enabled: true,
        configuration: {},
        validationStatus: 'VALID',
        validationErrors: null,
        validatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    repository.findLatestPublicationsByChannel.mockResolvedValue([
      {
        id: 'p1',
        announcementId: 'a1',
        announcementChannelId: 'c1',
        connectorCode: 'mock',
        status: 'PUBLISHED',
        externalListingId: 'mock_1',
        externalUrl: 'https://mock.marketplace.local/listings/1',
        lastError: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const calculator = new AnnouncementStatusCalculator(repository);

    await expect(calculator.compute(validAnnouncement)).resolves.toBe('PUBLISHED');
  });

  it('returns PARTIALLY_PUBLISHED when only some enabled channels are published', async () => {
    const repository = buildRepository();
    repository.findChannels.mockResolvedValue([
      {
        id: 'c1',
        announcementId: 'a1',
        connectorCode: 'mock',
        enabled: true,
        configuration: {},
        validationStatus: 'VALID',
        validationErrors: null,
        validatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'c2',
        announcementId: 'a1',
        connectorCode: 'other',
        enabled: true,
        configuration: {},
        validationStatus: 'VALID',
        validationErrors: null,
        validatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    repository.findLatestPublicationsByChannel.mockResolvedValue([
      {
        id: 'p1',
        announcementId: 'a1',
        announcementChannelId: 'c1',
        connectorCode: 'mock',
        status: 'PUBLISHED',
        externalListingId: 'mock_1',
        externalUrl: 'https://mock.marketplace.local/listings/1',
        lastError: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'p2',
        announcementId: 'a1',
        announcementChannelId: 'c2',
        connectorCode: 'other',
        status: 'FAILED',
        externalListingId: null,
        externalUrl: null,
        lastError: 'boom',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const calculator = new AnnouncementStatusCalculator(repository);

    await expect(calculator.compute(validAnnouncement)).resolves.toBe('PARTIALLY_PUBLISHED');
  });
});
