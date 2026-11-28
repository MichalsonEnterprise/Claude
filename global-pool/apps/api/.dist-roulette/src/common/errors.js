"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badRequest = exports.conflict = exports.forbidden = exports.notFound = exports.AppError = void 0;
const common_1 = require("@nestjs/common");
const schemas_1 = require("@gp/shared/schemas");
/**
 * Domain error carrying a stable `ErrorCode` from @gp/shared. The global exception filter turns it into the shared
 * error envelope `{ error: { code, message, statusCode, requestId, details } }`.
 */
class AppError extends common_1.HttpException {
    code;
    details;
    constructor(code, message, details) {
        super((0, schemas_1.makeErrorEnvelope)(code, message, details ? { details } : {}), schemas_1.ERROR_HTTP_STATUS[code]);
        this.code = code;
        this.details = details;
    }
}
exports.AppError = AppError;
const notFound = (what, details) => new AppError('NOT_FOUND', `${what} not found`, details);
exports.notFound = notFound;
const forbidden = (message = 'You do not have access to this resource') => new AppError('FORBIDDEN', message);
exports.forbidden = forbidden;
const conflict = (message, details) => new AppError('CONFLICT', message, details);
exports.conflict = conflict;
const badRequest = (message, details) => new AppError('BAD_REQUEST', message, details);
exports.badRequest = badRequest;
//# sourceMappingURL=errors.js.map