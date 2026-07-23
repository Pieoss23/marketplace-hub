import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementChannelsService } from './application/announcement-channels.service';
import { ANNOUNCEMENT_REPOSITORY } from './application/announcement-repository';
import { AnnouncementStatusCalculator } from './application/announcement-status-calculator';
import { AnnouncementsService } from './application/announcements.service';
import { PublishAnnouncementUseCase } from './application/publish-announcement.use-case';
import { ConnectorRegistry } from './connectors/connector-registry';
import { MockChannelConnector } from './connectors/mock-channel.connector';
import { PrismaAnnouncementRepository } from './infrastructure/prisma-announcement.repository';

@Module({
  imports: [AuthModule],
  controllers: [AnnouncementsController],
  providers: [
    PrismaAnnouncementRepository,
    { provide: ANNOUNCEMENT_REPOSITORY, useExisting: PrismaAnnouncementRepository },
    AnnouncementsService,
    AnnouncementChannelsService,
    AnnouncementStatusCalculator,
    PublishAnnouncementUseCase,
    MockChannelConnector,
    ConnectorRegistry,
  ],
})
export class AnnouncementsModule {}
