async function a7(STATE) {
const REV = STATE === 'Revoke';
const NAME = '[USR-A7] Connected Devices / 1440 / ' + (REV ? 'Revoke — confirm' : 'Default');
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Connected devices', { sub: 'Devices and browsers that have signed in to your account. Revoking one signs it out at once and asks for your password and 2FA code next time.' });
const M = S.main;
const st = AL('HORIZONTAL', { name: 'Summary', gap: 16 }); add(M, [st, 'FILL']);
async function tile(icon, v, l, tone) { const c = card('Stat — ' + l, { gap: 8, p: 20 }); add(st, [c, 'FILL']); const h = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); add(c, [h, 'FILL']); h.appendChild(await IC(icon, 20, tone || 'icon/brand')); add(h, [await T(v, 'Number/M', 'text/primary'), 'FILL']); h.appendChild(await DEMO('XS')); add(c, [await T(l, 'Body/S', 'text/secondary', { w: 200 }), 'FILL']); return c; }
await tile('monitor', '3', 'Devices signed in during the last 30 days');
await tile('alert-triangle', '1', 'Needs your review — first seen 25 Nov 2026', tk('status/warning', 'icon/default'));
await tile('shield-check', '30 days', 'How long a device stays trusted after a 2FA sign-in');
async function dev(state) { const d = await tryy('device ' + state, () => I('23:9199', { State: state, Interaction: 'Default' })); return d; }
const rv = card('Card — Needs review', { gap: 12, stroke: tk('status/warning', 'border/default') }); add(M, [rv, 'FILL']);
await head(rv, 'Needs your review', 'We haven’t seen this device before. If you don’t recognise it, revoke it and change your password.', CW, [await chip('alert-triangle', '1 device', 'warning')]);
const dn = await dev('New'); if (dn) add(rv, [dn, 'FILL']);
const rc = card('Card — Recognised devices', { gap: 12 }); add(M, [rc, 'FILL']);
await head(rc, 'Recognised devices', null, CW, [await DEMO('S')]);
const dc = await dev('Current'); if (dc) add(rc, [dc, 'FILL']);
const dt = await dev('Trusted'); if (dt) add(rc, [dt, 'FILL']);
const rm = card('Card — Removed devices', { gap: 0 }); add(M, [rm, 'FILL']);
await head(rm, 'Removed in the last 90 days', null, CW, [await DEMO('S')]);
const rr = AL('HORIZONTAL', { name: 'Removed — Galaxy S23', gap: 16, align: 'CENTER', p: [16, 0, 4, 0] }); add(rm, [rr, 'FILL']);
rr.appendChild(await iconTile('smartphone', 'icon/muted', 40)); const rt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(rr, [rt, 'FILL']);
rt.appendChild(await T('Samsung Galaxy S23 · Chrome', 'Body/M Strong', 'text/secondary')); rt.appendChild(await T('Revoked by you on 2 Oct 2026, 08:15 UTC · Porto, Portugal', 'Caption', 'text/tertiary'));
rr.appendChild(await chip('ban', 'Revoked', 'info'));
const tp = card('Card — Tips', { gap: 12, fill: 'surface/raised' }); add(M, [tp, 'FILL']);
tp.appendChild(await T('Keeping devices safe', 'Heading/H5', 'text/primary'));
const tr = AL('HORIZONTAL', { name: 'Tips', gap: 16 }); add(tp, [tr, 'FILL']); const TW = Math.floor((CW - 32) / 3);
for (const [i, t, b] of [['user-x', 'Revoke what you don’t use', 'Old phones and shared computers are the most common way in.'], ['lock', 'Revoking needs no code', 'Protective actions are one tap — no 2FA code, no waiting.'], ['mail', 'We email every new device', 'Each email shows your anti-phishing code AURORA-27.']]) add(tr, [await bullet(i, t, b, TW), 'FILL']);
await footA(S);
if (REV) {
  const { m, bd, ft, W } = await modalBox('Revoke Windows · Edge in Madrid?', 'This device will be signed out straight away and treated as new if it ever signs in again.', 480);
  const sm = AL('HORIZONTAL', { name: 'Device summary', gap: 12, p: 16, fill: 'surface/raised', stroke: 'border/subtle', r: 14, align: 'CENTER' }); add(bd, [sm, 'FILL']);
  sm.appendChild(await iconTile('monitor', tk('status/warning', 'icon/default'), 40, 'surface/default'));
  const smt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(sm, [smt, 'FILL']); smt.appendChild(await T('Windows · Edge 131', 'Body/M Strong', 'text/primary')); add(smt, [await T('Madrid, Spain · 213.97.•••.88 · first seen 25 Nov 2026, 22:41 UTC', 'Caption', 'text/tertiary', { w: W - 120 }), 'FILL']);
  sm.appendChild(await DEMO('XS'));
  bd.appendChild(await T('What happens next', 'Label/L', 'text/primary'));
  for (const t of ['Its 1 active session ends immediately', 'Signing in again needs your password and 2FA code', 'Your balance and withdrawal WD-20931 are not affected']) add(bd, [await check(t, true, W, 'info'), 'FILL']);
  const cb = await tryy('checkbox', () => I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Take me to change my password next', 'Show description': false })); if (cb) add(bd, [cb, 'FILL']);
  add(bd, [await T('Revoking is a protective action, so it doesn’t ask for a 2FA code.', 'Caption', 'text/tertiary', { w: W }), 'FILL']);
  ft.appendChild(await BTN('Secondary', 'Cancel', { size: 'M' })); ft.appendChild(await BTN('Danger', 'Revoke device', { size: 'M', lead: 'ban' }));
  await overlay(S, m, 220);
}
await place(S.f, sec, 1, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
