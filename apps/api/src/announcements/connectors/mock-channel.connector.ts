import { randomUUID } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import type { Announcement, ValidationIssue } from '@marketplace-hub/domain';
import type {
  AnnouncementChannelConnector,
  AnnouncementChannelPayload,
  AnnouncementChannelPublishResult,
} from './announcement-channel-connector';

const MOCK_TITLE_MAX_LENGTH = 80;
const MOCK_DESCRIPTION_MIN_LENGTH = 20;

@Injectable()
export class MockChannelConnector implements AnnouncementChannelConnector {
  readonly connectorCode = 'mock';

  constructor(@Optional() private readonly generateId: () => string = () => randomUUID()) {}

  validate(announcement: Announcement, _configuration: Record<string, unknown>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (announcement.title.length > MOCK_TITLE_MAX_LENGTH) {
      issues.push({
        code: 'mock.title.too_long',
        message: `Title must not exceed ${MOCK_TITLE_MAX_LENGTH} characters for this channel.`,
        field: 'title',
        severity: 'ERROR',
        connectorCode: this.connectorCode,
      });
    }

    if (announcement.description.length < MOCK_DESCRIPTION_MIN_LENGTH) {
      issues.push({
        code: 'mock.description.too_short',
        message: `Description must be at least ${MOCK_DESCRIPTION_MIN_LENGTH} characters for this channel.`,
        field: 'description',
        severity: 'ERROR',
        connectorCode: this.connectorCode,
      });
    }

    return issues;
  }

  map(
    announcement: Announcement,
    configuration: Record<string, unknown>,
  ): AnnouncementChannelPayload {
    return {
      connectorCode: this.connectorCode,
      title: announcement.title,
      description: announcement.description,
      price: { amount: announcement.price, currency: announcement.currency },
      categoryCode: announcement.categoryCode,
      condition: announcement.condition,
      quantity: announcement.quantity,
      configuration,
    };
  }

  publish(_payload: AnnouncementChannelPayload): Promise<AnnouncementChannelPublishResult> {
    const id = this.generateId();
    return Promise.resolve({
      externalListingId: `mock_${id}`,
      externalUrl: `https://mock.marketplace.local/listings/${id}`,
    });
  }
}
