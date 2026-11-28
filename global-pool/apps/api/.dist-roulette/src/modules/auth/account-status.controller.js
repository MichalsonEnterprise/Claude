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
exports.AccountStatusController = void 0;
exports.restrictionRef = restrictionRef;
exports.maskIp = maskIp;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const errors_1 = require("../../common/errors");
const request_1 = require("../../common/request");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const geo_service_1 = require("../compliance/geo.service");
const responsible_gaming_service_1 = require("../compliance/responsible-gaming.service");
const guards_1 = require("./guards");
const player_identity_service_1 = require("./player-identity.service");
/** Player-facing case reference for a restriction row (never exposes the internal admin reason). */
function restrictionRef(type, id) {
    const prefix = type === 'account_suspended' ? 'SUS' : type === 'withdrawals_frozen' ? 'FRZ' : 'REV';
    return `${prefix}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}
/**
 * Account status for route guards and the AUTH-18 restricted pages: onboarding, admin restrictions (type, since,
 * case reference — never the internal reason), self-exclusion and the region check. Read-only; the API still
 * enforces every policy on each gaming / financial route.
 */
let AccountStatusController = class AccountStatusController {
    prisma;
    geo;
    rg;
    audit;
    constructor(prisma, geo, rg, audit) {
        this.prisma = prisma;
        this.geo = geo;
        this.rg = rg;
        this.audit = audit;
    }
    async accountStatus(user, req) {
        const [rows, exclusion, region] = await Promise.all([
            this.prisma.userRestriction.findMany({
                where: { userId: user.id, liftedAt: null },
                orderBy: { appliedAt: 'asc' },
                select: { id: true, type: true, appliedAt: true },
            }),
            this.rg.exclusion(user.id),
            this.geo.checkRequest(req),
        ]);
        const declared = user.country
            ? {
                code: user.country,
                name: this.geo.countryName(user.country),
                permitted: await this.geo.isPermitted(user.country),
            }
            : null;
        const restrictions = rows.map((r) => ({
            type: r.type,
            since: r.appliedAt.toISOString(),
            reference: restrictionRef(r.type, r.id),
        }));
        const types = new Set(rows.map((r) => r.type));
        const regionPermitted = region.permitted && (declared?.permitted ?? true);
        const gate = !user.onboarded
            ? 'onboarding'
            : types.has('account_suspended')
                ? 'suspended'
                : exclusion.active
                    ? 'self_excluded'
                    : !regionPermitted
                        ? 'region'
                        : types.has('gaming_blocked') || types.has('deposits_blocked')
                            ? 'under_review'
                            : 'ok';
        return {
            gate,
            onboarded: user.onboarded,
            status: user.status,
            restrictions,
            paused: {
                gaming: types.has('account_suspended') ||
                    types.has('gaming_blocked') ||
                    exclusion.active ||
                    !regionPermitted,
                deposits: types.has('account_suspended') ||
                    types.has('deposits_blocked') ||
                    exclusion.active ||
                    !regionPermitted,
                // Withdrawals stay available while self-excluded or abroad (no obstruction); only AML freezes pause them.
                withdrawals: types.has('withdrawals_frozen'),
            },
            // `kind` tells a short break (cooling_off) from a self-exclusion; `reopen` is set once a long self-exclusion's
            // period is over but the account has not been reopened yet (nothing reopens automatically).
            selfExclusion: {
                active: exclusion.active,
                kind: exclusion.kind,
                duration: exclusion.duration,
                startsAt: exclusion.startsAt,
                endsAt: exclusion.endsAt,
                reopen: exclusion.reopen ?? null,
            },
            region: {
                current: region.country
                    ? { code: region.country, name: region.countryName, permitted: region.permitted }
                    : null,
                declared,
                permitted: regionPermitted,
            },
            isDemo: user.isDemo,
        };
    }
    async newDeviceAlerts(user) {
        const since = new Date(Date.now() - player_identity_service_1.NEW_DEVICE_ALERT_WINDOW_DAYS * 86_400_000);
        const rows = await this.prisma.session.findMany({
            where: {
                userId: user.id,
                subject: 'user',
                revokedAt: null,
                flagged: true,
                flaggedReason: player_identity_service_1.NEW_DEVICE_REASON,
                createdAt: { gte: since },
                id: { not: user.sessionId },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        return rows.map((s) => ({
            sessionId: s.id,
            device: s.deviceLabel ?? 'Unknown device',
            location: s.location,
            ipMasked: maskIp(s.ip),
            signedInAt: s.createdAt.toISOString(),
            isDemo: s.isDemo,
        }));
    }
    async confirmDevice(user, sessionId) {
        const row = await this.findAlert(user, sessionId);
        await this.prisma.session.update({
            where: { id: row.id },
            data: { flagged: false, flaggedReason: 'new_device_confirmed' },
        });
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            actorLabel: user.handle,
            action: 'user.new_device.confirmed',
            targetType: 'session',
            targetId: row.id,
        });
        return { confirmed: true };
    }
    async secureAccount(user, sessionId) {
        const row = await this.findAlert(user, sessionId);
        const now = new Date();
        const result = await this.prisma.session.updateMany({
            where: { userId: user.id, subject: 'user', revokedAt: null, id: { not: user.sessionId } },
            data: { revokedAt: now, revokedReason: 'secured_by_user' },
        });
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            actorLabel: user.handle,
            action: 'user.new_device.secured',
            targetType: 'session',
            targetId: row.id,
            metadata: { revokedSessions: result.count },
        });
        return { secured: true, revokedSessions: result.count };
    }
    async findAlert(user, sessionId) {
        const row = await this.prisma.session.findFirst({
            where: { id: sessionId, userId: user.id, subject: 'user', revokedAt: null },
        });
        if (!row || row.id === user.sessionId)
            throw (0, errors_1.notFound)('Session');
        return row;
    }
};
exports.AccountStatusController = AccountStatusController;
__decorate([
    (0, common_1.Get)('account-status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Account gate for the web: onboarding, restrictions (no internal reasons), self-exclusion, region — read-only',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AccountStatusController.prototype, "accountStatus", null);
__decorate([
    (0, common_1.Get)('new-device-alerts'),
    (0, swagger_1.ApiOperation)({
        summary: 'AUTH-21: sign-ins from a device we have not seen before, shown on your OTHER signed-in devices',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccountStatusController.prototype, "newDeviceAlerts", null);
__decorate([
    (0, common_1.Post)('new-device-alerts/:sessionId/confirm'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'AUTH-21 “Yes, it was me”: keep that device signed in (audited)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AccountStatusController.prototype, "confirmDevice", null);
__decorate([
    (0, common_1.Post)('new-device-alerts/:sessionId/secure'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'AUTH-21 “No, secure my account”: signs that device and every other session except this one out (audited)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AccountStatusController.prototype, "secureAccount", null);
exports.AccountStatusController = AccountStatusController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, guards_1.PlayerAuth)({ onboarded: false }),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        geo_service_1.GeoService,
        responsible_gaming_service_1.ResponsibleGamingService,
        audit_service_1.AuditService])
], AccountStatusController);
/** 85.48.201.12 → 85.48.•••.12 · IPv6 keeps the first two groups. */
function maskIp(ip) {
    if (!ip)
        return null;
    const v4 = ip.replace(/^::ffff:/, '');
    const parts = v4.split('.');
    if (parts.length === 4)
        return `${parts[0]}.${parts[1]}.•••.${parts[3]}`;
    const groups = ip.split(':').filter(Boolean);
    return groups.length > 2 ? `${groups[0]}:${groups[1]}:•••` : ip;
}
//# sourceMappingURL=account-status.controller.js.map