import { describe, expect, it } from 'vitest';

import { amlRiskScore, maskIp } from './admin-console.service';
import { approvalRef } from './four-eyes.service';

describe('amlRiskScore (read-only, rule-based)', () => {
  it('is 0 / low for a verified, older account without alerts', () => {
    const r = amlRiskScore({
      openAlerts: [],
      closedAlerts90d: 0,
      kycLevel: 'level_2',
      accountAgeDays: 400,
      activeRestrictions: 0,
    });
    expect(r).toMatchObject({ score: 0, level: 'low', factors: [] });
  });

  it('adds transparent factors and maps the bands (30 / 60 / 85)', () => {
    const r = amlRiskScore({
      openAlerts: [
        { riskLevel: 'high', rule: 'velocity' },
        { riskLevel: 'medium', rule: 'new_destination' },
      ],
      closedAlerts90d: 2,
      kycLevel: 'level_1',
      accountAgeDays: 3,
      activeRestrictions: 1,
    });
    // 30 + 15 + 4 + 5 + 5 + 5
    expect(r.score).toBe(64);
    expect(r.level).toBe('high');
    expect(r.factors.reduce((a, f) => a + f.points, 0)).toBe(64);
  });

  it('caps at 100 → critical', () => {
    const r = amlRiskScore({
      openAlerts: [
        { riskLevel: 'critical', rule: 'sanctions' },
        { riskLevel: 'critical', rule: 'sanctions' },
      ],
      closedAlerts90d: 0,
      kycLevel: 'none',
      accountAgeDays: 0,
      activeRestrictions: 0,
    });
    expect(r).toMatchObject({ score: 100, level: 'critical' });
  });
});

describe('maskIp / approvalRef', () => {
  it('masks the last two IPv4 octets and IPv6 tails', () => {
    expect(maskIp('185.21.44.17')).toBe('185.21.•••.•••');
    expect(maskIp('::ffff:10.0.0.5')).toBe('10.0.•••.•••');
    expect(maskIp('2001:db8:85a3::8a2e:370:7334')).toBe('2001:db8:••••');
    expect(maskIp(null)).toBeNull();
  });
  it('derives a display reference from the approval id', () => {
    expect(approvalRef('1a2b3c4d-0000-4000-8000-000000000000')).toBe('AR-1A2B3C');
  });
});
