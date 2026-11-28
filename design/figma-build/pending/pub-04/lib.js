// ===== PUB-04 LIB (agent pub-04 game details) =====
figma.skipInvisibleInstanceChildren = false; // REQUIRED: the MCP runtime skips hidden instance children by default, so layers hidden in the main (art groups, gold CTAs, rule 7, payout DEMO) could not be found/un-hidden
const MISS = [];
async function fnt(t) { const L = t.characters.length; if (L) { for (const f of t.getRangeAllFontNames(0, L)) await figma.loadFontAsync(f); } else if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); }
// O(node, {layerName: text}) -> overrides the first TEXT layer with that exact name (logs misses)
async function O(n, map, tag = '') { const idx = {}; for (const t of n.findAll(x => x.type === 'TEXT')) (idx[t.name] = idx[t.name] || []).push(t); for (const [k, v] of Object.entries(map)) { if (v == null) continue; const t = (idx[k] || [])[0]; if (!t) { MISS.push(tag + ':' + k); continue; } if (t.characters === String(v)) continue; await fnt(t); t.characters = String(v); } return n; }
function nest(n, name) { return n.findOne(x => x.type === 'INSTANCE' && x.name === name); }
function setP(inst, props, tag = '') { if (!inst) { MISS.push('nest:' + tag); return; } try { const cp = inst.componentProperties; const set = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(cp).find(x => x.split('#')[0] === k); if (key) set[key] = v; else MISS.push(tag + ':prop ' + k); } if (Object.keys(set).length) inst.setProperties(set); } catch (e) { MISS.push(tag + ':' + String(e.message || e).slice(0, 90)); } }
async function navActive(sb, label) { let hit = false; for (const it of sb.findAll(x => x.type === 'INSTANCE')) { let cp; try { cp = it.componentProperties; } catch (e) { continue; } if (!cp || !cp.State || !cp.Collapsed) continue; const lk = Object.keys(cp).find(k => k.split('#')[0] === 'Label'); const lab = lk ? cp[lk].value : ''; const isA = cp.State.value === 'Active'; try { if (lab === label) { hit = true; if (!isA) it.setProperties({ State: 'Active' }); } else if (isA) it.setProperties({ State: 'Default' }); } catch (e) { MISS.push('nav:' + lab); } } if (!hit) MISS.push('nav-miss:' + label); }
async function tx(name, chars, style, color, o = {}) { const t = await T(chars, style, color, o); t.name = name; return t; }
// AX = AL() but keeps the axis that was not given a size on HUG (helpers' resize() resets both axes to FIXED)
function AX(dir, o = {}) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'VERTICAL') f.counterAxisSizingMode = 'AUTO'; else f.primaryAxisSizingMode = 'AUTO'; } return f; }
function row(name, o = {}) { return AX('HORIZONTAL', Object.assign({ name, gap: 12, align: 'CENTER' }, o)); }
function col(name, o = {}) { return AX('VERTICAL', Object.assign({ name, gap: 8 }, o)); }
function card(name, o = {}) { return AX('VERTICAL', { name, p: o.p ?? 24, gap: o.gap ?? 16, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14 }); }
// Tile/Game Art component ids (registry-catalog.json _art)
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Orbit Rush Duel': '24:13206', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Fortune Ring': '24:13399', 'Pool Dice': '24:13443', 'Double Side': '24:13473', 'High Card': '24:13496', 'Ascend': '24:13528', 'Pool Keno': '24:13564', 'Pool Roulette': '25:14777', 'Twenty-One': '25:14841', 'Baccarat Lounge': '25:14875', 'Sic Bo Triad': '25:14922', 'Dragon & Phoenix': '25:14961', 'Live Pool Roulette': '27:15060', 'Speed Twenty-One': '27:15096', 'Keno Express 20/80': '27:15267', 'Daily Draw 6/45': '27:15370', 'Bingo 90 Classic': '27:15495' };
const GAMES6 = ['Global Pool', 'Pool Roulette', 'Orbit Rush', 'Pool Dice', 'Double Side', 'Twenty-One'];
const TPL_NAME = 'Template/Game Details';
// ===== END PUB-04 LIB =====
