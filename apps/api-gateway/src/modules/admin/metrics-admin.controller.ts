import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiSecurity } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { register } from 'prom-client';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { InfrastructureObservability, type CostPeriod } from '../health/infrastructure-observability';

@ApiTags('admin')
@ApiSecurity('admin-api-key')
@UseGuards(AdminApiKeyGuard)
@Controller('api/admin/metrics')
export class MetricsAdminController {
  constructor(@InjectConnection() private readonly mongooseConnection: Connection) {}

  @ApiOperation({ summary: 'Get aggregation metric snapshot (admin)' })
  @ApiOkResponse({ description: 'JSON snapshot of aggregation metrics' })
  @ApiQuery({ name: 'pipeline', required: false, type: String })
  @Get()
  async getAggregationMetrics(@Query('pipeline') pipeline?: string) {
    const metric = register.getSingleMetric('signalops_aggregation_duration_seconds');
    if (!metric) {
      return { ok: false, message: 'aggregation metric not registered' };
    }

    // metric.get() returns a Promise of internal representation for histogram
    const m = await metric.get();
    if (!pipeline) return m;

    // filter by label value
    const filtered = (m?.values || []).filter((v: any) => v.labels && v.labels.pipeline === pipeline);
    return { metric: m, filtered };
  }

  @ApiOperation({ summary: 'Get infrastructure cost metrics snapshot (admin)' })
  @ApiOkResponse({ description: 'JSON snapshot of infrastructure cost metrics and breakdown' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  @Get('cost-metrics')
  async getCostMetrics(@Query('period') period?: CostPeriod) {
    return InfrastructureObservability.getCostSnapshot(this.mongooseConnection, period ?? 'day');
  }

  @ApiOperation({ summary: 'Get auto-scaling recommendation snapshot (admin)' })
  @ApiOkResponse({ description: 'JSON snapshot of auto-scaling recommendation' })
  @Get('scale-status')
  async getScaleStatus() {
    return InfrastructureObservability.getScaleStatus(this.mongooseConnection);
  }
}
