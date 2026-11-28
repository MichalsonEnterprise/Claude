import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import {
  ERROR_HTTP_STATUS,
  isErrorEnvelope,
  makeErrorEnvelope,
  zodIssues,
  type ErrorCode,
  type ErrorEnvelope,
} from '@gp/shared/schemas';
import { MoneyError, QuoteError } from '@gp/shared';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

import { AppError } from './errors';

const STATUS_CODE: Partial<Record<number, ErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_FAILED',
  423: 'STEP_UP_LOCKED',
  429: 'RATE_LIMITED',
  451: 'GEO_RESTRICTED',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Global exception filter: every error leaves the API as the shared error envelope
 * `{ "error": { code, message, statusCode, requestId?, issues?, details? } }` (errorEnvelopeSchema in @gp/shared).
 * Internal errors are logged with the request id and never leak stack traces or SQL to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      return;
    }
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();
    const requestId = typeof req.id === 'string' ? req.id : undefined;

    const envelope = this.toEnvelope(exception, req);
    envelope.error.requestId = requestId;
    if (envelope.error.statusCode >= 500) {
      this.logger.error(
        { err: exception, requestId, path: req.url },
        exception instanceof Error ? exception.message : 'Unhandled error',
      );
    }
    if (!res.headersSent) res.status(envelope.error.statusCode).json(envelope);
  }

  private toEnvelope(exception: unknown, req: Request): ErrorEnvelope {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      return makeErrorEnvelope('VALIDATION_FAILED', 'Request validation failed', {
        issues: zodError instanceof ZodError ? zodIssues(zodError) : [],
      });
    }
    if (exception instanceof ZodError) {
      return makeErrorEnvelope('VALIDATION_FAILED', 'Request validation failed', {
        issues: zodIssues(exception),
      });
    }
    if (exception instanceof AppError) {
      return structuredClone(exception.getResponse() as ErrorEnvelope);
    }
    if (exception instanceof ThrottlerException) {
      return makeErrorEnvelope('RATE_LIMITED', 'Too many requests — please slow down');
    }
    if (exception instanceof QuoteError || exception instanceof MoneyError) {
      return makeErrorEnvelope('VALIDATION_FAILED', exception.message);
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (isErrorEnvelope(body)) return structuredClone(body);
      const code = STATUS_CODE[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
      const message =
        status === 404
          ? `Cannot ${req.method} ${req.path}`
          : typeof body === 'string'
            ? body
            : typeof (body as { message?: unknown }).message === 'string'
              ? (body as { message: string }).message
              : exception.message;
      return makeErrorEnvelope(code, message, { statusCode: status });
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return makeErrorEnvelope('CONFLICT', 'A record with these values already exists');
      }
      if (exception.code === 'P2025') return makeErrorEnvelope('NOT_FOUND', 'Record not found');
    }
    if (exception instanceof SyntaxError && 'body' in exception) {
      return makeErrorEnvelope('BAD_REQUEST', 'Malformed JSON body');
    }
    return makeErrorEnvelope('INTERNAL_ERROR', 'Something went wrong. Please try again.', {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}

export { ERROR_HTTP_STATUS };
