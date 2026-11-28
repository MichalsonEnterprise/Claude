// Dry-run mock of the Figma Plugin API (catches typos, bad token/style names, invalid FILL/HUG use, missing awaits on undefined).
const fs = require('fs');
const COLOR = `bg/base bg/secondary surface/default surface/raised surface/overlay surface/hover surface/pressed surface/selected border/subtle border/default border/strong border/focus border/brand border/gold border/danger border/success brand/primary brand/secondary brand/primary-strong brand/tint brand/tint-subtle accent/gold accent/gold-strong accent/gold-soft accent/gold-tint accent/gold-tint-strong status/success status/success-tint status/danger status/danger-tint status/warning status/warning-tint status/info status/info-tint status/pending status/pending-tint text/primary text/secondary text/tertiary text/disabled text/on-primary text/on-gold text/on-danger text/brand text/gold text/success text/danger text/warning text/info icon/default icon/muted icon/brand icon/gold scrim/overlay scrim/strong`.split(' ');
const FLOATS = ['space/0','space/0-5','space/1','space/1-5','space/2','space/3','space/4','space/5','space/6','space/7','space/8','space/10','space/12','space/14','space/16','space/20','space/24','space/32','radius/none','radius/xs','radius/sm','radius/md','radius/lg','radius/xl','radius/2xl','radius/full'];
const TSN = ['Display/XL','Display/L','Display/M','Heading/H1','Heading/H2','Heading/H3','Heading/H4','Heading/H5','Body/L','Body/M','Body/M Strong','Body/S','Body/S Strong','Label/L','Label/M','Label/S','Caption','Overline','Mono/M','Mono/S','Number/XL','Number/L','Number/M','Number/S'];
const ESN = ['Elevation/1 — Card','Elevation/2 — Raised','Elevation/3 — Popover','Elevation/4 — Modal','Glow/Brand','Glow/Gold','Inner/Hairline','Blur/Glass'];
const PSN = ['Gradient/Tile Mint','Gradient/Tile Gold','Gradient/Tile Violet','Gradient/Tile Red','Gradient/Tile Sky','Gradient/Tile Amber','Gradient/Gold Jackpot'];
let idc = 1000, nodes = 0;
function node(type, extra = {}) {
  nodes++;
  const n = { type, id: String(++idc) + ':1', name: type, children: [], x: 0, y: 0, width: 100, height: 40, fills: [], strokes: [], effects: [], layoutMode: 'NONE', parent: null, rotation: 0, visible: true, ...extra };
  n.appendChild = function (c) { if (c.parent) c.parent.children = c.parent.children.filter(k => k !== c); c.parent = this; this.children.push(c); };
  n.remove = function () { if (this.parent) this.parent.children = this.parent.children.filter(k => k !== this); this.parent = null; };
  n.resize = function (w, h) { if (!(w > 0) || !(h > 0)) throw new Error('resize bad ' + w + 'x' + h + ' on ' + this.name); this.width = w; this.height = h; };
  n.resizeWithoutConstraints = n.resize; n.rescale = function (s) { if (!(s > 0)) throw new Error('rescale bad ' + s); this.width *= s; this.height *= s; };
  n.setBoundVariable = function (p, v) { if (!v) throw new Error('setBoundVariable null var for ' + p); };
  n.setExplicitVariableModeForCollection = function () { };
  n.findAll = function (fn) { const out = []; const walk = m => { for (const c of m.children || []) { if (!fn || fn(c)) out.push(c); walk(c); } }; walk(this); return out; };
  n.findOne = function (fn) { return this.findAll(fn)[0] || null; };
  n.screenshot = async function () { return null; };
  n.setTextStyleIdAsync = async function (id) { if (!id) throw new Error('no style id'); }; n.setEffectStyleIdAsync = async function (id) { if (!id) throw new Error('no effect'); }; n.setFillStyleIdAsync = async function (id) { if (!id) throw new Error('no paint style'); }; n.setGridStyleIdAsync = async function () { };
  n.getRangeAllFontNames = function () { return [{ family: 'Inter', style: 'Regular' }]; };
  n.setProperties = function () { };
  n.createInstance = () => makeInstance('Inst of ' + n.name);
  Object.defineProperty(n, 'layoutSizingHorizontal', { set(v) { checkSizing(this, v); this._lsh = v; }, get() { return this._lsh || 'FIXED'; } });
  Object.defineProperty(n, 'layoutSizingVertical', { set(v) { checkSizing(this, v); this._lsv = v; }, get() { return this._lsv || 'FIXED'; } });
  Object.defineProperty(n, 'characters', { set(v) { if (this.type !== 'TEXT') throw new Error('characters on ' + this.type); if (typeof v !== 'string') throw new Error('characters not string'); this._ch = v; }, get() { return this._ch || ''; } });
  return n;
}
function checkSizing(n, v) { if (v === 'FILL' && (!n.parent || n.parent.layoutMode === 'NONE')) throw new Error('FILL on child of non-AL parent: ' + n.name + ' (parent ' + (n.parent && n.parent.name) + ')'); if (v === 'HUG' && n.type !== 'TEXT' && n.layoutMode === 'NONE') throw new Error('HUG on non-AL: ' + n.name); }
function makeInstance(nm) { const i = node('INSTANCE', { name: nm, layoutMode: 'HORIZONTAL' }); i.componentProperties = { 'Label#1': { value: 'x', type: 'TEXT' }, 'State': { value: 'Default' }, 'Collapsed': { value: 'No' }, 'Title#2': { value: 'x' }, 'Art#3': { value: 'x' }, 'Players#4': { value: 'x' }, 'House edge#5': { value: 'x' }, 'Show tag#6': { value: true }, 'Show sort icon#7': { value: true }, 'Show All#8': {}, 'Show arrows#9': {}, 'Show live dot#10': {}, 'Icon#11': {}, 'Rank#12': {}, 'Show leading icon#13': {}, 'Leading icon#14': {}, 'Show trailing icon#15': {}, 'Trailing icon#16': {}, 'Message#17': {} }; for (const t of ['Crumb 1', 'Crumb 2', 'Current page']) { const tn = node('TEXT', { name: t }); i.children.push(tn); tn.parent = i; } return i; }
const comps = {};
function getComp(id) { if (!comps[id]) { const set = node('COMPONENT_SET', { name: 'Set ' + id }); const v = node('COMPONENT', { name: 'Variant=X' }); set.children.push(v); v.parent = set; set.defaultVariant = v; comps[id] = set; } return comps[id]; }
const pages = ['00 — Cover', '02 — Components', '03 — Public Website', '10 — Mobile Experience'].map(nm => node('PAGE', { name: nm }));
const figma = {
  root: { children: pages }, currentPage: pages[0], mixed: Symbol('mixed'),
  async setCurrentPageAsync(p) { if (!p) throw new Error('page undefined'); this.currentPage = p; },
  variables: { async getLocalVariablesAsync() { return [...COLOR, ...FLOATS].map(n => ({ name: n, id: 'v' + n })); }, async getLocalVariableCollectionsAsync() { return [{ name: 'Breakpoint', modes: [{ name: 'Desktop 1440', modeId: '1' }, { name: 'Mobile 390', modeId: '2' }] }, { name: 'Color', modes: [{ name: 'Dark', modeId: '3' }] }]; }, setBoundVariableForPaint(p, f, v) { if (!v) throw new Error('paint var missing'); return { ...p }; } },
  async getLocalTextStylesAsync() { return TSN.map(n => ({ name: n, id: 's' + n })); },
  async getLocalEffectStylesAsync() { return ESN.map(n => ({ name: n, id: 'e' + n })); },
  async getLocalPaintStylesAsync() { return PSN.map(n => ({ name: n, id: 'p' + n })); }, async getLocalGridStylesAsync() { return []; },
  async loadFontAsync() { },
  async getNodeByIdAsync(id) { if (/^4:\d+$/.test(id) || /^(24|25|27):1[0-9]{4}$/.test(id) && !['25:15363', '24:14917', '24:14951', '24:14880', '25:17535'].includes(id) || id === '6:159') { const c = node('COMPONENT', { name: 'Comp ' + id }); return c; } return getComp(id); },
  createAutoLayout(dir = 'HORIZONTAL') { const f = node('FRAME', { layoutMode: dir }); figma.currentPage.appendChild(f); return f; },
  createFrame() { const f = node('FRAME'); figma.currentPage.appendChild(f); return f; },
  createComponent() { const f = node('COMPONENT'); figma.currentPage.appendChild(f); return f; },
  combineAsVariants(cs, parent) { const s = node('COMPONENT_SET'); parent.appendChild(s); for (const c of cs) s.appendChild(c); s.defaultVariant = cs[0]; return s; },
  createText() { const t = node('TEXT'); figma.currentPage.appendChild(t); return t; },
  createRectangle() { const r = node('RECTANGLE'); figma.currentPage.appendChild(r); return r; },
  createEllipse() { const r = node('ELLIPSE'); figma.currentPage.appendChild(r); return r; },
  createSection() { const s = node('SECTION'); figma.currentPage.appendChild(s); return s; },
};
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
(async () => { for (const f of process.argv.slice(2)) { nodes = 0; const code = fs.readFileSync(f, 'utf8'); try { const r = await new AsyncFunction('figma', code)(figma); console.log('OK', f, nodes + ' nodes', JSON.stringify(r).slice(0, 400)); } catch (e) { console.log('ERR', f, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); } } })();
