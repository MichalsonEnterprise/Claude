// ===== m2 — [PUB-08] How It Works / 390 / Default =====
const N_HIW = '[PUB-08] How It Works / 390 / Default';
function vfill(n, name, fb = 'accent/gold') { if (VAR[name]) fill(n, name); else fill(n, fb); return n; }
if (!skipIf(/^\[PUB-08\].*\/ 390/, N_HIW)) {
  const S = await mshell(N_HIW, 630, 120); const C = S.C;
  add(C, [await pageHead('HOW IT WORKS', 'From deposit to draw in five steps', 'Global Pool is one shared prize pool per round. You buy entries with USDT, Chainlink VRF picks 13 winners at the published close time, and prizes land in your balance.', false), 'FILL']);
  // hero art: real product UI cropped by the frame edge on angled blocks
  const art = figma.createFrame(); art.name = 'Hero art — countdown + entry ticket (cropped)'; art.resize(358, 236); fill(art, 'surface/default'); radius(art, 20); stroke(art, 'border/subtle'); art.clipsContent = true; add(C, [art, 'FILL']);
  abs(art, rect(300, 600, 'accent/gold-tint', 0, 'Angled colour block — gold tint'), 190, -170, 18);
  abs(art, rect(36, 600, 'brand/primary', 0, 'Angled colour block — mint stripe'), 150, -170, 18);
  const dc = await I('24:13861', { State: 'Open' }); dc.name = 'Preview — Card/Draw Countdown (cropped)'; dc.rescale(0.72); abs(art, dc, 16, 16); await fx(dc, 'Elevation/3 — Popover');
  const tk = await I('23:8534', { State: 'Active' }); tk.name = 'Object — entry ticket (cropped)'; tk.rescale(0.55); abs(art, tk, 196, 140, -10);
  // five steps (vertical timeline)
  add(C, [await mhead('THE ROUND, STEP BY STEP', 'Five steps, nothing hidden', null, await DEMO('S')), 'FILL']);
  const steps = AL('VERTICAL', { name: 'Five steps — timeline', gap: 0 }); add(C, [steps, 'FILL']);
  const STEP = [
    ['1', 'Create your account', 'Sign up with email or a wallet and confirm you are 18+ and in a permitted region. KYC Level 2 (ID + liveness) is needed before your first withdrawal.', 'acct'],
    ['2', 'Deposit USDT', 'Pick one of five networks, copy your deposit address and send USDT. Only send on the network you picked — minimum deposit 10.00 USDT.', 'dep'],
    ['3', 'Buy entries', 'Each entry costs 10.00 USDT and all of it goes into the pool. The 0.05 USDT platform fee is charged per qualifying entry and is never part of the pool.', 'fee'],
    ['4', 'The round closes, Chainlink VRF draws', 'Entries freeze at the published close time — 27 Nov 2026, 20:00 UTC for round #1,248. The contract asks Chainlink VRF for a random number; nobody, including us, can choose or change it.', 'vrf'],
    ['5', 'Prizes reach your balance', 'Winners are settled on Arbitrum about two minutes after the close. Prizes move from Owed to Available and you can withdraw to a whitelisted address any time.', 'pay']];
  for (let i = 0; i < STEP.length; i++) {
    const [n, t, b, kind] = STEP[i];
    const row = AL('HORIZONTAL', { name: 'Step ' + n + ' — ' + t, gap: 16 }); add(steps, [row, 'FILL']);
    const rail = AL('VERTICAL', { name: 'Rail', gap: 0, align: 'CENTER' }); add(row, [rail, 'FILLH']);
    const nc = AL('HORIZONTAL', { name: 'Number', w: 32, h: 32, r: 9999, fill: 'brand/primary', align: 'CENTER', justify: 'CENTER' }); add(nc, await T(n, 'Label/M', 'text/on-primary')); add(rail, nc);
    if (i < STEP.length - 1) { const ln = rect(2, 40, 'border/default', 0, 'Connector'); add(rail, ln); ln.layoutSizingVertical = 'FILL'; }
    const col = AL('VERTICAL', { name: 'Step content', gap: 8, p: [4, 0, 32, 0] }); add(row, [col, 'FILL']);
    add(col, await T('STEP ' + n, 'Overline', 'text/tertiary'), [await T(t, 'Heading/H5', 'text/primary', { w: 300 }), 'FILL'], [await T(b, 'Body/S', 'text/secondary', { w: 300 }), 'FILL']);
    const pv = box('Product preview — ' + t, { gap: 10, p: 12, fill: 'surface/raised', r: 14 }); add(col, [pv, 'FILL']);
    if (kind === 'acct') { const w = chips('Account checks'); add(w, await I('6:159'), await statusChip('ok', 'Email verified'), await statusChip('ok', 'KYC Level 2'), await statusChip('ok', 'Portugal — permitted')); add(pv, [w, 'FILL']); }
    if (kind === 'dep') { const w = chips('Networks'); for (const [c, s] of [['BNB Chain', 'Operational'], ['Polygon', 'Operational'], ['Arbitrum', 'Operational'], ['Ethereum', 'Degraded'], ['Solana', 'Operational']]) { const p = await I('9:377', { Chain: c, Status: s }, { 'Show status label': false, 'Show chevron': false }); p.name = 'Wallet/Network Pill — ' + c; add(w, p); } add(pv, [w, 'FILL'], [await T('Ethereum is congested right now — Arbitrum, Polygon and Solana withdrawals cost under 0.10 USDT.', 'Caption', 'text/tertiary', { w: 276 }), 'FILL']); }
    if (kind === 'fee') { for (const [k, v, c] of [['Entry', '10.00 USDT', 'text/primary'], ['Platform fee', '0.05 USDT', 'text/primary'], ['Network fee', '0.00 USDT — paid from balance', 'text/secondary'], ['You pay per entry', '10.05 USDT', 'text/primary']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(k, k.startsWith('You') ? 'Body/S Strong' : 'Body/S', 'text/secondary'), 'FILL'], await T(v, 'Label/M', c)); add(pv, [r, 'FILL']); } const wl = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(wl, await IC('alert-triangle', 14, 'text/warning'), await T('You can lose your stake.', 'Caption', 'text/warning')); add(pv, wl); }
    if (kind === 'vrf') { for (const [tm, l, s] of [['20:00:00', 'Round #1,248 closes · 18,640 entries', 'ok'], ['20:00:04', 'VRF requested · 0x9f2c…e71a', 'ok'], ['20:00:41', 'Random word fulfilled · 3 confirmations', 'ok'], ['20:02:10', 'Winners settled on Arbitrum', 'ok']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await IC('check-circle', 14, 'text/success'), await T(tm, 'Mono/S', 'text/primary'), [await T(l, 'Caption', 'text/secondary', { w: 180 }), 'FILL']); add(pv, [r, 'FILL']); } const dr = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dr, await T('Times in UTC · example from round #1,248', 'Caption', 'text/tertiary'), await DEMO('XS')); add(pv, dr); }
    if (kind === 'pay') { const r = AL('HORIZONTAL', { name: 'Owed → Available', gap: 8, align: 'CENTER' }); const o = AL('VERTICAL', { gap: 2, p: [8, 12, 8, 12], r: 10, fill: 'accent/gold-tint' }); add(o, await T('OWED', 'Overline', 'text/gold'), await T('3,728.00', 'Number/S', 'text/gold')); const a = AL('VERTICAL', { gap: 2, p: [8, 12, 8, 12], r: 10, fill: 'status/success-tint' }); add(a, await T('AVAILABLE', 'Overline', 'text/success'), await T('+3,728.00', 'Number/S', 'text/success')); add(r, o, await IC('arrow-right', 18, 'icon/muted'), a, await DEMO('XS')); add(pv, [r, 'FILL'], [await T('Runner-up example · round #1,248 · withdraw from 20.00 USDT, platform withdrawal fee 0.00 USDT', 'Caption', 'text/tertiary', { w: 276 }), 'FILL']); }
  }
  // prize split
  add(C, [await mhead('PRIZE SPLIT', 'Where round #1,248’s pool goes', '13 winners per round. Every qualifying entry has the same chance — VIP level never changes the odds.', await DEMO('S')), 'FILL']);
  const ps = box('Prize split — round #1,248', { gap: 12, p: 16 }); add(C, [ps, 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Split bar (share × 326 px)', gap: 2 }); add(ps, [bar, 'FILL']);
  for (const [w, v, nm] of [[161, 'chart/prize-1', '1st 50%'], [64, 'chart/prize-2', '2nd 20%'], [32, 'chart/prize-3', '3rd 10%']]) { const s = rect(w, 12, null, 4, nm); vfill(s, v); add(bar, s); }
  for (let k = 0; k < 10; k++) { const s = rect(5, 12, null, 2, 'Runner-up ' + (k + 1) + ' 2%'); vfill(s, 'chart/prize-4', 'accent/gold-strong'); add(bar, s); }
  for (const [k, sh, v] of [['1st prize', '50%', '93,200.00'], ['2nd prize', '20%', '37,280.00'], ['3rd prize', '10%', '18,640.00'], ['10 runner-ups', '2% each', '3,728.00 each']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(sh, 'Caption', 'text/tertiary'), await T(v, 'Number/S', 'text/gold')); add(ps, [r, 'FILL']); }
  const tot = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [8, 0, 0, 0] }); strokeSides(tot, 'border/subtle', { t: 1 }); add(tot, [await T('Pool = 18,640 entries × 10.00', 'Body/S Strong', 'text/primary'), 'FILL'], await T('186,400.00 USDT', 'Number/S', 'text/gold')); add(ps, [tot, 'FILL']);
  // fees explained
  add(C, [await mhead('FEES', 'Every fee, on its own line', 'Platform fees for round #1,248: 18,640 × 0.05 = 932.00 USDT — kept separate from the pool.', await DEMO('S')), 'FILL']);
  add(C, [await kvList('Fee table', [['Entry price', '10.00 USDT → pool'], ['Platform fee', '0.05 USDT / entry'], ['Network fee on entries', '0.00 USDT'], ['Deposit network fee', 'paid by your wallet'], ['Withdrawal network fee', '0.01–2.40 USDT'], ['Platform withdrawal fee', '0.00 USDT']], { kw: 150 }), 'FILL']);
  const ex = box('Worked example — 35 entries', { gap: 10, p: 16, fill: 'bg/secondary' }); add(C, [ex, 'FILL']);
  const exh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(exh, await T('WORKED EXAMPLE', 'Overline', 'text/brand'), await DEMO('XS')); add(ex, exh);
  for (const [k, v, st] of [['35 entries × 10.00', '350.00 USDT', 'Label/M'], ['Platform fee 35 × 0.05', '1.75 USDT', 'Label/M'], ['You pay', '351.75 USDT', 'Number/S']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(v, st, 'text/primary')); add(ex, [r, 'FILL']); }
  add(ex, [await T('Chance of any prize ≈ 2.44% · chance of 1st ≈ 0.188% (35 of 18,640 entries). Most entries win nothing.', 'Caption', 'text/secondary', { w: 326 }), 'FILL']);
  add(ex, [await callout('warn', 'You can lose your stake', 'Only enter with money you can afford to lose. Entries can’t be cancelled after you confirm.'), 'FILL']);
  // threshold & refunds
  add(C, [await callout('info', 'No draw without a quorum — then everyone is refunded', 'A round draws only with at least 500 participants and a 50,000.00 USDT pool. Round #1,245 closed with 412 participants, so every entry and fee went back to players’ Owed balance.'), 'FILL']);
  // fairness
  const fa = box('Fairness', { gap: 12, p: 20 }); add(C, [fa, 'FILL']);
  add(fa, await T('FAIRNESS', 'Overline', 'text/brand'), [await T('Random, verifiable, untouchable', 'Heading/H4', 'text/primary', { w: 318 }), 'FILL']);
  for (const [ic, t, b] of [['shield-check', 'Chainlink VRF picks the winners', 'The random number and its proof are on Arbitrum — anyone can check them.'], ['users', 'Same chance for every entry', 'VIP level, deposit size or account age never change the odds.'], ['ban', 'No one can edit a result', 'Admins can’t pick winners, change a draw or pay out from the pool.']]) add(fa, [await iconRow(ic, t, b, { w: 250 }), 'FILL']);
  add(fa, [await BTN('Secondary', 'Verify a draw', { size: 'L', lead: 'shield-check' }), 'FILL']);
  // responsible gaming
  const rg = box('Responsible gaming', { gap: 12, p: 20, fill: 'bg/secondary' }); add(C, [rg, 'FILL']);
  const rgh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rgh, [await T('RESPONSIBLE GAMING', 'Overline', 'text/brand'), 'FILL'], await I('6:159')); add(rg, [rgh, 'FILL']);
  add(rg, [await T('Set your limits before you play', 'Heading/H4', 'text/primary', { w: 318 }), 'FILL']);
  for (const [ic, t, b] of [['sliders', 'Deposit & participation limits', 'Daily, weekly or monthly. Decreases apply at once; increases wait 24 h.'], ['timer', 'Reality checks', 'A reminder every 60 minutes with your time played and net result.'], ['pause-circle', 'Cooling-off & self-exclusion', '24 hours to permanent — always as easy as depositing.']]) add(rg, [await iconRow(ic, t, b, { w: 250 }), 'FILL']);
  add(rg, [await BTN('Secondary', 'Responsible gaming tools', { size: 'L', lead: 'heart' }), 'FILL'], [await T('Need to talk? GamCare · Gamblers Anonymous · Gambling Therapy', 'Caption', 'text/tertiary', { w: 318 }), 'FILL']);
  add(C, [await linkRow('More questions? Read the FAQ'), 'FILL']);
  await mlic(C, false);
  await mfinish(S, await sticky('Create free account', '18+ · permitted regions only · entries from 10.05 USDT'), 'Home');
  OUT.created[N_HIW] = S.f.id; EXIST[N_HIW] = S.f;
  fitSection(sec);
  await S.f.screenshot({ scale: 0.5 });
}
OUT.bounds = sec.children.map(c => [c.name, c.id, Math.round(c.x), Math.round(c.y), Math.round(c.height)]);
return OUT;
