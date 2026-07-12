import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Length, Min } from 'class-validator';
import type { CreateAnnouncementRequest } from '@marketplace-hub/contracts';
import { PRODUCT_CONDITIONS, type ProductCondition } from '@marketplace-hub/domain';

export class CreateAnnouncementDto implements CreateAnnouncementRequest {
  @ApiProperty({ example: 'Tastiera meccanica vintage' })
  @IsString()
  @Length(1, 120)
  title!: string;

  @ApiProperty({ example: 'Bellissima tastiera meccanica IBM Model M del 1989.' })
  @IsString()
  @Length(1, 5000)
  description!: string;

  @ApiProperty({ example: 15000, description: 'Price in cents' })
  @IsInt()
  @Min(1)
  priceAmount!: number;

  @ApiProperty({ example: 'EUR' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: 'electronics' })
  @IsString()
  @Length(1, 200)
  categoryCode!: string;

  @ApiProperty({ enum: PRODUCT_CONDITIONS, example: 'USED_GOOD' })
  @IsIn(PRODUCT_CONDITIONS)
  condition!: ProductCondition;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
