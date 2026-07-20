import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import type { CreateMockPublicationRequest } from '@marketplace-hub/contracts';

export class CreateMockPublicationDto implements CreateMockPublicationRequest {
  @ApiProperty({ example: 'electronics' })
  @IsString()
  @IsNotEmpty()
  category!: string;
}
