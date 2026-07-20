import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import type { UpdateListingRequest } from '@marketplace-hub/contracts';
import { MoneyDto } from './money.dto';
import { ListingImageDto } from './listing-image.dto';

export class UpdateListingDto implements UpdateListingRequest {
  @ApiPropertyOptional({ example: 'Mechanical keyboard' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @ApiPropertyOptional({ example: 'Used mechanical keyboard in good condition.' })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;

  @ApiPropertyOptional({ type: MoneyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  price?: MoneyDto;

  @ApiPropertyOptional({ type: [ListingImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListingImageDto)
  images?: ListingImageDto[];
}
