import mongoose from 'mongoose';

export type NotificationSeverity = 'low' | 'warning' | 'medium' | 'high' | 'critical';

export type NotificationWebhookRecord = {
  _id: mongoose.Types.ObjectId;
  name: string;
  channel: 'slack' | 'telegram';
  webhookUrl: string;
  severities: NotificationSeverity[];
  enabled: boolean;
  retryMax: number;
  retryBackoffMs: number;
  lastStatus: 'never' | 'success' | 'failed';
  lastAttemptAt?: Date;
  lastSuccessAt?: Date;
  lastResponseCode?: number;
  lastError?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const notificationWebhookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    channel: { type: String, required: true, enum: ['slack', 'telegram'] },
    webhookUrl: { type: String, required: true, trim: true },
    severities: {
      type: [String],
      default: ['high', 'critical'],
      enum: ['low', 'warning', 'medium', 'high', 'critical'],
    },
    enabled: { type: Boolean, default: true },
    retryMax: { type: Number, default: 3, min: 1, max: 10 },
    retryBackoffMs: { type: Number, default: 1000, min: 100, max: 30000 },
    lastStatus: { type: String, default: 'never', enum: ['never', 'success', 'failed'] },
    lastAttemptAt: Date,
    lastSuccessAt: Date,
    lastResponseCode: Number,
    lastError: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true, strict: 'throw', minimize: false }
);

const NotificationWebhookModel = mongoose.model<NotificationWebhookRecord>(
  'NotificationWebhook',
  notificationWebhookSchema
);

export class NotificationWebhookRepository {
  async findEnabledBySeverity(
    severity: NotificationSeverity
  ): Promise<NotificationWebhookRecord[]> {
    return NotificationWebhookModel.find({ enabled: true, severities: severity })
      .lean()
      .exec() as unknown as NotificationWebhookRecord[];
  }

  async markDeliveryResult(
    id: string,
    payload: {
      success: boolean;
      responseCode?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    await NotificationWebhookModel.findByIdAndUpdate(
      id,
      {
        $set: {
          lastStatus: payload.success ? 'success' : 'failed',
          lastAttemptAt: new Date(),
          ...(payload.success ? { lastSuccessAt: new Date(), lastError: undefined } : {}),
          ...(payload.responseCode !== undefined ? { lastResponseCode: payload.responseCode } : {}),
          ...(payload.errorMessage !== undefined ? { lastError: payload.errorMessage } : {}),
        },
      },
      { runValidators: true }
    ).exec();
  }
}
