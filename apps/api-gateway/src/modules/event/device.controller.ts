import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventService } from './event.service';
import { UpdateDeviceMaintenanceDto } from './dto/update-device-maintenance.dto';

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

  @ApiOperation({ summary: 'Get devices currently in maintenance mode' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiOkResponse({
    description: 'List of maintenance records',
  })
  @Get('maintenance')
  async getMaintenanceDevices(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.eventService.getMaintenanceDevices(skip, limit);
  }

  @ApiOperation({ summary: 'Enable or disable maintenance mode for a device' })
  @ApiBody({ type: UpdateDeviceMaintenanceDto })
  @ApiOkResponse({
    description: 'Updated maintenance status for the device',
  })
  @Patch(':deviceId/maintenance')
  async updateDeviceMaintenance(
    @Param('deviceId') deviceId: string,
    @Body() body: UpdateDeviceMaintenanceDto,
  ) {
    return this.eventService.updateDeviceMaintenance(deviceId, body);
  }
}
