import {
  Injectable,
  SetMetadata,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { catchError, from, mergeMap, type Observable, throwError } from 'rxjs';

import { AppError } from '../../common/errors';
import { paramOf, requestIdOf } from '../../common/request';
import { AuditService } from './audit.service';

export const AUDIT_ACTION = 'gp:audit-action';

export interface AuditOptions {
  action: string;
  targetType?: string;
  /** Route param holding the target id (default 'id'). */
  targetParam?: string;
}

/** Mark an (admin) route as audited: a hash-chained audit row is written for success AND failure. */
export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_ACTION, options);

interface AuditedRequest extends Request {
  admin?: { id: string; name: string };
  user?: { id: string; handle: string | null };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditOptions | undefined>(
      AUDIT_ACTION,
      context.getHandler(),
    );
    if (!options || context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<AuditedRequest>();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const base = {
      actorType: req.admin
        ? ('admin' as const)
        : req.user
          ? ('user' as const)
          : ('system' as const),
      actorId: req.admin?.id ?? req.user?.id ?? null,
      actorLabel: req.admin?.name ?? req.user?.handle ?? null,
      action: options.action,
      targetType: options.targetType ?? null,
      targetId: paramOf(req, options.targetParam ?? 'id'),
      reason: typeof body.reason === 'string' ? body.reason : null,
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      requestId: requestIdOf(req),
    };
    return next.handle().pipe(
      mergeMap((result: unknown) =>
        from(
          this.audit.record({
            ...base,
            outcome: 'success',
            metadata: { method: req.method, path: req.path, params: req.params, body },
          }),
        ).pipe(mergeMap(() => [result])),
      ),
      catchError((err: unknown) =>
        from(
          this.audit.record({
            ...base,
            outcome: 'failure',
            metadata: {
              method: req.method,
              path: req.path,
              params: req.params,
              body,
              error: err instanceof AppError ? err.code : 'ERROR',
            },
          }),
        ).pipe(mergeMap(() => throwError(() => err))),
      ),
    );
  }
}
