import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventBrokerService } from './event-broker.service';

@ApiTags('dlq')
@Controller('api/dlq')
export class DlqController {
  constructor(private readonly eventBrokerService: EventBrokerService) {}

  @ApiOperation({ summary: 'Get failed jobs from dead-letter queue' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiOkResponse({ description: 'List of failed jobs in DLQ' })
  @Get('failed-jobs')
  async getFailedJobs(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.eventBrokerService.getFailedJobs(limit);
  }
}
