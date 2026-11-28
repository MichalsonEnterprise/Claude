async function a8(STATE) {
const END = STATE === 'End all';
const NAME = '[USR-A8] Session Management / 1440 / ' + (END ? 'End all other sessions — confirm' : 'Default');
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Session management', { sub: 'Where you’re signed in right now. Sessions end after 30 minutes without activity, or after 30 days on a trusted device.' });
const M = S.main;
const tp = card('Card — This session', { gap: 16, fill: 'surface/selected', stroke: 'border/brand' }); add(M, [tp, 'FILL']);
const th = AL('HORIZONTAL', { name: 'This session', gap: 16, align: 'CENTER' }); add(tp, [th, 'FILL']);
th.appendChild(await iconTile('monitor', 'icon/brand', 48, 'surface/default'));
const tt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(th, [tt, 'FILL']);
const tl = AL('HORIZONTAL', { name: 'Title', gap: 8, align: 'CENTER' }); tt.appendChild(tl); tl.appendChild(await T('This browser — Chrome on MacBook Pro', 'Body/M Strong', 'text/primary')); tl.appendChild(await chip('check-circle', 'Active now', 'success'));
const tm = AL('HORIZONTAL', { name: 'Meta', gap: 8, align: 'CENTER' }); tt.appendChild(tm); tm.appendChild(await T('Lisbon, Portugal · 85.243.•••.12 · signed in 27 Nov 2026, 16:00 UTC', 'Body/S', 'text/secondary')); tm.appendChild(await DEMO('XS'));
const ea = AL('HORIZONTAL', { name: 'End all', gap: 16, align: 'CENTER', p: [16, 0, 0, 0] }); strokeSides(ea, 'border/subtle', { t: 1 }); add(tp, [ea, 'FILL']);
add(ea, [await T('2 other sessions are active. Ending them signs those devices out — you stay signed in here.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
ea.appendChild(await BTN('Danger', 'End all other sessions', { size: 'M', lead: 'logout' }));
async function sess(status, label, meta) { const s = await tryy('session ' + label, async () => { const x = await I('23:9317', { Status: status, Interaction: 'Default' }); await byLayer(x, { Session: label, Meta: meta, Details: meta, Location: meta }); return x; }); return s; }
const ac = card('Card — Other active sessions', { gap: 12 }); add(M, [ac, 'FILL']);
await head(ac, 'Other active sessions', null, CW, [await DEMO('S')]);
const s1 = await sess('Active', 'Safari on iPhone 15', 'Lisbon, Portugal · started 26 Nov 2026, 21:14 UTC · last active 27 Nov 2026, 08:20 UTC'); if (s1) add(ac, [s1, 'FILL']);
const s2 = await sess('Active', 'Edge on Windows', 'Madrid, Spain · started 25 Nov 2026, 22:41 UTC · last active 25 Nov 2026, 23:05 UTC'); if (s2) add(ac, [s2, 'FILL']);
add(ac, [await noteBox('alert-triangle', 'The Windows · Edge session in Madrid is from a device that still needs your review. Not you? End it and revoke the device.', 'warning', CW), 'FILL']);
const ex = card('Card — Recently ended', { gap: 12 }); add(M, [ex, 'FILL']);
await head(ex, 'Recently ended', 'Ended sessions can’t be resumed — the device has to sign in again.', CW, [await DEMO('S')]);
const e1 = await sess('Expired', 'Chrome on MacBook Pro', 'Lisbon, Portugal · ended 24 Nov 2026, 10:12 UTC · 30 min without activity'); if (e1) add(ex, [e1, 'FILL']);
const e2 = await sess('Expired', 'Safari on iPhone 15', 'Lisbon, Portugal · ended 20 Nov 2026, 22:40 UTC · you signed out'); if (e2) add(ex, [e2, 'FILL']);
const se = card('Card — Session settings', { gap: 16 }); add(M, [se, 'FILL']);
await head(se, 'Session settings', null, CW);
const sr = AL('HORIZONTAL', { name: 'Settings row', gap: 24 }); add(se, [sr, 'FILL']);
const sf = await tryy('select', () => I('13:565', { State: 'Default' }, { Label: 'Sign me out after inactivity', Value: '30 minutes', 'Show helper': false, 'Show leading icon': false })); if (sf) add(sr, [sf, 'FILL']);
const tg = AL('VERTICAL', { name: 'Toggles', gap: 12 }); add(sr, [tg, 'FILL']);
for (const [l, d, on] of [['Remember trusted devices for 30 days', 'Off means 2FA on every sign-in.', true], ['Email me when a new session starts', 'Includes your anti-phishing code.', true]]) { const t = await tryy('toggle', () => I('20:3309', { On: on ? 'Yes' : 'No', State: 'Default' }, { Label: l, Description: d, 'Show description': true })); if (t) add(tg, [t, 'FILL']); }
await footA(S);
if (END) {
  const { m, bd, ft, W } = await modalBox('End 2 other sessions?', 'Those devices are signed out straight away. You stay signed in on this browser.', 480);
  for (const [i, t, d] of [['smartphone', 'Safari on iPhone 15', 'Lisbon, Portugal · last active 27 Nov 2026, 08:20 UTC'], ['monitor', 'Edge on Windows', 'Madrid, Spain · last active 25 Nov 2026, 23:05 UTC']]) {
    const r = AL('HORIZONTAL', { name: 'Session — ' + t, gap: 12, p: 12, fill: 'surface/raised', stroke: 'border/subtle', r: 10, align: 'CENTER' }); add(bd, [r, 'FILL']);
    r.appendChild(await iconTile(i, 'icon/default', 36, 'surface/default')); const x = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [x, 'FILL']); x.appendChild(await T(t, 'Body/S Strong', 'text/primary')); add(x, [await T(d, 'Caption', 'text/tertiary', { w: W - 110 }), 'FILL']); r.appendChild(await DEMO('XS'));
  }
  const cb = await tryy('checkbox', () => I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Also remove these devices from my trusted list', 'Show description': false })); if (cb) add(bd, [cb, 'FILL']);
  add(bd, [await noteBox('info', 'No 2FA code needed — ending sessions only makes your account safer. Open games on those devices stop; settled bets and entries stay as they are.', 'info', W), 'FILL']);
  ft.appendChild(await BTN('Secondary', 'Cancel', { size: 'M' })); ft.appendChild(await BTN('Danger', 'End 2 sessions', { size: 'M', lead: 'logout' }));
  await overlay(S, m, 220);
}
await place(S.f, sec, 2, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
