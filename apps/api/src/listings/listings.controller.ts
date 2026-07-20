import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingDto } from './dto/listing.dto';
import { toListingDto } from './listing.mapper';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create the central listing' })
  @ApiCreatedResponse({ type: ListingDto })
  async create(@Body() dto: CreateListingDto): Promise<ListingDto> {
    const listing = await this.listingsService.create(dto);
    return toListingDto(listing);
  }

  @Get()
  @ApiOperation({ summary: 'List all listings' })
  @ApiOkResponse({ type: [ListingDto] })
  async findAll(): Promise<ListingDto[]> {
    const listings = await this.listingsService.findAll();
    return listings.map(toListingDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a listing by id' })
  @ApiOkResponse({ type: ListingDto })
  async findOne(@Param('id') id: string): Promise<ListingDto> {
    const listing = await this.listingsService.findOne(id);
    return toListingDto(listing);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a listing' })
  @ApiOkResponse({ type: ListingDto })
  async update(@Param('id') id: string, @Body() dto: UpdateListingDto): Promise<ListingDto> {
    const listing = await this.listingsService.update(id, dto);
    return toListingDto(listing);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a listing' })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string): Promise<void> {
    await this.listingsService.remove(id);
  }
}
