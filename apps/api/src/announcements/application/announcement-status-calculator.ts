import { Inject, Injectable } from '@nestjs/common';
import type { Announcement, AnnouncementStatus } from '@marketplace-hub/domain';
import { validateAnnouncement } from '@marketplace-hub/domain';
import { ANNOUNCEMENT_REPOSITORY, type AnnouncementRepository } from './announcement-repository';

/**
 * Implements `docs/architecture/publication-flow.md` step 4 ("Overall
 * Announcement Status Update"), extended with the DRAFT/READY transition
 * from `docs/domain/announcement.md` ("must satisfy validation rules to
 * transition to READY"): general validation gates DRAFT vs READY, and the
 * enabled channels' latest publication states gate READY vs
 * PARTIALLY_PUBLISHED vs PUBLISHED. Reused by both `AnnouncementsService`
 * (create/update) and `PublishAnnouncementUseCase` (after each attempt), so
 * editing an announcement never silently downgrades an already-published
 * status, and a publish attempt never silently overrides a validation
 * failure.
 */
@Injectable()
export class AnnouncementStatusCalculator {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly repository: AnnouncementRepository,
  ) {}

  async compute(announcement: Announcement): Promise<AnnouncementStatus> {
    const issues = validateAnnouncement(announcement);
    if (issues.some((issue) => issue.severity === 'ERROR')) {
      return 'DRAFT';
    }

    const channels = await this.repository.findChannels(announcement.id);
    const enabledChannels = channels.filter((channel) => channel.enabled);
    if (enabledChannels.length === 0) {
      return 'READY';
    }

    const latestPublications = await this.repository.findLatestPublicationsByChannel(
      announcement.id,
    );
    const statusByChannelId = new Map(
      latestPublications.map((p) => [p.announcementChannelId, p.status]),
    );
    const statuses = enabledChannels.map((channel) => statusByChannelId.get(channel.id));

    if (statuses.every((status) => status === 'PUBLISHED')) {
      return 'PUBLISHED';
    }
    if (statuses.some((status) => status === 'PUBLISHED')) {
      return 'PARTIALLY_PUBLISHED';
    }
    return 'READY';
  }
}
