import type { Announcement } from '@marketplace-hub/domain';
import { AnnouncementApiException } from '../announcement-api.exception';
import { ConnectorRegistry } from '../connectors/connector-registry';
import { MockChannelConnector } from '../connectors/mock-channel.connector';
import type { AnnouncementChannel } from '../domain/announcement-channel';
import type { AnnouncementPublication } from '../domain/announcement-publication';
import type { AnnouncementRepository } from './announcement-repository';
import { AnnouncementStatusCalculator } from './announcement-status-calculator';
import { PublishAnnouncementUseCase } from './publish-announcement.use-case';

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

const enabledChannel: AnnouncementChannel = {
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

function readyPublication(
  overrides: Partial<AnnouncementPublication> = {},
): AnnouncementPublication {
  return {
    id: 'publication-1',
    announcementId: 'a1',
    announcementChannelId: 'channel-1',
    connectorCode: 'mock',
    status: 'READY',
    externalListingId: null,
    externalUrl: null,
    lastError: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildUseCase(
  repository: jest.Mocked<AnnouncementRepository>,
  connector = new MockChannelConnector(() => 'fixed-id'),
) {
  const connectorRegistry = new ConnectorRegistry(connector);
  const statusCalculator = new AnnouncementStatusCalculator(repository);
  return new PublishAnnouncementUseCase(repository, connectorRegistry, statusCalculator);
}

describe('PublishAnnouncementUseCase', () => {
  it('publishes a valid announcement through the mock connector', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    repository.findChannel.mockResolvedValue(enabledChannel);
    repository.findLatestPublication.mockResolvedValue(null);
    repository.createPublication.mockResolvedValue(readyPublication());
    repository.updatePublication.mockImplementation((_id, data) =>
      Promise.resolve(
        readyPublication({
          status: data.status,
          externalListingId: data.externalListingId ?? null,
          externalUrl: data.externalUrl ?? null,
          publishedAt: data.publishedAt ?? null,
        }),
      ),
    );
    repository.findChannels.mockResolvedValue([enabledChannel]);
    repository.findLatestPublicationsByChannel.mockResolvedValue([
      readyPublication({ status: 'PUBLISHED' }),
    ]);

    const useCase = buildUseCase(repository);
    const result = await useCase.execute('a1', 'mock');

    expect(result.publication.status).toBe('PUBLISHED');
    expect(result.publication.externalListingId).toBe('mock_fixed-id');
    expect(repository.updatePublication).toHaveBeenNthCalledWith(1, 'publication-1', {
      status: 'PUBLISHING',
    });
    expect(repository.updateStatus).toHaveBeenCalledWith('a1', 'PUBLISHED');
  });

  it('throws 404 when the announcement does not exist', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(null);
    const useCase = buildUseCase(repository);

    await expect(useCase.execute('missing', 'mock')).rejects.toBeInstanceOf(
      AnnouncementApiException,
    );
    expect(repository.createPublication).not.toHaveBeenCalled();
  });

  it('throws 404 when the channel is not configured', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    repository.findChannel.mockResolvedValue(null);
    const useCase = buildUseCase(repository);

    await expect(useCase.execute('a1', 'mock')).rejects.toBeInstanceOf(AnnouncementApiException);
  });

  it('prevents publishing when the channel is not enabled', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    repository.findChannel.mockResolvedValue({ ...enabledChannel, enabled: false });
    const useCase = buildUseCase(repository);

    await expect(useCase.execute('a1', 'mock')).rejects.toBeInstanceOf(AnnouncementApiException);
    expect(repository.createPublication).not.toHaveBeenCalled();
  });

  it('prevents publishing when the announcement is invalid', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue({ ...announcement, title: 'a'.repeat(200) });
    repository.findChannel.mockResolvedValue(enabledChannel);
    repository.findLatestPublication.mockResolvedValue(null);
    const useCase = buildUseCase(repository);

    await expect(useCase.execute('a1', 'mock')).rejects.toBeInstanceOf(AnnouncementApiException);
    expect(repository.createPublication).not.toHaveBeenCalled();
  });

  it('prevents publishing when connector-specific validation fails', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue({ ...announcement, title: 'a'.repeat(81) });
    repository.findChannel.mockResolvedValue(enabledChannel);
    repository.findLatestPublication.mockResolvedValue(null);
    const useCase = buildUseCase(repository);

    await expect(useCase.execute('a1', 'mock')).rejects.toBeInstanceOf(AnnouncementApiException);
    expect(repository.createPublication).not.toHaveBeenCalled();
  });

  it('rejects a duplicate publish request while one is already in progress', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    repository.findChannel.mockResolvedValue(enabledChannel);
    repository.findLatestPublication.mockResolvedValue(readyPublication({ status: 'PUBLISHING' }));
    const useCase = buildUseCase(repository);

    await expect(useCase.execute('a1', 'mock')).rejects.toBeInstanceOf(AnnouncementApiException);
    expect(repository.createPublication).not.toHaveBeenCalled();
  });

  it('records a FAILED publication and returns normally when the connector throws', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    repository.findChannel.mockResolvedValue(enabledChannel);
    repository.findLatestPublication.mockResolvedValue(null);
    repository.createPublication.mockResolvedValue(readyPublication());
    repository.updatePublication.mockImplementation((_id, data) =>
      Promise.resolve(readyPublication({ status: data.status, lastError: data.lastError ?? null })),
    );
    repository.findChannels.mockResolvedValue([enabledChannel]);
    repository.findLatestPublicationsByChannel.mockResolvedValue([
      readyPublication({ status: 'FAILED' }),
    ]);

    const failingConnector = new MockChannelConnector(() => 'fixed-id');
    jest.spyOn(failingConnector, 'publish').mockRejectedValue(new Error('marketplace unavailable'));

    const useCase = buildUseCase(repository, failingConnector);
    const result = await useCase.execute('a1', 'mock');

    expect(result.publication.status).toBe('FAILED');
    expect(result.publication.lastError).toBe('marketplace unavailable');
    // Single enabled channel, none PUBLISHED yet -> overall status stays READY.
    expect(repository.updateStatus).toHaveBeenCalledWith('a1', 'READY');
  });

  it('throws 404 when the connector does not exist', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(announcement);
    repository.findChannel.mockResolvedValue({ ...enabledChannel, connectorCode: 'unknown' });
    const useCase = buildUseCase(repository);

    await expect(useCase.execute('a1', 'unknown')).rejects.toBeInstanceOf(AnnouncementApiException);
  });
});
