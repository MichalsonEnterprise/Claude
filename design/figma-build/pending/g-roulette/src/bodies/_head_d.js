const page = figma.root.children.find(p => p.name === '08 — Games'); await figma.setCurrentPageAsync(page);
const sec = section('RL Roulette', 0, 0);
const OUT = { section: sec.id, frames: {}, before: sec.children.map(n => n.name.slice(0, 60) + ' #' + n.id + ' ' + Math.round(n.width) + 'x' + Math.round(n.height) + ' @' + Math.round(n.x) + ',' + Math.round(n.y)) };
async function mk(name, X, build, Y) { dropByName(sec, name); const y = Y != null ? Y : colY(sec, X); const R = await build(); R.f.name = name; sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
function has(name) { return sec.children.some(n => n.name === name && n.height > 900); }
