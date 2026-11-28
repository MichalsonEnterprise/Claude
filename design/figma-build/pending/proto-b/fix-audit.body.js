const P11 = figma.root.children.find(p => p.name === '11 — Prototypes');
await figma.setCurrentPageAsync(P11);
const LOG = [];
const main = P11.children.find(n => n.type === 'SECTION' && n.name === 'PRO-06..10 Prototypes (P1)');
let y = 0; for (const c of P11.children) if (c !== main) y = Math.max(y, c.y + c.height + 1000);
if (main.y < y) { LOG.push('moved main ' + Math.round(main.y) + ' -> ' + Math.round(y)); main.y = y; }
const subs = main.children.filter(n => n.type === 'SECTION');
const sub = id => subs.find(s => s.name.startsWith(id + ' '));
const wrap = (id, step) => sub(id).children.find(n => n.type === 'FRAME' && n.name.startsWith(id + ' · ' + step + ' — '));
const labels = inner => inner.findAll(n => n.type === 'INSTANCE' && /^Button/.test(n.name) && n.visible).map(n => { const t = n.findOne(x => x.type === 'TEXT' && x.visible); const b = n.absoluteBoundingBox, ib = inner.absoluteBoundingBox; return t ? [t.characters.trim().slice(0, 40), Math.round(b.x - ib.x), Math.round(b.y - ib.y), Math.round(b.width), Math.round(b.height)] : null; }).filter(Boolean);
async function hot(fromW, rx, toW, label, color, pick) {
  const inner = fromW.children[1];
  for (const h of inner.children.filter(n => n.name.startsWith('Hotspot') && n.name.includes('(fix)'))) h.remove();
  const L = labels(inner).filter(l => rx.test(l[0]));
  if (!L.length) { LOG.push('no match ' + fromW.name.slice(0, 20) + ' ' + rx + ' :: ' + labels(inner).map(l => l[0]).join(' | ').slice(0, 400)); return null; }
  const r = pick === 'first' ? L[0] : L[L.length - 1];
  const h = figma.createFrame(); h.name = 'Hotspot → ' + label + ' (fix)'; h.fills = [];
  stroke(h, color, 2, 'OUTSIDE'); h.dashPattern = [8, 6]; radius(h, 10);
  inner.appendChild(h); h.layoutPositioning = 'ABSOLUTE'; h.resize(r[3] + 8, r[4] + 8); h.x = r[1] - 4; h.y = r[2] - 4;
  await h.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: toW.id, navigation: 'NAVIGATE', transition: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.25 }, resetScrollPosition: true }] }]);
  return { hotspot: h.id, on: r[0] };
}
const fix1 = await hot(wrap('PRO-08', 'B3'), /^(Re-?authenticate|Sign in|Verify|Continue|Unlock|Confirm|Resume|Log in)/i, wrap('PRO-08', '7'), 'B3→7 Re-authenticate', 'border/focus', 'last');
const fix2 = await hot(wrap('PRO-10', 'B3'), /^(Approve\b|Approve &|Confirm|Approve and)/, wrap('PRO-10', 'B4'), 'B3→B4 Approve', 'status/info', 'last');
// audit (light): outgoing reactions live on prototype-bar chips (w.children[0]) and hotspot layers (direct children of the clone)
const audit = {}; const dead = []; const broken = []; let frames = 0, reactions = 0;
for (const s of subs) {
  const ws = s.children.filter(n => n.type === 'FRAME' && /^PRO-\d+ · /.test(n.name)); frames += ws.length;
  const ids = new Set(ws.map(w => w.id)); let r = 0;
  for (const w of ws) {
    const nodes = [...w.children[0].children, ...w.children[1].children.filter(n => n.name.startsWith('Hotspot'))];
    let out = 0; for (const n of nodes) for (const re of (n.reactions || [])) for (const a of (re.actions || [])) { if (a.type === 'NODE') { out++; if (!ids.has(a.destinationId)) broken.push(w.name.slice(0, 18) + '→' + a.destinationId); } }
    if (!out) dead.push(w.name.slice(0, 40)); r += out;
  }
  reactions += r; audit[s.name.slice(0, 7)] = { section: s.id, frames: ws.length, reactions: r };
}
fitSection(main);
return { main: main.id, mainPos: [Math.round(main.x), Math.round(main.y), Math.round(main.width), Math.round(main.height)], fix1, fix2, audit, frames, reactions, dead, broken, flows: P11.flowStartingPoints.map(p => p.name + ' ' + p.nodeId), others: P11.children.filter(c => c !== main).map(c => c.name + ' y' + Math.round(c.y) + ' h' + Math.round(c.height)), log: LOG };
