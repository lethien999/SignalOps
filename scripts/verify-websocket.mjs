import { io } from 'socket.io-client';

const baseUrl = process.env.SIGNALOPS_API_BASE_URL || 'http://localhost:3000';
const timeoutMs = 12000;
const wsAuthToken = process.env.WEBSOCKET_AUTH_TOKEN;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildSocketOptions() {
  return {
    reconnection: false,
    timeout: timeoutMs,
    auth: wsAuthToken ? { token: wsAuthToken } : undefined,
    extraHeaders: wsAuthToken ? { Authorization: `Bearer ${wsAuthToken}` } : undefined,
  };
}

function requestJson(path, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    ...init,
  }).then(async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    return { response, body };
  });
}

function connectSocket(namespace) {
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}${namespace}`, buildSocketOptions());

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`Namespace ${namespace} connection timeout`));
    }, timeoutMs);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log(`✓ Connected to namespace ${namespace}`);
      socket.emit('subscribe', {}, (response) => {
        console.log(`✓ Subscribed to ${namespace}:`, response);
      });
      resolve(socket);
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(error);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(new Error(`Connection error on ${namespace}: ${error.message}`));
    });
  });
}

function waitForEvent(socket, eventName, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeoutMs);

    const handler = (payload) => {
      if (!predicate(payload)) {
        return;
      }

      clearTimeout(timeout);
      socket.off(eventName, handler);
      resolve(payload);
    };

    socket.on(eventName, handler);
  });
}

function disconnectAll(sockets) {
  for (const socket of sockets) {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  }
}

async function main() {
  console.log('Starting WebSocket verification...\n');

  const sockets = [];

  try {
    const alertsSocket = await connectSocket('/alerts');
    const eventsSocketA = await connectSocket('/events');
    const eventsSocketB = await connectSocket('/events');
    const statusSocket = await connectSocket('/status');
    sockets.push(alertsSocket, eventsSocketA, eventsSocketB, statusSocket);

    const deviceId = `verify-websocket-${Date.now()}`;

    const waitAlertNew = waitForEvent(
      alertsSocket,
      'alert:new',
      (payload) => payload?.deviceId === deviceId,
    );
    const waitProcessedA = waitForEvent(
      eventsSocketA,
      'event:processed',
      (payload) => payload?.deviceId === deviceId,
    );
    const waitProcessedB = waitForEvent(
      eventsSocketB,
      'event:processed',
      (payload) => payload?.deviceId === deviceId,
    );
    const waitStatusChanged = waitForEvent(
      eventsSocketA,
      'device:status:changed',
      (payload) => payload?.deviceId === deviceId,
    );

    const { response: createRes } = await requestJson('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        location: { lat: 10.77, lng: 106.7, name: 'HCM' },
        metrics: { latency: 230, packetLoss: 6, signalStrength: -95 },
      }),
    });
    assert(createRes.status === 202, `POST /api/events expected 202, got ${createRes.status}`);

    await waitAlertNew;
    await waitProcessedA;
    await waitProcessedB;
    await waitStatusChanged;
    console.log('✓ Verified alert:new, event:processed and device:status:changed emissions');

    const { response: alertsRes, body: alertsBody } = await requestJson('/api/alerts?status=open&skip=0&limit=50');
    assert(alertsRes.status === 200, `GET /api/alerts expected 200, got ${alertsRes.status}`);

    const targetAlert = (alertsBody?.data || []).find((item) => item.deviceId === deviceId);
    assert(targetAlert?._id, 'Expected open alert for emitted device was not found');

    const waitAck = waitForEvent(
      alertsSocket,
      'alert:acknowledged',
      (payload) => payload?.deviceId === deviceId,
    );
    const waitResolved = waitForEvent(
      alertsSocket,
      'alert:resolved',
      (payload) => payload?.deviceId === deviceId,
    );

    const { response: ackRes } = await requestJson(`/api/alerts/${targetAlert._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'acknowledged', acknowledgedBy: 'verify-websocket-script' }),
    });
    assert(ackRes.status === 200, `PATCH acknowledged expected 200, got ${ackRes.status}`);

    const { response: resolvedRes } = await requestJson(`/api/alerts/${targetAlert._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' }),
    });
    assert(resolvedRes.status === 200, `PATCH resolved expected 200, got ${resolvedRes.status}`);

    await waitAck;
    await waitResolved;
    console.log('✓ Verified alert:acknowledged and alert:resolved emissions');

    await waitForEvent(statusSocket, 'queue:depth');
    await waitForEvent(statusSocket, 'worker:stats');
    console.log('✓ Verified queue:depth and worker:stats periodic emissions');

    console.log('\nVERIFY_WEBSOCKET_OK namespaces and emissions working');
  } catch (error) {
    console.error(`VERIFY_WEBSOCKET_FAILED ${error.message}`);
    process.exit(1);
  } finally {
    disconnectAll(sockets);
  }
}

main();
