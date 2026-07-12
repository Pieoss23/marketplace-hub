import { Inject, Injectable } from '@nestjs/common';
import type { ValidationIssue } from '@marketplace-hub/domain';
import { validateAnnouncement } from '@marketplace-hub/domain';
import { AnnouncementApiException } from '../announcement-api.exception';
import { ConnectorRegistry } from '../connectors/connector-registry';
import type { AnnouncementPublication } from '../domain/announcement-publication';
import { ANNOUNCEMENT_REPOSITORY, type AnnouncementRepository } from './announcement-repository';
import { AnnouncementStatusCalculator } from './announcement-status-calculator';

export interface PublishAnnouncementResult {
  readonly publication: AnnouncementPublication;
}

/**
 * Orchestrates the 11-step flow from TASK-021 / `docs/architecture/publication-flow.md`:
 * retrieve announcement -> retrieve channel -> verify enabled -> re-validate
 * (general + connector-specific) -> block on ERROR issues -> READY ->
 * PUBLISHING -> map -> publish -> PUBLISHED/FAILED -> recompute overall
 * announcement status. A connector failure is caught and recorded as a
 * FAILED publication rather than thrown, matching the sequence diagram
 * ("200 OK with FAILED status" on publish failure).
 */
@Injectable()
export class PublishAnnouncementUseCase {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly repository: AnnouncementRepository,
    private readonly connectorRegistry: ConnectorRegistry,
    private readonly statusCalculator: AnnouncementStatusCalculator,
  ) {}

  async execute(announcementId: string, connectorCode: string): Promise<PublishAnnouncementResult> {
    const announcement = await this.repository.findById(announcementId);
    if (!announcement) {
      throw AnnouncementApiException.notFound(
        'ANNOUNCEMENT_NOT_FOUND',
        `Announcement ${announcementId} not found.`,
      );
    }

    const channel = await this.repository.findChannel(announcementId, connectorCode);
    if (!channel) {
      throw AnnouncementApiException.notFound(
        'CHANNEL_NOT_FOUND',
        `Channel ${connectorCode} is not configured for announcement ${announcementId}.`,
      );
    }

    const connector = this.connectorRegistry.get(connectorCode);
    if (!connector) {
      throw AnnouncementApiException.notFound(
        'CONNECTOR_NOT_FOUND',
        `Connector ${connectorCode} does not exist.`,
      );
    }

    if (!channel.enabled) {
      throw AnnouncementApiException.conflict(
        'CHANNEL_NOT_ENABLED',
        `Channel ${connectorCode} is not enabled for announcement ${announcementId}.`,
      );
    }

    // Documented choice for "doppia richiesta di pubblicazione": reject with
    // 409 while a previous attempt is in flight or already published; a
    // FAILED attempt may be retried, creating a new publication row.
    const latest = await this.repository.findLatestPublication(announcementId, connectorCode);
    if (latest && (latest.status === 'PUBLISHING' || latest.status === 'PUBLISHED')) {
      throw AnnouncementApiException.conflict(
        'PUBLICATION_ALREADY_IN_PROGRESS',
        `A publication attempt for channel ${connectorCode} is already ${latest.status.toLowerCase()}.`,
      );
    }

    const issues: ValidationIssue[] = [
      ...validateAnnouncement(announcement),
      ...connector.validate(announcement, channel.configuration),
    ];
    await this.repository.updateChannelValidation(channel.id, {
      validationStatus: issues.some((issue) => issue.severity === 'ERROR') ? 'INVALID' : 'VALID',
      validationErrors: issues.length > 0 ? issues : null,
      validatedAt: new Date(),
    });

    if (issues.some((issue) => issue.severity === 'ERROR')) {
      throw AnnouncementApiException.validationFailed(issues);
    }

    let publication = await this.repository.createPublication({
      announcementId,
      announcementChannelId: channel.id,
      connectorCode,
      status: 'READY',
    });
    publication = await this.repository.updatePublication(publication.id, { status: 'PUBLISHING' });

    try {
      const payload = connector.map(announcement, channel.configuration);
      const result = await connector.publish(payload);
      publication = await this.repository.updatePublication(publication.id, {
        status: 'PUBLISHED',
        externalListingId: result.externalListingId,
        externalUrl: result.externalUrl,
        publishedAt: new Date(),
        lastError: null,
      });
    } catch (error) {
      publication = await this.repository.updatePublication(publication.id, {
        status: 'FAILED',
        lastError: error instanceof Error ? error.message : 'Unknown publication error.',
      });
    }

    const status = await this.statusCalculator.compute(announcement);
    await this.repository.updateStatus(announcementId, status);

    return { publication };
  }
}
