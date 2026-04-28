import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventService } from './event.service';

/**
 * E1: Device controller — derives device list from recent events.
 */
@ApiTags('devices')
@Controller('api/devices')
export class DeviceController {
  constructor(private readonly eventService: EventService) {}

  @ApiOperation({ summary: 'Get derived device list from recent events' })
  @ApiOkResponse({
    description: 'List of devices with latest metrics and status',
  })
  @Get()
  async getDevices() {
    return this.eventService.getDevices();
  }
}
