import { Injectable } from '@nestjs/common';
import type { MarketplaceId, Publication, PublicationStatus } from '@marketplace-hub/domain';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { PublicationStore } from '../application/publication-store';

@Injectable()
export class PrismaPublicationStore implements PublicationStore {
  constructor(private readonly prisma: PrismaService) {}

  async save(publication: Publication): Promise<void> {
    await this.prisma.publication.upsert({
      where: { id: publication.id },
      create: {
        id: publication.id,
        listingId: publication.listingId,
        marketplaceId: publication.marketplaceId,
        status: publication.status,
        externalId: publication.externalId ?? null,
        lastError: publication.lastError ?? null,
        createdAt: publication.createdAt,
        updatedAt: publication.updatedAt,
      },
      update: {
        status: publication.status,
        externalId: publication.externalId ?? null,
        lastError: publication.lastError ?? null,
        updatedAt: publication.updatedAt,
      },
    });
  }

  async saveConfiguration(
    listingId: string,
    marketplaceId: MarketplaceId,
    configuration: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.prisma.marketplaceConfiguration.upsert({
      where: {
        listingId_marketplaceId: { listingId, marketplaceId },
      },
      create: { listingId, marketplaceId, configuration },
      update: { configuration },
    });
  }

  async findByListingId(listingId: string): Promise<Publication[]> {
    const records = await this.prisma.publication.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ({
      id: record.id,
      listingId: record.listingId,
      marketplaceId: toMarketplaceId(record.marketplaceId),
      status: toPublicationStatus(record.status),
      ...(record.externalId !== null && { externalId: record.externalId }),
      ...(record.lastError !== null && { lastError: record.lastError }),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }
}

function toMarketplaceId(value: string): MarketplaceId {
  if (value !== 'mock') {
    throw new Error(`Unsupported marketplace id: ${value}`);
  }
  return value;
}

function toPublicationStatus(value: string): PublicationStatus {
  const statuses: readonly PublicationStatus[] = [
    'draft',
    'validating',
    'ready',
    'publishing',
    'published',
    'failed',
  ];
  if (!statuses.includes(value as PublicationStatus)) {
    throw new Error(`Unsupported publication status: ${value}`);
  }
  return value as PublicationStatus;
}
