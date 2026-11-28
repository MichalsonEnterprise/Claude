// ===== ADM-BC LIB v1 (subset for clone pass) =====
const MISS = [];
async function setText(t, v) { try { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = String(v); return true; } catch (e) { MISS.push('txt ' + t.name + ' ' + String(e.message).slice(0, 40)); return false; } }
async function setT(r, nm, v, i = 0) { if (!r || v == null) return null; const t = r.findAll(n => n.type === 'TEXT' && n.name === nm)[i]; if (!t) { MISS.push('T:' + nm); return null; } await setText(t, v); return t; }
const ORDER = { C: ['C1Q', 'C1R', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'], B: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'] };
const BY = { 'C-1440': 160, 'C-1280': 3000, 'B-1440': 6000, 'B-1280': 9000, 'C-768': 12000 };
function POS(band, key) { const [m, w] = band.split('-'); const col = ORDER[m].indexOf(key); return { x: 120 + col * (Number(w) + 120), y: BY[band] }; }
// ===== END ADM-BC LIB =====
