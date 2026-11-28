"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_HTTP_STATUS = exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const client_1 = require("@prisma/client");
const schemas_1 = require("@gp/shared/schemas");
Object.defineProperty(exports, "ERROR_HTTP_STATUS", { enumerable: true, get: function () { return schemas_1.ERROR_HTTP_STATUS; } });
const shared_1 = require("@gp/shared");
const nestjs_zod_1 = require("nestjs-zod");
const zod_1 = require("zod");
const errors_1 = require("./errors");
const request_1 = require("./request");
const STATUS_CODE = {
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
let AllExceptionsFilter = class AllExceptionsFilter {
    logger = new common_1.Logger('ExceptionFilter');
    catch(exception, host) {
        if (host.getType() !== 'http') {
            this.logger.error(exception instanceof Error ? exception.stack : String(exception));
            return;
        }
        const ctx = host.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();
        const requestId = (0, request_1.requestIdOf)(req) ?? undefined;
        const envelope = this.toEnvelope(exception, req);
        envelope.error.requestId = requestId;
        if (envelope.error.statusCode >= 500) {
            this.logger.error({ err: exception, requestId, path: req.url }, exception instanceof Error ? exception.message : 'Unhandled error');
        }
        if (!res.headersSent)
            res.status(envelope.error.statusCode).json(envelope);
    }
    toEnvelope(exception, req) {
        if (exception instanceof nestjs_zod_1.ZodValidationException) {
            const zodError = exception.getZodError();
            return (0, schemas_1.makeErrorEnvelope)('VALIDATION_FAILED', 'Request validation failed', {
                issues: zodError instanceof zod_1.ZodError ? (0, schemas_1.zodIssues)(zodError) : [],
            });
        }
        if (exception instanceof zod_1.ZodError) {
            return (0, schemas_1.makeErrorEnvelope)('VALIDATION_FAILED', 'Request validation failed', {
                issues: (0, schemas_1.zodIssues)(exception),
            });
        }
        if (exception instanceof errors_1.AppError) {
            return structuredClone(exception.getResponse());
        }
        if (exception instanceof throttler_1.ThrottlerException) {
            return (0, schemas_1.makeErrorEnvelope)('RATE_LIMITED', 'Too many requests — please slow down');
        }
        if (exception instanceof shared_1.QuoteError || exception instanceof shared_1.MoneyError) {
            return (0, schemas_1.makeErrorEnvelope)('VALIDATION_FAILED', exception.message);
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            if ((0, schemas_1.isErrorEnvelope)(body))
                return structuredClone(body);
            const code = STATUS_CODE[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
            const message = status === 404
                ? `Cannot ${req.method} ${req.path}`
                : typeof body === 'string'
                    ? body
                    : typeof body.message === 'string'
                        ? body.message
                        : exception.message;
            return (0, schemas_1.makeErrorEnvelope)(code, message, { statusCode: status });
        }
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (exception.code === 'P2002') {
                return (0, schemas_1.makeErrorEnvelope)('CONFLICT', 'A record with these values already exists');
            }
            if (exception.code === 'P2025')
                return (0, schemas_1.makeErrorEnvelope)('NOT_FOUND', 'Record not found');
        }
        if (exception instanceof SyntaxError && 'body' in exception) {
            return (0, schemas_1.makeErrorEnvelope)('BAD_REQUEST', 'Malformed JSON body');
        }
        return (0, schemas_1.makeErrorEnvelope)('INTERNAL_ERROR', 'Something went wrong. Please try again.', {
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map