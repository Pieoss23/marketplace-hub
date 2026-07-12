import type { AnnouncementPublicationStatus } from './announcement-publication-status';

export interface AnnouncementPublication {
  readonly id: string;
  readonly announcementId: string;
  readonly announcementChannelId: string;
  readonly connectorCode: string;
  readonly status: AnnouncementPublicationStatus;
  readonly externalListingId: string | null;
  readonly externalUrl: string | null;
  readonly lastError: string | null;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
