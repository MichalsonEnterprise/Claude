// ===== d1: [PUB-24] 404 / 1440 / Default (Guest) + [PUB-25] 500 / 1440 / Default (Member) =====
const N404 = '[PUB-24] 404 — Page not found / 1440 / Default';
const N500 = '[PUB-25] 500 — Server error / 1440 / Default';
const shots = [];
async function tile(game, players, tag) { const p = { Art: ART[game], Players: players, 'House edge': game === 'Global Pool' ? 'Fee 0.05 USDT / entry' : 'House edge 1.00%' }; if (tag) { p['Show tag'] = true; p.Tag = tag; } const t = await I('28:16529', { State: 'Default' }, p); t.name = 'Tile/Game Generic — ' + game; return t; }

if (need(N404)) {
  const S = await shell(N404, 120, 160, { auth: 'Guest' }); const C = S.content;
  const { hero: H, copy } = await hero(C, 'Hero — 404 page not found', { cw: 500, bx: 720 });
  const ov = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(ov, await statusChip('warn', 'Error 404', 'alert-circle'), await T('PAGE NOT FOUND', 'Overline', 'text/brand')); add(copy, ov);
  add(copy, [await T('This page rolled off the table', 'Heading/H1', 'text/primary', { w: 500 }), 'FILL']);
  add(copy, [await T('The link may be mistyped, out of date, or the page was moved when a promotion ended. Nothing you were doing has been lost — pick up from the lobby or search below.', 'Body/L', 'text/secondary', { w: 500 }), 'FILL']);
  const url = AL('HORIZONTAL', { name: 'Requested URL', gap: 8, align: 'CENTER' }); const chipU = AL('HORIZONTAL', { name: 'URL chip', fill: 'surface/raised', r: 6, p: [6, 10, 6, 10], gap: 6, align: 'CENTER' }); stroke(chipU, 'border/default'); add(chipU, await IC('link', 14, 'icon/muted'), await T('globalpool.example/promos/summer-race-2025', 'Mono/S', 'text/secondary')); add(url, await T('You asked for', 'Caption', 'text/tertiary'), chipU, await DEMO('XS')); add(copy, url);
  const srch = await I('16:3820', { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); srch.name = 'Input/Search — Search games, rounds…'; add(copy, [srch, 'FILL']);
  const acts = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(acts, await BTN('Primary', 'Back to lobby', { size: 'L', lead: 'home' }), await BTN('Secondary', 'Contact support', { size: 'L', lead: 'chat' })); add(copy, acts);
  const hl = AL('HORIZONTAL', { name: 'Helper links', gap: 20, align: 'CENTER' }); add(hl, await linkRow('System status', 'external-link'), await linkRow('Help centre'), await T('Error code 404 · no data was changed', 'Caption', 'text/tertiary')); add(copy, hl);
  placeArt(H, art404(), 556, 28);
  // popular games
  const pop = AL('VERTICAL', { name: 'Popular right now', gap: 16 }); add(C, [pop, 'FILL']);
  const ch = await I('23:17672', {}, { Title: 'Popular right now', 'Show live dot': true, 'Show All': true, 'Show arrows': false }); ch.name = 'Row/Carousel Header — Popular right now'; add(pop, [ch, 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Track — 6 tiles', gap: 16 }); add(pop, [tr, 'FILL']);
  for (const [g, n, tg] of [['Global Pool', '3,412', 'HOT'], ['Orbit Rush', '1,062', 'HOT'], ['Skyline', '206', 'NEW'], ['Vault Sweeper', '146'], ['Pinfall', '100'], ['Pool Dice', '66']]) add(tr, await tile(g, n, tg));
  // quick links
  add(C, [await sectionHead('OR GO STRAIGHT TO', 'Where most people were heading'), 'FILL']);
  await row4(C, [
    await linkCard('pool', 'Global Pool', 'Round #1,248 is open — 186,400.00 USDT in the pool, entries close 27 Nov 2026, 20:00 UTC.', 'See the round', { demo: true, tint: 'accent/gold-tint', ic: 'icon/gold' }),
    await linkCard('gift', 'Promotions', 'Welcome offer, daily rewards, rakeback and the Orbit Rush Sprint. Key terms on every offer — terms apply.', 'View promotions'),
    await linkCard('help-circle', 'Help centre', 'Answers on fees, deposits, withdrawals, fairness and KYC, searchable in one place.', 'Open help centre'),
    await linkCard('shield-check', 'Provably Fair', 'Check any Global Pool draw or Originals bet yourself with the published seeds and VRF proofs.', 'Verify a result'),
  ]);
  await compliance(C);
  audit(S.f); shots.push(C);
}

if (need(N500)) {
  const S = await shell(N500, 1680, 160, { auth: 'Member' }); const C = S.content;
  const { hero: H, copy } = await hero(C, 'Hero — 500 server error', { cw: 520, bx: 740, block: 'status/danger-tint', stripe: 'status/danger' });
  const ov = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(ov, await statusChip('bad', 'Error 500', 'server'), await T('SOMETHING BROKE ON OUR SIDE', 'Overline', 'text/brand')); add(copy, ov);
  add(copy, [await T('This machine needs a restart', 'Heading/H1', 'text/primary', { w: 520 }), 'FILL']);
  add(copy, [await T('Transaction history didn’t load because of a problem on our servers — not your connection. Nothing was charged and nothing was lost: balances, entries and settled bets live in your account ledger, not on this page.', 'Body/L', 'text/secondary', { w: 520 }), 'FILL']);
  const inc = AL('VERTICAL', { name: 'Incident reference', fill: 'surface/raised', r: 14, p: [16, 16, 16, 20], gap: 8 }); stroke(inc, 'border/default');
  const ir = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ir, await T('INCIDENT REFERENCE', 'Overline', 'text/tertiary'), await DEMO('XS')); add(inc, ir);
  const idr = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(idr, [await T('INC-20261127-4F7A', 'Mono/M', 'text/primary'), 'FILL']); const cp = await I('7:774', { Type: 'Secondary', Size: 'M', State: 'Default' }, { Icon: ICONS.copy }); cp.name = 'Copy reference'; add(idr, cp); add(inc, [idr, 'FILL']);
  add(inc, [await T('27 Nov 2026, 18:46:12 UTC · GET /account/history · Quote this reference to support so we can find the exact request.', 'Caption', 'text/secondary', { w: 470 }), 'FILL']);
  add(copy, [inc, 'FILL']);
  const acts = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(acts, await BTN('Primary', 'Try again', { size: 'L', lead: 'refresh' }), await BTN('Secondary', 'Status page', { size: 'L', lead: 'activity', trail: 'external-link' }), await BTN('Ghost', 'Contact support', { size: 'L', lead: 'chat' })); add(copy, acts);
  add(copy, [await T('Retrying is safe — it never repeats a deposit, withdrawal or entry.', 'Caption', 'text/tertiary', { w: 520 }), 'FILL']);
  placeArt(H, art500(), 560, 30);
  // reassurance cards
  const rr = AL('HORIZONTAL', { name: 'Reassurance', gap: 16 }); add(C, [rr, 'FILL']);
  const c1 = box('Card — Your money is safe', { gap: 12 }); add(c1, await iconTile('shield-check', 'status/success-tint', 'text/success'), await T('Your money is safe', 'Heading/H5', 'text/primary'));
  const bal = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(bal, await T('9,215.30 USDT', 'Number/M', 'balance/available'), await DEMO('S')); add(c1, bal, [await T('Available balance, read straight from the ledger. Total balance 12,480.50 USDT incl. locked, pending and owed.', 'Body/S', 'text/secondary', { w: 300 }), 'FILL']);
  const c2 = box('Card — Round #1,248 is unaffected', { gap: 12 }); add(c2, await iconTile('pool', 'accent/gold-tint', 'icon/gold'), await T('Round #1,248 is unaffected', 'Heading/H5', 'text/primary'));
  const en = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(en, await T('35 entries', 'Number/M', 'text/primary'), await DEMO('S')); add(c2, en, [await T('Recorded on-chain. Entries close 27 Nov 2026, 20:00 UTC and the draw runs on Chainlink VRF whatever this page does.', 'Body/S', 'text/secondary', { w: 300 }), 'FILL']);
  const c3 = box('Card — What’s happening', { gap: 12 }); add(c3, await iconTile('activity', 'status/warning-tint', 'text/warning'), await T('What’s happening', 'Heading/H5', 'text/primary'));
  const stl = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(stl, await statusChip('warn', 'Partial outage · Transaction history'), await DEMO('XS')); add(c3, stl, [await T('Investigating since 18:44 UTC. Wallet, deposits, withdrawals, games and Global Pool: operational.', 'Body/S', 'text/secondary', { w: 300 }), 'FILL'], await linkRow('status.globalpool.example', 'external-link'));
  for (const c of [c1, c2, c3]) { add(rr, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; }
  add(C, [await sectionHead('WHILE WE FIX IT', 'Everything else is working'), 'FILL']);
  await row4(C, [
    await linkCard('wallet', 'Wallet', 'Balances, deposits and withdrawals — WD-20931 is still under review, decision by 22:44 UTC.', 'Open wallet', { demo: true }),
    await linkCard('ticket', 'My entries', '35 entries in round #1,248 (E-1248-00981 … E-1248-01015) and your past rounds.', 'View my entries', { demo: true, tint: 'accent/gold-tint', ic: 'icon/gold' }),
    await linkCard('games', 'Game lobby', 'Orbit Rush, Pool Dice, Double Side, Pool Roulette, Twenty-One and more.', 'Back to lobby'),
    await linkCard('heart', 'Responsible gaming', 'Limits, reality checks, cooling-off and self-exclusion stay available at all times.', 'Open RG tools'),
  ]);
  await compliance(C);
  audit(S.f); shots.push(C);
}
fitSection(sec);
for (const c of shots) await c.screenshot({ scale: 0.55 });
return OUT;
