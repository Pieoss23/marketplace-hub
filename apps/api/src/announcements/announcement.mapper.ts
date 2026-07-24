import type { Announcement, ValidationIssue } from '@marketplace-hub/domain';
import {
  AnnouncementResponseDto,
  ChannelPublicationResponseDto,
} from './dto/announcement-response.dto';
import { ChannelValidationResponseDto } from './dto/channel-validation-response.dto';
import { PublishAnnouncementResponseDto } from './dto/publish-announcement-response.dto';
import type { AnnouncementChannel } from './domain/announcement-channel';
import type { AnnouncementPublication } from './domain/announcement-publication';

export function toAnnouncementResponseDto(
  announcement: Announcement,
  channels: readonly AnnouncementChannel[],
  latestPublicationByChannelId: ReadonlyMap<string, AnnouncementPublication>,
): AnnouncementResponseDto {
  return {
    id: announcement.id,
    title: announcement.title,
    description: announcement.description,
    price: announcement.price,
    currency: announcement.currency,
    categoryCode: announcement.categoryCode,
    condition: announcement.condition,
    quantity: announcement.quantity,
    status: announcement.status,
    channels: channels.map((channel) =>
      toChannelPublicationResponseDto(channel, latestPublicationByChannelId.get(channel.id)),
    ),
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
  };
}

function toChannelPublicationResponseDto(
  channel: AnnouncementChannel,
  latestPublication: AnnouncementPublication | undefined,
): ChannelPublicationResponseDto {
  return {
    connectorCode: channel.connectorCode,
    enabled: channel.enabled,
    status: latestPublication?.status ?? 'READY',
    ...(latestPublication?.externalListingId && {
      externalListingId: latestPublication.externalListingId,
    }),
    ...(latestPublication?.externalUrl && { externalUrl: latestPublication.externalUrl }),
    ...(latestPublication?.lastError && { lastError: latestPublication.lastError }),
    ...(latestPublication?.publishedAt && {
      publishedAt: latestPublication.publishedAt.toISOString(),
    }),
  };
}

export function toChannelValidationResponseDto(
  issues: readonly ValidationIssue[],
  validatedAt: Date,
): ChannelValidationResponseDto {
  return {
    valid: !issues.some((issue) => issue.severity === 'ERROR'),
    issues,
    validatedAt: validatedAt.toISOString(),
  };
}

export function toPublishAnnouncementResponseDto(
  publication: AnnouncementPublication,
): PublishAnnouncementResponseDto {
  return {
    publicationId: publication.id,
    status: publication.status,
    connectorCode: publication.connectorCode,
    ...(publication.externalListingId && { externalListingId: publication.externalListingId }),
    ...(publication.externalUrl && { externalUrl: publication.externalUrl }),
    ...(publication.lastError && { lastError: publication.lastError }),
    ...(publication.publishedAt && { publishedAt: publication.publishedAt.toISOString() }),
  };
}
