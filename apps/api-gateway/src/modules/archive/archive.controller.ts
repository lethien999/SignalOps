import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ArchiveService } from './archive.service';
import { RunArchiveDto } from './dto/run-archive.dto';

@ApiTags('archive')
@Controller('api/archive')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @ApiOperation({ summary: 'Chạy archive dữ liệu cũ lên S3-compatible storage' })
  @ApiBody({ type: RunArchiveDto })
  @ApiOkResponse({ description: 'Kết quả archive theo từng nguồn dữ liệu' })
  @Post('run')
  async runArchive(@Body() body: RunArchiveDto) {
    return this.archiveService.runArchive(body);
  }

  @ApiOperation({ summary: 'Danh sách archive records' })
  @ApiQuery({ name: 'source', required: false, enum: ['events', 'alerts'] })
  @ApiQuery({ name: 'status', required: false, enum: ['running', 'completed', 'failed'] })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('records')
  async listRecords(
    @Query('source') source?: 'events' | 'alerts',
    @Query('status') status?: 'running' | 'completed' | 'failed',
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number
  ) {
    return this.archiveService.listRecords({ source, status, skip, limit });
  }

  @ApiOperation({ summary: 'Tải file archive theo record id' })
  @ApiOkResponse({ description: 'Nội dung file ndjson.gz' })
  @Get('records/:id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { record, body } = await this.archiveService.downloadArchive(id);

    res.setHeader('Content-Type', record.contentType || 'application/x-ndjson');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${record.source}-${id}.ndjson.gz"`);
    res.send(body);
  }
}
