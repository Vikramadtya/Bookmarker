import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { EventsModule } from './events/events.module';
import { FoldersModule } from './folders/folders.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { HealthModule } from './health/health.module';

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

    // ── Queue (BullMQ / Redis) ───────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        let connectionConfig: any = {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        };

        const password = config.get<string>('REDIS_PASSWORD');
        if (password) {
          connectionConfig.password = password;
          connectionConfig.tls = {};
        }

        if (redisUrl) {
          const parsed = new URL(redisUrl);
          connectionConfig = {
            host: parsed.hostname,
            port:
              parseInt(parsed.port, 10) ||
              (parsed.protocol === 'rediss:' ? 6380 : 6379),
            password: parsed.password || undefined,
          };
          if (parsed.protocol === 'rediss:') {
            connectionConfig.tls = {};
          }
        }

        return { connection: connectionConfig };
      },
    }),

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

    // ── Caching ──────────────────────────────────────────────────────────────
    CacheModule.register({ isGlobal: true }),

    // ── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ── Health Checks ────────────────────────────────────────────────────────
    HealthModule,

    // ── Feature Modules ───────────────────────────────────────────────────────
    EventsModule,
    FoldersModule,
    BookmarksModule,
    AuthModule,
    SettingsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
