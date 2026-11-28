const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('GP — Mobile C', 175000, 0);
const NAME = '[GP-09] Round Detail / 390 / Cancelled → refunds (#1,245)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await mshell(NAME, 630, 160);
add(main, [await mhead('Round history', 'Round #1,245', 'Tue 24 Nov 2026 · 08:00–20:00 UTC · cancelled automatically at close.', await badge('Expired', 'Cancelled')), 'FILL']);
const cr = await I(C.CR, { Status: 'Cancelled' }); await O(cr, { '~29,640.00': '41,200.00', '~2,964': '4,120' }, 'cr'); add(main, [cr, 'FILL']);
const yr = card('Card — Your refund', { p: 16, gap: 12 });
const yh = row('Refund head', { gap: 12 }); const tile = AL('HORIZONTAL', { name: 'Icon tile', p: 10, fill: 'accent/gold-tint', r: 10 }); add(tile, await IC('coins', 20, 'balance/owed'));
const yc = col('Amount', { gap: 2 }); const ar = row('Amount row', { gap: 8 }); add(ar, await T('300.00 USDT', 'Number/M', 'balance/owed'), await DEMO('XS')); add(yc, await T('YOUR REFUND · OWED', 'Overline', 'text/tertiary'), ar);
add(yh, tile, [yc, 'FILL']); add(yr, [yh, 'FILL'], await badge('Pending', 'Settles 27 Nov, 21:00 UTC'));
for (const [k, v, c] of [['Stakes · 30 × 10.00', '300.00 → Owed', 'balance/owed'], ['Fees · 30 × 0.05', '1.50 → Available', 'text/success'], ['Network fee', '0.00 USDT', 'text/primary']]) add(yr, [await kv(k, v, { vc: c, vw: 150 }), 'FILL']);
add(yr, [await T('Owed funds already count toward your total balance and move to Available automatically. Nothing to claim, nothing expires.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
add(main, [yr, 'FILL']);
const tl = card('Card — Refund timeline', { p: 16, gap: 12 }); add(tl, [await ttl('Refund timeline', { s: 'Label/L' }), 'FILL']);
add(tl, [await stepper([
  { s: 'done', t: 'Closed — threshold not met', d: '20:00:00 UTC · 412 of 500 players · 41,200.00 of 50,000.00 USDT. No VRF request, no winners.' },
  { s: 'done', t: 'Cancellation on-chain', d: '20:00:06 UTC · RoundCancelled(#1,245) · tx 0x6b2e…31f4' },
  { s: 'done', t: 'Fees reversed · Stakes owed', d: '20:01 UTC · 1.50 USDT to Available, 300.00 USDT to Owed.' },
  { s: 'current', t: 'Settles to Available', d: '27 Nov 2026, 21:00 UTC · refund RF-1245-0042, batch 2 of 3 on Arbitrum, usually under 5 min.' }]), 'FILL']);
add(main, [tl, 'FILL']);
const en = await mcard('Your 30 entries', null, [['Entry IDs', 'E-1245-00383 … E-1245-00412', { vs: 'Mono/S' }], ['Paid', '301.50 USDT'], ['Returned', '301.50 USDT in full']]);
const tk = await I(C.TK, { State: 'Refunded' }); tk.rescale(326 / 400); add(en, tk);
add(main, [en, 'FILL']);
const ad = await I(C.ADDR, { Size: 'S', State: 'Default' }, { Address: '0x4b1d…77ce', 'Show DEMO': true });
add(main, [await mcard('Round facts', null, [['Players', '412 · min 500'], ['Qualifying entries', '4,120'], ['Pool at close', '41,200.00 USDT'], ['Platform fees', '206.00 · reversed'], ['Randomness', 'Not requested'], ['GlobalPool v1.3.0', '', { node: ad }]]), 'FILL']);
await mfoot(main);
await sticky(f, [await BTN('Secondary', 'Refund rules', { size: 'L' }), await BTN('Primary', 'View in wallet', { size: 'L', lead: 'wallet' })]);
await mtab(f);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
