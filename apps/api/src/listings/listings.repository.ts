import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Listing } from '@marketplace-hub/domain';
import { PrismaService } from '../prisma/prisma.service';

type ListingWithImages = Prisma.ListingGetPayload<{ include: { images: true } }>;

export interface ListingPrice {
  amountMinor: number;
  currency: string;
}

export interface ListingImageInput {
  url: string;
  position: number;
}

export interface CreateListingData {
  title: string;
  description: string;
  price: ListingPrice;
  images: ListingImageInput[];
}

export type UpdateListingData = Partial<CreateListingData>;

@Injectable()
export class ListingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateListingData): Promise<Listing> {
    const record = await this.prisma.listing.create({
      data: {
        title: data.title,
        description: data.description,
        priceAmountMinor: data.price.amountMinor,
        priceCurrency: data.price.currency,
        images: {
          create: data.images.map((image) => ({ url: image.url, position: image.position })),
        },
      },
      include: { images: true },
    });
    return toDomain(record);
  }

  async findAll(): Promise<Listing[]> {
    const records = await this.prisma.listing.findMany({
      include: { images: true },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(toDomain);
  }

  async findById(id: string): Promise<Listing | null> {
    const record = await this.prisma.listing.findUnique({
      where: { id },
      include: { images: true },
    });
    return record ? toDomain(record) : null;
  }

  async update(id: string, data: UpdateListingData): Promise<Listing | null> {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        if (data.images) {
          await tx.listingImage.deleteMany({ where: { listingId: id } });
        }

        return tx.listing.update({
          where: { id },
          data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.price !== undefined && {
              priceAmountMinor: data.price.amountMinor,
              priceCurrency: data.price.currency,
            }),
            ...(data.images !== undefined && {
              images: {
                create: data.images.map((image) => ({ url: image.url, position: image.position })),
              },
            }),
          },
          include: { images: true },
        });
      });
      return toDomain(record);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.listing.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }
}

function isRecordNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

function toDomain(record: ListingWithImages): Listing {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    price: { amountMinor: record.priceAmountMinor, currency: record.priceCurrency },
    images: [...record.images]
      .sort((left, right) => left.position - right.position)
      .map((image) => ({ url: image.url, position: image.position })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
