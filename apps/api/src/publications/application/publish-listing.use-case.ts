import type { MarketplaceConnector } from '@marketplace-hub/connector-sdk';
import type {
  Listing,
  Publication,
  PublicationStatus,
  ValidationError,
  ValidationResult,
} from '@marketplace-hub/domain';
import type { PublicationStore } from './publication-store';

export type ListingValidator = (listing: Listing) => ValidationResult;

export interface PublishListingCommand<TConfiguration> {
  readonly listing: Listing;
  readonly configuration: TConfiguration;
}

export type PublishListingResult =
  | {
      readonly success: true;
      readonly publication: Publication;
      readonly errors: readonly [];
    }
  | {
      readonly success: false;
      readonly publication: Publication;
      readonly errors: readonly ValidationError[];
    };

export class PublishListingUseCase<TConfiguration, TPayload> {
  constructor(
    private readonly connector: MarketplaceConnector<TConfiguration, TPayload>,
    private readonly publicationStore: PublicationStore,
    private readonly validateListing: ListingValidator,
    private readonly generatePublicationId: () => string,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(command: PublishListingCommand<TConfiguration>): Promise<PublishListingResult> {
    const createdAt = this.clock();
    let publication: Publication = {
      id: this.generatePublicationId(),
      listingId: command.listing.id,
      marketplaceId: this.connector.marketplaceId,
      status: 'draft',
      createdAt,
      updatedAt: createdAt,
    };
    await this.publicationStore.save(publication);

    publication = await this.transition(publication, 'validating');

    const generalValidation = this.validateListing(command.listing);
    if (!generalValidation.valid) {
      return this.validationFailure(publication, generalValidation.errors);
    }

    const connectorValidation = this.connector.validate(command.listing, command.configuration);
    if (!connectorValidation.valid) {
      return this.validationFailure(publication, connectorValidation.errors);
    }

    publication = await this.transition(publication, 'ready');
    const payload = this.connector.transform(command.listing, command.configuration);
    publication = await this.transition(publication, 'publishing');

    try {
      const published = await this.connector.publish(payload);
      publication = {
        ...publication,
        status: 'published',
        externalId: published.externalId,
        updatedAt: published.publishedAt,
      };
      await this.publicationStore.save(publication);

      return { success: true, publication, errors: [] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown publish error';
      const errors: readonly ValidationError[] = [
        {
          code: 'publication.publish.failed',
          field: 'publication',
          message,
        },
      ];
      publication = await this.fail(publication, message);
      return { success: false, publication, errors };
    }
  }

  private async validationFailure(
    publication: Publication,
    errors: readonly ValidationError[],
  ): Promise<PublishListingResult> {
    const message = errors.map((error) => error.code).join(', ');
    const failedPublication = await this.fail(publication, message);
    return { success: false, publication: failedPublication, errors };
  }

  private async transition(
    publication: Publication,
    status: PublicationStatus,
  ): Promise<Publication> {
    const updated = { ...publication, status, updatedAt: this.clock() };
    await this.publicationStore.save(updated);
    return updated;
  }

  private async fail(publication: Publication, lastError: string): Promise<Publication> {
    const failed = {
      ...publication,
      status: 'failed' as const,
      lastError,
      updatedAt: this.clock(),
    };
    await this.publicationStore.save(failed);
    return failed;
  }
}
