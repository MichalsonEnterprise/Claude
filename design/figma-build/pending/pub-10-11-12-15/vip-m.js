const S = await mshell('[PUB-10] VIP Program / 390 / Default (logged out)', 120, 120); const C = S.C;
const hd = AL('VERTICAL', { name: 'Page header', gap: 12 }); add(C, [hd, 'FILL']);
const ov = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ov, await IC('crown', 16, 'icon/brand'), await T('VIP CLUB · 5 TIERS · 29 LEVELS', 'Overline', 'text/brand')); add(hd, ov);
add(hd, [await T('Every real stake moves you closer to your next reward', 'Heading/H2', 'text/primary', { w: 358 }), 'FILL'], [await T('Earn 1 point per 1.00 USDT entered in Global Pool or staked with real balance. Climb from Bronze to Diamond for weekly rewards, a USDT reward at every level and a dedicated VIP host.', 'Body/M', 'text/secondary', { w: 358 }), 'FILL']);
const art = artFrame('Hero art — VIP preview (cropped)', 280); add(C, [art, 'FILL']);
abs(art, rect(320, 620, 'accent/gold-tint-strong', 0, 'Angled colour block — gold'), 150, -140, 14);
abs(art, rect(40, 620, 'brand/primary', 0, 'Angled colour block — mint stripe'), 96, -140, 14);
const pv = await I('23:12669', { Tier: 'Gold', Current: 'Yes' }); pv.name = 'Preview — Card/VIP Tier (Gold, your tier)'; abs(art, pv, 62, 76); await vipFix(pv); await fx(pv, 'Elevation/3 — Popover');
const chip = await I('23:12227', { Value: '500', State: 'Default' }); chip.name = 'Object — chip 500'; abs(art, chip, 306, 214, 18); chip.rescale(1.2);
const pill = AL('HORIZONTAL', { name: 'Preview — weekly reward toast', fill: 'surface/overlay', stroke: 'border/default', r: 14, p: [10, 12, 10, 10], gap: 10, align: 'CENTER' });
const pIc = AL('HORIZONTAL', { fill: 'accent/gold-tint', r: 10, p: 6 }); add(pIc, await IC('coins', 18, 'icon/gold'));
const pT = AL('VERTICAL', { gap: 2 }); add(pT, await T('Weekly reward credited', 'Label/S', 'text/primary'), await T('+115.20 USDT · to Owed', 'Number/S', 'balance/owed'));
add(pill, pIc, pT, await DEMO('XS')); abs(art, pill, 12, 12); await fx(pill, 'Elevation/3 — Popover');
const cta = AL('VERTICAL', { name: 'Actions', gap: 12 }); add(C, [cta, 'FILL']);
const fair = AL('HORIZONTAL', { name: 'Fair-play promise', gap: 8, align: 'CENTER', fill: 'brand/tint-subtle', r: 10, p: [8, 12, 8, 12] }); add(fair, await IC('shield-check', 16, 'icon/brand'), [await T('VIP status never changes odds, payouts or draw results.', 'Body/S Strong', 'text/primary', { w: 290 }), 'FILL']); add(cta, [fair, 'FILL']);
add(cta, [await BTN('Primary', 'Create free account', { size: 'L' }), 'FILL'], [await BTN('Ghost', 'How points work', { size: 'L', trail: 'arrow-right' }), 'FILL']);
const terms = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(terms, [await T('Terms apply · VIP rewards are paid in USDT — no wagering, no expiry', 'Caption', 'text/tertiary', { w: 230 }), 'FILL'], await I('6:159'), await DEMO('XS')); add(cta, [terms, 'FILL']);
const facts = AL('HORIZONTAL', { name: 'Programme facts', gap: 12, wrap: true, cgap: 12 }); add(C, [facts, 'FILL']);
for (const [ic, val, lab] of [['crown', '5 tiers · 29 levels', 'Bronze to Diamond'], ['coins', '1 pt per 1.00 USDT', 'real-money stakes only'], ['gift', 'Weekly reward', 'from Silver up · settles by itself'], ['calendar', 'Rolling 365 days', 'roll-off dates shown early']]) {
  const b = AL('VERTICAL', { name: 'Fact — ' + val, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16, gap: 6, w: 173 });
  const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER', justify: 'SPACE_BETWEEN' }); add(b, [r, 'FILL']); add(r, await IC(ic, 20, 'icon/brand'), await DEMO('XS'));
  add(b, [await T(val, 'Body/M Strong', 'text/primary', { w: 141 }), 'FILL'], [await T(lab, 'Caption', 'text/secondary', { w: 141 }), 'FILL']); add(facts, b); }
add(C, [await mhead('THE LADDER', 'Five tiers, one rulebook', 'Swipe to compare tiers. Odds and results are identical for every player.', await DEMO('S')), 'FILL']);
const tw = AL('VERTICAL', { name: 'Tier carousel', gap: 12 }); add(C, [tw, 'FILL']);
const trk = AL('HORIZONTAL', { name: 'Track — swipe horizontally', gap: 12, clip: true, w: 358 }); add(tw, trk);
for (const t of ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']) { const c = await I('23:12669', { Tier: t, Current: 'No' }); c.name = 'Card/VIP Tier — ' + t; await vipFix(c); add(trk, c); }
const dots = AL('HORIZONTAL', { name: 'Pager', gap: 6, align: 'CENTER' }); add(dots, rect(24, 8, 'brand/primary', 9999, 'Dot — active')); for (let i = 0; i < 4; i++) add(dots, rect(8, 8, 'border/strong', 9999, 'Dot')); add(dots, await T('  1 / 5 · Bronze', 'Caption', 'text/tertiary')); add(tw, dots);
add(C, [await mhead('HOW POINTS WORK', 'Earn, level up, keep your tier', null), 'FILL']);
const hw = box('Points steps', { gap: 0, p: [4, 16, 4, 16] }); add(C, [hw, 'FILL']);
const stp = [['coins', 'Earn points', '1 point per 1.00 USDT entered in Global Pool or staked with real balance. Fees, bonus funds and refunds earn nothing.'], ['trending-up', 'Level up', '29 levels; each new level pays a one-off USDT reward to Available.'], ['gift', 'Collect weekly', 'From Silver up, calculated Mondays 10:00 UTC. Claim early or it settles by itself a week later.'], ['calendar', 'Keep your tier', 'Status points are a rolling 365-day total; roll-off dates are shown in advance.']];
for (let i = 0; i < stp.length; i++) add(hw, [await iconRow(stp[i][0], stp[i][1], stp[i][2], { line: i < 3 }), 'FILL']);
add(C, [await mhead('COMPARE TIERS', 'What each tier adds', 'Pick a tier to see its benefits.', await DEMO('S')), 'FILL']);
const tc = AL('HORIZONTAL', { name: 'Tier picker — scrolls', gap: 8, clip: true, w: 358 }); add(C, tc);
for (const t of ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']) add(tc, await I('17:2766', { State: t === 'Gold' ? 'Selected' : 'Default' }, { Label: t, 'Show icon': false }));
add(C, [await rowsList('Benefits — Gold', [['Points to unlock', '8,000 pts'], ['Levels in tier', '12–17'], ['Weekly reward', 1], ['Level-up reward per level', '2.00–15.00 USDT'], ['Monthly reward', 0], ['Support', 'Priority queue'], ['VIP tournaments', 'Monthly invitational']]), 'FILL']);
const fr = AL('HORIZONTAL', { name: 'Fairness note', gap: 8, fill: 'brand/tint-subtle', r: 10, p: 12 }); add(fr, await IC('shield-check', 16, 'icon/brand'), [await T('Odds, house edge, draws, withdrawal checks and limits and RG tools are identical for every tier. Rewards are paid in USDT, no wagering.', 'Caption', 'text/primary', { w: 300 }), 'FILL']); add(C, [fr, 'FILL']);
const rg = box('Responsible play — VIP', { gap: 12, p: 20 }); add(C, [rg, 'FILL']);
const rgh = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); const rgi = AL('HORIZONTAL', { fill: 'status/info-tint', r: 10, p: 8 }); add(rgi, await IC('heart', 18, 'text/info')); add(rgh, rgi, await T('Play for fun — never chase a level', 'Heading/H5', 'text/primary')); add(rg, rgh);
add(rg, [await T('VIP rewards are never a reason to play more. No “almost there” nudges or VIP offers while a limit, cooling-off or self-exclusion is active. Leave VIP Club any time in Settings.', 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
const rga = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rga, await BTN('Secondary', 'Set limits', { size: 'M' }), await BTN('Ghost', 'Get help', { size: 'M' }), await I('6:159')); add(rg, rga);
add(C, [await mhead('VIP FAQ', 'Common questions', null), 'FILL']);
const fq = box('FAQ — accordion', { gap: 0, p: [4, 16, 4, 16] }); add(C, [fq, 'FILL']);
const qs = [['Does my VIP tier change my odds?', 'No. Every player gets the same odds, house edge, payout tables and Global Pool draw. VIP status is never an input to any result.'], ['Can I lose my tier?', null], ['Are VIP rewards withdrawable?', null], ['Do fees, bonus funds or refunds earn points?', null]];
for (let i = 0; i < qs.length; i++) { const [q, a] = qs[i]; const it = AL('VERTICAL', { name: 'FAQ — ' + q, gap: 8, p: [14, 0, 14, 0] }); if (i < qs.length - 1) strokeSides(it, 'border/subtle', { b: 1 }); const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(r, [await T(q, 'Body/M Strong', 'text/primary', { w: 280 }), 'FILL'], await IC(a ? 'chevron-up' : 'chevron-down', 20, 'icon/muted')); add(it, [r, 'FILL']); if (a) add(it, [await T(a, 'Body/S', 'text/secondary', { w: 300 }), 'FILL']); add(fq, [it, 'FILL']); }
await mlic(C);
await mfinish(S, await sticky('Create free account', 'Terms apply · 18+ · Play responsibly'));
fitSection(sec);
await C.screenshot({ scale: 0.45 });
return { frame: S.f.id, content: C.id, h: S.f.height };
