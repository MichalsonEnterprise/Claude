async function ma5() {
const NAME = '[USR-A5] Verification Documents / 390 / Default';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellM(NAME, { back: 'Account', title: 'Verification documents', sub: 'Previews are blurred for your privacy. Only our compliance team can open the full files.' });
const C = S.C;
async function doc(icon, t, file, meta, ch) {
  const c = card('Document — ' + t, { gap: 12, p: 16 }); add(C, [c, 'FILL']);
  const h = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']);
  const th = AL('HORIZONTAL', { name: 'Preview (blurred)', w: 64, h: 44, r: 10, align: 'CENTER', justify: 'CENTER', stroke: 'border/subtle', clip: true }); await tryy('skeleton', () => gfill(th, 'Gradient/Skeleton')); if (!th.fills.length) fill(th, 'surface/raised'); th.appendChild(await IC(icon, 20, 'icon/muted')); h.appendChild(th);
  const x = AL('VERTICAL', { name: 'Text', gap: 2 }); add(h, [x, 'FILL']); add(x, [await T(t, 'Body/S Strong', 'text/primary', { w: 200 }), 'FILL']); add(x, [await T(file, 'Mono/S', 'text/secondary', { w: 200 }), 'FILL']);
  h.appendChild(await DEMO('XS'));
  add(c, [await T(meta, 'Caption', 'text/tertiary', { w: IW }), 'FILL']); c.appendChild(ch); return c;
}
await groupLabel(C, 'On file · Level 2');
await doc('id-card', 'Passport · PT — photo page', 'passport_photo_page.jpg', 'Approved 12 Jan 2026, 11:48 UTC · expires 8 Jun 2031 · 2.4 MB', await chip('check-circle', 'Approved', 'success'));
await doc('face-scan', 'Selfie video — liveness check', 'liveness_2026-01-12.mp4', 'Passed 12 Jan 2026 · used only to match you to your ID · 6.1 MB', await chip('check-circle', 'Approved', 'success'));
add(C, [await noteBox('check-circle', 'Nothing requested right now. If we ever need more — e.g. proof of address for Level 3 — you’ll see it here and by email, never by chat or social media.', 'success', W), 'FILL']);
const up = card('Card — Upload', { gap: 12, p: 16 }); add(C, [up, 'FILL']);
up.appendChild(await T('Upload a document', 'Heading/H5', 'text/primary'));
const sf = await tryy('select', () => I('13:565', { State: 'Default' }, { Label: 'Document type', Value: 'Proof of address — Level 3', 'Show helper': false, 'Show leading icon': false })); if (sf) add(up, [sf, 'FILL']);
const fu = await tryy('upload', () => I('20:9454', { State: 'Empty' }, { Label: 'Your file', Description: 'Take a photo or choose a file · JPG, PNG or PDF up to 10 MB', 'Show privacy note': true })); if (fu) add(up, [fu, 'FILL']);
for (const t of ['Issued in the last 3 months', 'Shows your name and Lisbon address', 'Original file — no screenshots or edits']) add(up, [await check(t, true, IW, 'info'), 'FILL']);
add(C, [await T('Kept for 5 years after your account closes, as anti-money-laundering law requires.', 'Caption', 'text/tertiary', { w: W }), 'FILL']);
add(C, [await BTN('Ghost', 'Download my documents', { size: 'L', lead: 'download' }), 'FILL']);
await licM(C);
await endM(S);
await placeM(S.f, sec, 4); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
