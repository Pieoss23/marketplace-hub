import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseFilters,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Announcement } from '@marketplace-hub/domain';
import { AnnouncementApiException } from './announcement-api.exception';
import { AnnouncementErrorFilter } from './announcement-error.filter';
import {
  toAnnouncementResponseDto,
  toChannelValidationResponseDto,
  toPublishAnnouncementResponseDto,
} from './announcement.mapper';
import { AnnouncementChannelsService } from './application/announcement-channels.service';
import { AnnouncementsService } from './application/announcements.service';
import { PublishAnnouncementUseCase } from './application/publish-announcement.use-case';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { ChannelValidationResponseDto } from './dto/channel-validation-response.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { EnableAnnouncementChannelDto } from './dto/enable-channel.dto';
import { PublishAnnouncementResponseDto } from './dto/publish-announcement-response.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@ApiTags('announcements')
@Controller('announcements')
@UseFilters(AnnouncementErrorFilter)
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly channelsService: AnnouncementChannelsService,
    private readonly publishUseCase: PublishAnnouncementUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create the central announcement' })
  @ApiCreatedResponse({ type: AnnouncementResponseDto })
  async create(@Body() dto: CreateAnnouncementDto): Promise<AnnouncementResponseDto> {
    const announcement = await this.announcementsService.create(dto);
    return this.toResponse(announcement);
  }

  @Get()
  @ApiOperation({ summary: 'List all announcements' })
  @ApiOkResponse({ type: [AnnouncementResponseDto] })
  async findAll(): Promise<AnnouncementResponseDto[]> {
    const announcements = await this.announcementsService.findAll();
    return Promise.all(announcements.map((announcement) => this.toResponse(announcement)));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an announcement by id' })
  @ApiOkResponse({ type: AnnouncementResponseDto })
  async findOne(@Param('id') id: string): Promise<AnnouncementResponseDto> {
    const announcement = await this.announcementsService.findOne(id);
    return this.toResponse(announcement);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace an announcement' })
  @ApiOkResponse({ type: AnnouncementResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    const announcement = await this.announcementsService.update(id, dto);
    return this.toResponse(announcement);
  }

  @Put(':id/channels/:connectorCode')
  @ApiOperation({ summary: 'Enable or configure a marketplace channel' })
  @ApiOkResponse({ type: AnnouncementResponseDto })
  async enableChannel(
    @Param('id') id: string,
    @Param('connectorCode') connectorCode: string,
    @Body() dto: EnableAnnouncementChannelDto,
  ): Promise<AnnouncementResponseDto> {
    if (dto.connectorCode !== connectorCode) {
      throw AnnouncementApiException.validationFailed([
        {
          code: 'channel.connectorCode.mismatch',
          message: 'connectorCode in the request body must match the URL parameter.',
          field: 'connectorCode',
          severity: 'ERROR',
        },
      ]);
    }

    await this.channelsService.enable(id, connectorCode, dto.enabled, dto.configuration);
    const announcement = await this.announcementsService.findOne(id);
    return this.toResponse(announcement);
  }

  @Post(':id/channels/:connectorCode/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dry-run validation for a channel' })
  @ApiOkResponse({ type: ChannelValidationResponseDto })
  async validateChannel(
    @Param('id') id: string,
    @Param('connectorCode') connectorCode: string,
  ): Promise<ChannelValidationResponseDto> {
    const { issues, validatedAt } = await this.channelsService.validate(id, connectorCode);
    return toChannelValidationResponseDto(issues, validatedAt);
  }

  @Post(':id/channels/:connectorCode/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish the announcement through the given connector' })
  @ApiOkResponse({ type: PublishAnnouncementResponseDto })
  async publish(
    @Param('id') id: string,
    @Param('connectorCode') connectorCode: string,
  ): Promise<PublishAnnouncementResponseDto> {
    const { publication } = await this.publishUseCase.execute(id, connectorCode);
    return toPublishAnnouncementResponseDto(publication);
  }

  @Get(':id/publications')
  @ApiOperation({ summary: 'List publication attempts for an announcement, most recent first' })
  @ApiOkResponse({ type: [PublishAnnouncementResponseDto] })
  async listPublications(@Param('id') id: string): Promise<PublishAnnouncementResponseDto[]> {
    await this.announcementsService.findOne(id);
    const publications = await this.channelsService.listPublications(id);
    return publications.map(toPublishAnnouncementResponseDto);
  }

  private async toResponse(announcement: Announcement): Promise<AnnouncementResponseDto> {
    const { channels, latestByChannelId } = await this.channelsService.listWithLatestPublications(
      announcement.id,
    );
    return toAnnouncementResponseDto(announcement, channels, latestByChannelId);
  }
}
