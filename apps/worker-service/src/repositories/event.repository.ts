import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    location: {
      lat: Number,
      lng: Number,
      name: String,
    },
    metrics: {
      latency: Number,
      packetLoss: Number,
      signalStrength: Number,
    },
    timestamp: { type: Date, default: Date.now },
    processedAt: Date,
    alertId: String,
  },
  { timestamps: true },
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
      { new: true },
    );
  }

  async linkAlert(id: string, alertId: string) {
    return EventModel.findByIdAndUpdate(
      id,
      { alertId, processedAt: new Date() },
      { new: true },
    );
  }
}
