import { ApiProperty } from '@nestjs/swagger';
import type { ValidationIssue } from '@marketplace-hub/domain';
import type { ChannelValidationResponse } from '@marketplace-hub/contracts';

export class ChannelValidationResponseDto implements ChannelValidationResponse {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty({ type: [Object] })
  issues!: readonly ValidationIssue[];

  @ApiProperty()
  validatedAt!: string;
}
