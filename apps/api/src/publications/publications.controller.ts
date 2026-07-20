import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateMockPublicationDto } from './dto/create-mock-publication.dto';
import { PublicationDto, PublishListingResponseDto } from './dto/publication.dto';
import { PublicationsService } from './publications.service';
import { toPublicationDto, toPublishListingResponse } from './publication.mapper';

@ApiTags('publications')
@Controller('listings/:listingId/publications')
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Post('mock')
  @ApiOperation({ summary: 'Publish a central listing through the mock connector' })
  @ApiCreatedResponse({ type: PublishListingResponseDto })
  async publishMock(
    @Param('listingId') listingId: string,
    @Body() dto: CreateMockPublicationDto,
  ): Promise<PublishListingResponseDto> {
    const result = await this.publicationsService.publishMock(listingId, dto);
    return toPublishListingResponse(result);
  }

  @Get()
  @ApiOperation({ summary: 'List independent publication attempts for a listing' })
  @ApiOkResponse({ type: [PublicationDto] })
  async findByListingId(@Param('listingId') listingId: string): Promise<PublicationDto[]> {
    const publications = await this.publicationsService.findByListingId(listingId);
    return publications.map(toPublicationDto);
  }
}
