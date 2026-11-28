import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Authenticated player attached by PrivyAuthGuard. */
export interface AuthUser {
  id: string;
  privyUserId: string;
  publicId: string;
  handle: string | null;
  email: string | null;
  status: 'active' | 'suspended' | 'closed';
  onboarded: boolean;
  country: string | null;
  /** Our sessions.id for this Privy session. */
  sessionId: string;
  privySessionId: string;
  isDemo: boolean;
}

/** Authenticated admin attached by AdminAuthGuard. */
export interface AuthAdmin {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  sessionFamilyId: string;
}

export interface GpRequest extends Request {
  user?: AuthUser;
  admin?: AuthAdmin;
}

/** pino-http request id (string). */
export function requestIdOf(req: Request): string | null {
  const id: unknown = (req as { id?: unknown }).id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

/** First value of a route param (Express 5 types allow string[]). */
export function paramOf(req: Request, name: string): string | null {
  const v: unknown = (req.params as Record<string, unknown> | undefined)?.[name];
  return typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : null;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<GpRequest>();
  if (!req.user) throw new Error('CurrentUser used on a route without PrivyAuthGuard');
  return req.user;
});

export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthAdmin => {
  const req = ctx.switchToHttp().getRequest<GpRequest>();
  if (!req.admin) throw new Error('CurrentAdmin used on a route without AdminAuthGuard');
  return req.admin;
});

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export const ReqMeta = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestMeta => {
  const req = ctx.switchToHttp().getRequest<GpRequest>();
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
    requestId: requestIdOf(req),
  };
});

/** Short device label from a user agent ("Chrome · macOS"). */
export function deviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device';
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : /curl|node|undici|supertest|axios/i.test(ua)
            ? 'API client'
            : 'Browser';
  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac OS X|Macintosh/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  return os ? `${browser} · ${os}` : browser;
}
