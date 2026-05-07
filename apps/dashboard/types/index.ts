export type Severity = 'low' | 'warning' | 'medium' | 'high' | 'critical';
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
  maintenanceMode?: boolean;
  maintenanceReason?: string;
  maintenanceUpdatedAt?: string;
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
  resolutionNote?: string;
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

export interface DlqJob {
  id: string;
  name?: string;
  failedReason?: string;
  attemptsMade?: number;
  timestamp?: number;
  processedOn?: number;
  finishedOn?: number;
  data?: Record<string, unknown>;
}

export interface NotificationWebhook {
  _id: string;
  name: string;
  channel: 'slack' | 'telegram';
  webhookUrl: string;
  severities: Severity[];
  enabled: boolean;
  retryMax: number;
  retryBackoffMs: number;
  lastStatus: 'never' | 'success' | 'failed';
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastResponseCode?: number;
  lastError?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThresholdProfile {
  _id: string;
  scopeType: 'global' | 'device';
  scopeId: string;
  latencyWarningMs: number;
  latencyCriticalMs: number;
  packetLossWarningPercent: number;
  packetLossCriticalPercent: number;
  signalWarningDbm: number;
  signalCriticalDbm: number;
  enabled: boolean;
  updatedBy?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}
