const NAME = '[USR-V3] VIP — Rewards / 390 / Default';
const { f, content } = await MOB(NAME, 1140, 160, { title: 'VIP rewards', sub: 'USDT to Available · no wagering', tabs: MVT('Rewards') });
const rc = CARD({ name: 'Ready to claim', gap: 12, p: 16 }); add(content, [rc, 'FILL']);
const rh = ROW({ gap: 8 }); add(rh, await T('READY TO CLAIM', 'Overline', 'text/tertiary')); add(rh, [ROW({}), 'FILL']); add(rh, await AMT('118.62', { s: 'Number/M', demo: true })); add(rc, [rh, 'FILL']);
for (const [nm, icon, ic, bg, ttl, note, v, vc] of [['Weekly reward', 'crown', 'icon/gold', 'accent/gold-tint', 'Weekly reward · Gold', 'Auto-settles Mon 30 Nov, 10:00 UTC', '115.20', 'balance/owed'], ['Rakeback', 'percent', 'icon/brand', 'brand/tint', 'Rakeback · 5% of house edge', 'Never expires', '3.42', 'text/primary']]) {
  const it = CARD({ name: 'Reward — ' + nm, gap: 12, p: 12, fill: 'surface/raised' }); add(rc, [it, 'FILL']);
  const top = ROW({ gap: 12 }); add(top, await TILE(icon, ic, bg, 40)); add(top, [await TWO(ttl, note), 'FILL']); add(top, await AMT(v, { s: 'Number/S', c: vc })); add(it, [top, 'FILL']);
  const b = await BTN('Primary', 'Claim ' + v + ' USDT', { size: 'L' }); b.name = 'Claim button'; add(it, [b, 'FILL']); }
const cu = CARD({ name: 'Coming up', gap: 12, p: 16 }); add(content, [cu, 'FILL']); add(cu, await T('Coming up', 'Heading/H5'));
for (const [ttl, sub, st, lab] of [['Weekly cashback · 10%', 'Mon 30 Nov 2026, 10:00 UTC', 'Pending', 'Scheduled'], ['Level-up · Gold IV · 8.00 USDT', '1,160 pts to go', 'Neutral', 'Locked'], ['Level-up · Platinum I · 25.00 USDT', '7,160 pts to go', 'Neutral', 'Locked']]) { const r = ROW({ gap: 8 }); add(r, [await TWO(ttl, sub), 'FILL']); add(r, await BADGEL(st, lab)); add(cu, [r, 'FILL']); }
const hc = CARD({ name: 'Reward history', gap: 10, p: 16 }); add(content, [hc, 'FILL']); const hh = ROW({ gap: 8 }); add(hh, await T('Reward history', 'Heading/H5')); add(hh, await DEMO('XS')); add(hc, hh);
for (const [a, d, v, st, lab] of [['Level-up — Gold III', '25 Nov 2026, 19:32', '5.00', 'Confirmed', 'Claimed'], ['Rakeback', '24 Nov 2026, 09:12', '2.96', 'Confirmed', 'Claimed'], ['Weekly reward — Gold', '23 Nov 2026, 10:00', '108.40', 'Approved', 'Auto-settled'], ['Weekly cashback · 10%', '23 Nov 2026, 10:00', '12.80', 'Approved', 'Auto-paid']]) { const r = ROW({ gap: 8 }); add(r, [await TWO(a, d + ' · to Available'), 'FILL']); const rc2 = COL({ gap: 4, align: 'MAX' }); add(rc2, await AMT('+' + v, { c: 'text/success' })); add(rc2, await BADGEL(st, lab)); add(r, rc2); add(hc, [r, 'FILL']); }
await MFOOT(content, 'Rewards are DEMO. Never changes odds or outcomes. Terms apply.');
const sticky = ROW({ name: 'Sticky CTA', p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(sticky, 'border/subtle', { t: 1 }); add(sticky, [await BTN('Primary', 'Claim all · 118.62 USDT', { size: 'L' }), 'FILL']); add(f, [sticky, 'FILL']);
await MEND(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
