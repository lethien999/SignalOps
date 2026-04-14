import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true },
);

export const AlertModel = mongoose.model('Alert', alertSchema);

export class AlertRepository {
  async create(alertData: any) {
    const alert = new AlertModel(alertData);
    return alert.save();
  }

  async findById(id: string) {
    return AlertModel.findById(id);
  }

  async update(id: string, updateData: any) {
    return AlertModel.findByIdAndUpdate(id, updateData, { new: true });
  }
}
