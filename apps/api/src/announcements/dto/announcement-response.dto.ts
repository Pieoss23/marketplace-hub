import { ApiProperty } from '@nestjs/swagger';
import { ANNOUNCEMENT_STATUSES, PRODUCT_CONDITIONS } from '@marketplace-hub/domain';
import type { AnnouncementStatus, ProductCondition } from '@marketplace-hub/domain';
import { ANNOUNCEMENT_PUBLICATION_STATUSES } from '../domain/announcement-publication-status';
import type { AnnouncementPublicationStatus } from '../domain/announcement-publication-status';

/**
 * Mirrors `ChannelPublicationResponse` from `@marketplace-hub/contracts`
 * field-for-field, but does not `implements` it: that interface's `status`
 * resolves to the wrong (old, lowercase) `PublicationStatus` type due to a
 * name collision in `packages/domain/src/index.ts` — see the CHANGE_REQUEST
 * in `.agents/outbox/claude/task-021.md`. The JSON shape produced at runtime
 * matches `docs/api/announcement-publication-api.md` exactly.
 */
export class ChannelPublicationResponseDto {
  @ApiProperty({ example: 'mock' })
  connectorCode!: string;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ enum: ANNOUNCEMENT_PUBLICATION_STATUSES, example: 'PUBLISHED' })
  status!: AnnouncementPublicationStatus;

  @ApiProperty({ required: false })
  externalListingId?: string;

  @ApiProperty({ required: false })
  externalUrl?: string;

  @ApiProperty({ required: false })
  lastError?: string;

  @ApiProperty({ required: false })
  publishedAt?: string;
}

export class AnnouncementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ example: 15000, description: 'Price in cents' })
  price!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  categoryCode!: string;

  @ApiProperty({ enum: PRODUCT_CONDITIONS })
  condition!: ProductCondition;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: ANNOUNCEMENT_STATUSES })
  status!: AnnouncementStatus;

  @ApiProperty({ type: [ChannelPublicationResponseDto] })
  channels!: ChannelPublicationResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
