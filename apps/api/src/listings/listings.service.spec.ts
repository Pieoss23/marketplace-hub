import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Listing } from '@marketplace-hub/domain';
import { ListingsService } from './listings.service';
import { ListingsRepository } from './listings.repository';
import { ListingValidationException } from './listing-validation.exception';
import { CreateListingDto } from './dto/create-listing.dto';

describe('ListingsService', () => {
  let service: ListingsService;
  let repository: jest.Mocked<ListingsRepository>;

  const now = new Date('2026-07-12T08:00:00.000Z');
  const storedListing: Listing = {
    id: 'listing-1',
    title: 'Mechanical keyboard',
    description: 'Used mechanical keyboard in good condition.',
    price: { amountMinor: 7500, currency: 'EUR' },
    images: [{ url: 'https://example.test/keyboard.jpg', position: 0 }],
    createdAt: now,
    updatedAt: now,
  };

  const validDto: CreateListingDto = {
    title: 'Mechanical keyboard',
    description: 'Used mechanical keyboard in good condition.',
    price: { amountMinor: 7500, currency: 'EUR' },
    images: [{ url: 'https://example.test/keyboard.jpg', position: 0 }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        {
          provide: ListingsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ListingsService);
    repository = module.get(ListingsRepository);
  });

  it('creates a listing when general validation passes', async () => {
    repository.create.mockResolvedValue(storedListing);

    const result = await service.create(validDto);

    expect(result).toBe(storedListing);
    expect(repository.create).toHaveBeenCalledWith({
      title: validDto.title,
      description: validDto.description,
      price: validDto.price,
      images: validDto.images,
    });
  });

  it('rejects a listing that fails general domain validation', async () => {
    await expect(service.create({ ...validDto, title: '   ' })).rejects.toBeInstanceOf(
      ListingValidationException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the listing does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a listing after merging and re-validating fields', async () => {
    repository.findById.mockResolvedValue(storedListing);
    repository.update.mockResolvedValue({ ...storedListing, title: 'Updated title' });

    const result = await service.update('listing-1', { title: 'Updated title' });

    expect(result.title).toBe('Updated title');
    expect(repository.update).toHaveBeenCalledWith('listing-1', { title: 'Updated title' });
  });

  it('rejects an update that would leave the listing invalid', async () => {
    repository.findById.mockResolvedValue(storedListing);

    await expect(service.update('listing-1', { title: '   ' })).rejects.toBeInstanceOf(
      ListingValidationException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('removes an existing listing', async () => {
    repository.findById.mockResolvedValue(storedListing);
    repository.delete.mockResolvedValue(true);

    await service.remove('listing-1');

    expect(repository.delete).toHaveBeenCalledWith('listing-1');
  });
});
