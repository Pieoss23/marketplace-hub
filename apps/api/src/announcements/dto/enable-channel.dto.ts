import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsString } from 'class-validator';
import type { EnableAnnouncementChannelRequest } from '@marketplace-hub/contracts';

export class EnableAnnouncementChannelDto implements EnableAnnouncementChannelRequest {
  @ApiProperty({ example: 'mock' })
  @IsString()
  connectorCode!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ example: { category: 'vintage_keyboards' } })
  @IsObject()
  configuration!: Record<string, unknown>;
}
