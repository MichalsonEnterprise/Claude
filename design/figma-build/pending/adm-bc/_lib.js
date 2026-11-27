// ===== ADM-BC LIB v1 (agent adm-bc: Blockchain + Compliance admin screens) =====
const MISS = [];
const SPC = () => { const s = AL('HORIZONTAL', { name: 'Spacer' }); s.resize(1, 1); return s; };
function findI(r, nm) { return r ? r.findOne(n => n.type === 'INSTANCE' && n.name === nm) : null; }
function byMain(r, setName) { return r ? r.findOne(n => { if (n.type !== 'INSTANCE') return false; const m = n.mainComponent; if (!m) return false; const p = m.parent; return m.name === setName || (p && p.type === 'COMPONENT_SET' && p.name === setName); }) : null; }
async function setText(t, v) { try { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = String(v); return true; } catch (e) { MISS.push('txt ' + t.name + ' ' + String(e.message).slice(0, 40)); return false; } }
async function setT(r, nm, v, i = 0) { if (!r || v == null) return null; const t = r.findAll(n => n.type === 'TEXT' && n.name === nm)[i]; if (!t) { MISS.push('T:' + nm); return null; } await setText(t, v); return t; }
async function setTany(r, names, v) { for (const nm of names) { const t = r.findOne(n => n.type === 'TEXT' && n.name === nm); if (t) { await setText(t, v); return t; } } const t = r.findOne(n => n.type === 'TEXT'); if (t) { await setText(t, v); return t; } MISS.push('Tany:' + names[0]); return null; }
async function setTs(r, m) { for (const [k, v] of Object.entries(m)) await setT(r, k, v); }
function setP(inst, base, val) { if (!inst || inst.type !== 'INSTANCE') return false; try { const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === base); if (!k) { MISS.push('P:' + base); return false; } inst.setProperties({ [k]: val }); return true; } catch (e) { MISS.push('P:' + base + ' ' + String(e.message).slice(0, 40)); return false; } }
async function ST(status, label, size = 'S') { const b = await BADGE(status, size); if (label) await setT(b, 'Label', label); return b; }
async function TX(s, style = 'Body/S', color = 'text/primary', w) { return await T(s, style, color, w ? { w } : {}); }
async function WT(parent, s, style = 'Body/S', color = 'text/secondary', w = 400) { const t = await T(s, style, color, { w }); add(parent, [t, 'FILL']); return t; }
// ---------- admin shell ----------
const GROUPS = [['Overview', 'dashboard'], ['User Management', 'users'], ['Finance', 'coins'], ['Game Management', 'games'], ['Global Pool Management', 'pool'], ['Blockchain Management', 'layers'], ['Compliance', 'shield-check'], ['Affiliate Management', 'percent'], ['Marketing', 'megaphone'], ['System', 'settings']];
const MODS = { B: { g: 'Blockchain Management', items: [['Supported networks'], ['Smart contracts'], ['Contract addresses'], ['Transaction monitoring'], ['Blockchain events'], ['Network health'], ['Failed transactions', '4'], ['Gas statistics']] }, C: { g: 'Compliance', items: [['KYC queue', '214'], ['AML alerts', '23'], ['Suspicious transactions', '3'], ['Sanctions screening', '2'], ['Restricted countries'], ['Self-exclusion'], ['RG reports']] } };
const WHO = { SI: ['SI', 'S. Iyer', 'Super Admin', '10 of 10 modules', '2FA session · until 22:40 UTC', []], KO: ['KO', 'K. Osei', 'Compliance Officer', '7 of 10 modules', '2FA session · until 22:15 UTC', ['Game Management', 'Affiliate Management', 'System']] };
async function SIDEBAR(mod, active, who) {
  const sb = await I('22:5501'); const nav = sb.findOne(n => n.name === 'Nav'); const set = await figma.getNodeByIdAsync('22:5497');
  const V = (l, s) => set.children.find(c => c.name === 'Level=' + l + ', State=' + s);
  const W = WHO[who]; const spec = [];
  for (const [g, ic] of GROUPS) { if (g === MODS[mod].g) { spec.push({ l: 'Group', s: 'Active', lab: g, ic, open: 1, cnt: mod === 'C' ? '214' : null }); MODS[mod].items.forEach(([lab, cnt], i) => spec.push({ l: 'Child', s: i === active ? 'Active' : 'Default', lab, cnt })); } else spec.push({ l: 'Group', s: W[5].includes(g) ? 'No access' : 'Default', lab: g, ic, cnt: g === 'Compliance' ? '214' : null }); }
  const slots = nav ? nav.children.slice() : [];
  for (let i = 0; i < slots.length; i++) {
    const n = slots[i], s = spec[i]; if (!s) { n.visible = false; continue; } n.visible = true;
    const tv = V(s.l, s.s); try { if (tv && n.mainComponent && n.mainComponent.id !== tv.id) n.swapComponent(tv); } catch (e) { MISS.push('swap ' + s.lab); }
    n.name = (s.l === 'Group' ? 'Group — ' : 'Item — ') + s.lab + (s.open ? ' (expanded)' : '');
    if (!setP(n, 'Label', s.lab)) await setT(n, 'Label', s.lab);
    setP(n, 'Show count', !!s.cnt); if (s.cnt) { const c = findI(n, 'Count'); if (c) setP(c, 'Count', s.cnt); }
    if (s.l === 'Group') {
      setP(n, 'Icon', ICONS[s.ic]);
      const icn = n.children.find(x => x.type === 'INSTANCE' && !['Chevron', 'Lock', 'Count'].includes(x.name)); if (icn) tint(icn, s.s === 'Active' ? 'icon/brand' : s.s === 'No access' ? 'text/disabled' : 'icon/muted');
      const ch = findI(n, 'Chevron'); if (ch) { try { ch.swapComponent(await figma.getNodeByIdAsync(ICONS[s.open ? 'chevron-down' : 'chevron-right'])); ch.name = 'Chevron'; tint(ch, 'icon/muted'); } catch (e) { MISS.push('chev'); } }
    }
  }
  const av = byMain(sb, 'User/Avatar'); if (av) setP(av, 'Initials', W[0]);
  await setT(sb, 'A. Marin', W[1]); await setT(sb, 'Finance Lead', W[2]); await setT(sb, '8 of 10 modules', W[3]); await setT(sb, '2FA session · until 14:05 UTC', W[4]);
  sb.name = 'Nav/Admin Sidebar — ' + MODS[mod].g; return sb;
}
async function TOPBAR(who, ph) { const tb = await I('22:6483', { Environment: 'Production' }); const W = WHO[who]; await setT(tb, 'Placeholder', ph); const av = byMain(tb, 'User/Avatar'); if (av) setP(av, 'Initials', W[0]); await setT(tb, 'A. Marin', W[1]); await setT(tb, 'Finance Lead', W[2]); return tb; }
// band layout inside the section: C desktop / C laptop / C tablet / B desktop / B laptop
const ORDER = { C: ['C1Q', 'C1R', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'], B: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'] };
const BANDS = ['C-1440', 'C-1280', 'C-768', 'B-1440', 'B-1280'];
function bandOf(f) { const m = f.name.match(/^\[ADM-([BC])\d[^\/]*\/ (\d+) \//); return m ? m[1] + '-' + m[2] : null; }
function POS(band, key) { const [m, w] = band.split('-'); const col = ORDER[m].indexOf(key); const x = 120 + col * (Number(w) + 120); const inBand = sec.children.filter(f => bandOf(f) === band); if (inBand.length) return { x, y: Math.min(...inBand.map(f => f.y)) }; const bi = BANDS.indexOf(band); const prev = sec.children.filter(f => { const b = BANDS.indexOf(bandOf(f)); return b >= 0 && b < bi; }); return { x, y: prev.length ? Math.max(...prev.map(f => f.y + f.height)) + 240 : 160 }; }
function GUARD(name) { if (sec.children.find(n => n.name === name)) throw new Error('Frame already exists: ' + name); }
async function SHELL(name, pos, mod, active, who, ph) {
  GUARD(name); const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = pos.x; f.y = pos.y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await SIDEBAR(mod, active, who); add(body, sb); sb.layoutSizingVertical = 'FILL';
  const main = AL('VERTICAL', { name: 'Main' }); add(body, [main, 'FILL']); main.minHeight = 988;
  add(main, [await TOPBAR(who, ph), 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 24, p: [24, 28, 48, 28] }); add(main, [c, 'FILL']);
  return { f, c };
}
async function HEAD(c, crumbs, title, sub, o = {}) {
  const top = AL('VERTICAL', { name: 'Page header', gap: 8 }); let bc = null;
  try { bc = await I('14:1145', { Levels: String(crumbs.length) }); for (let i = 0; i < crumbs.length - 1; i++) await setT(bc, 'Crumb ' + (i + 1), crumbs[i]); await setT(bc, 'Current page', crumbs[crumbs.length - 1]); const tx = bc.findAll(n => n.type === 'TEXT' && n.visible).map(n => n.characters); if (!crumbs.every(k => tx.includes(k))) { MISS.push('bc-fallback ' + tx.join('|')); bc.remove(); bc = null; } } catch (e) { MISS.push('bc ' + e.message); if (bc) { bc.remove(); bc = null; } }
  if (!bc) { bc = AL('HORIZONTAL', { name: 'Breadcrumb (inline)', gap: 6, align: 'CENTER' }); for (let i = 0; i < crumbs.length; i++) { if (i) add(bc, await IC('chevron-right', 14, 'icon/muted')); const last = i === crumbs.length - 1; add(bc, await T(crumbs[i], last ? 'Label/M' : 'Body/S', last ? 'text/primary' : 'text/tertiary')); } }
  add(top, bc);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' }); add(tr, await T(title, o.tstyle || 'Heading/H2', 'text/primary')); for (const b of (o.badges || [])) add(tr, b); add(tr, [SPC(), 'FILL']); for (const b of (o.actions || [])) add(tr, b); add(top, [tr, 'FILL']);
  if (sub) await WT(top, sub, 'Body/S', 'text/secondary', 900);
  add(c, [top, 'FILL']); return top;
}
function CARD(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, align: o.align }); }
async function CHEAD(card, title, o = {}) { const r = AL('HORIZONTAL', { name: 'Card header', gap: 8, align: 'CENTER' }); if (o.icon) add(r, await IC(o.icon, 20, o.ic || 'icon/muted')); add(r, await T(title, o.style || 'Heading/H5', 'text/primary')); for (const b of (o.badges || [])) add(r, b); add(r, [SPC(), 'FILL']); if (o.demo !== false) add(r, await DEMO(o.demoSize || 'S')); for (const b of (o.right || [])) add(r, b); add(card, [r, 'FILL']); if (o.sub) await WT(card, o.sub, 'Caption', 'text/tertiary', 300); return r; }
async function KV(parent, k, v, o = {}) { const r = AL('HORIZONTAL', { name: 'KV ' + k, gap: 12, align: 'CENTER', p: o.line ? [8, 0, 8, 0] : 0 }); add(r, await T(k, 'Body/S', 'text/tertiary')); add(r, [SPC(), 'FILL']); if (o.node) add(r, o.node); else add(r, await T(v, o.style || 'Body/S Strong', o.color || 'text/primary')); add(parent, [r, 'FILL']); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); return r; }
const TONE = { warning: ['status/warning-tint', 'status/warning'], danger: ['status/danger-tint', 'status/danger'], info: ['status/info-tint', 'status/info'], success: ['status/success-tint', 'status/success'], neutral: ['surface/raised', 'icon/muted'], brand: ['brand/tint-subtle', 'icon/brand'] };
async function NOTE(parent, icon, tone, text, o = {}) { const F = TONE[tone]; const r = AL('HORIZONTAL', { name: 'Callout — ' + (o.title || tone), gap: 12, p: [12, 16, 12, 16], fill: F[0], r: 10, align: o.actions ? 'CENTER' : undefined }); add(r, await IC(icon, 18, F[1])); const col = AL('VERTICAL', { name: 'Text', gap: 2 }); if (o.title) add(col, await T(o.title, 'Body/S Strong', 'text/primary')); await WT(col, text, 'Body/S', 'text/secondary', o.w || 400); add(r, [col, 'FILL']); for (const b of (o.actions || [])) add(r, b); add(parent, [r, 'FILL']); return r; }
async function KPI(trend, label, value, unit, delta, def) { const k = await I('23:15270', { Trend: trend }); await setTs(k, { Label: label, Value: value, Unit: unit, 'Delta value': delta, Definition: def }); k.name = 'Admin/KPI Tile — ' + label; return k; }
async function ROW(parent, kids, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Row', gap: o.gap ?? 16, align: o.align }); for (const k of kids) { if (Array.isArray(k)) add(r, k); else add(r, [k, 'FILL']); if (o.spark) { const kk = Array.isArray(k) ? k[0] : k; const sp = kk.findOne && kk.findOne(n => n.name === 'Sparkline'); if (sp) { try { sp.layoutSizingHorizontal = 'FILL'; } catch (e) { MISS.push('spark'); } } } } add(parent, [r, 'FILL']); return r; }
async function TABS(parent, tabs, active) { const r = AL('HORIZONTAL', { name: 'Tabs', gap: 0 }); strokeSides(r, 'border/subtle', { b: 1 }); for (const [l, cnt] of tabs) { const t = await I('20:6831', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': !!cnt }); if (cnt) { const c = findI(t, 'Count') || byMain(t, 'Badge/Count'); if (c) setP(c, 'Count', cnt); } add(r, t); } add(parent, [r, 'FILL']); return r; }
async function CHIP(l, sel, icon) { const p = { Label: l, 'Show icon': !!icon }; if (icon) p.Icon = ICONS[icon] || CHAINS[icon]; return await I('17:2766', { State: sel ? 'Selected' : 'Default' }, p); }
async function SEARCH(ph, size = 'S') { const si = await I('16:3820', { Size: size, State: 'Default' }, { 'Show shortcut': false }); const t = si.findOne(n => n.type === 'TEXT' && /placeholder|value/i.test(n.name)) || si.findOne(n => n.type === 'TEXT'); if (t) await setText(t, ph); return si; }
async function TOOLBAR(parent, ph, chips, o = {}) {
  const bar = AL('VERTICAL', { name: 'Toolbar', gap: 12 });
  const r1 = AL('HORIZONTAL', { name: 'Controls', gap: 8, align: 'CENTER' }); add(r1, [await SEARCH(ph), 'FILL']);
  for (const [l, sel, ic] of chips) add(r1, await CHIP(l, sel, ic));
  add(r1, await I('23:5397', { State: o.filtered ? 'Active' : 'Default' }, { Label: 'More filters' }));
  if (o.date) add(r1, await BTN('Secondary', o.date, { size: 'S', lead: 'calendar' }));
  add(r1, await BTN('Secondary', 'Export CSV', { size: 'S', lead: 'download' })); add(bar, [r1, 'FILL']);
  if (o.summary) { const r2 = AL('HORIZONTAL', { name: 'Summary', gap: 8, align: 'CENTER' }); add(r2, await T(o.summary, 'Caption', 'text/tertiary'), await DEMO('XS')); add(r2, [SPC(), 'FILL']); if (o.sort) add(r2, await T(o.sort, 'Caption', 'text/tertiary')); add(bar, [r2, 'FILL']); }
  add(parent, [bar, 'FILL']); return bar;
}
// ---------- tables ----------
async function HC(col) { const h = await I('22:8309', { Align: col.r ? 'Right' : 'Left', Sort: col.sort || 'None' }, { Label: col.l || ' ', 'Show sort icon': !!col.sort }); h.name = 'H/' + col.k; return h; }
async function CELL(sp, d) {
  if (sp && sp.type) return sp; let c;
  if (sp.T === 'custom') { c = AL('HORIZONTAL', { name: 'Cell/Custom', gap: sp.gap ?? 6, p: [6, 12, 6, 12], align: 'CENTER' }); c.minHeight = d === 'Comfortable' ? 56 : 40; for (const n of sp.n) add(c, n); if (sp.right) c.primaryAxisAlignItems = 'MAX'; return c; }
  if (sp.T === 'Risk') { c = await I('23:5378', { Level: sp.lv, Density: d }); if (sp.sc != null) await setT(c, 'Score', d === 'Compact' ? '· ' + sp.sc : 'Score ' + sp.sc + ' / 100'); return c; }
  c = await I('22:9559', { Type: sp.T, Density: d }, { 'Show secondary': !!sp.s, 'Show DEMO': false, 'Show expand': false });
  if (sp.T === 'Text' || sp.T === 'Date') { const t = await setT(c, 'Primary', sp.p); if (t && sp.mono) await t.setTextStyleIdAsync(TS['Mono/S'].id); if (t && sp.c) t.fills = [paint(sp.c)]; if (sp.s) await setT(c, 'Secondary', sp.s); }
  else if (sp.T === 'Number') { const t = await setTany(c, ['Value', 'Primary', 'Number'], sp.p); if (t && sp.c) t.fills = [paint(sp.c)]; }
  else if (sp.T === 'Status') { const b = findI(c, 'Status badge') || byMain(c, 'Badge/Status'); setP(b, 'Status', sp.st); if (sp.p) await setT(b, 'Label', sp.p); }
  else if (sp.T === 'Address') { const ch = findI(c, 'Address chip') || byMain(c, 'Wallet/Address Chip'); setP(ch, 'Address', sp.p); setP(ch, 'Show DEMO', false); if (sp.ch && ch) { const m = ch.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Chain/')); if (m) { try { m.swapComponent(await figma.getNodeByIdAsync(CHAINS[sp.ch])); } catch (e) {} } } }
  else if (sp.T === 'Amount') { const av = findI(c, 'Amount value') || byMain(c, 'Table/Amount Value'); setP(av, 'Sign', sp.sign || 'Neutral'); await setT(av || c, 'Value', sp.p); }
  else if (sp.T === 'User') { const a = findI(c, 'Avatar') || byMain(c, 'User/Avatar'); setP(a, 'Initials', sp.i); await setT(c, 'Handle', sp.p); if (sp.s) await setT(c, 'Secondary', sp.s); }
  else if (sp.T === 'Network') { setP(c, 'Chain', CHAINS[sp.p] || USDT_ID); await setT(c, 'Network name', sp.p); if (sp.s) await setT(c, 'Secondary', sp.s); }
  return c;
}
// TABLE(name, cols[{k,l,w:number|'FILL',r,sort}], rows[[cellSpec]], {density, hideL:[keys], head:node, foot:node, sel:[rowIdx], bare})
async function TABLE(parent, name, cols, rows, o = {}) {
  const d = o.density || 'Compact';
  const t = AL('VERTICAL', { name: 'Table — ' + name + (o.hideL ? ' {hideL:' + o.hideL.join(',') + '}' : ''), fill: o.bare ? null : 'surface/default', stroke: o.bare ? null : 'border/subtle', r: o.bare ? null : 14, clip: true });
  if (o.head) add(t, [o.head, 'FILL']);
  const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'bg/secondary' }); strokeSides(hr, 'border/subtle', { b: 1 });
  for (const col of cols) { const h = await HC(col); if (typeof col.w === 'number') h.resize(col.w, h.height); add(hr, h); if (col.w === 'FILL') h.layoutSizingHorizontal = 'FILL'; }
  add(t, [hr, 'FILL']);
  for (let ri = 0; ri < rows.length; ri++) {
    const sel = (o.sel || []).includes(ri); const row = AL('HORIZONTAL', { name: 'Row ' + (ri + 1) + (sel ? ' (selected)' : ''), align: 'CENTER', fill: sel ? 'surface/selected' : null }); if (ri < rows.length - 1 || o.foot) strokeSides(row, 'border/subtle', { b: 1 });
    for (let ci = 0; ci < cols.length; ci++) { const col = cols[ci]; const sp = rows[ri][ci]; const c = await CELL(sp == null ? { T: 'custom', n: [] } : sp, d); c.name = 'Col/' + col.k; if (typeof col.w === 'number') { c.resize(col.w, c.height); if (c.type === 'FRAME') c.counterAxisSizingMode = 'AUTO'; } add(row, c); if (col.w === 'FILL') c.layoutSizingHorizontal = 'FILL'; }
    add(t, [row, 'FILL']);
  }
  if (o.foot) add(t, [o.foot, 'FILL']);
  add(parent, [t, 'FILL']); return t;
}
function C(...n) { return { T: 'custom', n }; }
function CR(...n) { return { T: 'custom', n, right: 1 }; }
async function TH(title, o = {}) { const h = AL('HORIZONTAL', { name: 'Table title', gap: 8, p: [14, 16, 14, 16], align: 'CENTER' }); strokeSides(h, 'border/subtle', { b: 1 }); add(h, await T(title, 'Heading/H5', 'text/primary')); for (const b of (o.badges || [])) add(h, b); add(h, [SPC(), 'FILL']); if (o.meta) add(h, await T(o.meta, 'Caption', 'text/tertiary')); add(h, await DEMO('M')); for (const b of (o.right || [])) add(h, b); return h; }
async function PAGER(type, range) { const p = await I('23:16756', { Type: type }); if (range) await setT(p, 'Range', range); return p; }
async function MONO(s, c = 'text/primary') { return await T(s, 'Mono/S', c); }
async function ICT(icon, color, s, tc = 'text/primary', st = 'Body/S') { const r = AL('HORIZONTAL', { name: 'Icon text — ' + String(s).slice(0, 24), gap: 6, align: 'CENTER' }); add(r, await IC(icon, 16, color), await T(s, st, tc)); return r; }
async function PILL(chain, status, label) { const p = await I('9:377', { Chain: chain, Status: status }, { 'Show status label': label !== false, 'Show chevron': false }); return p; }
async function BAR(pct, color = 'brand/primary', w = 120) { const r = AL('HORIZONTAL', { name: 'Bar ' + pct + '%', w, h: 6, fill: 'surface/hover', r: 9999, clip: true }); const b = rect(Math.max(2, Math.round(w * pct / 100)), 6, color, 9999, 'Fill'); add(r, b); return r; }
async function STEPS(parent, steps) { const r = AL('VERTICAL', { name: 'Timeline', gap: 0 }); for (let i = 0; i < steps.length; i++) { const [state, t1, t2] = steps[i]; const row = AL('HORIZONTAL', { name: 'Step ' + (i + 1), gap: 12 }); const rail = AL('VERTICAL', { name: 'Rail', gap: 4, align: 'CENTER' }); const col = { done: 'status/success', now: 'status/info', next: 'border/strong', bad: 'status/danger', warn: 'status/warning' }[state]; add(rail, await IC(state === 'done' ? 'check-circle' : state === 'bad' ? 'x-circle' : state === 'warn' ? 'alert-triangle' : state === 'now' ? 'clock' : 'hourglass', 18, col)); if (i < steps.length - 1) { const ln = rect(2, 24, 'border/default', 0, 'Line'); add(rail, ln); } add(row, rail); const tx = AL('VERTICAL', { name: 'Text', gap: 2, p: [0, 0, 12, 0] }); add(tx, await T(t1, 'Body/S Strong', state === 'next' ? 'text/tertiary' : 'text/primary')); if (t2) await WT(tx, t2, 'Caption', 'text/tertiary', 300); add(row, [tx, 'FILL']); add(r, [row, 'FILL']); } add(parent, [r, 'FILL']); return r; }
async function DONE(f, extra = {}) { fitSection(sec); await f.screenshot({ scale: 0.5 }); return { frame: f.id, name: f.name, w: f.width, h: Math.round(f.height), x: f.x, y: f.y, miss: [...new Set(MISS)].slice(0, 40), ...extra }; }
// ===== END ADM-BC LIB =====
