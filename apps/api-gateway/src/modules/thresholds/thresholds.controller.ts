import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ThresholdsService } from './thresholds.service';
import { UpsertThresholdProfileDto } from './dto/upsert-threshold-profile.dto';

@ApiTags('thresholds')
@Controller('api/thresholds')
export class ThresholdsController {
  constructor(private readonly thresholdsService: ThresholdsService) {}

  @ApiOperation({ summary: 'Danh sách cấu hình ngưỡng hiện có' })
  @ApiOkResponse({ description: 'Danh sách profile ngưỡng' })
  @Get()
  async listProfiles() {
    return this.thresholdsService.listProfiles();
  }

  @ApiOperation({ summary: 'Lấy cấu hình ngưỡng hiệu lực cho thiết bị' })
  @ApiQuery({ name: 'deviceId', required: false, type: String, example: 'device-001' })
  @ApiOkResponse({ description: 'Cấu hình ngưỡng hiệu lực' })
  @Get('effective')
  async getEffectiveProfile(@Query('deviceId') deviceId?: string) {
    return this.thresholdsService.getEffectiveProfile(deviceId);
  }

  @ApiOperation({ summary: 'Tạo hoặc cập nhật cấu hình ngưỡng' })
  @ApiBody({ type: UpsertThresholdProfileDto })
  @ApiOkResponse({ description: 'Profile đã lưu' })
  @Patch()
  async upsertProfile(@Body() body: UpsertThresholdProfileDto) {
    return this.thresholdsService.upsertProfile(body);
  }

  @ApiOperation({ summary: 'Rollback cấu hình ngưỡng về mặc định' })
  @ApiOkResponse({ description: 'Rollback thành công' })
  @Delete(':scopeType/:scopeId')
  async rollbackProfile(
    @Param('scopeType') scopeType: 'global' | 'device',
    @Param('scopeId') scopeId: string
  ) {
    return this.thresholdsService.rollbackProfile(scopeType, scopeId);
  }
}
