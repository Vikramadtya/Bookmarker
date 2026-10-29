import './tracing';

import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import compression from '@fastify/compress';
import cookie from '@fastify/cookie';
import etag from '@fastify/etag';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@core/common/filters/http-exception.filter';
import { getFrontendUrl, isProduction } from '@core/config/app.config';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({
    // Behind Render's proxy the client IP comes from X-Forwarded-For; without
    // this every user shares one rate-limit bucket.
    trustProxy: true,
    bodyLimit: 6 * 1024 * 1024, // bookmark import (5 MB of HTML) is the largest body
  });
  // passport-google-oauth20 expects Express-style req/res members.
  fastifyAdapter.getInstance().addHook('onRequest', (request, reply, done) => {
    (reply as any).setHeader = function (key: string, value: any) {
      return this.header(key, value);
    };
    (reply as any).end = function () {
      this.send('');
    };
    (request as any).res = reply;
    done();
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      bufferLogs: true,
    },
  );
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  await app.register(helmet as any);
  await app.register(compression as any, { threshold: 1024 });
  await app.register(etag as any);
  await app.register(cookie as any);

  const config = app.get(ConfigService);
  app.enableCors({
    origin: getFrontendUrl(config),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Folder-Token'],
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (!isProduction(config)) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Bookmarker API')
        .setVersion('1.0')
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }

  const logger = app.get(Logger);
  await app.get('AGENDA').start();
  logger.log('Agenda queue started');

  const port = parseInt(config.get<string>('PORT', '8080'), 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`Listening on port ${port}`);
}
bootstrap();
