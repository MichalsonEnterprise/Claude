// ===== page 10 fixes: GP-03 390 hash row clipping + sticky participate bar text/button overlap =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('GP — Mobile A', 161000, 0);
const out = { log: [] };
function ov(a, b) { const A = a.absoluteBoundingBox, B = b.absoluteBoundingBox; if (!A || !B) return false; return A.x < B.x + B.width && A.x + A.width > B.x && A.y < B.y + B.height && A.y + A.height > B.y; }
function inInst(n) { let p = n.parent; while (p && p.type !== 'SECTION' && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
// 1) GP-03: Tx/Hash (with View on explorer + DEMO) is wider than the 318 px step text column -> full-width row under step 2
const f3 = await figma.getNodeByIdAsync('164:73073');
if (f3) {
  const h = f3.findOne(n => n.type === 'INSTANCE' && n.name === 'Tx/Hash'); const steps = f3.findOne(n => n.name === 'Progress steps');
  if (h && steps) {
    const mc = await h.getMainComponentAsync(); const natW = mc ? mc.width : h.width;
    const grp = AL('VERTICAL', { name: 'Batch transaction', gap: 6 }); steps.insertChild(2, grp); grp.layoutSizingHorizontal = 'FILL';
    add(grp, await T('Batch transaction · Arbitrum One', 'Caption', 'text/tertiary'));
    grp.appendChild(h); h.layoutSizingHorizontal = 'FIXED'; h.resize(Math.min(natW, 358), h.height);
    out.log.push({ hashNatW: natW, hashW: h.width });
  }
}
// 2) sticky participate bars: wrap texts that run under the button
const shots = [];
for (const id of ['34:434743', '34:473267', '34:482737', '34:492964']) {
  const f = await figma.getNodeByIdAsync(id); if (!f) continue;
  const sb = f.findOne(n => n.name === 'Sticky participate bar (pinned above tab bar)'); if (!sb) { out.log.push(id + ': no sticky bar'); continue; }
  const btns = sb.findAll(n => n.type === 'INSTANCE' && /Button/.test(n.name) && !inInst(n));
  const texts = sb.findAll(n => n.type === 'TEXT' && !inInst(n));
  let fixed = 0;
  for (const b of btns) for (const t of texts) {
    if (!ov(t, b)) continue;
    const allowed = Math.floor(b.absoluteBoundingBox.x - t.absoluteBoundingBox.x - 12);
    if (allowed < 80) continue;
    for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName);
    if (t.layoutSizingHorizontal === 'FILL') t.layoutSizingHorizontal = 'FIXED';
    t.textAutoResize = 'HEIGHT'; t.resize(allowed, t.height); fixed++;
  }
  out.log.push({ id, fixed, kids: sb.children.map(c => ({ n: c.name, t: c.type, pos: c.layoutPositioning, w: Math.round(c.width), h: Math.round(c.height) })) });
  if (fixed) shots.push(sb);
}
fitSection(sec);
if (f3) { const sh = f3.findOne(n => n.name === 'Progress steps'); if (sh) await sh.screenshot({ scale: 1 }); }
for (const sb of shots) await sb.screenshot({ scale: 1 });
return out;
