const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-10/11/12/15 VIP, Affiliates, About, Contact', 80000, 0);
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function setNav(sb, label) { for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { if (it.name === 'Item/Lobby') it.setProperties({ State: 'Default' }); if (it.name === 'Item/' + label) it.setProperties({ State: 'Active' }); } }
async function shell(name, x, y, nav) {
  { const old = sec.children.find(n => n.name === name); if (old) old.remove(); }
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Guest' }); sb.name = 'Shell/Sidebar'; body.appendChild(sb); sb.layoutSizingVertical = 'FILL'; setNav(sb, nav);
  const col = AL('VERTICAL', { name: 'Column' }); add(body, [col, 'FILL']);
  const tb = await I('23:9832', { State: 'Guest' }); tb.name = 'Shell/Topbar Desktop'; add(col, [tb, 'FILL']);
  const content = AL('VERTICAL', { name: 'Content', p: [32, 32, 64, 32], gap: 56 }); add(col, [content, 'FILL']);
  const foot = await I('23:17478', { Breakpoint: 'Desktop' }); foot.name = 'Shell/Footer Mega'; add(col, [foot, 'FILL']); bnum(foot, 'paddingLeft', 32); bnum(foot, 'paddingRight', 32);
  return { f, body, col, content, foot };
}
async function head(over, title, body, right) {
  const row = AL('HORIZONTAL', { name: 'Section header — ' + title, gap: 24, align: 'MAX' });
  const l = AL('VERTICAL', { gap: 8 }); add(row, [l, 'FILL']);
  add(l, await T(over, 'Overline', 'text/brand'), await T(title, 'Heading/H3', 'text/primary'));
  if (body) add(l, await T(body, 'Body/M', 'text/secondary', { w: 760 }));
  if (right) add(row, right);
  return row;
}
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 24, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w }); }
async function crumbHero(C, crumb, heroName) {
  const top = AL('VERTICAL', { name: 'Page top', gap: 16 }); add(C, [top, 'FILL']);
  const bc = await I('14:1145', { Levels: '2' }); txt(bc, 'Crumb 1', 'Home'); txt(bc, 'Current page', crumb); add(top, bc);
  const hero = AL('HORIZONTAL', { name: heroName, fill: 'surface/default', r: 20, p: 48, clip: true }); stroke(hero, 'border/subtle'); add(top, [hero, 'FILL']);
  const copy = AL('VERTICAL', { name: 'Copy', gap: 20, w: 560 }); add(hero, copy);
  return { top, hero, copy };
}
function abs(parent, node, x, y, rot) { parent.appendChild(node); node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
async function licence(C) { const lic = AL('VERTICAL', { name: 'Licence & trust', gap: 16 }); add(C, [lic, 'FILL']); add(lic, [await I('25:16197'), 'FILL'], await I('6:158', { Variant: 'Inline' })); return lic; }
