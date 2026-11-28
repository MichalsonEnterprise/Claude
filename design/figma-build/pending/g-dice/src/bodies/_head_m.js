const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('Games — Mobile Dice', 196000, 0);
const OUT = { section: sec.id, frames: {} };
async function mk(name, X, build, Y) { dropByName(sec, name); const y = Y != null ? Y : colY(sec, X); const R = await build(); R.f.name = name; sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
const LAST = [['61.08', 1], ['18.77', 0], ['44.02', 0], ['9.15', 1], ['70.44', 1], ['52.86', 0]];
