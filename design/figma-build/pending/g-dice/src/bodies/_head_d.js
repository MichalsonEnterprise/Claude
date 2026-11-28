const page = figma.root.children.find(p => p.name === '08 — Games'); await figma.setCurrentPageAsync(page);
const sec = section('DI Dice & GM-01', 32000, 0);
const OUT = { section: sec.id, frames: {} };
async function place(R, X, name) { sec.appendChild(R.f); R.f.x = X; R.f.y = colY(sec, X) === 120 && sec.children.length === 1 ? 120 : R.f.y; return R.f; }
async function mk(name, X, build) { dropByName(sec, name); const y = colY(sec, X); const R = await build(); sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
