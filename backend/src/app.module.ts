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
import {
  getMongoUri,
  isProduction,
  validateEnv,
} from '@core/config/app.config';

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
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
