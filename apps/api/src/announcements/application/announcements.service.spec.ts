import type { Announcement } from '@marketplace-hub/domain';
import { AnnouncementApiException } from '../announcement-api.exception';
import type { AnnouncementInputData, AnnouncementRepository } from './announcement-repository';
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

const validInput: AnnouncementInputData = {
  title: 'Tastiera meccanica',
  description: 'Usata, in buone condizioni, tastiera meccanica vintage.',
  priceAmount: 15000,
  currency: 'EUR',
  categoryCode: 'electronics',
  condition: 'USED_GOOD',
  quantity: 1,
};

function toAnnouncement(
  id: string,
  input: AnnouncementInputData,
  status: Announcement['status'],
): Announcement {
  return {
    id,
    title: input.title,
    description: input.description,
    price: input.priceAmount,
    currency: input.currency,
    categoryCode: input.categoryCode,
    condition: input.condition,
    quantity: input.quantity,
    status,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('AnnouncementsService', () => {
  it('creates a valid announcement with READY status', async () => {
    const repository = buildRepository();
    repository.create.mockResolvedValue(toAnnouncement('a1', validInput, 'READY'));
    const service = new AnnouncementsService(
      repository,
      new AnnouncementStatusCalculator(repository),
    );

    await service.create(validInput);

    expect(repository.create).toHaveBeenCalledWith(validInput, 'READY');
  });

  it('creates an incomplete announcement as DRAFT', async () => {
    const invalidInput = { ...validInput, title: '' };
    const repository = buildRepository();
    repository.create.mockResolvedValue(toAnnouncement('a1', invalidInput, 'DRAFT'));
    const service = new AnnouncementsService(
      repository,
      new AnnouncementStatusCalculator(repository),
    );

    await service.create(invalidInput);

    expect(repository.create).toHaveBeenCalledWith(invalidInput, 'DRAFT');
  });

  it('retrieves an existing announcement', async () => {
    const repository = buildRepository();
    const announcement = toAnnouncement('a1', validInput, 'READY');
    repository.findById.mockResolvedValue(announcement);
    const service = new AnnouncementsService(
      repository,
      new AnnouncementStatusCalculator(repository),
    );

    await expect(service.findOne('a1')).resolves.toEqual(announcement);
  });

  it('throws a 404 AnnouncementApiException when the announcement is missing', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(null);
    const service = new AnnouncementsService(
      repository,
      new AnnouncementStatusCalculator(repository),
    );

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(AnnouncementApiException);
  });

  it('updates an announcement and keeps it READY when no channel has published yet', async () => {
    const repository = buildRepository();
    const existing = toAnnouncement('a1', validInput, 'READY');
    const updatedInput = { ...validInput, title: 'Nuovo titolo' };
    repository.findById.mockResolvedValue(existing);
    repository.findChannels.mockResolvedValue([]);
    repository.update.mockResolvedValue(toAnnouncement('a1', updatedInput, 'READY'));

    const service = new AnnouncementsService(
      repository,
      new AnnouncementStatusCalculator(repository),
    );
    const result = await service.update('a1', updatedInput);

    expect(result.title).toBe('Nuovo titolo');
    expect(repository.update).toHaveBeenCalledWith('a1', updatedInput, 'READY');
  });

  it('rejects updating a non-existent announcement', async () => {
    const repository = buildRepository();
    repository.findById.mockResolvedValue(null);
    const service = new AnnouncementsService(
      repository,
      new AnnouncementStatusCalculator(repository),
    );

    await expect(service.update('missing', validInput)).rejects.toBeInstanceOf(
      AnnouncementApiException,
    );
  });
});
