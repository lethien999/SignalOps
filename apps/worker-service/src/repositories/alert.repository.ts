import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    alertId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true },
    type: { type: String, required: true, enum: ['latency', 'packet_loss', 'signal'] },
    severity: { type: String, required: true, enum: ['low', 'medium', 'high'] },
    location: {
      lat: Number,
      lng: Number,
      name: String,
    },
    message: { type: String, required: true },
    status: { type: String, default: 'open', enum: ['open', 'acknowledged', 'resolved'] },
    acknowledgedBy: String,
    acknowledgedAt: Date,
    resolvedAt: Date,
    eventId: { type: String },
  },
  { timestamps: true },
);

export const AlertModel = mongoose.model('Alert', alertSchema);

export class AlertRepository {
  async create(alertData: any) {
    const alert = new AlertModel(alertData);
    return alert.save();
  }

  async findOpenDuplicate(deviceId: string, type: string) {
    return AlertModel.findOne({ deviceId, type, status: 'open' });
  }

  async findById(id: string) {
    return AlertModel.findById(id);
  }

  async update(id: string, updateData: any) {
    return AlertModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async acknowledge(id: string, acknowledgedBy?: string) {
    return AlertModel.findByIdAndUpdate(
      id,
      {
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
      { new: true },
    );
  }

  async resolve(id: string) {
    return AlertModel.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
      },
      { new: true },
    );
  }
}
