type WorkerJobPayload = {
  _id: string;
  deviceId: string;
  location: {
    lat: number;
    lng: number;
    name?: string;
  };
  metrics: {
    latency: number;
    packetLoss: number;
    signalStrength: number;
  };
};

type WorkerAlertResult = {
  type: 'latency' | 'packet_loss' | 'signal';
  severity: 'low' | 'medium' | 'high';
  message: string;
};

export function buildAlertDocument(eventData: WorkerJobPayload, alertType: WorkerAlertResult) {
  const alertId = `${eventData.deviceId}-${alertType.type}-${Date.now()}`;
  const safeLocation = {
    lat: eventData.location.lat,
    lng: eventData.location.lng,
    ...(eventData.location.name ? { name: eventData.location.name } : {}),
  };

  return {
    alertId,
    deviceId: eventData.deviceId,
    type: alertType.type,
    severity: alertType.severity,
    location: safeLocation,
    message: alertType.message,
    status: 'open' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    eventId: eventData._id.toString(),
  };
}
