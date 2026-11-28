// READ-ONLY (no helpers). Page 03: sections near X=70000 + frames in 'PUB-24/25/26 Errors & PUB-06 Leaderboard',
// plus structure checks of library pieces this slice relies on (no mutation).
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const secs = page.children.filter(n => n.type === 'SECTION').map(s => [s.name, Math.round(s.x), Math.round(s.y), Math.round(s.width), Math.round(s.height)].join('|'));
const mine = page.children.find(n => n.type === 'SECTION' && n.name === 'PUB-24/25/26 Errors & PUB-06 Leaderboard');
const frames = mine ? mine.children.map(c => ({ id: c.id, name: c.name, w: Math.round(c.width), h: Math.round(c.height), x: Math.round(c.x), y: Math.round(c.y), sizing: c.primaryAxisSizingMode })) : null;
const vars = (await figma.variables.getLocalVariablesAsync()).map(v => v.name);
const need = ['paper/50', 'paper/300', 'ink/900', 'ink/700', 'mint/700', 'red/700', 'status/danger', 'accent/gold', 'accent/gold-strong', 'brand/primary', 'surface/raised', 'brand/tint', 'accent/gold-tint', 'vip/gold', 'vip/silver', 'vip/bronze', 'text/on-gold', 'text/on-primary', 'border/gold', 'status/warning-tint', 'status/success-tint', 'status/info-tint', 'status/danger-tint', 'scrim/overlay'];
const missingVars = need.filter(n => !vars.includes(n));
const probe = {};
async function kids(id, depth = 1) { const n = await figma.getNodeByIdAsync(id); if (!n) return 'missing'; const c = n.type === 'COMPONENT_SET' ? (n.defaultVariant || n.children[0]) : n; return { type: n.type, name: n.name, w: Math.round(c.width), h: Math.round(c.height), kids: (c.children || []).map(k => k.type + ':' + k.name + '@' + Math.round(k.x) + '/' + Math.round(k.width) + (k.children && depth > 1 ? '[' + k.children.map(j => j.type + ':' + j.name).join(',') + ']' : '')).slice(0, 14) }; }
probe.leaderRow = await kids('31:22665', 2);
probe.segmented3 = await (async () => { const s = await figma.getNodeByIdAsync('20:6978'); const v = s.children.find(c => c.name.includes('Segments=3')); return v ? v.children.map(k => k.type + ':' + k.name) : 'no 3'; })();
probe.breadcrumb2 = await (async () => { const s = await figma.getNodeByIdAsync('14:1145'); const v = s.children.find(c => c.name.includes('Levels=2')); return v ? v.findAll(x => x.type === 'TEXT').map(t => t.name + '=' + t.characters) : 'no 2'; })();
probe.sidebarItems = await (async () => { const s = await figma.getNodeByIdAsync('23:6001'); return s ? s.findAll(x => x.type === 'INSTANCE' && x.name.startsWith('Item/')).map(x => x.name).slice(0, 40) : 'missing'; })();
probe.tileGeneric = await kids('28:16529');
probe.carouselHeader = await kids('23:17672');
return { secs, mine: mine ? mine.id : null, frames, missingVars, probe };
