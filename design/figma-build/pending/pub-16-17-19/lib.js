// ===== PUB-16/17/19 LIB (legal documents) =====
figma.skipInvisibleInstanceChildren = false; // hidden layers in the main (sections 11, notes, TOC list) must be reachable in instances
const MISS = [];
const TPL_NAME = 'Template/Legal Document';
const DOC_LINKS = ['Terms & Conditions', 'Privacy Policy', 'AML/KYC Policy', 'Responsible Gaming', 'Restricted Countries', 'Cookie Policy'];
const NSEC = 11;
function AX(dir, o = {}) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'VERTICAL') f.counterAxisSizingMode = 'AUTO'; else f.primaryAxisSizingMode = 'AUTO'; } return f; }
function row(name, o = {}) { return AX('HORIZONTAL', Object.assign({ name, gap: 12, align: 'CENTER' }, o)); }
function col(name, o = {}) { return AX('VERTICAL', Object.assign({ name, gap: 8 }, o)); }
function card(name, o = {}) { return AX('VERTICAL', Object.assign({ name, p: 24, gap: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }, o)); }
async function tx(name, chars, style, color) { const t = await T(chars, style, color); t.name = name; return t; }
// wrapping text that fills its (auto-layout) parent
async function wt(parent, name, chars, style, color) { const t = await T(chars, style, color, { w: 100 }); t.name = name; parent.appendChild(t); t.layoutSizingHorizontal = 'FILL'; return t; }
async function tile(icName, o = {}) { const t = AL('HORIZONTAL', { name: 'Icon tile — ' + icName, fill: o.tint || 'brand/tint', r: 10, p: o.p ?? 8 }); add(t, await IC(icName, o.size || 18, o.ic || 'icon/brand')); return t; }
function words(D) { return [D.lead, ...D.sum, ...D.s.flatMap(s => [s.h, ...s.p, s.note || ''])].join(' ').split(/\s+/).length; }
function readTime(D) { return Math.max(1, Math.ceil(words(D) / 230)) + ' min read'; }
async function fnt(t) { const L = t.characters.length; if (L) { for (const f of t.getRangeAllFontNames(0, L)) await figma.loadFontAsync(f); } else if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); }
// O(node, {layerName: text}) -> overrides EVERY TEXT layer with that exact name
async function O(n, map, tag = '') { const idx = {}; for (const t of n.findAll(x => x.type === 'TEXT')) (idx[t.name] = idx[t.name] || []).push(t); for (const [k, v] of Object.entries(map)) { if (v == null) continue; const ts = idx[k] || []; if (!ts.length) { MISS.push(tag + ':' + k); continue; } for (const t of ts) { if (t.characters === String(v)) continue; await fnt(t); t.characters = String(v); } } return n; }
function vis(n, name, on, tag = '') { const xs = n.findAll(x => x.name === name); if (!xs.length) MISS.push(tag + ':vis ' + name); for (const x of xs) x.visible = !!on; }
// ===== END LIB =====
