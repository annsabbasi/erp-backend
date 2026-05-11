import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDITED_KEY, AuditedConfig } from './audited.decorator';

/**
 * Reads the `@Audited(...)` decorator on a controller method and, on
 * successful resolution, writes an audit event with the resolved refId,
 * actor, IP, UA, and request id.
 *
 * Errors from the audit write are swallowed inside AuditService; this
 * interceptor never breaks the user-facing flow.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const cfg = this.reflector.get<AuditedConfig>(AUDITED_KEY, context.getHandler());
    if (!cfg) return next.handle();

    const req = context.switchToHttp().getRequest<Request & { tenantPrincipal?: any; requestId?: string; user?: any }>();

    return next.handle().pipe(
      tap((result) => {
        const refId = this.resolveRefId(cfg.refIdFrom, req, result);
        const actor = req.tenantPrincipal ?? req.user;
        this.audit.record({
          companyId: actor?.companyId ?? null,
          actorId: actor?.userId ?? actor?.sub ?? null,
          action: cfg.action,
          refType: cfg.refType,
          refId,
          ip: req.ip,
          userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
          requestId: req.requestId,
          module: cfg.module ?? cfg.refType ?? 'system',
          alsoActivityLog: cfg.alsoActivityLog ?? true,
        });
      }),
    );
  }

  private resolveRefId(spec: string | undefined, req: any, result: any): string | undefined {
    const source = spec ?? 'param:id';
    const [bucket, name] = source.split(':');
    if (!name) return undefined;
    if (bucket === 'param') return req.params?.[name];
    if (bucket === 'body') return req.body?.[name];
    if (bucket === 'result') return result?.[name];
    return undefined;
  }
}
