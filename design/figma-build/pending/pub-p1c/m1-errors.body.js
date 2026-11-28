// ===== m1: 390 frames for [PUB-24] 404 · [PUB-25] 500 · [PUB-26] Maintenance — copy mirrors the desktop frames
// 54:101512 / 82:102573 / 82:103376 (page 03, section 54:101508); auth state is read from each desktop top bar.
const M404 = '[PUB-24] 404 Not Found / 390 / Default';
const M500 = '[PUB-25] 500 Server Error / 390 / Default';
const MMNT = '[PUB-26] Maintenance / 390 / Scheduled — withdrawals available';
const shots = [];
async function authOf(id) { try { const f = await figma.getNodeByIdAsync(id); const tb = f && f.findOne(n => n.type === 'INSTANCE' && /Topbar/.test(n.name)); if (!tb) return 'Guest'; const mc = await tb.getMainComponentAsync(); return mc && /Member/.test(mc.name) ? 'Member' : 'Guest'; } catch (e) { return 'Guest'; } }
async function dtext(id, start, fb) { try { const f = await figma.getNodeByIdAsync(id); const t = f && f.findOne(n => n.type === 'TEXT' && n.characters.startsWith(start)); return t ? t.characters : fb; } catch (e) { return fb; } }
async function tile(game, players, tag) { const p = { Art: ART[game], Players: players, 'House edge': game === 'Global Pool' ? 'Fee 0.05 USDT / entry' : 'House edge 1.00%' }; if (tag) { p['Show tag'] = true; p.Tag = tag; } const t = await I('28:16529', { State: 'Default' }, p); t.name = 'Tile/Game Generic — ' + game; t.rescale(171 / 160); return t; }
async function heading(C, chip, title, body) { add(C, chip); const v = AL('VERTICAL', { name: 'Title + intro', gap: 10 }); add(v, [await T(title, 'Heading/H2', 'text/primary', { w: 358 }), 'FILL'], [await T(body, 'Body/M', 'text/secondary', { w: 358 }), 'FILL']); add(C, [v, 'FILL']); }
async function svcRow(ic, name, kind, label, note, line) { const r = AL('VERTICAL', { name: 'Service — ' + name, gap: 6, p: [12, 0, 12, 0] }); if (line) strokeSides(r, 'border/subtle', { b: 1 }); const h = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(h, await IC(ic, 18, 'icon/muted'), [await T(name, 'Body/S Strong', 'text/primary', { w: 150 }), 'FILL'], await statusChip(kind, label)); add(r, [h, 'FILL']); if (note) add(r, [await T(note, 'Caption', 'text/secondary', { w: 326 }), 'FILL']); return r; }
async function chip(label) { const c = await I('17:2766', { State: 'Default' }, { Label: label }); c.name = 'Chip — ' + label; return c; }

if (need(M404)) {
  const S = await mshell(M404, 120, 160, { auth: await authOf('54:101512') }); const C = S.C;
  const b = mbanner(C, 'Banner — 404 art (cropped)', 230); const a = art404(); a.rescale(0.5); abs(b, a, 44, 18);
  await heading(C, await statusChip('warn', 'Error 404 · Page not found', 'alert-circle'), 'This page rolled off the table', await dtext('54:101512', 'We couldn', 'We couldn’t find the page you asked for. The link may be out of date or the page has moved. Your balance, entries and open bets are not affected.'));
  const rq = AL('HORIZONTAL', { name: 'Requested', gap: 8, align: 'CENTER', wrap: true, cgap: 6 }); const chipU = AL('HORIZONTAL', { name: 'URL chip', fill: 'surface/raised', r: 6, p: [6, 10, 6, 10], gap: 6, align: 'CENTER' }); stroke(chipU, 'border/default'); add(chipU, await IC('link', 14, 'icon/muted'), await T('/promotions/autumn-raffle', 'Mono/S', 'text/secondary'));
  add(rq, await T('Requested', 'Caption', 'text/tertiary'), chipU, await T('· HTTP 404', 'Caption', 'text/tertiary')); add(C, [rq, 'FILL']);
  await stack(C, [await BTN('Primary', 'Back to lobby', { size: 'L', lead: 'home' }), await BTN('Secondary', 'Browse games', { size: 'L', lead: 'games' })]);
  const si = box('Search instead', { gap: 12 }); add(si, await T('Search instead', 'Heading/H5', 'text/primary'), [await T('Find a game, a round number or a help article.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const srch = await I('16:3820', { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); srch.name = 'Input/Search'; add(si, [srch, 'FILL'], await T('Popular searches', 'Caption', 'text/tertiary'));
  const cs = AL('HORIZONTAL', { name: 'Popular searches', gap: 8, wrap: true, cgap: 8 }); for (const l of ['Orbit Rush', 'Round #1,248', 'Withdrawals', 'Provably fair', 'Daily rewards', 'Responsible gaming']) add(cs, await chip(l)); add(si, [cs, 'FILL']); add(C, [si, 'FILL']);
  add(C, [await mhead('WHERE TO NEXT', 'Pick up where you were going'), 'FILL']);
  const ql = box('Where to next', { gap: 0, p: [4, 16, 4, 16] });
  add(ql, [await navRow('pool', 'Global Pool', 'Round #1,248 is open and closes 27 Nov 2026, 20:00 UTC.', { line: true, demo: true, tint: 'accent/gold-tint', ic: 'icon/gold' }), 'FILL'], [await navRow('gift', 'Promotions', 'Welcome offer, daily rewards and races — terms apply.', { line: true }), 'FILL'], [await navRow('help-circle', 'Help centre & support', 'Deposits, withdrawals, KYC and limits — or chat with support 24/7.', { line: true }), 'FILL']);
  const stR = await navRow('activity', 'Status page', 'Checked 27 Nov 2026, 16:42 UTC'); const stT = stR.children[1]; add(stT, await statusChip('ok', 'All systems operational')); add(ql, [stR, 'FILL']); add(C, [ql, 'FILL']);
  add(C, [await mhead('POPULAR RIGHT NOW', 'Jump back in', await DEMO('XS')), 'FILL']);
  const g = AL('HORIZONTAL', { name: 'Tiles — 2-column grid', gap: 16, wrap: true, cgap: 16 }); add(C, [g, 'FILL']);
  for (const [gm, n, tg] of [['Global Pool', '3,412', 'HOT'], ['Orbit Rush', '1,062', 'HOT'], ['Skyline', '206', 'NEW'], ['Vault Sweeper', '146', 'NEW']]) add(g, await tile(gm, n, tg));
  await mlic(C);
  await mfinish(S, { tab: 'Home' }); audit(S.f); shots.push(S.f);
}

if (need(M500)) {
  const S = await mshell(M500, 630, 160, { auth: await authOf('82:102573') }); const C = S.C;
  const b = mbanner(C, 'Banner — 500 art: out-of-order slot machine (cropped)', 240, { block: 'status/danger-tint', stripe: 'status/danger' }); const a = await art500(true); a.rescale(0.5); abs(b, a, 56, 14);
  await heading(C, await statusChip('bad', 'Error 500 · Server error', 'alert-triangle'), 'Something went wrong on our side', await dtext('82:102573', 'Our server hit', 'Our server hit an unexpected error while loading this page — it’s not something you did. Try again in a moment. If it keeps happening, check the status page or contact support.'));
  const inc = box('Reference ID', { gap: 10, fill: 'surface/raised', stroke: 'border/default' });
  const ir = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ir, await T('REFERENCE ID', 'Overline', 'text/tertiary'), await DEMO('XS')); add(inc, ir);
  const idr = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(idr, [await T('GP-500-7F3A-9C21', 'Mono/M', 'text/primary'), 'FILL']); const cp = await I('7:774', { Type: 'Secondary', Size: 'L', State: 'Default' }, { Icon: ICONS.copy }); cp.name = 'Copy reference (44 px)'; add(idr, cp); add(inc, [idr, 'FILL']);
  const tm = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(tm, await T('Time', 'Caption', 'text/tertiary'), await T('27 Nov 2026, 16:42:18 UTC', 'Mono/S', 'text/secondary')); add(inc, tm); add(C, [inc, 'FILL']);
  const acts = await stack(C, [await BTN('Primary', 'Try again', { size: 'L', lead: 'refresh' }), await BTN('Secondary', 'Status page', { size: 'L', lead: 'activity', trail: 'external-link' })]);
  const sf = AL('HORIZONTAL', { name: 'Still failing', gap: 6, align: 'CENTER', wrap: true, cgap: 0 }); add(sf, await IC('chat', 16, 'icon/muted'), await T('Still failing? Quote the reference ID —', 'Caption', 'text/secondary'), await linkRow('Contact support')); add(acts, [sf, 'FILL']);
  const safe = box('Reassurance', { gap: 0, p: [4, 16, 4, 16] });
  add(safe, [await navRow('shield-check', 'Your funds are safe', 'A server error never changes balances, entries or results. Every movement is written to the ledger first, and on-chain settlements are final.', { line: true, tint: 'status/success-tint', ic: 'text/success', chev: false }), 'FILL']);
  add(safe, [await navRow('pool', 'Global Pool keeps its schedule', 'Confirmed entries stay in the round; the close time and Chainlink VRF draw are not affected. Round #1,248 · closes 20:00 UTC.', { line: true, demo: true, tint: 'accent/gold-tint', ic: 'icon/gold', chev: false }), 'FILL']);
  add(safe, [await navRow('dice', 'Mid-game? Your bet is settled', 'The outcome is still settled from the committed seed. Check Bet history and verify it under Provably Fair.'), 'FILL']); add(C, [safe, 'FILL']);
  const st = box('Live status', { gap: 0, p: [14, 16, 4, 16] }); const sh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(sh, [await T('Live status', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('M')); add(st, [sh, 'FILL'], await T('Updated 27 Nov 2026, 16:42 UTC', 'Caption', 'text/tertiary'));
  add(st, [await svcRow('monitor', 'Website & lobby', 'warn', 'Degraded', 'Elevated error rate on some pages. Investigating since 16:38 UTC.', true), 'FILL'], [await svcRow('games', 'Games — Originals, tables, slots', 'ok', 'Operational', 'Bets and settlements running normally.', true), 'FILL'], [await svcRow('wallet', 'Wallet — deposits & withdrawals', 'ok', 'Operational', 'All 5 networks processing. Ethereum is congested (slower).', true), 'FILL'], [await svcRow('pool', 'Global Pool & VRF draws', 'ok', 'Operational', 'Round #1,248 open; draw scheduled 20:00 UTC.', false), 'FILL'], await linkRow('status.globalpool.example', 'external-link'));
  add(C, [st, 'FILL']);
  await mlic(C);
  await mfinish(S, { tab: 'Home' }); audit(S.f); shots.push(S.f);
}

if (need(MMNT)) {
  const S = await mshell(MMNT, 1140, 160, { auth: await authOf('82:103376'), gap: 24 }); const C = S.C;
  const b = mbanner(C, 'Banner — ticket stub + wrench (cropped)', 220, { bx: 200 }); const tk = await ticket(0.72); abs(b, tk, 26, 48, 8); const wr = artWrench(); wr.rescale(0.5); abs(b, wr, 282, -20, -30);
  await heading(C, await statusChip('work', 'Scheduled maintenance · AN-88', 'wrench'), 'Games are paused for a 30-minute upgrade', await dtext('82:103376', 'We’re upgrading', await dtext('82:103376', "We're upgrading", 'We’re upgrading the game servers and the ledger database. Withdrawals stay open the whole time and your balance is safe. Games reopen automatically when the work is done.')));
  const kv = box('Window & status', { gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised', stroke: 'border/default' });
  for (const [k, v, ic, i] of [['Window', '1 Dec 2026, 02:00 – 02:30 UTC', null, 0], ['Status', 'In progress', 'spinner', 1], ['Last update', '02:12 UTC', null, 2]]) { const r = AL('HORIZONTAL', { name: 'Row — ' + k, gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); if (i < 2) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: 100 }), 'FILL']); const vv = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); if (ic) add(vv, await IC(ic, 14, 'text/info')); add(vv, await T(v, 'Label/M', ic ? 'text/info' : 'text/primary')); add(r, vv); add(kv, [r, 'FILL']); }
  add(C, [kv, 'FILL']);
  const wd = box('Available to withdraw now', { gap: 8, fill: 'surface/selected', stroke: 'border/brand' }); add(wd, await T('Available to withdraw now', 'Caption', 'text/secondary')); const am = AL('HORIZONTAL', { gap: 6, align: 'MAX' }); add(am, await T('9,215.30', 'Number/L', 'balance/available'), await T('USDT', 'Label/M', 'text/secondary'), await DEMO('S')); add(wd, am);
  add(wd, [await T('Locked 1,850.00 · Pending 1,000.00 · Owed 415.20 USDT — locked funds include pending withdrawal WD-20931, which keeps processing.', 'Caption', 'text/secondary', { w: 326 }), 'FILL'], await linkRow('Go to wallet')); add(C, [wd, 'FILL']);
  add(C, [await mhead('WHAT WORKS DURING MAINTENANCE', 'Only play is paused'), 'FILL'], [await T('Everything that touches your money out of the platform stays open.', 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  const ww = box('What works during maintenance', { gap: 0, p: [4, 16, 4, 16] });
  const items = [['withdraw', 'Withdrawals', 'ok', 'Available', 'Request as usual from Wallet. Network fees are shown before you confirm; manual reviews may take a little longer tonight.'], ['shield-check', 'Limits, cooling-off & self-exclusion', 'ok', 'Available', 'Responsible-gaming tools keep working and changes apply as normal.'], ['chat', 'Support', 'ok', 'Available', 'Chat and email stay open 24/7.'], ['deposit', 'Deposits', 'clock', 'Credited after maintenance', 'Deposits sent now are detected on-chain and credited automatically after 02:30 UTC. Please don’t send them twice.'], ['games', 'Games', 'pause', 'Paused', 'Originals, table games, slots and live tables reopen at 02:30 UTC. All bets were closed and settled before 02:00 UTC.'], ['pool', 'Global Pool', 'pause', 'No open round', 'No round is open during this window. The next round opens as scheduled at 08:00 UTC.']];
  for (let i = 0; i < items.length; i++) { const [ic, n, k, l, d] = items[i]; add(ww, [await svcRow(ic, n, k, l, d, i < items.length - 1), 'FILL']); }
  add(C, [ww, 'FILL']);
  const pg = box('Progress', { gap: 0, p: [14, 16, 6, 16] }); add(pg, await T('Progress', 'Heading/H5', 'text/primary'));
  const steps = [['check-circle', 'text/success', 'New bets paused', '02:00 UTC'], ['check-circle', 'text/success', 'Open game rounds settled', '02:01 UTC'], ['spinner', 'text/info', 'Game servers & ledger database upgrade', 'In progress'], ['clock', 'icon/muted', 'Reconciliation check — ledger vs on-chain', 'Up next'], ['clock', 'icon/muted', 'Games reopen', 'by 02:30 UTC']];
  for (const [ic, col, t, w] of steps) { const r = AL('HORIZONTAL', { name: 'Step — ' + t, gap: 10, p: [10, 0, 10, 0], align: 'CENTER' }); add(r, await IC(ic, 18, col), [await T(t, 'Body/S', 'text/primary', { w: 200 }), 'FILL'], await T(w, 'Caption', col === 'icon/muted' ? 'text/tertiary' : col)); add(pg, [r, 'FILL']); }
  add(C, [pg, 'FILL']);
  const tg = await I('20:3309', { On: 'No', State: 'Default' }, { Label: 'Email me when games reopen', Description: 'Sent to n•••@example.com · off by default', 'Show description': true }); tg.name = 'Control/Toggle — Email me when games reopen (off)'; add(C, [tg, 'FILL']);
  const q = AL('HORIZONTAL', { name: 'Support line', gap: 6, align: 'CENTER', wrap: true, cgap: 0 }); add(q, await IC('chat', 16, 'icon/muted'), await T('Questions about a deposit or withdrawal?', 'Caption', 'text/secondary'), await linkRow('Contact support')); add(C, [q, 'FILL']);
  await mlic(C, 'Responsible-gaming tools stay available during maintenance. 18+ · permitted jurisdictions only.');
  const stk = AL('VERTICAL', { name: 'Sticky CTA — pinned above tab bar', fill: 'bg/secondary', p: [12, 16, 12, 16], gap: 8 }); strokeSides(stk, 'border/subtle', { t: 1 });
  const sr = AL('HORIZONTAL', { gap: 8 }); add(sr, [await BTN('Primary', 'Withdraw funds', { size: 'L', lead: 'withdraw' }), 'FILL'], [await BTN('Secondary', 'Status page', { size: 'L', trail: 'external-link' }), 'FILL']); add(stk, [sr, 'FILL']);
  await mfinish(S, { sticky: stk, tab: 'Wallet' }); audit(S.f); shots.push(S.f);
}
fitSection(sec);
for (const f of shots) await f.screenshot({ scale: 0.6 });
return OUT;
