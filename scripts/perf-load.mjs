import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const baseUrl = process.env.SIGNALOPS_API_BASE_URL || 'http://localhost:3000';
const apiKey = process.env.SIGNALOPS_API_KEY || process.env.API_KEY;
const durationSeconds = Math.max(Number.parseInt(process.env.PERF_TEST_DURATION_SECONDS || '30', 10), 1);
const concurrency = Math.max(Number.parseInt(process.env.PERF_TEST_CONCURRENCY || '10', 10), 1);
const targetTotalRequests = Math.max(Number.parseInt(process.env.PERF_TEST_TOTAL_REQUESTS || '0', 10), 0);
const maxAvgMs = Number.parseFloat(process.env.PERF_TEST_MAX_AVG_MS || '0');
const maxP95Ms = Number.parseFloat(process.env.PERF_TEST_MAX_P95_MS || '0');
const maxErrorRate = Number.parseFloat(process.env.PERF_TEST_MAX_ERROR_RATE || '0');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function percentile(values, pct) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1);
  return sorted[index];
}

async function postEvent(sequence) {
  const response = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({
      deviceId: `perf-${Date.now()}-${sequence}`,
      location: { lat: 10.77, lng: 106.7, name: 'Perf' },
      metrics: {
        latency: 220 + (sequence % 20),
        packetLoss: 6,
        signalStrength: -95,
      },
    }),
  });

  if (response.status !== 202) {
    const body = await response.text();
    throw new Error(`POST /api/events returned ${response.status}: ${body}`);
  }
}

async function worker(stopAt, stats) {
  while (true) {
    const sequence = stats.nextSequence;

    if (targetTotalRequests > 0 && sequence >= stopAt) {
      return;
    }

    stats.nextSequence += 1;

    if (targetTotalRequests === 0 && Date.now() >= stats.deadline) {
      return;
    }

    const startedAt = performance.now();
    try {
      await postEvent(sequence);
      stats.latencies.push(performance.now() - startedAt);
      stats.success += 1;
    } catch (error) {
      stats.errors += 1;
      stats.errorMessages.push(error instanceof Error ? error.message : String(error));
    }

    if (targetTotalRequests === 0 && Date.now() >= stats.deadline) {
      return;
    }
  }
}

async function main() {
  const stats = {
    success: 0,
    errors: 0,
    latencies: [],
    errorMessages: [],
    deadline: Date.now() + durationSeconds * 1000,
    nextSequence: 0,
  };

  const stopAt = targetTotalRequests > 0 ? targetTotalRequests : Number.MAX_SAFE_INTEGER;
  const start = Date.now();
  const workers = [];

  for (let index = 0; index < concurrency; index += 1) {
    workers.push(worker(stopAt, stats));
  }

  await Promise.all(workers);

  const elapsedSeconds = Math.max((Date.now() - start) / 1000, 0.001);
  const total = stats.success + stats.errors;
  const avg = stats.latencies.length > 0
    ? stats.latencies.reduce((sum, value) => sum + value, 0) / stats.latencies.length
    : 0;
  const p95 = percentile(stats.latencies, 95);
  const throughput = stats.success / elapsedSeconds;
  const errorRate = total > 0 ? stats.errors / total : 0;

  console.log(
    JSON.stringify({
      event: 'perf:load:summary',
      baseUrl,
      concurrency,
      durationSeconds,
      targetTotalRequests,
      success: stats.success,
      errors: stats.errors,
      throughputPerSecond: Number(throughput.toFixed(2)),
      avgMs: Number(avg.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      errorRate: Number(errorRate.toFixed(4)),
    }),
  );

  if (maxAvgMs > 0) {
    assert(avg <= maxAvgMs, `Average latency ${avg.toFixed(2)}ms exceeds ${maxAvgMs}ms`);
  }

  if (maxP95Ms > 0) {
    assert(p95 <= maxP95Ms, `P95 latency ${p95.toFixed(2)}ms exceeds ${maxP95Ms}ms`);
  }

  if (maxErrorRate > 0) {
    assert(errorRate <= maxErrorRate, `Error rate ${(errorRate * 100).toFixed(2)}% exceeds ${(maxErrorRate * 100).toFixed(2)}%`);
  }

  if (stats.errors > 0) {
    const sample = stats.errorMessages.slice(0, 3).join(' | ');
    console.log(`perf:load errors sample=${sample}`);
  }
}

main().catch((error) => {
  console.error(`PERF_LOAD_FAILED ${error.message}`);
  process.exit(1);
});