import { Injectable } from '@nestjs/common';
import { HealthResponseDto } from './health-response.dto';

const SERVICE_NAME = 'marketplace-hub-api';

@Injectable()
export class HealthService {
  check(): HealthResponseDto {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    };
  }
}
