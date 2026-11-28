// ===== CR-08 390 Insufficient balance — targeted fix + verify CR-05/06/07/08c 390 =====
async function setChars(t, v) { const fonts = t.getStyledTextSegments(['fontName']).map(s => s.fontName); for (const fn of fonts) await figma.loadFontAsync(fn); t.characters = v; }
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('198:77380'); const log = {}; const miss = [];
const al = f.findOne(n => n.name === 'Alert — Not enough balance'); const content = al.parent;
const pane = content.children.find(c => c !== al && 'findAll' in c && c.findAll(t => t.type === 'TEXT' && t.characters === 'Manual').length);
if (pane) { content.insertChild(content.children.indexOf(pane), al); if (content.children.indexOf(al) !== content.children.indexOf(pane) - 1) content.insertChild(content.children.indexOf(pane), al); log.order = content.children.map(c => c.name); } else miss.push('pane');
if (pane) {
  const hint = pane.findAll(t => t.type === 'TEXT' && /^≈ \$10\.00/.test(t.characters))[0];
  if (hint) { let p = hint.parent; while (p && p !== pane && !(p.strokes && p.strokes.length)) p = p.parent; if (p && p !== pane) { p.strokes = [paint('border/danger')]; p.strokeWeight = 1; log.input = p.name; } else miss.push('input box'); } else miss.push('hint');
  const lim = pane.findAll(t => t.type === 'TEXT' && /^Min 0\.10 · Max 1,000\.00/.test(t.characters))[0];
  if (lim) { await setChars(lim, 'Exceeds your available balance (4.20 USDT)'); lim.fills = [paint('text/danger')]; lim.name = 'Error text'; for (const s of lim.parent.children) if (s !== lim && s.type === 'INSTANCE') tint(s, 'status/danger'); log.lim = lim.parent.name; } else miss.push('limit helper');
  const risk = pane.findAll(t => t.type === 'TEXT' && /^You can lose your stake/.test(t.characters))[0];
  if (risk) { await setChars(risk, 'You can lose your stake. Only deposit what you can afford to lose — set a deposit limit in Responsible gaming.'); } else miss.push('risk');
  const btns = pane.findAll(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && /^Button\/(Primary|Gold)/.test(n.mainComponent.parent.name));
  for (const b of btns) { try { b.setProperties({ State: 'Disabled' }); } catch (e) {} } log.paneBtns = btns.length;
}
await f.screenshot({ scale: 0.6 });
for (const id of ['34:446321', '34:480272', '34:492427', '36:511112']) { const n = await figma.getNodeByIdAsync(id); await n.screenshot({ scale: 0.45 }); }
return { id: f.id, h: Math.round(f.height), log, miss };
