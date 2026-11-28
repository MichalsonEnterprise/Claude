{ const { sec, fr, db, X } = await START('AUTH-07 2FA Enrollment — Step 3 Backup codes / 1440 / Default', 2);
const bg = await LOBBYBG(fr, db, { label: 'member lobby behind 2FA setup dialog' });
const panel = await PANEL({ over: 'ACCOUNT SECURITY', title: 'Two-step sign-in is on', sub: 'One last thing: save your backup codes so a lost or broken phone never locks you out of your balance.', artName: 'phone with authenticator app (DEMO)', art: async (a) => { BLOCKS(a); await PHONE(a, 206, 28, -7, {}); },
  body: async (b) => { add(b, [await NUMSTEP(1, 'done', 'Scan the QR code', 'GLOBAL POOL added to your app'), 'FILL'], [await NUMSTEP(2, 'done', 'Enter the 6-digit code', 'Turned on 27 Nov 2026, 16:31 UTC'), 'FILL'], [await NUMSTEP(3, 'now', 'Save 10 backup codes', 'Your way back in if you lose your phone'), 'FILL']); } });
const form = FORM();
await FHEAD(form, { step: 'STEP 3 OF 3 · BACKUP CODES', seg: [3, 2], title: 'Save your 10 backup codes', sub: 'Each code signs you in once if you can’t use your phone. This is the only time we show them.' });
add(form, [await ALERT('success', 'Two-step sign-in is on', 'Turned on 27 Nov 2026, 16:31 UTC for n•••@example.com. We’ve emailed you a confirmation with your anti-phishing code.'), 'FILL']);
const cc = COL('Backup codes card', [], { gap: 16, p: 20, fill: 'bg/secondary', stroke: 'border/default', r: 14 });
add(cc, [ROW('Head', [await IC('key', 16, 'icon/brand'), await T('Backup codes', 'Label/M', 'text/primary'), await T('· generated 27 Nov 2026, 16:31 UTC', 'Caption', 'text/tertiary'), [SPACER(), 'FILL'], await DEMO('S')], { gap: 8 }), 'FILL']);
const CODES = ['4F7K-2QXM', '9TRB-H3LC', 'P2WD-8KZN', '6YHM-Q4TA', 'C8XJ-5RVE', 'M3NP-7GUB', 'T6QZ-1WKD', 'H9AE-3SLF', 'X4KC-6PVR', 'B7UD-2NQY'];
const grid = ROW('Codes grid (2 × 5, monospace)', [], { gap: 12, align: 'MIN' });
for (let c = 0; c < 2; c++) { const colm = COL('Column ' + (c + 1), [], { gap: 8 }); for (let i = 0; i < 5; i++) { const k = c * 5 + i; add(colm, [ROW('Code ' + (k + 1), [await T(String(k + 1).padStart(2, '0'), 'Mono/S', 'text/tertiary'), await T(CODES[k], 'Mono/M', 'text/primary')], { gap: 12, p: [8, 12, 8, 12], fill: 'surface/default', stroke: 'border/subtle', r: 6 }), 'FILL']); } add(grid, [colm, 'FILL']); }
add(cc, [grid, 'FILL']);
add(cc, ROW('Code actions', [await BTN('Secondary', 'Download .txt', { size: 'S', lead: 'download' }), await BTN('Secondary', 'Copy all', { size: 'S', lead: 'copy' }), await BTN('Ghost', 'Print', { size: 'S', lead: 'file' })], { gap: 8 }));
add(form, [cc, 'FILL']);
add(form, [await ALERT('warning', 'Keep them offline and private', 'Store them in a password manager or on paper — not in email or screenshots. Anyone with your password and one code can sign in. We will never ask you for them.'), 'FILL']);
add(form, [await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I’ve saved my backup codes somewhere safe', 'Show description': false }), 'FILL']);
await ACTIONS(form, [await T('Finish becomes available once you tick the box.', 'Caption', 'text/tertiary')], [await BTN('Primary', 'Finish setup', { size: 'L', state: 'Disabled' })]);
await TWOPANE(fr, bg, panel, form, 'Dialog — Set up two-step sign-in (step 3 of 3)');
OUT.push(await FINISH(sec, fr, X)); }
