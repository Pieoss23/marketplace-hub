import type { ValidationIssue } from '@marketplace-hub/domain';

export const CHANNEL_VALIDATION_STATUSES = ['PENDING', 'VALID', 'INVALID'] as const;
export type ChannelValidationStatus = (typeof CHANNEL_VALIDATION_STATUSES)[number];

export interface AnnouncementChannel {
  readonly id: string;
  readonly announcementId: string;
  readonly connectorCode: string;
  readonly enabled: boolean;
  readonly configuration: Record<string, unknown>;
  readonly validationStatus: ChannelValidationStatus;
  readonly validationErrors: readonly ValidationIssue[] | null;
  readonly validatedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
