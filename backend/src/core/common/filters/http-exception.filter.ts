import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Error as MongooseError, mongo } from 'mongoose';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly expose = process.env.NODE_ENV !== 'production';

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const path = httpAdapter.getRequestUrl(request);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ?? message);
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid ID format: "${exception.value}"`;
    } else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = Object.values(exception.errors).map((e) => e.message);
    } else if (
      exception instanceof mongo.MongoServerError &&
      exception.code === 11000
    ) {
      status = HttpStatus.CONFLICT;
      message = `Duplicate value for "${Object.keys(exception.keyValue ?? {})[0] ?? 'field'}"`;
    } else if (exception instanceof Error && this.expose) {
      // Internal error text is only shown outside production.
      message = exception.message;
    }

    const requestId = request.id ?? 'unknown';
    if (status >= 500) {
      this.logger.error(
        `[${status}] [${requestId}] ${path} - ${exception instanceof Error ? exception.message : exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.debug(`[${status}] [${requestId}] ${path} - ${message}`);
    }

    httpAdapter.reply(
      ctx.getResponse(),
      {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path,
        message:
          Array.isArray(message) && message.length === 1 ? message[0] : message,
      },
      status,
    );
  }
}
