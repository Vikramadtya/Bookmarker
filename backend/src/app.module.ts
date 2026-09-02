import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AgendaModule } from '@core/common/agenda.module';
import { EventsModule } from '@content/events/events.module';
import { FoldersModule } from '@workspace/folders/folders.module';
import { BookmarksModule } from '@content/bookmarks/bookmarks.module';
import { AuthModule } from '@identity/auth/auth.module';
import { SettingsModule } from '@identity/settings/settings.module';
import { HealthModule } from '@core/health/health.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from '@identity/users/users.module';
import { SharedModule } from '@workspace/shared/shared.module';

@Module({
  imports: [
    // ── Config ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true, // Available to every module without re-importing
      envFilePath: '.env',
      cache: true, // Cache parsed env values for faster access
    }),

    // ── Database ────────────────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/bookmarker',
        ),
      }),
    }),

    // ── Agenda (MongoDB Job Queue) ───────────────────────────────────────────
    AgendaModule,
    // ── Structured Logging (pino) ────────────────────────────────────────────
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const logLevel = config.get<string>(
          'LOG_LEVEL',
          isProd ? 'info' : 'debug',
        );
        const logHttp =
          config.get<string>('LOG_HTTP_REQUESTS', 'false') === 'true';

        return {
          pinoHttp: {
            level: logLevel,
            transport: isProd
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { singleLine: true, colorize: true },
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

    // ── Caching (Redis) ──────────────────────────────────────────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) return {};

        const { createKeyv } = await import('@keyv/redis');
        return {
          stores: [createKeyv(redisUrl)],
        };
      },
    }),
    // ── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ── Health Checks ────────────────────────────────────────────────────────
    HealthModule,

    // ── Cron Jobs ────────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

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
