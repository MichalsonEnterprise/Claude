// ===== pub-p1c ART — concrete casino objects as token-bound vectors (no glows / rings / sparkles) =====
// SVG placeholder colours are remapped to variables after import, so every vector paint is token-bound.
const ARTMAP = { '#F1F1F1': 'paper/50', '#BDBDBD': 'paper/300', '#141414': 'ink/900', '#2CD97D': 'brand/primary', '#1B7A4A': 'mint/700', '#E5484D': 'status/danger', '#8A2C2F': 'red/700', '#F4C96C': 'accent/gold', '#E9A044': 'accent/gold-strong' };
const ARTFB = { 'paper/50': 'text/primary', 'paper/300': 'text/tertiary', 'ink/900': 'bg/secondary', 'ink/700': 'text/on-primary', 'mint/700': 'brand/primary-strong', 'red/700': 'status/danger-strong' };
function cv(n) { return VAR[n] ? n : (ARTFB[n] && VAR[ARTFB[n]] ? ARTFB[n] : 'text/on-primary'); }
function __hex(c) { const h = v => Math.round(v * 255).toString(16).padStart(2, '0'); return ('#' + h(c.r) + h(c.g) + h(c.b)).toUpperCase(); }
function __near(hx) { let best = null, bd = 1e9; const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const a = p(hx); for (const k of Object.keys(ARTMAP)) { const b = p(k); const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); if (d < bd) { bd = d; best = k; } } return bd < 24 ? ARTMAP[best] : null; }
function svgArt(svg, name) {
  const f = figma.createNodeFromSvg(svg); f.name = name; f.fills = []; f.clipsContent = false; const miss = new Set();
  const swap = arr => arr.map(p => { if (p.type !== 'SOLID') return p; const k = ARTMAP[__hex(p.color)] || __near(__hex(p.color)); if (!k) { miss.add(__hex(p.color)); return p; } return paint(cv(k)); });
  for (const n of f.findAll(() => true)) {
    if ('fills' in n && Array.isArray(n.fills) && n.fills.length) n.fills = swap(n.fills);
    if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) n.strokes = swap(n.strokes);
  }
  if (miss.size && typeof OUT !== 'undefined') OUT.notes.push(name + ': unmapped colours ' + [...miss].join(','));
  return f;
}
function __die(tx, ty, rot) { const pip = (x, y) => `<circle cx="${x}" cy="${y}" r="17" fill="#141414"/>`; return `<g transform="translate(${tx} ${ty}) rotate(${rot} 90 90)"><rect x="16" y="18" width="180" height="180" rx="34" fill="#BDBDBD"/><rect x="0" y="0" width="180" height="180" rx="34" fill="#F1F1F1"/>${pip(50, 50)}${pip(130, 50)}${pip(50, 130)}${pip(130, 130)}</g>`; }
// 404: "4 · 0 · 4" spelled by two dice and a cracked mint casino chip (+ a broken-off chip fragment)
function art404() {
  let spots = ''; for (let a = 0; a < 360; a += 45) spots += `<rect x="-15" y="-112" width="30" height="40" rx="6" fill="#F1F1F1" transform="rotate(${a})"/>`;
  const svg = `<svg width="640" height="430" viewBox="0 0 640 430" xmlns="http://www.w3.org/2000/svg">${__die(30, 150, -16)}<g transform="translate(330 205)"><circle cx="0" cy="14" r="112" fill="#1B7A4A"/><circle cx="0" cy="0" r="112" fill="#2CD97D"/>${spots}<circle cx="0" cy="0" r="74" fill="#1B7A4A"/><ellipse cx="0" cy="0" rx="28" ry="40" fill="none" stroke="#F1F1F1" stroke-width="16"/><polyline points="-6,-118 10,-72 -12,-38 12,-4 -8,30 10,68 -4,122" fill="none" stroke="#141414" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(430 336) rotate(18)"><polygon points="0,0 34,-6 40,22 8,30" fill="#1B7A4A"/><polygon points="0,-6 34,-12 40,16 8,24" fill="#2CD97D"/></g>${__die(470, 96, 14)}</svg>`;
  return svgArt(svg, 'Art — two dice + cracked chip (404)');
}
// 500: slot machine with a drooping lever, its power cable unplugged from the wall socket
async function art500(reels = false) {
  const svg = `<svg width="620" height="450" viewBox="0 0 620 450" xmlns="http://www.w3.org/2000/svg"><rect x="74" y="34" width="300" height="372" rx="30" fill="#8A2C2F"/><rect x="60" y="24" width="300" height="372" rx="30" fill="#E5484D"/><rect x="88" y="48" width="244" height="60" rx="14" fill="#F1F1F1"/><rect x="108" y="72" width="70" height="12" rx="6" fill="#BDBDBD"/><rect x="242" y="72" width="70" height="12" rx="6" fill="#BDBDBD"/><rect x="200" y="58" width="20" height="28" rx="6" fill="#141414"/><rect x="200" y="90" width="20" height="10" rx="5" fill="#141414"/><rect x="88" y="126" width="244" height="130" rx="16" fill="#141414"/><rect x="100" y="138" width="68" height="106" rx="10" fill="#F1F1F1"/><rect x="176" y="138" width="68" height="106" rx="10" fill="#F1F1F1"/><rect x="252" y="138" width="68" height="106" rx="10" fill="#F1F1F1"/>${reels ? '' : '<rect x="116" y="185" width="36" height="12" rx="6" fill="#BDBDBD"/><rect x="192" y="185" width="36" height="12" rx="6" fill="#BDBDBD"/><rect x="268" y="185" width="36" height="12" rx="6" fill="#BDBDBD"/>'}<rect x="88" y="274" width="244" height="44" rx="12" fill="#141414"/><circle cx="128" cy="296" r="11" fill="#BDBDBD"/><circle cx="168" cy="296" r="11" fill="#BDBDBD"/><circle cx="208" cy="296" r="11" fill="#BDBDBD"/><rect x="244" y="286" width="72" height="20" rx="10" fill="#BDBDBD"/><rect x="108" y="336" width="204" height="40" rx="12" fill="#141414"/><rect x="356" y="222" width="36" height="60" rx="10" fill="#BDBDBD"/><g transform="rotate(34 384 252)"><rect x="376" y="102" width="16" height="152" rx="8" fill="#BDBDBD"/><circle cx="384" cy="96" r="26" fill="#F1F1F1"/></g><path d="M300 396 C 300 436, 396 438, 438 404" fill="none" stroke="#141414" stroke-width="12" stroke-linecap="round"/><rect x="434" y="384" width="56" height="40" rx="10" fill="#BDBDBD"/><rect x="490" y="392" width="24" height="7" rx="3" fill="#BDBDBD"/><rect x="490" y="408" width="24" height="7" rx="3" fill="#BDBDBD"/><rect x="552" y="350" width="72" height="96" rx="14" fill="#F1F1F1"/><rect x="570" y="384" width="9" height="20" rx="3" fill="#141414"/><rect x="596" y="384" width="9" height="20" rx="3" fill="#141414"/></svg>`;
  const f = svgArt(svg, 'Art — unplugged slot machine (500)');
  if (reels) {
    for (const [i, d] of [[0, '5'], [1, '0'], [2, '0']]) { const t = await T(d, 'Display/M', cv('ink/900'), { name: 'Reel ' + (i + 1) + ' — ' + d }); f.appendChild(t); t.textAlignHorizontal = 'CENTER'; t.resize(68, t.height); t.x = 100 + i * 76; t.y = Math.round(138 + (106 - t.height) / 2); }
    const sign = AL('HORIZONTAL', { name: 'Sign — OUT OF ORDER', fill: cv('paper/50'), r: 6, p: [6, 14, 6, 14] }); stroke(sign, 'status/danger', 3); add(sign, await T('OUT OF ORDER', 'Label/L', 'status/danger')); f.appendChild(sign); sign.rotation = 9; sign.x = 116; sign.y = 236;
  }
  return f;
}
// Maintenance: open-end wrench + hex nut (vectors); the ticket stub is built from real text layers (see ticket()).
function artWrench() { return svgArt(`<svg width="160" height="420" viewBox="0 0 160 420" xmlns="http://www.w3.org/2000/svg"><path d="M20 10 L20 70 Q20 110 60 110 L60 400 Q60 418 80 418 Q100 418 100 400 L100 110 Q140 110 140 70 L140 10 L112 10 L112 62 L48 62 L48 10 Z" fill="#BDBDBD"/><circle cx="80" cy="372" r="11" fill="#141414"/></svg>`, 'Art — open-end wrench'); }
function artNut() { return svgArt(`<svg width="120" height="110" viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg"><polygon points="30,4 90,4 118,55 90,106 30,106 2,55" fill="#BDBDBD"/><circle cx="60" cy="55" r="24" fill="#141414"/></svg>`, 'Art — hex nut'); }
// Leaderboard: trophy cup (gold = prize moment)
function artTrophy() { return svgArt(`<svg width="300" height="320" viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg"><path d="M70 40 H32 Q20 40 20 58 Q20 122 84 142" fill="none" stroke="#E9A044" stroke-width="16" stroke-linecap="round"/><path d="M230 40 H268 Q280 40 280 58 Q280 122 216 142" fill="none" stroke="#E9A044" stroke-width="16" stroke-linecap="round"/><path d="M70 20 H230 V110 Q230 190 150 202 Q70 190 70 110 Z" fill="#F4C96C"/><path d="M104 44 Q100 120 140 168" fill="none" stroke="#F1F1F1" stroke-width="10" stroke-linecap="round"/><rect x="130" y="196" width="40" height="50" fill="#E9A044"/><rect x="90" y="240" width="120" height="30" rx="8" fill="#F4C96C"/><rect x="70" y="266" width="160" height="44" rx="10" fill="#141414"/><rect x="104" y="280" width="92" height="16" rx="4" fill="#BDBDBD"/></svg>`, 'Art — trophy cup'); }
// Ticket stub with real text: "Back at 02:30 UTC" + stub "WITHDRAWALS OPEN"
async function ticket(scale = 1) {
  const t = AL('HORIZONTAL', { name: 'Object — maintenance ticket stub', fill: cv('paper/50'), r: 14, clip: true });
  const m = AL('VERTICAL', { name: 'Ticket main', p: [24, 24, 24, 28], gap: 6 });
  add(m, await T('BACK AT', 'Overline', cv('ink/700')), await T('02:30 UTC', 'Heading/H2', 'text/on-primary'), await T('1 DEC 2026', 'Label/M', cv('ink/700')), await T('Notice AN-88', 'Mono/S', cv('ink/700')));
  const perf = AL('VERTICAL', { name: 'Perforation', p: [10, 0, 10, 0], gap: 10, justify: 'CENTER' }); for (let i = 0; i < 9; i++) perf.appendChild(ellipse(8, 8, cv('paper/300'), 'Hole'));
  const s = AL('VERTICAL', { name: 'Ticket stub', p: [24, 24, 24, 20], gap: 4, justify: 'CENTER' });
  add(s, await T('WITHDRAWALS', 'Overline', cv('ink/700')), await T('OPEN', 'Heading/H3', cv('mint/700')));
  add(t, m, perf, s); perf.layoutSizingVertical = 'FILL'; s.layoutSizingVertical = 'FILL';
  if (scale !== 1) t.rescale(scale);
  return t;
}
// ===== end ART =====
