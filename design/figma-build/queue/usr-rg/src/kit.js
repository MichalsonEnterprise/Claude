// ===== RG KIT (USR-RG agent) =====
function tk(n, fb = 'surface/raised') { return VAR[n] ? n : fb; }
async function txt(node, from, to) { let n = 0; for (const t of node.findAllWithCriteria({ types: ['TEXT'] })) { if (t.characters.includes(from)) { for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = t.characters.split(from).join(to); n++; } } return n; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 24, fill: tk(o.fill || 'surface/default'), stroke: tk(o.stroke || 'border/subtle', 'border/default'), r: o.r ?? 14 }); }
function meter(w, pct, color = 'brand/primary', h = 8) { const tr = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, w, h, clip: true }); tr.appendChild(rect(Math.max(6, Math.round(w * pct)), h, color, 9999, 'Meter fill')); return tr; }
async function iconTile(icon, color = 'icon/brand', s = 40, fillTok = 'surface/raised') { const t = AL('HORIZONTAL', { name: 'Icon tile', w: s, h: s, fill: fillTok, r: 10, align: 'CENTER', justify: 'CENTER' }); t.appendChild(await IC(icon, Math.round(s / 2), color)); return t; }
async function chip(icon, label, tone = 'success') { const c = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 4, p: [4, 10, 4, 8], fill: tk('status/' + tone + '-tint'), r: 9999, align: 'CENTER' }); c.appendChild(await IC(icon, 14, tk('status/' + tone, 'icon/default'))); c.appendChild(await T(label, 'Label/S', tk('status/' + tone, 'text/secondary'))); return c; }
async function tag(label) { const c = AL('HORIZONTAL', { name: 'Tag — ' + label, p: [4, 10, 4, 10], fill: 'surface/raised', stroke: 'border/subtle', r: 9999 }); c.appendChild(await T(label, 'Label/S', 'text/secondary')); return c; }
async function noteBox(icon, text, tone, w) { const b = AL('HORIZONTAL', { name: 'Note — ' + tone, gap: 8, p: 12, fill: tk('status/' + tone + '-tint'), r: 10 }); b.appendChild(await IC(icon, 16, tk('status/' + tone, 'icon/default'))); const t = await T(text, 'Body/S', 'text/primary', { w: w - 48 }); add(b, [t, 'FILL']); return b; }
async function secHead(title, sub, w = 900) { const s = AL('VERTICAL', { name: 'Section header — ' + title, gap: 4 }); s.appendChild(await T(title, 'Heading/H4', 'text/primary')); if (sub) s.appendChild(await T(sub, 'Body/S', 'text/secondary', { w })); return s; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 12, align: 'CENTER', p: o.p ?? [12, 0, 12, 0] }); const l = await T(label, 'Body/S', 'text/secondary'); add(r, [l, 'FILL']); const v = await T(value, o.style || 'Body/S Strong', o.color || 'text/primary'); r.appendChild(v); if (o.demo !== false) r.appendChild(await DEMO('XS')); if (o.divider !== false) strokeSides(r, 'border/subtle', { b: 1 }); return r; }
async function bullet(icon, title, body, w, color = 'icon/brand') { const r = AL('HORIZONTAL', { name: 'Item — ' + title, gap: 12 }); r.appendChild(await iconTile(icon, color, 32)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(title, 'Body/S Strong', 'text/primary', { w: w - 44 }), 'FILL']); if (body) add(tx, [await T(body, 'Body/S', 'text/secondary', { w: w - 44 }), 'FILL']); return r; }
function cols(C, railW = 440) { const r = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(C, [r, 'FILL']); const m = AL('VERTICAL', { name: 'Main', gap: 24 }); add(r, [m, 'FILL']); const rail = AL('VERTICAL', { name: 'Rail', gap: 24, w: railW }); r.appendChild(rail); return { m, rail }; }
const TABS = ['Overview', 'Deposit limits', 'Participation limits', 'Time limits', 'Reality checks', 'Cooling-off', 'Self-exclusion'];
async function sbActive(sb, label) { for (const it of sb.findAllWithCriteria({ types: ['INSTANCE'] })) { const mc = it.mainComponent; if (!mc || !mc.parent || mc.parent.name !== 'Shell/Sidebar Item') continue; const p = it.componentProperties; const lk = Object.keys(p).find(k => k.startsWith('Label')); const lab = lk ? p[lk].value : ''; if (lab === label) { it.setProperties({ State: 'Active' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/brand'); } else if (p.State && p.State.value === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } } }
// Desktop shell: DEMOBAR → [Sidebar | Topbar → Content(header, tabs)]
async function shellD(name, tab, o = {}) {
  const f = await screen(name, 1440, {}); add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Member' }); body.appendChild(sb); sb.layoutSizingVertical = 'FILL';
  if (o.sbLabel !== null) { try { await sbActive(sb, o.sbLabel || 'Responsible gaming'); } catch (e) {} }
  const col = AL('VERTICAL', { name: 'Main column' }); add(body, [col, 'FILL']);
  const tb = await I('23:9832', { State: 'Member' }); add(col, [tb, 'FILL']); if (o.noDeposit) { try { await noDeposit(tb); } catch (e) {} }
  if (o.banner) add(col, [o.banner, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 24, p: [32, 32, 48, 32] }); add(col, [C, 'FILL']);
  if (o.bare) return { f, sb, tb, col, C };
  const crumb = AL('HORIZONTAL', { name: 'Breadcrumb', gap: 8, align: 'CENTER' }); const parts = ['Account', 'Responsible gaming'].concat(tab === 'Overview' ? [] : [tab]);
  for (let i = 0; i < parts.length; i++) { if (i) crumb.appendChild(await IC('chevron-right', 14, 'icon/muted')); crumb.appendChild(await T(parts[i], 'Body/S', i === parts.length - 1 ? 'text/primary' : 'text/tertiary')); }
  C.appendChild(crumb);
  const hr = AL('HORIZONTAL', { name: 'Title row', gap: 24, align: 'MAX' }); add(C, [hr, 'FILL']);
  const hl = AL('VERTICAL', { name: 'Title', gap: 8 }); add(hr, [hl, 'FILL']);
  hl.appendChild(await T(o.title || 'Responsible gaming', 'Heading/H2', 'text/primary'));
  hl.appendChild(await T(o.sub || 'Tools to keep play enjoyable. Lowering a limit applies straight away; raising one waits 24 hours, so the decision is never made in the moment.', 'Body/M', 'text/secondary', { w: 720 }));
  const hra = AL('HORIZONTAL', { name: 'Title actions', gap: 12, align: 'CENTER' }); hr.appendChild(hra);
  hra.appendChild(await DEMO('M')); hra.appendChild(await I('6:159')); hra.appendChild(await BTN('Secondary', 'Talk to support', { size: 'M', lead: 'chat' }));
  const tabs = AL('HORIZONTAL', { name: 'RG tabs', gap: 4 }); add(C, [tabs, 'FILL']); strokeSides(tabs, 'border/subtle', { b: 1 });
  for (const t of TABS) { const ti = await I('20:6831', { State: t === tab ? 'Active' : 'Default' }, { Label: t }); ti.name = 'Tab — ' + t; tabs.appendChild(ti); }
  return { f, sb, tb, col, C };
}
async function footD(C) { const lic = await I('6:158', { Variant: 'Inline' }); add(C, [lic, 'FILL']); return lic; }
// overlay helpers (absolute children of a screen frame)
function scrimOver(f, tok = 'scrim/overlay') { const s = rect(f.width, f.height, tok, 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; s.resize(f.width, f.height); return s; }
function floatIn(f, n, x, y) { f.appendChild(n); n.layoutPositioning = 'ABSOLUTE'; n.x = x; n.y = y; return n; }
async function placeD(f, sec, x, y) { sec.appendChild(f); f.x = x; f.y = y; fitSection(sec); return f; }
function byName(sec, name) { return sec.children.find(c => c.name === name); }
async function noDeposit(root) { for (const b of root.findAllWithCriteria({ types: ['INSTANCE'] })) { const p = b.componentProperties; const lk = Object.keys(p).find(x => x.startsWith('Label')); if (lk && p[lk].value === 'Deposit' && p.State) b.setProperties({ State: 'Disabled' }); } }
function hidePromos(sb) { let n = 0; for (const c of sb.findAll(x => /promo|tile/i.test(x.name) && x.type !== 'TEXT')) { if (c.parent && /promo/i.test(c.parent.name)) continue; c.visible = false; n++; } return n; }
async function banner(icon, title, body, tone, btns = []) { const b = AL('HORIZONTAL', { name: 'Banner — ' + title, gap: 16, p: [16, 32, 16, 32], fill: tk('status/' + tone + '-tint'), align: 'CENTER' }); strokeSides(b, tk('status/' + tone, 'border/default'), { b: 1 }); b.appendChild(await iconTile(icon, tk('status/' + tone, 'icon/default'), 40, 'surface/default')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(b, [tx, 'FILL']); add(tx, [await T(title, 'Body/M Strong', 'text/primary', { w: 700 }), 'FILL']); if (body) add(tx, [await T(body, 'Body/S', 'text/secondary', { w: 700 }), 'FILL']); for (const x of btns) b.appendChild(x); return b; }
// ===== END RG KIT =====
