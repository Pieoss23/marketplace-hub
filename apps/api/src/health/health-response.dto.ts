import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'marketplace-hub-api' })
  service!: string;

  @ApiProperty({ example: '2026-07-10T12:00:00.000Z' })
  timestamp!: string;
}
