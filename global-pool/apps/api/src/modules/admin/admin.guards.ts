import {
  Injectable,
  SetMetadata,
  UseGuards,
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Permission } from '@gp/shared/enums';

import { AppError } from '../../common/errors';
import type { GpRequest } from '../../common/request';
import { AdminAuthService } from './admin-auth.service';

export const ADMIN_PERMISSIONS = 'gp:admin-permissions';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GpRequest>();
    const header = req.get('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) throw new AppError('UNAUTHENTICATED', 'Admin sign-in required');
    req.admin = await this.auth.authenticate(token);
    return true;
  }
}

/** RBAC: every listed permission is required (from admin_roles → admin_permissions). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<Permission[] | undefined>(ADMIN_PERMISSIONS, [context.getHandler(), context.getClass()]) ?? [];
    const admin = context.switchToHttp().getRequest<GpRequest>().admin;
    if (!admin) throw new AppError('UNAUTHENTICATED', 'Admin sign-in required');
    const missing = required.filter((p) => !admin.permissions.includes(p));
    if (missing.length > 0) {
      throw new AppError('FORBIDDEN', 'Your role does not allow this action', { missingPermissions: missing });
    }
    return true;
  }
}

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(ADMIN_PERMISSIONS, permissions);

/** Admin-authenticated controller/route (admin bearer token + RBAC). */
export const AdminAuth = () => applyDecorators(UseGuards(AdminAuthGuard, PermissionsGuard), ApiBearerAuth('admin'));
