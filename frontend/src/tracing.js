import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

const enableObservability =
  import.meta.env.VITE_ENABLE_OBSERVABILITY === "true";
const endpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;

if (enableObservability) {
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: "bookmarker-frontend",
    }),
  });

  if (endpoint) {
    const exporter = new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
    });
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  }

  // Register the provider first
  provider.register({
    contextManager: new ZoneContextManager(),
  });

  // Then register auto-instrumentations
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        "@opentelemetry/instrumentation-fetch": {
          propagateTraceHeaderCorsUrls: [
            new RegExp(`.*localhost.*`),
            new RegExp(`.*bookmarker.*`),
          ],
        },
        "@opentelemetry/instrumentation-xml-http-request": {
          propagateTraceHeaderCorsUrls: [
            new RegExp(`.*localhost.*`),
            new RegExp(`.*bookmarker.*`),
          ],
        },
      }),
    ],
  });

  console.log("🚀 Frontend OpenTelemetry tracing initialized");
}
