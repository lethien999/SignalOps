import axios from 'axios';
import { Logger } from './common/logger';

// Simulate different device locations
const DEVICES = [
  { id: 'device-01', name: 'HCM-Tower-1', lat: 10.7769, lng: 106.7009 },
  { id: 'device-02', name: 'HCM-Tower-2', lat: 10.8141, lng: 106.6537 },
  { id: 'device-03', name: 'Hanoi-Tower-1', lat: 21.0285, lng: 105.8542 },
  { id: 'device-04', name: 'Hanoi-Tower-2', lat: 21.0338, lng: 105.8845 },
  { id: 'device-05', name: 'Da Nang-Tower-1', lat: 16.047, lng: 108.2022 },
  { id: 'device-06', name: 'Da Nang-Tower-2', lat: 16.0544, lng: 108.1924 },
  { id: 'device-07', name: 'Can Tho-Tower-1', lat: 10.0379, lng: 105.7869 },
  { id: 'device-08', name: 'Can Tho-Tower-2', lat: 10.045, lng: 105.7469 },
  { id: 'device-09', name: 'Hai Phong-Tower-1', lat: 20.8245, lng: 106.6848 },
  { id: 'device-10', name: 'Hai Phong-Tower-2', lat: 20.8529, lng: 106.7275 },
];

function generateMetrics(): { latency: number; packetLoss: number; signalStrength: number } {
  // Generate realistic metrics with occasional anomalies
  const useAnomaly = Math.random() < 0.2; // 20% chance of anomaly

  return {
    latency: useAnomaly ? Math.floor(Math.random() * 300 + 200) : Math.floor(Math.random() * 150 + 20),
    packetLoss: useAnomaly ? Math.floor(Math.random() * 15 + 5) : Math.floor(Math.random() * 2 + 0.1),
    signalStrength: useAnomaly
      ? Math.floor(Math.random() * 20 - 110)
      : Math.floor(Math.random() * 20 - 60),
  };
}

async function sendEvent(device: any, metrics: any) {
  try {
    const eventData = {
      deviceId: device.id,
      location: {
        lat: device.lat + (Math.random() - 0.5) * 0.01,
        lng: device.lng + (Math.random() - 0.5) * 0.01,
        name: device.name,
      },
      latency: metrics.latency,
      packetLoss: metrics.packetLoss,
      signalStrength: metrics.signalStrength,
    };

    const response = await axios.post(
      `${process.env.SIMULATOR_API_URL || 'http://localhost:3000'}/api/events`,
      eventData,
    );

    Logger.info(`Event sent for ${device.name}`, {
      eventId: response.data.id,
      metrics,
    });
  } catch (error: any) {
    Logger.error(`Failed to send event for ${device.name}`, error.message);
  }
}

async function simulate() {
  const updateIntervalMs = parseInt(process.env.SIMULATOR_INTERVAL_MS || '5000', 10);

  Logger.info(`Simulator starting with ${DEVICES.length} devices`);
  Logger.info(`Update interval: ${updateIntervalMs}ms`);

  setInterval(async () => {
    for (const device of DEVICES) {
      const metrics = generateMetrics();
      await sendEvent(device, metrics);

      // Small delay between events
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, updateIntervalMs);
}

simulate();
