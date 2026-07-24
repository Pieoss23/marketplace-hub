import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { ConnectorsModule } from './connectors/connectors.module';
import { HealthModule } from './health/health.module';
import { ListingsModule } from './listings/listings.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicationsModule } from './publications/publications.module';

const DEFAULT_RATE_LIMIT_TTL_MS = 60_000;
const DEFAULT_RATE_LIMIT = 60;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    // Baseline DoS defense for the whole API; auth endpoints override this
    // with tighter, brute-force-specific limits (see AuthController).
    ThrottlerModule.forRoot([{ ttl: DEFAULT_RATE_LIMIT_TTL_MS, limit: DEFAULT_RATE_LIMIT }]),
    PrismaModule,
    ConnectorsModule,
    HealthModule,
    ListingsModule,
    PublicationsModule,
    AuthModule,
    AnnouncementsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
