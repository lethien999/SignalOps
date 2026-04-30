import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
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
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiOkResponse({
    description: 'Paged alerts response',
    schema: {
      example: {
        data: [],
        pagination: { skip: 0, limit: 50, total: 0 },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @Get()
  async listAlerts(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.alertService.listAlerts({
      severity,
      status,
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
