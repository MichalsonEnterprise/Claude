async function a9() {
const NAME = '[USR-A9] Notification Preferences / 1440 / Default';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Notification preferences', { sub: 'Choose what we tell you about and where. Security messages can’t be switched off — they’re how we warn you about sign-ins and withdrawals.', actions: [await BTN('Primary', 'Save preferences', { size: 'M' })] });
const M = S.main;
async function tog(label, on, locked) { const t = await tryy('toggle ' + label, () => I('20:3309', { On: on ? 'Yes' : 'No', State: locked ? 'Disabled' : 'Default' }, { Label: label, 'Show description': false })); if (t) { t.name = 'Toggle — ' + label; return t; } return await tag(label + (on ? ' on' : ' off')); }
async function grp(title, sub, rows, o = {}) {
  const c = card('Card — ' + title, { gap: 0 }); add(M, [c, 'FILL']);
  await head(c, title, sub, CW, o.right || []);
  for (const [t, d, vals, locked] of rows) {
    const r = AL('HORIZONTAL', { name: 'Pref — ' + t, gap: 16, align: 'CENTER', p: [16, 0, 16, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(c, [r, 'FILL']);
    const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']);
    const tl = AL('HORIZONTAL', { name: 'Title', gap: 8, align: 'CENTER' }); tx.appendChild(tl); tl.appendChild(await T(t, 'Body/M Strong', 'text/primary')); if (locked) tl.appendChild(await chip('lock', 'Required', 'info'));
    if (d) add(tx, [await T(d, 'Body/S', 'text/secondary', { w: 380 }), 'FILL']);
    const tg = AL('HORIZONTAL', { name: 'Channels', gap: 16, align: 'CENTER' }); r.appendChild(tg);
    for (let i = 0; i < 3; i++) { const cell = ALX('HORIZONTAL', { name: 'Channel', w: 112 }); tg.appendChild(cell); const ch = ['Email', 'Push', 'In-app'][i]; if (vals[i] === null) { const na = AL('VERTICAL', { name: 'N/A', gap: 0 }); na.appendChild(await T(ch, 'Label/S', 'text/tertiary')); na.appendChild(await T('Not offered', 'Caption', 'text/disabled')); cell.appendChild(na); } else cell.appendChild(await tog(ch, vals[i], locked)); }
  }
  return c;
}
await grp('Security & account', 'Always sent by email and in-app, each with your anti-phishing code AURORA-27.', [
  ['New sign-ins and devices', 'Every new device or browser, and blocked sign-in attempts.', [true, true, true], true],
  ['Password, 2FA and withdrawal-address changes', 'So nobody can change your security settings unnoticed.', [true, true, true], true],
]);
await grp('Wallet', null, [
  ['Deposits credited', 'When a deposit reaches its required confirmations.', [true, true, true]],
  ['Withdrawal status', 'Under review, sent, completed or returned to Available.', [true, true, true]],
]);
await grp('Global Pool & games', 'Only about rounds and games you already joined — never nudges to buy more entries.', [
  ['Results for my entries', 'When a round you entered is drawn and settled.', [false, true, true]],
  ['Closing reminder for my rounds', 'One reminder 1 hour before a round you entered closes.', [false, false, true]],
  ['Tournament standings', 'Weekly results for tournaments you joined.', [false, false, true]],
]);
await grp('Offers & news', 'Off unless you switch it on. Never sent while a cooling-off period or self-exclusion is active. Unsubscribe from any email in one tap.', [
  ['Promotions, bonuses and news', 'Welcome offers, missions, cashback and tournaments.', [false, false, false]],
  ['VIP and rewards updates', 'Level-ups and rewards ready to claim.', [false, true, true]],
]);
await grp('Responsible gaming', null, [
  ['Reality checks', 'In-app reminder every 60 min with time played and net result. Change the interval in Responsible gaming.', [null, null, true], true],
  ['Limit changes', 'Confirmations when a limit is lowered, or when a raised limit starts after its 24-hour wait.', [true, null, true], true],
]);
const dl = card('Card — Delivery', { gap: 16 }); add(M, [dl, 'FILL']);
await head(dl, 'Delivery', null, CW, [await DEMO('S')]);
const dr = AL('HORIZONTAL', { name: 'Delivery row', gap: 16 }); add(dl, [dr, 'FILL']);
for (const [l, v] of [['Quiet hours for push', '23:00 – 08:00 · Europe/Lisbon'], ['Language', 'English']]) { const s = await tryy('select ' + l, () => I('13:565', { State: 'Default' }, { Label: l, Value: v, 'Show helper': false, 'Show leading icon': false })); if (s) add(dr, [s, 'FILL']); }
add(dl, [await kv('Email address', 'n•••@example.com · verified', { divider: false }), 'FILL']);
add(dl, [await kv('Push notifications', 'iPhone 15 · allowed in iOS settings', { divider: false }), 'FILL']);
const sv = AL('HORIZONTAL', { name: 'Save row', gap: 12, align: 'CENTER', p: [16, 0, 0, 0] }); strokeSides(sv, 'border/subtle', { t: 1 }); add(dl, [sv, 'FILL']);
add(sv, [await T('Last saved 2 Nov 2026, 09:12 UTC', 'Caption', 'text/tertiary'), 'FILL']); sv.appendChild(await BTN('Secondary', 'Reset to recommended', { size: 'S' })); sv.appendChild(await BTN('Primary', 'Save preferences', { size: 'S' }));
await footA(S);
await place(S.f, sec, 3, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
