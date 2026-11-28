const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-08..11/13 History & edge states', 32000, 0);
const NAME = '[GP-13] Edge state — Round cancelled, refund owed / 1440 / Hub banner (#1,245)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await shell(NAME, 'Global Pool', 6360, colY(6360));
const al = await I(C.ALERT, { Type: 'Warning', Layout: 'Inline' });
await O(al, { Title: 'Round #1,245 was cancelled — 300.00 USDT is owed back to you', Body: 'It closed on 24 Nov 2026 at 20:00 UTC below the draw threshold (412 of 500 players). Your 1.50 USDT in fees is already back in Available; the 300.00 USDT stake settles to Available on 27 Nov 2026 at 21:00 UTC. Nothing to claim.' }, 'alert'); await btnLabel(al, 'Button/Secondary — Switch network', 'View refund');
add(main, [al, 'FILL']);
add(main, [await phead(['Global Pool', 'Overview'], 'Global Pool', 'One global jackpot, drawn daily at 20:00 UTC with Chainlink VRF. 10.00 USDT per entry + 0.05 USDT platform fee.', [await BTN('Gold', 'Participate', { lead: 'ticket' }), await BTN('Ghost', 'How it works', { lead: 'help-circle' })]), 'FILL']);
add(main, [await subnav('Overview'), 'FILL']);
const rh = await I(C.RH, { Status: 'Open' }); add(main, [rh, 'FILL']);
const r = row('Row — your rounds', { gap: 24, align: 'MIN' });
const lc = card('Card — Your cancelled round');
add(lc, [await ttl('Your cancelled round', { right: [await badge('Pending', 'Refund owed')] }), 'FILL']);
const inner = row('Round + where the money is', { gap: 24, align: 'MIN' });
const cr = await I(C.CR, { Status: 'Cancelled' }); await O(cr, { '~29,640.00': '41,200.00', '~2,964': '4,120' }, 'cr');
const cb = await I(C.CBAL, { Type: 'Owed' }); await O(cb, { '~Updated 18:42 UTC': 'Updated 16:42 UTC' }, 'cb');
const wc = col('Where the money is', { gap: 12 }); add(wc, await T('WHERE YOUR 301.50 USDT IS', 'Overline', 'text/tertiary'));
add(wc, [await stepper([
  { s: 'done', t: 'Fees returned · 1.50 USDT', d: '24 Nov 2026, 20:01 UTC · credited to Available because entries in a cancelled round never qualify.' },
  { s: 'current', t: 'Stake owed · 300.00 USDT', d: 'Since 24 Nov 2026, 20:01 UTC · counted in your total balance (12,480.50 USDT) as Owed.', tag: await badge('Pending', 'Now') },
  { s: 'todo', t: 'Settles to Available', d: '27 Nov 2026, 21:00 UTC · daily settlement run on Arbitrum, usually under 5 minutes. Available then reads 9,515.30 USDT if nothing else changes.' }]), 'FILL']);
add(inner, cr, [wc, 'FILL']); add(lc, [inner, 'FILL']);
const rc = col('Right column', { gap: 16 });
const dc = await I(C.DC, { State: 'Open' });
const tip = card('Card — Notifications', { gap: 12 }); add(tip, [await ttl('We’ll tell you when it lands', { demo: false }), 'FILL'], [await T('You get an in-app and email notification when the refund reaches Available. You can withdraw Available funds at any time.', 'Body/S', 'text/secondary', { w: 300 }), 'FILL'], await BTN('Ghost', 'Notification settings', { size: 'S', trail: 'arrow-right' }));
add(rc, dc, [cb, 'FILL'], [tip, 'FILL']);
add(r, [lc, 'FILL'], rc); rc.resize(360, rc.height); rc.primaryAxisSizingMode = 'AUTO';
add(main, [r, 'FILL']);
await foot(main);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30), at: al.findAll(x => x.type === 'TEXT').map(t => t.name + '=' + t.characters.slice(0, 30)) };
