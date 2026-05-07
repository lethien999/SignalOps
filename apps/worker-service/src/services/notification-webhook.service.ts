import { Logger } from '../common/logger';
import {
  NotificationSeverity,
  NotificationWebhookRecord,
  NotificationWebhookRepository,
} from '../repositories/notification-webhook.repository';

type AlertPayload = {
  id: string;
  alertId?: string;
  deviceId: string;
  type: string;
  severity: NotificationSeverity;
  message: string;
  location?: { lat: number; lng: number; name?: string };
  timestamp: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class NotificationWebhookService {
  constructor(
    private readonly notificationWebhookRepository: NotificationWebhookRepository,
  ) {}

  async notifyAlertCreated(alert: AlertPayload): Promise<void> {
    const hooks = await this.notificationWebhookRepository.findEnabledBySeverity(alert.severity);

    if (hooks.length === 0) {
      return;
    }

    for (const hook of hooks) {
      await this.sendWithRetry(hook, alert);
    }
  }

  private async sendWithRetry(
    hook: NotificationWebhookRecord,
    alert: AlertPayload,
  ): Promise<void> {
    const maxAttempts = Math.max(hook.retryMax || 3, 1);
    const baseBackoffMs = Math.max(hook.retryBackoffMs || 1000, 100);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const body = this.buildPayload(hook.channel, alert);

        const response = await fetch(hook.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await this.notificationWebhookRepository.markDeliveryResult(String(hook._id), {
          success: true,
          responseCode: response.status,
        });

        Logger.info('Gửi webhook thành công', {
          webhookId: String(hook._id),
          webhookName: hook.name,
          channel: hook.channel,
          alertId: alert.alertId,
        });
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (attempt >= maxAttempts) {
          await this.notificationWebhookRepository.markDeliveryResult(String(hook._id), {
            success: false,
            errorMessage,
          });

          Logger.error('Gửi webhook thất bại sau khi retry', {
            webhookId: String(hook._id),
            webhookName: hook.name,
            channel: hook.channel,
            alertId: alert.alertId,
            attempts: maxAttempts,
            error: errorMessage,
          });
          return;
        }

        const waitMs = baseBackoffMs * attempt;
        Logger.warn('Gửi webhook thất bại, sẽ retry', {
          webhookId: String(hook._id),
          attempt,
          maxAttempts,
          waitMs,
          error: errorMessage,
        });
        await sleep(waitMs);
      }
    }
  }

  private buildPayload(channel: 'slack' | 'telegram', alert: AlertPayload): Record<string, unknown> {
    const summary = `[${alert.severity.toUpperCase()}] ${alert.type} - ${alert.deviceId}`;

    if (channel === 'slack') {
      return {
        text: `${summary}\n${alert.message}`,
        signalops: {
          alertId: alert.alertId,
          deviceId: alert.deviceId,
          severity: alert.severity,
          type: alert.type,
          timestamp: alert.timestamp,
          location: alert.location,
        },
      };
    }

    return {
      text: `${summary}\n${alert.message}`,
      parse_mode: 'Markdown',
      signalops: {
        alertId: alert.alertId,
        deviceId: alert.deviceId,
        severity: alert.severity,
        type: alert.type,
        timestamp: alert.timestamp,
        location: alert.location,
      },
    };
  }
}
