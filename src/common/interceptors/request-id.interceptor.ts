import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

/**
 * Attaches a correlation id to every request so downstream logs can be tied
 * back to a single inbound call. Honors an inbound `x-request-id` header
 * if present; otherwise generates a UUID. Echoes the value back on the
 * response so clients can include it in bug reports.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();

    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    return next.handle();
  }
}
