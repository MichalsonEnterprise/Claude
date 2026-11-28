const STATE = '__STATE__';
const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const sec = section('USR-RG1..RG7 Responsible gaming', 60000, 0);
const LBL = { Default: 'Default — choose a break', Confirm: 'Confirm — 7 days', Active: 'Active — ends 4 Dec 2026, 16:42 UTC' };
const NAME = '[USR-RG6] Cooling-Off Period / 1440 / ' + LBL[STATE];
const old = byName(sec, NAME); if (old) old.remove();
const ACT = STATE === 'Active';
const bn = ACT ? await banner('pause-circle', 'Your 7-day break is on until 4 Dec 2026, 16:42 UTC', 'Games, Global Pool entries, deposits and promotions are paused. Withdrawals, history and support stay open. The break cannot be ended early.', 'info', [await DEMO('S'), await BTN('Secondary', 'Withdraw funds', { size: 'S', lead: 'withdraw' })]) : null;
const S = await shellD(NAME, 'Cooling-off', { title: 'Cooling-off period', sub: 'Step away for 24 hours, 7 days or 30 days. Your account stays open so you can withdraw and check your history, but you cannot play until the break ends.', banner: bn, noDeposit: ACT });
const C = S.C;
const row = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(C, [row, 'FILL']);
const left = AL('VERTICAL', { name: 'Left', gap: 24, w: 440 }); row.appendChild(left);
const right = AL('VERTICAL', { name: 'Right', gap: 24 }); add(row, [right, 'FILL']);
const cc = await I('24:14742', { State: STATE === 'Default' ? 'Default' : STATE === 'Confirm' ? 'Selected' : 'Active' }); add(left, [cc, 'FILL']); cc.name = 'RG/Cooling-Off Card';
const se = card('Card — Need longer', { gap: 12, p: 20, fill: 'surface/raised' }); add(left, [se, 'FILL']);
const seh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(se, [seh, 'FILL']); seh.appendChild(await iconTile('ban', 'icon/default', 32, 'surface/default')); add(seh, [await T('Need longer than 30 days?', 'Body/M Strong', 'text/primary'), 'FILL']);
add(se, [await T('Self-exclusion closes access for 6 months, 1 year, 5 years or permanently.', 'Body/S', 'text/secondary', { w: 392 }), 'FILL']);
se.appendChild(await BTN('Ghost', 'About self-exclusion', { size: 'S', trail: 'chevron-right' }));
const RWID = 1136 - 440 - 24;
const dur = card('Card — During your break', { gap: 20, p: 24 }); add(right, [dur, 'FILL']);
dur.appendChild(await T(ACT ? 'While your break is on' : 'During your break', 'Heading/H5', 'text/primary'));
const two = AL('HORIZONTAL', { name: 'Two lists', gap: 24 }); add(dur, [two, 'FILL']);
const LW = Math.floor((RWID - 48 - 24) / 2);
async function list(title, icon, tone, items) { const l = AL('VERTICAL', { name: 'List — ' + title, gap: 12 }); const hd = AL('HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); l.appendChild(hd); hd.appendChild(await IC(icon, 16, 'status/' + tone)); hd.appendChild(await T(title, 'Label/M', 'status/' + tone)); for (const [t, b] of items) { const it = AL('VERTICAL', { name: 'Item — ' + t, gap: 2, p: [12, 0, 0, 0] }); strokeSides(it, 'border/subtle', { t: 1 }); add(l, [it, 'FILL']); add(it, [await T(t, 'Body/S Strong', 'text/primary', { w: LW }), 'FILL']); add(it, [await T(b, 'Body/S', 'text/secondary', { w: LW }), 'FILL']); } return l; }
add(two, [await list('Paused', 'pause-circle', 'warning', [['Games and the Global Pool', 'No new bets or entries in any game.'], ['Deposits', 'Deposit addresses are hidden until the break ends.'], ['Promotions and marketing', 'No bonus offers, emails or push messages.']]), 'FILL']);
add(two, [await list('Still available', 'check-circle', 'success', [['Withdrawals', 'Withdraw your available balance at any time.'], ['History and statements', 'Entries, results and transactions stay visible.'], ['Support and help', 'Chat with support or reach a help organisation.']]), 'FILL']);
const oe = card('Card — Open entries', { gap: 12, p: 24 }); add(right, [oe, 'FILL']);
const oeh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(oe, [oeh, 'FILL']); oeh.appendChild(await iconTile('ticket', 'icon/gold')); add(oeh, [await T('Entries you already hold', 'Heading/H5', 'text/primary'), 'FILL']); oeh.appendChild(await DEMO('S'));
add(oe, [await T('Your 35 entries in Global Pool round #1,248 (350.00 USDT) stay in the draw, which closes 27 Nov 2026, 20:00 UTC. Any prize is credited to your balance and can be withdrawn during the break.', 'Body/S', 'text/secondary', { w: RWID - 48 }), 'FILL']);
if (ACT) {
  const wd = card('Card — Your balance', { gap: 12, p: 24 }); add(right, [wd, 'FILL']);
  const wdh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(wd, [wdh, 'FILL']);
  const wdt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(wdh, [wdt, 'FILL']); wdt.appendChild(await T('Available to withdraw', 'Body/S', 'text/secondary'));
  const wv = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); wdt.appendChild(wv); wv.appendChild(await T('9,215.30 USDT', 'Number/L', 'balance/available')); wv.appendChild(await DEMO('S'));
  wdh.appendChild(await BTN('Primary', 'Withdraw funds', { size: 'M', lead: 'withdraw' })); wdh.appendChild(await BTN('Ghost', 'View history', { size: 'M' }));
}
const help = await I('24:14743'); right.appendChild(help);
await footD(C);
const xs = { Default: 0, Confirm: 1, Active: 2 }[STATE];
if (STATE === 'Default') { await placeD(S.f, sec, 120, nextY(sec)); } else { const d = byName(sec, '[USR-RG6] Cooling-Off Period / 1440 / Default — choose a break'); await placeD(S.f, sec, 120 + xs * 1560, d ? d.y : nextY(sec)); }
if (STATE === 'Confirm') {
  scrimOver(S.f);
  const md = AL('VERTICAL', { name: 'Modal — Confirm 7-day break', gap: 20, p: 28, fill: 'surface/overlay', stroke: 'border/subtle', r: 20, w: 560 }); await fx(md, 'Elevation/4 — Modal');
  const mh = AL('HORIZONTAL', { name: 'Header', gap: 16 }); add(md, [mh, 'FILL']); mh.appendChild(await iconTile('pause-circle', 'icon/brand', 48));
  const mt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(mh, [mt, 'FILL']); mt.appendChild(await T('Start a 7-day break?', 'Heading/H4', 'text/primary')); add(mt, [await T('Please read this first. Once it starts, a break cannot be shortened or cancelled.', 'Body/S', 'text/secondary', { w: 440 }), 'FILL']);
  mh.appendChild(await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS['x'] }));
  const sm = AL('VERTICAL', { name: 'Summary', gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised', r: 14 }); add(md, [sm, 'FILL']);
  add(sm, [await kv('Starts', 'Now · 27 Nov 2026, 16:42 UTC'), 'FILL']);
  add(sm, [await kv('Ends', '4 Dec 2026, 16:42 UTC'), 'FILL']);
  add(sm, [await kv('Paused', 'Games, Global Pool, deposits, promotions', { demo: false }), 'FILL']);
  add(sm, [await kv('Still open', 'Withdrawals, history, support', { demo: false }), 'FILL']);
  add(sm, [await kv('Open entries', '35 entries in round #1,248 stay in the draw', { divider: false }), 'FILL']);
  add(md, [await noteBox('mail', 'We will email you when the break starts and when it ends. Your limits stay exactly as they are.', 'info', 504), 'FILL']);
  const mf = AL('HORIZONTAL', { name: 'Footer', gap: 12, justify: 'MAX' }); add(md, [mf, 'FILL']);
  mf.appendChild(await BTN('Secondary', 'Go back', { size: 'L' })); mf.appendChild(await BTN('Primary', 'Start 7-day break', { size: 'L' }));
  floatIn(S.f, md, 240 + Math.round((1200 - 560) / 2), 220);
}
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
