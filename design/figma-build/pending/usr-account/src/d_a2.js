async function a2() {
const NAME = '[USR-A2] Security Settings / 1440 / Default';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Security overview', { title: 'Security settings', sub: 'Your security score and every protection on your account in one place. Changing any of these settings asks for your 2FA code; turning a protection on never does.' });
const M = S.main;
// score + review
const top = AL('HORIZONTAL', { name: 'Score row', gap: 24 }); add(M, [top, 'FILL']);
const sc = await I('23:17143', { Status: 'Needs review' }); top.appendChild(sc); sc.layoutSizingVertical = 'FILL';
const rv = card('Card — Score breakdown', { gap: 12, p: 20 }); add(top, [rv, 'FILL']); rv.layoutSizingVertical = 'FILL';
const RW = MW - 460 - 24 - 40;
const rh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(rv, [rh, 'FILL']); add(rh, [await T('How your 80 / 100 adds up', 'Heading/H5', 'text/primary'), 'FILL']); rh.appendChild(await DEMO('S'));
async function pt(label, pts, ok) { const r = AL('HORIZONTAL', { name: 'Points — ' + label, gap: 8, align: 'CENTER' }); r.appendChild(await IC(ok ? 'check-circle' : 'alert-triangle', 16, ok ? tk('status/success', 'icon/brand') : tk('status/warning', 'icon/default'))); add(r, [await T(label, 'Body/S', 'text/primary'), 'FILL']); r.appendChild(await T(pts, 'Number/S', ok ? 'text/primary' : tk('text/warning', 'text/secondary'))); return r; }
for (const [l, p, ok] of [['Authenticator 2FA on', '+30', true], ['Anti-phishing code set', '+15', true], ['Withdrawal whitelist on', '+15', true], ['Email verified', '+10', true], ['Strong password (changed 12 Sep 2026)', '+10', true], ['All devices recognised — 1 to review', '0 / 20', false]]) add(rv, [await pt(l, p, ok), 'FILL']);
add(rv, [await noteBox('shield-alert', 'A Windows · Edge sign-in from Madrid on 25 Nov 2026, 22:41 UTC hasn’t been reviewed. Confirm it to reach 100.', 'warning', RW), 'FILL']);
const ra = AL('HORIZONTAL', { name: 'Review actions', gap: 8 }); rv.appendChild(ra); ra.appendChild(await BTN('Secondary', 'It was me', { size: 'S', lead: 'check' })); ra.appendChild(await BTN('Danger', 'Not me — secure account', { size: 'S' }));
// sign-in & recovery
const c1 = card('Card — Sign-in & recovery', { gap: 0 }); add(M, [c1, 'FILL']);
await head(c1, 'Sign-in & recovery', null, CW, [await DEMO('S')]);
const sp = AL('VERTICAL', { name: 'Spacer', h: 8 }); add(c1, [sp, 'FILL']);
add(c1, [await srow('lock', 'Password', 'Last changed 12 Sep 2026 · 16+ characters', [await chip('check-circle', 'Strong', 'success'), await BTN('Secondary', 'Change', { size: 'S' })], { tw: 420 }), 'FILL']);
const tfa = await tryy('2FA status', () => I('23:5644', { State: 'On' })); if (tfa) { const w = AL('VERTICAL', { name: '2FA row', p: [16, 0, 16, 0] }); strokeSides(w, 'border/subtle', { t: 1 }); add(c1, [w, 'FILL']); add(w, [tfa, 'FILL']); }
add(c1, [await srow('key', 'Backup codes', '8 of 10 unused · generated 3 Sep 2026', [await BTN('Ghost', 'View codes', { size: 'S', trail: 'chevron-right' })], { tw: 420 }), 'FILL']);
add(c1, [await srow('mail', 'Email & sign-in alerts', 'n•••@example.com verified · we email you about every new device', [await chip('check-circle', 'On', 'success'), await BTN('Ghost', 'Alerts', { size: 'S', trail: 'chevron-right' })], { tw: 420 }), 'FILL']);
// withdrawal protection
const c2 = card('Card — Withdrawal protection', { gap: 0 }); add(M, [c2, 'FILL']);
await head(c2, 'Withdrawal protection', 'Extra checks that stop anyone else moving your funds — they never delay a withdrawal to an address you already trust.', CW, [await DEMO('S')]);
const sp2 = AL('VERTICAL', { name: 'Spacer', h: 8 }); add(c2, [sp2, 'FILL']);
const ach = await tryy('addr chip', () => I('9:418', { Size: 'S', State: 'Default' }, { Address: '0x7c4e…a21D', 'Show DEMO': false }));
add(c2, [await srow('shield-check', 'Address whitelist', 'On · 1 address on Arbitrum, whitelisted 14 Oct 2026', [ach, await BTN('Secondary', 'Manage', { size: 'S' })], { tw: 360 }), 'FILL']);
add(c2, [await srow('hourglass', 'New-address cooldown', 'Always on · a new address can receive withdrawals 24 h after you add it', [await chip('lock', 'Always on', 'info')], { tw: 420 }), 'FILL']);
const apc = AL('HORIZONTAL', { name: 'Code', p: [4, 10, 4, 10], fill: 'surface/raised', stroke: 'border/brand', r: 6 }); apc.appendChild(await T('AURORA-27', 'Mono/S', 'text/brand'));
add(c2, [await srow('mail', 'Anti-phishing code', 'Shown in every email and 2FA prompt we send', [apc, await BTN('Secondary', 'Change', { size: 'S' })], { tw: 400 }), 'FILL']);
add(c2, [await srow('fingerprint', '2FA on every withdrawal', 'Authenticator code + email code, with your anti-phishing code shown', [await chip('lock', 'Always on', 'info')], { tw: 420 }), 'FILL']);
// devices & activity
const c3 = card('Card — Devices & activity', { gap: 0 }); add(M, [c3, 'FILL']);
await head(c3, 'Devices & activity', null, CW, [await DEMO('S')]);
const sp3 = AL('VERTICAL', { name: 'Spacer', h: 8 }); add(c3, [sp3, 'FILL']);
add(c3, [await srow('monitor', 'Connected devices', '3 devices · Windows · Edge in Madrid needs review', [await chip('alert-triangle', '1 to review', 'warning'), await BTN('Secondary', 'Review', { size: 'S' })], { tw: 400, ic: tk('status/warning', 'icon/brand') }), 'FILL']);
add(c3, [await srow('activity', 'Active sessions', '3 active · this browser, iPhone 15, Windows · Edge', [await BTN('Ghost', 'Manage', { size: 'S', trail: 'chevron-right' })], { tw: 420 }), 'FILL']);
add(c3, [await srow('history', 'Login history', 'Last sign-in 27 Nov 2026, 16:00 UTC · Lisbon, Portugal · 2 flagged attempts this month', [await BTN('Ghost', 'View history', { size: 'S', trail: 'chevron-right' })], { tw: 440 }), 'FILL']);
// recent events
const c4 = card('Card — Recent security events', { gap: 0 }); add(M, [c4, 'FILL']);
await head(c4, 'Recent security events', 'Kept for 12 months. Anything you don’t recognise? Secure your account and contact support.', CW, [await DEMO('S')]);
async function ev(when, what, icon, tone, label) { const r = AL('HORIZONTAL', { name: 'Event — ' + when, gap: 16, align: 'CENTER', p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); const w = ALX('VERTICAL', { name: 'When', w: 176 }); r.appendChild(w); w.appendChild(await T(when, 'Body/S', 'text/secondary')); add(r, [await T(what, 'Body/S', 'text/primary', { w: 400 }), 'FILL']); r.appendChild(await chip(icon, label, tone)); return r; }
const sp4 = AL('VERTICAL', { name: 'Spacer', h: 8 }); add(c4, [sp4, 'FILL']);
add(c4, [await ev('27 Nov 2026, 18:43 UTC', '2FA code used to confirm withdrawal WD-20931', 'check-circle', 'success', 'Verified'), 'FILL']);
add(c4, [await ev('25 Nov 2026, 22:41 UTC', 'New device sign-in · Windows · Edge · Madrid, Spain', 'alert-triangle', 'warning', 'Needs review'), 'FILL']);
add(c4, [await ev('25 Nov 2026, 22:39 UTC', 'Wrong 2FA code from the same Madrid device', 'x-circle', 'danger', 'Blocked'), 'FILL']);
add(c4, [await ev('14 Oct 2026, 11:02 UTC', 'Withdrawal address 0x7c4e…a21D whitelisted (Arbitrum)', 'check-circle', 'success', 'Done'), 'FILL']);
await footA(S);
await place(S.f, sec, 1, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
