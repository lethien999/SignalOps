import mongoose from 'mongoose';

type AlertRecord = {
  alertId: string;
  deviceId: string;
  type: 'latency' | 'packet_loss' | 'signal';
  severity: 'low' | 'medium' | 'high';
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
    severity: { type: String, required: true, enum: ['low', 'medium', 'high'] },
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
    eventId: { type: String },
  },
  { timestamps: true, strict: 'throw', minimize: false },
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
      { new: true, runValidators: true },
    );
  }

  async resolve(id: string) {
    return AlertModel.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
      },
      { new: true, runValidators: true },
    );
  }
}
