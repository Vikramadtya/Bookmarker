import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const path = httpAdapter.getRequestUrl(ctx.getRequest());

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      // NestJS built-in HTTP exceptions (e.g. NotFoundException, BadRequestException)
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'message' in res) {
        message = (res as any).message;
      } else if (typeof res === 'string') {
        message = res;
      }
    } else if (exception instanceof MongooseError.CastError) {
      // Invalid MongoDB ObjectId (e.g. GET /bookmarks/not-an-id)
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid ID format: "${exception.value}"`;
    } else if (exception instanceof MongooseError.ValidationError) {
      // Mongoose schema validation failures
      status = HttpStatus.BAD_REQUEST;
      message = Object.values(exception.errors).map((e) => e.message);
    } else if (
      exception instanceof MongoServerError &&
      exception.code === 11000
    ) {
      // MongoDB duplicate key (unique constraint violation)
      status = HttpStatus.CONFLICT;
      const field = Object.keys(exception.keyValue ?? {})[0] ?? 'field';
      message = `Duplicate value for "${field}"`;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const responseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
      message:
        Array.isArray(message) && message.length === 1 ? message[0] : message,
    };

    // Extract request metadata sent from the frontend for cross-service tracing
    const requestMetaHeader = ctx.getRequest().headers['x-request-meta'];
    let requestId = 'unknown';
    if (typeof requestMetaHeader === 'string') {
      try {
        const meta = JSON.parse(requestMetaHeader);
        if (meta.requestId) requestId = meta.requestId;
      } catch (e) {}
    }

    // Log server errors (5xx) but not client errors (4xx)
    if (status >= 500) {
      this.logger.error(
        `[${status}] [ReqID: ${requestId}] ${path} — ${exception instanceof Error ? exception.message : exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${status}] [ReqID: ${requestId}] ${path} — ${responseBody.message}`,
      );
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }
}
