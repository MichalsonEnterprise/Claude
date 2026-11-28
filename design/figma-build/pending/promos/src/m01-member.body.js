// ===== PROMO-01 Promotions hub / 390 / Member (page 10, section 'PROMO — Mobile') — idempotent =====
// Also returns a read-only inventory of the three PROMO sections (by id, other pages included) for the continuation check.
const inventory = {};
for (const sid of ['32:117004', '34:326636', '71:46775']) {
  try { const s = await figma.getNodeByIdAsync(sid); inventory[sid] = s ? { name: s.name, w: Math.round(s.width), h: Math.round(s.height), frames: s.children.map(c => [c.id, c.name, Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height), c.primaryAxisSizingMode || '-']) } : 'MISSING'; } catch (e) { inventory[sid] = 'ERR ' + e.message; }
}
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PROMO — Mobile', 238000, 0);
const NAME = '[PROMO-01] Promotions hub / 390 / Member';
const existing = sec.children.find(c => c.name === NAME);
if (existing) return { skipped: 'exists', id: existing.id, inventory };
const guest = sec.children.find(c => c.name.startsWith('[PROMO-01] Promotions hub / 390'));
let X = guest ? guest.x : nextX(sec), Y = 120;
if (guest) { let m = 0; for (const c of sec.children) if (c.x < guest.x + guest.width && c.x + c.width > guest.x) m = Math.max(m, c.y + c.height); Y = m + 160; }
const CAT = { 'daily-reward': '23:15183', mission: '23:15159', rakeback: '23:15167', cashback: '23:15176', tournament: '23:15151', bonus: '23:15195', flame: '23:15189' };
async function GI(name, size = 20, color = 'icon/default') { const c = await figma.getNodeByIdAsync(CAT[name]); const i = c.createInstance(); i.resize(size, size); tint(i, color); i.name = 'Icon/' + name; return i; }
async function tile(iconNode, bg = 'surface/raised', size = 44) { const t = AL('HORIZONTAL', { name: 'Icon tile', fill: bg, r: 10, align: 'CENTER', justify: 'CENTER', w: size, h: size }); add(t, iconNode); return t; }
async function link(txt) { const t = await T(txt, 'Label/S', 'text/brand'); t.textDecoration = 'UNDERLINE'; return t; }

const f = await screen(NAME, 390, { x: X, y: Y });
sec.appendChild(f); f.x = X; f.y = Y;
const demo = await DEMOBAR('DEMO DATA — illustrative values only'); add(f, [demo, 'FILL']);
const top = await I('23:12908', { State: 'Member' }); add(f, [top, 'FILL']);

const body = AL('VERTICAL', { name: 'Content', gap: 24, p: [20, 16, 32, 16] }); add(f, [body, 'FILL']);

// --- Page header
const hdr = AL('VERTICAL', { name: 'Page header', gap: 6 }); add(body, [hdr, 'FILL']);
const ov = AL('HORIZONTAL', { name: 'Overline row', gap: 8, align: 'CENTER' }); add(hdr, ov);
add(ov, await T('PROMOTIONS', 'Overline', 'text/brand'), await DEMO('S'));
add(hdr, await T('Your rewards, Nova', 'Heading/H3', 'text/primary'));
const sub = await T('Everything you can claim right now. Cash rewards go to Available; bonus funds stay in a separate Bonus balance.', 'Body/S', 'text/secondary', { w: 358 }); add(hdr, [sub, 'FILL']);

// --- Ready to claim card (angled mint block, cropped coins)
const card = AL('VERTICAL', { name: 'Ready to claim', gap: 16, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14, clip: true }); add(body, [card, 'FILL']);
const blk = rect(220, 120, 'brand/tint', 0, 'Angled block'); card.appendChild(blk); blk.layoutPositioning = 'ABSOLUTE'; blk.rotation = -18; blk.x = 230; blk.y = -40;
const ch = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(card, [ch, 'FILL']);
add(ch, await IC('gift', 20, 'icon/brand'));
const cht = await T('Ready to claim', 'Heading/H5', 'text/primary'); add(ch, [cht, 'FILL']); add(ch, await DEMO('S'));
const big = AL('VERTICAL', { name: 'Total', gap: 2 }); add(card, [big, 'FILL']);
add(big, await T('Cash rewards', 'Label/M', 'text/secondary'));
add(big, await T('118.62 USDT', 'Number/L', 'text/primary'));
const bc = await T('+ 1.50 USDT in bonus funds (daily streak, day 4)', 'Caption', 'text/tertiary', { w: 326 }); add(big, [bc, 'FILL']);
const dv = rect(326, 1, 'border/subtle', 0, 'Divider'); add(card, [dv, 'FILL']);
const rows = [
  ['coins', 'icon/gold', 'VIP Gold weekly reward', '16–22 Nov · auto-settles Mon 30 Nov, 10:00 UTC', '115.20', 'to Available', 'text/primary'],
  ['rakeback', 'icon/brand', 'Rakeback', '5% of house edge · claim anytime', '3.42', 'to Available', 'text/primary'],
  ['daily-reward', 'icon/brand', 'Daily reward — day 4 of 7', 'Next reset 00:00 UTC · streak 3 days', '1.50', 'bonus funds', 'text/warning'],
];
for (const [ic, col, t1, t2, amt, bucket, bcol] of rows) {
  const r = AL('HORIZONTAL', { name: 'Reward — ' + t1, gap: 12, align: 'CENTER' }); add(card, [r, 'FILL']);
  const icn = CAT[ic] ? await GI(ic, 20, col) : await IC(ic, 20, col);
  add(r, await tile(icn, 'surface/raised', 44));
  const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']);
  const a = await T(t1, 'Label/L', 'text/primary', { w: 170 }); add(c, [a, 'FILL']);
  const b = await T(t2, 'Caption', 'text/tertiary', { w: 170 }); add(c, [b, 'FILL']);
  const v = AL('VERTICAL', { name: 'Amount', gap: 2, align: 'MAX' }); add(r, v);
  add(v, await T(amt + ' USDT', 'Number/S', 'text/primary', { align: 'RIGHT' }), await T(bucket, 'Caption', bcol, { align: 'RIGHT' }));
}
const b1 = await BTN('Primary', 'Claim 118.62 USDT to Available', { size: 'L', lead: 'check' }); add(card, [b1, 'FILL']);
const b2 = await BTN('Secondary', 'Claim day 4 · 1.50 USDT bonus', { size: 'L' }); add(card, [b2, 'FILL']);
const fine = AL('HORIZONTAL', { name: 'Fine print', gap: 4, wrap: true, cgap: 4 }); add(card, [fine, 'FILL']);
const fp = await T('Cash rewards have no wagering and can be withdrawn. Bonus funds unlock after 30× wagering.', 'Caption', 'text/tertiary', { w: 326 }); add(fine, [fp, 'FILL']);
add(fine, await link('Terms apply'));

// --- Bonus balance (separate from real balance)
const bh = AL('HORIZONTAL', { name: 'Section header — Bonus', gap: 8, align: 'CENTER' }); add(body, [bh, 'FILL']);
const bht = await T('Welcome bonus — active', 'Heading/H5', 'text/primary'); add(bh, [bht, 'FILL']); add(bh, await BADGE('Live', 'S'));
const bb = await I('32:23192'); add(body, [bb, 'FILL']);

// --- Progress: mission + tournament
const ph = AL('HORIZONTAL', { name: 'Section header — Progress', gap: 8, align: 'CENTER' }); add(body, [ph, 'FILL']);
const pht = await T('This week', 'Heading/H5', 'text/primary'); add(ph, [pht, 'FILL']); add(ph, await link('Missions'));
const ms = await I('30:21643', { Progress: '50' }); add(body, [ms, 'FILL']);
const tn = await I('31:22554'); add(body, [tn, 'FILL']);

// --- All promotions (stacked rows, full-row tap targets)
const ah = AL('HORIZONTAL', { name: 'Section header — All', gap: 8, align: 'CENTER' }); add(body, [ah, 'FILL']);
const aht = await T('All promotions', 'Heading/H5', 'text/primary'); add(ah, [aht, 'FILL']); add(ah, await T('7 offers', 'Caption', 'text/tertiary'));
const list = AL('VERTICAL', { name: 'Promotions list', fill: 'surface/default', stroke: 'border/subtle', r: 14, clip: true }); add(body, [list, 'FILL']);
const promos = [
  ['bonus', 'icon/brand', 'Welcome offer', '100% up to 500 USDT · 30× wagering · 14 days · min deposit 20 USDT', 'Active · 42.8% wagered', 'text/success'],
  ['daily-reward', 'icon/brand', 'Daily rewards', '7-day streak · 0.50–5.00 USDT bonus funds · resets 00:00 UTC', 'Day 4 ready', 'text/success'],
  ['mission', 'icon/brand', 'Missions', 'Weekly tasks · e.g. 50 Orbit Rush rounds → 2.00 USDT', '25 / 50 rounds', 'text/secondary'],
  ['rakeback', 'icon/brand', 'Rakeback', '5% of house edge back · claim anytime · no wagering', '3.42 USDT ready', 'text/success'],
  ['cashback', 'icon/brand', 'Weekly cashback', '10% of net losses · paid Mon 30 Nov 2026, 10:00 UTC', 'Last: 12.80 USDT', 'text/secondary'],
  ['tournament', 'icon/gold', 'Orbit Rush Sprint', '2,500.00 USDT prize pool · top 20 paid · ends Sun 29 Nov 2026, 23:59 UTC', 'You: #14 · 1,284 pts', 'text/secondary'],
  ['crown', 'icon/gold', 'VIP level-up rewards', 'Gold IV pays 8.00 USDT · no wagering', '1,160 pts to go', 'text/secondary'],
];
let i = 0;
for (const [ic, col, t1, t2, st, stc] of promos) {
  const r = AL('HORIZONTAL', { name: 'Promo row — ' + t1, gap: 12, p: [14, 16, 14, 16], align: 'CENTER' }); add(list, [r, 'FILL']);
  if (i++ < promos.length - 1) strokeSides(r, 'border/subtle', { b: 1 });
  const icn = CAT[ic] ? await GI(ic, 22, col) : await IC(ic, 22, col);
  add(r, await tile(icn, col === 'icon/gold' ? 'accent/gold-tint' : 'brand/tint', 44));
  const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(r, [c, 'FILL']);
  const a = await T(t1, 'Label/L', 'text/primary', { w: 230 }); add(c, [a, 'FILL']);
  const b = await T(t2, 'Caption', 'text/tertiary', { w: 230 }); add(c, [b, 'FILL']);
  const m = AL('HORIZONTAL', { name: 'Meta', gap: 8, align: 'CENTER', wrap: true, cgap: 4 }); add(c, [m, 'FILL']);
  add(m, await T(st, 'Label/S', stc), await T('·', 'Caption', 'text/tertiary'), await link('Terms apply'));
  add(r, await IC('chevron-right', 20, 'icon/muted'));
}

// --- RG + licence
const rg = AL('VERTICAL', { name: 'Responsible gaming', gap: 12, p: 16, fill: 'bg/secondary', stroke: 'border/subtle', r: 14 }); add(body, [rg, 'FILL']);
const rr = AL('HORIZONTAL', { name: 'RG row', gap: 12, align: 'MIN' }); add(rg, [rr, 'FILL']);
add(rr, await IC('shield', 20, 'icon/brand'));
const rt = await T('Promotions never change your odds, limits or withdrawal checks. You can opt out of bonus offers or set deposit, loss and time limits at any time.', 'Body/S', 'text/secondary', { w: 290 }); add(rr, [rt, 'FILL']);
const rl = AL('HORIZONTAL', { name: 'RG links', gap: 12, align: 'CENTER', wrap: true, cgap: 8 }); add(rg, [rl, 'FILL']);
add(rl, await I('6:159'), await link('Set limits'), await link('Responsible gaming'), await link('Promotion terms'));
const lic = await I('6:158', { Variant: 'Compact' }); add(body, [lic, 'FILL']);

const foot = await I('23:17478', { Breakpoint: 'Mobile' }); add(f, [foot, 'FILL']);
const tab = await I('22:5413', { Active: 'Home' }); add(f, [tab, 'FILL']);
fitSection(sec);
const shot = await body.screenshot({ scale: 1 });
return { created: { [NAME]: f.id }, section: sec.id, frame: { x: f.x, y: f.y, w: f.width, h: Math.round(f.height) }, content: { h: Math.round(body.height) }, inventory };
