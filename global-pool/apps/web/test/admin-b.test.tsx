import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RiskBars } from '@/components/admin-b/finance/withdrawals-page';
import { COMPLIANCE_NAV, FINANCE_NAV, POOL_NAV } from '@/components/admin-b/nav';
import {
  errorText,
  humanMinutes,
  ImmutablePanel,
  KpiTile,
  MoneyText,
  RiskMeter,
  usd,
} from '@/components/admin-b/primitives';
import { ADMIN_NAV, resolveAdminNav } from '@/components/admin-a/nav-config';
import { ApiRequestError } from '@/lib/api/client';

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('admin-b navigation', () => {
  it('covers Finance F1–F8, the 10 Global Pool pages and Compliance C1–C2', () => {
    expect(FINANCE_NAV.map((n) => n.href)).toEqual([
      '/admin/finance/deposits',
      '/admin/finance/withdrawals',
      '/admin/finance/fees',
      '/admin/finance/pool-accounting',
      '/admin/finance/ledger',
      '/admin/finance/reconciliation',
      '/admin/finance/refunds',
      '/admin/finance/reports',
    ]);
    expect(POOL_NAV).toHaveLength(10);
    expect(COMPLIANCE_NAV.map((n) => n.label)).toEqual(['KYC queue', 'AML alerts']);
  });

  it('registers its pages in the admin sidebar groups (additively)', () => {
    const finance = ADMIN_NAV.find((g) => g.key === 'finance')!;
    expect(finance.children?.map((c) => c.href)).toEqual(FINANCE_NAV.map((n) => n.href));
    expect(resolveAdminNav('/admin/finance/withdrawals/abc').child?.label).toBe('Withdrawals');
    expect(resolveAdminNav('/admin/pool/vrf').group?.key).toBe('pool');
    expect(resolveAdminNav('/admin/compliance/kyc/123').child?.label).toBe('KYC queue');
  });
});

describe('admin-b formatting (decimal strings, never floats)', () => {
  it('formats USDT from decimal strings', () => {
    expect(usd('186400')).toBe('186,400.00');
    expect(usd('0.05')).toBe('0.05');
    expect(usd(null)).toBe('0.00');
    expect(html(<MoneyText value="-0.08" tone="signed" />)).toContain('text-text-danger');
    expect(html(<MoneyText value="1499.92" />)).toContain('1,499.92');
  });

  it('describes SLA time left / overdue', () => {
    expect(humanMinutes(187)).toBe('3 h 07 min left');
    expect(humanMinutes(-12)).toBe('12 min overdue');
    expect(humanMinutes(null)).toBe('—');
  });

  it('maps API errors to honest states', () => {
    const forbidden = new ApiRequestError(
      403,
      '/admin/finance/ledger',
      'no',
      'FORBIDDEN',
      'req-1',
      undefined,
      undefined,
    );
    expect(errorText(forbidden).title).toBe('Your role can’t open this page');
    expect(
      errorText(
        new ApiRequestError(401, '/x', 'no', 'UNAUTHENTICATED', undefined, undefined, undefined),
      ).title,
    ).toMatch(/session has ended/);
  });
});

describe('admin-b components', () => {
  it('renders the Immutable-by-design list as text, not colour only', () => {
    const out = html(
      <ImmutablePanel
        cannot={['Edit or choose a draw result', 'Pay out from the pool to any address']}
      />,
    );
    expect(out).toContain('Cannot: </span>Edit or choose a draw result');
    expect(out).toContain('Immutable by design');
  });

  it('risk meter and bars carry a text label', () => {
    expect(html(<RiskMeter score={46} level="medium" />)).toContain(
      'Risk score 46 of 100, medium.',
    );
    expect(html(<RiskBars level="high" score={72} />)).toContain('High');
  });

  it('KPI tile shows the DEMO badge when asked', () => {
    expect(html(<KpiTile label="Pool" value="186,400.00" unit="USDT" demo />)).toContain('DEMO');
  });
});
