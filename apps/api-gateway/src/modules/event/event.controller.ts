import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('events')
@Controller('api/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @ApiOperation({ summary: 'Create event and enqueue for processing' })
  @ApiAcceptedResponse({
    description: 'Event accepted and queued',
    schema: {
      example: {
        id: '662a7ed9a6b4f9838b0c9f45',
        status: 'queued',
        jobId: 'device-001-662a7ed9a6b4f9838b0c9f45',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid event payload' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createEvent(@Body() createEventDto: CreateEventDto) {
    return this.eventService.createEvent(createEventDto);
  }

  @ApiOperation({ summary: 'List events with pagination and optional filters' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'deviceId', required: false, type: String, example: 'device-001' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2026-04-24T00:00:00.000Z',
  })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2026-04-25T00:00:00.000Z' })
  @ApiOkResponse({
    description: 'Paged events response',
    schema: {
      example: {
        data: [],
        pagination: { skip: 0, limit: 50, total: 0 },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @Get()
  async listEvents(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('deviceId') deviceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const filters = this.eventService.parseEventFilters({
      skip,
      limit,
      deviceId,
      startDate,
      endDate,
    });

    return this.eventService.listEvents(filters);
  }

  @ApiOperation({ summary: 'Get event by id' })
  @ApiOkResponse({ description: 'Event detail' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @Get(':id')
  async getEvent(@Param('id') id: string) {
    return this.eventService.getEvent(id);
  }

  @ApiOperation({ summary: '[TEST] Create event without API key (development only)' })
  @ApiAcceptedResponse({
    description: 'Event accepted and queued',
    schema: {
      example: {
        id: '662a7ed9a6b4f9838b0c9f45',
        status: 'queued',
        jobId: 'device-001-662a7ed9a6b4f9838b0c9f45',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid event payload' })
  @Post('test/create')
  @HttpCode(HttpStatus.ACCEPTED)
  async createEventTest(@Body() createEventDto: CreateEventDto) {
    return this.eventService.createEvent(createEventDto);
  }
}
