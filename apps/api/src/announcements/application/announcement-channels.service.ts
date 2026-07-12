import { Inject, Injectable } from '@nestjs/common';
import type { ValidationIssue } from '@marketplace-hub/domain';
import { validateAnnouncement } from '@marketplace-hub/domain';
import { AnnouncementApiException } from '../announcement-api.exception';
import type { AnnouncementChannelConnector } from '../connectors/announcement-channel-connector';
import { ConnectorRegistry } from '../connectors/connector-registry';
import type { AnnouncementChannel } from '../domain/announcement-channel';
import type { AnnouncementPublication } from '../domain/announcement-publication';
import { ANNOUNCEMENT_REPOSITORY, type AnnouncementRepository } from './announcement-repository';
import { AnnouncementsService } from './announcements.service';

export interface ChannelValidationOutcome {
  readonly issues: readonly ValidationIssue[];
  readonly validatedAt: Date;
}

export interface ChannelsWithLatestPublications {
  readonly channels: readonly AnnouncementChannel[];
  readonly latestByChannelId: ReadonlyMap<string, AnnouncementPublication>;
}

@Injectable()
export class AnnouncementChannelsService {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly repository: AnnouncementRepository,
    private readonly announcementsService: AnnouncementsService,
    private readonly connectorRegistry: ConnectorRegistry,
  ) {}

  async enable(
    announcementId: string,
    connectorCode: string,
    enabled: boolean,
    configuration: Record<string, unknown>,
  ): Promise<AnnouncementChannel> {
    await this.announcementsService.findOne(announcementId);
    this.requireConnector(connectorCode);
    return this.repository.upsertChannel(announcementId, connectorCode, { enabled, configuration });
  }

  async validate(announcementId: string, connectorCode: string): Promise<ChannelValidationOutcome> {
    const announcement = await this.announcementsService.findOne(announcementId);
    const channel = await this.getChannelOrThrow(announcementId, connectorCode);
    const connector = this.requireConnector(connectorCode);

    const issues = [
      ...validateAnnouncement(announcement),
      ...connector.validate(announcement, channel.configuration),
    ];
    const validatedAt = new Date();

    await this.repository.updateChannelValidation(channel.id, {
      validationStatus: issues.some((issue) => issue.severity === 'ERROR') ? 'INVALID' : 'VALID',
      validationErrors: issues.length > 0 ? issues : null,
      validatedAt,
    });

    return { issues, validatedAt };
  }

  async getChannelOrThrow(
    announcementId: string,
    connectorCode: string,
  ): Promise<AnnouncementChannel> {
    const channel = await this.repository.findChannel(announcementId, connectorCode);
    if (!channel) {
      throw AnnouncementApiException.notFound(
        'CHANNEL_NOT_FOUND',
        `Channel ${connectorCode} is not configured for announcement ${announcementId}.`,
      );
    }
    return channel;
  }

  requireConnector(connectorCode: string): AnnouncementChannelConnector {
    const connector = this.connectorRegistry.get(connectorCode);
    if (!connector) {
      throw AnnouncementApiException.notFound(
        'CONNECTOR_NOT_FOUND',
        `Connector ${connectorCode} does not exist.`,
      );
    }
    return connector;
  }

  async listWithLatestPublications(
    announcementId: string,
  ): Promise<ChannelsWithLatestPublications> {
    const channels = await this.repository.findChannels(announcementId);
    const latestPublications =
      await this.repository.findLatestPublicationsByChannel(announcementId);
    const latestByChannelId = new Map(latestPublications.map((p) => [p.announcementChannelId, p]));
    return { channels, latestByChannelId };
  }

  listPublications(announcementId: string): Promise<AnnouncementPublication[]> {
    return this.repository.findPublicationsByAnnouncementId(announcementId);
  }
}
