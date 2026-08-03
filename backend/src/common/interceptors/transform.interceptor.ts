import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta: { timestamp: string };
}

/**
 * Recursively ensures every document with an `_id` also has an `id` field.
 * This makes the id available regardless of whether Mongoose lean() virtuals fire.
 */
function normalizeDocument(item: unknown): unknown {
  if (Array.isArray(item)) {
    return item.map(normalizeDocument);
  }
  if (item && typeof item === 'object') {
    const doc = item as Record<string, unknown>;
    if (doc['_id'] !== undefined && doc['id'] === undefined) {
      doc['id'] = doc['_id'];
    }
    return doc;
  }
  return item;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Already enveloped (e.g. paginated endpoints)
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          return data as ApiResponse<T>;
        }
        return {
          data: normalizeDocument(data) as T,
          meta: { timestamp: new Date().toISOString() },
        };
      }),
    );
  }
}
