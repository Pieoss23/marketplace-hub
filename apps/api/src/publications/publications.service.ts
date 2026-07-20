import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { validateListing } from '@marketplace-hub/domain';
import type { PublishListingResult } from './application/publish-listing.use-case';
import { PublishListingUseCase } from './application/publish-listing.use-case';
import { MockConnector } from '../connectors/mock/mock.connector';
import type { MockConnectorConfiguration } from '../connectors/mock/mock-connector.types';
import { ListingsService } from '../listings/listings.service';
import { PrismaPublicationStore } from './infrastructure/prisma-publication.store';

@Injectable()
export class PublicationsService {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly connector: MockConnector,
    private readonly publicationStore: PrismaPublicationStore,
  ) {}

  async publishMock(
    listingId: string,
    configuration: MockConnectorConfiguration,
  ): Promise<PublishListingResult> {
    const listing = await this.listingsService.findOne(listingId);
    await this.publicationStore.saveConfiguration(listingId, 'mock', {
      category: configuration.category,
    });
    const useCase = new PublishListingUseCase(
      this.connector,
      this.publicationStore,
      validateListing,
      randomUUID,
    );
    return useCase.execute({ listing, configuration });
  }

  findByListingId(listingId: string) {
    return this.publicationStore.findByListingId(listingId);
  }
}
