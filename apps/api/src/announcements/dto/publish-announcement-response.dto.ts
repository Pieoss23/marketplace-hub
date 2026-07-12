import { ApiProperty } from '@nestjs/swagger';
import { ANNOUNCEMENT_PUBLICATION_STATUSES } from '../domain/announcement-publication-status';
import type { AnnouncementPublicationStatus } from '../domain/announcement-publication-status';

/** See `ChannelPublicationResponseDto` for why this does not `implements PublishAnnouncementResponse`. */
export class PublishAnnouncementResponseDto {
  @ApiProperty()
  publicationId!: string;

  @ApiProperty({ enum: ANNOUNCEMENT_PUBLICATION_STATUSES })
  status!: AnnouncementPublicationStatus;

  @ApiProperty()
  connectorCode!: string;

  @ApiProperty({ required: false })
  externalListingId?: string;

  @ApiProperty({ required: false })
  externalUrl?: string;

  @ApiProperty({ required: false })
  publishedAt?: string;
}
