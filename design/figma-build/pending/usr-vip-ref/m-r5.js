const NAME = '[USR-R5] Referrals — Payout History / 390 / Default';
const { f, content } = await MOB(NAME, 4200, 160, { title: 'Payouts', sub: 'Commission → Available balance', tabs: MRT('Payouts') });
const ps = CARD({ name: 'Payout summary', gap: 12, p: 16, r: 20 }); add(content, [ps, 'FILL']);
const o = ROW({ gap: 8 }); add(o, await T('AVAILABLE FOR PAYOUT', 'Overline', 'text/tertiary')); add(o, await DEMO('XS')); add(ps, o);
add(ps, await AMT('48.60', { s: 'Number/L', c: 'balance/available' })); add(ps, [await T('Pending 3.90 USDT joins after round #1,248 draws (27 Nov 2026, 20:00 UTC).', 'Caption', 'text/secondary', { w: 326 }), 'FILL']);
for (const s of ['Minimum 20.00 USDT — met', 'KYC Level 2 — Verified', '2FA on — code required']) add(ps, [await CHK(s, 'ok', 300, 'Body/S', 'text/primary'), 'FILL']);
add(ps, [await CHK('Paid to your Available balance. No payout fee. Usually reviewed within 24 h.', 'info', 300, 'Caption'), 'FILL']);
const hh = ROW({ gap: 8 }); add(hh, await T('Payout history', 'Heading/H5')); add(hh, await DEMO('XS')); add(content, hh);
for (const [id, d, a, bs, bl, done] of [['PO-0412', 'Requested 2 Nov 2026, 10:14 UTC', '50.00', 'Confirmed', 'Paid', 'Paid 2 Nov 2026, 13:40 UTC · to Available'], ['PO-0388', 'Requested 5 Oct 2026, 18:02 UTC', '40.00', 'Confirmed', 'Paid', 'Paid 6 Oct 2026, 09:15 UTC · to Available'], ['PO-0351', 'Requested 12 Sep 2026, 08:30 UTC', '25.00', 'Rejected', 'Rejected', 'KYC Level 2 was still under review — the 25.00 USDT stayed in your affiliate balance.']]) {
  const c = CARD({ name: 'Payout — ' + id, gap: 8, p: 14 }); add(content, [c, 'FILL']); const t = ROW({ gap: 8 }); add(t, await T(id, 'Mono/S')); add(t, await DEMO('XS')); add(t, [ROW({}), 'FILL']); add(t, await BADGEL(bs, bl)); add(c, [t, 'FILL']);
  add(c, await AMT(a, { s: 'Number/M', c: bl === 'Paid' ? 'text/primary' : 'text/tertiary' })); add(c, await T(d, 'Caption', 'text/tertiary')); add(c, [await T(done, 'Caption', bl === 'Paid' ? 'text/secondary' : 'text/danger', { w: 326 }), 'FILL']); }
add(content, [await KV('Paid out in total · 2 payouts', '90.00 USDT', { demo: true }), 'FILL']);
await MFOOT(content, 'Payout IDs and amounts are DEMO. Affiliate Terms and AML/KYC policy apply.');
const sticky = ROW({ name: 'Sticky CTA', p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(sticky, 'border/subtle', { t: 1 }); const cta = await BTN('Primary', 'Request payout · 48.60 USDT', { size: 'L' }); cta.name = 'Request payout CTA'; add(sticky, [cta, 'FILL']); add(f, [sticky, 'FILL']);
await MEND(f); FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
