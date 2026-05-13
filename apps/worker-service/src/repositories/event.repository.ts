import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, trim: true },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      name: { type: String, trim: true },
    },
    metrics: {
      latency: { type: Number, required: true, min: 0 },
      packetLoss: { type: Number, required: true, min: 0, max: 100 },
      signalStrength: { type: Number, required: true, min: -120, max: 0 },
    },
    timestamp: { type: Date, default: Date.now },
    processedAt: Date,
    alertId: String,
  },
  { timestamps: true, strict: 'throw', minimize: false }
);

export const EventModel = mongoose.model('Event', eventSchema);

export class EventRepository {
  async findById(id: string) {
    return EventModel.findById(id);
  }

  async updateProcessedTime(id: string) {
    return EventModel.findByIdAndUpdate(
      id,
      { processedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  async linkAlert(id: string, alertId: string) {
    return EventModel.findByIdAndUpdate(
      id,
      { alertId, processedAt: new Date() },
      { new: true, runValidators: true }
    );
  }
}
