async function ma9() {
const NAME = '[USR-A9] Notification Preferences / 390 / Default';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellM(NAME, { back: 'Account', title: 'Notifications', sub: 'Security, account and responsible-gaming messages always reach you. Marketing stays off until you choose.' });
const C = S.C;
async function grp(title, note, rows, o = {}) {
  const c = card('Card — ' + title, { gap: 12, p: 16 }); add(C, [c, 'FILL']);
  const h = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(c, [h, 'FILL']); add(h, [await T(title, 'Heading/H5', 'text/primary'), 'FILL']); if (o.chip) h.appendChild(o.chip);
  if (note) add(c, [await T(note, 'Caption', 'text/tertiary', { w: IW }), 'FILL']);
  for (const [t, d, on, ch] of rows) {
    const b = AL('VERTICAL', { name: 'Pref — ' + t, gap: 8, p: [12, 0, 0, 0] }); strokeSides(b, 'border/subtle', { t: 1 }); add(c, [b, 'FILL']);
    const tg = await tryy('toggle ' + t, () => I('20:3309', { On: on ? 'Yes' : 'No', State: o.locked ? 'Disabled' : 'Default' }, { Label: t, Description: d, 'Show description': true }));
    if (tg) add(b, [tg, 'FILL']); else add(b, [await T(t, 'Body/S Strong', 'text/primary', { w: IW }), 'FILL']);
    if (ch) { const pr = AL('HORIZONTAL', { name: 'Channels', gap: 8, wrap: true, cgap: 8 }); add(b, [pr, 'FILL']); for (const [l, v] of ch) pr.appendChild(await pill(l, v)); }
  }
}
await grp('Account & security', 'Required to keep your account and money safe.', [
  ['Security alerts', 'New sign-ins, 2FA, password and whitelist changes', true, [['Email', true], ['Push', true], ['In-app', true]]],
  ['Transactions', 'Deposits credited, withdrawals sent or under review', true, [['Email', true], ['Push', true], ['In-app', true]]],
], { locked: true, chip: await chip('lock', 'Required', 'info') });
await grp('Rounds, games & money owed', null, [
  ['Global Pool rounds', 'Closing in 1 hour (real close time), draw results, your entries', true, [['Email', false], ['Push', true], ['In-app', true]]],
  ['Winnings & refunds', 'Prizes settled, refunds from cancelled rounds such as #1,245', true, [['Email', true], ['Push', true], ['In-app', true]]],
]);
await grp('Responsible gaming', 'In-app always on.', [
  ['Limits & reality checks', 'Limit reached, reality checks, cooling-off ending', true, [['Email', true], ['In-app', true]]],
], { locked: true, chip: await chip('lock', 'Always on', 'info') });
await grp('Marketing — opt-in', 'Off until you choose. Never sent during a break or self-exclusion. Turning it on records your consent with the date and time.', [
  ['Promotions & offers', 'Welcome offer, daily rewards, missions, tournaments — terms always included', false, null],
  ['VIP & rewards', 'Rakeback or cashback ready to claim, VIP level-ups', false, null],
  ['Product news', 'New games and features — at most once a month', false, null],
]);
const q = await tryy('select', () => I('13:565', { State: 'Default' }, { Label: 'Quiet hours', Value: '23:00 – 08:00 · Europe/Lisbon', 'Show helper': false, 'Show leading icon': false })); if (q) add(C, [q, 'FILL']);
add(C, [await T('Push and in-app banners wait until morning. Security alerts always come through. Every email shows your code AURORA-27.', 'Caption', 'text/tertiary', { w: W }), 'FILL']);
add(C, [await BTN('Ghost', 'Stop all marketing', { size: 'L', lead: 'volume-x' }), 'FILL']);
await licM(C);
await endM(S, { cta: [await BTN('Primary', 'Save preferences', { size: 'L' })] });
await placeM(S.f, sec, 8); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
