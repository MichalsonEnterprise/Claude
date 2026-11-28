const NAME = '[PUB-11] Affiliate Program / 1440 / Default — calculator';
const S = await shell(NAME, 1680, 120, 'Affiliates'); const C = S.content;
const { hero, copy } = await crumbHero(C, 'Affiliates', 'Hero — Affiliate program');
const ov = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ov, await IC('users', 16, 'icon/brand'), await T('AFFILIATE PROGRAM · FOR PARTNERS', 'Overline', 'text/brand')); add(copy, ov);
add(copy, [await T('Earn 20% of the platform fees your players pay', 'Heading/H1', 'text/primary', { w: 560 }), 'FILL']);
add(copy, [await T('Share your link. When players you refer buy Global Pool entries, you earn 20% of the 0.05 USDT platform fee on every qualifying entry for 12 months — paid to your balance in USDT.', 'Body/L', 'text/secondary', { w: 560 }), 'FILL']);
const pm = AL('HORIZONTAL', { name: 'Promise', gap: 8, align: 'CENTER', fill: 'brand/tint-subtle', r: 9999, p: [6, 12, 6, 10] }); add(pm, await IC('shield-check', 16, 'icon/brand'), await T('Never a share of player losses, deposits or stakes.', 'Body/S Strong', 'text/primary')); add(copy, pm);
const acts = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(acts, await BTN('Primary', 'Apply as a partner', { size: 'L' }), await BTN('Ghost', 'Read partner terms', { size: 'L', trail: 'arrow-right' })); add(copy, acts);
const tr = AL('HORIZONTAL', { name: 'Terms', gap: 8, align: 'CENTER' }); add(tr, await T('Partners must be 18+ and based in a permitted jurisdiction · Terms apply', 'Caption', 'text/tertiary'), await I('6:159'), await DEMO('S')); add(copy, tr);
abs(hero, rect(560, 820, 'brand/tint', 0, 'Angled colour block — mint tint'), 720, -170, 14);
abs(hero, rect(64, 820, 'brand/primary', 0, 'Angled colour block — mint stripe'), 650, -170, 14);
const tk = await I('23:8534', { State: 'Active' }); tk.name = 'Object — entry ticket (cropped)'; abs(hero, tk, 700, 372, -10);
const dash = AL('VERTICAL', { name: 'Preview — partner dashboard', fill: 'surface/overlay', stroke: 'border/default', r: 14, p: 20, gap: 14, w: 400 });
const dh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(dh, [await T('Partner dashboard · November 2026', 'Label/L', 'text/primary'), 'FILL'], await DEMO('XS')); add(dash, [dh, 'FILL']);
const lnk = AL('HORIZONTAL', { name: 'Referral link', fill: 'surface/raised', r: 10, p: [10, 12, 10, 12], gap: 8, align: 'CENTER' }); add(lnk, await IC('link', 16, 'icon/muted'), [await T('globalpool.example/r/PARTNER-0427', 'Mono/S', 'text/primary'), 'FILL'], await IC('copy', 16, 'icon/brand')); add(dash, [lnk, 'FILL']);
const st = AL('HORIZONTAL', { name: 'Stats', gap: 10, wrap: true, cgap: 10 }); add(dash, [st, 'FILL']);
for (const [k, v, c] of [['Referred players', '40', 'text/primary'], ['Qualifying entries', '4,800', 'text/primary'], ['Platform fees paid', '240.00 USDT', 'text/primary'], ['Your commission · 20%', '48.00 USDT', 'text/brand']]) { const s = AL('VERTICAL', { fill: 'surface/raised', r: 10, p: 12, gap: 4, w: 170 }); add(s, await T(k, 'Caption', 'text/tertiary'), await T(v, 'Number/M', c)); add(st, s); }
const np = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(np, await IC('calendar', 16, 'icon/muted'), await T('Next payout run Mon 30 Nov 2026, 10:00 UTC', 'Caption', 'text/secondary')); add(dash, np);
abs(hero, dash, 680, 48); await fx(dash, 'Elevation/3 — Popover');

// ---- commission model ----
add(C, [await head('HOW COMMISSION WORKS', 'One rate, on one transparent fee', 'Every Global Pool entry costs 10.00 USDT plus a 0.05 USDT platform fee shown as its own line. The full entry price goes to the prize pool — you earn a share of the fee only.', await DEMO('M')), 'FILL']);
const fw = box('Per-entry breakdown', { gap: 16, p: 24 }); add(C, [fw, 'FILL']);
const flow = AL('HORIZONTAL', { name: 'Flow', gap: 12, align: 'CENTER' }); add(fw, [flow, 'FILL']);
async function nd(title, val, sub, col, tnt) { const b = AL('VERTICAL', { name: 'Step — ' + title, fill: tnt || 'surface/raised', r: 14, p: 20, gap: 6 }); add(b, await T(title, 'Overline', 'text/tertiary'), await T(val, 'Number/L', col || 'text/primary'), [await T(sub, 'Caption', 'text/secondary', { w: 180 }), 'FILL']); return b; }
add(flow, [await nd('PLAYER PAYS', '10.05 USDT', 'for one entry: 10.00 entry price + 0.05 platform fee'), 'FILL_BOTH'], await IC('arrow-right', 20, 'icon/muted'),
  [await nd('PRIZE POOL', '10.00 USDT', '100% of the entry price goes to the pool (round #1,248: 186,400.00)', 'text/gold', 'accent/gold-tint'), 'FILL_BOTH'], await IC('arrow-right', 20, 'icon/muted'),
  [await nd('PLATFORM FEE', '0.05 USDT', 'pays for VRF draws, on-chain settlement and operations'), 'FILL_BOTH'], await IC('arrow-right', 20, 'icon/muted'),
  [await nd('YOUR COMMISSION', '0.01 USDT', '20% of the fee · GLOBAL POOL keeps 0.04 USDT', 'text/brand', 'brand/tint'), 'FILL_BOTH']);
const fwn = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(fwn, await IC('info', 14, 'icon/muted'), [await T('Entries are paid from the platform balance, so there is no network fee on entries. Network fees apply only to deposits and withdrawals and are always shown separately.', 'Caption', 'text/tertiary', { w: 900 }), 'FILL']); add(fw, [fwn, 'FILL']);
const cards = AL('HORIZONTAL', { name: 'Commission rules', gap: 16 }); add(C, [cards, 'FILL']);
for (const [t, ic, icCol, items, good] of [
  ['You earn on', 'check-circle', 'icon/brand', ['The 0.05 USDT platform fee on qualifying Global Pool entries', 'Players who sign up through your link, for 12 months', 'Entries in rounds that close and draw'], true],
  ['You never earn on', 'x-circle', 'text/danger', ['Player losses, net revenue or house edge', 'Deposits, withdrawals or network fees', 'Bonus funds, refunds or cancelled rounds'], false],
  ['Your players always get', 'users', 'icon/brand', ['The same odds, fees and limits as everyone else', 'A visible “Referred by” line in their account', 'Limits, reality checks and self-exclusion from day one'], true]]) {
  const b = box(t, { gap: 14 }); add(cards, [b, 'FILL_BOTH']);
  const h = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(h, await IC(ic, 20, icCol), await T(t, 'Heading/H5', 'text/primary')); add(b, h);
  for (const it of items) { const r = AL('HORIZONTAL', { gap: 8 }); add(r, await IC(good ? 'check' : 'x', 16, good ? 'icon/brand' : 'text/danger'), [await T(it, 'Body/S', 'text/secondary', { w: 280 }), 'FILL']); add(b, [r, 'FILL']); }
}

// ---- calculator ----
add(C, [await head('COMMISSION CALCULATOR', 'Estimate your monthly commission', 'Change the inputs to see exactly how commission is worked out. It is an illustration, not a forecast or a promise of income.', await DEMO('M')), 'FILL']);
const calc = box('Calculator', { dir: 'HORIZONTAL', gap: 0, p: 0, r: 20 }); calc.clipsContent = true; add(C, [calc, 'FILL']);
const inp = AL('VERTICAL', { name: 'Inputs', p: 32, gap: 20 }); add(calc, [inp, 'FILL']);
add(inp, await T('Your numbers', 'Heading/H5', 'text/primary'));
const chips = AL('HORIZONTAL', { name: 'Scenarios', gap: 8, align: 'CENTER', wrap: true, cgap: 8 }); add(chips, await T('Try a scenario', 'Label/M', 'text/secondary'));
for (const [l, s] of [['Starter · 10 players', 'Default'], ['Growing · 40 players', 'Selected'], ['Established · 250 players', 'Default']]) add(chips, await I('17:2766', { State: s }, { Label: l, 'Show icon': false }));
add(inp, [chips, 'FILL']);
const i1 = await I('13:762', { State: 'Filled', Size: 'L' }, { Label: 'Active referred players', 'Show leading icon': true, 'Leading icon': ICONS['users'], 'Show trailing icon': false, 'Show helper': true }); i1.name = 'Field — Active referred players'; txt(i1, 'Value text', '40'); txt(i1, 'Helper text', 'Players who bought at least one entry this month');
const i2 = await I('13:762', { State: 'Focus', Size: 'L' }, { Label: 'Qualifying entries per player, per month', 'Show leading icon': true, 'Leading icon': ICONS['ticket'], 'Show trailing icon': false, 'Show helper': true }); i2.name = 'Field — Entries per player'; txt(i2, 'Value text', '120'); txt(i2, 'Helper text', 'Average across your players — about 4 entries a day');
const rw = AL('HORIZONTAL', { gap: 16 }); add(rw, [i1, 'FILL'], [i2, 'FILL']); add(inp, [rw, 'FILL']);
const fixed = AL('HORIZONTAL', { name: 'Fixed values', gap: 16 }); add(inp, [fixed, 'FILL']);
for (const [k, v, n] of [['Platform fee per qualifying entry', '0.05 USDT', 'The same for every player and every round'], ['Your commission rate', '20%', 'Standard partner rate']]) { const b = AL('VERTICAL', { fill: 'surface/raised', r: 10, p: 16, gap: 4 }); const h = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(h, await IC('lock', 14, 'icon/muted'), await T(k, 'Label/M', 'text/secondary')); add(b, h, await T(v, 'Number/M', 'text/primary'), await T(n, 'Caption', 'text/tertiary')); add(fixed, [b, 'FILL']); }
add(inp, [await T('An entry qualifies when its round closes and draws. Entries refunded from cancelled rounds earn nothing.', 'Caption', 'text/tertiary', { w: 600 }), 'FILL']);
const res = AL('VERTICAL', { name: 'Result', fill: 'surface/raised', p: 32, gap: 16, w: 440 }); strokeSides(res, 'border/subtle', { l: 1 }); add(calc, [res, 'FILLH']);
const rh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rh, [await T('ESTIMATED COMMISSION · PER MONTH', 'Overline', 'text/tertiary'), 'FILL'], await DEMO('S')); add(res, [rh, 'FILL']);
add(res, await T('48.00 USDT', 'Number/XL', 'text/brand'));
const ls = AL('VERTICAL', { name: 'Working', gap: 0 }); add(res, [ls, 'FILL']);
for (const [k, v] of [['40 players × 120 entries', '4,800 entries'], ['4,800 × 0.05 USDT platform fee', '240.00 USDT'], ['240.00 × 20% commission', '48.00 USDT'], ['12 months at this pace', '≈ 576.00 USDT']]) { const r = AL('HORIZONTAL', { gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(v, 'Number/S', 'text/primary')); add(ls, [r, 'FILL']); }
const disc = AL('HORIZONTAL', { gap: 8, fill: 'status/info-tint', r: 10, p: 12 }); add(disc, await IC('info', 16, 'text/info'), [await T('Illustration only. Commission depends on real qualifying entries and is never based on what players lose.', 'Caption', 'text/secondary', { w: 320 }), 'FILL']); add(res, [disc, 'FILL']);
add(res, [await BTN('Primary', 'Apply as a partner', { size: 'L' }), 'FILL']);

// ---- payouts ----
add(C, [await head('PAYOUTS', 'Paid in the Monday run, in USDT', 'Commission is added round by round after each draw settles. Request a payout once you have 20.00 USDT or more — it is paid in the next Monday run, straight to your Available balance.'), 'FILL']);
const pay = AL('HORIZONTAL', { name: 'Payout schedule', gap: 16 }); add(C, [pay, 'FILL']);
const tl = box('Weekly cycle', { gap: 0, p: 24 }); add(pay, [tl, 'FILL']);
const cyc = [['activity', 'Accrues round by round', 'Added after each daily round draws and settles (draw 20:00 UTC). Entries refunded from cancelled rounds earn nothing.', 'Daily'], ['receipt', 'Weekly statement', 'Mon 00:00 – Sun 23:59 UTC, itemised by round ID. Download it as CSV from the partner dashboard.', 'Mon 00:00 UTC'], ['wallet', 'Request a payout', 'From 20.00 USDT, with KYC Level 2 and 2FA. Smaller amounts simply roll over — commission never expires.', 'Any time'], ['check-circle', 'Paid to Available', 'Requests made by Sunday 23:59 UTC are paid in USDT in Monday’s run. Payout fee 0.00 USDT. Withdraw it like any balance — network fee shown before you confirm (e.g. Arbitrum 0.08 USDT).', 'Mon 10:00 UTC']];
for (let i = 0; i < cyc.length; i++) { const [ic, t, d, when] = cyc[i];
  const r = AL('HORIZONTAL', { gap: 16, p: [14, 0, 14, 0] }); if (i < cyc.length - 1) strokeSides(r, 'border/subtle', { b: 1 });
  const ib = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 20, 'icon/brand'));
  const tx = AL('VERTICAL', { gap: 4 }); add(tx, await T(t, 'Body/M Strong', 'text/primary'), [await T(d, 'Body/S', 'text/secondary', { w: 420 }), 'FILL']);
  add(r, ib, [tx, 'FILL'], await T(when, 'Label/M', 'text/tertiary')); add(tl, [r, 'FILL']); }
const nx = AL('VERTICAL', { name: 'Next payout + history', gap: 16, w: 400 }); add(pay, [nx, 'FILLH']);
const npc = box('Next payout', { gap: 8, fill: 'brand/tint-subtle', stroke: 'border/brand' }); add(nx, [npc, 'FILL']);
const nh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(nh, [await T('NEXT PAYOUT RUN', 'Overline', 'text/brand'), 'FILL'], await DEMO('XS')); add(npc, [nh, 'FILL']);
add(npc, await T('Mon 30 Nov 2026, 10:00 UTC', 'Heading/H4', 'text/primary'), await T('For payout requests made by Sun 29 Nov 2026, 23:59 UTC', 'Body/S', 'text/secondary'));
const hist = box('Recent payouts', { gap: 0 }); add(nx, [hist, 'FILL_BOTH']);
const hh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(hh, [await T('Recent payouts — example partner', 'Label/L', 'text/primary'), 'FILL'], await DEMO('XS')); add(hist, [hh, 'FILL']);
for (const [d, a] of [['Mon 23 Nov 2026', '24.60 USDT'], ['Mon 9 Nov 2026', '23.10 USDT'], ['Mon 26 Oct 2026', '22.40 USDT']]) { const r = AL('HORIZONTAL', { gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 }); const b = await BADGE('Confirmed', 'S'); const bt = b.findOne(n => n.type === 'TEXT'); if (bt) bt.characters = 'Paid'; add(r, [await T(d, 'Body/S', 'text/secondary'), 'FILL'], await T(a, 'Number/S', 'text/primary'), b); add(hist, [r, 'FILL']); }

// ---- terms ----
add(C, [await head('PARTNER TERMS', 'Key terms in plain language', 'This summary is part of the partner agreement. Read the full terms before you apply.', await BTN('Secondary', 'Full partner terms', { trail: 'external-link' })), 'FILL']);
const tg = AL('HORIZONTAL', { name: 'Terms grid', gap: 16, wrap: true, cgap: 16 }); add(C, [tg, 'FILL']);
for (const [ic, t, d] of [
  ['id-card', 'Eligibility', '18+, based in a permitted jurisdiction, KYC Level 2 and 2FA on before your first payout.'],
  ['calendar', 'Commission period', '12 months from each referred player’s sign-up. Any rate change gets 30 days’ email notice.'],
  ['megaphone', 'Responsible marketing', 'Show 18+ and responsible-gaming links. No “guaranteed win”, “risk-free” or get-rich claims.'],
  ['ban', 'Restricted regions', 'Never promote in restricted countries or suggest VPNs or other ways around geo-blocks.'],
  ['user-x', 'No self-referral', 'Your own accounts, paid sign-ups or bonus abuse void the commission on those players.'],
  ['shield', 'Player protection first', 'If a referred player self-excludes or closes their account, commission on them stops at once.'],
  ['undo', 'Clawbacks', 'Commission on fraudulent or reversed activity can be clawed back — always with a written reason.'],
  ['scale', 'Checkable statements', 'Every statement line links to round IDs, so you can verify each payout yourself.']]) {
  const b = AL('HORIZONTAL', { name: 'Term — ' + t, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 20, gap: 14, w: 560 });
  const ib = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 20, 'icon/brand'));
  const tx = AL('VERTICAL', { gap: 4 }); add(tx, await T(t, 'Body/M Strong', 'text/primary'), [await T(d, 'Body/S', 'text/secondary', { w: 440 }), 'FILL']);
  add(b, ib, [tx, 'FILL']); add(tg, b); }
const band = AL('HORIZONTAL', { name: 'Apply band', fill: 'surface/default', stroke: 'border/brand', r: 20, p: 32, gap: 16, align: 'CENTER' }); add(C, [band, 'FILL']);
const bl = AL('VERTICAL', { gap: 8 }); add(bl, await T('Ready to partner with us?', 'Heading/H3', 'text/primary'), [await T('Applications are reviewed within 3 business days. Questions first? Write to partners@globalpool.example (placeholder address).', 'Body/M', 'text/secondary', { w: 560 }), 'FILL']); add(band, [bl, 'FILL']);
add(band, await DEMO('S'), await BTN('Secondary', 'Email the partner team', { size: 'L', lead: 'mail' }), await BTN('Primary', 'Apply as a partner', { size: 'L' }));
await licence(C);
S.f.primaryAxisSizingMode = 'AUTO'; fitSection(sec);
await hero.screenshot({ scale: 0.5 });
return { frame: S.f.id, content: C.id, hero: hero.id, calc: calc.id, h: S.f.height };
