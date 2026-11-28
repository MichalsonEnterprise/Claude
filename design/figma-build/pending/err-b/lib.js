// ===== ERR-B BOARD LIB (pending/err-b/lib.js) — paste after helpers.js =====
const CW = 1312, PW = 760, TXW = 504;
const PAGE12 = '12 — Empty & Error States', SEC_NAME = 'ERR-04..07 Permission, regulatory, maintenance & security';
async function ensureFont(t) { if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); else for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); }
function inBadge(t) { let p = t.parent; while (p) { if (p.type === 'INSTANCE' && p.name.startsWith('Badge/')) return true; p = p.parent; } return false; }
async function ov(inst, layer, text, nth = 0) { const t = inst.findAll(n => n.type === 'TEXT' && n.name === layer && !inBadge(n))[nth]; if (!t) return false; await ensureFont(t); t.characters = text; return true; }
function txt(inst, name, nth = 0) { const t = inst.findAll(n => n.type === 'TEXT' && n.name === name && !inBadge(n))[nth]; return t ? t.characters : ''; }
function relabel(inst, oldLabel, label) { for (const b of inst.findAll(n => n.type === 'INSTANCE')) { const cp = b.componentProperties; const k = Object.keys(cp).find(x => x.startsWith('Label#')); if (k && cp[k].value === oldLabel) { b.setProperties({ [k]: label }); return true; } } return false; }
function hide(inst, name) { for (const n of inst.findAll(x => x.name === name)) n.visible = false; }
const SEV = { Blocking: ['status/danger-tint', 'text/danger', 'ban'], Restricted: ['status/warning-tint', 'text/warning', 'lock'], Warning: ['status/warning-tint', 'text/warning', 'alert-triangle'], Advisory: ['status/info-tint', 'text/info', 'info'], Security: ['status/danger-tint', 'text/danger', 'shield-alert'], Recovery: ['status/success-tint', 'text/success', 'check-circle'] };
async function sev(k) { const [bg, fg, ic] = SEV[k]; const r = AL('HORIZONTAL', { name: 'Severity — ' + k, gap: 6, p: [4, 10, 4, 8], fill: bg, r: 9999, align: 'CENTER' }); add(r, await IC(ic, 14, fg), await T(k, 'Label/S', fg)); return r; }
async function chip(txt, mono = true, color = 'text/secondary') { const r = AL('HORIZONTAL', { name: 'Chip — ' + txt, p: [4, 10], fill: 'surface/raised', stroke: 'border/default', r: 9999, align: 'CENTER' }); add(r, await T(txt, mono ? 'Mono/S' : 'Label/S', color)); return r; }
async function stat(icon, label, fg) { const r = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 6, align: 'CENTER' }); add(r, await IC(icon, 16, fg), await T(label, 'Label/S', fg)); return r; }
async function grp(label, kids) { const g = AL('VERTICAL', { name: 'Group — ' + label, gap: 8, w: TXW }); add(g, await T(label, 'Overline', 'text/tertiary')); for (const k of kids) add(g, [k, 'FILL']); return g; }
async function kv(k, v) { const r = AL('VERTICAL', { name: 'Copy — ' + k, gap: 2, w: TXW }); add(r, await T(k, 'Caption', 'text/tertiary'), [await T('“' + v + '”', 'Body/S', 'text/primary', { w: TXW }), 'FILL']); return r; }
async function act(type, label, dest, lead) { const r = AL('HORIZONTAL', { name: 'Action — ' + label, gap: 12, align: 'CENTER', w: TXW }); add(r, await BTN(type, label, { size: 'S', lead })); const t = await T('→ ' + dest, 'Body/S', 'text/secondary', { w: 200 }); add(r, t); t.layoutSizingHorizontal = 'FILL'; return r; }
async function bul(items, w = TXW, color = 'text/secondary') { const c = AL('VERTICAL', { name: 'Notes', gap: 6, w }); for (const s of items) { const r = AL('HORIZONTAL', { gap: 8, w }); const t = await T(s, 'Body/S', color, { w: w - 16 }); add(r, await T('•', 'Body/S', 'text/tertiary'), t); t.layoutSizingHorizontal = 'FILL'; add(c, [r, 'FILL']); } return c; }
async function tile(icon, bg, fg, size = 40) { const t = AL('HORIZONTAL', { name: 'Icon tile', fill: bg, r: 10, align: 'CENTER', justify: 'CENTER', w: size, h: size }); add(t, await IC(icon, Math.round(size / 2), fg)); return t; }
async function note(icon, txt, w, bg = 'surface/default', fg = 'icon/muted') { const r = AL('HORIZONTAL', { name: 'Note', gap: 8, p: [10, 12], fill: bg, r: 10, align: 'MIN', w }); add(r, await IC(icon, 16, fg), await T(txt, 'Body/S', 'text/secondary', { w: w - 48 })); return r; }
// panel({w, icon, bg, fg, title, body, h, extra:[node|[node,'FILL']], btns:[[type,label,lead]], bs, modal, fill, name})
async function panel(o) {
  const w = o.w || 720; const p = AL('VERTICAL', { name: o.name || 'Panel — ' + o.title, gap: 16, p: 24, fill: o.fill || (o.modal ? 'surface/overlay' : 'surface/raised'), stroke: 'border/subtle', r: o.modal ? 20 : 14, w });
  if (o.modal) await fx(p, 'Elevation/4 — Modal');
  const hd = AL('HORIZONTAL', { name: 'Head', gap: 16, align: 'MIN' }); const tx = AL('VERTICAL', { name: 'Text', gap: 6 }); const tw = w - 48 - 56;
  add(tx, await T(o.title, o.h || 'Heading/H5', 'text/primary', { w: tw }), await T(o.body, 'Body/S', 'text/secondary', { w: tw }));
  add(hd, await tile(o.icon, o.bg, o.fg), tx); add(p, hd);
  for (const e of o.extra || []) add(p, e);
  if (o.btns) { const br = AL('HORIZONTAL', { name: 'Actions', gap: 8, align: 'CENTER', wrap: true, cgap: 8 }); for (const [ty, lb, ld, st] of o.btns) add(br, await BTN(ty, lb, { size: o.bs || 'M', lead: ld, state: st })); add(p, [br, 'FILL']); }
  return p;
}
// cell({no, sev, name, lib, stage: async()=>[nodes], trigger, where, copy:[[k,v]], actions:[[type,label,dest,lead]], notes:[]})
async function cell(o) {
  const c = AL('HORIZONTAL', { name: 'Cell ' + o.no + ' — ' + o.name, fill: 'surface/default', stroke: 'border/subtle', r: 14, clip: true, w: CW });
  const pv = AL('VERTICAL', { name: 'Preview', gap: 12, p: 20, fill: 'bg/base', w: PW }); strokeSides(pv, 'border/subtle', { r: 1 });
  const cap = AL('HORIZONTAL', { name: 'Preview label', gap: 6, align: 'CENTER' }); add(cap, await IC('layers', 14, 'icon/muted'), await T(o.lib, 'Caption', 'text/tertiary', { w: 690 })); add(pv, cap);
  const st = AL('VERTICAL', { name: 'Stage', gap: 16, align: 'CENTER', justify: 'CENTER', p: [12, 0] }); add(pv, [st, 'FILL']);
  for (const k of await o.stage()) add(st, k);
  const sp = AL('VERTICAL', { name: 'Spec', gap: 20, p: 24 });
  const top = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(top, await chip(o.no), await sev(o.sev));
  add(sp, top, await T(o.name, 'Heading/H5', 'text/primary', { w: TXW }));
  add(sp, await grp('TRIGGER', [await T(o.trigger, 'Body/S', 'text/secondary', { w: TXW })]));
  if (o.where) add(sp, await grp('WHERE IT APPEARS', [await T(o.where, 'Body/S', 'text/secondary', { w: TXW })]));
  const cp = []; for (const [k, v] of (typeof o.copy === 'function' ? await o.copy() : o.copy)) cp.push(await kv(k, v)); add(sp, await grp('EXACT COPY', cp));
  const ac = []; for (const [ty, lb, de, ld] of o.actions) ac.push(await act(ty, lb, de, ld)); add(sp, await grp('ACTIONS', ac));
  if (o.notes) add(sp, await grp('BEHAVIOUR & DEV NOTES', [await bul(o.notes)]));
  add(c, pv, sp); sp.layoutSizingHorizontal = 'FILL';
  if (sp.height > pv.height) { const extra = sp.height - pv.height; st.resize(st.width, st.height + extra); st.layoutSizingHorizontal = 'FILL'; }
  return c;
}
function audit(root) { const flags = []; const rb = root.absoluteBoundingBox; for (const t of root.findAll(n => n.type === 'TEXT' && n.visible)) { const b = t.absoluteRenderBounds || t.absoluteBoundingBox; if (!b) continue; let p = t.parent; while (p && p.type !== 'SECTION' && p.type !== 'PAGE') { const pb = p.absoluteBoundingBox; if (pb && p.clipsContent && (b.x < pb.x - 1 || b.y < pb.y - 1 || b.x + b.width > pb.x + pb.width + 1 || b.y + b.height > pb.y + pb.height + 1)) { flags.push(t.characters.slice(0, 40) + ' ⟂ ' + p.name); break; } if (p === root) break; p = p.parent; } if (b.x + b.width > rb.x + rb.width + 1 || b.x < rb.x - 1) flags.push('off-frame: ' + t.characters.slice(0, 30)); if (t.width < 4) flags.push('thin: ' + t.characters.slice(0, 30)); } return flags.slice(0, 30); }
// board({col, id, pri, frameName, title, desc, rules[], map[[code, state]], cells[], extra: async()=>node, related[]})
async function board(o) {
  const page = figma.root.children.find(p => p.name === PAGE12); await figma.setCurrentPageAsync(page);
  let sec = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === SEC_NAME);
  if (!sec) { let mx = 0; for (const n of figma.currentPage.children) mx = Math.max(mx, n.x + n.width); sec = section(SEC_NAME, figma.currentPage.children.length ? Math.max(2000, Math.ceil((mx + 400) / 1000) * 1000) : 2000, 0); }
  const old = sec.children.find(n => n.name === o.frameName); const pos = old ? { x: old.x, y: old.y } : { x: 120 + o.col * 1560, y: 120 }; if (old) old.remove();
  const f = await screen(o.frameName, 1440, {}); sec.appendChild(f); f.x = pos.x; f.y = pos.y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('VERTICAL', { name: 'Board', gap: 32, p: [64, 64, 96, 64] }); add(f, [body, 'FILL']);
  const hd = AL('VERTICAL', { name: 'Header', gap: 12, w: CW });
  const o1 = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(o1, await T('PAGE 12 · EMPTY & ERROR STATES · ' + o.id, 'Overline', 'text/brand'), await chip(o.pri, false), await chip('Documentation board · library instances', false), await DEMO('M'));
  add(hd, o1, await T(o.title, 'Heading/H2', 'text/primary', { w: 1100 }), await T(o.desc, 'Body/L', 'text/secondary', { w: 1040 }));
  add(body, hd);
  const row = AL('HORIZONTAL', { name: 'Rules & trigger map', gap: 16, w: CW });
  const rc = AL('VERTICAL', { name: 'Rules', gap: 12, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); add(rc, await T('Rules for this group', 'Heading/H5', 'text/primary'));
  for (const s of o.rules) { const r = AL('HORIZONTAL', { gap: 8, align: 'MIN' }); add(r, await IC('check', 16, 'icon/brand'), await T(s, 'Body/S', 'text/secondary', { w: 568 })); add(rc, r); }
  const mc = AL('VERTICAL', { name: 'Trigger map', gap: 4, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); add(mc, await T('Trigger → state', 'Heading/H5', 'text/primary'));
  for (const [code, s] of o.map) { const r = AL('HORIZONTAL', { gap: 16, p: [10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, await T(code, 'Mono/S', 'text/secondary', { w: 312 }), await T(s, 'Body/S', 'text/primary', { w: 264 })); add(mc, [r, 'FILL']); }
  add(row, [rc, 'FILL'], [mc, 'FILL']); add(body, row);
  const rh = Math.max(rc.height, mc.height); for (const x of [rc, mc]) { x.resize(x.width, rh); x.layoutSizingHorizontal = 'FILL'; }
  const cl = AL('VERTICAL', { name: 'Cells', gap: 24, w: CW }); add(body, cl);
  for (const c of o.cells) add(cl, await cell(c));
  if (o.extra) add(body, await o.extra());
  const rel = AL('VERTICAL', { name: 'Related screens', gap: 10, p: 24, fill: 'bg/secondary', stroke: 'border/subtle', r: 14, w: CW });
  add(rel, await T('Full-screen versions elsewhere in this file', 'Label/M', 'text/primary'));
  for (const s of o.related) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await IC('arrow-right', 14, 'icon/muted'), await T(s, 'Body/S', 'text/secondary', { w: 1200 })); add(rel, r); }
  const lic = AL('HORIZONTAL', { name: 'Licence & 18+', gap: 12, align: 'CENTER' }); add(lic, await I('6:159'), await I('6:158', { Variant: 'Inline' })); add(rel, lic);
  add(body, rel);
  return { sec, f };
}
// ===== END ERR-B LIB =====
