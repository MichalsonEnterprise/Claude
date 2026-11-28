async function ma6() {
const NAME = '[USR-A6] Login History / 390 / Suspicious flag';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellM(NAME, { back: 'Security', title: 'Login history', sub: 'Every sign-in attempt for the last 90 days. Flagged ones are unusual for you.' });
const C = S.C;
const fb = card('Flagged sign-in', { gap: 12, p: 16, fill: tk('status/warning-tint'), stroke: tk('status/warning', 'border/default') }); add(C, [fb, 'FILL']);
const fh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(fb, [fh, 'FILL']); fh.appendChild(await iconTile('shield-alert', tk('status/warning', 'icon/default'), 40, 'surface/default'));
const ft = AL('VERTICAL', { name: 'Text', gap: 2 }); add(fh, [ft, 'FILL']); add(ft, [await T('Was this you?', 'Body/M Strong', 'text/primary'), 'FILL']); add(ft, [await T('Windows PC · Edge · Madrid, Spain · 25 Nov 2026', 'Caption', 'text/secondary', { w: 240 }), 'FILL']); fh.appendChild(await DEMO('XS'));
add(fb, [await T('New device and new country. One wrong 2FA code was blocked at 18:58 UTC before the sign-in succeeded.', 'Body/S', 'text/primary', { w: IW }), 'FILL']);
add(fb, [await BTN('Secondary', 'Yes, it was me', { size: 'L' }), 'FILL']); add(fb, [await BTN('Danger', 'No — secure my account', { size: 'L' }), 'FILL']);
add(fb, [await T('Securing your account signs out every device and session at once.', 'Caption', 'text/tertiary', { w: IW }), 'FILL']);
const fr = ALX('HORIZONTAL', { name: 'Filter chips (scrolls)', gap: 8, w: W, clip: true }); add(C, [fr, 'FILL']);
for (const [l, on] of [['All', true], ['Flagged', false], ['Failed', false], ['Successful', false]]) { const c = await tryy('chip', () => I('17:2766', { State: on ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false })); fr.appendChild(c || await tag(l)); }
const R = [
  ['monitor', 'MacBook Pro · Chrome 131', '27 Nov 2026, 08:12 UTC · Lisbon', '85.243.•••.12 · this browser', 'ok'],
  ['smartphone', 'iPhone 15 · Safari', '27 Nov 2026, 07:40 UTC · Lisbon', '85.243.•••.40', 'ok'],
  ['monitor', 'Windows PC · Edge', '25 Nov 2026, 19:04 UTC · Madrid, Spain', '213.97.•••.88 · new device', 'flag'],
  ['monitor', 'Windows PC · Edge', '25 Nov 2026, 18:58 UTC · Madrid, Spain', '213.97.•••.88 · wrong 2FA code', 'flagfail'],
  ['globe', 'Linux · Firefox', '22 Nov 2026, 03:17 UTC · Frankfurt, Germany', '5 wrong passwords · locked 15 min', 'fail'],
];
const lst = list(C, 'List — Sign-ins');
for (let i = 0; i < R.length; i++) {
  const r = R[i]; const m = { ok: ['check-circle', 'Success', 'success'], flag: ['alert-triangle', 'Flagged', 'warning'], flagfail: ['x-circle', 'Failed', 'danger'], fail: ['x-circle', 'Failed', 'danger'] }[r[4]];
  const row = AL('HORIZONTAL', { name: 'Sign-in — ' + r[2], gap: 12, align: 'MIN', p: [12, 0, 12, 0] }); if (i < R.length - 1) strokeSides(row, 'border/subtle', { b: 1 }); add(lst, [row, 'FILL']);
  row.appendChild(await iconTile(r[0], r[4] === 'ok' ? 'icon/default' : tk('status/' + m[2], 'icon/default'), 36));
  const x = AL('VERTICAL', { name: 'Text', gap: 2 }); add(row, [x, 'FILL']);
  add(x, [await T(r[1], 'Body/S Strong', 'text/primary', { w: 180 }), 'FILL']); add(x, [await T(r[2], 'Caption', 'text/secondary', { w: 180 }), 'FILL']);
  const ip = AL('HORIZONTAL', { name: 'IP', gap: 6, align: 'CENTER' }); add(x, [ip, 'FILL']); add(ip, [await T(r[3], 'Mono/S', 'text/tertiary', { w: 140 }), 'FILL']); ip.appendChild(await DEMO('XS'));
  row.appendChild(await chip(m[0], m[1], m[2]));
}
add(C, [await BTN('Secondary', 'Load 20 more', { size: 'L' }), 'FILL']);
add(C, [await T('Showing 5 of 46 attempts · newest first. Repeated wrong passwords lock sign-in for 15 minutes and we email you.', 'Caption', 'text/tertiary', { w: W }), 'FILL']);
await licM(C);
await endM(S);
await placeM(S.f, sec, 5); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
