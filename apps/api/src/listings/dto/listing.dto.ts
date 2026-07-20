import { ApiProperty } from '@nestjs/swagger';
import type { ListingResponse } from '@marketplace-hub/contracts';
import { MoneyDto } from './money.dto';
import { ListingImageDto } from './listing-image.dto';

export class ListingDto implements ListingResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: MoneyDto })
  price!: MoneyDto;

  @ApiProperty({ type: [ListingImageDto] })
  images!: ListingImageDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
