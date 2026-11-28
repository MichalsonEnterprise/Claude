const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('GP — Mobile C', 175000, 0);
const NAME = '[GP-13] Edge state — Round cancelled, refund owed / 390 / Hub banner (#1,245)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await mshell(NAME, 2160, colY(2160));
const bn = AL('VERTICAL', { name: 'Banner — refund owed (inline; Alert/Banner is 720+)', p: 16, gap: 10, fill: 'status/warning-tint', stroke: 'border/default', r: 14 });
const bh = row('Head', { gap: 8, align: 'MIN' }); add(bh, await IC('alert-triangle', 20, 'status/warning'), [await T('Round #1,245 was cancelled — 300.00 USDT is owed back to you', 'Body/S Strong', 'text/primary', { w: 290 }), 'FILL']);
add(bn, [bh, 'FILL'], [await T('Below the draw threshold at close (412 of 500 players). Fees (1.50 USDT) are back in Available; the stake settles to Available on 27 Nov 2026, 21:00 UTC. Nothing to claim.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL'], await BTN('Secondary', 'View refund', { size: 'S', trail: 'arrow-right' }));
add(main, [bn, 'FILL']);
add(main, [await mhead(null, 'Global Pool', 'Drawn daily at 20:00 UTC with Chainlink VRF · 10.00 USDT + 0.05 USDT fee per entry.'), 'FILL']);
add(main, [await mtabs('Overview'), 'FILL']);
const dc = await I(C.DC, { State: 'Open' }); add(main, [dc, 'FILL']);
const cr = await I(C.CR, { Status: 'Cancelled' }); await O(cr, { '~29,640.00': '41,200.00', '~2,964': '4,120' }, 'cr'); add(main, [cr, 'FILL']);
const cb = await I(C.CBAL, { Type: 'Owed' }); await O(cb, { '~Updated 18:42 UTC': 'Updated 16:42 UTC' }, 'cb'); add(main, [cb, 'FILL']);
const st = card('Card — Where your refund is', { p: 16, gap: 12 }); add(st, [await ttl('Where your 301.50 USDT is', { s: 'Label/L' }), 'FILL']);
add(st, [await stepper([
  { s: 'done', t: 'Fees returned · 1.50', d: '24 Nov 2026, 20:01 UTC → Available.' },
  { s: 'current', t: 'Stake owed · 300.00', d: 'Counted in your total balance as Owed.' },
  { s: 'todo', t: 'Settles to Available', d: '27 Nov 2026, 21:00 UTC · Available then reads 9,515.30 USDT if nothing else changes.' }]), 'FILL']);
add(main, [st, 'FILL']);
await mfoot(main);
await sticky(f, [await BTN('Gold', 'Enter round #1,248', { size: 'L', lead: 'ticket' })]);
await mtab(f);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
