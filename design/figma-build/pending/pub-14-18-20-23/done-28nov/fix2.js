// ===== Fix 2: copy the Question sizing chain from the mobile Default's collapsed card; shorten results header caption =====
const DEF = await figma.getNodeByIdAsync('34:435744');
const ref = DEF.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Card/FAQ Item') && n.name.indexOf('Why can') >= 0)[0] || DEF.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Card/FAQ Item'))[1];
const rq = ref.findOne(n => n.type === 'TEXT' && n.name === 'Question');
const chain = []; let p = rq; while (p && p !== ref) { chain.push({ name: p.name, type: p.type, lsh: p.layoutSizingHorizontal, tar: p.type === 'TEXT' ? p.textAutoResize : null, w: Math.round(p.width) }); p = p.parent; }
const FA = await figma.getNodeByIdAsync('302:109456'); const FB = await figma.getNodeByIdAsync('302:109738');
let applied = 0; const errs = [];
for (const inst of FA.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Card/FAQ Item'))) {
  const q = inst.findOne(n => n.type === 'TEXT' && n.name === 'Question'); if (!q) continue;
  const nodes = []; let c = q; while (c && c !== inst) { nodes.push(c); c = c.parent; }
  // apply outermost first so FILL has a sized parent
  for (let i = nodes.length - 1; i >= 0; i--) { const n = nodes[i], r = chain[i]; if (!r) continue; try { if (n.type === 'TEXT' && r.tar) n.textAutoResize = r.tar; if (r.lsh && n.layoutSizingHorizontal !== r.lsh) { n.layoutSizingHorizontal = r.lsh; applied++; } } catch (e) { errs.push(n.name + ':' + e.message.slice(0, 60)); } }
}
FB.y = FA.y + FA.height + 160;
const R = await figma.getNodeByIdAsync('303:113051');
const rh = R.findOne(n => n.name === 'Results header');
const cap = rh.findOne(n => n.type === 'TEXT' && n.characters.indexOf('0 limited') >= 0); if (cap) { cap.characters = 'All restricted'; cap.name = 'All restricted'; }
const ttl = rh.findOne(n => n.type === 'TEXT' && n.characters === '3 matches'); let ttlInfo = null; if (ttl) ttlInfo = { tar: ttl.textAutoResize, lsh: ttl.layoutSizingHorizontal, w: Math.round(ttl.width) };
fitSection(sec);
const audits = [FA, FB, R].map(f => ({ id: f.id, name: f.name, h: Math.round(f.height), y: f.y, overflow: overflowList(f).slice(0, 10) }));
// verify: FA first chunk + R top part
async function vshot1(f, scale, h0) { const vp = figma.createFrame(); vp.name = 'TMP verify viewport'; fill(vp, 'bg/base'); vp.clipsContent = true; vp.x = -40000; vp.y = -40000; try { const cl = f.clone(); vp.appendChild(cl); cl.x = 0; cl.y = 0; vp.resize(cl.width, Math.min(h0, cl.height)); await vp.screenshot({ scale }); } finally { vp.remove(); } }
await vshot1(FA, 0.7, 2140); await vshot1(R, 0.7, 1300);
return { refName: ref.name, chain, applied, errs: errs.slice(0, 6), ttlInfo, audits };
