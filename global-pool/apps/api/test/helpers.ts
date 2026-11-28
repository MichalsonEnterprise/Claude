import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  ADMIN_ROLES,
  ADMIN_ROLE_LABEL,
  PERMISSIONS,
  PERMISSION_POLICY,
  ROLE_PERMISSIONS,
  type AdminRole,
} from '@gp/shared/enums';
import { generate, generateSecret } from 'otplib';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { encryptSecret } from '../src/common/crypto';
import { AppConfig } from '../src/config/app-config';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { hashAdminPassword } from '../src/modules/admin/admin-auth.service';
import { PrivyService } from '../src/modules/auth/privy.service';
import { RoundsService } from '../src/modules/pool/rounds.service';

export interface TestApp {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  prisma: PrismaService;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return {
    app,
    http: () => request(app.getHttpServer()),
    prisma: app.get(PrismaService),
    close: () => app.close(),
  };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
export const uid = () => randomUUID().replace(/-/g, '').slice(0, 10);

/** TOTP code `offsetSteps` periods from now (0 = current, 1 = next) — lets a test use two codes in one window. */
export function totp(secret: string, offsetSteps = 0): Promise<string> {
  return generate({ secret, epoch: Math.floor(Date.now() / 1000) + offsetSteps * 30 });
}

export const CONSENTS = {
  ageConfirmed: true,
  jurisdictionConfirmed: true,
  termsAccepted: true,
  privacyAccepted: true,
  marketingOptIn: false,
};

export interface TestPlayer {
  token: string;
  did: string;
  handle: string;
  userId: string;
}

/** DEV MOCK player (+ onboarding by default). */
export async function newPlayer(
  t: TestApp,
  options: { onboard?: boolean } = {},
): Promise<TestPlayer> {
  const privy = t.app.get(PrivyService);
  const suffix = uid();
  const { token, did } = await privy.issueMockToken({
    did: `did:privy:test-${suffix}`,
    email: `p${suffix}@example.com`,
  });
  const handle = `p_${suffix}`;
  if (options.onboard ?? true) {
    await t
      .http()
      .post('/auth/onboarding')
      .set(bearer(token))
      .send({ handle, country: 'PT', consents: CONSENTS })
      .expect(200);
  } else {
    await t.http().post('/auth/session').set(bearer(token)).expect(200);
  }
  const user = await t.prisma.user.findUniqueOrThrow({ where: { privyUserId: did } });
  return { token, did, handle, userId: user.id };
}

export async function demoDeposit(t: TestApp, p: TestPlayer, amount: string) {
  const res = await t
    .http()
    .post('/dev/deposits/simulate')
    .set(bearer(p.token))
    .send({ network: 'arbitrum', amount, idempotencyKey: `dep-${uid()}` })
    .expect(200);
  return res.body as { reference: string; status: string };
}

/** Enrol + confirm 2FA for a player; returns the secret (confirm consumed the CURRENT step). */
export async function enrol2fa(t: TestApp, p: TestPlayer): Promise<string> {
  const enrol = await t.http().post('/auth/2fa/enroll').set(bearer(p.token)).expect(200);
  const secret = enrol.body.secret as string;
  await t
    .http()
    .post('/auth/2fa/confirm')
    .set(bearer(p.token))
    .send({ code: await totp(secret) })
    .expect(200);
  return secret;
}

export async function openRound(
  t: TestApp,
  options: { minParticipants?: number; minPool?: string } = {},
) {
  const now = Date.now();
  return t.app.get(RoundsService).open({
    opensAt: new Date(now - 60_000),
    closesAt: new Date(now + 3_600_000),
    number: 900_000 + Math.floor(Math.random() * 90_000_000),
    ...options,
  });
}

/** Ensure RBAC rows exist in the test DB (same data as the seed). */
export async function ensureRbac(prisma: PrismaService) {
  await prisma.adminPermission.createMany({
    data: PERMISSIONS.map((key) => ({
      key,
      requiresReason: PERMISSION_POLICY[key].requiresReason,
      requiresMfa: PERMISSION_POLICY[key].requiresMfa,
      fourEyes: PERMISSION_POLICY[key].fourEyes,
    })),
    skipDuplicates: true,
  });
  await prisma.adminRole.createMany({
    data: ADMIN_ROLES.map((key) => ({ key, name: ADMIN_ROLE_LABEL[key] })),
    skipDuplicates: true,
  });
  const roles = await prisma.adminRole.findMany();
  const perms = await prisma.adminPermission.findMany();
  await prisma.adminRolePermission.createMany({
    data: roles.flatMap((r) =>
      ROLE_PERMISSIONS[r.key as AdminRole].map((p) => ({
        roleId: r.id,
        permissionId: perms.find((x) => x.key === p)!.id,
      })),
    ),
    skipDuplicates: true,
  });
}

export interface TestAdmin {
  id: string;
  email: string;
  password: string;
  secret: string;
}

export async function createAdmin(
  t: TestApp,
  role: AdminRole,
  name = `Test ${role}`,
): Promise<TestAdmin> {
  await ensureRbac(t.prisma);
  const secret = generateSecret();
  const email = `admin-${uid()}@globalpool.test`;
  const password = 'Correct-Horse-Battery-42';
  const roleRow = await t.prisma.adminRole.findUniqueOrThrow({ where: { key: role } });
  const admin = await t.prisma.adminUser.create({
    data: {
      email,
      name,
      passwordHash: await hashAdminPassword(password),
      roles: { create: { roleId: roleRow.id } },
      totpSecret: {
        create: {
          secretEnc: encryptSecret(secret, t.app.get(AppConfig).totpKey),
          status: 'active',
          confirmedAt: new Date(),
        },
      },
    },
  });
  return { id: admin.id, email, password, secret };
}

export async function adminLogin(t: TestApp, a: TestAdmin, offsetSteps = 0): Promise<string> {
  const res = await t
    .http()
    .post('/admin/auth/login')
    .send({ email: a.email, password: a.password, totpCode: await totp(a.secret, offsetSteps) })
    .expect(200);
  return res.body.accessToken as string;
}
