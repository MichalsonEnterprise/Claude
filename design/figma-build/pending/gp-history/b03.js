const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-08..11/13 History & edge states', 32000, 0);
const NAME = '[GP-09] Round Detail / 1440 / Cancelled → refunds (#1,245)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await shell(NAME, 'Global Pool', 1680, 160);
const top = row('Breadcrumb + actions', { justify: 'SPACE_BETWEEN' });
const acts = row('Actions', { gap: 8 }); add(acts, await BTN('Secondary', 'View cancellation on explorer', { lead: 'external-link' }), await BTN('Ghost', 'Refund rules', { lead: 'help-circle' }));
add(top, await crumbs(['Global Pool', 'Round history', 'Round #1,245']), acts); add(main, [top, 'FILL']);
add(main, [await subnav('Round history'), 'FILL']);
const rh = await I(C.RH, { Status: 'Cancelled' }); await O(rh, { Times: 'Opened 24 Nov 2026, 08:00 UTC · Closed 24 Nov 2026, 20:00 UTC · cancelled automatically at close', 'Countdown value': '20:00:00', 'Absolute time': '24 Nov 2026 · UTC' }, 'rh');
add(main, [rh, 'FILL']);
// Row A: threshold + your refund
const ra = row('Row — threshold & refund', { gap: 24, align: 'MIN' });
const th = await I(C.THR, { State: 'Not met' }); await O(th, { Round: 'Round #1,245 · closed 24 Nov 2026, 20:00:00 UTC', '~Minimums not met yet': 'Minimums not met at close', '~USDT to go': 'USDT short', '~participants to go': 'participants short' }, 'thr');
const yr = card('Card — Your refund', { gap: 16 });
const yh = row('Refund head', { gap: 16 }); const tile = AL('HORIZONTAL', { name: 'Icon tile', p: 12, fill: 'accent/gold-tint', r: 10 }); add(tile, await IC('coins', 24, 'balance/owed'));
const yc = col('Amount', { gap: 4 }); const ar = row('Amount row', { gap: 8 }); add(ar, await T('300.00 USDT', 'Number/L', 'balance/owed'), await DEMO('S')); add(yc, await T('YOUR REFUND · OWED TO YOU', 'Overline', 'text/tertiary'), ar);
add(yh, tile, [yc, 'FILL'], await badge('Pending', 'Settling 27 Nov, 21:00 UTC'));
add(yr, [yh, 'FILL']);
for (const [k, v, c] of [['Entry stakes · 30 × 10.00', '300.00 USDT → Owed', 'balance/owed'], ['Platform fees · 30 × 0.05', '1.50 USDT → Available (24 Nov, 20:01 UTC)', 'text/success'], ['Network fee', '0.00 USDT · paid by the platform', 'text/primary'], ['Settles to Available', '27 Nov 2026, 21:00 UTC · daily run', 'text/primary']]) add(yr, [await kv(k, v, { vc: c, demo: true }), 'FILL']);
add(yr, [line(), 'FILL']);
add(yr, [await T('Owed funds already count toward your total balance (12,480.50 USDT) and move to Available automatically. There is nothing to claim and nothing expires.', 'Body/S', 'text/secondary', { w: 500 }), 'FILL']);
const yb = row('Refund actions', { gap: 8 }); add(yb, await BTN('Secondary', 'View in wallet', { lead: 'wallet', size: 'S' }), await BTN('Ghost', 'How settlement works', { size: 'S' })); add(yr, yb);
add(ra, th, [yr, 'FILL']); add(main, [ra, 'FILL']);
// Row B: timeline + entries | facts + next round
const rb = row('Row — timeline & facts', { gap: 24, align: 'MIN' });
const left = col('Left column', { gap: 24 });
const tl = card('Card — Refund timeline');
add(tl, [await ttl('Refund timeline', { right: [await T('All times UTC', 'Caption', 'text/tertiary')] }), 'FILL']);
const hash = await I(C.HASH, { State: 'Default' }, { Hash: '0x6b2e…31f4', 'Show explorer link': true });
add(tl, [await stepper([
  { s: 'done', t: 'Round closed — threshold not met', d: '24 Nov 2026, 20:00:00 · 412 of 500 players · 41,200.00 of 50,000.00 USDT. No VRF request was made and no winners were drawn.' },
  { s: 'done', t: 'Cancellation recorded on-chain', d: '20:00:06 · GlobalPool v1.3.0 on Arbitrum One emitted RoundCancelled(#1,245).', extra: hash },
  { s: 'done', t: 'Platform fees reversed', d: '20:01 · 206.00 USDT returned to 412 players. Your 1.50 USDT is back in Available.' },
  { s: 'done', t: 'Stakes recorded as Owed', d: '20:01 · 41,200.00 USDT owed to 412 players. Your 300.00 USDT is in your Owed balance.' },
  { s: 'current', t: 'Settles to Available', d: 'Scheduled 27 Nov 2026, 21:00 · included in the daily settlement run on Arbitrum, usually under 5 minutes. No action needed.', tag: await badge('Pending', 'Scheduled') }]), 'FILL']);
add(left, [tl, 'FILL']);
const en = card('Card — Your entries');
add(en, [await ttl('Your 30 entries in this round', { right: [await BTN('Ghost', 'Show all 30 entries', { size: 'S', trail: 'chevron-right' })] }), 'FILL']);
const er = row('Entries row', { gap: 24, align: 'MIN' }); const tk = await I(C.TK, { State: 'Refunded' });
const ec = col('Entries summary', { gap: 12 });
for (const [k, v] of [['Entry IDs', 'E-1245-00383 … E-1245-00412'], ['Bought', '24 Nov 2026, 09:40 UTC'], ['Paid', '301.50 USDT (300.00 + 1.50 fees)'], ['Returned', '301.50 USDT in full']]) add(ec, [await lv(k, v, { vs: k === 'Entry IDs' ? 'Mono/S' : 'Body/S Strong', w: 260 }), 'FILL']);
add(er, tk, [ec, 'FILL']); add(en, [er, 'FILL']); add(left, [en, 'FILL']);
const right = col('Right column', { gap: 24 });
const fc = card('Card — Round facts', { gap: 12 });
add(fc, [await ttl('Round facts'), 'FILL']);
for (const [k, v] of [['Round window', '24 Nov, 08:00–20:00 UTC'], ['Players', '412 · min 500'], ['Qualifying entries', '4,120'], ['Pool at close', '41,200.00 USDT'], ['Platform fees', '206.00 USDT · reversed'], ['Randomness', 'Not requested'], ['Network', 'Arbitrum One']]) add(fc, [await kv(k, v), 'FILL']);
const ad = await I(C.ADDR, { Size: 'S', State: 'Default' }, { Address: '0x4b1d…77ce', 'Show DEMO': true });
add(fc, [await kv('GlobalPool v1.3.0', '', { node: ad }), 'FILL']);
const dc = await I(C.DC, { State: 'Open' });
add(right, [fc, 'FILL'], dc);
add(rb, [left, 'FILL'], right); right.resize(360, right.height); right.counterAxisSizingMode = 'FIXED'; right.primaryAxisSizingMode = 'AUTO';
add(main, [rb, 'FILL']);
await foot(main);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
