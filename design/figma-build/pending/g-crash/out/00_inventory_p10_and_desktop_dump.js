const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const secs = page.children.filter(n => n.type === 'SECTION').map(s => ({ name: s.name, x: s.x, y: s.y, w: Math.round(s.width), h: Math.round(s.height) }));
const cr = page.children.find(n => n.type === 'SECTION' && n.name === 'Games — Mobile Crash');
const frames = cr ? cr.children.map(c => ({ n: c.name, id: c.id, x: c.x, y: c.y, w: c.width, h: Math.round(c.height) })) : null;
const cfm = page.children.find(n => n.type === 'SECTION' && n.name === 'Games — Mobile Coinflip');
let cfTree = null; if (cfm && cfm.children.length) { const f = cfm.children.find(c => c.name.includes('CF-01')) || cfm.children[0]; cfTree = { n: f.name, id: f.id, h: f.height, kids: f.children.map(c => c.name + (c.children ? '[' + c.children.slice(0, 14).map(k => k.name).join('|') + ']' : '')) }; }
const SKIP = /^(Shell\/|Notice\/Demo|Nav\/|Footer)/;
const seen = new Set();
function texts(root, max) { const res = []; const walk = n => { if (res.length >= max) return; if (n !== root && SKIP.test(n.name)) return; if (n.type === 'TEXT') { const c = n.characters.replace(/\s+/g, ' ').slice(0, 70); if (!seen.has(c) && c.length > 2) { seen.add(c); res.push(c); } return; } if ('children' in n) for (const k of n.children) walk(k); }; walk(root); return res; }
const ids = { cr01: '32:90238', cr02: '33:124526', cr03: '33:156588', cr04w: '33:191216', cr04l: '33:209124', cr05: '33:284530', cr06: '33:311252', cr07: '34:331972', cr08c: '33:227442', cr08i: '33:239177', cr08l: '33:258312', cr08r: '33:259170', notes: '36:527187' };
const dump = {};
for (const [k, id] of Object.entries(ids)) { const f = await figma.getNodeByIdAsync(id); if (!f) { dump[k] = null; continue; } dump[k] = texts(f, k === 'cr01' ? 70 : 34); }
const c1 = await figma.getNodeByIdAsync('32:90238');
const content = c1 && c1.findOne(n => n.name === 'Content');
const tree = content ? content.children.map(c => c.name + ' (' + Math.round(c.width) + 'x' + Math.round(c.height) + ')' + ('children' in c ? ' [' + c.children.slice(0, 10).map(k => k.name + ('children' in k && k.type !== 'INSTANCE' ? '{' + k.children.slice(0, 8).map(z => z.name).join('|') + '}' : '')).join(' ; ') + ']' : '')) : null;
const out = { secs, frames, cfTree, tree, dump };
return out;
