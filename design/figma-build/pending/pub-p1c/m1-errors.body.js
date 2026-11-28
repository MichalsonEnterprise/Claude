// ===== m1: [PUB-24] 404 / 390 (Guest) · [PUB-25] 500 / 390 (Member) · [PUB-26] Maintenance / 390 (focused, no tab bar) =====
const M404 = '[PUB-24] 404 — Page not found / 390 / Default';
const M500 = '[PUB-25] 500 — Server error / 390 / Default';
const MMNT = '[PUB-26] Maintenance / 390 / Scheduled window — in progress, withdrawals available';
const shots = [];
async function tile(game, players, tag) { const p = { Art: ART[game], Players: players, 'House edge': game === 'Global Pool' ? 'Fee 0.05 USDT / entry' : 'House edge 1.00%' }; if (tag) { p['Show tag'] = true; p.Tag = tag; } const t = await I('28:16529', { State: 'Default' }, p); t.name = 'Tile/Game Generic — ' + game; t.rescale(171 / 160); return t; }
async function heading(C, chip, over, title, body) { const ov = AL('HORIZONTAL', { gap: 8, align: 'CENTER', wrap: true, cgap: 6 }); add(ov, chip, await T(over, 'Overline', 'text/brand')); add(C, [ov, 'FILL']); const v = AL('VERTICAL', { name: 'Title + intro', gap: 10 }); add(v, [await T(title, 'Heading/H2', 'text/primary', { w: 358 }), 'FILL'], [await T(body, 'Body/M', 'text/secondary', { w: 358 }), 'FILL']); add(C, [v, 'FILL']); }

if (need(M404)) {
  const S = await mshell(M404, 120, 160, { auth: 'Guest' }); const C = S.C;
  const b = mbanner(C, 'Banner — 404 art (cropped)', 230); const a = art404(); a.rescale(0.5); abs(b, a, 44, 18);
  await heading(C, await statusChip('warn', 'Error 404', 'alert-circle'), 'PAGE NOT FOUND', 'This page rolled off the table', 'The link may be mistyped, out of date, or the page moved when a promotion ended. Nothing you were doing has been lost.');
  const u = AL('VERTICAL', { name: 'Requested URL', gap: 6 }); const ur = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(ur, await T('You asked for', 'Caption', 'text/tertiary'), await DEMO('XS')); const chipU = AL('HORIZONTAL', { name: 'URL chip', fill: 'surface/raised', r: 6, p: [6, 10, 6, 10], gap: 6, align: 'CENTER' }); stroke(chipU, 'border/default'); add(chipU, await IC('link', 14, 'icon/muted'), await T('globalpool.example/promos/summer-race-2025', 'Mono/S', 'text/secondary')); add(u, ur, chipU); add(C, [u, 'FILL']);
  const srch = await I('16:3820', { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); srch.name = 'Input/Search — Search games, rounds…'; add(C, [srch, 'FILL']);
  await stack(C, [await BTN('Primary', 'Back to lobby', { size: 'L', lead: 'home' }), await BTN('Secondary', 'Contact support', { size: 'L', lead: 'chat' })]);
  const hl = AL('HORIZONTAL', { name: 'Helper links', gap: 20, align: 'CENTER' }); add(hl, await linkRow('System status', 'external-link'), await linkRow('Help centre')); add(C, hl);
  add(C, [await mhead('POPULAR RIGHT NOW', 'Jump back in', await DEMO('XS')), 'FILL']);
  const g = AL('HORIZONTAL', { name: 'Tiles — 2-column grid', gap: 16, wrap: true, cgap: 16 }); add(C, [g, 'FILL']);
  for (const [gm, n, tg] of [['Global Pool', '3,412', 'HOT'], ['Orbit Rush', '1,062', 'HOT'], ['Skyline', '206', 'NEW'], ['Vault Sweeper', '146']]) add(g, await tile(gm, n, tg));
  add(C, [await mhead('OR GO STRAIGHT TO', 'Where most people were heading'), 'FILL']);
  const ql = box('Quick links', { gap: 0, p: [4, 16, 4, 16] });
  add(ql, [await navRow('pool', 'Global Pool', 'Round #1,248 is open — 186,400.00 USDT, closes 27 Nov 2026, 20:00 UTC.', { line: true, demo: true, tint: 'accent/gold-tint', ic: 'icon/gold' }), 'FILL'], [await navRow('gift', 'Promotions', 'Welcome offer, daily rewards, rakeback. Terms apply.', { line: true }), 'FILL'], [await navRow('help-circle', 'Help centre', 'Fees, withdrawals, fairness and KYC.', { line: true }), 'FILL'], [await navRow('shield-check', 'Provably Fair', 'Check any draw or bet yourself.'), 'FILL']);
  add(C, [ql, 'FILL']);
  await mlic(C);
  await mfinish(S, { tab: 'Home' }); audit(S.f); shots.push(S.f);
}

if (need(M500)) {
  const S = await mshell(M500, 630, 160, { auth: 'Member' }); const C = S.C;
  const b = mbanner(C, 'Banner — 500 art (cropped)', 240, { block: 'status/danger-tint', stripe: 'status/danger' }); const a = art500(); a.rescale(0.5); abs(b, a, 56, 14);
  await heading(C, await statusChip('bad', 'Error 500', 'server'), 'SOMETHING BROKE ON OUR SIDE', 'This machine needs a restart', 'Transaction history didn’t load because of a problem on our servers — not your connection. Nothing was charged and nothing was lost.');
  const inc = box('Incident reference', { gap: 8, fill: 'surface/raised', stroke: 'border/default' });
  const ir = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ir, await T('INCIDENT REFERENCE', 'Overline', 'text/tertiary'), await DEMO('XS')); add(inc, ir);
  const idr = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(idr, [await T('INC-20261127-4F7A', 'Mono/M', 'text/primary'), 'FILL']); const cp = await I('7:774', { Type: 'Secondary', Size: 'L', State: 'Default' }, { Icon: ICONS.copy }); cp.name = 'Copy reference (44 px)'; add(idr, cp); add(inc, [idr, 'FILL']);
  add(inc, [await T('27 Nov 2026, 18:46:12 UTC · /account/history. Quote this reference to support so we can find the exact request.', 'Caption', 'text/secondary', { w: 326 }), 'FILL']); add(C, [inc, 'FILL']);
  const acts = await stack(C, [await BTN('Primary', 'Try again', { size: 'L', lead: 'refresh' }), await BTN('Secondary', 'Status page', { size: 'L', lead: 'activity', trail: 'external-link' }), await BTN('Ghost', 'Contact support', { size: 'L', lead: 'chat' })]);
  add(acts, [await T('Retrying is safe — it never repeats a deposit, withdrawal or entry.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
  const safe = box('Your money is safe', { gap: 0, p: [4, 16, 4, 16] });
  add(safe, [await navRow('shield-check', 'Available 9,215.30 USDT', 'Read from the ledger. Total 12,480.50 USDT incl. locked, pending and owed.', { line: true, demo: true, tint: 'status/success-tint', ic: 'text/success', chev: false }), 'FILL'], [await navRow('pool', 'Round #1,248 unaffected', 'Your 35 entries are recorded; entries close 20:00 UTC, the draw runs on Chainlink VRF.', { demo: true, tint: 'accent/gold-tint', ic: 'icon/gold', chev: false }), 'FILL']);
  add(C, [safe, 'FILL']);
  const st = box('What’s happening', { gap: 10 }); const sr = AL('HORIZONTAL', { gap: 8, align: 'CENTER', wrap: true, cgap: 6 }); add(sr, await statusChip('warn', 'Partial outage · Transaction history'), await DEMO('XS')); add(st, [sr, 'FILL'], [await T('Investigating since 18:44 UTC. Wallet, deposits, withdrawals, games and Global Pool: operational.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL'], await linkRow('status.globalpool.example', 'external-link')); add(C, [st, 'FILL']);
  await mlic(C);
  await mfinish(S, { tab: 'Wallet' }); audit(S.f); shots.push(S.f);
}

if (need(MMNT)) {
  const S = await mshell(MMNT, 1140, 160, { topbar: false, gap: 24 }); const C = S.C;
  const bar = AL('HORIZONTAL', { name: 'Top bar — maintenance mode', fill: 'bg/secondary', p: [6, 8, 6, 16], gap: 10, align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  const lm = await I('4:792'); lm.name = 'Brand/Logo Mark'; add(bar, lm, await statusChip('work', 'Maintenance', 'wrench')); const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(bar, [sp, 'FILL']);
  const sb = await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.activity }); sb.name = 'Status page (44 px)'; const hb = await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.chat }); hb.name = 'Support (44 px)'; add(bar, sb, hb);
  S.f.insertChild(1, bar); bar.layoutSizingHorizontal = 'FILL';
  const b = mbanner(C, 'Banner — ticket stub + wrench (cropped)', 220, { bx: 200 }); const tk = await ticket(0.72); abs(b, tk, 28, 52, 8); const wr = artWrench(); wr.rescale(0.5); abs(b, wr, 280, -18, -30);
  await heading(C, await statusChip('work', 'In progress · 02:12 UTC', 'wrench'), 'SCHEDULED MAINTENANCE', 'We’re upgrading the tables', 'Games are paused from 02:00 to 02:30 UTC on Tue 1 Dec 2026. Withdrawals remain available the whole time.');
  const win = box('Maintenance window', { gap: 12, fill: 'surface/raised', stroke: 'border/default' });
  const wr2 = AL('HORIZONTAL', { gap: 16 }); for (const [k, v] of [['Started', '02:00 UTC'], ['Expected back', '02:30 UTC']]) { const c = AL('VERTICAL', { gap: 4 }); add(c, await T(k, 'Caption', 'text/tertiary'), await T(v, 'Number/S', 'text/primary')); add(wr2, [c, 'FILL']); } add(win, [wr2, 'FILL']);
  add(win, [await T('Your time (Lisbon, WET): 02:00–02:30 — same as UTC', 'Caption', 'text/secondary', { w: 326 }), 'FILL']);
  const track = AL('HORIZONTAL', { name: 'Progress — 12 of 30 min', fill: 'surface/default', r: 9999, h: 8, clip: true }); add(track, rect(130, 8, 'brand/primary', 9999, 'Elapsed 40%')); add(win, [track, 'FILL']);
  const wc = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(wc, [await T('Back in about 18 min. If it runs late we post the new time here.', 'Caption', 'text/secondary', { w: 280 }), 'FILL'], await DEMO('XS')); add(win, [wc, 'FILL']); add(C, [win, 'FILL']);
  const av = box('Available now', { gap: 0, p: [12, 16, 4, 16] }); add(av, await statusChip('ok', 'Available now'));
  for (const [ic, t, d, l] of [['withdraw', 'Withdrawals on all 5 networks', 'Normal limits, fees and security checks.', true], ['log-in', 'Sign-in, account & security', 'Limits, 2FA and whitelisted addresses.', true], ['heart', 'Responsible gaming tools', 'Limits, cooling-off and self-exclusion.', false]]) add(av, [await navRow(ic, t, d, { line: l, chev: false }), 'FILL']);
  add(C, [av, 'FILL']);
  const pa = box('Paused until 02:30 UTC', { gap: 0, p: [12, 16, 4, 16] }); add(pa, await statusChip('pause', 'Paused until 02:30 UTC'));
  for (const [ic, t, d, l] of [['games', 'Originals & table games', 'New bets paused; open rounds settled at 02:00 UTC.', true], ['deposit', 'Deposit crediting', 'Still detected on-chain, credited after 02:30 UTC — don’t send twice.', true], ['gift', 'Promotion deadlines', 'Streaks and missions in the window get +30 min.', false]]) add(pa, [await navRow(ic, t, d, { line: l, chev: false, tint: 'status/warning-tint', ic: 'text/warning' }), 'FILL']);
  add(C, [pa, 'FILL']);
  const bal = box('Your balance & Global Pool', { gap: 0, p: [4, 16, 4, 16] });
  add(bal, [await navRow('shield-check', 'Balances don’t move', 'Nothing is debited, locked or expired by maintenance.', { line: true, chev: false }), 'FILL'], [await navRow('pool', 'No round is affected', 'Round #1,252 opens 1 Dec 2026, 08:00 UTC as scheduled.', { chev: false, tint: 'accent/gold-tint', ic: 'icon/gold' }), 'FILL']);
  add(C, [bal, 'FILL']);
  const up = box('Live updates', { gap: 0, p: [12, 16, 4, 16] }); const uh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 4, 0] }); add(uh, [await T('Live updates', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('M')); add(up, [uh, 'FILL']);
  const ups = [['02:12 UTC', 'Game servers 3 of 5 migrated — on schedule.'], ['02:00 UTC', 'Maintenance started; withdrawals online.'], ['26 Nov, 10:00 UTC', 'Announced by email and in-app (notice AN-88).']];
  for (let i = 0; i < ups.length; i++) { const r = AL('VERTICAL', { name: 'Update — ' + ups[i][0], gap: 4, p: [10, 0, 10, 0] }); if (i < ups.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, await T(ups[i][0], 'Mono/S', 'text/tertiary'), [await T(ups[i][1], 'Body/S', 'text/primary', { w: 326 }), 'FILL']); add(up, [r, 'FILL']); }
  add(C, [up, 'FILL']);
  await mlic(C, 'Responsible-gaming tools stay available during maintenance. 18+ · permitted jurisdictions only.');
  const stk = AL('VERTICAL', { name: 'Sticky CTA — pinned to viewport bottom', fill: 'bg/secondary', p: [12, 16, 4, 16], gap: 8 }); strokeSides(stk, 'border/subtle', { t: 1 });
  add(stk, [await BTN('Primary', 'Sign in to withdraw', { size: 'L', lead: 'withdraw' }), 'FILL'], [await BTN('Ghost', 'Status page', { size: 'L', lead: 'activity', trail: 'external-link' }), 'FILL']); homeIndicator(stk);
  await mfinish(S, { footer: false, tab: false, sticky: stk }); audit(S.f); shots.push(S.f);
}
fitSection(sec);
for (const f of shots) await f.screenshot({ scale: 0.6 });
return OUT;
