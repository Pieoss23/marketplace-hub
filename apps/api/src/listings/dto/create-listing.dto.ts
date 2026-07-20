import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, Length, ValidateNested } from 'class-validator';
import type { CreateListingRequest } from '@marketplace-hub/contracts';
import { MoneyDto } from './money.dto';
import { ListingImageDto } from './listing-image.dto';

export class CreateListingDto implements CreateListingRequest {
  @ApiProperty({ example: 'Mechanical keyboard' })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ example: 'Used mechanical keyboard in good condition.' })
  @IsString()
  @Length(1, 5000)
  description!: string;

  @ApiProperty({ type: MoneyDto })
  @ValidateNested()
  @Type(() => MoneyDto)
  price!: MoneyDto;

  @ApiProperty({ type: [ListingImageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListingImageDto)
  images!: ListingImageDto[];
}
