// Optional OpenTelemetry integration — loaded dynamically so builds succeed when packages are absent
let NodeSDK: any = null;
let getNodeAutoInstrumentations: any = null;
let ConsoleSpanExporter: any = null;
let BatchSpanProcessor: any = null;
let Resource: any = null;
let SemanticResourceAttributes: any = null;
let JaegerExporter: any = null;

try {
  // Use require so TypeScript doesn't statically require these packages at compile time
  NodeSDK = require('@opentelemetry/sdk-node').NodeSDK;
  getNodeAutoInstrumentations = require('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations;
  const traceNode = require('@opentelemetry/sdk-trace-node');
  ConsoleSpanExporter = traceNode.ConsoleSpanExporter;
  BatchSpanProcessor = traceNode.BatchSpanProcessor;
  Resource = require('@opentelemetry/resources').Resource;
  SemanticResourceAttributes = require('@opentelemetry/semantic-conventions').SemanticResourceAttributes;
  JaegerExporter = require('@opentelemetry/exporter-jaeger').JaegerExporter;
} catch (err) {
  // OpenTelemetry packages not installed — tracing becomes a no-op
  // We'll export a noop initializer below.
}

/**
 * OpenTelemetry SDK Configuration for SignalOps
 * 
 * Instruments:
 * - HTTP requests (Express middleware)
 * - Database operations (MongoDB)
 * - Message queue operations (BullMQ)
 * - Redis operations
 * - Async context tracking (via CorrelationContextManager)
 * 
 * Exporters:
 * - Jaeger (distributed tracing)
 * - Console (development/debugging)
 */

const serviceName = process.env.SERVICE_NAME || 'signalops-service';

// Build tracing resource defensively so runtime never crashes if OTel APIs differ.
let resource: any = undefined;
if (Resource && SemanticResourceAttributes) {
  try {
    const resourceAttributes = {
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    if (typeof Resource.default === 'function') {
      resource = Resource.default().merge(new Resource(resourceAttributes));
    } else if (typeof Resource === 'function') {
      resource = new Resource(resourceAttributes);
    }
  } catch (err) {
    resource = undefined;
  }
}

// Export traces to Jaeger
let sdk: any = null;

if (NodeSDK && getNodeAutoInstrumentations && JaegerExporter && ConsoleSpanExporter) {
  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });

  // Also export to console for non-prod
  const consoleExporter = new ConsoleSpanExporter();

  const sdkOptions: any = {
    autoDetectResources: true,
    instrumentations: [getNodeAutoInstrumentations()],
    traceExporter: process.env.NODE_ENV === 'production' ? jaegerExporter : consoleExporter,
  };

  if (resource) {
    sdkOptions.resource = resource;
  }

  sdk = new NodeSDK(sdkOptions);
}

export function initializeTracing() {
  if (!sdk) {
    console.warn('[OpenTelemetry] Packages not installed — tracing disabled');
    return;
  }

  sdk.start();
  console.log(`[OpenTelemetry] Tracing initialized for service: ${serviceName}`);

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('[OpenTelemetry] Tracing terminated'))
      .catch((err: unknown) => console.error('[OpenTelemetry] Error shutting down:', err));
  });
}
