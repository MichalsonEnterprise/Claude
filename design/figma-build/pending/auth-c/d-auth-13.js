// ===== AUTH-13 Document upload (MODE: 'Requirements' | 'Preview' | 'Error') =====
async function build(MODE) {
  const NAME = 'AUTH-13 KYC Document Upload / 1440 / ' + MODE;
  if (sec.children.find(c => c.name === NAME)) return { skipped: NAME };

const { d, side, main } = await dialog({ over: 'Step 3 of 5 · Document', st: 'Accepted documents', sb: 'Any one of these, valid and in your name. Expired documents are rejected automatically.', artName: 'ID card front and back', chip: ['Approved', 'L1'], step: 2,
  art: async (a) => { band(a, 116, 'mint/700', 160, -12); band(a, 92, 'brand/primary', 14, -12); await idCard(a, 120, 20, 8, { back: true }); await idCard(a, 14, 84, -6); },
  facts: [['check-circle', 'Passport, national ID card or driving licence'], ['calendar', 'Valid on the day you submit — not expired'], ['file', 'JPG, PNG or PDF, up to 10 MB per side'], ['ban', 'No screenshots, photocopies or photos of a screen']] });
function miniCard(p, x, y, w = 110) { const h = Math.round(w * 0.63); const c = figma.createFrame(); c.name = 'Mini ID card'; c.resize(w, h); fill(c, 'paper/50'); radius(c, 6); c.clipsContent = true; p.appendChild(c); R(c, 0, 0, w, Math.round(h * 0.2), 'mint/600'); R(c, 6, Math.round(h * 0.3), Math.round(w * 0.26), Math.round(h * 0.56), 'paper/300', 4); R(c, Math.round(w * 0.38), Math.round(h * 0.32), Math.round(w * 0.5), 5, 'paper/600', 2); R(c, Math.round(w * 0.38), Math.round(h * 0.48), Math.round(w * 0.4), 5, 'paper/300', 2); R(c, Math.round(w * 0.38), Math.round(h * 0.62), Math.round(w * 0.46), 5, 'paper/300', 2); c.x = x; c.y = y; return c; }
const tb = box(main, 'VERTICAL', { name: 'Title', gap: 8 });
await tx(tb, MODE === 'Preview' ? 'Check your photos' : MODE === 'Error' ? 'Retake the back of your ID card' : 'Upload your identity document', 'Heading/H3', 'text/primary');
await tx(tb, MODE === 'Preview' ? 'Both sides passed our quality checks. Make sure the details below are yours before you continue.' : MODE === 'Error' ? 'Your front photo is fine and stays uploaded. Only the back needs a new photo.' : 'Choose a document, then add a clear colour photo of each side.', 'Body/M', 'text/secondary');
if (MODE === 'Requirements') {
  const dt = box(main, 'VERTICAL', { name: 'Document type', gap: 12 });
  const dh = box(dt, 'HORIZONTAL', { name: 'Label row', gap: 12, align: 'CENTER' }); dh.appendChild(await T('Document type', 'Label/L', 'text/primary')); box(dh, 'HORIZONTAL', { name: 'Spacer' }); const ic = await I('13:565', { State: 'Default' }, { Label: 'Issuing country', Value: 'Portugal', 'Show helper': false, 'Show leading icon': false }); ic.name = 'Select/Field — Issuing country'; dh.appendChild(ic); ic.resize(240, ic.height);
  const dr = box(dt, 'HORIZONTAL', { name: 'Options', gap: 12 });
  for (const [lab, ds, on] of [['Passport', 'Photo page only · 1 photo', false], ['National ID card', 'Front and back · 2 photos', true], ['Driving licence', 'Front and back · 2 photos', false]]) { const c = box(dr, 'VERTICAL', { name: 'Option — ' + lab, p: 12, r: 14, fill: on ? 'surface/selected' : 'surface/default', stroke: on ? 'border/brand' : 'border/subtle', sw: on ? 2 : 1 }); const r = await I('20:3259', { Selected: on ? 'Yes' : 'No', State: 'Default' }, { Label: lab, Description: ds, 'Show description': true }); c.appendChild(r); r.layoutSizingHorizontal = 'FILL'; }
  const rq = box(main, 'VERTICAL', { name: 'Photo requirements', gap: 12 }); rq.appendChild(await T('What a good photo looks like', 'Label/L', 'text/primary'));
  const ex = box(rq, 'HORIZONTAL', { name: 'Examples', gap: 12 });
  for (const [k, lab, ok] of [['good', 'All four corners, sharp, no glare', true], ['crop', 'Cropped — corners cut off', false], ['glare', 'Glare covers the details', false], ['blur', 'Blurry or out of focus', false]]) {
    const t = box(ex, 'VERTICAL', { name: 'Example — ' + lab, gap: 8 }); const fr = figma.createFrame(); fr.name = 'Example photo'; fr.resize(156, 92); fill(fr, 'ink/900'); radius(fr, 10); fr.clipsContent = true; t.appendChild(fr); fr.layoutSizingHorizontal = 'FILL';
    const c = miniCard(fr, k === 'crop' ? 64 : 23, k === 'crop' ? 36 : 11, 110); if (k === 'glare') E(fr, 48, 4, 76, 50, 'alpha/white-64', 'Glare'); if (k === 'blur') c.effects = [{ type: 'LAYER_BLUR', blurType: 'NORMAL', radius: 3, visible: true }]; stroke(fr, ok ? 'border/success' : 'border/subtle', ok ? 2 : 1);
    const v = box(t, 'HORIZONTAL', { name: 'Verdict', gap: 6 }); v.appendChild(await IC(ok ? 'check-circle' : 'x-circle', 16, ok ? 'status/success' : 'status/danger')); await tx(v, lab, 'Caption', ok ? 'text/success' : 'text/secondary'); }
  const up = box(main, 'HORIZONTAL', { name: 'Upload — front and back', gap: 16 });
  for (const side of ['front', 'back']) { const u = await I('20:9454', { State: 'Empty' }, { Label: 'National ID card — ' + side, Description: side === 'front' ? 'The side with your photo' : 'The side with the barcode and machine-readable lines', 'Show privacy note': side === 'front' }); u.name = 'Input/File Upload — ' + side; up.appendChild(u); u.layoutSizingHorizontal = 'FILL'; }
  await footer(main, [await BTN('Secondary', 'Back', { size: 'L', lead: 'arrow-left' })], 'Add both sides to continue — or switch to your phone camera.', [await BTN('Ghost', 'Use my phone', { size: 'L', lead: 'smartphone' }), await BTN('Primary', 'Continue', { size: 'L', state: 'Disabled', trail: 'arrow-right' })]);
} else {
  const sm = box(main, 'HORIZONTAL', { name: 'Document summary', gap: 10, p: [12, 16, 12, 16], fill: 'surface/default', stroke: 'border/subtle', r: 10, align: 'CENTER' }); sm.appendChild(await IC('id-card', 18, 'icon/brand')); await tx(sm, 'National ID card · issued in Portugal', 'Label/M', 'text/primary'); sm.appendChild(await T('Change document', 'Label/M', 'text/brand'));
  if (MODE === 'Error') { const al = box(main, 'HORIZONTAL', { name: 'Alert — unreadable back photo', gap: 12, p: 16, fill: 'status/danger-tint', stroke: 'border/danger', r: 14 }); al.appendChild(await IC('alert-circle', 20, 'status/danger')); const ac = box(al, 'VERTICAL', { name: 'Copy', gap: 4 }); await tx(ac, "We couldn't read the back of your ID card", 'Label/L', 'text/primary'); await tx(ac, 'The document number and the machine-readable lines at the bottom are blurred, so the automated check can’t match them. Nothing was submitted.', 'Body/S', 'text/secondary'); }
  const pr = box(main, 'HORIZONTAL', { name: 'Previews', gap: 16 });
  for (const sd of ['front', 'back']) {
    const bad = MODE === 'Error' && sd === 'back';
    const t = box(pr, 'VERTICAL', { name: 'Preview — ' + sd, gap: 10, p: 12, fill: 'surface/default', stroke: bad ? 'border/danger' : 'border/subtle', sw: bad ? 2 : 1, r: 14 });
    const hr = box(t, 'HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); hr.appendChild(await T(sd === 'front' ? 'Front' : 'Back', 'Label/L', 'text/primary')); box(hr, 'HORIZONTAL', { name: 'Spacer' }); const bd = await BADGE(bad ? 'Failed' : 'Approved', 'S'); await setT(bd, 'Label', bad ? 'Too blurry to read' : 'Looks good'); hr.appendChild(bd);
    const pv = figma.createFrame(); pv.name = 'Photo preview (DEMO)'; pv.resize(294, 190); fill(pv, 'ink/900'); radius(pv, 10); pv.clipsContent = true; t.appendChild(pv); pv.layoutSizingHorizontal = 'FILL';
    const cd = await idCard(pv, 27, 19, 0, { back: sd === 'back' }); if (bad) cd.effects = [{ type: 'LAYER_BLUR', blurType: 'NORMAL', radius: 4, visible: true }];
    const mr = box(t, 'HORIZONTAL', { name: 'File meta', gap: 8, align: 'CENTER' }); mr.appendChild(await T(sd === 'front' ? 'id_front.jpg' : 'id_back.jpg', 'Mono/S', 'text/secondary')); await tx(mr, sd === 'front' ? '3.8 MB' : '3.1 MB', 'Caption', 'text/tertiary'); mr.appendChild(bad ? await BTN('Primary', 'Retake photo', { size: 'S', lead: 'camera' }) : await BTN('Ghost', 'Replace', { size: 'S', lead: 'refresh' }));
  }
  if (MODE === 'Preview') {
    const q = box(main, 'HORIZONTAL', { name: 'Quality checks', gap: 16, wrap: true, cgap: 10 });
    for (const s of ['All four corners visible', 'Text sharp and readable', 'No glare or shadows', 'Valid until 09 Aug 2031']) { const r = box(q, 'HORIZONTAL', { name: 'Check — ' + s, gap: 6, align: 'CENTER' }, 'HUG'); r.appendChild(await IC('check-circle', 16, 'status/success')); r.appendChild(await T(s, 'Label/M', 'text/primary')); }
    const ex = box(main, 'VERTICAL', { name: 'Extracted details', gap: 12, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
    const eh = box(ex, 'HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); eh.appendChild(await T('We read these details from your document', 'Label/L', 'text/primary')); box(eh, 'HORIZONTAL', { name: 'Spacer' }); eh.appendChild(await DEMO('S'));
    const g = box(ex, 'HORIZONTAL', { name: 'Fields', gap: 16 });
    for (const [k, v, m] of [['Full name', 'NOVA KARLSSON', 'Matches your details'], ['Date of birth', '14 Mar 1994', 'Matches your details'], ['Document number', '•••• 4821', 'Partly hidden for your privacy'], ['Expiry date', '09 Aug 2031', 'Valid']]) { const c = box(g, 'VERTICAL', { name: 'Field — ' + k, gap: 4 }); await tx(c, k, 'Caption', 'text/tertiary'); await tx(c, v, k === 'Document number' ? 'Mono/M' : 'Label/L', 'text/primary'); const mm = box(c, 'HORIZONTAL', { name: 'Match', gap: 4, align: 'CENTER' }); mm.appendChild(await IC(m === 'Partly hidden for your privacy' ? 'eye-off' : 'check', 14, m === 'Partly hidden for your privacy' ? 'icon/muted' : 'status/success')); await tx(mm, m, 'Caption', m === 'Partly hidden for your privacy' ? 'text/tertiary' : 'text/success'); }
    await footer(main, [await BTN('Secondary', 'Back', { size: 'L', lead: 'arrow-left' })], 'Photos are encrypted and only used for this check.', [await BTN('Primary', 'Continue to selfie', { size: 'L', trail: 'arrow-right' })]);
  } else {
    const fx2 = box(main, 'VERTICAL', { name: 'How to fix', gap: 10, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); fx2.appendChild(await T('How to get a sharp photo', 'Label/L', 'text/primary'));
    const fg = box(fx2, 'HORIZONTAL', { name: 'Tips', gap: 16, wrap: true, cgap: 10 });
    for (const [ic, s] of [['layers', 'Lay the card flat on a dark surface'], ['target', 'Hold the camera parallel, about 15 cm away, and tap to focus'], ['zap', 'Turn the flash off and avoid direct light'], ['grid', 'Keep all four corners inside the frame']]) { const r = box(fg, 'HORIZONTAL', { name: 'Tip — ' + s.slice(0, 24), gap: 8, w: 290 }, 'HUG'); r.appendChild(await IC(ic, 16, 'icon/brand')); await tx(r, s, 'Body/S', 'text/secondary'); }
    const up = await I('20:9454', { State: 'Error' }, { Label: 'National ID card — back', Description: 'The side with the barcode and machine-readable lines', 'Show privacy note': true }); up.name = 'Input/File Upload — back (Error)'; await setT(up, 'File name', 'id_back.jpg'); main.appendChild(up); up.layoutSizingHorizontal = 'FILL';
    await footer(main, [await BTN('Secondary', 'Back', { size: 'L', lead: 'arrow-left' })], 'Retake the back photo to continue. Attempts are not limited.', [await BTN('Primary', 'Continue', { size: 'L', state: 'Disabled', trail: 'arrow-right' })]);
  }
}
const f = await shell('AUTH-13 KYC Document Upload / 1440 / ' + MODE, 2, d);
await f.screenshot({ scale: 0.5 });
return { frame: f.id, size: [f.width, f.height], dlg: [d.width, d.height] };

}
const __out = [];
for (const __m of ['Requirements', 'Preview', 'Error']) __out.push(await build(__m));
return __out;
