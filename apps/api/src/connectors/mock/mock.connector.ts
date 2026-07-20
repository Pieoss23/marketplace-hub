import { randomUUID } from 'node:crypto';
import type { MarketplaceConnector, PublishResult } from '@marketplace-hub/connector-sdk';
import type { Listing, ValidationError, ValidationResult } from '@marketplace-hub/domain';
import type { MockConnectorConfiguration, MockConnectorPayload } from './mock-connector.types';

const MOCK_TITLE_MAX_LENGTH = 80;

export class MockConnector implements MarketplaceConnector<
  MockConnectorConfiguration,
  MockConnectorPayload
> {
  readonly marketplaceId = 'mock' as const;

  constructor(
    private readonly generateExternalId: () => string = () => `mock-${randomUUID()}`,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  validate(listing: Listing, configuration: MockConnectorConfiguration): ValidationResult {
    const errors: ValidationError[] = [];

    if (configuration.category.trim().length === 0) {
      errors.push({
        code: 'mock.category.required',
        field: 'configuration.category',
        message: 'Mock category is required.',
      });
    }

    if (listing.title.length > MOCK_TITLE_MAX_LENGTH) {
      errors.push({
        code: 'mock.title.too_long',
        field: 'title',
        message: `Mock title must not exceed ${MOCK_TITLE_MAX_LENGTH} characters.`,
      });
    }

    return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
  }

  transform(listing: Listing, configuration: MockConnectorConfiguration): MockConnectorPayload {
    const orderedImages = [...listing.images].sort((left, right) => left.position - right.position);

    return {
      category: configuration.category,
      title: listing.title,
      description: listing.description,
      price: {
        amountMinor: listing.price.amountMinor,
        currency: listing.price.currency,
      },
      imageUrls: orderedImages.map((image) => image.url),
    };
  }

  publish(_payload: MockConnectorPayload): Promise<PublishResult> {
    return Promise.resolve({
      externalId: this.generateExternalId(),
      publishedAt: this.clock(),
    });
  }
}
