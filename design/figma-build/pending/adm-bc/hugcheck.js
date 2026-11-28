// every screen frame must hug its content: re-assert AUTO height and report frames whose content ran past the frame bottom
const HUG = []; for (const f of sec.children.filter(n => n.type === 'FRAME' && /^\[ADM-[BC]\d/.test(n.name))) { const b = Math.max(...f.children.filter(k => k.visible).map(k => k.y + k.height)); if (b > f.height + 1 || f.primaryAxisSizingMode !== 'AUTO') { f.primaryAxisSizingMode = 'AUTO'; HUG.push([f.name.slice(0, 28), Math.round(f.height), Math.round(b)]); } }
fitSection(sec); __R.push({ hugFixed: HUG });
