const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const sec = section('USR-RG1..RG7 Responsible gaming', 60000, 0);
const NAME = '[USR-RG1] Responsible Gaming Hub / 1440 / Default';
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellD(NAME, 'Overview', {});
const C = S.C; const W = 1136;
const sbar = await I('23:24937', { State: 'Normal' }); add(C, [sbar, 'FILL']);
async function toolCard(o, w) {
  const c = card('Card — ' + o.title, { gap: 16, p: 20 });
  const hd = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(c, [hd, 'FILL']);
  hd.appendChild(await iconTile(o.icon)); const tl = await T(o.title, 'Label/L', 'text/primary'); add(hd, [tl, 'FILL']);
  hd.appendChild(await chip(o.chip[0], o.chip[1], o.chip[2]));
  const vr = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); add(c, [vr, 'FILL']);
  vr.appendChild(await T(o.value, 'Number/M', 'text/primary')); if (o.unit) vr.appendChild(await T(o.unit, 'Body/S', 'text/secondary')); vr.appendChild(await DEMO('S'));
  if (o.pct != null) add(c, [meter(w - 40, o.pct, o.mc || 'brand/primary'), 'FILL']);
  add(c, [await T(o.meta, 'Body/S', 'text/secondary', { w: w - 40 }), 'FILL']);
  if (o.note) add(c, [await noteBox('hourglass', o.note, 'pending', w - 40), 'FILL']);
  const sp = AL('VERTICAL', { name: 'Spacer' }); add(c, [sp, 'FILL']); sp.layoutSizingVertical = 'FILL';
  c.appendChild(await BTN('Ghost', o.cta, { size: 'S', trail: 'chevron-right' }));
  return c;
}
const CW = Math.floor((W - 48) / 3);
C.appendChild(await secHead('Your limits', 'One set of limits across the Global Pool, Originals, table, live and slot games. Daily limits reset at 00:00 UTC; weekly limits on Monday 00:00 UTC.'));
const r1 = AL('HORIZONTAL', { name: 'Limits row 1', gap: 24 }); add(C, [r1, 'FILL']);
const cards1 = [
  { icon: 'deposit', title: 'Deposit limit', chip: ['clock', 'Increase pending', 'pending'], value: '5,000.00', unit: 'USDT / week', pct: 0.7, meta: 'Deposited 3,500.00 this week (incl. 1,000.00 still confirming) · resets Mon 30 Nov, 00:00 UTC', note: 'Increase to 7,500.00 starts 28 Nov 2026, 16:42 UTC. You can cancel it until then.', cta: 'Manage deposit limit' },
  { icon: 'ticket', title: 'Participation limit', chip: ['check-circle', 'On', 'success'], value: '500.00', unit: 'USDT / day', pct: 0.7035, meta: 'Used 351.75 today · 148.25 left · counts Global Pool entries (incl. platform fees) and game stakes', cta: 'Manage participation limit' },
  { icon: 'trending-down', title: 'Loss limit', chip: ['check-circle', 'On', 'success'], value: '200.00', unit: 'USDT / day', pct: 0.123, meta: 'Net result today −24.60 · 175.40 left before new bets pause until 00:00 UTC', cta: 'Manage loss limit' },
];
for (const o of cards1) { const c = await toolCard(o, CW); add(r1, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; }
const r2 = AL('HORIZONTAL', { name: 'Limits row 2', gap: 24 }); add(C, [r2, 'FILL']);
const cards2 = [
  { icon: 'timer', title: 'Time limit', chip: ['check-circle', 'On', 'success'], value: '2 h 00 min', unit: 'per day', pct: 0.6, meta: 'Played 1 h 12 min today · current session 00:42:18', cta: 'Manage time limits' },
  { icon: 'bell', title: 'Reality checks', chip: ['check-circle', 'On', 'success'], value: 'Every 60 min', unit: '', pct: null, meta: 'Next reminder at 17:00 UTC (session started 16:00 UTC). Shows time played and your net result.', cta: 'Change reminders' },
];
for (const o of cards2) { const c = await toolCard(o, CW); add(r2, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; }
const chk = card('Card — Self-check', { gap: 16, p: 20, fill: 'surface/raised' }); add(r2, [chk, 'FILL']); chk.layoutSizingVertical = 'FILL';
const chh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(chk, [chh, 'FILL']); chh.appendChild(await iconTile('help-circle', 'icon/brand', 40, 'surface/default')); add(chh, [await T('2-minute self-check', 'Label/L', 'text/primary'), 'FILL']);
add(chk, [await T('Nine private questions based on recognised screening tools. Answers are not stored with your account and never used for marketing.', 'Body/S', 'text/secondary', { w: CW - 40 }), 'FILL']);
add(chk, [await T('If gambling has stopped being fun, it is a good moment to set a limit or take a break.', 'Body/S', 'text/tertiary', { w: CW - 40 }), 'FILL']);
const sp2 = AL('VERTICAL', { name: 'Spacer' }); add(chk, [sp2, 'FILL']); sp2.layoutSizingVertical = 'FILL';
chk.appendChild(await BTN('Secondary', 'Start self-check', { size: 'S', trail: 'arrow-right' }));
// Need a pause
C.appendChild(await secHead('Need a pause?', 'Both options keep withdrawals open. Neither can be shortened once it starts — that is what makes them work.'));
const r3 = AL('HORIZONTAL', { name: 'Break row', gap: 24 }); add(C, [r3, 'FILL']);
const HW = Math.floor((W - 24) / 2);
async function pauseCard(icon, title, body, tags, btn, w) {
  const c = card('Card — ' + title, { gap: 16, p: 24 });
  const h = AL('HORIZONTAL', { name: 'Header', gap: 16, align: 'CENTER' }); add(c, [h, 'FILL']); h.appendChild(await iconTile(icon, 'icon/default', 48));
  const tt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(h, [tt, 'FILL']); tt.appendChild(await T(title, 'Heading/H5', 'text/primary')); add(tt, [await T(body, 'Body/S', 'text/secondary', { w: w - 112 }), 'FILL']);
  const tg = AL('HORIZONTAL', { name: 'Options', gap: 8 }); c.appendChild(tg); for (const t of tags) tg.appendChild(await tag(t));
  const ft = AL('HORIZONTAL', { name: 'Footer', gap: 12, align: 'CENTER' }); add(c, [ft, 'FILL']); add(ft, [await T('Not active', 'Body/S', 'text/tertiary'), 'FILL']); ft.appendChild(await BTN('Secondary', btn, { size: 'M' }));
  return c;
}
add(r3, [await pauseCard('pause-circle', 'Take a short break', 'Pause games, Global Pool entries and deposits. You can still log in, check your history and withdraw.', ['24 hours', '7 days', '30 days'], 'Choose a break', HW), 'FILL']);
add(r3, [await pauseCard('ban', 'Self-exclusion', 'Close access to every game and the Global Pool for a long period. Your balance stays withdrawable and all marketing stops.', ['6 months', '1 year', '5 years', 'Permanent'], 'Learn about self-exclusion', HW), 'FILL']);
// Help + rules
const r4 = AL('HORIZONTAL', { name: 'Help row', gap: 24 }); add(C, [r4, 'FILL']);
const help = await I('24:14743'); r4.appendChild(help);
const rules = card('Card — How limit changes work', { gap: 16, p: 24 }); add(r4, [rules, 'FILL']); rules.layoutSizingVertical = 'FILL';
rules.appendChild(await T('How limit changes work', 'Heading/H5', 'text/primary'));
const RW = W - 440 - 24 - 48;
add(rules, [await bullet('trending-down', 'Lower or add a limit — applies immediately', 'Takes effect on your next entry or bet, including in games you already have open.', RW), 'FILL']);
add(rules, [await bullet('hourglass', 'Raise or remove a limit — waits 24 hours', 'We confirm by email when the cool-down starts and again when it ends. Cancel any time before it ends and your current limit stays.', RW, 'status/pending'), 'FILL']);
add(rules, [await bullet('shield-check', 'Breaks and self-exclusion — fixed once started', 'They cannot be shortened or cancelled early. Withdrawals, history and support stay available throughout.', RW), 'FILL']);
add(rules, [await bullet('info', 'Same rules on every device', 'Limits are stored on your account, not in the browser, and apply on web and mobile alike.', RW, 'icon/muted'), 'FILL']);
await footD(C);
await placeD(S.f, sec, 120, 160);
const shot = await S.f.screenshot({ scale: 0.5 });
