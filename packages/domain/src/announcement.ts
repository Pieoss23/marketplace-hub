export const PRODUCT_CONDITIONS = [
  'NEW',
  'LIKE_NEW',
  'USED_GOOD',
  'USED_ACCEPTABLE',
  'FOR_PARTS',
] as const;

export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const ANNOUNCEMENT_STATUSES = [
  'DRAFT',
  'READY',
  'PARTIALLY_PUBLISHED',
  'PUBLISHED',
] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const VALIDATION_SEVERITIES = ['ERROR', 'WARNING', 'INFO'] as const;

export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

export const PUBLICATION_STATUSES = [
  'READY',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
] as const;

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly field: string;
  readonly severity: ValidationSeverity;
  readonly connectorCode?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface Announcement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly price: number; // in cents
  readonly currency: string;
  readonly categoryCode: string;
  readonly condition: ProductCondition;
  readonly quantity: number;
  readonly status: AnnouncementStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function validateAnnouncement(announcement: Announcement): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!announcement.title || announcement.title.trim().length === 0) {
    issues.push({
      code: 'announcement.title.required',
      message: 'Title is required.',
      field: 'title',
      severity: 'ERROR',
    });
  } else if (announcement.title.length > 120) {
    issues.push({
      code: 'announcement.title.too_long',
      message: 'Title must not exceed 120 characters.',
      field: 'title',
      severity: 'ERROR',
    });
  }

  if (!announcement.description || announcement.description.trim().length === 0) {
    issues.push({
      code: 'announcement.description.required',
      message: 'Description is required.',
      field: 'description',
      severity: 'ERROR',
    });
  }

  if (!Number.isInteger(announcement.price) || announcement.price <= 0) {
    issues.push({
      code: 'announcement.price.invalid',
      message: 'Price must be an integer greater than zero (expressed in cents).',
      field: 'price',
      severity: 'ERROR',
    });
  }

  if (announcement.currency !== 'EUR') {
    issues.push({
      code: 'announcement.currency.invalid',
      message: 'Currency must initially be EUR.',
      field: 'currency',
      severity: 'ERROR',
    });
  }

  if (!Number.isInteger(announcement.quantity) || announcement.quantity <= 0) {
    issues.push({
      code: 'announcement.quantity.invalid',
      message: 'Quantity must be an integer greater than zero.',
      field: 'quantity',
      severity: 'ERROR',
    });
  }

  if (!announcement.categoryCode || announcement.categoryCode.trim().length === 0) {
    issues.push({
      code: 'announcement.categoryCode.required',
      message: 'Category code is required.',
      field: 'categoryCode',
      severity: 'ERROR',
    });
  }

  if (!announcement.condition || !PRODUCT_CONDITIONS.includes(announcement.condition)) {
    issues.push({
      code: 'announcement.condition.invalid',
      message: 'Condition is required and must be a valid product condition.',
      field: 'condition',
      severity: 'ERROR',
    });
  }

  return issues;
}
