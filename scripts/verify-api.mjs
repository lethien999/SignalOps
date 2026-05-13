import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const baseUrl = process.env.SIGNALOPS_API_BASE_URL || 'http://localhost:3000';
const apiKey = process.env.SIGNALOPS_API_KEY || process.env.API_KEY;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toMs(startNs) {
  return Number(process.hrtime.bigint() - startNs) / 1_000_000;
}

async function requestJson(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      ...(init.headers || {}),
    },
    ...init,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return { response, body };
}

async function main() {
  const createdAt = new Date();
  const startIso = new Date(createdAt.getTime() - 5 * 60 * 1000).toISOString();
  const endIso = new Date(createdAt.getTime() + 5 * 60 * 1000).toISOString();

  const deviceId = `verify-api-${Date.now()}`;
  const eventPayload = {
    deviceId,
    location: { lat: 10.77, lng: 106.7, name: 'HCM' },
    metrics: { latency: 210, packetLoss: 6, signalStrength: -95 },
  };

  const { response: createRes, body: created } = await requestJson('/api/events', {
    method: 'POST',
    body: JSON.stringify(eventPayload),
  });

  assert(createRes.status === 202, `POST /api/events expected 202, got ${createRes.status}`);
  assert(created && created.id, 'POST /api/events missing id');
  assert(created.status === 'queued', 'POST /api/events did not return queued status');

  const { response: healthRes, body: health } = await requestJson('/api/health');
  assert(healthRes.status === 200, `GET /api/health expected 200, got ${healthRes.status}`);
  assert(health?.dependencies?.mongodb === 'up', 'MongoDB health is not up');
  assert(health?.dependencies?.redis === 'up', 'Redis health is not up');

  const { response: statsRes, body: stats } = await requestJson('/api/stats');
  assert(statsRes.status === 200, `GET /api/stats expected 200, got ${statsRes.status}`);
  assert(typeof stats.totalEvents === 'number', 'Stats totalEvents is not numeric');
  assert(typeof stats.activeAlerts === 'number', 'Stats activeAlerts is not numeric');
  assert(typeof stats.eventsPerMinute === 'number', 'Stats eventsPerMinute is not numeric');

  const { response: eventsRes, body: eventsBody } = await requestJson(
    '/api/events?skip=0&limit=10'
  );
  assert(eventsRes.status === 200, `GET /api/events expected 200, got ${eventsRes.status}`);
  assert(Array.isArray(eventsBody.data), 'GET /api/events data is not an array');
  assert(eventsBody.pagination?.limit === 10, 'GET /api/events pagination.limit mismatch');

  const { response: deviceRes, body: byDevice } = await requestJson(
    `/api/events?skip=0&limit=10&deviceId=${encodeURIComponent(deviceId)}`
  );
  assert(
    deviceRes.status === 200,
    `GET /api/events by device expected 200, got ${deviceRes.status}`
  );
  assert(
    byDevice.data.some((e) => e.deviceId === deviceId),
    'GET /api/events deviceId filter failed'
  );

  const { response: rangeRes, body: byRange } = await requestJson(
    `/api/events?skip=0&limit=10&startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`
  );
  assert(rangeRes.status === 200, `GET /api/events by range expected 200, got ${rangeRes.status}`);
  assert(byRange.data.length > 0, 'GET /api/events date-range filter returned empty unexpectedly');

  const { response: eventDetailRes, body: eventDetail } = await requestJson(
    `/api/events/${created.id}`
  );
  assert(
    eventDetailRes.status === 200,
    `GET /api/events/:id expected 200, got ${eventDetailRes.status}`
  );
  assert(eventDetail?._id === created.id, 'GET /api/events/:id returned wrong event');

  const { response: alertsRes, body: alertsBody } = await requestJson(
    '/api/alerts?status=open&skip=0&limit=20'
  );
  assert(alertsRes.status === 200, `GET /api/alerts expected 200, got ${alertsRes.status}`);
  assert(Array.isArray(alertsBody.data), 'GET /api/alerts data is not an array');

  const firstOpenAlert = alertsBody.data[0];
  if (firstOpenAlert?._id) {
    const { response: ackRes, body: ackBody } = await requestJson(
      `/api/alerts/${firstOpenAlert._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'acknowledged', acknowledgedBy: 'verify-api-script' }),
      }
    );
    assert(ackRes.status === 200, `PATCH acknowledged expected 200, got ${ackRes.status}`);
    assert(ackBody.status === 'acknowledged', 'PATCH did not set acknowledged status');

    const { response: resolveRes, body: resolveBody } = await requestJson(
      `/api/alerts/${firstOpenAlert._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      }
    );
    assert(resolveRes.status === 200, `PATCH resolved expected 200, got ${resolveRes.status}`);
    assert(resolveBody.status === 'resolved', 'PATCH did not set resolved status');

    const { response: alertDetailRes } = await requestJson(`/api/alerts/${firstOpenAlert._id}`);
    assert(
      alertDetailRes.status === 200,
      `GET /api/alerts/:id expected 200, got ${alertDetailRes.status}`
    );
  }

  const docsRes = await fetch(`${baseUrl}/api/docs`);
  assert(docsRes.status === 200, `GET /api/docs expected 200, got ${docsRes.status}`);

  let eventsTotalMs = 0;
  let alertsTotalMs = 0;
  const rounds = 8;

  for (let i = 0; i < rounds; i += 1) {
    const startEvents = process.hrtime.bigint();
    const eventsProbe = await fetch(`${baseUrl}/api/events?skip=0&limit=20`);
    eventsTotalMs += toMs(startEvents);
    assert(eventsProbe.status === 200, `Perf probe events returned ${eventsProbe.status}`);

    const startAlerts = process.hrtime.bigint();
    const alertsProbe = await fetch(`${baseUrl}/api/alerts?status=open&skip=0&limit=20`);
    alertsTotalMs += toMs(startAlerts);
    assert(alertsProbe.status === 200, `Perf probe alerts returned ${alertsProbe.status}`);
  }

  const avgEventsMs = Number((eventsTotalMs / rounds).toFixed(2));
  const avgAlertsMs = Number((alertsTotalMs / rounds).toFixed(2));

  assert(avgEventsMs < 100, `Average events latency ${avgEventsMs}ms is not under 100ms`);

  console.log(`VERIFY_API_OK eventsAvgMs=${avgEventsMs} alertsAvgMs=${avgAlertsMs}`);
}

main().catch((error) => {
  console.error(`VERIFY_API_FAILED ${error.message}`);
  process.exit(1);
});
