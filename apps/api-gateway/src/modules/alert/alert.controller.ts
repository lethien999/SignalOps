import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AlertService } from './alert.service';
import { UpdateAlertDto } from './dto/update-alert.dto';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('alerts')
@Controller('api/alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @ApiOperation({ summary: 'List alerts with filters and pagination' })
  @ApiQuery({ name: 'severity', required: false, type: String, example: 'high' })
  @ApiQuery({ name: 'status', required: false, type: String, example: 'open' })
  @ApiQuery({ name: 'deviceId', required: false, type: String, example: 'device-001' })
  @ApiQuery({ name: 'from', required: false, type: String, example: '2026-05-01' })
  @ApiQuery({ name: 'to', required: false, type: String, example: '2026-05-06' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiOkResponse({
    description: 'Paged alerts response',
    schema: {
      example: {
        data: [],
        pagination: { skip: 0, limit: 50, total: 0 },
        summary: { open: 0, acknowledged: 0, resolved: 0, highOpen: 0 },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @Get()
  async listAlerts(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('deviceId') deviceId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (from && Number.isNaN(fromDate?.getTime())) {
      throw new BadRequestException('Invalid from date');
    }

    if (to && Number.isNaN(toDate?.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    return this.alertService.listAlerts({
      severity,
      status,
      deviceId,
      from: fromDate,
      to: toDate,
      skip: skip || 0,
      limit: limit || 50,
    });
  }

  @ApiOperation({ summary: 'Batch update alert statuses' })
  @ApiBody({
    schema: {
      example: {
        ids: ['id1', 'id2'],
        status: 'acknowledged',
        acknowledgedBy: 'Operator A',
      },
    },
  })
  @ApiOkResponse({ description: 'Batch result with success/failure counts' })
  @Post('batch')
  async batchUpdateAlerts(
    @Body() body: { ids: string[]; status: 'acknowledged' | 'resolved'; acknowledgedBy?: string; resolvedBy?: string; resolutionNote?: string },
  ) {
    if (body.status === 'acknowledged') {
      return this.alertService.batchAcknowledge(body.ids || [], body.acknowledgedBy);
    }

    return this.alertService.batchResolve(body.ids || [], body.resolvedBy, body.resolutionNote);
  }

  @ApiOperation({ summary: 'Get alert history aggregated by day' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 7 })
  @ApiOkResponse({ description: 'Alert counts by day' })
  @Get('history')
  async getAlertHistory(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return this.alertService.getAlertHistory(days);
  }

  @ApiOperation({ summary: 'Export alert history as CSV' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 7 })
  @ApiOkResponse({ description: 'CSV file with alert history summary' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="alert-history.csv"')
  @Get('history/csv')
  async exportAlertHistoryCsv(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return this.alertService.exportAlertHistoryCsv(days);
  }

  @ApiOperation({ summary: 'Get alert by id' })
  @ApiOkResponse({ description: 'Alert detail' })
  @ApiNotFoundResponse({ description: 'Alert not found' })
  @Get(':id')
  async getAlert(@Param('id') id: string) {
    return this.alertService.getAlert(id);
  }

  @ApiOperation({ summary: 'Update alert status' })
  @ApiBody({ type: UpdateAlertDto })
  @ApiOkResponse({ description: 'Updated alert detail' })
  @ApiBadRequestResponse({ description: 'Invalid status transition or request body' })
  @ApiNotFoundResponse({ description: 'Alert not found' })
  @Patch(':id')
  async updateAlert(
    @Param('id') id: string,
    @Body() updateData: UpdateAlertDto,
  ) {
    const normalizedInput = {
      status: updateData.status,
      acknowledgedBy: updateData.acknowledgedBy,
      acknowledgedAt: updateData.acknowledgedAt ? new Date(updateData.acknowledgedAt) : undefined,
      resolvedAt: updateData.resolvedAt ? new Date(updateData.resolvedAt) : undefined,
      resolvedBy: updateData.resolvedBy,
      resolutionNote: updateData.resolutionNote,
    };

    return this.alertService.updateAlert(id, normalizedInput);
  }
}
