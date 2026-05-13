import mongoose from 'mongoose';

type AlertRecord = {
  alertId: string;
  deviceId: string;
  type: 'latency' | 'packet_loss' | 'signal';
  severity: 'low' | 'warning' | 'medium' | 'high' | 'critical';
  location: {
    lat: number;
    lng: number;
    name?: string;
  };
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
  eventId: string;
  aiModelVersion?: string;
  anomalyScore?: number;
  anomalyConfidence?: number;
  anomalyLabel?: 'normal' | 'suspicious' | 'anomalous';
  anomalyReasons?: string[];
};

type AlertUpdateRecord = Partial<{
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy: string;
  acknowledgedAt: Date;
  resolvedAt: Date;
}>;

const alertSchema = new mongoose.Schema(
  {
    alertId: { type: String, required: true, unique: true, trim: true },
    deviceId: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['latency', 'packet_loss', 'signal'] },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'warning', 'medium', 'high', 'critical'],
    },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      name: { type: String, trim: true },
    },
    message: { type: String, required: true, trim: true },
    status: { type: String, default: 'open', enum: ['open', 'acknowledged', 'resolved'] },
    acknowledgedBy: String,
    acknowledgedAt: Date,
    resolvedAt: Date,
    resolvedBy: String,
    resolutionNote: String,
    eventId: { type: String },
    aiModelVersion: { type: String },
    anomalyScore: { type: Number, min: 0, max: 100 },
    anomalyConfidence: { type: Number, min: 0, max: 100 },
    anomalyLabel: { type: String, enum: ['normal', 'suspicious', 'anomalous'] },
    anomalyReasons: { type: [String], default: [] },
  },
  { timestamps: true, strict: 'throw', minimize: false }
);

export const AlertModel = mongoose.model('Alert', alertSchema);

export class AlertRepository {
  async create(alertData: AlertRecord) {
    const alert = new AlertModel(alertData);
    return alert.save();
  }

  async findOpenDuplicate(deviceId: string, type: string) {
    return AlertModel.findOne({ deviceId, type, status: 'open' });
  }

  async findById(id: string) {
    return AlertModel.findById(id);
  }

  async update(id: string, updateData: AlertUpdateRecord) {
    return AlertModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  async acknowledge(id: string, acknowledgedBy?: string) {
    return AlertModel.findByIdAndUpdate(
      id,
      {
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
      { new: true, runValidators: true }
    );
  }

  async resolve(id: string) {
    return AlertModel.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
      },
      { new: true, runValidators: true }
    );
  }

  async findOpenAlertsByDevice(deviceId: string, minOpenMinutes: number = 0) {
    const minCreatedAt = new Date(Date.now() - Math.max(minOpenMinutes, 0) * 60 * 1000);
    return AlertModel.find({
      deviceId,
      status: 'open',
      createdAt: { $lte: minCreatedAt },
    });
  }

  async autoResolve(id: string) {
    return AlertModel.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'system-auto',
        resolutionNote: 'Tự động đóng: chỉ số đã trở về bình thường',
      },
      { new: true, runValidators: true }
    );
  }
}
