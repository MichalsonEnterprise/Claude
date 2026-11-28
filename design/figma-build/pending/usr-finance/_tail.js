// ===== FIN helpers (usr-finance, mobile subset v2 — continuation 28 Nov 2026) =====
async function setT(root, name, val, i = 0) { const ns = root.findAll(n => n.type === 'TEXT' && n.name === name); const n = ns[i]; if (!n) return false; try { n.characters = String(val); } catch (e) { for (const f of n.getRangeAllFontNames(0, n.characters.length)) await figma.loadFontAsync(f); n.characters = String(val); } return true; }
const ISSUES = []; const OUT = [];
const DEMO_MSG = 'DEMO DATA — illustrative values only';
function slot(sec, x, gapY = 160) { let y = 120; for (const ch of sec.children) if (Math.abs(ch.x - x) < 2) y = Math.max(y, ch.y + ch.height + gapY); return y; }
async function TILE(icon, bg = 'brand/tint', ic = 'icon/brand', s = 40) { const t = AL('HORIZONTAL', { name: 'Icon tile', fill: bg, r: 10, w: s, h: s, align: 'CENTER', justify: 'CENTER' }); add(t, await IC(icon, s >= 40 ? 20 : 16, ic)); return t; }
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const SEC = section('USR — Mobile D', 112000, 0);
async function MOB(name, o = {}) {
  const sec = SEC;
  for (const n of [...sec.children, ...figma.currentPage.children]) if (n.name === name) n.remove();
  const x = 120 + (o.col || 0) * 510; const y = slot(sec, x, 120);
  const f = await screen(name, 390, o.h ? { h: o.h } : {}); if (!o.h) f.primaryAxisSizingMode = 'AUTO'; sec.appendChild(f); f.x = x; f.y = y; add(f, [await DEMOBAR(DEMO_MSG), 'FILL']);
  const top = await I('23:12908', { State: 'Member' }); add(f, [top, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', p: [20, 16, 24, 16], gap: 20 }); add(f, [c, 'FILL']);
  return { page, sec, f, top, c };
}
const MTABS = ['All', 'Deposits', 'Withdrawals', 'Fees', 'Rewards', 'Refunds'];
// Header block + full-bleed horizontally scrolling pill tabs, inserted into the screen above Content (scrolled so the active pill is visible)
async function MTOP(c, o) {
  const f = c.parent; const idx = f.children.indexOf(c);
  const hc = AL('VERTICAL', { name: 'Page header', p: [16, 16, 20, 16], gap: 12 });
  add(hc, await BTN('Ghost', 'Financial history', { size: 'S', lead: 'chevron-left' }));
  const hr = AL('HORIZONTAL', { name: 'Heading', gap: 8, align: 'CENTER' }); add(hr, await T(o.title, 'Heading/H3'), await DEMO('M')); add(hc, hr);
  if (o.sub) add(hc, [await T(o.sub, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  f.insertChild(idx, hc); hc.layoutSizingHorizontal = 'FILL';
  const vp = figma.createFrame(); vp.name = 'Tabs — scrolls horizontally'; vp.fills = []; vp.clipsContent = true;
  const row = AL('HORIZONTAL', { name: 'Tab row', gap: 8, p: [0, 16, 0, 16] }); vp.appendChild(row);
  for (const lab of MTABS) { const t = await I('20:6895', { State: lab === o.tab ? 'Active' : 'Default' }, { Label: lab, 'Show icon': false }); t.name = 'Tab — ' + lab; add(row, t); }
  vp.resize(390, row.height); f.insertChild(idx + 1, vp); vp.layoutSizingHorizontal = 'FILL';
  const act = row.children.find(n => n.name === 'Tab — ' + o.tab); if (act && act.x + act.width > 358) row.x = -Math.round(act.x + act.width - 358);
  return row;
}
const TONE = { in: ['status/success-tint', 'status/success'], out: ['surface/raised', 'icon/default'], fee: ['surface/raised', 'icon/muted'], gold: ['accent/gold-tint', 'icon/gold'], info: ['status/info-tint', 'status/info'], bad: ['status/danger-tint', 'status/danger'], pend: ['status/pending-tint', 'status/pending'] };
async function MCARD(o) {
  const k = AL('VERTICAL', { name: 'Tx card — ' + o.title, fill: o.hl ? 'surface/selected' : 'surface/default', stroke: o.hl ? 'border/brand' : 'border/subtle', r: 14, p: 16, gap: 12 });
  const r1 = AL('HORIZONTAL', { name: 'Top', gap: 12, align: 'CENTER' }); add(k, r1);
  add(r1, await TILE(o.icon, TONE[o.tone][0], TONE[o.tone][1], 40));
  const col = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r1, col);
  add(col, await T(o.title, 'Label/L'), await T(o.sub, 'Caption', 'text/tertiary'));
  const am = AL('VERTICAL', { name: 'Amount', gap: 2, align: 'MAX' }); add(am, await T(o.amt, 'Number/S', o.ac || 'text/primary'), await T('USDT', 'Caption', 'text/tertiary')); add(r1, am);
  const r2 = AL('HORIZONTAL', { name: 'Meta', gap: 8, align: 'CENTER' }); add(k, r2);
  const b = await BADGE(o.st, 'S'); await setT(b, 'Label', o.stl || o.st); add(r2, b);
  if (o.chain) add(r2, await CHAIN(o.chain, 14));
  const d = await T(o.date, 'Caption', 'text/tertiary'); add(r2, d);
  add(r2, await DEMO('XS'), await IC('chevron-right', 16, 'icon/muted'));
  return k;
}
function mfix(k) { for (const n of k.findAll(x => x.name === 'Top' || x.name === 'Meta')) n.layoutSizingHorizontal = 'FILL'; for (const n of k.findAll(x => x.name === 'Text' && x.type === 'FRAME')) { n.layoutSizingHorizontal = 'FILL'; for (const t of n.children) { t.layoutSizingHorizontal = 'FILL'; } } const m = k.findOne(x => x.name === 'Meta'); if (m) { const d = m.children.find(x => x.type === 'TEXT'); if (d) d.layoutSizingHorizontal = 'FILL'; } }
async function MLIST(c, groups) { for (const [label, cards] of groups) { const g = AL('VERTICAL', { name: 'Group — ' + label, gap: 8 }); add(c, [g, 'FILL']); add(g, await T(label, 'Overline', 'text/tertiary')); for (const o of cards) { const k = await MCARD(o); add(g, [k, 'FILL']); mfix(k); } } }
async function MKPI(label, value, unit, ctx, o = {}) { const k = AL('VERTICAL', { name: 'KPI — ' + label, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16, gap: 6 }); const h = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(h, await T(label, 'Caption', 'text/secondary'), await DEMO('XS')); add(k, h); const v = AL('HORIZONTAL', { name: 'Value', gap: 4, align: 'BASELINE' }); add(v, await T(value, o.vs || 'Number/M', o.vc || 'text/primary'), await T(unit, 'Caption', 'text/tertiary')); add(k, v); if (ctx) add(k, await T(ctx, 'Caption', 'text/tertiary')); return k; }
function kfix(k) { for (const t of k.children.filter(x => x.type === 'TEXT')) { t.layoutSizingHorizontal = 'FILL'; } }
async function KROW(c, a, b) { const kr = AL('HORIZONTAL', { name: 'KPIs', gap: 12 }); add(c, [kr, 'FILL']); add(kr, [a, 'FILL'], [b, 'FILL']); kfix(a); kfix(b); a.layoutSizingVertical = 'FILL'; b.layoutSizingVertical = 'FILL'; return kr; }
async function TABBAR(f, active = 'Wallet') { add(f, [await I('22:5413', { Active: active }), 'FILL']); }
async function STICKY(f, btns) { const cta = AL('HORIZONTAL', { name: 'Sticky CTA', p: [12, 16, 12, 16], fill: 'bg/secondary', gap: 12 }); strokeSides(cta, 'border/subtle', { t: 1 }); add(f, [cta, 'FILL']); for (const b of btns) add(cta, [b, 'FILL']); return cta; }
// ===== END FIN helpers =====
