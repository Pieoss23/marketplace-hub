import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthResponseDto } from './health-response.dto';
import { HealthService } from './health.service';
import { ReadinessResponseDto } from './readiness-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Report basic API liveness' })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return this.healthService.check();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Report readiness, including database connectivity' })
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({ type: ReadinessResponseDto })
  async ready(@Res({ passthrough: true }) res: Response): Promise<ReadinessResponseDto> {
    const readiness = await this.healthService.checkReadiness();
    res.status(readiness.status === 'ready' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return readiness;
  }
}
