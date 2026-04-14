import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { AlertService } from './alert.service';

@Controller('api/alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  async listAlerts(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('skip') skip = 0,
    @Query('limit') limit = 50,
  ) {
    return this.alertService.listAlerts({ severity, status, skip, limit });
  }

  @Get(':id')
  async getAlert(@Param('id') id: string) {
    return this.alertService.getAlert(id);
  }

  @Patch(':id')
  async updateAlert(
    @Param('id') id: string,
    @Body() updateData: { status: string; acknowledgedBy?: string },
  ) {
    return this.alertService.updateAlert(id, updateData);
  }
}
