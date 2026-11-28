import { HttpException } from '@nestjs/common';
import { ERROR_HTTP_STATUS, makeErrorEnvelope, type ErrorCode } from '@gp/shared/schemas';

/**
 * Domain error carrying a stable `ErrorCode` from @gp/shared. The global exception filter turns it into the shared
 * error envelope `{ error: { code, message, statusCode, requestId, details } }`.
 */
export class AppError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(makeErrorEnvelope(code, message, details ? { details } : {}), ERROR_HTTP_STATUS[code]);
  }
}

export const notFound = (what: string, details?: Record<string, unknown>) =>
  new AppError('NOT_FOUND', `${what} not found`, details);

export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError('FORBIDDEN', message);

export const conflict = (message: string, details?: Record<string, unknown>) =>
  new AppError('CONFLICT', message, details);

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError('BAD_REQUEST', message, details);
