import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUrl, Min } from 'class-validator';
import type { ListingImageDto as ListingImageContract } from '@marketplace-hub/contracts';

export class ListingImageDto implements ListingImageContract {
  @ApiProperty({ example: 'https://example.test/keyboard.jpg' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;
}
