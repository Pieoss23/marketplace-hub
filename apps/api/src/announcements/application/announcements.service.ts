import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Announcement } from '@marketplace-hub/domain';
import { validateAnnouncement } from '@marketplace-hub/domain';
import { AnnouncementApiException } from '../announcement-api.exception';
import { AnnouncementStatusCalculator } from './announcement-status-calculator';
import {
  ANNOUNCEMENT_REPOSITORY,
  type AnnouncementInputData,
  type AnnouncementRepository,
} from './announcement-repository';

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly repository: AnnouncementRepository,
    private readonly statusCalculator: AnnouncementStatusCalculator,
  ) {}

  async create(input: AnnouncementInputData): Promise<Announcement> {
    const candidate = buildCandidate(randomUUID(), input, new Date(), new Date());
    const status = validateAnnouncement(candidate).some((issue) => issue.severity === 'ERROR')
      ? 'DRAFT'
      : 'READY';
    return this.repository.create(input, status);
  }

  findAll(): Promise<Announcement[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<Announcement> {
    const announcement = await this.repository.findById(id);
    if (!announcement) {
      throw AnnouncementApiException.notFound(
        'ANNOUNCEMENT_NOT_FOUND',
        `Announcement ${id} not found.`,
      );
    }
    return announcement;
  }

  async update(id: string, input: AnnouncementInputData): Promise<Announcement> {
    const existing = await this.findOne(id);
    const candidate = buildCandidate(id, input, existing.createdAt, new Date());
    const status = await this.statusCalculator.compute(candidate);

    const updated = await this.repository.update(id, input, status);
    if (!updated) {
      throw AnnouncementApiException.notFound(
        'ANNOUNCEMENT_NOT_FOUND',
        `Announcement ${id} not found.`,
      );
    }
    return updated;
  }
}

function buildCandidate(
  id: string,
  input: AnnouncementInputData,
  createdAt: Date,
  updatedAt: Date,
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
    status: 'DRAFT',
    createdAt,
    updatedAt,
  };
}
