// Mobile DI-05 history (x 2160) + DI-06 verified (x 2670)
async function mRollCard(r) { const [id, time, bet, tgt, ch, mult, roll, win, prof] = r;
  const c = AL('HORIZONTAL', { name: 'Roll card — ' + id, gap: 12, p: 12, r: 14, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' });
  const tile = AL('HORIZONTAL', { name: 'Icon tile', w: 40, h: 40, r: 10, align: 'CENTER', justify: 'CENTER', fill: win ? 'brand/tint' : 'status/danger-tint' }); add(tile, await IC(win ? 'check' : 'x', 20, win ? 'icon/brand' : 'status/danger')); add(c, tile);
  const col = AL('VERTICAL', { name: 'Roll text', gap: 2 }); add(c, col); grow(col); const r1 = AL('HORIZONTAL', { name: 'Roll id row', gap: 6, align: 'CENTER' }); add(r1, await T(id, 'Mono/S', 'text/primary'), await DEMO('XS')); add(col, r1); await wrapT(col, tgt + ' · ' + mult + ' · ' + time + ' UTC', 'Caption', 'text/secondary', 150, { name: 'Roll sub' });
  const v = AL('VERTICAL', { name: 'Values', gap: 2, align: 'MAX' }); add(v, await T(roll + (win ? ' · Win' : ' · Lose'), 'Label/M', win ? 'text/brand' : 'text/danger'), await T(prof, 'Number/S', win ? 'text/success' : 'text/danger')); add(c, v); add(c, await IC('chevron-right', 16, 'icon/muted')); return c; }
{ const shots = [];
  shots.push((await mk('[DI-05] History / 390 / My rolls — today', 2160, async () => { const S = await mShell('n', {}); const C = S.C;
    add(C, [await mBack('Pool Dice', 'My rolls', true), 'FILL'], [await mTabs('My rolls'), 'FILL']);
    for (const pair of [[['ROLLS TODAY', '36', '17 wins · 19 losses'], ['NET RESULT', '−24.60', 'USDT · today (UTC)', 'text/danger']], [['WAGERED', '360.00', 'USDT · avg 10.00'], ['PAID OUT', '335.40', 'USDT returned']]]) { const row = AL('HORIZONTAL', { name: 'KPI row', gap: 8 }); for (const [l, v, s, c] of pair) add(row, [await statTile(l, v, s, { style: 'Number/M', color: c }), 'FILL']); add(C, [row, 'FILL']); }
    const fr = AL('HORIZONTAL', { name: 'Filters', gap: 8, wrap: true, cgap: 8 }); for (const [l, s] of [['Today', true], ['7 days', false], ['30 days', false], ['All', true], ['Wins', false], ['Losses', false]]) add(fr, await filterChip(l, s)); add(C, [fr, 'FILL']);
    add(C, await T('TODAY · 27 NOV 2026 · NEWEST FIRST', 'Overline', 'text/tertiary'));
    for (const r of MY_ROLLS.slice(0, 7)) add(C, [await mRollCard(r), 'FILL']);
    add(C, [await BTN('Secondary', 'Load 10 more · 7 of 36 shown', { size: 'L', lead: 'refresh' }), 'FILL']);
    await wrapT(C, 'Each roll is independent — 0.00 to 99.99 are equally likely every time. Tap a roll to see its seeds and verify it.', 'Caption', 'text/tertiary', 358);
    add(C, [await mCompliance(), 'FILL']); await mFoot(S.f, { cta: { label: 'Back to game', lead: 'dice' }, ctaNote: false });
    return { f: S.f, notes: {} }; })).f);
  shots.push((await mk('[DI-06] Provably-fair verification / 390 / Roll D-88213 verified', 2670, async () => { const S = await mShell('n', {}); const C = S.C;
    add(C, [await mBack('Pool Dice', 'Verify a roll', true), 'FILL'], [await mTabs('Fairness'), 'FILL']);
    add(C, [await callout({ tone: 'success', icon: 'check-circle', title: 'Roll D-88213 verified', body: 'Recomputed from the revealed seeds: 73.21 — the same as the recorded result. Nothing here can change a result.' }), 'FILL']);
    for (const [l, v] of [['Roll ID', 'D-88213'], ['Server seed (revealed)', 'c71d0a58…5c27b14'], ['Committed hash (SHA-256)', '8f3c1e…e813'], ['Client seed', 'nova-k-7f2a91'], ['Nonce', '417']]) add(C, [await fieldBlock(l, [await DEMO('XS')], await inputBox({ name: l, value: v, style: 'Mono/S', h: 48, pr: 4, trail: [await iconBtn('copy', { type: 'Ghost', size: 'L' })] })), 'FILL']);
    add(C, await statusChip(true, 'Revealed seed hashes to the committed value'));
    const res = AL('VERTICAL', { name: 'Result compare', gap: 8, p: 12, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); for (const [l, v] of [['Recomputed roll', '73.21'], ['Recorded roll', '73.21'], ['Outcome', 'Win · over 50.50 · 2.0000×']]) add(res, [await kv(l, v, { vstyle: 'Body/S Strong', demo: true }), 'FILL']); add(C, [res, 'FILL']);
    add(C, [await stepCard('How it was computed', [['Commitment', 'The server seed hash was shown before you bet.', '8f3c1e…e813'], ['Inputs', 'Your client seed and nonce 417 — the 417th roll with this seed pair.', 'nova-k-7f2a91 · 417'], ['Roll', 'HMAC-SHA256 keyed with the server seed maps to 0.00 – 99.99: 73.21.', '73.21 ≥ 50.50 → Win']]), 'FILL']);
    add(C, [await BTN('Ghost', 'Report a problem with this roll', { size: 'L', lead: 'flag' }), 'FILL']);
    add(C, [await mCompliance(), 'FILL']); await mFoot(S.f, { cta: { label: 'Verify another roll', lead: 'shield-check', type: 'Secondary' }, ctaNote: false });
    return { f: S.f, notes: {} }; })).f);
  for (const f of shots) await f.screenshot({ scale: 0.5 }); }
