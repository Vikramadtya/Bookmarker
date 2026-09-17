import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as dotenv from 'dotenv';

// Load .env variables manually since this runs before NestJS ConfigModule
dotenv.config();

const enableObservability = process.env.ENABLE_OBSERVABILITY === 'true';

let sdk: NodeSDK | null = null;

if (enableObservability) {
  // If the endpoint is provided, use OTLP; otherwise, fallback to console or disable exports
  const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
        url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
      })
    : new OTLPTraceExporter(); // Defaults if no url passed but user wanted observability

  const metricExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPMetricExporter({
        url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
      })
    : new OTLPMetricExporter();

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'bookmarker-backend',
    }),
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 10000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable fs/net spam if necessary, otherwise leave default
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
    console.log('🚀 OpenTelemetry initialized for backend');
  } catch (error) {
    console.error('Error initializing OpenTelemetry', error);
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk
      ?.shutdown()
      .then(() => console.log('OpenTelemetry shut down'))
      .catch((error) => console.log('Error shutting down OTel', error))
      .finally(() => process.exit(0));
  });
}

export default sdk;
