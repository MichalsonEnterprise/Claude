// ===== AUTH-14 Liveness / selfie (MODE: 'Camera ready' | 'Permission denied' | 'Retake') =====
async function build(MODE) {
  const NAME = 'AUTH-14 KYC Liveness / 1440 / ' + MODE;
  if (sec.children.find(c => c.name === NAME)) return { skipped: NAME };

async function phone(p, x, y, rot, c = 'brand/primary') { const ph = figma.createFrame(); ph.name = 'Illustration — phone with selfie guide'; ph.resize(156, 300); fill(ph, 'ink/950'); radius(ph, 28); stroke(ph, 'ink/600', 4); ph.clipsContent = true; p.appendChild(ph);
  R(ph, 58, 12, 40, 8, 'ink/700', 4, 'Notch'); E(ph, 48, 96, 60, 72, 'ink/600', 'Head'); R(ph, 20, 176, 116, 110, 'ink/600', 48, 'Shoulders'); const ov = E(ph, 30, 70, 96, 128, null, 'Face guide (oval)'); stroke(ov, c, 3); ov.dashPattern = [8, 6]; R(ph, 52, 256, 52, 24, 'brand/primary', 12, 'Record button'); ph.x = x; ph.y = y; ph.rotation = rot; return ph; }
function qr(p, n = 21, m = 6) { const q = figma.createFrame(); q.name = 'QR code — continue on phone (DEMO)'; q.resize(n * m + 16, n * m + 16); fill(q, 'paper/50'); radius(q, 10); p.appendChild(q); let s = 11; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280; const fin = (cx, cy) => (cx < 8 && cy < 8) || (cx >= n - 8 && cy < 8) || (cx < 8 && cy >= n - 8);
  for (let yy = 0; yy < n; yy++) { let run = -1; for (let xx = 0; xx <= n; xx++) { const on = xx < n && !fin(xx, yy) && rnd() > 0.52; if (on && run < 0) run = xx; if (!on && run >= 0) { R(q, 8 + run * m, 8 + yy * m, (xx - run) * m, m, 'ink/900', 0, 'Module'); run = -1; } } }
  for (const [cx, cy] of [[0, 0], [n - 7, 0], [0, n - 7]]) { R(q, 8 + cx * m, 8 + cy * m, 7 * m, 7 * m, 'ink/900', 4, 'Finder'); R(q, 8 + (cx + 1) * m, 8 + (cy + 1) * m, 5 * m, 5 * m, 'paper/50', 0, 'Finder'); R(q, 8 + (cx + 2) * m, 8 + (cy + 2) * m, 3 * m, 3 * m, 'ink/900', 0, 'Finder'); } return q; }
const { d, side, main } = await dialog({ over: 'Step 4 of 5 · Liveness', st: 'A 10-second selfie video', sb: 'It shows a real person is verifying — and that it’s you, not a photo of your ID.', artName: 'Phone with selfie guide', chip: ['Approved', 'L1'], step: 3,
  art: async (a) => { band(a, 120, 'mint/700', 160, -12); band(a, 96, 'brand/primary', 14, -12); await phone(a, 96, 34, -6); },
  facts: [['face-scan', 'Face the camera — no sunglasses, caps or masks'], ['eye', 'Even light from the front, not behind you'], ['timer', 'About 10 seconds: turn your head slowly left, then right'], ['lock', 'Face data is deleted within 30 days of a decision']] });
const tb = box(main, 'VERTICAL', { name: 'Title', gap: 8 });
await tx(tb, MODE === 'Permission denied' ? 'Camera access is blocked' : MODE === 'Retake' ? 'Let’s try that again' : 'Record a short selfie video', 'Heading/H3', 'text/primary');
await tx(tb, MODE === 'Permission denied' ? 'Your browser denied camera access for this site, so we can’t record the video. You can allow it in a few clicks — or continue on your phone.' : MODE === 'Retake' ? 'We couldn’t see your face clearly enough to match it with your ID photo. This is common and doesn’t count against you.' : 'Use this computer’s camera, or scan the code to continue on your phone — most people find the phone easier.', 'Body/M', 'text/secondary');
const bd = box(main, 'HORIZONTAL', { name: 'Body', gap: 20 });
const lcol = box(bd, 'VERTICAL', { name: 'Camera column', gap: 16 });
const cam = figma.createFrame(); cam.name = 'Camera preview — ' + MODE; cam.resize(400, 280); fill(cam, 'ink/950'); radius(cam, 14); cam.clipsContent = true; lcol.appendChild(cam); cam.layoutSizingHorizontal = 'FILL';
if (MODE === 'Permission denied') {
  const c = AL('VERTICAL', { name: 'Blocked message', gap: 10, align: 'CENTER', w: 300 }); cam.appendChild(c); c.x = 50; c.y = 76; c.appendChild(await IC('ban', 40, 'status/danger')); const t1 = await tx(c, 'Camera blocked by your browser', 'Label/L', 'text/primary'); t1.textAlignHorizontal = 'CENTER'; const t2 = await tx(c, 'Site settings · globalpool.example · Camera: Blocked', 'Mono/S', 'text/tertiary'); t2.textAlignHorizontal = 'CENTER';
} else {
  const dim = MODE === 'Retake'; E(cam, 168, 66, 84, 100, dim ? 'ink/800' : 'ink/600', 'Head'); R(cam, 112, 176, 196, 140, dim ? 'ink/800' : 'ink/600', 70, 'Shoulders'); const ov = E(cam, 146, 40, 128, 168, null, 'Face guide (oval)'); stroke(ov, dim ? 'status/danger' : 'brand/primary', 3); ov.dashPattern = [10, 8];
  const tag = AL('HORIZONTAL', { name: 'Status tag', gap: 6, p: [6, 10, 6, 10], fill: 'surface/overlay', r: 9999, align: 'CENTER' }); cam.appendChild(tag); tag.x = 16; tag.y = 16; tag.appendChild(await IC(dim ? 'alert-circle' : 'check-circle', 14, dim ? 'status/danger' : 'status/success')); tag.appendChild(await T(dim ? 'Captured · face too dark' : 'Camera ready · MacBook Pro camera', 'Label/S', 'text/primary'));
  const hint = AL('HORIZONTAL', { name: 'Live hint', p: [8, 14, 8, 14], fill: 'surface/overlay', r: 9999 }); cam.appendChild(hint); hint.appendChild(await T(dim ? 'Light is behind you — face a window or lamp' : 'Centre your face in the oval', 'Label/M', 'text/primary')); hint.x = Math.round((400 - hint.width) / 2); hint.y = 230;
}
if (MODE === 'Camera ready') {
  const st = box(lcol, 'VERTICAL', { name: 'Steps', gap: 10 });
  for (const [n, s] of [['1', 'Centre your face in the oval'], ['2', 'Turn your head slowly left, then right'], ['3', 'Hold still until recording stops — about 10 seconds']]) { const r = box(st, 'HORIZONTAL', { name: 'Step ' + n, gap: 10, align: 'CENTER' }); const b = AL('HORIZONTAL', { name: 'Number', w: 24, h: 24, r: 9999, fill: 'brand/tint', justify: 'CENTER', align: 'CENTER' }); r.appendChild(b); b.appendChild(await T(n, 'Label/S', 'text/brand')); await tx(r, s, 'Body/S', 'text/secondary'); }
  const ar = box(lcol, 'HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); ar.appendChild(await BTN('Primary', 'Start recording', { size: 'L', lead: 'camera' })); await tx(ar, 'Your browser will ask for camera access. We record only while you’re on this step.', 'Caption', 'text/tertiary');
} else if (MODE === 'Permission denied') {
  const st = box(lcol, 'VERTICAL', { name: 'How to allow camera access', gap: 10, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); st.appendChild(await T('Allow camera access in Chrome', 'Label/L', 'text/primary'));
  for (const [n, s] of [['1', 'Click the camera icon with a red cross at the right of the address bar'], ['2', 'Choose “Always allow globalpool.example to access your camera”'], ['3', 'Click Done, then Try again — you don’t need to reload or start over']]) { const r = box(st, 'HORIZONTAL', { name: 'Step ' + n, gap: 10 }); const b = AL('HORIZONTAL', { name: 'Number', w: 24, h: 24, r: 9999, fill: 'brand/tint', justify: 'CENTER', align: 'CENTER' }); r.appendChild(b); b.appendChild(await T(n, 'Label/S', 'text/brand')); await tx(r, s, 'Body/S', 'text/secondary'); }
  const ar = box(lcol, 'HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }, 'HUG'); ar.appendChild(await BTN('Primary', 'Try again', { size: 'L', lead: 'refresh' })); ar.appendChild(await BTN('Ghost', 'Help for other browsers', { size: 'L', trail: 'external-link' }));
} else {
  const wr = box(lcol, 'VERTICAL', { name: 'What we found', gap: 8, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); wr.appendChild(await T('What we found', 'Label/L', 'text/primary'));
  for (const [ok, s] of [[false, 'Your face was too dark — the light was behind you'], [true, 'Head turn left and right detected'], [true, 'Only one face in the frame']]) await li(wr, ok ? 'check-circle' : 'x-circle', s, { is: 16, ic: ok ? 'status/success' : 'status/danger', c: ok ? 'text/secondary' : 'text/primary' });
  await li(lcol, 'info', 'Attempt 1 of 3. After 3 attempts a specialist reviews your video by hand — you won’t be locked out.', { ic: 'status/info', is: 16, st: 'Caption', c: 'text/secondary' });
  const ar = box(lcol, 'HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }, 'HUG'); ar.appendChild(await BTN('Primary', 'Retake video', { size: 'L', lead: 'rotate-ccw' })); ar.appendChild(await BTN('Ghost', 'See tips', { size: 'L', lead: 'help-circle' }));
}
const ph = AL('VERTICAL', { name: 'Continue on your phone', gap: 12, p: 16, fill: 'surface/default', stroke: MODE === 'Permission denied' ? 'border/brand' : 'border/subtle', r: 14, w: 220, align: 'CENTER' }); bd.appendChild(ph);
const pt = await tx(ph, 'Continue on your phone', 'Label/L', 'text/primary'); pt.textAlignHorizontal = 'CENTER';
const pc = await tx(ph, 'Scan with your phone camera. Your details and document stay saved.', 'Caption', 'text/secondary'); pc.textAlignHorizontal = 'CENTER';
qr(ph); const ex = box(ph, 'HORIZONTAL', { name: 'Expiry', gap: 6, align: 'CENTER', justify: 'CENTER' }); ex.appendChild(await T('Code expires 17:02 UTC', 'Caption', 'text/tertiary')); ex.appendChild(await DEMO('XS'));
const em = await BTN('Ghost', 'Email me a link', { size: 'S', lead: 'mail' }); ph.appendChild(em);
await footer(main, [await BTN('Secondary', 'Back', { size: 'L', lead: 'arrow-left' })], MODE === 'Retake' ? 'Your document photos are kept — only the video is redone.' : 'Recording starts only when you press Start recording.', [await BTN('Primary', 'Continue', { size: 'L', state: 'Disabled', trail: 'arrow-right' })]);
const f = await shell('AUTH-14 KYC Liveness / 1440 / ' + MODE, 3, d);
await f.screenshot({ scale: 0.5 });
return { frame: f.id, size: [f.width, f.height], dlg: [d.width, d.height] };

}
const __out = [];
for (const __m of ['Camera ready', 'Permission denied', 'Retake']) __out.push(await build(__m));
return __out;
