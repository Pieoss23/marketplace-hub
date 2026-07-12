import type {
  Announcement,
  AnnouncementStatus,
  ProductCondition,
  ValidationIssue,
} from '@marketplace-hub/domain';
import type { AnnouncementChannel, ChannelValidationStatus } from '../domain/announcement-channel';
import type { AnnouncementPublication } from '../domain/announcement-publication';
import type { AnnouncementPublicationStatus } from '../domain/announcement-publication-status';

export const ANNOUNCEMENT_REPOSITORY = Symbol('ANNOUNCEMENT_REPOSITORY');

export interface AnnouncementInputData {
  readonly title: string;
  readonly description: string;
  readonly priceAmount: number;
  readonly currency: string;
  readonly categoryCode: string;
  readonly condition: ProductCondition;
  readonly quantity: number;
}

export interface UpsertChannelData {
  readonly enabled: boolean;
  readonly configuration: Record<string, unknown>;
}

export interface ChannelValidationResultData {
  readonly validationStatus: ChannelValidationStatus;
  readonly validationErrors: readonly ValidationIssue[] | null;
  readonly validatedAt: Date;
}

export interface CreatePublicationData {
  readonly announcementId: string;
  readonly announcementChannelId: string;
  readonly connectorCode: string;
  readonly status: AnnouncementPublicationStatus;
}

export interface UpdatePublicationData {
  readonly status: AnnouncementPublicationStatus;
  readonly externalListingId?: string | null;
  readonly externalUrl?: string | null;
  readonly lastError?: string | null;
  readonly publishedAt?: Date | null;
}

/** Repository port for the Announcement vertical slice (TASK-021). */
export interface AnnouncementRepository {
  create(data: AnnouncementInputData, status: AnnouncementStatus): Promise<Announcement>;
  findAll(): Promise<Announcement[]>;
  findById(id: string): Promise<Announcement | null>;
  update(
    id: string,
    data: AnnouncementInputData,
    status: AnnouncementStatus,
  ): Promise<Announcement | null>;
  updateStatus(id: string, status: AnnouncementStatus): Promise<void>;

  findChannel(announcementId: string, connectorCode: string): Promise<AnnouncementChannel | null>;
  findChannels(announcementId: string): Promise<AnnouncementChannel[]>;
  upsertChannel(
    announcementId: string,
    connectorCode: string,
    data: UpsertChannelData,
  ): Promise<AnnouncementChannel>;
  updateChannelValidation(
    channelId: string,
    data: ChannelValidationResultData,
  ): Promise<AnnouncementChannel>;

  createPublication(data: CreatePublicationData): Promise<AnnouncementPublication>;
  updatePublication(id: string, data: UpdatePublicationData): Promise<AnnouncementPublication>;
  findLatestPublication(
    announcementId: string,
    connectorCode: string,
  ): Promise<AnnouncementPublication | null>;
  findPublicationsByAnnouncementId(announcementId: string): Promise<AnnouncementPublication[]>;
  /** Latest publication per connector code, for computing overall announcement status. */
  findLatestPublicationsByChannel(announcementId: string): Promise<AnnouncementPublication[]>;
}
