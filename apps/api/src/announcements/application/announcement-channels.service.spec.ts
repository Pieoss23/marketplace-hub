import type { Announcement } from '@marketplace-hub/domain';
import { AnnouncementApiException } from '../announcement-api.exception';
import { ConnectorRegistry } from '../connectors/connector-registry';
import { MockChannelConnector } from '../connectors/mock-channel.connector';
import type { AnnouncementChannel } from '../domain/announcement-channel';
import { AnnouncementChannelsService } from './announcement-channels.service';
import type { AnnouncementRepository } from './announcement-repository';
import { AnnouncementStatusCalculator } from './announcement-status-calculator';
import { AnnouncementsService } from './announcements.service';

function buildRepository(): jest.Mocked<AnnouncementRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
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

const announcement: Announcement = {
  id: 'a1',
  title: 'Tastiera meccanica',
  description: 'Usata, in buone condizioni, tastiera meccanica vintage.',
  price: 15000,
  currency: 'EUR',
  categoryCode: 'electronics',
  condition: 'USED_GOOD',
  quantity: 1,
  status: 'READY',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const channel: AnnouncementChannel = {
  id: 'channel-1',
  announcementId: 'a1',
  connectorCode: 'mock',
  enabled: true,
  configuration: { category: 'vintage_keyboards' },
  validationStatus: 'PENDING',
  validationErrors: null,
  validatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildService(repository: jest.Mocked<AnnouncementRepository>) {
  const announcementsService = new AnnouncementsService(
    repository,
    new AnnouncementStatusCalculator(repository),
  );
  const connectorRegistry = new ConnectorRegistry(new MockChannelConnector());
  return new AnnouncementChannelsService(repository, announcementsService, connectorRegistry);
}

describe('AnnouncementChannelsService', () => {
  it('rejects enabling an unknown connector', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    const service = buildService(repository);

    await expect(service.enable('a1', 'unknown', true, {})).rejects.toBeInstanceOf(
      AnnouncementApiException,
    );
    expect(repository.upsertChannel).not.toHaveBeenCalled();
  });

  it('rejects enabling a channel for a missing announcement', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(null);
    const service = buildService(repository);

    await expect(service.enable('missing', 'mock', true, {})).rejects.toBeInstanceOf(
      AnnouncementApiException,
    );
  });

  it('upserts a valid channel configuration', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    repository.upsertChannel.mockResolvedValue(channel);
    const service = buildService(repository);

    await service.enable('a1', 'mock', true, { category: 'vintage_keyboards' });

    expect(repository.upsertChannel).toHaveBeenCalledWith('a1', 'mock', {
      enabled: true,
      configuration: { category: 'vintage_keyboards' },
    });
  });

  it('validates a configured channel and persists valid status', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    repository.findChannel.mockResolvedValue(channel);
    const service = buildService(repository);

    const outcome = await service.validate('a1', 'mock');

    expect(outcome.issues).toEqual([]);
    expect(repository.updateChannelValidation).toHaveBeenCalledWith('channel-1', {
      validationStatus: 'VALID',
      validationErrors: null,
      validatedAt: outcome.validatedAt,
    });
  });

  it('validates a channel and reports a connector-specific issue for a too-long title', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue({ ...announcement, title: 'a'.repeat(81) });
    repository.findChannel.mockResolvedValue(channel);
    const service = buildService(repository);

    const outcome = await service.validate('a1', 'mock');

    expect(outcome.issues).toEqual([
      expect.objectContaining({ code: 'mock.title.too_long', connectorCode: 'mock' }),
    ]);
    expect(repository.updateChannelValidation).toHaveBeenCalledWith(
      'channel-1',
      expect.objectContaining({ validationStatus: 'INVALID' }),
    );
  });

  it('throws when validating a channel that was never configured', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    repository.findChannel.mockResolvedValue(null);
    const service = buildService(repository);

    await expect(service.validate('a1', 'mock')).rejects.toBeInstanceOf(AnnouncementApiException);
  });
});
