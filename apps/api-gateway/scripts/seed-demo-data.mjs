import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { randomInt } from 'crypto';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../../../.env') });

function isRunningInDocker() {
  return Boolean(process.env.DOCKER_CONTAINER || process.env.container || process.env.KUBERNETES_SERVICE_HOST || process.env.CI);
}

function buildMongoUri() {
  const rawUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

  try {
    const parsed = new URL(rawUri);

    if (!isRunningInDocker() && parsed.hostname === 'mongodb') {
      parsed.hostname = 'localhost';
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return rawUri;
  }
}

const uri = buildMongoUri();
const dbName = process.env.MONGODB_DB || process.env.MONGODB_INITDB_DATABASE || 'signalops-db';
const eventsCount = Number(process.env.SEED_EVENTS_COUNT || 100);
const alertsCount = Number(process.env.SEED_ALERTS_COUNT || 20);

function resolveMongoHostLabel() {
  try {
    const host = new URL(uri).hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'localhost (host)';
    }

    return host;
  } catch {
    return 'unknown';
  }
}

function seedDevices() {
  return Array.from({ length: 10 }, (_, index) => {
    const suffix = String(index + 1).padStart(3, '0');
    return {
      deviceId: `seed-device-${suffix}`,
      name: `Seed Device ${suffix}`,
      lat: 10 + index * 0.25,
      lng: 106 + index * 0.2,
    };
  });
}

function buildEvent(device, index) {
  const now = Date.now();
  const offsetMinutes = index * 6 + randomInt(0, 5);
  const timestamp = new Date(now - offsetMinutes * 60 * 1000);
  const latency = randomInt(25, 350);
  const packetLoss = Number((Math.random() * 12).toFixed(2));
  const signalStrength = randomInt(-115, -45);

  return {
    deviceId: device.deviceId,
    location: {
      lat: Number((device.lat + Math.random() * 0.05).toFixed(5)),
      lng: Number((device.lng + Math.random() * 0.05).toFixed(5)),
      name: device.name,
    },
    metrics: {
      latency,
      packetLoss,
      signalStrength,
    },
    timestamp,
    processedAt: new Date(timestamp.getTime() + randomInt(1, 45) * 1000),
  };
}

function buildAlert(event, index) {
  const severity = event.metrics.latency > 280 || event.metrics.packetLoss > 8 || event.metrics.signalStrength < -100 ? 'high' : event.metrics.latency > 180 || event.metrics.packetLoss > 4 ? 'medium' : 'low';
  const type = event.metrics.latency > 280 ? 'latency' : event.metrics.packetLoss > 8 ? 'packet_loss' : 'signal';
  const state = index % 6 === 0 ? 'resolved' : index % 3 === 0 ? 'acknowledged' : 'open';

  return {
    alertId: `seed-alert-${String(index + 1).padStart(3, '0')}`,
    deviceId: event.deviceId,
    type,
    severity,
    location: event.location,
    message: `[seed] ${event.deviceId} ${type} threshold exceeded`,
    status: state,
    acknowledgedBy: state !== 'open' ? 'seed-runner' : undefined,
    acknowledgedAt: state !== 'open' ? new Date(event.timestamp.getTime() + 60 * 1000) : undefined,
    resolvedAt: state === 'resolved' ? new Date(event.timestamp.getTime() + 5 * 60 * 1000) : undefined,
    resolvedBy: state === 'resolved' ? 'seed-runner' : undefined,
    eventId: undefined,
  };
}

async function main() {
  console.log(`Using MongoDB URI: ${uri} [${resolveMongoHostLabel()}]`);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const deviceSet = seedDevices();

  await db.collection('events').deleteMany({ deviceId: /^seed-device-/ });
  await db.collection('alerts').deleteMany({ alertId: /^seed-alert-/ });

  const events = Array.from({ length: eventsCount }, (_, index) => buildEvent(deviceSet[index % deviceSet.length], index));
  const insertedEvents = await db.collection('events').insertMany(events, { ordered: false });

  const alertEvents = events
    .filter((event) => event.metrics.latency > 180 || event.metrics.packetLoss > 4 || event.metrics.signalStrength < -90)
    .slice(0, alertsCount);

  const alerts = alertEvents.map((event, index) => buildAlert(event, index));
  if (alerts.length > 0) {
    await db.collection('alerts').insertMany(alerts, { ordered: false });
  }

  console.log(`Seeded ${Object.keys(insertedEvents.insertedIds).length} events and ${alerts.length} alerts`);
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
