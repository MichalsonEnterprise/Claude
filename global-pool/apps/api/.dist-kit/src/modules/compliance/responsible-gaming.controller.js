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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponsibleGamingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const nestjs_zod_1 = require("nestjs-zod");
const request_1 = require("../../common/request");
const zod_1 = require("../../common/zod");
const audit_service_1 = require("../audit/audit.service");
const guards_1 = require("../auth/guards");
const step_up_service_1 = require("../security/step-up.service");
const responsible_gaming_service_1 = require("./responsible-gaming.service");
class SelfExclusionDto extends (0, zod_1.createZodDto)(schemas_1.selfExclusionSchema) {
}
class CoolingOffDto extends (0, zod_1.createZodDto)(schemas_1.coolingOffSchema) {
}
class RealityCheckDto extends (0, zod_1.createZodDto)(schemas_1.realityCheckSchema) {
}
class RealityCheckAckDto extends (0, zod_1.createZodDto)(schemas_1.realityCheckAckSchema) {
}
class LimitRefDto extends (0, zod_1.createZodDto)(schemas_1.rgLimitRefSchema) {
}
class SessionLimitDto extends (0, zod_1.createZodDto)(schemas_1.rgSessionLimitSchema) {
}
class CancelSettingDto extends (0, zod_1.createZodDto)(schemas_1.rgCancelSettingSchema) {
}
class HistoryQueryDto extends (0, zod_1.createZodDto)(schemas_1.rgHistoryQuerySchema) {
}
/**
 * Responsible gaming (USR-RG1..RG7). Every change is enforced server-side and written to the hash-chained audit log;
 * the same rows feed the player's limit history. Nothing here can ever block a withdrawal.
 */
let ResponsibleGamingController = class ResponsibleGamingController {
    rg;
    audit;
    constructor(rg, audit) {
        this.rg = rg;
        this.audit = audit;
    }
    state(user) {
        return this.rg.state(user.id);
    }
    async setLimit(user, body) {
        const change = await this.rg.changeLimit(user.id, body);
        await this.record(user, 'user.rg.limit_updated', { ...change });
        return this.rg.state(user.id);
    }
    async removeLimit(user, body) {
        const change = await this.rg.removeLimit(user.id, body);
        await this.record(user, 'user.rg.limit_removal_requested', { ...change });
        return this.rg.state(user.id);
    }
    async cancelPending(user, body) {
        const result = await this.rg.cancelPending(user.id, body);
        await this.record(user, 'user.rg.limit_pending_cancelled', { ...result });
        return this.rg.state(user.id);
    }
    async sessionLimit(user, body) {
        const change = await this.rg.setSessionLimit(user.id, body.minutes);
        await this.record(user, 'user.rg.session_limit_updated', { ...change });
        return this.rg.state(user.id);
    }
    async quietHours(user, body) {
        const change = await this.rg.setQuietHours(user.id, body);
        await this.record(user, 'user.rg.quiet_hours_updated', {
            ...change,
            start: body.start,
            end: body.end,
        });
        return this.rg.state(user.id);
    }
    async cancelSetting(user, body) {
        const result = await this.rg.cancelPendingSetting(user.id, body.target);
        await this.record(user, 'user.rg.limit_pending_cancelled', { ...result, type: body.target });
        return this.rg.state(user.id);
    }
    async coolingOff(user, body) {
        const result = await this.rg.selfExclude(user, { ...body });
        await this.record(user, 'user.rg.cooling_off', {
            duration: body.duration,
            endsAt: result.endsAt,
        });
        return result;
    }
    async selfExclude(user, body, stepUpToken) {
        const result = await this.rg.selfExclude(user, body, new Date(), { stepUpToken });
        await this.record(user, result.kind === 'cooling_off' ? 'user.rg.cooling_off' : 'user.rg.self_excluded', { duration: body.duration, endsAt: result.endsAt });
        return result;
    }
    async realityCheck(user, body) {
        const state = await this.rg.setRealityCheck(user.id, body.intervalMinutes, body);
        await this.record(user, 'user.rg.reality_check_settings', { ...body });
        return state;
    }
    async ack(user, body) {
        const result = await this.rg.acknowledgeRealityCheck(user.id, body?.action ?? 'continue');
        await this.record(user, 'user.rg.reality_check', { ...result });
        return result;
    }
    session(user) {
        return this.rg.session(user.id);
    }
    heartbeat(user) {
        return this.rg.heartbeat(user.id);
    }
    history(user, query) {
        return this.rg.history(user.id, query.kind, query.limit);
    }
    record(user, action, metadata) {
        return this.audit.record({
            actorType: 'user',
            actorId: user.id,
            action,
            targetType: 'user',
            targetId: user.id,
            metadata,
        });
    }
};
exports.ResponsibleGamingController = ResponsibleGamingController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Limits (effective + pending increases/removals + usage), break / self-exclusion, reality check, time settings, session',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ResponsibleGamingController.prototype, "state", null);
__decorate([
    (0, common_1.Put)('limits'),
    (0, zod_1.ZodBody)(schemas_1.rgLimitUpdateSchema),
    (0, swagger_1.ApiOperation)({
        summary: 'Set a limit — new or lower limits apply now, increases after a 24 h cool-down',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new nestjs_zod_1.ZodValidationPipe(schemas_1.rgLimitUpdateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "setLimit", null);
__decorate([
    (0, common_1.Post)('limits/remove'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a limit — takes effect after the 24 h cool-down (cancellable)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, LimitRefDto]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "removeLimit", null);
__decorate([
    (0, common_1.Post)('limits/cancel-pending'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a pending limit increase or removal — the current limit stays' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, LimitRefDto]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "cancelPending", null);
__decorate([
    (0, common_1.Put)('session-limit'),
    (0, swagger_1.ApiOperation)({
        summary: 'Session length limit (minutes, null = remove) — increases/removal wait 24 h',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SessionLimitDto]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "sessionLimit", null);
__decorate([
    (0, common_1.Put)('quiet-hours'),
    (0, zod_1.ZodBody)(schemas_1.rgQuietHoursSchema),
    (0, swagger_1.ApiOperation)({ summary: 'Quiet hours (UTC) — turning on applies now; turning off waits 24 h' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new nestjs_zod_1.ZodValidationPipe(schemas_1.rgQuietHoursSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "quietHours", null);
__decorate([
    (0, common_1.Post)('settings/cancel-pending'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Cancel a pending session-limit increase/removal or quiet-hours switch-off',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CancelSettingDto]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "cancelSetting", null);
__decorate([
    (0, common_1.Post)('cooling-off'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Start a break (24 h / 7 d / 30 d) immediately — cannot be shortened; withdrawals stay open',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CoolingOffDto]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "coolingOff", null);
__decorate([
    (0, common_1.Post)('self-exclusion'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Self-exclude immediately (withdrawals remain available). 6m/1y/5y/permanent need phrase SELF-EXCLUDE + acknowledgement (+ TOTP when 2FA is on)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)(step_up_service_1.STEP_UP_HEADER)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SelfExclusionDto, String]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "selfExclude", null);
__decorate([
    (0, common_1.Put)('reality-check'),
    (0, swagger_1.ApiOperation)({ summary: 'Reality-check reminder interval (minutes) + pause / push toggles' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, RealityCheckDto]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "realityCheck", null);
__decorate([
    (0, common_1.Post)('reality-check/ack'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Answer a reality-check reminder (continue / view history / take a break)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, RealityCheckAckDto]),
    __metadata("design:returntype", Promise)
], ResponsibleGamingController.prototype, "ack", null);
__decorate([
    (0, common_1.Get)('session'),
    (0, swagger_1.ApiOperation)({
        summary: 'Current play session: time played, net result, next reality check, play pauses',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ResponsibleGamingController.prototype, "session", null);
__decorate([
    (0, common_1.Post)('session/heartbeat'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Activity heartbeat (every 60 s while signed in and visible) — drives time limits and reality checks',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ResponsibleGamingController.prototype, "heartbeat", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({
        summary: 'Your limit changes and reality-check answers (from the audit log), newest first',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, HistoryQueryDto]),
    __metadata("design:returntype", void 0)
], ResponsibleGamingController.prototype, "history", null);
exports.ResponsibleGamingController = ResponsibleGamingController = __decorate([
    (0, swagger_1.ApiTags)('responsible-gaming'),
    (0, guards_1.PlayerAuth)(),
    (0, common_1.Controller)('responsible-gaming'),
    __metadata("design:paramtypes", [responsible_gaming_service_1.ResponsibleGamingService,
        audit_service_1.AuditService])
], ResponsibleGamingController);
//# sourceMappingURL=responsible-gaming.controller.js.map