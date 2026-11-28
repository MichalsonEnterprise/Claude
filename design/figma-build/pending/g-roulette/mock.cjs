// Minimal mock of the Figma Plugin API to dry-run build scripts (catches typos, bad token/style names, invalid FILL/HUG use).
const fs = require('fs');
const file = process.argv[2];
const code = fs.readFileSync(file, 'utf8');
let idc = 1000;
const COLOR = `ink/950, ink/900, ink/850, ink/800, ink/750, ink/700, ink/600, ink/500, ink/400, ink/300, ink/200, ink/100, ink/50, violet/300, violet/400, violet/500, violet/600, violet/700, violet/800, violet/900, violet/950, gold/200, gold/300, gold/400, gold/500, gold/600, gold/900, green/400, green/500, green/600, green/950, red/400, red/500, red/600, red/950, amber/400, amber/500, amber/950, sky/400, sky/500, sky/950, chain/bnb, chain/polygon, chain/arbitrum, chain/ethereum, chain/solana, token/usdt, paper/0, paper/50, paper/100, paper/200, paper/300, paper/600, paper/800, alpha/white-4, alpha/white-8, alpha/white-12, alpha/white-16, alpha/white-24, alpha/white-64, alpha/black-40, alpha/black-60, alpha/black-80, alpha/violet-8, alpha/violet-16, alpha/violet-24, alpha/violet-40, alpha/gold-10, alpha/gold-20, alpha/gold-32, alpha/green-12, alpha/red-12, alpha/amber-12, alpha/sky-12, alpha/ink-8, alpha/ink-12, bg/base, bg/secondary, surface/default, surface/raised, surface/overlay, surface/hover, surface/pressed, surface/selected, surface/inverse, border/subtle, border/default, border/strong, border/focus, border/brand, border/gold, border/danger, border/success, brand/primary, brand/secondary, brand/primary-strong, brand/primary-hover, brand/primary-pressed, brand/primary-disabled, brand/tint, brand/tint-subtle, accent/gold, accent/gold-strong, accent/gold-soft, accent/gold-tint, accent/gold-tint-strong, status/success, status/success-tint, status/danger, status/danger-strong, status/danger-tint, status/warning, status/warning-tint, status/info, status/info-tint, status/pending, status/pending-tint, balance/available, balance/locked, balance/pending, balance/owed, text/primary, text/secondary, text/tertiary, text/disabled, text/on-primary, text/on-gold, text/on-danger, text/brand, text/gold, text/success, text/danger, text/warning, text/info, icon/default, icon/muted, icon/brand, icon/gold, scrim/overlay, scrim/strong, effect/glow-brand, effect/glow-gold, effect/shadow, effect/hairline, red/700, tier/bronze, tier/silver, tier/platinum, tier/diamond, status/danger-hover, accent/gold-pressed, vip/bronze, vip/silver, vip/gold, vip/platinum, vip/diamond, ink/550, mint/300, mint/400, mint/500, mint/600, mint/700, mint/800, mint/900, mint/950, alpha/mint-8, alpha/mint-16, alpha/mint-24, alpha/mint-40`.split(', ');
const FLOATS = ['space/0', 'space/0-5', 'space/1', 'space/1-5', 'space/2', 'space/3', 'space/4', 'space/5', 'space/6', 'space/7', 'space/8', 'space/10', 'space/12', 'space/14', 'space/16', 'space/20', 'space/24', 'space/32', 'radius/none', 'radius/xs', 'radius/sm', 'radius/md', 'radius/lg', 'radius/xl', 'radius/2xl', 'radius/full'];
const TSN = ['Display/XL', 'Display/L', 'Display/M', 'Heading/H1', 'Heading/H2', 'Heading/H3', 'Heading/H4', 'Heading/H5', 'Body/L', 'Body/M', 'Body/M Strong', 'Body/S', 'Body/S Strong', 'Label/L', 'Label/M', 'Label/S', 'Caption', 'Overline', 'Mono/M', 'Mono/S', 'Number/XL', 'Number/L', 'Number/M', 'Number/S'];
const ESN = ['Elevation/1 — Card', 'Elevation/2 — Raised', 'Elevation/3 — Popover', 'Elevation/4 — Modal', 'Glow/Brand', 'Glow/Gold', 'Inner/Hairline', 'Blur/Glass'];
const TEXTS = ['Label', 'Value text', 'Helper text', 'Description', 'Title', 'Body', 'File name', 'Meta text', 'Prompt text', 'Browse link'];
function node(type, extra = {}) {
  const n = { type, id: String(++idc) + ':1', name: type, children: [], x: 0, y: 0, width: 100, height: 40, fills: [], strokes: [], effects: [], layoutMode: 'NONE', parent: null, rotation: 0, ...extra };
  n.appendChild = function (c) { if (c.parent) c.parent.children = c.parent.children.filter(k => k !== c); c.parent = this; this.children.push(c); };
  n.resize = function (w, h) { if (!(w > 0) || !(h > 0)) throw new Error('resize bad ' + w + 'x' + h + ' on ' + this.name); this.width = w; this.height = h; };
  n.resizeWithoutConstraints = n.resize; n.rescale = function () { };
  n.setBoundVariable = function (p, v) { if (!v) throw new Error('setBoundVariable null var for ' + p); };
  n.setExplicitVariableModeForCollection = function () { };
  n.findAll = function (fn) { const out = []; const walk = m => { for (const c of m.children || []) { if (!fn || fn(c)) out.push(c); walk(c); } }; walk(this); return out; };
  n.screenshot = async function () { return null; };
  n.setTextStyleIdAsync = async function () { }; n.setEffectStyleIdAsync = async function () { }; n.setFillStyleIdAsync = async function () { }; n.setGridStyleIdAsync = async function () { };
  n.getRangeAllFontNames = function () { return [{ family: 'Inter', style: 'Regular' }]; };
  n.getStyledTextSegments = function () { return [{ fontName: { family: 'Inter', style: 'Regular' } }]; }; n.swapComponent = function () { };
  n.setProperties = function () { }; n.getMainComponentAsync = async function () { return { parent: { id: '23:12227' }, name: 'Value=5' }; }; n.detachInstance = function () { return this; }; n.remove = function () { if (this.parent) this.parent.children = this.parent.children.filter(k => k !== this); }; n.findOne = function (fn) { return this.findAll(fn)[0] || null; }; n.insertChild = function (i, c) { this.appendChild(c); }; n.clone = function () { return node(this.type, { name: this.name }); };
  Object.defineProperty(n, 'layoutSizingHorizontal', { set(v) { checkSizing(this, v, 'H'); this._lsh = v; }, get() { return this._lsh || 'FIXED'; } });
  Object.defineProperty(n, 'layoutSizingVertical', { set(v) { checkSizing(this, v, 'V'); this._lsv = v; }, get() { return this._lsv || 'FIXED'; } });
  Object.defineProperty(n, 'layoutPositioning', { set(v) { if (v === 'ABSOLUTE' && (!this.parent || this.parent.layoutMode === 'NONE')) throw new Error('ABSOLUTE needs AL parent: ' + this.name); this._lp = v; }, get() { return this._lp || 'AUTO'; } });
  Object.defineProperty(n, 'characters', { set(v) { if (this.type !== 'TEXT') throw new Error('characters on ' + this.type); this._ch = v; }, get() { return this._ch || ''; } });
  return n;
}
function checkSizing(n, v, ax) {
  if (v === 'FILL') { if (!n.parent || n.parent.layoutMode === 'NONE') throw new Error('FILL on child of non-AL parent: ' + n.name + ' (parent ' + (n.parent && n.parent.name) + ')'); }
  if (v === 'HUG') { if (n.type !== 'TEXT' && n.layoutMode === 'NONE') throw new Error('HUG on non-AL non-text: ' + n.name); }
}
function makeInstance(compName) { const i = node('INSTANCE', { name: compName, layoutMode: 'HORIZONTAL', componentProperties: {} }); for (const t of TEXTS) { const tn = node('TEXT', { name: t }); i.children.push(tn); tn.parent = i; } return i; }
const comps = {};
function getComp(id) { if (!comps[id]) { const set = node('COMPONENT_SET', { name: 'Set ' + id }); const v = node('COMPONENT', { name: 'Variant=X' }); v.createInstance = () => makeInstance('Inst of ' + id); set.children.push(v); set.defaultVariant = v; set.createInstance = () => makeInstance('Inst of ' + id); comps[id] = set; } return comps[id]; }
const pages = ['00 — Cover & Overview', '08 — Games', '10 — Mobile Experience'].map(nm => { const p = node('PAGE', { name: nm }); p.loadAsync = async () => {}; return p; });
const figma = {
  root: { children: pages }, currentPage: pages[0],
  async setCurrentPageAsync(p) { this.currentPage = p; },
  variables: {
    async getLocalVariablesAsync() { return [...COLOR, ...FLOATS].map(n => ({ name: n, id: 'v' + n })); },
    async getLocalVariableCollectionsAsync() { return [{ name: 'Breakpoint', modes: [{ name: 'Desktop 1440', modeId: '1' }, { name: 'Mobile 390', modeId: '2' }] }, { name: 'Color', modes: [{ name: 'Dark', modeId: '3' }] }]; },
    setBoundVariableForPaint(p, f, v) { if (!v) throw new Error('paint var missing'); return { ...p }; },
  },
  async getLocalTextStylesAsync() { return TSN.map(n => ({ name: n, id: 's' + n })); },
  async getLocalEffectStylesAsync() { return ESN.map(n => ({ name: n, id: 'e' + n })); },
  async getLocalPaintStylesAsync() { return ['Gradient/Skeleton','Gradient/Gold Jackpot','Gradient/Brand Glow'].map(n => ({ name: n, id: 'p' + n })); }, async getLocalGridStylesAsync() { return []; },
  async loadFontAsync() { },
  async getNodeByIdAsync(id) { if (id === '4:797' || id === '6:159' || /^4:\d+$/.test(id)) { const c = node('COMPONENT', { name: 'Comp ' + id }); c.createInstance = () => makeInstance('Inst of ' + id); return c; } return getComp(id); },
  createAutoLayout(dir = 'HORIZONTAL') { const f = node('FRAME', { layoutMode: dir }); figma.currentPage.appendChild(f); return f; },
  createFrame() { const f = node('FRAME'); figma.currentPage.appendChild(f); return f; },
  createText() { const t = node('TEXT'); figma.currentPage.appendChild(t); return t; },
  createRectangle() { const r = node('RECTANGLE'); figma.currentPage.appendChild(r); return r; },
  createEllipse() { const r = node('ELLIPSE'); figma.currentPage.appendChild(r); return r; },
  createNodeFromSvg(svg) { const f = node('FRAME', { name: 'svg' }); const v = node('VECTOR'); f.appendChild(v); figma.currentPage.appendChild(f); return f; },
  createSection() { const s = node('SECTION'); figma.currentPage.appendChild(s); return s; },
  mixed: Symbol('mixed'),
};
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
const fn = new AsyncFunction('figma', code);
fn(figma).then(r => { console.log('OK', JSON.stringify(r).slice(0, 200)); }).catch(e => { console.log('ERR', e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e); process.exit(1); });
