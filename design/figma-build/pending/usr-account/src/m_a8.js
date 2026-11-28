async function ma8(STATE) {
const END = STATE === 'End all';
const BASE = '[USR-A8 · MOB-09] Session Management / 390 / Default';
const NAME = END ? '[USR-A8 · MOB-09] Session Management / 390 / End all — bottom sheet' : BASE;
const sk = skipIf(sec, NAME); if (sk) return sk;
let f = END ? cloneBase(sec, BASE, NAME) : null;
if (!f) {
  const S = await shellM(NAME, { back: 'Security', title: 'Sessions', sub: 'A session ends after 30 minutes without activity. End any you don’t need.' });
  const C = S.C;
  const ts = card('Card — This session', { gap: 12, p: 16, fill: 'surface/selected', stroke: 'border/brand' }); add(C, [ts, 'FILL']);
  const th = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(ts, [th, 'FILL']); th.appendChild(await iconTile('monitor', 'icon/brand', 44, 'surface/default'));
  const tt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(th, [tt, 'FILL']); add(tt, [await T('This browser', 'Body/M Strong', 'text/primary'), 'FILL']); add(tt, [await T('Chrome on MacBook Pro · Lisbon · started 27 Nov 2026, 08:12 UTC', 'Caption', 'text/secondary', { w: 220 }), 'FILL']); th.appendChild(await DEMO('XS'));
  ts.appendChild(await chip('check-circle', 'Active now', 'success'));
  add(C, [await BTN('Danger', 'End all other sessions', { size: 'L', lead: 'logout' }), 'FILL']);
  add(C, [await T('You stay signed in here. No 2FA code needed.', 'Caption', 'text/tertiary', { w: W, align: 'CENTER' }), 'FILL']);
  await groupLabel(C, 'Other active sessions · 2');
  async function scard(icon, t, meta, warn) {
    const c = card('Session — ' + t, { gap: 12, p: 16, stroke: warn ? tk('status/warning', 'border/default') : 'border/subtle' }); add(C, [c, 'FILL']);
    const h = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']); h.appendChild(await iconTile(icon, warn ? tk('status/warning', 'icon/default') : 'icon/default', 40));
    const x = AL('VERTICAL', { name: 'Text', gap: 2 }); add(h, [x, 'FILL']); add(x, [await T(t, 'Body/S Strong', 'text/primary', { w: 220 }), 'FILL']); add(x, [await T(meta, 'Caption', 'text/secondary', { w: 220 }), 'FILL']); h.appendChild(await DEMO('XS'));
    if (warn) add(c, [await noteBox('alert-triangle', 'From a new device that still needs your review', 'warning', IW), 'FILL']);
    add(c, [await BTN('Secondary', 'End session', { size: 'L' }), 'FILL']);
  }
  await scard('smartphone', 'Safari on iPhone 15', 'Lisbon · started 27 Nov 2026, 07:40 UTC · last active 07:52 UTC', false);
  await scard('monitor', 'Edge on Windows PC', 'Madrid, Spain · started 25 Nov 2026 · last active 25 Nov 2026', true);
  await groupLabel(C, 'Recently ended · kept 30 days');
  const le = list(C, 'List — Ended');
  add(le, [await lrow('smartphone', 'Safari on iOS', 'Ended 26 Nov 2026, 21:40 UTC · timed out after 30 min idle', { chev: false, ic: 'icon/muted', demo: true }), 'FILL']);
  add(le, [await lrow('monitor', 'Chrome on MacBook Pro', 'Ended 24 Nov 2026 · you signed out', { chev: false, ic: 'icon/muted', demo: true, last: true }), 'FILL']);
  const se = card('Card — Settings', { gap: 12, p: 16 }); add(C, [se, 'FILL']);
  se.appendChild(await T('Session settings', 'Heading/H5', 'text/primary'));
  const sf = await tryy('select', () => I('13:565', { State: 'Default' }, { Label: 'Sign me out after inactivity', Value: '30 minutes', 'Show helper': false, 'Show leading icon': false })); if (sf) add(se, [sf, 'FILL']);
  add(se, [await T('Shorter timeouts are safer on shared computers. Applies to every device.', 'Caption', 'text/tertiary', { w: IW }), 'FILL']);
  await licM(C);
  await endM(S);
  f = S.f;
}
if (END) {
  await sheetM(f, 'End 2 other sessions?', 'Those browsers are signed out within seconds. You stay signed in here.', async (sh) => {
    for (const [i, t, d] of [['smartphone', 'Safari on iPhone 15', 'Lisbon · last active 27 Nov 2026, 07:52 UTC'], ['monitor', 'Edge on Windows PC', 'Madrid, Spain · new device, needs review']]) {
      const r = AL('HORIZONTAL', { name: 'Session — ' + t, gap: 12, p: 12, fill: 'surface/raised', stroke: 'border/subtle', r: 10, align: 'CENTER' }); add(sh, [r, 'FILL']);
      r.appendChild(await iconTile(i, 'icon/default', 36, 'surface/default')); const x = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [x, 'FILL']); x.appendChild(await T(t, 'Body/S Strong', 'text/primary')); add(x, [await T(d, 'Caption', 'text/tertiary', { w: 230 }), 'FILL']); r.appendChild(await DEMO('XS'));
    }
    for (const x of ['Device trust stays — revoke a device in Devices to remove it', 'Balance, open entries, limits and pending withdrawals are untouched']) add(sh, [await check(x, true, W, 'info'), 'FILL']);
    add(sh, [await BTN('Danger', 'End 2 sessions', { size: 'L', lead: 'logout' }), 'FILL']);
    add(sh, [await BTN('Secondary', 'Cancel', { size: 'L' }), 'FILL']);
    add(sh, [await T('No 2FA code needed — this only makes your account safer.', 'Caption', 'text/tertiary', { w: W, align: 'CENTER' }), 'FILL']);
  });
}
await placeM(f, sec, 7); await shotOf(f);
return { frame: f.id, name: NAME, h: Math.round(f.height) };
}
