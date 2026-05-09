import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('system')
@Controller('api/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Get system health with dependencies status' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-04-25T02:10:00.000Z',
        uptime: 123.45,
        dependencies: {
          mongodb: 'up',
          redis: 'up',
        },
      },
    },
  })
  @Get()
  async getHealth() {
    return this.healthService.getHealth();
  }
}

@ApiTags('system')
@Controller('api/stats')
export class StatsController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Get system statistics snapshot' })
  @ApiOkResponse({
    schema: {
      example: {
        totalEvents: 1000,
        activeAlerts: 12,
        eventsPerMinute: 45,
        costMetrics: {
          period: 'day',
          hours: 24,
          hourlyCostUsd: 0.83,
          periodCostUsd: 19.92,
        },
        scaleStatus: {
          recommendation: 'stable',
          score: 42,
        },
        timestamp: '2026-04-25T02:10:00.000Z',
      },
    },
  })
  @Get()
  async getStats() {
    return this.healthService.getStats();
  }
}
