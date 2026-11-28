"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = exports.Audit = exports.AUDIT_ACTION = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const rxjs_1 = require("rxjs");
const errors_1 = require("../../common/errors");
const request_1 = require("../../common/request");
const audit_service_1 = require("./audit.service");
exports.AUDIT_ACTION = 'gp:audit-action';
/** Mark an (admin) route as audited: a hash-chained audit row is written for success AND failure. */
const Audit = (options) => (0, common_1.SetMetadata)(exports.AUDIT_ACTION, options);
exports.Audit = Audit;
let AuditInterceptor = class AuditInterceptor {
    reflector;
    audit;
    constructor(reflector, audit) {
        this.reflector = reflector;
        this.audit = audit;
    }
    intercept(context, next) {
        const options = this.reflector.get(exports.AUDIT_ACTION, context.getHandler());
        if (!options || context.getType() !== 'http')
            return next.handle();
        const req = context.switchToHttp().getRequest();
        const body = (req.body ?? {});
        const base = {
            actorType: req.admin
                ? 'admin'
                : req.user
                    ? 'user'
                    : 'system',
            actorId: req.admin?.id ?? req.user?.id ?? null,
            actorLabel: req.admin?.name ?? req.user?.handle ?? null,
            action: options.action,
            targetType: options.targetType ?? null,
            targetId: (0, request_1.paramOf)(req, options.targetParam ?? 'id'),
            reason: typeof body.reason === 'string' ? body.reason : null,
            ip: req.ip ?? null,
            userAgent: req.get('user-agent') ?? null,
            requestId: (0, request_1.requestIdOf)(req),
        };
        return next.handle().pipe((0, rxjs_1.mergeMap)((result) => (0, rxjs_1.from)(this.audit.record({
            ...base,
            outcome: 'success',
            metadata: { method: req.method, path: req.path, params: req.params, body },
        })).pipe((0, rxjs_1.mergeMap)(() => [result]))), (0, rxjs_1.catchError)((err) => (0, rxjs_1.from)(this.audit.record({
            ...base,
            outcome: 'failure',
            metadata: {
                method: req.method,
                path: req.path,
                params: req.params,
                body,
                error: err instanceof errors_1.AppError ? err.code : 'ERROR',
            },
        })).pipe((0, rxjs_1.mergeMap)(() => (0, rxjs_1.throwError)(() => err)))));
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        audit_service_1.AuditService])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map