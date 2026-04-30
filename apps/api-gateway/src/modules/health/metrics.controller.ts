import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { collectDefaultMetrics, register } from 'prom-client';

collectDefaultMetrics();

@ApiTags('system')
@Controller('api/metrics')
export class MetricsController {
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiOkResponse({ description: 'Prometheus metrics payload' })
  @Get()
  async getMetrics(@Res() res: Response) {
    const metrics = await register.metrics();
    res.setHeader('Content-Type', register.contentType);
    res.send(metrics);
  }
}
