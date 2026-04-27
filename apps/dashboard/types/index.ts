export type Severity = 'low' | 'medium' | 'high';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type DeviceStatus = 'active' | 'inactive' | 'alert';

export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface Device {
  id: string;
  name: string;
  location: Location;
  status: DeviceStatus;
  lastSeen?: string;
  metrics?: {
    latency?: number;
    packetLoss?: number;
    signalStrength?: number;
  };
}

export interface Alert {
  id: string;
  alertId?: string;
  deviceId: string;
  type: string;
  severity: Severity;
  location?: Location;
  message: string;
  status: AlertStatus;
  createdAt: string;
  updatedAt?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface Event {
  id: string;
  deviceId: string;
  location?: Location;
  metrics?: {
    latency?: number;
    packetLoss?: number;
    signalStrength?: number;
  };
  timestamp: string;
}

export interface SystemStats {
  totalEvents: number;
  activeAlerts: number;
  alertsByCount?: {
    high: number;
    medium: number;
    low: number;
  };
  eventsPerMinute: number;
  activeDevices: number;
  queueDepth?: number;
  workerStats?: {
    processing: number;
    completed: number;
    failed: number;
  };
}

export interface WebSocketMessage<T = unknown> {
  event: string;
  data: T;
  timestamp: string;
}
