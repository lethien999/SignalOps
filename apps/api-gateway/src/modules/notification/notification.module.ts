import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationWebhookRepository } from './repositories/notification-webhook.repository';
import {
  NotificationWebhook,
  NotificationWebhookSchema,
} from './schemas/notification-webhook.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationWebhook.name, schema: NotificationWebhookSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationWebhookRepository],
  exports: [NotificationService, NotificationWebhookRepository],
})
export class NotificationModule {}
