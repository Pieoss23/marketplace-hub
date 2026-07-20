import { Test, TestingModule } from '@nestjs/testing';
import type { Listing } from '@marketplace-hub/domain';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

describe('ListingsController', () => {
  let controller: ListingsController;
  let service: jest.Mocked<ListingsService>;

  const now = new Date('2026-07-12T08:00:00.000Z');
  const listing: Listing = {
    id: 'listing-1',
    title: 'Mechanical keyboard',
    description: 'Used mechanical keyboard in good condition.',
    price: { amountMinor: 7500, currency: 'EUR' },
    images: [{ url: 'https://example.test/keyboard.jpg', position: 0 }],
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingsController],
      providers: [
        {
          provide: ListingsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ListingsController);
    service = module.get(ListingsService);
  });

  it('serializes a created listing with ISO timestamps', async () => {
    service.create.mockResolvedValue(listing);

    const result = await controller.create({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      images: [...listing.images],
    });

    expect(result).toEqual({
      ...listing,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('lists all listings', async () => {
    service.findAll.mockResolvedValue([listing]);

    const result = await controller.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(listing.id);
  });

  it('delegates delete to the service', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('listing-1');

    expect(service.remove).toHaveBeenCalledWith('listing-1');
  });
});
