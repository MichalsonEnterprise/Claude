// READ-ONLY inspection for wal-withdraw-a continuation (lists frames in both sections + component internals)
const out = {};
const p6 = figma.root.children.find(p => p.name === '06 — Wallet & Transactions'); await figma.setCurrentPageAsync(p6);
const s6 = p6.children.find(n => n.type === 'SECTION' && n.name === 'WAL-10..14 Withdraw steps 1–5');
out.sec6 = s6 ? { id: s6.id, w: s6.width, h: s6.height, frames: s6.children.map(c => [c.name, c.id, Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height), c.primaryAxisSizingMode]) } : null;
const txt = (n, lim = 70) => n.findAll(x => x.type === 'TEXT').map(t => t.name.slice(0, 24) + '=' + t.characters.slice(0, lim));
if (s6) {
  for (const nm of ['WAL-10 Withdraw — Step 1 Select Asset / 1440 / Default', 'WAL-11 Withdraw — Step 2 Select Network / 1440 / Default', 'WAL-12 Withdraw — Step 3 Enter Address / 1440 / Default']) {
    const f = s6.children.find(c => c.name === nm); if (!f) continue; const fc = f.findOne(x => x.name === 'Flow card');
    out[nm.slice(0, 6)] = fc ? fc.children.map(c => c.name + ' [' + c.type + ']' + (c.type !== 'INSTANCE' && 'children' in c ? ' {' + c.children.map(k => k.name.slice(0, 40)).join(' | ') + '}' : '')) : 'no flow card';
    if (nm.startsWith('WAL-10') && fc) out.w10txt = txt(fc, 90);
    if (nm.startsWith('WAL-11') && fc) out.w11txt = txt(fc, 90);
  }
}
const comp = async (id, pick) => { const n = await figma.getNodeByIdAsync(id); if (!n) return 'missing'; const vs = n.type === 'COMPONENT_SET' ? n.children : [n]; return vs.filter((v, i) => !pick || pick.includes(i)).map(v => ({ v: v.name, t: txt(v, 60) })); };
out.amount = await comp('15:3387');
out.netopt = await comp('15:890', [0, 2]);
out.feeBd = await comp('20:8583', [0]);
out.feeEst = await comp('20:3002', [0]);
out.addr = await comp('15:3617', [3, 5]);
out.chk = await comp('20:3205', [0]);
out.sheet = await comp('29:17720', [0]);
const p10 = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(p10);
out.secs10 = p10.children.filter(n => n.type === 'SECTION').map(s => [s.name, s.id, Math.round(s.x), Math.round(s.y), Math.round(s.width), Math.round(s.height)]);
const s10 = p10.children.find(n => n.type === 'SECTION' && n.name === 'WAL — Mobile C (Withdraw 1–5)');
out.sec10 = s10 ? { id: s10.id, frames: s10.children.map(c => [c.name, c.id, Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height)]) } : null;
const s = JSON.stringify(out); return s.length > 60000 ? s.slice(0, 60000) : out;
