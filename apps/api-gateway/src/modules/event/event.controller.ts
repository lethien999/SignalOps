import { Controller, Post, Get, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('api/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createEvent(@Body() createEventDto: CreateEventDto) {
    return this.eventService.createEvent(createEventDto);
  }

  @Get()
  async listEvents(
    @Query('skip') skip = 0,
    @Query('limit') limit = 50,
  ) {
    return this.eventService.listEvents(skip, limit);
  }

  @Get(':id')
  async getEvent(@Param('id') id: string) {
    return this.eventService.getEvent(id);
  }
}
