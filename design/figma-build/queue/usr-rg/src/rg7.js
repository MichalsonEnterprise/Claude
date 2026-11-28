const STEP = __STEP__;
const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const sec = section('USR-RG1..RG7 Responsible gaming', 60000, 0);
const LBL = { 1: 'Step 1 — Choose period', 2: 'Step 2 — Consequences (1 year)', 3: 'Step 3 — Confirm with password', 4: 'Active — until 27 Nov 2027, 16:45 UTC' };
const NAME = '[USR-RG7] Self-Exclusion / 1440 / ' + LBL[STEP];
const old = byName(sec, NAME); if (old) old.remove();
const ACT = STEP === 4;
const bn = ACT ? await banner('shield-check', 'Self-exclusion is active until 27 Nov 2027, 16:45 UTC', 'Games, the Global Pool, deposits and all marketing are closed for this account. You can still log in to withdraw, view your history and contact support. This cannot be reversed before the end date.', 'info', [await DEMO('S'), await BTN('Primary', 'Withdraw funds', { size: 'S', lead: 'withdraw' })]) : null;
const S = await shellD(NAME, 'Self-exclusion', { title: 'Self-exclusion', sub: 'If you want a long break from gambling, self-exclusion closes your access for the period you choose. We will not ask you to come back, and it cannot be undone early.', banner: bn, noDeposit: ACT });
if (ACT) { try { hidePromos(S.sb); } catch (e) {} }
const C = S.C;
const row = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(C, [row, 'FILL']);
const left = AL('VERTICAL', { name: 'Step', gap: 16, w: 520 }); row.appendChild(left);
const right = AL('VERTICAL', { name: 'Context', gap: 24 }); add(row, [right, 'FILL']);
const RWID = 1136 - 520 - 24; const BW = RWID - 48;
if (STEP !== 3) {
  const st = await I('25:14013', { Step: ['Choose period', 'Consequences', 'Confirm', 'Active'][STEP - 1] }); add(left, [st, 'FILL']); st.name = 'RG/Self-Exclusion Step';
  await txt(st, 'Indefinite', 'Permanent');
} else {
  const sc = card('Self-Exclusion Step — Confirm (password + typed confirmation)', { gap: 20, p: 28, fill: 'surface/default', r: 20 }); add(left, [sc, 'FILL']);
  const pr = AL('HORIZONTAL', { name: 'Progress', gap: 8 }); add(sc, [pr, 'FILL']);
  for (let i = 0; i < 3; i++) { const b = rect(10, 4, i < 3 ? 'brand/primary' : 'surface/raised', 9999, 'Segment ' + (i + 1)); pr.appendChild(b); b.layoutSizingHorizontal = 'FILL'; }
  sc.appendChild(await T('Step 3 of 3 · Confirm', 'Overline', 'text/tertiary'));
  add(sc, [await T('Confirm self-exclusion for 1 year', 'Heading/H4', 'text/primary'), 'FILL']);
  const sm = AL('VERTICAL', { name: 'Summary', gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised', r: 14 }); add(sc, [sm, 'FILL']);
  add(sm, [await kv('Period', '1 year', { demo: false }), 'FILL']);
  add(sm, [await kv('Starts', 'As soon as you confirm', { demo: false }), 'FILL']);
  add(sm, [await kv('Ends', '27 Nov 2027, 16:45 UTC'), 'FILL']);
  add(sm, [await kv('Early reversal', 'Not possible', { demo: false, divider: false, color: 'text/warning' }), 'FILL']);
  const pw = await I('14:1735', { State: 'Default', Strength: 'Empty' }, { Label: 'Your password', 'Show strength': false, 'Show requirements': false }); add(sc, [pw, 'FILL']);
  const ty = await I('13:762', { State: 'Default', Size: 'M' }, { Label: 'Type SELF-EXCLUDE to confirm', 'Show label': true, 'Show helper': true }); add(sc, [ty, 'FILL']);
  await txt(ty, 'Placeholder', 'SELF-EXCLUDE');
  const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I understand this cannot be reversed before 27 Nov 2027.', 'Show description': false }); add(sc, [cb, 'FILL']);
  const bt = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(sc, [bt, 'FILL']);
  bt.appendChild(await BTN('Ghost', 'Back', { size: 'L', lead: 'arrow-left' })); const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(bt, [sp, 'FILL']);
  bt.appendChild(await BTN('Danger', 'Self-exclude for 1 year', { size: 'L', state: 'Disabled' }));
  add(sc, [await T('The button unlocks when your password is entered, the phrase matches and the box is ticked. Leaving this page changes nothing.', 'Caption', 'text/tertiary', { w: 464 }), 'FILL']);
}
if (STEP === 1) {
  const alt = card('Card — Is a shorter break enough', { gap: 16, p: 24 }); add(right, [alt, 'FILL']);
  alt.appendChild(await T('Not sure you need this long?', 'Heading/H5', 'text/primary'));
  add(alt, [await T('There is no wrong choice — pick what feels right today. These shorter options also work:', 'Body/S', 'text/secondary', { w: BW }), 'FILL']);
  async function opt(icon, t, b, btn) { const r = AL('HORIZONTAL', { name: 'Option — ' + t, gap: 12, align: 'CENTER', p: 16, fill: 'surface/raised', r: 14 }); r.appendChild(await iconTile(icon, 'icon/brand', 40, 'surface/default')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(t, 'Body/S Strong', 'text/primary', { w: BW - 220 }), 'FILL']); add(tx, [await T(b, 'Body/S', 'text/secondary', { w: BW - 220 }), 'FILL']); r.appendChild(await BTN('Secondary', btn, { size: 'S' })); return r; }
  add(alt, [await opt('pause-circle', 'Cooling-off: 24 hours to 30 days', 'A short pause with the same protections.', 'Take a break'), 'FILL']);
  add(alt, [await opt('sliders', 'Lower your limits', 'Lower deposit, participation or time limits — applies at once.', 'Review limits'), 'FILL']);
  const reg = card('Card — Wider protection', { gap: 8, p: 24 }); add(right, [reg, 'FILL']);
  reg.appendChild(await T('Want to block other sites too?', 'Body/M Strong', 'text/primary'));
  add(reg, [await T('Self-exclusion here covers this GLOBAL POOL account and any new account opened with the same verified identity. Your national gambling regulator may run a register that covers every licensed operator, and blocking software can add another layer.', 'Body/S', 'text/secondary', { w: BW }), 'FILL']);
}
if (STEP === 2 || STEP === 3) {
  const mc = card('Card — Your money', { gap: 0, p: 24 }); add(right, [mc, 'FILL']);
  const mh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [0, 0, 8, 0] }); add(mc, [mh, 'FILL']); add(mh, [await T(STEP === 2 ? 'What happens to your money' : 'When you confirm', 'Heading/H5', 'text/primary'), 'FILL']); mh.appendChild(await DEMO('S'));
  add(mc, [await kv('Available balance · stays withdrawable', '9,215.30 USDT'), 'FILL']);
  add(mc, [await kv('35 open entries, round #1,248 · refunded per round rules', '+350.00 USDT'), 'FILL']);
  add(mc, [await kv('Owed (refund #1,245 + VIP reward) · credited', '+415.20 USDT'), 'FILL']);
  add(mc, [await kv('Deposit DP-77412 · credited when confirmed', '1,000.00 USDT'), 'FILL']);
  add(mc, [await kv('Withdrawal WD-20931 · keeps processing', '1,500.00 USDT'), 'FILL']);
  const tt = AL('HORIZONTAL', { name: 'Total', gap: 12, align: 'CENTER', p: [16, 0, 0, 0] }); add(mc, [tt, 'FILL']); add(tt, [await T('Total — all of it remains yours', 'Body/S Strong', 'text/primary'), 'FILL']); tt.appendChild(await T('12,480.50 USDT', 'Number/S', 'text/primary')); tt.appendChild(await DEMO('XS'));
  const wh = card('Card — Also changes', { gap: 16, p: 24 }); add(right, [wh, 'FILL']);
  wh.appendChild(await T('Also changes straight away', 'Heading/H5', 'text/primary'));
  add(wh, [await bullet('ban', 'Games, Global Pool and deposits close', 'Deposit addresses are removed; transfers sent to old addresses are returned or held for withdrawal.', BW), 'FILL']);
  add(wh, [await bullet('megaphone', 'All marketing stops', 'No bonus offers, emails, push messages or VIP contact for the whole period.', BW), 'FILL']);
  add(wh, [await bullet('lock', 'No reversal until the end date', 'Support cannot lift it early. When it ends, you must ask to reopen — nothing reopens automatically.', BW, 'icon/muted'), 'FILL']);
}
if (STEP === 4) {
  const wd = card('Card — Withdraw your balance', { gap: 0, p: 24 }); add(right, [wd, 'FILL']);
  const wdh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [0, 0, 12, 0] }); add(wd, [wdh, 'FILL']);
  const wdt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(wdh, [wdt, 'FILL']); wdt.appendChild(await T('Available to withdraw now', 'Body/S', 'text/secondary'));
  const wv = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); wdt.appendChild(wv); wv.appendChild(await T('9,980.50 USDT', 'Number/L', 'balance/available')); wv.appendChild(await DEMO('S'));
  wdh.appendChild(await BTN('Primary', 'Withdraw funds', { size: 'L', lead: 'withdraw' }));
  add(wd, [await kv('Available before self-exclusion', '9,215.30 USDT'), 'FILL']);
  add(wd, [await kv('Entries refunded · round #1,248, 35 entries', '+350.00 USDT'), 'FILL']);
  add(wd, [await kv('Owed amounts credited', '+415.20 USDT'), 'FILL']);
  add(wd, [await kv('Deposit DP-77412 · withdrawable once confirmed', '1,000.00 USDT'), 'FILL']);
  add(wd, [await kv('Withdrawal WD-20931 · under review, continues', '1,500.00 USDT', { divider: false }), 'FILL']);
  const nx = card('Card — What happens next', { gap: 16, p: 24 }); add(right, [nx, 'FILL']);
  nx.appendChild(await T('What happens next', 'Heading/H5', 'text/primary'));
  add(nx, [await bullet('mail', 'Confirmation sent to n•••@example.com', 'With your end date and how to reach support. Sent 27 Nov 2026, 16:45 UTC.', BW), 'FILL']);
  add(nx, [await bullet('calendar', 'On 27 Nov 2027', 'Your account stays closed until you ask to reopen it. We will not contact you to come back.', BW), 'FILL']);
}
const help = await I('24:14743'); right.appendChild(help);
await footD(C);
if (STEP === 1) await placeD(S.f, sec, 120, nextY(sec)); else { const d = byName(sec, '[USR-RG7] Self-Exclusion / 1440 / Step 1 — Choose period'); await placeD(S.f, sec, 120 + (STEP - 1) * 1560, d ? d.y : nextY(sec)); }
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
