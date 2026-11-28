const NAME = '[USR-R5] Referrals — Payout History / 1440 / Default';
const { f, content } = await DESK(NAME, 12600, 160, { active: 'Affiliates', area: 'Referrals', page: 'Payouts', title: 'Payouts',
  sub: 'Move settled commission to your Available balance. From there you can play or withdraw as usual.',
  actions: async () => [await BTN('Ghost', 'Payout rules', { lead: 'book' })], tabs: RTABS('Payouts') });
const r1 = ROW({ name: 'Payout row', gap: 16, align: 'MIN' }); add(content, [r1, 'FILL']);
const ps = CARD({ name: 'Payout summary', gap: 20, p: 28 }); add(r1, [ps, 'FILL']); ps.layoutSizingVertical = 'FILL';
const top = ROW({ gap: 16, align: 'MAX' }); const tl = COL({ gap: 6 }); const ov = ROW({ gap: 8 }); add(ov, await T('AVAILABLE FOR PAYOUT', 'Overline', 'text/tertiary')); add(ov, await DEMO('S')); add(tl, ov);
const av = ROW({ gap: 8, align: 'MAX' }); const avv = await T('48.60', 'Number/XL', 'balance/available'); avv.name = 'Payout amount value'; add(av, avv); add(av, await T('USDT', 'Body/M', 'text/tertiary')); add(tl, av);
const pn = await T('Pending 3.90 USDT joins after round #1,248 draws (27 Nov 2026, 20:00 UTC).', 'Body/S', 'text/secondary'); pn.name = 'Pending note'; add(tl, pn); add(top, [tl, 'FILL']);
const cta = await BTN('Primary', 'Request payout', { size: 'L', lead: 'arrow-up-right' }); cta.name = 'Request payout CTA'; add(top, cta); add(ps, [top, 'FILL']);
const rq = ROW({ name: 'Requirements', gap: 12, align: 'MIN' }); add(ps, [rq, 'FILL']);
for (const [nm, s] of [['Requirement — minimum', 'Minimum 20.00 USDT — you have 48.60'], ['Requirement — KYC', 'KYC Level 2 — Verified'], ['Requirement — 2FA', '2FA on — confirm with your authenticator']]) { const c = CARD({ name: nm, gap: 0, p: 14, fill: 'surface/raised' }); add(c, [await CHK(s, 'ok', 200, 'Body/S', 'text/primary'), 'FILL']); add(rq, [c, 'FILL_BOTH']); }
add(ps, [await CHK('Paid to your GLOBAL POOL Available balance (@nova.k · GP-48213). No payout fee. Usually reviewed within 24 hours.', 'info', 680), 'FILL']);
const pr = CARD({ name: 'Payout rules', gap: 12, w: 376 }); add(r1, pr); pr.layoutSizingVertical = 'FILL';
add(pr, await T('Payout rules', 'Heading/H5'));
for (const s of ['Minimum 20.00 USDT per request; maximum = your available commission', 'One open request at a time', 'KYC Level 2 and 2FA required', 'Paid in USDT to Available — network fees apply only if you later withdraw on-chain', 'Requests that break the Affiliate Terms are rejected with a reason; your balance stays intact']) add(pr, [await CHK(s, 'info', 300, 'Caption'), 'FILL']);
const hc = CARD({ name: 'Payout history', gap: 0, p: 0, clip: true }); add(content, [hc, 'FILL']);
const hh = ROW({ gap: 8, p: [20, 24, 16, 24] }); add(hh, await T('Payout history', 'Heading/H4')); add(hh, await DEMO('S')); add(hc, [hh, 'FILL']);
const tbl = COL({ name: 'Table', gap: 0 }); add(hc, [tbl, 'FILL']);
await HEADROW(tbl, [['Payout ID', 150], ['Requested', 200], ['Amount', 140, true], ['Paid to', 180], ['Status', 140], ['Completed / reason', 'FILL']]);
const P = [['PO-0412', '2 Nov 2026, 10:14 UTC', '50.00', 'Available balance', 'Confirmed', 'Paid', '2 Nov 2026, 13:40 UTC', 'text/secondary'], ['PO-0388', '5 Oct 2026, 18:02 UTC', '40.00', 'Available balance', 'Confirmed', 'Paid', '6 Oct 2026, 09:15 UTC', 'text/secondary'], ['PO-0351', '12 Sep 2026, 08:30 UTC', '25.00', '—', 'Rejected', 'Rejected', 'KYC Level 2 was still under review. The 25.00 USDT stayed in your affiliate balance — nothing was lost.', 'text/danger']];
for (const [id, d, a, to, bs, bl, done, dc] of P) { const ic = ROW({ gap: 6 }); add(ic, await T(id, 'Mono/S', 'text/primary')); add(ic, await DEMO('XS'));
  await addRow(tbl, [CELL(150, [ic]), CELL(200, [await TX(d, 'Body/S', 'text/secondary')]), CELL(140, [await AMT(a, { c: bl === 'Paid' ? 'text/primary' : 'text/tertiary' })], { right: true }), CELL(180, [await TX(to, 'Body/S', 'text/secondary')]), CELL(140, [await BADGEL(bs, bl)]), CELL('FILL', [await TX(done, 'Body/S', dc, 420)])], { name: 'Row — ' + id }); }
const tt = ROW({ gap: 6 }); add(tt, await T('Paid out in total · 2 payouts', 'Body/S Strong')); add(tt, await DEMO('XS'));
await addRow(tbl, [CELL(350, [tt]), CELL(140, [await AMT('90.00')], { right: true }), CELL('FILL', [])], { name: 'Totals row', fill: 'bg/secondary', last: true });
const hp = ROW({ name: 'Help', gap: 12 }); add(hp, await CHK('Questions about a payout? Contact support and quote the payout ID.', 'info', 520, 'Caption')); add(hp, await BTN('Ghost', 'Contact support', { size: 'S', lead: 'chat' })); add(content, hp);
await FOOT(content, 'Payout IDs and amounts are DEMO. Affiliate payouts are subject to the Affiliate Terms and our AML/KYC policy.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
