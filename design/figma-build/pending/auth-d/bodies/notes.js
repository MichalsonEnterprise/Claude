{ const page = figma.root.children.find(p => p.name === '04 — Authentication'); await figma.setCurrentPageAsync(page); const sec = section('AUTH-05/06/18..21 Recovery & restrictions', 36000, 0);
if (!sec.children.find(n => n.name === 'Notes — AUTH-05/06/18..21 decisions & dev notes')) {
  const nf = AL('HORIZONTAL', { name: 'Notes — AUTH-05/06/18..21 decisions & dev notes', gap: 24, p: 32, fill: 'surface/default', stroke: 'border/subtle', r: 20, align: 'MIN' });
  sec.appendChild(nf); nf.x = 120; nf.y = 80;
  const hd = COL('Title', [], { gap: 8, w: 360 }); add(hd, await T('AUTH-05/06/18–21', 'Overline', 'text/brand')); add(hd, await P('Recovery, restrictions & session security', 'Heading/H4', 'text/primary')); add(hd, await P('Columns left → right: AUTH-05 Forgot password · AUTH-06 Reset password · AUTH-18 Restricted account (4 states) · AUTH-19 Account recovery (5 steps) · AUTH-20 Session expired / re-auth · AUTH-21 New-device alert. States stack below their default. Mobile 390 on page 10, section “AUTH — Mobile D”.', 'Body/S', 'text/secondary')); add(nf, hd);
  const N = [
    ['layers', 'Pattern', 'Sign-in-adjacent flows (05, 06, 19, 20, 21) reuse the two-pane dialog over the dimmed lobby from AUTH-01…10. Restricted accounts (18) are full pages in a reduced “restricted-mode” shell: no Deposit, games/promotions shown as paused — or hidden entirely while self-excluded.'],
    ['eye-off', 'Privacy', 'Forgot-password always shows the same confirmation (no account enumeration). The personal anti-phishing code (AURORA-27) only appears after sign-in — public screens show “your code”.'],
    ['clock', 'Timing rules', 'Reset link: single use, 30 min (sent 16:31 → expires 17:01 UTC), max 3 requests / 15 min. Password reset signs out other devices and holds withdrawals 24 h (until 28 Nov 2026, 16:40 UTC). Session timeout: 30 min idle; security changes need re-auth if the last check is older than 15 min.'],
    ['shield-check', 'Recovery', 'Case REC-6620: ID + liveness vs the KYC L2 record, optional free wallet signature (nonce valid 10 min). Mandatory 48 h hold on withdrawals and security changes from approval (27 Nov 17:12 → 29 Nov 2026, 17:12 UTC) — support can’t shorten it. RG tools always stay available.'],
    ['code', 'Dev notes', 'account.restriction = { type: suspended | under_review | self_excluded | geo_restricted, reason_code, case_id, since, until, allowed_actions[] }. UI renders allowed_actions (withdraw where lawful, history, RG, support, close account) and never offers a re-entry shortcut for self_excluded.']
  ];
  for (const [ic, t, b] of N) { const c = COL('Note — ' + t, [], { gap: 8, p: 20, fill: 'surface/raised', stroke: 'border/subtle', r: 14, w: 330 }); add(c, ROW('Head', [await IC(ic, 18, 'icon/brand'), await T(t, 'Label/L', 'text/primary')], { gap: 8 })); add(c, await P(b, 'Body/S', 'text/secondary')); add(nf, c); }
  add(nf, await DEMO('M'));
  OUT.push({ notes: nf.id, size: [Math.round(nf.width), Math.round(nf.height)] });
} }
