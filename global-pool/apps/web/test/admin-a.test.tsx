import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { timeLeft } from '@/components/admin-a/approvals';
import { actionErrorMessage } from '@/components/admin-a/four-eyes';
import { ADMIN_NAV, adminDestinations, resolveAdminNav } from '@/components/admin-a/nav-config';
import {
  initialsOf,
  KycChip,
  NoPermission,
  RiskChip,
  RoleChip,
} from '@/components/admin-a/primitives';
import { USER_TABS } from '@/components/admin-a/user-detail';
import { relativeAgo } from '@/components/admin-a/users-list';
import { ApiRequestError } from '@/lib/api/client';

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('admin navigation (ADM-00)', () => {
  it('has the 10 groups of the brief, in order', () => {
    expect(ADMIN_NAV.map((g) => g.label)).toEqual([
      'Overview',
      'User Management',
      'Finance',
      'Game Management',
      'Global Pool Management',
      'Blockchain Management',
      'Compliance',
      'Affiliate Management',
      'Marketing',
      'System',
    ]);
  });
  it('resolves the most specific group / child for a path', () => {
    expect(resolveAdminNav('/admin').group?.key).toBe('overview');
    expect(resolveAdminNav('/admin/approvals').child?.label).toBe('Approvals');
    expect(
      resolveAdminNav('/admin/users/de000001-0000-4000-8000-000000048213/kyc').group?.key,
    ).toBe('users');
    expect(resolveAdminNav('/admin/audit').child?.label).toBe('Audit logs');
    expect(resolveAdminNav('/admin/permissions').group?.key).toBe('system');
  });
  it('lists command-palette destinations with their permissions', () => {
    const d = adminDestinations();
    expect(d.find((x) => x.href === '/admin/audit')?.anyOf).toEqual(['audit.read']);
    expect(d.every((x) => x.href.startsWith('/admin'))).toBe(true);
  });
  it('user tabs are 9 and permission-gated', () => {
    expect(USER_TABS).toHaveLength(9);
    expect(USER_TABS.find((t) => t.key === 'aml')?.needs).toEqual(['aml.read']);
  });
});

describe('four-eyes helpers (ADM-X1)', () => {
  it('maps a wrong / reused code onto the code field', () => {
    const err = new ApiRequestError(
      401,
      '/admin/approvals/x/approve',
      'Incorrect or expired code',
      'STEP_UP_REQUIRED',
      'req-1',
      undefined,
      {
        reason: 'invalid_code',
        attemptsRemaining: 3,
      },
    );
    expect(actionErrorMessage(err)).toEqual({
      field: 'mfaCode',
      message: "That code didn't work. Wait for the next code in your app · 3 attempts left.",
    });
  });
  it('explains missing permissions in words', () => {
    const err = new ApiRequestError(
      403,
      '/admin/x',
      'Your role does not allow this action',
      'FORBIDDEN',
      undefined,
      undefined,
      {
        missingPermissions: ['users.restrict'],
      },
    );
    expect(actionErrorMessage(err).message).toBe(
      'Your role is missing: Apply / lift restrictions.',
    );
  });
  it('formats time left from an absolute expiry (no fake timers)', () => {
    const now = Date.parse('2026-11-28T18:00:00Z');
    expect(timeLeft('2026-11-28T21:35:00Z', now)).toBe('3 h 35 min');
    expect(timeLeft('2026-11-28T18:20:00Z', now)).toBe('20 min');
    expect(timeLeft(null, now)).toBe('No expiry');
  });
});

describe('admin primitives', () => {
  it('no-permission state names the missing permission and never the data', () => {
    const support = 'support';
    const out = html(<NoPermission permissions={['audit.read']} role={support} />);
    expect(out).toContain('audit.read');
    expect(out).toContain('Support');
    expect(out).toContain('the data is not loaded or shown');
  });
  it('role, KYC and risk chips', () => {
    const superAdmin = 'super_admin';
    expect(html(<RoleChip role={superAdmin} />)).toContain('Super Admin');
    expect(html(<KycChip level="level_2" status="approved" />)).toContain('KYC L2');
    expect(html(<RiskChip level={null} />)).toContain('No open alerts');
    expect(html(<RiskChip level="high" score={72} />)).toContain('72');
  });
  it('initials and relative times', () => {
    expect(initialsOf('S. Iyer')).toBe('SI');
    expect(initialsOf('K. Osei')).toBe('KO');
    expect(relativeAgo(null)).toBe('Never');
  });
});
