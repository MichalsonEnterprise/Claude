const page = figma.root.children.find(p => p.name === '08 — Games');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'CF Coinflip');
const out = [];
for (const f of sec.children) {
  // structural sanity: count texts that overflow their parent frame horizontally, and empty frames
  const texts = f.findAllWithCriteria({ types: ['TEXT'] });
  let placeholders = 0; for (const t of texts) { if (/^(Title|Heading|Label|Button|Text)$/.test(t.characters)) placeholders++; }
  const demo = f.findAll(n => n.type === 'INSTANCE' && n.name.toLowerCase().includes('demo')).length;
  out.push({ id: f.id, name: f.name.slice(0, 70), w: Math.round(f.width), h: Math.round(f.height), texts: texts.length, placeholders, demo });
}
for (const f of sec.children) await f.screenshot({ scale: 0.28 });
return out;
