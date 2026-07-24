import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './health-response.dto';
import { ReadinessResponseDto } from './readiness-response.dto';

const SERVICE_NAME = 'marketplace-hub-api';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  check(): HealthResponseDto {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness: verifies the database is reachable with a trivial query. Any
   * failure is swallowed and reported as `not_ready`/`down` so the caller (the
   * controller) can map it to a 503 instead of surfacing a 500 stack trace.
   */
  async checkReadiness(): Promise<ReadinessResponseDto> {
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'up', timestamp };
    } catch {
      return { status: 'not_ready', database: 'down', timestamp };
    }
  }
}
