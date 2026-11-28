const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-10/11/12/15 VIP, Affiliates, About, Contact', 80000, 0);
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
async function head(over, title, body, right) {
  const row = AL('HORIZONTAL', { name: 'Section header — ' + title, gap: 24, align: 'MAX' });
  const l = AL('VERTICAL', { gap: 8 }); add(row, [l, 'FILL']);
  add(l, await T(over, 'Overline', 'text/brand'), await T(title, 'Heading/H3', 'text/primary'));
  if (body) add(l, await T(body, 'Body/M', 'text/secondary', { w: 760 }));
  if (right) add(row, right);
  return row;
}
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 24, gap: o.gap ?? 12, align: o.align, justify: o.justify }); }
// Card/VIP Tier benefit copy aligned with demo-data (VIP extras) + USR-V4: rewards in USDT to Available, no wagering; limits identical for every tier
const VIPB = { Bronze: ['Level-up rewards 0.50–1.50 USDT', 'Standard support', 'Monthly activity statement'], Silver: ['Weekly reward, paid in USDT', 'Level-up rewards 1.00–1.80 USDT', 'Standard support'], Gold: ['Weekly reward, paid in USDT', 'Level-up rewards 2.00–15.00 USDT', 'Priority support queue'], Platinum: ['Weekly + monthly reward', 'Level-up rewards 25.00–60.00 USDT', 'Dedicated VIP host', 'Platinum tournament series'], Diamond: ['Weekly + monthly reward', 'Level-up rewards 100.00–500.00 USDT', 'Dedicated VIP host', 'All VIP events & invitations'] };
async function vipFix(inst) { const mc = await inst.getMainComponentAsync(); const tier = (mc && mc.name.match(/Tier=(\w+)/) || [])[1]; const b = VIPB[tier]; if (!b) return 0; const ts = inst.findAll(n => n.type === 'TEXT' && n.name === 'Benefit'); ts.forEach((t, i) => { if (b[i]) t.characters = b[i]; }); return ts.length; }
const F = await figma.getNodeByIdAsync('36:530716'); const C = await figma.getNodeByIdAsync('36:531074'); const hero = await figma.getNodeByIdAsync('36:531321');
if (C.children.length > 4) throw new Error('Part B already applied');
F.primaryAxisSizingMode = 'AUTO';
// ---- part A copy fixes (reconcile with demo-data VIP extras) ----
const FIX = {
  '36:531329': 'Earn 1 point for every 1.00 USDT you enter in Global Pool or stake with real balance. Climb from Bronze to Diamond for weekly and monthly rewards, a reward at every new level and a dedicated VIP host.',
  '36:531350': 'Terms apply · VIP rewards are paid in USDT to Available — no wagering, they never expire',
  '36:531455': 'entered in Global Pool or staked with real balance in Originals and table games',
  '36:531465': 'Weekly reward', '36:531466': 'from Silver up — calculated Mondays 10:00 UTC, settles by itself a week later',
  '36:531475': 'Rolling 365 days', '36:531476': 'status points count your last 12 months of play; roll-off dates are shown in advance',
  '36:531625': 'Example: @nova.k is Gold III (level 14 of 29) with 12,840 pts — 7,160 to Platinum.',
  '36:531716': 'Every Monday at 10:00 UTC we calculate your tier’s reward for last week’s settled real-money play and add it to your Owed balance. Claim it to Available early if you like — otherwise it settles to Available by itself a week later. No wagering, no expiry.',
  '36:531719': 'Example player', '36:531720': '@nova.k · Gold III', '36:531722': 'Play counted, Mon 16 – Sun 22 Nov 2026', '36:531723': '1,326 pts',
  '36:531725': 'Weekly reward · USDT, no wagering', '36:531726': '115.20 USDT',
  '36:531731': 'Calculated Mon 23 Nov 2026, 10:00 UTC · settles to Available by itself Mon 30 Nov 2026, 10:00 UTC' };
const fixed = []; for (const [id, v] of Object.entries(FIX)) { const t = await figma.getNodeByIdAsync(id); if (t && t.type === 'TEXT') { t.characters = v; fixed.push(id); } }
let vipFixed = 0; for (const inst of F.findAll(n => n.type === 'INSTANCE' && n.name.includes('Card/VIP Tier'))) vipFixed += await vipFix(inst);
// ---- hero geometry fix (mint stripe overlapped the copy) ----
const g = hero.findOne(n => n.name === 'Angled colour block — gold'); g.rotation = 14; g.x = 730; g.y = -170;
const m = hero.findOne(n => n.name === 'Angled colour block — mint stripe'); m.rotation = 14; m.x = 640; m.y = -170;
const pv = hero.findOne(n => n.name.startsWith('Preview — Card/VIP Tier')); pv.x = 836; pv.y = 52;
const ts = hero.findOne(n => n.name === 'Preview — weekly reward toast'); ts.x = 600; ts.y = 28;
const c1 = hero.findOne(n => n.name === 'Object — chip 100'); c1.x = 1080; c1.y = -24;
const c5 = hero.findOne(n => n.name === 'Object — chip 500'); c5.x = 1080; c5.y = 462;
// ---- how points work ----
add(C, [await head('HOW POINTS WORK', 'Earn, level up, keep your tier', 'Points follow real-money play only, so your status tracks what you actually play — never deposits, platform fees, bonus funds or refunds.'), 'FILL']);
const steps = AL('HORIZONTAL', { name: 'Steps', gap: 16 }); add(C, [steps, 'FILL']);
for (const [n, ic, t, bd] of [
  ['01', 'coins', 'Earn points', '1 point for every 1.00 USDT entered in Global Pool (the 0.05 USDT fee doesn’t count) or staked with real balance in Originals and table games.'],
  ['02', 'trending-up', 'Level up', '29 levels across 5 tiers. Every new level pays a one-off reward in USDT straight to Available — from 0.50 at Bronze up to 500.00 at Diamond.'],
  ['03', 'gift', 'Collect weekly', 'From Silver up, your weekly reward is calculated every Monday 10:00 UTC. Claim it early or let it settle to Available by itself a week later.'],
  ['04', 'calendar', 'Keep your tier', 'Status points are a rolling 365-day total. Points older than a year roll off — the dates are shown in Dashboard → VIP well in advance.']]) {
  const b = box('Step ' + n + ' — ' + t, { gap: 12 }); add(steps, [b, 'FILL_BOTH']);
  const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER', justify: 'SPACE_BETWEEN' }); const ib = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 10 }); add(ib, await IC(ic, 24, 'icon/brand')); add(r, ib, await T(n, 'Number/M', 'text/tertiary')); add(b, [r, 'FILL']);
  add(b, await T(t, 'Heading/H5', 'text/primary'), [await T(bd, 'Body/S', 'text/secondary', { w: 220 }), 'FILL']);
}
const ex = box('Worked example — points in one week', { dir: 'HORIZONTAL', gap: 40, p: 28 }); add(C, [ex, 'FILL']);
const exL = AL('VERTICAL', { gap: 10, w: 320 }); add(ex, exL);
const exH = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(exH, await T('Example week', 'Heading/H5', 'text/primary'), await DEMO('S')); add(exL, exH);
add(exL, [await T('What counts and what doesn’t. Points are added when a bet settles or a round draws, and show in Dashboard → VIP within a minute.', 'Body/S', 'text/secondary', { w: 320 }), 'FILL']);
const exR = AL('VERTICAL', { name: 'Ledger', gap: 0 }); add(ex, [exR, 'FILL']);
const hdr = AL('HORIZONTAL', { gap: 16, p: [0, 0, 8, 0] }); strokeSides(hdr, 'border/subtle', { b: 1 });
add(hdr, [await T('ACTIVITY', 'Overline', 'text/tertiary'), 'FILL'], await T('AMOUNT', 'Overline', 'text/tertiary', { w: 140, align: 'RIGHT' }), await T('POINTS', 'Overline', 'text/tertiary', { w: 100, align: 'RIGHT' })); add(exR, [hdr, 'FILL']);
for (const [a, amt, pts, note] of [
  ['Orbit Rush — stakes with real balance', '250.00 USDT', '+250', null],
  ['Global Pool — 20 entries × 10.00 USDT, round #1,248', '200.00 USDT', '+200', null],
  ['Twenty-One — stakes with real balance', '150.00 USDT', '+150', null],
  ['Platform fee — 20 × 0.05 USDT', '1.00 USDT', '0', 'The platform fee never earns points'],
  ['Pool Dice — stakes paid with bonus funds', '5.00 USDT', '0', 'Bonus-fund stakes never earn points'],
  ['Refund — 10 entries from a cancelled round', '100.00 USDT', '0', 'Refunded entries earn 0 points']]) {
  const row = AL('HORIZONTAL', { gap: 16, align: 'CENTER', p: [10, 0, 10, 0] }); strokeSides(row, 'border/subtle', { b: 1 });
  const lc = AL('VERTICAL', { gap: 2 }); add(lc, await T(a, 'Body/S', 'text/primary')); if (note) add(lc, await T(note, 'Caption', 'text/tertiary'));
  add(row, [lc, 'FILL'], await T(amt, 'Number/S', 'text/secondary', { w: 140, align: 'RIGHT' }), await T(pts, 'Number/S', pts === '0' ? 'text/tertiary' : 'text/primary', { w: 100, align: 'RIGHT' })); add(exR, [row, 'FILL']);
}
const tot = AL('HORIZONTAL', { gap: 16, align: 'CENTER', p: [12, 0, 0, 0] }); add(tot, [await T('Points earned this week', 'Body/M Strong', 'text/primary'), 'FILL'], await T('+600 pts', 'Number/M', 'text/brand', { w: 160, align: 'RIGHT' })); add(exR, [tot, 'FILL']);
// ---- comparison table ----
add(C, [await head('COMPARE TIERS', 'Benefits side by side', 'Everything each tier adds, in one table — and the things no tier can change.', await DEMO('M')), 'FILL']);
const tbl = AL('VERTICAL', { name: 'Benefits comparison table', fill: 'bg/secondary', stroke: 'border/subtle', r: 14, clip: true }); add(C, [tbl, 'FILL']);
const tiers = [['Bronze', '0 pts'], ['Silver', '2,500 pts'], ['Gold', '8,000 pts'], ['Platinum', '20,000 pts'], ['Diamond', '50,000 pts']];
const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default', p: [16, 20, 16, 20], align: 'CENTER' }); strokeSides(hr, 'border/default', { b: 1 });
const h0 = AL('HORIZONTAL', { w: 316 }); add(h0, await T('BENEFIT', 'Overline', 'text/tertiary')); add(hr, h0);
for (const [t, p] of tiers) { const c = AL('VERTICAL', { gap: 4, align: 'CENTER' }); add(c, await I('6:211', { Tier: t, Size: 'S' }), await T(p, 'Caption', 'text/tertiary')); add(hr, [c, 'FILL']); }
add(tbl, [hr, 'FILL']);
const rows = [
  ['Levels', ['1–5', '6–11', '12–17', '18–23', '24–29']],
  ['Level-up reward per level (USDT)', ['0.50–1.50', '1.00–1.80', '2.00–15.00', '25.00–60.00', '100.00–500.00']],
  ['Weekly reward (USDT, settles by itself)', [0, 1, 1, 1, 1]],
  ['Monthly reward', [0, 0, 0, 1, 1]],
  ['Support', ['Standard', 'Standard', 'Priority queue', 'Dedicated VIP host', 'Dedicated VIP host']],
  ['VIP tournaments', [0, 0, 'Monthly invitational', '+ Platinum series', 'All VIP events']]];
for (const [lab, vals] of rows) {
  const r = AL('HORIZONTAL', { name: 'Row — ' + lab, p: [14, 20, 14, 20], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 });
  const l = AL('HORIZONTAL', { w: 316 }); add(l, [await T(lab, 'Body/S Strong', 'text/primary', { w: 296 }), 'FILL']); add(r, l);
  for (const v of vals) {
    const c = AL('HORIZONTAL', { gap: 6, justify: 'CENTER', align: 'CENTER' });
    if (typeof v === 'number') { if (v) add(c, await IC('check', 16, 'icon/brand'), await T('Included', 'Body/S', 'text/primary')); else add(c, await IC('minus', 16, 'icon/muted'), await T('Not included', 'Body/S', 'text/tertiary')); }
    else add(c, await T(v, /^[0-9]/.test(v) ? 'Number/S' : 'Body/S', 'text/primary'));
    add(r, [c, 'FILL']);
  }
  add(tbl, [r, 'FILL']);
}
const grp = AL('HORIZONTAL', { name: 'Group — Same for every tier', fill: 'brand/tint-subtle', p: [10, 20, 10, 20], gap: 8, align: 'CENTER' }); strokeSides(grp, 'border/subtle', { b: 1 }); add(grp, await IC('shield-check', 16, 'icon/brand'), await T('SAME FOR EVERY TIER', 'Overline', 'text/brand')); add(tbl, [grp, 'FILL']);
for (const [lab, msg] of [['Odds, house edge & RTP', 'Identical for Bronze and Diamond — printed on every game'], ['Draw & result verification', 'Chainlink VRF and committed seeds — VIP status is never an input'], ['Withdrawal security checks & limits', 'Same 2FA, whitelisting, 24 h new-address cooldown and 25,000.00 USDT/day (KYC L2)'], ['Responsible-gaming tools & limits', 'Available to everyone from day one — no tier can switch them off or delay them']]) {
  const r = AL('HORIZONTAL', { name: 'Row — ' + lab, p: [14, 20, 14, 20], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 });
  const l = AL('HORIZONTAL', { w: 316 }); add(l, [await T(lab, 'Body/S Strong', 'text/primary', { w: 296 }), 'FILL']); add(r, l);
  const c = AL('HORIZONTAL', { gap: 8, justify: 'CENTER', align: 'CENTER' }); add(c, await IC('check-circle', 16, 'icon/brand'), await T(msg, 'Body/S', 'text/primary')); add(r, [c, 'FILL']);
  add(tbl, [r, 'FILL']);
}
const fn = AL('HORIZONTAL', { name: 'Footnote', p: [12, 20, 14, 20], gap: 8, align: 'CENTER' }); add(fn, await IC('info', 14, 'icon/muted'), [await T('Reward amounts are DEMO terms. Every VIP reward is paid in USDT to your Available balance — no wagering and no expiry. Weekly rewards settle by themselves a week after they are calculated.', 'Caption', 'text/tertiary', { w: 900 }), 'FILL']); add(tbl, [fn, 'FILL']);
// ---- promo + responsible play ----
const pr = AL('HORIZONTAL', { name: 'Level-up promo + responsible play', gap: 16 }); add(C, [pr, 'FILL']);
const bp = await I('29:18042', { Type: 'VIP level-up' }); bp.name = 'Banner/Promo — VIP level-up'; txt(bp, 'Key terms', '29 levels · 0.50–500.00 USDT per level, paid to Available · no wagering');
const pb = bp.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Button/Primary')); if (pb) setProp(pb, 'Label', 'Create free account');
add(pr, bp);
const rg = box('Responsible play — VIP', { gap: 12, p: 24 }); add(pr, [rg, 'FILL_BOTH']);
const rgh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const rgi = AL('HORIZONTAL', { fill: 'status/info-tint', r: 10, p: 8 }); add(rgi, await IC('heart', 20, 'text/info')); add(rgh, rgi, await T('Play for fun — never chase a level', 'Heading/H5', 'text/primary')); add(rg, rgh);
add(rg, [await T('VIP rewards are never a reason to play more. We don’t raise your limits, send “almost there” nudges or VIP offers while a limit, cooling-off or self-exclusion is active. Leave VIP Club and stop VIP messages any time in Settings.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
const rga = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rga, await BTN('Secondary', 'Set limits', { size: 'S' }), await BTN('Ghost', 'Responsible gaming', { size: 'S', trail: 'arrow-right' }), await I('6:159')); add(rg, rga);
// ---- FAQ ----
add(C, [await head('VIP FAQ', 'Questions players ask about VIP'), 'FILL']);
const fq = AL('HORIZONTAL', { name: 'FAQ + help', gap: 24 }); add(C, [fq, 'FILL']);
const fl = AL('VERTICAL', { name: 'FAQ list', gap: 12 }); add(fq, fl);
const e = await I('23:16819', { State: 'Expanded' }, { Question: 'Does my VIP tier change my odds or results?', Answer: 'No. Bronze and Diamond players get the same odds, house edge, payout tables and Global Pool draw. Results come from Chainlink VRF or a committed server seed you can verify — VIP status is never an input.' });
txt(e, 'Example', 'Example: two players each holding 35 of 18,640 entries in round #1,248 have the same ≈0.188% chance of 1st prize — whatever their tier.');
const lk = e.findOne(n => n.name === 'Links'); if (lk) { const lt = lk.findAll(n => n.type === 'TEXT'); if (lt[0]) lt[0].characters = 'How draws are verified'; if (lt[1]) lt[1].characters = 'Odds & fees'; }
add(fl, e);
for (const [q, a] of [['How do I earn VIP points?', '1 point per 1.00 USDT entered in Global Pool or staked with real balance, once the bet settles or the round draws.'], ['Can I lose my tier?', 'Status points are a rolling 365-day total, so old points roll off. Dashboard → VIP shows every roll-off date in advance.'], ['Are VIP rewards withdrawable?', 'Yes. They are paid in USDT to Available with no wagering and never expire — withdraw them like any balance.'], ['Do platform fees, bonus funds or refunds earn points?', 'No. Only real-money stakes and Global Pool entry prices earn points.']]) add(fl, await I('23:16819', { State: 'Collapsed' }, { Question: q, Answer: a }));
const help = box('Talk to a VIP host', { gap: 12, p: 24 }); add(fq, [help, 'FILL']);
const hh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const hi = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(hi, await IC('chat', 20, 'icon/brand')); add(hh, hi, await T('Talk to a VIP host', 'Heading/H5', 'text/primary')); add(help, hh);
add(help, [await T('Gold members get a priority support queue; Platinum and Diamond members get a dedicated VIP host. Hosts never ask for passwords, 2FA codes or seed phrases — and never pressure you to deposit or play.', 'Body/S', 'text/secondary', { w: 340 }), 'FILL']);
const ha = AL('VERTICAL', { gap: 8 }); add(ha, [await BTN('Secondary', 'Contact support', { lead: 'mail' }), 'FILL'], [await BTN('Ghost', 'Read VIP terms', { trail: 'arrow-right' }), 'FILL']); add(help, [ha, 'FILL']);
const lic = AL('VERTICAL', { name: 'Licence & trust', gap: 16 }); add(C, [lic, 'FILL']);
add(lic, [await I('25:16197'), 'FILL'], await I('6:158', { Variant: 'Inline' }));
fitSection(sec);
await F.screenshot({ scale: 0.3 });
await C.findOne(n => n.name === 'Tier grid').screenshot({ scale: 0.45 });
await tbl.screenshot({ scale: 0.5 });
return { frame: F.id, h: F.height, table: tbl.id, ex: ex.id, faq: fq.id, fixed: fixed.length, vipFixed };
