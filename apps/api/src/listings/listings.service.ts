import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { validateListing } from '@marketplace-hub/domain';
import type { Listing } from '@marketplace-hub/domain';
import { ListingsRepository } from './listings.repository';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingValidationException } from './listing-validation.exception';

@Injectable()
export class ListingsService {
  constructor(private readonly repository: ListingsRepository) {}

  async create(dto: CreateListingDto): Promise<Listing> {
    const candidate: Listing = {
      id: randomUUID(),
      title: dto.title,
      description: dto.description,
      price: dto.price,
      images: dto.images,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    assertValid(candidate);

    return this.repository.create({
      title: dto.title,
      description: dto.description,
      price: dto.price,
      images: dto.images,
    });
  }

  findAll(): Promise<Listing[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<Listing> {
    const listing = await this.repository.findById(id);
    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }
    return listing;
  }

  async update(id: string, dto: UpdateListingDto): Promise<Listing> {
    const existing = await this.findOne(id);

    const candidate: Listing = {
      ...existing,
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.images !== undefined && { images: dto.images }),
    };

    assertValid(candidate);

    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(`Listing ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.delete(id);
  }
}

function assertValid(candidate: Listing): void {
  const result = validateListing(candidate);
  if (!result.valid) {
    throw new ListingValidationException(result.errors);
  }
}
