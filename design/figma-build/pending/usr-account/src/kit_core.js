// ===== ACCOUNT KIT CORE (usr-account agent) =====
const FORCE = false; // true = rebuild frames that already exist (by exact name)
const LOG = [];
// AL with one fixed dimension and the other hugging (helpers' AL leaves both FIXED after resize)
function ALX(dir, o = {}) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'HORIZONTAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } return f; }
function tk(n, fb = 'surface/raised') { return VAR[n] ? n : fb; }
async function tryy(label, fn) { try { return await fn(); } catch (e) { LOG.push(label + ': ' + String((e && e.message) || e).slice(0, 160)); return null; } }
async function setTxt(t, s) { const fs = t.characters.length ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]; for (const f of fs) await figma.loadFontAsync(f); t.characters = s; }
async function byLayer(root, map) { const hit = []; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { if (Object.prototype.hasOwnProperty.call(map, t.name)) { await setTxt(t, map[t.name]); hit.push(t.name); } } return hit; }
async function repl(root, from, to) { let n = 0; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { if (t.characters.includes(from)) { await setTxt(t, t.characters.split(from).join(to)); n++; } } return n; }
function setP(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 24, fill: tk(o.fill || 'surface/default'), stroke: tk(o.stroke || 'border/subtle', 'border/default'), r: o.r ?? 14 }); }
function meter(w, pct, color = 'brand/primary', h = 8) { const tr = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, w, h, clip: true }); tr.appendChild(rect(Math.max(6, Math.round(w * pct)), h, color, 9999, 'Meter fill')); return tr; }
async function iconTile(icon, color = 'icon/brand', s = 40, fillTok = 'surface/raised') { const t = AL('HORIZONTAL', { name: 'Icon tile', w: s, h: s, fill: fillTok, r: 10, align: 'CENTER', justify: 'CENTER' }); t.appendChild(await IC(icon, Math.round(s / 2), color)); return t; }
async function chip(icon, label, tone = 'success') { const c = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 4, p: [4, 10, 4, 8], fill: tk('status/' + tone + '-tint'), r: 9999, align: 'CENTER' }); c.appendChild(await IC(icon, 14, tk('status/' + tone, 'icon/default'))); c.appendChild(await T(label, 'Label/S', tk('text/' + tone, tk('status/' + tone, 'text/secondary')))); return c; }
async function tag(label, tone) { const c = AL('HORIZONTAL', { name: 'Tag — ' + label, p: [4, 10, 4, 10], fill: 'surface/raised', stroke: 'border/subtle', r: 9999 }); c.appendChild(await T(label, 'Label/S', tone || 'text/secondary')); return c; }
async function noteBox(icon, text, tone, w) { const b = AL('HORIZONTAL', { name: 'Note — ' + tone, gap: 8, p: 12, fill: tk('status/' + tone + '-tint'), r: 10 }); b.appendChild(await IC(icon, 16, tk('status/' + tone, 'icon/default'))); const t = await T(text, 'Body/S', 'text/primary', { w: w - 48 }); add(b, [t, 'FILL']); return b; }
async function secHead(title, sub, w = 760) { const s = AL('VERTICAL', { name: 'Header — ' + title, gap: 4 }); s.appendChild(await T(title, 'Heading/H5', 'text/primary')); if (sub) s.appendChild(await T(sub, 'Body/S', 'text/secondary', { w })); return s; }
// card header: title + optional sub on the left, extra nodes on the right
async function head(c, title, sub, w, right = []) { const h = AL('HORIZONTAL', { name: 'Card header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']); const tt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(h, [tt, 'FILL']); add(tt, [await T(title, 'Heading/H5', 'text/primary', { w: w - 200 }), 'FILL']); if (sub) add(tt, [await T(sub, 'Body/S', 'text/secondary', { w: w - 200 }), 'FILL']); for (const r of right) if (r) h.appendChild(r); return h; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 12, align: 'CENTER', p: o.p ?? [12, 0, 12, 0] }); const l = await T(label, 'Body/S', 'text/secondary'); if (o.lw) { l.resize(o.lw, l.height); l.textAutoResize = 'HEIGHT'; r.appendChild(l); } else add(r, [l, 'FILL']); const v = await T(value, o.style || 'Body/S Strong', o.color || 'text/primary', o.vw ? { w: o.vw } : {}); if (o.lw) add(r, [v, 'FILL']); else r.appendChild(v); for (const x of (o.extra || [])) r.appendChild(x); if (o.demo !== false) r.appendChild(await DEMO('XS')); if (o.divider !== false) strokeSides(r, 'border/subtle', { b: 1 }); return r; }
async function bullet(icon, title, body, w, color = 'icon/brand') { const r = AL('HORIZONTAL', { name: 'Item — ' + title, gap: 12 }); r.appendChild(await iconTile(icon, color, 32)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(title, 'Body/S Strong', 'text/primary', { w: w - 44 }), 'FILL']); if (body) add(tx, [await T(body, 'Body/S', 'text/secondary', { w: w - 44 }), 'FILL']); return r; }
async function check(text, ok, w, tone) { const r = AL('HORIZONTAL', { name: 'Check — ' + text.slice(0, 30), gap: 8, align: 'MIN' }); const t2 = tone || (ok ? 'success' : 'danger'); r.appendChild(await IC(ok ? 'check-circle' : 'x-circle', 18, tk('status/' + t2, 'icon/default'))); add(r, [await T(text, 'Body/S', 'text/primary', { w: w - 26 }), 'FILL']); return r; }
// setting row: icon tile | title + desc | right nodes
async function srow(icon, title, desc, right = [], o = {}) { const r = AL('HORIZONTAL', { name: 'Setting — ' + title, gap: 16, align: 'CENTER', p: o.p ?? [16, 0, 16, 0] }); if (o.divider !== false) strokeSides(r, 'border/subtle', { t: 1 }); r.appendChild(await iconTile(icon, o.ic || 'icon/brand', 40)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(title, 'Body/M Strong', 'text/primary', { w: o.tw || 360 }), 'FILL']); if (desc) add(tx, [await T(desc, 'Body/S', 'text/secondary', { w: o.tw || 360 }), 'FILL']); for (const x of right) if (x) r.appendChild(x); return r; }
function scrimOver(f, tok = 'scrim/overlay') { const s = rect(f.width, f.height, tk(tok, 'scrim/strong'), 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; s.resize(f.width, f.height); return s; }
function floatIn(f, n, x, y) { f.appendChild(n); n.layoutPositioning = 'ABSOLUTE'; n.x = x; n.y = y; return n; }
function byName(sec, name) { return sec.children.find(c => c.name === name); }
// returns null when the frame should be built, or a 'skipped' result when it already exists
function skipIf(sec, name) { const old = byName(sec, name); if (!old) return null; if (FORCE) { old.remove(); return null; } return { skipped: true, frame: old.id, name, h: Math.round(old.height) }; }
function colX(col, step) { return 120 + col * step; }
// place a frame: column x; y = below the last frame in that column (and band). bandFn(name) -> 0|1 splits a section into bands
async function place(f, sec, col, step, bandFn) {
  const bf = bandFn || (() => 0); const band = bf(f.name); const x = colX(col, step);
  const others = sec.children.filter(c => c.id !== f.id);
  const same = others.filter(c => Math.abs(c.x - x) < 10 && bf(c.name) === band);
  let y;
  if (same.length) y = Math.max(...same.map(c => c.y + c.height)) + 160;
  else if (band === 0) y = 160;
  else { const b1 = others.filter(c => bf(c.name) === band); if (b1.length) y = Math.min(...b1.map(c => c.y)); else { const b0 = others.filter(c => bf(c.name) < band); y = (b0.length ? Math.max(...b0.map(c => c.y + c.height)) : 12000) + 480; } }
  sec.appendChild(f); f.x = x; f.y = y; fitSection(sec); return f;
}
async function sbNone(sb) { for (const it of sb.findAllWithCriteria({ types: ['INSTANCE'] })) { const mc = it.mainComponent; if (!mc || !mc.parent || mc.parent.name !== 'Shell/Sidebar Item') continue; const p = it.componentProperties; if (p.State && p.State.value === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } } }
async function btnIcon(icon, type = 'Ghost', size = 'S') { return await I('7:774', { Type: type, Size: size, State: 'Default' }, { Icon: ICONS[icon] }); }
// inline modal with Modal/Base anatomy (Modal/Base body is a fixed placeholder slot)
async function modalBox(title, desc, w = 560) {
  const m = ALX('VERTICAL', { name: 'Modal — ' + title, fill: 'surface/overlay', stroke: 'border/subtle', r: 20, w }); await fx(m, 'Elevation/4 — Modal');
  const hd = AL('HORIZONTAL', { name: 'Header', gap: 16, p: [24, 24, 16, 24] }); add(m, [hd, 'FILL']);
  const ht = AL('VERTICAL', { name: 'Title', gap: 4 }); add(hd, [ht, 'FILL']); add(ht, [await T(title, 'Heading/H4', 'text/primary', { w: w - 104 }), 'FILL']); if (desc) add(ht, [await T(desc, 'Body/S', 'text/secondary', { w: w - 104 }), 'FILL']);
  hd.appendChild(await btnIcon('x', 'Ghost', 'M'));
  const bd = AL('VERTICAL', { name: 'Body', gap: 16, p: [8, 24, 24, 24] }); add(m, [bd, 'FILL']);
  const ft = AL('HORIZONTAL', { name: 'Footer', gap: 12, p: [16, 24, 24, 24], justify: 'MAX', align: 'CENTER' }); strokeSides(ft, 'border/subtle', { t: 1 }); add(m, [ft, 'FILL']);
  return { m, bd, ft, W: w - 48 };
}
// illustrative QR-style code (DEMO) — deterministic pseudo-random modules + finder squares
function qrArt(size = 168, n = 25) {
  const f = figma.createFrame(); f.name = 'QR — illustrative (DEMO)'; f.resize(size, size); fill(f, 'text/primary'); f.clipsContent = true; radius(f, 6);
  const cell = Math.floor((size - 16) / n); const off = Math.floor((size - cell * n) / 2); let s = 7;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const finder = (cx, cy) => { for (const [d, tok] of [[7, 'bg/base'], [5, 'text/primary'], [3, 'bg/base']]) { const r = rect(cell * d, cell * d, tok, 0, 'Finder'); f.appendChild(r); r.x = off + (cx + (7 - d) / 2) * cell; r.y = off + (cy + (7 - d) / 2) * cell; } };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); if (inF) continue; if (rnd() < 0.46) { const r = rect(cell, cell, 'bg/base', 0, 'm'); f.appendChild(r); r.x = off + x * cell; r.y = off + y * cell; } }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  return f;
}
async function shotOf(f) { await tryy('screenshot ' + f.name, async () => { await f.screenshot({ scale: 0.5 }); }); }
// ===== END ACCOUNT KIT CORE =====
