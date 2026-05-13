import axios from 'axios';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { Logger } from './common/logger';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

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

type Device = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type Metrics = {
  latency: number;
  packetLoss: number;
  signalStrength: number;
};

let tracingSdk: NodeSDK | null = null;

function isTracingEnabled(): boolean {
  return String(process.env.TRACING_ENABLED || 'false').toLowerCase() === 'true';
}

function resolveExporter() {
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!endpoint || endpoint.trim().length === 0) {
    return new ConsoleSpanExporter();
  }

  const normalized = endpoint.trim().replace(/\/$/, '');
  const traceUrl = normalized.endsWith('/v1/traces') ? normalized : `${normalized}/v1/traces`;
  return new OTLPTraceExporter({ url: traceUrl });
}

async function initializeTracing() {
  if (!isTracingEnabled() || tracingSdk) {
    return;
  }

  const exporter = resolveExporter();
  tracingSdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME || 'signalops-simulator',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  await tracingSdk.start();
  const exporterName = exporter instanceof ConsoleSpanExporter ? 'console' : 'otlp-http';
  Logger.info(`Tracing initialized for simulator (${exporterName})`);

  const shutdown = async () => {
    if (!tracingSdk) {
      return;
    }
    await tracingSdk.shutdown().catch((error) => Logger.error('Failed to shutdown tracing', error));
    tracingSdk = null;
  };

  process.once('SIGTERM', () => {
    void shutdown();
  });
  process.once('SIGINT', () => {
    void shutdown();
  });
}

function generateMetrics(): Metrics {
  // Generate realistic metrics with occasional anomalies
  const useAnomaly = Math.random() < 0.2; // 20% chance of anomaly

  return {
    latency: useAnomaly
      ? Math.floor(Math.random() * 300 + 200)
      : Math.floor(Math.random() * 150 + 20),
    packetLoss: useAnomaly
      ? Math.floor(Math.random() * 15 + 5)
      : Math.floor(Math.random() * 2 + 0.1),
    signalStrength: useAnomaly
      ? Math.floor(Math.random() * 20 - 110)
      : Math.floor(Math.random() * 20 - 60),
  };
}

async function sendEvent(device: Device, metrics: Metrics) {
  const tracer = trace.getTracer('signalops-simulator');

  try {
    const eventData = {
      deviceId: device.id,
      location: {
        lat: device.lat + (Math.random() - 0.5) * 0.01,
        lng: device.lng + (Math.random() - 0.5) * 0.01,
        name: device.name,
      },
      metrics: {
        latency: metrics.latency,
        packetLoss: metrics.packetLoss,
        signalStrength: metrics.signalStrength,
      },
    };

    return await tracer.startActiveSpan('simulator.send-event', async (span) => {
      span.setAttribute('signalops.device_id', device.id);
      span.setAttribute('signalops.device_name', device.name);
      span.setAttribute('messaging.system', 'http');

      try {
        const response = await axios.post(
          `${process.env.SIMULATOR_API_URL || 'http://localhost:3000'}/api/events`,
          eventData
        );

        span.setAttribute('http.status_code', response.status);
        span.setStatus({ code: SpanStatusCode.OK });

        Logger.info(`Event sent for ${device.name}`, {
          eventId: response.data.id,
          metrics,
        });

        return response;
      } catch (error: unknown) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Failed to send event for ${device.name}`, message);
  }
}

async function simulate() {
  const updateIntervalMs = parseInt(process.env.SIMULATOR_INTERVAL_MS || '5000', 10);

  await initializeTracing();

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
