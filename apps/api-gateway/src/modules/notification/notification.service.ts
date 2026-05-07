import { Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from '../../common/logger';
import { NotificationWebhookRepository } from './repositories/notification-webhook.repository';
import { CreateNotificationWebhookDto } from './dto/create-notification-webhook.dto';
import { UpdateNotificationWebhookDto } from './dto/update-notification-webhook.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationWebhookRepository: NotificationWebhookRepository,
  ) {}

  async listWebhooks() {
    return this.notificationWebhookRepository.findAll();
  }

  async createWebhook(input: CreateNotificationWebhookDto) {
    const created = await this.notificationWebhookRepository.create(input);

    Logger.info('Tạo cấu hình webhook mới', {
      id: created._id?.toString(),
      name: created.name,
      channel: created.channel,
      enabled: created.enabled,
      severities: created.severities,
    });

    return created;
  }

  async updateWebhook(id: string, input: UpdateNotificationWebhookDto) {
    const updated = await this.notificationWebhookRepository.updateById(id, input);

    if (!updated) {
      throw new NotFoundException(`Không tìm thấy webhook với id ${id}`);
    }

    Logger.info('Cập nhật cấu hình webhook', {
      id,
      name: updated.name,
      channel: updated.channel,
      enabled: updated.enabled,
      severities: updated.severities,
    });

    return updated;
  }
}
