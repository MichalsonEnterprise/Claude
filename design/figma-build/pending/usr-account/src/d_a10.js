async function a10() {
const NAME = '[USR-A10] Anti-Phishing Code / 1440 / Default';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Anti-phishing code', { sub: 'A private word we put in every email and every 2FA prompt. If a message claims to be from GLOBAL POOL without it, it isn’t from us.' });
const M = S.main;
const top = AL('HORIZONTAL', { name: 'Code row', gap: 24 }); add(M, [top, 'FILL']); const HW = Math.floor((MW - 24) / 2) - 48;
const yc = card('Card — Your code', { gap: 16 }); add(top, [yc, 'FILL']); yc.layoutSizingVertical = 'FILL';
const yh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(yc, [yh, 'FILL']); add(yh, [await T('Your code', 'Heading/H5', 'text/primary'), 'FILL']); yh.appendChild(await chip('check-circle', 'Active', 'success'));
const cb = AL('HORIZONTAL', { name: 'Code', gap: 12, p: [20, 24, 20, 24], fill: 'surface/raised', stroke: 'border/brand', r: 14, align: 'CENTER' }); add(yc, [cb, 'FILL']);
cb.appendChild(await IC('shield-check', 24, 'icon/brand')); add(cb, [await T('AURORA-27', 'Heading/H2', 'text/brand'), 'FILL']); cb.appendChild(await DEMO('S'));
add(yc, [await T('Set 3 Sep 2026 · only you and our systems know it. Never share it — support will never ask for it.', 'Body/S', 'text/secondary', { w: HW }), 'FILL']);
yc.appendChild(await T('Where you’ll see it', 'Label/L', 'text/primary'));
for (const t of ['The header of every email we send', 'Every 2FA prompt, including withdrawals', 'In-app security notifications']) add(yc, [await check(t, true, HW, 'info'), 'FILL']);
// email preview
const ep = card('Card — Email preview', { gap: 12 }); add(top, [ep, 'FILL']); ep.layoutSizingVertical = 'FILL';
const eh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(ep, [eh, 'FILL']); add(eh, [await T('What a real email looks like', 'Heading/H5', 'text/primary'), 'FILL']); eh.appendChild(await DEMO('S'));
const mail = AL('VERTICAL', { name: 'Email mock', gap: 0, fill: 'bg/secondary', stroke: 'border/default', r: 14, clip: true }); add(ep, [mail, 'FILL']);
const mh = AL('VERTICAL', { name: 'Envelope', gap: 4, p: 16 }); strokeSides(mh, 'border/subtle', { b: 1 }); add(mail, [mh, 'FILL']);
mh.appendChild(await T('From: GLOBAL POOL <no-reply@globalpool.example>', 'Caption', 'text/secondary')); mh.appendChild(await T('Subject: Withdrawal WD-20931 is under review', 'Body/S Strong', 'text/primary'));
const band = AL('HORIZONTAL', { name: 'Code band', gap: 8, p: [10, 16, 10, 16], fill: 'brand/tint', align: 'CENTER' }); add(mail, [band, 'FILL']); band.appendChild(await IC('shield-check', 16, 'icon/brand')); add(band, [await T('Your anti-phishing code: AURORA-27', 'Label/M', 'text/brand'), 'FILL']);
const mb = AL('VERTICAL', { name: 'Body', gap: 8, p: 16 }); add(mail, [mb, 'FILL']);
add(mb, [await T('Hi Nova, your withdrawal of 1,500.00 USDT to 0x7c4e…a21D (Arbitrum) is in a routine AML review. Expected decision by 22:44 UTC. You don’t need to do anything.', 'Body/S', 'text/secondary', { w: HW - 32 }), 'FILL']);
mb.appendChild(await T('We never ask for passwords, 2FA codes or seed phrases.', 'Caption', 'text/tertiary'));
// change
const ch = card('Card — Change your code', { gap: 16 }); add(M, [ch, 'FILL']);
await head(ch, 'Change your code', 'The new code appears in emails sent after you save. Changing it asks for your 2FA code.', CW);
const cr = AL('HORIZONTAL', { name: 'Form', gap: 24, align: 'MIN' }); add(ch, [cr, 'FILL']);
const ni = await tryy('input', async () => { const i = await I('13:762', { State: 'Default', Size: 'M' }, { Label: 'New anti-phishing code', 'Show label': true, 'Show leading icon': false, 'Show trailing icon': false, 'Show helper': true }); await byLayer(i, { 'Value text': 'e.g. LIGHTHOUSE-9', 'Helper text': '4–20 letters, numbers or hyphens. Not your password or username.' }); return i; }); if (ni) add(cr, [ni, 'FILL']);
const otp = await tryy('otp', () => I('16:3761', { State: 'Empty' }, { Label: 'Authenticator code', Description: 'From your authenticator app' })); if (otp) cr.appendChild(otp);
const sr = AL('HORIZONTAL', { name: 'Save row', gap: 12, align: 'CENTER', p: [16, 0, 0, 0] }); strokeSides(sr, 'border/subtle', { t: 1 }); add(ch, [sr, 'FILL']);
add(sr, [await T('Save stays disabled until both fields are filled.', 'Caption', 'text/tertiary'), 'FILL']); sr.appendChild(await BTN('Primary', 'Save new code', { size: 'M', state: 'Disabled' }));
// fake
const fk = card('Card — Spot a fake', { gap: 12, fill: 'surface/raised' }); add(M, [fk, 'FILL']);
fk.appendChild(await T('Spotted a message without your code?', 'Heading/H5', 'text/primary'));
const fr = AL('HORIZONTAL', { name: 'Steps', gap: 16 }); add(fk, [fr, 'FILL']); const TW = Math.floor((CW - 32) / 3);
for (const [i, t, b] of [['x-circle', 'Don’t click or reply', 'Links in fake emails lead to look-alike sign-in pages.'], ['mail', 'Forward it to us', 'Send it to security@example.com — we take fake sites down.'], ['lock', 'Signed in on a fake page?', 'Change your password and review your devices straight away.']]) add(fr, [await bullet(i, t, b, TW), 'FILL']);
await footA(S);
await place(S.f, sec, 4, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
