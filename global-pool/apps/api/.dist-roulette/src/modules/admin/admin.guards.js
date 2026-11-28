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
exports.AdminAuth = exports.RequirePermissions = exports.PermissionsGuard = exports.AdminAuthGuard = exports.ADMIN_PERMISSIONS = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const errors_1 = require("../../common/errors");
const admin_auth_service_1 = require("./admin-auth.service");
exports.ADMIN_PERMISSIONS = 'gp:admin-permissions';
let AdminAuthGuard = class AdminAuthGuard {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const header = req.get('authorization');
        const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
        if (!token)
            throw new errors_1.AppError('UNAUTHENTICATED', 'Admin sign-in required');
        req.admin = await this.auth.authenticate(token);
        return true;
    }
};
exports.AdminAuthGuard = AdminAuthGuard;
exports.AdminAuthGuard = AdminAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [admin_auth_service_1.AdminAuthService])
], AdminAuthGuard);
/** RBAC: every listed permission is required (from admin_roles → admin_permissions). */
let PermissionsGuard = class PermissionsGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const required = this.reflector.getAllAndOverride(exports.ADMIN_PERMISSIONS, [
            context.getHandler(),
            context.getClass(),
        ]) ?? [];
        const admin = context.switchToHttp().getRequest().admin;
        if (!admin)
            throw new errors_1.AppError('UNAUTHENTICATED', 'Admin sign-in required');
        const missing = required.filter((p) => !admin.permissions.includes(p));
        if (missing.length > 0) {
            throw new errors_1.AppError('FORBIDDEN', 'Your role does not allow this action', {
                missingPermissions: missing,
            });
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionsGuard);
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.ADMIN_PERMISSIONS, permissions);
exports.RequirePermissions = RequirePermissions;
/** Admin-authenticated controller/route (admin bearer token + RBAC). */
const AdminAuth = () => (0, common_1.applyDecorators)((0, common_1.UseGuards)(AdminAuthGuard, PermissionsGuard), (0, swagger_1.ApiBearerAuth)('admin'));
exports.AdminAuth = AdminAuth;
//# sourceMappingURL=admin.guards.js.map