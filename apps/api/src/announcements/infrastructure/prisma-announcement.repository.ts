import { Injectable } from '@nestjs/common';
import type {
  Announcement,
  AnnouncementStatus,
  ProductCondition,
  ValidationIssue,
} from '@marketplace-hub/domain';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AnnouncementInputData,
  AnnouncementRepository,
  ChannelValidationResultData,
  CreatePublicationData,
  UpdatePublicationData,
  UpsertChannelData,
} from '../application/announcement-repository';
import type { AnnouncementChannel, ChannelValidationStatus } from '../domain/announcement-channel';
import type { AnnouncementPublication } from '../domain/announcement-publication';
import type { AnnouncementPublicationStatus } from '../domain/announcement-publication-status';

type PrismaAnnouncement = Prisma.AnnouncementGetPayload<Record<string, never>>;
type PrismaChannel = Prisma.AnnouncementChannelGetPayload<Record<string, never>>;
type PrismaPublication = Prisma.AnnouncementPublicationGetPayload<Record<string, never>>;

@Injectable()
export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AnnouncementInputData, status: AnnouncementStatus): Promise<Announcement> {
    const record = await this.prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        priceAmount: data.priceAmount,
        currency: data.currency,
        categoryCode: data.categoryCode,
        condition: data.condition,
        quantity: data.quantity,
        status,
      },
    });
    return toAnnouncement(record);
  }

  async findAll(): Promise<Announcement[]> {
    const records = await this.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    return records.map(toAnnouncement);
  }

  async findById(id: string): Promise<Announcement | null> {
    const record = await this.prisma.announcement.findUnique({ where: { id } });
    return record ? toAnnouncement(record) : null;
  }

  async update(
    id: string,
    data: AnnouncementInputData,
    status: AnnouncementStatus,
  ): Promise<Announcement | null> {
    try {
      const record = await this.prisma.announcement.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          priceAmount: data.priceAmount,
          currency: data.currency,
          categoryCode: data.categoryCode,
          condition: data.condition,
          quantity: data.quantity,
          status,
        },
      });
      return toAnnouncement(record);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async updateStatus(id: string, status: AnnouncementStatus): Promise<void> {
    await this.prisma.announcement.update({ where: { id }, data: { status } });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.announcement.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async findChannel(
    announcementId: string,
    connectorCode: string,
  ): Promise<AnnouncementChannel | null> {
    const record = await this.prisma.announcementChannel.findUnique({
      where: { announcementId_connectorCode: { announcementId, connectorCode } },
    });
    return record ? toChannel(record) : null;
  }

  async findChannels(announcementId: string): Promise<AnnouncementChannel[]> {
    const records = await this.prisma.announcementChannel.findMany({ where: { announcementId } });
    return records.map(toChannel);
  }

  async upsertChannel(
    announcementId: string,
    connectorCode: string,
    data: UpsertChannelData,
  ): Promise<AnnouncementChannel> {
    const record = await this.prisma.announcementChannel.upsert({
      where: { announcementId_connectorCode: { announcementId, connectorCode } },
      create: {
        announcementId,
        connectorCode,
        enabled: data.enabled,
        configuration: data.configuration as Prisma.InputJsonObject,
      },
      update: {
        enabled: data.enabled,
        configuration: data.configuration as Prisma.InputJsonObject,
      },
    });
    return toChannel(record);
  }

  async updateChannelValidation(
    channelId: string,
    data: ChannelValidationResultData,
  ): Promise<AnnouncementChannel> {
    const record = await this.prisma.announcementChannel.update({
      where: { id: channelId },
      data: {
        validationStatus: data.validationStatus,
        validationErrors: (data.validationErrors ?? undefined) as Prisma.InputJsonValue | undefined,
        validatedAt: data.validatedAt,
      },
    });
    return toChannel(record);
  }

  async createPublication(data: CreatePublicationData): Promise<AnnouncementPublication> {
    const record = await this.prisma.announcementPublication.create({
      data: {
        announcementId: data.announcementId,
        announcementChannelId: data.announcementChannelId,
        connectorCode: data.connectorCode,
        status: data.status,
      },
    });
    return toPublication(record);
  }

  async updatePublication(
    id: string,
    data: UpdatePublicationData,
  ): Promise<AnnouncementPublication> {
    const record = await this.prisma.announcementPublication.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.externalListingId !== undefined && { externalListingId: data.externalListingId }),
        ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl }),
        ...(data.lastError !== undefined && { lastError: data.lastError }),
        ...(data.publishedAt !== undefined && { publishedAt: data.publishedAt }),
      },
    });
    return toPublication(record);
  }

  async findLatestPublication(
    announcementId: string,
    connectorCode: string,
  ): Promise<AnnouncementPublication | null> {
    const record = await this.prisma.announcementPublication.findFirst({
      where: { announcementId, connectorCode },
      orderBy: { createdAt: 'desc' },
    });
    return record ? toPublication(record) : null;
  }

  async findPublicationsByAnnouncementId(
    announcementId: string,
  ): Promise<AnnouncementPublication[]> {
    const records = await this.prisma.announcementPublication.findMany({
      where: { announcementId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(toPublication);
  }

  async findLatestPublicationsByChannel(
    announcementId: string,
  ): Promise<AnnouncementPublication[]> {
    const records = await this.prisma.announcementPublication.findMany({
      where: { announcementId },
      orderBy: { createdAt: 'desc' },
    });

    const latestByChannel = new Map<string, PrismaPublication>();
    for (const record of records) {
      if (!latestByChannel.has(record.announcementChannelId)) {
        latestByChannel.set(record.announcementChannelId, record);
      }
    }
    return Array.from(latestByChannel.values()).map(toPublication);
  }
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2025'
  );
}

function toAnnouncement(record: PrismaAnnouncement): Announcement {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    price: record.priceAmount,
    currency: record.currency,
    categoryCode: record.categoryCode,
    condition: record.condition as ProductCondition,
    quantity: record.quantity,
    status: record.status as AnnouncementStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toChannel(record: PrismaChannel): AnnouncementChannel {
  return {
    id: record.id,
    announcementId: record.announcementId,
    connectorCode: record.connectorCode,
    enabled: record.enabled,
    configuration: (record.configuration ?? {}) as Record<string, unknown>,
    validationStatus: record.validationStatus as ChannelValidationStatus,
    validationErrors:
      (record.validationErrors as unknown as readonly ValidationIssue[] | null) ?? null,
    validatedAt: record.validatedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPublication(record: PrismaPublication): AnnouncementPublication {
  return {
    id: record.id,
    announcementId: record.announcementId,
    announcementChannelId: record.announcementChannelId,
    connectorCode: record.connectorCode,
    status: record.status as AnnouncementPublicationStatus,
    externalListingId: record.externalListingId,
    externalUrl: record.externalUrl,
    lastError: record.lastError,
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
