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
const F = await figma.getNodeByIdAsync('36:530716'); const C = await figma.getNodeByIdAsync('36:531074'); const hero = await figma.getNodeByIdAsync('36:531321');
if (C.children.length > 4) throw new Error('Part B already applied');
F.primaryAxisSizingMode = 'AUTO';
const g = hero.findOne(n => n.name === 'Angled colour block — gold'); g.rotation = 14; g.x = 730; g.y = -170;
const m = hero.findOne(n => n.name === 'Angled colour block — mint stripe'); m.rotation = 14; m.x = 640; m.y = -170;
const pv = hero.findOne(n => n.name.startsWith('Preview — Card/VIP Tier')); pv.x = 836; pv.y = 52;
const ts = hero.findOne(n => n.name === 'Preview — weekly reward toast'); ts.x = 624; ts.y = 304;
add(C, [await head('HOW POINTS WORK', 'Earn, level up, keep your tier', 'Points follow real-money play only, so rewards track what you actually stake — never deposits, platform fees or bonus funds.'), 'FILL']);
const steps = AL('HORIZONTAL', { name: 'Steps', gap: 16 }); add(C, [steps, 'FILL']);
for (const [n, ic, t, bd] of [
  ['01', 'coins', 'Earn points', '1 point for every 1.00 USDT staked with real balance on Originals, table games, slots, live tables and Global Pool entry prices.'],
  ['02', 'trending-up', 'Level up', '29 levels across 5 tiers. Every new level pays a one-off level-up reward in bonus funds; the amount depends on your tier.'],
  ['03', 'gift', 'Collect weekly', 'Your tier’s weekly reward is credited every Monday 10:00 UTC to Owed. Claim it to Available from Wallet at any time.'],
  ['04', 'calendar', 'Keep your tier', 'Every 90 days we review your points. If you played less you move down at most one tier — never straight back to Bronze.']]) {
  const b = box('Step ' + n + ' — ' + t, { gap: 12 }); add(steps, [b, 'FILL_BOTH']);
  const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER', justify: 'SPACE_BETWEEN' }); const ib = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 10 }); add(ib, await IC(ic, 24, 'icon/brand')); add(r, ib, await T(n, 'Number/M', 'text/tertiary')); add(b, [r, 'FILL']);
  add(b, await T(t, 'Heading/H5', 'text/primary'), [await T(bd, 'Body/S', 'text/secondary', { w: 220 }), 'FILL']);
}
const ex = box('Worked example — points in one week', { dir: 'HORIZONTAL', gap: 40, p: 28 }); add(C, [ex, 'FILL']);
const exL = AL('VERTICAL', { gap: 10, w: 320 }); add(ex, exL);
const exH = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(exH, await T('Example week', 'Heading/H5', 'text/primary'), await DEMO('S')); add(exL, exH);
add(exL, [await T('What counts and what does not. Points are added when a bet or round settles, and show in Dashboard → VIP within a minute.', 'Body/S', 'text/secondary', { w: 320 }), 'FILL']);
const exR = AL('VERTICAL', { name: 'Ledger', gap: 0 }); add(ex, [exR, 'FILL']);
const hdr = AL('HORIZONTAL', { gap: 16, p: [0, 0, 8, 0] }); strokeSides(hdr, 'border/subtle', { b: 1 });
add(hdr, [await T('ACTIVITY', 'Overline', 'text/tertiary'), 'FILL'], await T('AMOUNT', 'Overline', 'text/tertiary', { w: 140, align: 'RIGHT' }), await T('POINTS', 'Overline', 'text/tertiary', { w: 100, align: 'RIGHT' })); add(exR, [hdr, 'FILL']);
for (const [a, amt, pts, note] of [
  ['Orbit Rush stakes (real balance)', '250.00 USDT', '+250', null],
  ['Global Pool — 35 entries × 10.00 USDT, round #1,248', '350.00 USDT', '+350', null],
  ['Platform fee — 35 × 0.05 USDT', '1.75 USDT', '0', 'Fees never earn points'],
  ['Pool Dice stakes paid with bonus funds', '5.00 USDT', '0', 'Bonus-fund stakes never earn points']]) {
  const row = AL('HORIZONTAL', { gap: 16, align: 'CENTER', p: [10, 0, 10, 0] }); strokeSides(row, 'border/subtle', { b: 1 });
  const lc = AL('VERTICAL', { gap: 2 }); add(lc, await T(a, 'Body/S', 'text/primary')); if (note) add(lc, await T(note, 'Caption', 'text/tertiary'));
  add(row, [lc, 'FILL'], await T(amt, 'Number/S', 'text/secondary', { w: 140, align: 'RIGHT' }), await T(pts, 'Number/S', pts === '0' ? 'text/tertiary' : 'text/primary', { w: 100, align: 'RIGHT' })); add(exR, [row, 'FILL']);
}
const tot = AL('HORIZONTAL', { gap: 16, align: 'CENTER', p: [12, 0, 0, 0] }); add(tot, [await T('Points earned this week', 'Body/M Strong', 'text/primary'), 'FILL'], await T('+600 pts', 'Number/M', 'text/brand', { w: 160, align: 'RIGHT' })); add(exR, [tot, 'FILL']);
add(C, [await head('COMPARE TIERS', 'Benefits side by side', 'Everything each tier adds, in one table. Rows marked * also depend on your verification (KYC) level.', await DEMO('M')), 'FILL']);
const tbl = AL('VERTICAL', { name: 'Benefits comparison table', fill: 'bg/secondary', stroke: 'border/subtle', r: 14, clip: true }); add(C, [tbl, 'FILL']);
const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default', p: [16, 20, 16, 20], align: 'CENTER' }); strokeSides(hr, 'border/default', { b: 1 });
const h0 = AL('HORIZONTAL', { w: 316 }); add(h0, await T('BENEFIT', 'Overline', 'text/tertiary')); add(hr, h0);
for (const t of tiers) { const c = AL('HORIZONTAL', { justify: 'CENTER' }); add(c, await I('6:211', { Tier: t, Size: 'S' })); add(hr, [c, 'FILL']); }
add(tbl, [hr, 'FILL']);
const rows = [
  ['Points to unlock', ['0', '2,500', '8,000', '20,000', '50,000']],
  ['Levels in tier', ['1–5', '6–11', '12–17', '18–23', '24–29']],
  ['Weekly reward (of settled real-money stakes)', ['0.1%', '0.25%', '0.5%', '0.75%', '1.0%']],
  ['Level-up reward per level (USDT, bonus funds)', ['1.00', '3.00', '8.00', '20.00', '50.00']],
  ['Support first response', ['24 h', '12 h', '4 h · priority', '1 h · priority', '24/7 manager']],
  ['Daily withdrawal limit (USDT)*', ['25,000', '25,000', '50,000', '100,000', '250,000']],
  ['Dedicated account manager', [0, 0, 0, 1, 1]],
  ['Invitations to community events', [0, 0, 0, 0, 1]]];
for (const [lab, vals] of rows) {
  const r = AL('HORIZONTAL', { name: 'Row — ' + lab, p: [14, 20, 14, 20], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 });
  const l = AL('HORIZONTAL', { w: 316 }); add(l, [await T(lab, 'Body/S Strong', 'text/primary', { w: 296 }), 'FILL']); add(r, l);
  for (const v of vals) {
    const c = AL('HORIZONTAL', { gap: 6, justify: 'CENTER', align: 'CENTER' });
    if (typeof v === 'number') { if (v) add(c, await IC('check', 16, 'icon/brand'), await T('Included', 'Body/S', 'text/primary')); else add(c, await IC('minus', 16, 'icon/muted'), await T('Not included', 'Body/S', 'text/tertiary')); }
    else add(c, await T(v, /[0-9]/.test(v) && !v.includes('h') ? 'Number/S' : 'Body/S', 'text/primary'));
    add(r, [c, 'FILL']);
  }
  add(tbl, [r, 'FILL']);
}
for (const [lab, ic, msg] of [['Odds, house edge, payouts & draws', 'shield-check', 'Identical for every tier — VIP status is never an input to any game result or Global Pool draw'], ['Limits, cooling-off & self-exclusion', 'heart', 'Available to everyone from day one; no tier can switch them off or delay them']]) {
  const r = AL('HORIZONTAL', { name: 'Row — ' + lab, p: [16, 20, 16, 20], align: 'CENTER', fill: 'brand/tint-subtle' }); strokeSides(r, 'border/subtle', { b: 1 });
  const l = AL('HORIZONTAL', { w: 316 }); add(l, [await T(lab, 'Body/S Strong', 'text/primary', { w: 296 }), 'FILL']); add(r, l);
  const c = AL('HORIZONTAL', { gap: 8, justify: 'CENTER', align: 'CENTER' }); add(c, await IC(ic, 18, 'icon/brand'), await T(msg, 'Body/S Strong', 'text/brand')); add(r, [c, 'FILL']);
  add(tbl, [r, 'FILL']);
}
const fn = AL('HORIZONTAL', { name: 'Footnote', p: [12, 20, 14, 20], gap: 8, align: 'CENTER' }); add(fn, await IC('info', 14, 'icon/muted'), [await T('* Limits shown for KYC Level 2. Withdrawal security (2FA, address whitelisting, 24 h cooldown for new addresses) applies to every tier. Reward amounts are DEMO terms.', 'Caption', 'text/tertiary', { w: 900 }), 'FILL']); add(tbl, [fn, 'FILL']);
const pr = AL('HORIZONTAL', { name: 'Level-up promo + responsible play', gap: 16 }); add(C, [pr, 'FILL']);
const bp = await I('29:18042', { Type: 'VIP level-up' }); bp.name = 'Banner/Promo — VIP level-up'; txt(bp, 'Key terms', '29 levels across 5 tiers · rewards are bonus funds: 30× wagering, 14 days to use');
const pb = bp.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Button/Primary')); if (pb) setProp(pb, 'Label', 'Create free account');
add(pr, bp);
const rg = box('Responsible play — VIP', { gap: 12, p: 24 }); add(pr, [rg, 'FILL_BOTH']);
const rgh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const rgi = AL('HORIZONTAL', { fill: 'status/info-tint', r: 10, p: 8 }); add(rgi, await IC('heart', 20, 'text/info')); add(rgh, rgi, await T('Play for fun — not for status', 'Heading/H5', 'text/primary')); add(rg, rgh);
add(rg, [await T('VIP rewards are never a reason to play more. We don’t raise your limits, chase you with “come back” offers or send VIP messages while a limit, cooling-off or self-exclusion is active. Leave VIP Club and stop VIP messages any time in Settings.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
const rga = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rga, await BTN('Secondary', 'Set limits', { size: 'S' }), await BTN('Ghost', 'Responsible gaming', { size: 'S', trail: 'arrow-right' }), await I('6:159')); add(rg, rga);
add(C, [await head('VIP FAQ', 'Questions players ask about VIP'), 'FILL']);
const fq = AL('HORIZONTAL', { name: 'FAQ + help', gap: 24 }); add(C, [fq, 'FILL']);
const fl = AL('VERTICAL', { name: 'FAQ list', gap: 12 }); add(fq, fl);
const e = await I('23:16819', { State: 'Expanded' }, { Question: 'Does my VIP tier change my odds or results?', Answer: 'No. Bronze and Diamond players get the same odds, house edge, payout tables and Global Pool draw. Results come from Chainlink VRF or a committed server seed you can verify — VIP status is never an input.' });
txt(e, 'Example', 'Example: two players each holding 35 of 18,640 entries in round #1,248 have the same ≈0.188% chance of 1st prize — whatever their tier.');
const lk = e.findOne(n => n.name === 'Links'); if (lk) { const lt = lk.findAll(n => n.type === 'TEXT'); if (lt[0]) lt[0].characters = 'How draws are verified'; if (lt[1]) lt[1].characters = 'Odds & fees'; }
add(fl, e);
for (const [q, a] of [['How do I earn VIP points?', '1 point per 1.00 USDT staked with real balance once the bet or round settles.'], ['Can I move down a tier?', 'Tiers are reviewed every 90 days; you drop at most one tier per review.'], ['Are weekly rewards withdrawable?', 'Yes. Weekly rewards land in Owed; claim them to Available and withdraw as usual. Level-up rewards are bonus funds with wagering.'], ['Do platform fees or bonus funds earn points?', 'No. Only real-money stakes earn points.']]) add(fl, await I('23:16819', { State: 'Collapsed' }, { Question: q, Answer: a }));
const help = box('Talk to a VIP host', { gap: 12, p: 24 }); add(fq, [help, 'FILL']);
const hh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const hi = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(hi, await IC('chat', 20, 'icon/brand')); add(hh, hi, await T('Talk to a VIP host', 'Heading/H5', 'text/primary')); add(help, hh);
add(help, [await T('Gold members get a priority queue; Platinum and Diamond members get a named account manager. Hosts never ask for passwords, 2FA codes or seed phrases — and never pressure you to deposit.', 'Body/S', 'text/secondary', { w: 340 }), 'FILL']);
const ha = AL('VERTICAL', { gap: 8 }); add(ha, [await BTN('Secondary', 'Contact support', { lead: 'mail' }), 'FILL'], [await BTN('Ghost', 'Read VIP terms', { trail: 'arrow-right' }), 'FILL']); add(help, [ha, 'FILL']);
const lic = AL('VERTICAL', { name: 'Licence & trust', gap: 16 }); add(C, [lic, 'FILL']);
add(lic, [await I('25:16197'), 'FILL'], await I('6:158', { Variant: 'Inline' }));
fitSection(sec);
await hero.screenshot({ scale: 0.5 });
await tbl.screenshot({ scale: 0.5 });
return { frame: F.id, h: F.height, table: tbl.id, ex: ex.id, faq: fq.id };
