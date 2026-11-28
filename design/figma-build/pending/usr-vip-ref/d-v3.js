const NAME = '[USR-V3] VIP — Rewards / 1440 / Default';
const { f, content } = await DESK(NAME, 3240, 160, { active: 'VIP Club', area: 'VIP Club', page: 'Rewards', title: 'VIP rewards',
  sub: 'Paid in USDT to your Available balance with no wagering. Unclaimed rewards settle automatically — nothing expires.',
  actions: async () => [await BTN('Ghost', 'Reward rules', { lead: 'book' })], tabs: VTABS('Rewards') });
const r1 = ROW({ name: 'Claim row', gap: 16, align: 'MIN' }); add(content, [r1, 'FILL']);
const rc = CARD({ name: 'Ready to claim', gap: 16 }); add(r1, [rc, 'FILL']);
const rh = ROW({ gap: 12 }); const rht = COL({ gap: 2 }); add(rht, await T('Ready to claim', 'Heading/H4')); add(rht, await T('Claim now, or leave it — each reward settles to Available on its own date.', 'Body/S', 'text/secondary')); add(rh, [rht, 'FILL']);
const tot = ROW({ gap: 6, align: 'MAX' }); const tv = await T('118.62', 'Number/L', 'text/primary'); tv.name = 'Total claimable'; add(tot, tv); add(tot, await T('USDT', 'Body/S', 'text/tertiary')); add(tot, await DEMO('S')); add(rh, tot); add(rc, [rh, 'FILL']);
for (const [nm, icon, ic, bg, ov, ttl, note, kind, v, vc] of [['Weekly reward', 'crown', 'icon/gold', 'accent/gold-tint', 'WEEKLY REWARD · GOLD', 'Your play Mon 16 – Sun 22 Nov 2026', 'Settles automatically Mon 30 Nov 2026, 10:00 UTC', 'clock', '115.20', 'balance/owed'], ['Rakeback', 'percent', 'icon/brand', 'brand/tint', 'RAKEBACK', '5% of the house edge on your bets since 24 Nov', 'Claim any time — rakeback never expires', 'info', '3.42', 'text/primary']]) {
  const it = CARD({ name: 'Reward — ' + nm, dir: 'HORIZONTAL', gap: 16, p: 16, fill: 'surface/raised', align: 'CENTER' }); add(rc, [it, 'FILL']);
  add(it, await TILE(icon, ic, bg, 48)); const c = COL({ gap: 4 }); add(c, await T(ov, 'Overline', 'text/tertiary')); add(c, await T(ttl, 'Body/M Strong', 'text/primary')); add(c, await CHK(note, kind, 360, 'Caption', 'text/tertiary')); add(it, [c, 'FILL']);
  add(it, await AMT(v, { s: 'Number/M', c: vc, demo: true })); const b = await BTN('Primary', 'Claim', { size: 'M' }); b.name = 'Claim button'; add(it, b); }
const rf = ROW({ name: 'Claim footer', gap: 16 }); add(rf, [await T('Owed balance 415.20 USDT = 300.00 refund (round #1,245) + 115.20 weekly reward. Rakeback is tracked separately.', 'Caption', 'text/tertiary', { w: 440 }), 'FILL']);
const ca = await BTN('Primary', 'Claim all · 118.62 USDT', { size: 'L' }); ca.name = 'Claim all'; add(rf, ca); add(rc, [rf, 'FILL']);
const cu = CARD({ name: 'Coming up', gap: 14, w: 376 }); add(r1, cu); cu.layoutSizingVertical = 'FILL';
add(cu, await T('Coming up', 'Heading/H5'));
for (const [ttl, sub, st, lab, pr] of [['Weekly cashback · 10%', 'Paid Mon 30 Nov 2026, 10:00 UTC · last 12.80 USDT', 'Pending', 'Scheduled'], ['Next Gold weekly reward', 'Calculated Mon 30 Nov 2026 from this week’s play', 'Pending', 'Scheduled'], ['Level-up · Gold IV', '8.00 USDT · 1,160 pts to go', 'Neutral', 'Locked', 840 / 2000], ['Level-up · Platinum I', '25.00 USDT · 7,160 pts to go', 'Neutral', 'Locked', 12840 / 20000]]) {
  const r = ROW({ name: 'Upcoming — ' + ttl, gap: 12, align: 'MIN' }); const c = COL({ gap: 4 }); add(c, await T(ttl, 'Body/S Strong')); add(c, await T(sub, 'Caption', 'text/tertiary', { w: 220 })); if (pr) add(c, BAR(220, pr, 'brand/primary', 6)); add(r, [c, 'FILL']); add(r, await BADGEL(st, lab)); add(cu, [r, 'FILL']); }
const hi = CARD({ name: 'Reward history', gap: 0, p: 0, clip: true }); add(content, [hi, 'FILL']);
const hh = ROW({ gap: 12, p: [20, 24, 16, 24] }); add(hh, await T('Reward history', 'Heading/H4')); add(hh, await DEMO('S')); add(hi, [hh, 'FILL']);
const tbl = COL({ name: 'Table', gap: 0 }); add(hi, [tbl, 'FILL']);
await HEADROW(tbl, [['Date', 200], ['Reward', 'FILL'], ['Amount', 150, true], ['Status', 170], ['Paid to', 160]]);
const RH = [['25 Nov 2026, 19:32', 'Level-up — Gold III (Level 14)', 'Claimed by you', '5.00', 'Confirmed', 'Claimed'], ['24 Nov 2026, 09:12', 'Rakeback', '5% of house edge, 17–24 Nov', '2.96', 'Confirmed', 'Claimed'], ['23 Nov 2026, 10:00', 'Weekly reward — Gold', 'Your play 9–15 Nov 2026', '108.40', 'Approved', 'Auto-settled'], ['23 Nov 2026, 10:00', 'Weekly cashback · 10%', 'Net result 16–22 Nov 2026', '12.80', 'Approved', 'Auto-paid'], ['12 Nov 2026, 18:45', 'Weekly reward — Gold', 'Your play 2–8 Nov 2026', '97.60', 'Confirmed', 'Claimed'], ['2 Nov 2026, 16:20', 'Level-up — Gold II (Level 13)', 'Claimed by you', '3.00', 'Confirmed', 'Claimed']];
for (const [i, [d, a, b, v, st, lab]] of RH.entries()) await addRow(tbl, [CELL(200, [await TX(d, 'Body/S', 'text/secondary')]), CELL('FILL', [await TWO(a, b)]), CELL(150, [await AMT('+' + v, { c: 'text/success', demo: true })], { right: true }), CELL(170, [await BADGEL(st, lab)]), CELL(160, [await TX('Available', 'Body/S', 'text/secondary')])], { name: 'Row — ' + a, last: i === RH.length - 1 });
const tm = CARD({ name: 'Reward terms', dir: 'HORIZONTAL', gap: 24, p: [16, 24, 16, 24], fill: 'bg/secondary', align: 'CENTER' }); add(content, [tm, 'FILL']);
for (const s of ['Paid in USDT to Available', 'No wagering requirements', 'Unclaimed rewards settle automatically', 'Never changes odds or outcomes']) add(tm, await CHK(s, 'ok', 200, 'Caption', 'text/secondary'));
add(tm, await BTN('Ghost', 'Terms apply', { size: 'S' }));
await FOOT(content, 'Reward amounts are DEMO. VIP rewards are a thank-you for play, not an incentive to play more — set limits any time.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
