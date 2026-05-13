import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let tracingSdk: NodeSDK | null = null;

function isTracingEnabled(): boolean {
  return String(process.env.TRACING_ENABLED || 'false').toLowerCase() === 'true';
}

function resolveServiceName(serviceName: string): string {
  return process.env.OTEL_SERVICE_NAME || serviceName;
}

function resolveTraceExporter() {
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!otlpEndpoint || otlpEndpoint.trim().length === 0) {
    return new ConsoleSpanExporter();
  }

  const normalizedEndpoint = otlpEndpoint.trim().replace(/\/$/, '');
  const traceUrl = normalizedEndpoint.endsWith('/v1/traces')
    ? normalizedEndpoint
    : `${normalizedEndpoint}/v1/traces`;

  return new OTLPTraceExporter({ url: traceUrl });
}

export async function initializeTracing(serviceName = 'signalops-service'): Promise<void> {
  if (!isTracingEnabled()) {
    console.log('[Tracing] Disabled (set TRACING_ENABLED=true to enable)');
    return;
  }

  if (tracingSdk) {
    return;
  }

  const resolvedServiceName = resolveServiceName(serviceName);
  const exporter = resolveTraceExporter();

  tracingSdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: resolvedServiceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  await tracingSdk.start();

  const exporterName = exporter instanceof ConsoleSpanExporter ? 'console' : 'otlp-http';
  console.log(`[Tracing] OpenTelemetry initialized for ${resolvedServiceName} (${exporterName})`);
}

export async function shutdownTracing(): Promise<void> {
  if (!tracingSdk) {
    return;
  }

  await tracingSdk.shutdown().catch((error) => {
    console.error('[Tracing] Failed to shutdown OpenTelemetry cleanly', error);
  });

  tracingSdk = null;
}
