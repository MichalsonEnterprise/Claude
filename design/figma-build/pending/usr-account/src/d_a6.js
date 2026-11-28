async function a6() {
const NAME = '[USR-A6] Login History / 1440 / Suspicious sign-in flagged';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Login history', { sub: 'Every sign-in attempt on your account in the last 12 months. Flagged entries are unusual for you — check them and tell us if one wasn’t you.', actions: [await BTN('Secondary', 'Export CSV', { size: 'M', lead: 'download' })] });
const M = S.main;
// flagged banner
const fb = AL('HORIZONTAL', { name: 'Flagged sign-in', gap: 16, p: 20, fill: tk('status/warning-tint'), stroke: tk('status/warning', 'border/default'), r: 14 }); add(M, [fb, 'FILL']);
fb.appendChild(await iconTile('shield-alert', tk('status/warning', 'icon/default'), 48, 'surface/default'));
const ft = AL('VERTICAL', { name: 'Text', gap: 6 }); add(fb, [ft, 'FILL']);
const fh = AL('HORIZONTAL', { name: 'Title', gap: 8, align: 'CENTER' }); add(ft, [fh, 'FILL']); add(fh, [await T('Was this you? Windows · Edge in Madrid, Spain', 'Body/M Strong', 'text/primary', { w: 480 }), 'FILL']); fh.appendChild(await DEMO('S'));
add(ft, [await T('25 Nov 2026, 22:41 UTC · first sign-in from this device and from Spain · 2FA passed after 1 wrong code at 22:39 UTC. The session is still active.', 'Body/S', 'text/secondary', { w: 560 }), 'FILL']);
const fa = AL('HORIZONTAL', { name: 'Actions', gap: 8, p: [6, 0, 0, 0] }); ft.appendChild(fa); fa.appendChild(await BTN('Secondary', 'Yes, it was me', { size: 'S', lead: 'check' })); fa.appendChild(await BTN('Danger', 'No — secure my account', { size: 'S', lead: 'shield' }));
add(ft, [await T('Securing your account ends every session, revokes the Madrid device and asks you to set a new password. Your funds and pending withdrawal WD-20931 stay where they are.', 'Caption', 'text/tertiary', { w: 560 }), 'FILL']);
// filters
const fr = AL('HORIZONTAL', { name: 'Filters', gap: 8, align: 'CENTER' }); add(M, [fr, 'FILL']);
for (const [l, on] of [['All · 24', true], ['Successful · 19', false], ['Failed · 3', false], ['Flagged · 2', false]]) { const c = await tryy('chip ' + l, () => I('17:2766', { State: on ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false })); if (c) fr.appendChild(c); else fr.appendChild(await tag(l)); }
const spc = AL('HORIZONTAL', { name: 'Spacer' }); add(fr, [spc, 'FILL']);
fr.appendChild(await BTN('Secondary', 'Last 30 days', { size: 'S', lead: 'calendar', trail: 'chevron-down' }));
// table
const tb = AL('VERTICAL', { name: 'Table — Sign-ins', fill: 'bg/secondary', stroke: 'border/subtle', r: 14, clip: true }); add(M, [tb, 'FILL']);
const COLS = [['Date & time', 168], ['Device & method', 244], ['Location', 164], ['IP address', 152], ['Result', 128]];
const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default' }); add(tb, [hr, 'FILL']); strokeSides(hr, 'border/subtle', { b: 1 });
for (const [l, w] of COLS) {
  const h = await tryy('hdr ' + l, async () => { const x = await I('22:8309', { Align: 'Left', Sort: l === 'Date & time' ? 'Desc' : 'None' }, { Label: l, 'Show sort icon': l === 'Date & time' }); x.resize(w, x.height); return x; });
  if (h) hr.appendChild(h); else { const c = ALX('HORIZONTAL', { name: 'Header — ' + l, p: [12, 16, 12, 16], w }); c.appendChild(await T(l, 'Overline', 'text/tertiary')); hr.appendChild(c); }
}
const ROWS = [
  ['27 Nov 2026', '16:00 UTC', 'MacBook Pro · Chrome 131', 'Password + 2FA · this browser', 'Lisbon, Portugal', '85.243.•••.12', 'ok'],
  ['27 Nov 2026', '08:12 UTC', 'iPhone 15 · Safari', 'Password + 2FA', 'Lisbon, Portugal', '85.243.•••.12', 'ok'],
  ['26 Nov 2026', '21:14 UTC', 'iPhone 15 · Safari', 'Password + 2FA', 'Lisbon, Portugal', '85.243.•••.40', 'ok'],
  ['25 Nov 2026', '22:41 UTC', 'Windows · Edge 131', 'Password + 2FA · new device', 'Madrid, Spain', '213.97.•••.88', 'flag'],
  ['25 Nov 2026', '22:39 UTC', 'Windows · Edge 131', 'Wrong 2FA code · new device', 'Madrid, Spain', '213.97.•••.88', 'flagfail'],
  ['24 Nov 2026', '09:05 UTC', 'MacBook Pro · Chrome 131', 'Password + 2FA', 'Lisbon, Portugal', '85.243.•••.12', 'ok'],
  ['22 Nov 2026', '19:47 UTC', 'Unknown · Firefox 132', 'Wrong password', 'Sofia, Bulgaria', '46.10.•••.203', 'fail'],
  ['22 Nov 2026', '19:45 UTC', 'Unknown · Firefox 132', 'Wrong password · sign-in paused 15 min after this', 'Sofia, Bulgaria', '46.10.•••.203', 'fail'],
];
async function cell(w, a, b, o = {}) { const c = ALX('VERTICAL', { name: 'Cell', gap: 2, p: [12, 16, 12, 16], w }); add(c, [await T(a, o.mono ? 'Mono/S' : 'Body/S', 'text/primary', { w: w - 32 }), 'FILL']); if (b) add(c, [await T(b, 'Caption', o.bTone || 'text/tertiary', { w: w - 32 }), 'FILL']); return c; }
for (const r of ROWS) {
  const fl = r[6].startsWith('flag');
  const row = AL('HORIZONTAL', { name: 'Row — ' + r[0] + ' ' + r[1], align: 'CENTER', fill: fl ? tk('status/warning-tint', 'surface/default') : null });
  add(tb, [row, 'FILL']); strokeSides(row, fl ? tk('status/warning', 'border/default') : 'border/subtle', fl ? { l: 3 } : { b: 1 });
  row.appendChild(await cell(168, r[0], r[1]));
  row.appendChild(await cell(244, r[2], r[3], { bTone: r[6] === 'ok' ? 'text/tertiary' : tk('text/warning', 'text/secondary') }));
  row.appendChild(await cell(164, r[4], null));
  const ip = ALX('HORIZONTAL', { name: 'Cell — IP', gap: 6, p: [12, 16, 12, 16], w: 152, align: 'CENTER' }); ip.appendChild(await T(r[5], 'Mono/S', 'text/primary')); ip.appendChild(await DEMO('XS')); row.appendChild(ip);
  const rc = ALX('HORIZONTAL', { name: 'Result', gap: 6, p: [12, 12, 12, 12], w: 128 }); row.appendChild(rc);
  const m = { ok: ['check-circle', 'Success', 'success'], flag: ['alert-triangle', 'Flagged', 'warning'], flagfail: ['x-circle', 'Failed', 'danger'], fail: ['x-circle', 'Failed', 'danger'] }[r[6]];
  rc.appendChild(await chip(m[0], m[1], m[2]));
}
const pg = await tryy('pagination', async () => { const p = await I('23:16756', { Type: 'Cursor' }); add(tb, [p, 'FILL']); return p; });
if (!pg) { const pr = AL('HORIZONTAL', { name: 'Pagination', p: [12, 16, 12, 16], gap: 8, align: 'CENTER' }); add(tb, [pr, 'FILL']); add(pr, [await T('Newest first · 8 of 24 sign-ins', 'Body/S', 'text/secondary'), 'FILL']); pr.appendChild(await BTN('Secondary', 'Previous', { size: 'S', state: 'Disabled' })); pr.appendChild(await BTN('Secondary', 'Next', { size: 'S' })); }
// how flags work
const hw = AL('HORIZONTAL', { name: 'Info row', gap: 24 }); add(M, [hw, 'FILL']); const HW = Math.floor((MW - 24) / 2) - 48;
const h1 = card('Card — Why we flag', { gap: 12 }); add(hw, [h1, 'FILL']); h1.layoutSizingVertical = 'FILL';
h1.appendChild(await T('Why we flag a sign-in', 'Heading/H5', 'text/primary'));
for (const t of ['A device or browser we haven’t seen before', 'A country you haven’t signed in from', 'Several wrong passwords or 2FA codes in a row']) add(h1, [await check(t, true, HW, 'warning'), 'FILL']);
const h2 = card('Card — Failed attempts', { gap: 12 }); add(hw, [h2, 'FILL']); h2.layoutSizingVertical = 'FILL';
h2.appendChild(await T('Failed attempts from Sofia', 'Heading/H5', 'text/primary'));
add(h2, [await T('Two wrong passwords on 22 Nov 2026 were blocked before any code was asked. After repeated failures we pause sign-ins for 15 minutes and email you. Using a unique password keeps this harmless.', 'Body/S', 'text/secondary', { w: HW }), 'FILL']);
h2.appendChild(await BTN('Ghost', 'Change password', { size: 'S', trail: 'chevron-right' }));
await footA(S);
await place(S.f, sec, 0, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
