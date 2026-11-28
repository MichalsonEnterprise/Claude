// ===== PROTO-B LIB v1 (PRO-06..10 prototypes, page 11) =====
const P11 = figma.root.children.find(p => p.name === '11 — Prototypes');
await figma.setCurrentPageAsync(P11);
const MAINNAME = 'PRO-06..10 Prototypes (P1)';
const GAPX = 560, ROWGAP = 760, LOG = [];
const MAINS = () => FLOW.frames.filter(f => !String(f.step).startsWith('B'));
const COLOR = k => k === 'error' ? 'status/warning' : k === 'alt' ? 'status/info' : 'brand/primary';
const PRE = f => `${FLOW.id} · ${f.step} — `;
const colX = c => 120 + c * (1440 + GAPX);
function mainSection() {
  let s = P11.children.find(n => n.type === 'SECTION' && n.name === MAINNAME);
  let y = 0; for (const c of P11.children) if (c !== s) y = Math.max(y, c.y + c.height + 1000);
  if (!s) { s = figma.createSection(); s.name = MAINNAME; s.x = 0; s.y = y; s.fills = [paint('bg/secondary')]; s.resizeWithoutConstraints(4000, 2000); }
  else if (s.y < y) { LOG.push('moved section below other sections: y ' + Math.round(s.y) + ' -> ' + Math.round(y)); s.y = y; }
  return s;
}
function restack(main) {
  const hd = main.children.find(n => n.name === 'Header — PRO-06..10');
  let y = hd ? hd.y + hd.height + 240 : 160;
  for (const s of main.children.filter(n => n.type === 'SECTION').sort((a, b) => a.name.localeCompare(b.name))) { s.x = 120; s.y = y; y += s.height + 320; }
}
function subSection(main) {
  let s = main.children.find(n => n.type === 'SECTION' && n.name === FLOW.name);
  if (!s) { s = figma.createSection(); s.name = FLOW.name; s.fills = [paint('bg/base')]; main.appendChild(s); s.resizeWithoutConstraints(4000, 2000); s.x = 120; s.y = nextY(main, 320); }
  return s;
}
async function circ(txt, col, d = 32, style = 'Label/M') { const b = AL('HORIZONTAL', { name: 'Badge ' + txt, w: d, h: d, r: 9999, fill: col, align: 'CENTER', justify: 'CENTER' }); add(b, await T(txt, style, 'text/on-primary')); return b; }
function linkLabel(l) { return l.label || l.chip || ''; }
function syncFlows(main) {
  const mine = {}; for (const sub of main.children.filter(n => n.type === 'SECTION')) { const id = (sub.name.match(/^(PRO-\d+)/) || [])[1]; if (!id) continue; const st = sub.children.find(n => n.type === 'FRAME' && n.name.startsWith(id + ' · 1 — ')); if (st) mine[st.id] = sub.name.replace(/^(PRO-\d+) /, '$1 · '); }
  const names = new Set(Object.values(mine)); const seen = new Set(); const out = [];
  for (const p of P11.flowStartingPoints) { if (seen.has(p.nodeId) || mine[p.nodeId] || names.has(p.name)) continue; seen.add(p.nodeId); out.push({ nodeId: p.nodeId, name: p.name }); }
  for (const [nodeId, name] of Object.entries(mine)) { if (seen.has(nodeId)) continue; seen.add(nodeId); out.push({ nodeId, name }); }
  out.sort((a, b) => a.name.localeCompare(b.name));
  try { P11.flowStartingPoints = out; } catch (e) { LOG.push('flowStart: ' + e.message); }
  return out.length;
}
