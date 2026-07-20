import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  PublicationErrorResponse,
  PublicationResponse,
  PublishListingResponse,
} from '@marketplace-hub/contracts';
import type { PublicationStatus } from '@marketplace-hub/domain';

export class PublicationErrorDto implements PublicationErrorResponse {
  @ApiProperty({ example: 'mock.category.required' })
  code!: string;

  @ApiProperty({ example: 'configuration.category' })
  field!: string;

  @ApiProperty({ example: 'Mock category is required.' })
  message!: string;
}

export class PublicationDto implements PublicationResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  listingId!: string;

  @ApiProperty({ enum: ['mock'] })
  marketplaceId!: 'mock';

  @ApiProperty({
    enum: ['draft', 'validating', 'ready', 'publishing', 'published', 'failed'],
  })
  status!: PublicationStatus;

  @ApiPropertyOptional({ example: 'mock-550e8400-e29b-41d4-a716-446655440000' })
  externalId?: string;

  @ApiPropertyOptional({ example: 'publication.publish.failed' })
  lastError?: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class PublishListingResponseDto implements PublishListingResponse {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ type: PublicationDto })
  publication!: PublicationDto;

  @ApiProperty({ type: [PublicationErrorDto] })
  errors!: PublicationErrorDto[];
}
