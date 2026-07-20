import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Min } from 'class-validator';
import type { MoneyDto as MoneyContract } from '@marketplace-hub/contracts';

export class MoneyDto implements MoneyContract {
  @ApiProperty({ example: 7500, description: 'Amount in minor currency units (e.g. cents)' })
  @IsInt()
  @Min(0)
  amountMinor!: number;

  @ApiProperty({ example: 'EUR' })
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a three-letter uppercase ISO 4217 code' })
  currency!: string;
}
