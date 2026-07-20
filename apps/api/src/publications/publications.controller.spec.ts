import { Test, TestingModule } from '@nestjs/testing';
import type { Publication } from '@marketplace-hub/domain';
import { PublicationsController } from './publications.controller';
import { PublicationsService } from './publications.service';

const publication: Publication = {
  id: 'publication-1',
  listingId: 'listing-1',
  marketplaceId: 'mock',
  status: 'published',
  externalId: 'mock-external-1',
  createdAt: new Date('2026-07-12T09:00:00.000Z'),
  updatedAt: new Date('2026-07-12T09:01:00.000Z'),
};

describe('PublicationsController', () => {
  let controller: PublicationsController;
  const publicationsService = {
    publishMock: jest.fn(),
    findByListingId: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicationsController],
      providers: [{ provide: PublicationsService, useValue: publicationsService }],
    }).compile();
    controller = module.get(PublicationsController);
  });

  it('publishes through the service and maps the response', async () => {
    publicationsService.publishMock.mockResolvedValue({
      success: true,
      publication,
      errors: [],
    });

    await expect(controller.publishMock('listing-1', { category: 'electronics' })).resolves.toEqual(
      {
        success: true,
        publication: {
          id: 'publication-1',
          listingId: 'listing-1',
          marketplaceId: 'mock',
          status: 'published',
          externalId: 'mock-external-1',
          createdAt: '2026-07-12T09:00:00.000Z',
          updatedAt: '2026-07-12T09:01:00.000Z',
        },
        errors: [],
      },
    );
  });

  it('lists mapped publication attempts', async () => {
    publicationsService.findByListingId.mockResolvedValue([publication]);

    await expect(controller.findByListingId('listing-1')).resolves.toEqual([
      {
        id: 'publication-1',
        listingId: 'listing-1',
        marketplaceId: 'mock',
        status: 'published',
        externalId: 'mock-external-1',
        createdAt: '2026-07-12T09:00:00.000Z',
        updatedAt: '2026-07-12T09:01:00.000Z',
      },
    ]);
  });
});
