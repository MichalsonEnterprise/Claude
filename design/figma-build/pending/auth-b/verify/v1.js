// Read-only verification of AUTH-08/09 desktop frames built by an earlier run (screenshots + text-overflow audit). Run as use_figma code.
const page = figma.root.children.find(p => p.name === '04 — Authentication'); await figma.setCurrentPageAsync(page);
const ids = ['115:81957','115:83997','115:86045','116:34081','116:35027'];
const out = [];
for (const id of ids) {
  const f = await figma.getNodeByIdAsync(id); if (!f) { out.push({ id, missing: true }); continue; }
  const fb = f.absoluteBoundingBox;
  const vis = n => { for (let p = n; p && p !== f; p = p.parent) if (p.visible === false) return false; return true; };
  const over = f.findAll(n => n.type === 'TEXT' && vis(n) && n.absoluteBoundingBox && (n.absoluteBoundingBox.x + n.absoluteBoundingBox.width > fb.x + fb.width + 0.5 || n.absoluteBoundingBox.y + n.absoluteBoundingBox.height > fb.y + fb.height + 0.5)).map(n => n.characters.slice(0, 30));
  const resend = f.findAll(n => n.type === 'TEXT' && vis(n) && /resend/i.test(n.characters)).map(n => n.characters);
  out.push({ id, name: f.name, h: Math.round(f.height), over, resend });
  await f.screenshot({ scale: 0.45 });
}
return out;
