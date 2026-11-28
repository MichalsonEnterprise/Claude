async function ma7(STATE) {
const REV = STATE === 'Revoke';
const BASE = '[USR-A7 · MOB-09] Connected Devices / 390 / Default';
const NAME = REV ? '[USR-A7 · MOB-09] Connected Devices / 390 / Revoke — bottom sheet' : BASE;
const sk = skipIf(sec, NAME); if (sk) return sk;
let f = REV ? cloneBase(sec, BASE, NAME) : null;
if (!f) {
  const S = await shellM(NAME, { back: 'Security', title: 'Connected devices', sub: 'Revoke anything you don’t recognise. A revoked device must sign in again with your password and 2FA code.' });
  const C = S.C;
  async function dcard(icon, name, meta, ch, btns, o = {}) {
    const c = card('Device — ' + name, { gap: 12, p: 16, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle' }); add(C, [c, 'FILL']);
    const h = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']); h.appendChild(await iconTile(icon, o.ic || 'icon/default', 44, 'surface/raised'));
    const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(h, [tx, 'FILL']); add(tx, [await T(name, 'Body/M Strong', 'text/primary', { w: 200 }), 'FILL']); add(tx, [await T(meta, 'Caption', 'text/secondary', { w: 200 }), 'FILL']);
    h.appendChild(await DEMO('XS'));
    c.appendChild(ch);
    if (btns.length) { const b = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); add(c, [b, 'FILL']); for (const x of btns) add(b, [x, 'FILL']); }
    return c;
  }
  await groupLabel(C, 'Needs your review');
  await dcard('monitor', 'Windows PC · Edge', 'First seen 25 Nov 2026 in Madrid, Spain · 213.97.•••.88', await chip('alert-triangle', 'Needs review', 'warning'), [await BTN('Secondary', 'It was me', { size: 'L' }), await BTN('Danger', 'Revoke', { size: 'L' })], { fill: tk('status/warning-tint'), stroke: tk('status/warning', 'border/default'), ic: tk('status/warning', 'icon/default') });
  await groupLabel(C, 'Your devices');
  await dcard('monitor', 'MacBook Pro · Chrome 131', 'Lisbon, Portugal · 85.243.•••.12 · active now', await chip('check-circle', 'This device', 'success'), [await BTN('Ghost', 'Sign out here', { size: 'L', lead: 'logout' })]);
  await dcard('smartphone', 'iPhone 15 · Safari', 'Lisbon, Portugal · last active 27 Nov 2026, 07:52 UTC', await chip('shield-check', 'Trusted · skips email link', 'info'), [await BTN('Secondary', 'Revoke', { size: 'L' })]);
  const tr = card('Card — Device trust', { gap: 8, p: 16, fill: 'surface/raised' }); add(C, [tr, 'FILL']);
  tr.appendChild(await T('Device trust', 'Heading/H5', 'text/primary'));
  add(tr, [await T('Trusted devices skip the email link on sign-in for 30 days. Withdrawals and security changes always ask for 2FA, trusted or not.', 'Body/S', 'text/secondary', { w: IW }), 'FILL']);
  await groupLabel(C, 'Recently removed');
  const rl = list(C, 'List — Removed');
  add(rl, [await lrow('grid', 'Galaxy Tab · Chrome', 'Expired after 90 days inactive · 2 Sep 2026', { chev: false, ic: 'icon/muted', demo: true }), 'FILL']);
  add(rl, [await lrow('ban', 'Linux · Firefox · Frankfurt', 'Never trusted · blocked 22 Nov 2026 after 5 wrong passwords', { chev: false, ic: tk('status/danger', 'icon/muted'), demo: true, last: true }), 'FILL']);
  await licM(C);
  await endM(S);
  f = S.f;
}
if (REV) {
  await sheetM(f, 'Revoke Windows PC · Edge?', 'It’s signed out within seconds and treated as new if it signs in again.', async (sh) => {
    const sm = AL('HORIZONTAL', { name: 'Device summary', gap: 12, p: 12, fill: 'surface/raised', stroke: 'border/subtle', r: 14, align: 'CENTER' }); add(sh, [sm, 'FILL']);
    sm.appendChild(await iconTile('monitor', tk('status/warning', 'icon/default'), 40, 'surface/default'));
    const t = AL('VERTICAL', { name: 'Text', gap: 2 }); add(sm, [t, 'FILL']); t.appendChild(await T('Windows PC · Edge', 'Body/S Strong', 'text/primary')); add(t, [await T('First seen 25 Nov 2026 · Madrid, Spain', 'Caption', 'text/tertiary', { w: 220 }), 'FILL']); sm.appendChild(await DEMO('XS'));
    for (const x of ['Its active session ends now', 'Next sign-in needs password, 2FA and the email link', 'Balance, entries and WD-20931 are untouched']) add(sh, [await check(x, true, W, 'info'), 'FILL']);
    const cb = await tryy('checkbox', () => I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Take me to change my password next', 'Show description': false })); if (cb) add(sh, [cb, 'FILL']);
    add(sh, [await BTN('Danger', 'Revoke device', { size: 'L', lead: 'ban' }), 'FILL']);
    add(sh, [await BTN('Secondary', 'Cancel', { size: 'L' }), 'FILL']);
    add(sh, [await T('Protective actions never ask for a 2FA code.', 'Caption', 'text/tertiary', { w: W, align: 'CENTER' }), 'FILL']);
  });
}
await placeM(f, sec, 6); await shotOf(f);
return { frame: f.id, name: NAME, h: Math.round(f.height) };
}
