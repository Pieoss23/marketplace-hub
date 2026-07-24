import { ApiProperty } from '@nestjs/swagger';
import type { ReadinessResponse } from '@marketplace-hub/contracts';

export class ReadinessResponseDto implements ReadinessResponse {
  @ApiProperty({ enum: ['ready', 'not_ready'], example: 'ready' })
  status!: 'ready' | 'not_ready';

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  database!: 'up' | 'down';

  @ApiProperty({ example: '2026-07-10T12:00:00.000Z' })
  timestamp!: string;
}
