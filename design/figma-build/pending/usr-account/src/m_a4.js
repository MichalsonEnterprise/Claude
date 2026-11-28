async function ma4(STATE) {
const REJ = STATE === 'Rejected';
const NAME = '[USR-A4] KYC Status / 390 / ' + STATE;
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellM(NAME, { back: 'Account', title: 'Identity verification (KYC)', sub: 'Licensed operators must verify every player. Your level sets your withdrawal limit.' });
const C = S.C;
const tone = REJ ? 'danger' : 'success';
const hero = card('Status — ' + STATE, { gap: 12, p: 16, stroke: tk('border/' + tone, 'border/default') }); add(C, [hero, 'FILL']);
const hh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(hero, [hh, 'FILL']); hh.appendChild(await iconTile(REJ ? 'x-circle' : 'shield-check', tk('status/' + tone, 'icon/brand'), 48, tk('status/' + tone + '-tint')));
const hx = AL('VERTICAL', { name: 'Chip', gap: 4 }); add(hh, [hx, 'FILL']); const kc = await tryy('kyc', () => I('23:5565', { Status: REJ ? 'Rejected' : 'Approved', Level: 'L2' })); if (kc) hx.appendChild(kc);
hh.appendChild(await DEMO('XS'));
add(hero, [await T(REJ ? 'We couldn’t verify your ID — please retake the photo' : 'You’re verified — Level 2', 'Heading/H4', 'text/primary', { w: IW }), 'FILL']);
add(hero, [await T(REJ ? 'Nothing is wrong with your account. The photo wasn’t clear enough to read. Your Level 1 limits stay active.' : 'Withdraw up to 25,000.00 USDT every 24 hours and receive Global Pool prizes of any size.', 'Body/S', 'text/secondary', { w: IW }), 'FILL']);
add(hero, [await T(REJ ? 'Reviewed 27 Nov 2026, 17:05 UTC · Ref KYC-77120 · 2 of 3 attempts left' : 'Verified 12 Jan 2026, 11:48 UTC · Ref KYC-55031', 'Caption', 'text/tertiary', { w: IW }), 'FILL']);
if (REJ) {
  const rc = card('Card — Why it was declined', { gap: 10, p: 16 }); add(C, [rc, 'FILL']);
  rc.appendChild(await T('Why it was declined', 'Heading/H5', 'text/primary'));
  add(rc, [await check('Document number unreadable — glare covers the number on the photo page', false, IW), 'FILL']);
  add(rc, [await check('Edge of the document cut off — all four corners must be visible', false, IW), 'FILL']);
  const tp = card('Card — Tips', { gap: 12, p: 16, fill: 'surface/raised' }); add(C, [tp, 'FILL']);
  tp.appendChild(await T('Tips for a clear photo', 'Heading/H5', 'text/primary'));
  for (const [i, t] of [['layers', 'Place the ID on a dark, flat surface'], ['zap', 'Turn off the flash and avoid direct lamps'], ['camera', 'Fill the frame — all four corners visible'], ['id-card', 'Use the original document, not a copy or screen']]) add(tp, [await bullet(i, t, null, IW), 'FILL']);
} else {
  const dl = card('Card — Verification details', { gap: 0, p: 16 }); add(C, [dl, 'FILL']);
  dl.appendChild(await T('Verification details', 'Heading/H5', 'text/primary'));
  for (const [l, v] of [['Identity document', 'Passport · PT'], ['Document expires', '8 Jun 2031'], ['Liveness check', 'Passed · 12 Jan 2026'], ['Country', 'Portugal (permitted)'], ['Next routine review', '12 Jan 2028']]) add(dl, [await kv(l, v), 'FILL']);
}
await groupLabel(C, 'Verification levels · withdrawals per 24 h');
const lv = list(C, 'List — Levels');
const L = [['user', 'Level 1 · Basic details', 'Name, date of birth and address', ['check-circle', 'Done', 'success']], ['id-card', 'Level 2 · Full verification', 'Photo ID + selfie · 25,000.00 USDT', REJ ? ['alert-circle', 'Retake photo', 'danger'] : ['shield-check', 'Your level', 'success']], ['file', 'Level 3 · Enhanced', 'Proof of address · 100,000.00 USDT', ['lock', 'Optional', 'info']]];
for (let i = 0; i < 3; i++) add(lv, [await lrow(L[i][0], L[i][1], L[i][2], { chev: false, demo: i > 0, last: i === 2, right: [await chip(L[i][3][0], L[i][3][1], L[i][3][2])] }), 'FILL']);
add(C, [await noteBox('lock', 'We never ask for documents by chat, phone or social media, and never charge to verify you.', 'info', W), 'FILL']);
await licM(C);
await endM(S, REJ ? { cta: [await BTN('Primary', 'Retake ID photo', { size: 'L', lead: 'camera' })] } : {});
await placeM(S.f, sec, 3); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
