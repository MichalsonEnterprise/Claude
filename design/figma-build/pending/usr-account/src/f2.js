// ===== F2: reconcile mobile A5/A6 with desktop, hide OTP timer icon, verification screenshots =====
const SHOTS = ['155:88224', '156:68093', '155:87455', '34:384921', '34:404144'];
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const R = { a5: [], a6: null, otp: [] };
async function setTxt(t, s) { const fs = t.characters.length ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]; for (const f of fs) await figma.loadFontAsync(f); t.characters = s; }
function rowTexts(t) { let p = t.parent; while (p && !(p.type === 'FRAME' && p.layoutMode === 'HORIZONTAL' && p.width > 700)) p = p.parent; if (!p) return []; return p.findAllWithCriteria({ types: ['TEXT'] }).map(x => x.characters.trim()).filter(c => c && c !== t.characters.trim() && !/^DEMO$/i.test(c)); }
// --- A5 documents
const dA5 = await figma.getNodeByIdAsync('33:321559'); const mA5 = await figma.getNodeByIdAsync('155:88224');
if (dA5 && mA5) {
  const C = mA5.findOne(n => n.name === 'Content'); const after = C && C.children.find(n => n.name.startsWith('Document — Selfie'));
  const want = [['Utility bill', 'file'], ['National ID', 'id-card']];
  let idx = after ? C.children.indexOf(after) + 1 : -1;
  for (const [key, icon] of want) {
    if (!C || idx < 0 || C.children.some(n => n.name.includes(key))) continue;
    const t = dA5.findAllWithCriteria({ types: ['TEXT'] }).find(x => x.characters.includes(key)); if (!t) continue;
    const rest = rowTexts(t); const title = t.characters.trim(); const rej = rest.some(c => /reject|not accepted|declined/i.test(c));
    const c = card('Document — ' + title, { gap: 12, p: 16 }); C.insertChild(idx++, c); c.layoutSizingHorizontal = 'FILL';
    const h = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']);
    const th = AL('HORIZONTAL', { name: 'Preview (blurred)', w: 64, h: 44, r: 10, align: 'CENTER', justify: 'CENTER', stroke: 'border/subtle', clip: true }); await tryy('skeleton', () => gfill(th, 'Gradient/Skeleton')); if (!th.fills.length) fill(th, 'surface/raised'); th.appendChild(await IC(icon, 20, 'icon/muted')); h.appendChild(th);
    const x = AL('VERTICAL', { name: 'Text', gap: 2 }); add(h, [x, 'FILL']); add(x, [await T(title, 'Body/S Strong', 'text/primary', { w: 200 }), 'FILL']); if (rest[0]) add(x, [await T(rest[0], 'Caption', 'text/secondary', { w: 200 }), 'FILL']);
    h.appendChild(await DEMO('XS'));
    const cap = rest.slice(1).filter(s => !/^(approved|rejected|replaced|active|expired)$/i.test(s)).join(' · ');
    if (cap) add(c, [await T(cap, 'Caption', 'text/tertiary', { w: IW }), 'FILL']);
    c.appendChild(await chip(rej ? 'x-circle' : 'check-circle', rej ? 'Not accepted · kept in history' : 'Approved', rej ? 'danger' : 'success'));
    R.a5.push(title + ' | ' + rest.join(' | ').slice(0, 160));
  }
  const gl = mA5.findAllWithCriteria({ types: ['TEXT'] }).find(x => x.characters === 'On file · Level 2'); if (gl && R.a5.length) await setTxt(gl, 'On file · 3 active · 1 not accepted');
}
// --- A6 flagged time
const dA6 = await figma.getNodeByIdAsync('34:344599'); const mA6 = await figma.getNodeByIdAsync('156:68093');
if (dA6 && mA6) {
  const src = dA6.findAllWithCriteria({ types: ['TEXT'] }).map(x => x.characters).find(c => /Madrid/.test(c) && /25 Nov 2026, \d\d:\d\d UTC/.test(c));
  const m = src && /25 Nov 2026, (\d\d:\d\d) UTC/.exec(src);
  if (m && m[1] !== '18:58') { for (const t of mA6.findAllWithCriteria({ types: ['TEXT'] })) if (t.characters.includes('25 Nov 2026, 19:04 UTC')) { await setTxt(t, t.characters.replace('19:04', m[1])); R.a6 = m[1]; } }
  else R.a6 = 'no change (' + (src ? src.slice(0, 80) : 'not found') + ')';
}
// --- OTP timer icon in the 2FA disable sheet
const dis = await figma.getNodeByIdAsync('155:87455'); const sh = dis && dis.children.find(c => c.name.startsWith('Bottom sheet'));
if (sh) { const otp = sh.findAll(n => n.type === 'INSTANCE' && n.width > 300 && n.height > 90 && n.findAllWithCriteria({ types: ['TEXT'] }).length >= 2).find(n => /code/i.test(n.findAllWithCriteria({ types: ['TEXT'] })[0].characters));
  if (otp) { for (const n of otp.findAll(x => x.visible && (/clock|timer|resend|hourglass/i.test(x.name)))) { n.visible = false; R.otp.push(n.name); }
    if (!R.otp.length) for (const n of otp.children) { if (n.visible && n.height <= 24 && n.y > otp.height - 40) { n.visible = false; R.otp.push('bottom row: ' + n.name); } } } }
for (const id of SHOTS) { const n = await figma.getNodeByIdAsync(id); if (n) await tryy('shot ' + id, () => n.screenshot({ scale: id.startsWith('34:') ? 0.3 : 0.5 })); }
return { R, log: LOG };
