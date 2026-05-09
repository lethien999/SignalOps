// Tracing disabled by default in dev to avoid optional dependency runtime errors.
// If you need OpenTelemetry, install the appropriate packages and re-enable logic here.
export function initializeTracing() {
  console.warn('[OpenTelemetry] Tracing disabled in this build. To enable, install @opentelemetry/* packages and re-enable tracing.config.');
}
