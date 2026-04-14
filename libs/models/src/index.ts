export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface EventMetrics {
  latency: number; // milliseconds
  packetLoss: number; // percentage
  signalStrength: number; // dBm
}

export interface IEvent {
  _id?: string;
  deviceId: string;
  location: Location;
  metrics: EventMetrics;
  timestamp: Date;
  processedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAlert {
  _id?: string;
  deviceId: string;
  type: 'latency' | 'packet_loss' | 'signal';
  severity: 'low' | 'medium' | 'high';
  location: Location;
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDevice {
  _id?: string;
  deviceId: string;
  name: string;
  location: Location;
  status: 'online' | 'offline';
  lastSeen: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
