let provider: unknown = null;

function isTracingEnabled(): boolean {
  return String(process.env.TRACING_ENABLED || 'false').toLowerCase() === 'true';
}

function resolveServiceName(): string {
  return process.env.OTEL_SERVICE_NAME || 'signalops-dashboard';
}

function resolveTraceEndpoint(): string | null {
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!endpoint || endpoint.trim().length === 0) {
    return null;
  }

  const normalized = endpoint.trim().replace(/\/$/, '');
  return normalized.endsWith('/v1/traces') ? normalized : `${normalized}/v1/traces`;
}

export async function register() {
  if (!isTracingEnabled() || provider) {
    return;
  }

  const [tracerNodeModule, otlpExporterModule, traceBaseModule, resourcesModule, semConvModule] =
    await Promise.all([
      import('@opentelemetry/sdk-trace-node'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/sdk-trace-base'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
    ]);

  const { NodeTracerProvider } = tracerNodeModule;
  const { OTLPTraceExporter } = otlpExporterModule;
  const { BatchSpanProcessor, ConsoleSpanExporter } = traceBaseModule;
  const { resourceFromAttributes } = resourcesModule;
  const { SemanticResourceAttributes } = semConvModule;

  const traceEndpoint = resolveTraceEndpoint();
  const exporter = traceEndpoint
    ? new OTLPTraceExporter({ url: traceEndpoint })
    : new ConsoleSpanExporter();
  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: resolveServiceName(),
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  (provider as { register: () => void }).register();

  const exporterName = exporter instanceof ConsoleSpanExporter ? 'console' : 'otlp-http';
  console.log(`[Tracing] OpenTelemetry initialized for ${resolveServiceName()} (${exporterName})`);

  const shutdown = async () => {
    if (
      !provider ||
      typeof (provider as { shutdown?: () => Promise<void> }).shutdown !== 'function'
    ) {
      return;
    }
    await (provider as { shutdown: () => Promise<void> }).shutdown().catch((error) => {
      console.error('[Tracing] Failed to shutdown OpenTelemetry cleanly', error);
    });
    provider = null;
  };

  if (typeof process !== 'undefined' && typeof process.once === 'function') {
    process.once('SIGTERM', () => {
      void shutdown();
    });
    process.once('SIGINT', () => {
      void shutdown();
    });
  }
}
