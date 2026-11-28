async function a5() {
const NAME = '[USR-A5] Verification Documents / 1440 / Default';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Verification documents', { sub: 'Documents you’ve shared for identity checks. Previews are blurred here for your privacy — only our compliance team can open the full files.', actions: [await BTN('Secondary', 'Download my documents', { size: 'M', lead: 'download' })] });
const M = S.main;
const oc = card('Card — On file', { gap: 0 }); add(M, [oc, 'FILL']);
await head(oc, 'On file', '2 approved documents · KYC Level 2', CW, [await DEMO('S')]);
const sp = AL('VERTICAL', { name: 'Spacer', h: 8 }); add(oc, [sp, 'FILL']);
async function doc(icon, title, file, meta, st, right) {
  const r = AL('HORIZONTAL', { name: 'Document — ' + title, gap: 16, align: 'CENTER', p: [16, 0, 16, 0] }); strokeSides(r, 'border/subtle', { t: 1 });
  const th = AL('HORIZONTAL', { name: 'Preview (blurred)', w: 88, h: 60, r: 10, align: 'CENTER', justify: 'CENTER', stroke: 'border/subtle', clip: true }); await tryy('skeleton', () => gfill(th, 'Gradient/Skeleton')); if (!th.fills.length) fill(th, 'surface/raised'); th.appendChild(await IC(icon, 24, 'icon/muted')); r.appendChild(th);
  const tx = AL('VERTICAL', { name: 'Text', gap: 4 }); add(r, [tx, 'FILL']);
  add(tx, [await T(title, 'Body/M Strong', 'text/primary', { w: 420 }), 'FILL']);
  const fr = AL('HORIZONTAL', { name: 'File', gap: 8, align: 'CENTER' }); tx.appendChild(fr); fr.appendChild(await T(file, 'Mono/S', 'text/secondary')); fr.appendChild(await DEMO('XS'));
  add(tx, [await T(meta, 'Caption', 'text/tertiary', { w: 420 }), 'FILL']);
  r.appendChild(st); if (right) r.appendChild(right); return r;
}
add(oc, [await doc('id-card', 'Passport — photo page', 'passport_photo_page_2.jpg · 2.4 MB', 'Uploaded 3 Sep 2026, 09:14 UTC · approved 3 Sep 2026, 13:40 UTC · valid until 18 Jun 2031', await chip('check-circle', 'Approved', 'success'), await btnIcon('more')), 'FILL']);
add(oc, [await doc('face-scan', 'Selfie video — liveness check', 'liveness_2026-09-03.mp4 · 6.1 MB', 'Recorded 3 Sep 2026, 09:16 UTC · approved 3 Sep 2026, 13:40 UTC · used only to match you to your ID', await chip('check-circle', 'Approved', 'success'), await btnIcon('more')), 'FILL']);
add(oc, [await doc('id-card', 'Passport — earlier upload', 'passport_photo_page_1.jpg · 1.9 MB', 'Uploaded 2 Sep 2026, 21:03 UTC · not accepted: photo too blurry · replaced by the upload above', await chip('rotate-ccw', 'Replaced', 'info'), null), 'FILL']);
// requested
const rq = card('Card — Requested by us', { gap: 12 }); add(M, [rq, 'FILL']);
const rh = AL('HORIZONTAL', { name: 'Header', gap: 16, align: 'CENTER' }); add(rq, [rh, 'FILL']); rh.appendChild(await iconTile('check-circle', tk('status/success', 'icon/brand'), 40));
const rt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(rh, [rt, 'FILL']); add(rt, [await T('Nothing requested right now', 'Body/M Strong', 'text/primary', { w: 560 }), 'FILL']);
add(rt, [await T('If we ever need more — for example source of funds for Level 3 — it appears here and by email, with the reason and a deadline. We never ask for documents by chat, phone or social media.', 'Body/S', 'text/secondary', { w: 560 }), 'FILL']);
// upload
const up = card('Card — Upload a document', { gap: 16 }); add(M, [up, 'FILL']);
await head(up, 'Upload a document', 'Moving house or applying for Level 3? Add a document here — we’ll review it within 2 business days.', CW);
const ur = AL('HORIZONTAL', { name: 'Upload row', gap: 24 }); add(up, [ur, 'FILL']);
const ul = AL('VERTICAL', { name: 'Form', gap: 16 }); add(ur, [ul, 'FILL']);
const sf = await tryy('select', () => I('13:565', { State: 'Default' }, { Label: 'Document type', Value: 'Proof of address — Level 3', 'Show helper': false, 'Show leading icon': false })); if (sf) add(ul, [sf, 'FILL']);
const fu = await tryy('file upload', () => I('20:9454', { State: 'Empty' }, { Label: 'Your file', Description: 'Drag a file here or browse · JPG, PNG or PDF up to 10 MB', 'Show privacy note': true })); if (fu) add(ul, [fu, 'FILL']);
const req = ALX('VERTICAL', { name: 'Card — Requirements', gap: 10, p: 20, fill: 'surface/raised', stroke: 'border/subtle', r: 14, w: 300 }); ur.appendChild(req);
req.appendChild(await T('Proof of address must…', 'Label/L', 'text/primary'));
for (const t of ['be issued in the last 3 months', 'show your name and Rua das Flores 12, Lisboa', 'be a utility bill, bank statement or tax letter', 'be the original file — no screenshots or edits']) add(req, [await check(t, true, 260, 'info'), 'FILL']);
await footA(S);
await place(S.f, sec, 4, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
