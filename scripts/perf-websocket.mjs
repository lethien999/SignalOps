import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { io } from 'socket.io-client';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const baseUrl = process.env.SIGNALOPS_API_BASE_URL || 'http://localhost:3000';
const apiKey = process.env.SIGNALOPS_API_KEY || process.env.API_KEY;
const clientCount = Math.max(Number.parseInt(process.env.PERF_TEST_CLIENTS || '100', 10), 1);
const timeoutMs = Math.max(Number.parseInt(process.env.PERF_TEST_TIMEOUT_MS || '20000', 10), 1000);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function connectClient(index) {
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/alerts`, {
      reconnection: false,
      timeout: timeoutMs,
    });

    const connectTimeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`Client ${index} connection timeout`));
    }, timeoutMs);

    socket.on('connect', () => {
      clearTimeout(connectTimeout);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(connectTimeout);
      socket.disconnect();
      reject(new Error(`Client ${index} connection error: ${error.message}`));
    });
  });
}

async function createAlertTrigger() {
  const response = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({
      deviceId: `perf-ws-${Date.now()}`,
      location: { lat: 10.77, lng: 106.7, name: 'Perf' },
      metrics: {
        latency: 250,
        packetLoss: 8,
        signalStrength: -96,
      },
    }),
  });

  assert(response.status === 202, `POST /api/events expected 202, got ${response.status}`);
}

async function main() {
  const sockets = [];
  const receivedByClient = new Map();

  try {
    for (let index = 0; index < clientCount; index += 1) {
      const socket = await connectClient(index);
      sockets.push(socket);
      receivedByClient.set(index, false);
    }

    const waitForEvent = new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        reject(new Error(`Timed out waiting for alert:new across ${clientCount} clients`));
      }, timeoutMs);

      sockets.forEach((socket, index) => {
        socket.on('alert:new', (payload) => {
          if (!payload) {
            return;
          }

          if (!receivedByClient.get(index)) {
            receivedByClient.set(index, true);
          }

          const allReceived = [...receivedByClient.values()].every(Boolean);
          if (allReceived) {
            clearTimeout(deadline);
            resolve(true);
          }
        });
      });
    });

    await createAlertTrigger();
    await waitForEvent;

    const delivered = [...receivedByClient.values()].filter(Boolean).length;
    console.log(
      JSON.stringify({
        event: 'perf:websocket:summary',
        baseUrl,
        clientCount,
        delivered,
        deliveryRate: delivered / clientCount,
      }),
    );
  } finally {
    for (const socket of sockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  }
}

main().catch((error) => {
  console.error(`PERF_WEBSOCKET_FAILED ${error.message}`);
  process.exit(1);
});