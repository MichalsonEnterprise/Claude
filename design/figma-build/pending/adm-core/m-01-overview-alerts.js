// adm-core m-01 — MOB-11 admin subset on page 10 (section 'ADM — Mobile'): ADM-02 Overview / 390 and Alerts / 390 (Operations).
// Signed in: S. Iyer (Super Admin). Same inline admin top bar + tab bar as the adm-bc mobile frames. IDEMPOTENT.
//#include _m.js
const made = [];
// ---------- 1. Overview ----------
{ const S = await MSHELL('[ADM-02 · MOB-11] Overview / 390 / Default', 'SI'); if (S) { const { f, c } = S;
  await mtitle(c, 'Overview', 'Last 30 days · data as of 27 Nov 2026, 18:45 UTC · updates live');
  const seg = await I('20:6978', { Segments: '3' }); for (const s of seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment'))) { const tx = s.findOne(n => n.type === 'TEXT'); if (tx) s.setProperties({ State: tx.characters.includes('30') ? 'Active' : 'Default' }); } add(c, [seg, 'FILL']);
  // ops alert strip → Alerts tab
  const al = row({ name: 'Alert strip — Ethereum slower', gap: 10, p: [12, 12], fill: 'status/warning-tint', r: 10 }); const at = col({ gap: 2 }); add(at, await T('Ethereum deposits slower', 'Label/M'), await T('avg 9 min to credit · 6 confirming', 'Caption', 'text/secondary')); add(al, await IC('alert-triangle', 18, 'status/warning'), [at, 'FILL'], await IC('chevron-right', 18, 'icon/muted')); add(c, [al, 'FILL']);
  // KPI grid 2 × 4
  const grid = AL('HORIZONTAL', { name: 'KPI grid', wrap: true, gap: 12, cgap: 12, w: 358 });
  for (const [lab, v, u, d, ic, cl] of [['Total deposits', '12,846,500.00', 'USDT', '+8.4%', 'trending-up', 'status/success'], ['Total withdrawals', '10,932,140.00', 'USDT', '+6.9%', 'trending-up', 'status/success'], ['Gross revenue', '811,850.70', 'USDT', '+5.6%', 'trending-up', 'status/success'], ['Platform fees', '60,700.00', 'USDT', '0.0%', 'minus', 'icon/muted'], ['Total users', '184,320', 'accounts', '+3.2%', 'trending-up', 'status/success'], ['Active users', '41,206', 'players', '−2.1%', 'trending-down', 'status/danger'], ['Pool liabilities', '238,710.40', 'USDT', 'Live', 'activity', 'icon/brand'], ['Active rounds', '1', '#1,248 · 20:00 UTC', 'Live', 'activity', 'icon/brand']]) {
    const k = AL('VERTICAL', { name: 'KPI — ' + lab, gap: 4, p: 12, w: 173, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
    add(k, await T(lab, 'Caption', 'text/tertiary'), await T(v, 'Number/S', 'text/primary')); const dr = row({ gap: 4 }); add(dr, await IC(ic, 14, cl), await T(d, 'Label/S', cl === 'status/danger' ? 'text/danger' : cl === 'status/success' ? 'text/success' : 'text/secondary'), await T(u, 'Caption', 'text/tertiary')); add(k, dr); add(grid, k); }
  add(c, grid); const gn = await T('30 d · vs previous 30 d · Platform fees = 1,214,000 entries × 0.05 USDT · Pool liabilities = 186,400.00 open pool + 52,310.40 owed prizes', 'Caption', 'text/tertiary', { w: 358 }); add(c, [gn, 'FILL']);
  // queues
  add(c, [await I('23:15571', { Queue: 'Withdrawals', SLA: 'On track' }), 'FILL'], [await I('23:15571', { Queue: 'KYC', SLA: 'On track' }), 'FILL']);
  // approvals summary
  const ap = await mcard('Four-eyes approvals', { gap: 8 }); const ah = row({ gap: 8 }); add(ah, await IC('user-check', 18, 'icon/muted'), await T('Four-eyes approvals', 'Heading/H5'), await DEMO('S'), [sp(), 'FILL'], await BADGE('Pending')); add(ap, [ah, 'FILL']);
  for (const [id, t, e] of [['AR-1047', 'Pinfall max bet → 500.00 USDT', '20:30 UTC'], ['AR-1045', 'Lift sign-in suspension · @juno88', '21:55 UTC'], ['AR-1049', 'Export KYC file · REG-221', '22:05 UTC'], ['AR-1042', 'Release WD-20931 · 1,500.00 USDT', '22:20 UTC']]) { const r = row({ name: id, gap: 10, p: [8, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); const l = col({ gap: 2 }); add(l, await T(id, 'Mono/S', 'text/tertiary'), await T(t, 'Body/S', 'text/primary', { w: 200 })); add(r, l, [sp(), 'FILL'], await stat('hourglass', 'icon/muted', e, 'text/tertiary', 'Caption')); add(ap, [r, 'FILL']); }
  add(ap, [await BTN('Secondary', 'Open approvals (4)', { size: 'L', trail: 'arrow-right' }), 'FILL']); add(c, [ap, 'FILL']);
  // system health
  const hs = await mcard('System health', { gap: 6 }); const hh = row({ gap: 8 }); add(hh, await IC('server', 18, 'icon/muted'), await T('System health', 'Heading/H5'), await DEMO('S'), [sp(), 'FILL'], await stat('check-circle', 'status/success', '99.97% · 30 d', 'text/success')); add(hs, [hh, 'FILL']);
  for (const [n, m, ic, cl, lab, tc] of [['API gateway', 'p95 42 ms', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Wallet service', 'p95 118 ms', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Chainlink VRF · Arbitrum', 'last fulfilment 37 s ago', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Ethereum deposits', 'avg 9 min to credit', 'alert-triangle', 'status/warning', 'Slower', 'text/warning']]) { const r = row({ name: n, gap: 10, p: [8, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); const l = col({ gap: 2 }); add(l, await T(n, 'Label/M'), await T(m, 'Caption', 'text/tertiary')); add(r, l, [sp(), 'FILL'], await stat(ic, cl, lab, tc)); add(hs, [r, 'FILL']); }
  add(c, [hs, 'FILL']);
  // pool monitor
  const pm = await mcard('Round #1,248 monitor', { gap: 8 }); const ph2 = row({ gap: 8 }); add(ph2, await IC('pool', 18, 'icon/muted'), await T('Round #1,248', 'Heading/H5'), await DEMO('S'), [sp(), 'FILL'], await BADGE('Live')); add(pm, [ph2, 'FILL']);
  add(pm, await T('186,400.00 USDT', 'Number/L', 'text/gold'));
  for (const [k, v] of [['Participants · entries', '3,412 · 18,640'], ['Platform fees (not in pool)', '932.00 USDT'], ['Closes', '20:00 UTC · in 01:15:00']]) { const r = row({ gap: 8, p: [6, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await T(k, 'Body/S', 'text/tertiary'), [sp(), 'FILL'], await T(v, 'Label/M')); add(pm, [r, 'FILL']); }
  const ro = row({ name: 'Read-only note', gap: 8, p: [10, 12], fill: 'surface/raised', r: 10, align: 'MIN' }); add(ro, await IC('lock', 16, 'icon/muted')); await wt(ro, 'Monitoring only. No admin can alter entries, the draw or the payout.', 'Caption', 'text/secondary', 280); add(pm, [ro, 'FILL']);
  add(c, [pm, 'FILL']);
  await MTABS(f, 'Overview'); made.push(f); } }
// ---------- 2. Alerts (Operations) ----------
{ const S = await MSHELL('[MOB-11] Alerts / 390 / Operations', 'SI'); if (S) { const { f, c } = S;
  await mtitle(c, 'Alerts', 'Live operational alerts for Production. Acknowledging is logged; it never changes balances, rounds or results.');
  const seg = await I('20:6978', { Segments: '2' }); const segs = seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment'));
  for (let i = 0; i < segs.length; i++) { const tx = segs[i].findOne(n => n.type === 'TEXT'); if (tx) { await setT(segs[i], tx.name, i === 0 ? 'Compliance · 23' : 'Operations · 5'); } segs[i].setProperties({ State: i === 1 ? 'Active' : 'Default' }); } add(c, [seg, 'FILL']);
  const SEV = { High: ['status/danger-tint', 'alert-circle', 'status/danger', 'text/danger'], Warning: ['status/warning-tint', 'alert-triangle', 'status/warning', 'text/warning'], Info: ['status/info-tint', 'info', 'status/info', 'text/info'] };
  for (const [sev, title, body, since, ack, cta] of [
    ['High', 'Reconciliation mismatch · Treasury BNB', 'On-chain 48,212.60 vs ledger 48,225.00 USDT (−12.40). Investigation INV-0192 is open — no ledger edits, figures are only explained, never overwritten.', 'Since 06:00 UTC snapshot', 'Acknowledged by A. Marin · 06:14 UTC', 'Open investigation'],
    ['Warning', 'Ethereum deposits slower than usual', 'Average 9 min to credit at 12 confirmations. 6 deposits confirming, including DP-77412 (7 / 12). Players see an accurate ETA.', 'Since 18:12 UTC', null, 'Network health'],
    ['Warning', '2 failed withdrawal broadcasts · last hour', 'Both on Polygon, RPC timeouts. Funds are back in the players’ Available balance; no network fee was charged.', '18:31 UTC', null, 'Failed transactions'],
    ['Info', 'Round #1,248 draw at 20:00 UTC', 'Threshold met (3,412 ≥ 500 players). Chainlink VRF on Arbitrum ready. Monitoring only — the draw cannot be changed from here.', 'Scheduled', null, 'Round monitor'],
    ['Info', 'Maintenance AN-88 · 1 Dec 2026, 02:00–02:30 UTC', 'Solana deposits pause for 30 minutes (CFG-0088). Players were notified on 26 Nov; withdrawals on other networks keep running.', 'Planned', 'Acknowledged by S. Iyer · 26 Nov', 'Announcement']]) {
    const t = SEV[sev]; const k = await mcard('Alert — ' + title.slice(0, 32), { gap: 8 });
    const top = row({ gap: 8 }); const chip = row({ name: 'Severity', gap: 4, p: [2, 8], fill: t[0], r: 9999 }); add(chip, await IC(t[1], 14, t[2]), await T(sev, 'Label/S', t[3])); add(top, chip, await T(since, 'Caption', 'text/tertiary'), [sp(), 'FILL'], await DEMO('XS')); add(k, [top, 'FILL']);
    await wt(k, title, 'Label/L', 'text/primary'); await wt(k, body, 'Body/S', 'text/secondary');
    const ft = row({ gap: 8 }); if (ack) add(ft, await stat('check', 'icon/muted', ack, 'text/tertiary', 'Caption'), [sp(), 'FILL']); else add(ft, await BTN('Secondary', 'Acknowledge', { size: 'M' }), [sp(), 'FILL']); add(ft, await BTN('Ghost', cta, { size: 'M', trail: 'chevron-right' })); add(k, [ft, 'FILL']);
    add(c, [k, 'FILL']); }
  await wt(c, 'Alerts never offer result edits, winner selection or balance adjustments. Escalations go to the Platform on-call rota.', 'Caption', 'text/tertiary', 358);
  await MTABS(f, 'Alerts'); made.push(f); } }
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.5 });
return { made: made.map(f => [f.name, f.id, f.x, f.y, f.height]), skipped: OUT.skipped, sec: sec.id, secList: sec.children.map(n => [n.name, n.id, Math.round(n.x), Math.round(n.y)]).slice(0, 40) };
