import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateNotificationWebhookDto } from './dto/create-notification-webhook.dto';
import { UpdateNotificationWebhookDto } from './dto/update-notification-webhook.dto';

@ApiTags('notifications')
@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Lấy danh sách cấu hình webhook' })
  @ApiOkResponse({ description: 'Danh sách cấu hình webhook' })
  @Get('webhooks')
  async listWebhooks() {
    return this.notificationService.listWebhooks();
  }

  @ApiOperation({ summary: 'Tạo cấu hình webhook mới' })
  @ApiBody({ type: CreateNotificationWebhookDto })
  @ApiOkResponse({ description: 'Webhook đã tạo' })
  @Post('webhooks')
  async createWebhook(@Body() body: CreateNotificationWebhookDto) {
    return this.notificationService.createWebhook(body);
  }

  @ApiOperation({ summary: 'Cập nhật cấu hình webhook' })
  @ApiBody({ type: UpdateNotificationWebhookDto })
  @ApiOkResponse({ description: 'Webhook đã cập nhật' })
  @Patch('webhooks/:id')
  async updateWebhook(
    @Param('id') id: string,
    @Body() body: UpdateNotificationWebhookDto,
  ) {
    return this.notificationService.updateWebhook(id, body);
  }
}
