async function a4(STATE) {
const NAME = '[USR-A4] KYC Status / 1440 / ' + STATE;
const sk = skipIf(sec, NAME); if (sk) return sk;
const K = {
  'Not started': { lvl: 'L1', chipS: 'Not started', icon: 'id-card', tone: 'info', title: 'Verify your identity to withdraw', body: 'You haven’t started verification yet. You can deposit and play within your responsible-gaming limits, but withdrawals need Level 1 — we tell you now so nothing is a surprise later.', meta: 'Takes about 5 minutes · have a passport, ID card or driving licence ready', cta: ['Primary', 'Start verification'], cta2: ['Ghost', 'What we check'], cur: 0 },
  'Pending': { lvl: 'L2', chipS: 'Pending', icon: 'hourglass', tone: 'pending', title: 'We’re reviewing your Level 2 documents', body: 'Submitted 27 Nov 2026, 15:20 UTC. Most reviews finish within 24 hours — expected by 28 Nov 2026, 15:20 UTC. We’ll email you and notify you in the app. Level 1 limits stay active meanwhile.', meta: 'Reference KYC-77120 · passport + selfie video', cta: ['Secondary', 'View submission'], cta2: ['Ghost', 'Contact support'], cur: 1, review: true },
  'Approved': { lvl: 'L2', chipS: 'Approved', icon: 'shield-check', tone: 'success', title: 'You’re verified — Level 2', body: 'Approved 3 Sep 2026. Withdrawals up to 25,000.00 USDT per day. Your passport is valid until 18 Jun 2031 — we’ll remind you 60 days before it expires.', meta: 'Reference KYC-48213 · reviewed by our compliance team', cta: ['Secondary', 'Learn about Level 3'], cta2: ['Ghost', 'View documents'], cur: 2 },
  'Rejected': { lvl: 'L2', chipS: 'Rejected', icon: 'x-circle', tone: 'danger', title: 'We couldn’t approve your Level 2 documents', body: 'Reviewed 26 Nov 2026, 14:05 UTC. Nothing is wrong with your account — one photo needs retaking. Level 1 limits stay active and you can resubmit right away.', meta: 'Reference KYC-77098 · resubmissions are usually reviewed within 24 h', cta: ['Primary', 'Retake passport photo'], cta2: ['Secondary', 'Use a different document'], cur: 1, reasons: true },
  'Expired': { lvl: 'L2', chipS: 'Expired', icon: 'alert-triangle', tone: 'warning', title: 'Your ID document has expired', body: 'Your passport expired on 20 Nov 2026, so Level 2 limits are paused. Until you upload a valid ID you’re on Level 1: withdrawals up to 2,000.00 USDT per day. Your balance stays yours and withdrawable.', meta: 'Alternate DEMO scenario · liveness check still valid, only the ID needs replacing', cta: ['Primary', 'Upload a new ID'], cta2: ['Ghost', 'Why we re-check'], cur: 1 },
}[STATE];
const kc = await tryy('KYC chip', () => I('23:5565', { Status: K.chipS, Level: K.lvl }));
const S = await shellA(NAME, 'KYC status', { sub: 'Verification unlocks higher limits and keeps the platform compliant with anti-money-laundering rules. Documents are encrypted and reviewed only by our compliance team.', actions: [kc] });
const M = S.main;
// hero
const hero = AL('HORIZONTAL', { name: 'Status — ' + STATE, gap: 20, p: 24, fill: 'surface/default', stroke: tk(K.tone === 'pending' ? 'status/pending' : 'border/' + K.tone, tk('status/' + K.tone, 'border/default')), r: 14 }); add(M, [hero, 'FILL']);
hero.appendChild(await iconTile(K.icon, tk('status/' + K.tone, 'icon/brand'), 56, tk('status/' + K.tone + '-tint')));
const ht = AL('VERTICAL', { name: 'Text', gap: 8 }); add(hero, [ht, 'FILL']);
add(ht, [await T(K.title, 'Heading/H4', 'text/primary', { w: 560 }), 'FILL']);
add(ht, [await T(K.body, 'Body/M', 'text/secondary', { w: 560 }), 'FILL']);
const mr = AL('HORIZONTAL', { name: 'Meta', gap: 8, align: 'CENTER' }); ht.appendChild(mr); mr.appendChild(await T(K.meta, 'Caption', 'text/tertiary')); mr.appendChild(await DEMO('XS'));
const ar = AL('HORIZONTAL', { name: 'Actions', gap: 12, p: [8, 0, 0, 0] }); ht.appendChild(ar); ar.appendChild(await BTN(K.cta[0], K.cta[1], { size: 'M' })); ar.appendChild(await BTN(K.cta2[0], K.cta2[1], { size: 'M' }));
if (K.review) {
  const tl = card('Card — Review progress', { gap: 0 }); add(M, [tl, 'FILL']);
  await head(tl, 'Review progress', null, CW, [await DEMO('S')]);
  async function stp(t, when, icon, tone, last) { const r = AL('HORIZONTAL', { name: 'Step — ' + t, gap: 16, align: 'CENTER', p: [12, 0, 12, 0] }); if (!last) strokeSides(r, 'border/subtle', { b: 1 }); r.appendChild(await IC(icon, 20, tk('status/' + tone, 'icon/default'))); add(r, [await T(t, 'Body/S Strong', 'text/primary'), 'FILL']); r.appendChild(await T(when, 'Body/S', 'text/secondary')); return r; }
  add(tl, [await stp('Documents submitted', '27 Nov 2026, 15:20 UTC', 'check-circle', 'success'), 'FILL']);
  add(tl, [await stp('Automated checks — document, face match, liveness', '27 Nov 2026, 15:24 UTC', 'check-circle', 'success'), 'FILL']);
  add(tl, [await stp('Compliance review', 'In progress', 'clock', 'pending'), 'FILL']);
  add(tl, [await stp('Decision', 'Expected by 28 Nov 2026, 15:20 UTC', 'hourglass', 'info', true), 'FILL']);
}
if (K.reasons) {
  const rc = card('Card — What we checked', { gap: 12 }); add(M, [rc, 'FILL']);
  await head(rc, 'What we checked', 'Only one check failed. Everything else is saved, so you won’t repeat the selfie video.', CW, [await DEMO('S')]);
  const g = AL('HORIZONTAL', { name: 'Checks', gap: 24 }); add(rc, [g, 'FILL']);
  const gl = AL('VERTICAL', { name: 'Left', gap: 10 }); add(g, [gl, 'FILL']); const gr = AL('VERTICAL', { name: 'Right', gap: 10 }); add(g, [gr, 'FILL']);
  const HW = Math.floor((CW - 24) / 2);
  add(gl, [await check('Image quality — passport photo page is blurry; the two lines at the bottom can’t be read', false, HW), 'FILL']);
  add(gl, [await check('Document type — passport accepted', true, HW), 'FILL']);
  add(gl, [await check('Document validity — valid until 18 Jun 2031', true, HW), 'FILL']);
  add(gr, [await check('Name and date of birth match your profile', true, HW), 'FILL']);
  add(gr, [await check('Liveness — selfie video passed', true, HW), 'FILL']);
  add(gr, [await check('Sanctions & PEP screening — clear', true, HW), 'FILL']);
  const fx2 = card('Card — How to fix it', { gap: 12, fill: 'surface/raised' }); add(M, [fx2, 'FILL']);
  fx2.appendChild(await T('How to get it right next time', 'Heading/H5', 'text/primary'));
  const tips = AL('HORIZONTAL', { name: 'Tips', gap: 16 }); add(fx2, [tips, 'FILL']); const TW = Math.floor((CW - 32) / 3);
  for (const [i, t, b] of [['camera', 'Use daylight, no flash', 'Glare hides the printed lines at the bottom of the page.'], ['layers', 'All four corners in frame', 'Lay the passport flat on a dark surface and fill most of the frame.'], ['eye', 'Check before sending', 'Zoom in: every letter in the bottom two lines should be sharp.']]) add(tips, [await bullet(i, t, b, TW), 'FILL']);
}
// levels ladder
const lv = card('Card — Verification levels', { gap: 16 }); add(M, [lv, 'FILL']);
await head(lv, 'Verification levels', 'Limits apply per day (00:00–23:59 UTC) across all networks. Your responsible-gaming limits always apply on top.', CW, [await DEMO('S')]);
const lr = AL('HORIZONTAL', { name: 'Levels', gap: 16 }); add(lv, [lr, 'FILL']); const LW = Math.floor((CW - 32) / 3);
const LV = [
  ['Level 1', 'Basic details', 'Legal name, date of birth and address', '2,000.00 USDT'],
  ['Level 2', 'ID + liveness', 'Passport, ID card or driving licence, plus a short selfie video', '25,000.00 USDT'],
  ['Level 3', 'Enhanced', 'Proof of address and source of funds, reviewed by compliance', '100,000.00 USDT'],
];
const stat = { 'Not started': ['todo', 'todo', 'todo'], 'Pending': ['done', 'review', 'todo'], 'Approved': ['done', 'current', 'todo'], 'Rejected': ['done', 'fix', 'todo'], 'Expired': ['current', 'paused', 'todo'] }[STATE];
for (let i = 0; i < 3; i++) {
  const s = stat[i]; const hl = s === 'current';
  const c = card('Level — ' + LV[i][0], { gap: 10, p: 16, fill: hl ? 'surface/selected' : 'surface/raised', stroke: hl ? 'border/brand' : 'border/subtle' }); add(lr, [c, 'FILL']); c.layoutSizingVertical = 'FILL';
  const h = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(c, [h, 'FILL']); add(h, [await T(LV[i][0] + ' · ' + LV[i][1], 'Label/L', 'text/primary'), 'FILL']);
  const cm = { done: ['check-circle', 'Done', 'success'], current: ['shield-check', 'Your level', 'success'], review: ['clock', 'In review', 'pending'], fix: ['alert-circle', 'Action needed', 'danger'], paused: ['pause-circle', 'Paused', 'warning'], todo: ['lock', 'Not started', 'info'] }[s];
  c.appendChild(await chip(cm[0], cm[1], cm[2]));
  add(c, [await T(LV[i][2], 'Body/S', 'text/secondary', { w: LW - 32 }), 'FILL']);
  const wl = AL('VERTICAL', { name: 'Limit', gap: 2, p: [8, 0, 0, 0] }); strokeSides(wl, 'border/subtle', { t: 1 }); add(c, [wl, 'FILL']); wl.appendChild(await T('Withdrawals per day', 'Caption', 'text/tertiary')); const nr = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'CENTER' }); wl.appendChild(nr); nr.appendChild(await T(LV[i][3], 'Number/S', 'text/primary')); nr.appendChild(await DEMO('XS'));
}
// privacy + help
const pr = AL('HORIZONTAL', { name: 'Privacy row', gap: 24 }); add(M, [pr, 'FILL']); const HW2 = Math.floor((MW - 24) / 2) - 48;
const p1 = card('Card — Your data', { gap: 12 }); add(pr, [p1, 'FILL']); p1.layoutSizingVertical = 'FILL';
p1.appendChild(await T('How we handle your documents', 'Heading/H5', 'text/primary'));
add(p1, [await bullet('lock', 'Encrypted and access-logged', 'Only our compliance team can open them, and every view is recorded.', HW2), 'FILL']);
add(p1, [await bullet('calendar', 'Kept 5 years after you leave', 'Anti-money-laundering law sets this period. Then they are deleted.', HW2, 'icon/muted'), 'FILL']);
const p2 = card('Card — Safety', { gap: 12 }); add(pr, [p2, 'FILL']); p2.layoutSizingVertical = 'FILL';
p2.appendChild(await T('We will never…', 'Heading/H5', 'text/primary'));
for (const t of ['ask for documents by chat, phone or social media', 'ask for your wallet seed phrase or 2FA codes', 'charge a fee to verify you']) add(p2, [await check(t, true, HW2, 'info'), 'FILL']);
await footA(S);
await place(S.f, sec, 3, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
