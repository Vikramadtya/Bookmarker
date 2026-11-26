import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AgendaModule } from '@core/common/agenda.module';
import { EventsModule } from '@content/events/events.module';
import { FoldersModule } from '@workspace/folders/folders.module';
import { BookmarksModule } from '@content/bookmarks/bookmarks.module';
import { AuthModule } from '@identity/auth/auth.module';
import { SettingsModule } from '@identity/settings/settings.module';
import { HealthModule } from '@core/health/health.module';
import { UsersModule } from '@identity/users/users.module';
import { SharedModule } from '@workspace/shared/shared.module';
import { TagsModule } from '@content/tags/tags.module';
import { ViewsModule } from '@workspace/views/views.module';
import { ClaudeModule } from '@content/claude/claude.module';
import { BillingModule } from '@identity/billing/billing.module';
import { PreferencesModule } from '@identity/preferences/preferences.module';
import {
  getMongoUri,
  isProduction,
  validateEnv,
} from '@core/config/app.config';
import { safeLogPath } from '@core/common/log-path';

@Module({
  imports: [
    // ── Config ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      validate: validateEnv,
    }),

    // ── Database ────────────────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: getMongoUri(config) }),
    }),

    // ── Agenda (MongoDB Job Queue) ───────────────────────────────────────────
    AgendaModule,
    // ── Structured Logging (pino) ────────────────────────────────────────────
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = isProduction(config);
        const logLevel = config.get<string>(
          'LOG_LEVEL',
          isProd ? 'info' : 'debug',
        );
        const logHttp =
          config.get<string>('LOG_HTTP_REQUESTS', 'false') === 'true';
        const opentelemetryApi = require('@opentelemetry/api');

        return {
          pinoHttp: {
            level: logLevel,
            // Every log line made during a request carries it. Headers hold the
            // session cookie and tokens, and query strings can hold secrets, so
            // only the id, method and path are kept.
            serializers: {
              req: (req: { id: unknown; method: string; url: string }) => ({
                id: req.id,
                method: req.method,
                url: safeLogPath(req.url),
              }),
              res: (res: { statusCode: number }) => ({
                statusCode: res.statusCode,
              }),
            },
            transport: isProd
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { singleLine: true, colorize: true },
                },
            // Automatically inject trace IDs into structured logs
            mixin() {
              const span = opentelemetryApi.trace.getSpan(
                opentelemetryApi.context.active(),
              );
              if (!span) return {};
              const spanContext = span.spanContext();
              return {
                trace_id: spanContext.traceId,
                span_id: spanContext.spanId,
              };
            },
            customLogLevel: (req, res, err) => {
              if (req.url === '/health' || !logHttp) return 'silent';
              if (res.statusCode >= 500 || err) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
          },
        };
      },
    }),

    // ── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: Number(process.env.THROTTLE_LIMIT) || 100 },
    ]),

    // ── Health Checks ────────────────────────────────────────────────────────
    HealthModule,

    // ── Feature Modules ───────────────────────────────────────────────────────
    EventsModule,
    FoldersModule,
    BookmarksModule,
    AuthModule,
    SettingsModule,
    UsersModule,
    SharedModule,
    TagsModule,
    ViewsModule,
    PreferencesModule,
    BillingModule,
    ClaudeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
