import { Module } from '@nestjs/common';
import { ConnectorsModule } from '../connectors/connectors.module';
import { ListingsModule } from '../listings/listings.module';
import { PrismaPublicationStore } from './infrastructure/prisma-publication.store';
import { PublicationsController } from './publications.controller';
import { PublicationsService } from './publications.service';

export const PUBLICATION_STORE = Symbol('PUBLICATION_STORE');

@Module({
  imports: [ConnectorsModule, ListingsModule],
  controllers: [PublicationsController],
  providers: [
    PrismaPublicationStore,
    PublicationsService,
    {
      provide: PUBLICATION_STORE,
      useExisting: PrismaPublicationStore,
    },
  ],
  exports: [PUBLICATION_STORE],
})
export class PublicationsModule {}
