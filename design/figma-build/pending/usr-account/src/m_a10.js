async function ma10() {
const NAME = '[USR-A10] Anti-Phishing Code / 390 / Default';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellM(NAME, { back: 'Security', title: 'Anti-phishing code', sub: 'We put it in every email and 2FA prompt. No code? It isn’t us.' });
const C = S.C;
const yc = card('Card — Your code', { gap: 12, p: 16 }); add(C, [yc, 'FILL']);
const cb = AL('HORIZONTAL', { name: 'Code', gap: 12, p: [16, 16, 16, 16], fill: 'surface/raised', stroke: 'border/brand', r: 14, align: 'CENTER' }); add(yc, [cb, 'FILL']);
cb.appendChild(await IC('shield-check', 24, 'icon/brand')); add(cb, [await T('AURORA-27', 'Heading/H3', 'text/brand'), 'FILL']); cb.appendChild(await DEMO('S'));
add(yc, [await T('Set 3 Mar 2026, together with two-factor authentication. Support will never ask for it.', 'Body/S', 'text/secondary', { w: IW }), 'FILL']);
for (const t of ['Every email', '2FA dialogs', 'Withdrawal confirmations', 'Security alerts']) add(yc, [await check(t, true, IW, 'info'), 'FILL']);
const mail = AL('VERTICAL', { name: 'Email mock', fill: 'bg/secondary', stroke: 'border/default', r: 14, clip: true }); add(C, [mail, 'FILL']);
const mh = AL('VERTICAL', { name: 'Envelope', gap: 4, p: 12 }); strokeSides(mh, 'border/subtle', { b: 1 }); add(mail, [mh, 'FILL']);
const mr = AL('HORIZONTAL', { name: 'From', gap: 6, align: 'CENTER' }); add(mh, [mr, 'FILL']); add(mr, [await T('GLOBAL POOL · no-reply@globalpool.example', 'Caption', 'text/secondary', { w: 260 }), 'FILL']); mr.appendChild(await DEMO('XS'));
add(mh, [await T('To: n•••@example.com · 27 Nov 2026, 18:44 UTC', 'Caption', 'text/tertiary', { w: 326 }), 'FILL']); add(mh, [await T('Withdrawal WD-20931 is under review', 'Body/S Strong', 'text/primary', { w: 326 }), 'FILL']);
const band = AL('HORIZONTAL', { name: 'Code band', gap: 8, p: [8, 12, 8, 12], fill: 'brand/tint', align: 'CENTER' }); add(mail, [band, 'FILL']); band.appendChild(await IC('shield-check', 16, 'icon/brand')); add(band, [await T('Your anti-phishing code: AURORA-27', 'Label/M', 'text/brand'), 'FILL']);
const mb = AL('VERTICAL', { name: 'Body', p: 12 }); add(mail, [mb, 'FILL']); add(mb, [await T('Hi Nova, we’re running a routine AML check on your withdrawal of 1,500.00 USDT. Expected decision by 22:44 UTC. We will never ask for your password, 2FA codes or seed phrase.', 'Caption', 'text/secondary', { w: 326 }), 'FILL']);
const ch = card('Card — Change', { gap: 12, p: 16 }); add(C, [ch, 'FILL']);
ch.appendChild(await T('Change your code', 'Heading/H5', 'text/primary'));
const ni = await tryy('input', async () => { const i = await I('13:762', { State: 'Default', Size: 'L' }, { Label: 'New anti-phishing code', 'Show label': true, 'Show leading icon': false, 'Show trailing icon': false, 'Show helper': true }); await byLayer(i, { 'Value text': 'e.g. LIGHTHOUSE-9', 'Helper text': '4–20 letters, numbers or hyphens.' }); return i; }); if (ni) add(ch, [ni, 'FILL']);
const otp = await tryy('otp', () => I('16:3761', { State: 'Empty' }, { Label: 'Authenticator code', Description: 'Needed to change security settings' })); if (otp) add(ch, [otp, 'FILL']);
add(C, [await noteBox('mail', 'Email without your code? Treat it as fake — don’t click links, and forward it to security@globalpool.example (DEMO placeholder).', 'warning', W), 'FILL']);
await licM(C);
await endM(S, { cta: [await BTN('Primary', 'Save new code', { size: 'L', state: 'Disabled' })] });
await placeM(S.f, sec, 9); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
