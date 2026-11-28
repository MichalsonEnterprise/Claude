// adm-core #06 — ADM-00 at Tablet 768 (row of #05): the shell's tablet behaviour shown over the 768 Overview —
// col 0 Navigation drawer open (Nav/Admin Sidebar as a drawer over the scrim), col 1 Command palette (Nav/Command Palette, 640 px),
// col 5 No permission (Support L2 R. Duarte opens a Finance link; content cloned from the 1440 frame 39:50316). IDEMPOTENT. Requires #05.
//#include _ov.js
//#include _t.js
const made = [];
const base = EX('[ADM-02] Overview / 768 / Default'); if (!base) throw new Error('Run 05-tablet first');
function viewport(name, i) { const f = base.clone(); sec.appendChild(f); f.x = XT(i); f.y = YT; f.name = name; f.primaryAxisSizingMode = 'FIXED'; f.resize(768, 1024); f.clipsContent = true;
  const s = rect(768, 988, 'scrim/overlay', 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 36; return f; }
// 1. drawer
{ const nm = '[ADM-00] Admin shell — Navigation drawer / 768 / Open'; if (EX(nm)) OUT.skipped.push(nm); else {
  const f = viewport(nm, 0);
  const sb = await I('22:5501'); sb.name = 'Nav/Admin Sidebar — drawer';
  for (const it of sb.findAll(n => n.type === 'INSTANCE' && /^(Group|Item) — /.test(n.name))) { const lbl = it.name.split(' — ')[1]; if (it.name.startsWith('Item')) { it.visible = false; continue; } it.setProperties({ State: lbl === 'Overview' ? 'Active' : 'Default' }); if (lbl === 'Overview') { const ch = it.findOne(n => n.name === 'Chevron'); if (ch) ch.visible = false; } }
  await setT(sb, 'Initials', 'SI'); await setT(sb, 'A. Marin', 'S. Iyer'); await setT(sb, 'Finance Lead', 'Super Admin'); await setT(sb, '8 of 10 modules', '10 of 10 modules');
  for (const t of sb.findAll(n => n.type === 'TEXT' && n.characters.startsWith('2FA session'))) { await figma.loadFontAsync(t.fontName); t.characters = '2FA session · until 19:30 UTC'; }
  f.appendChild(sb); sb.layoutPositioning = 'ABSOLUTE'; sb.x = 0; sb.y = 36; try { sb.resize(sb.width, 988); } catch (e) {} await fx(sb, 'Elevation/4 — Modal');
  const cl = await I('7:774', { Type: 'Secondary', Size: 'M', State: 'Default' }, { Icon: ICONS.x }); cl.name = 'Close drawer'; f.appendChild(cl); cl.layoutPositioning = 'ABSOLUTE'; cl.x = sb.width + 12; cl.y = 48;
  const hint = row({ name: 'Drawer note', gap: 8, p: [10, 12], fill: 'surface/overlay', stroke: 'border/subtle', r: 10, align: 'MIN' }); add(hint, await IC('info', 16, 'icon/muted'), await T('Below 1280 px the sidebar opens as a drawer from the menu button. Esc, the close button or a tap on the page closes it; focus returns to the menu button.', 'Caption', 'text/secondary', { w: 360 }));
  f.appendChild(hint); hint.layoutPositioning = 'ABSOLUTE'; hint.x = sb.width + 12; hint.y = 1024 - hint.height - 24;
  made.push(f); } }
// 2. command palette
{ const nm = '[ADM-00] Admin shell — Command palette / 768 / Results'; if (EX(nm)) OUT.skipped.push(nm); else {
  const f = viewport(nm, 1);
  const pal = await I('22:6663', { State: 'Results' }); pal.name = 'Nav/Command Palette'; f.appendChild(pal); pal.layoutPositioning = 'ABSOLUTE'; pal.x = Math.round((768 - pal.width) / 2); pal.y = 104;
  made.push(f); } }
// 3. no permission (Support role)
{ const nm = '[ADM-00] Admin shell — No permission / 768 / Support role opens Finance link'; if (EX(nm)) OUT.skipped.push(nm); else {
  const { f, c } = await tshell(nm, 5, 'RD', 'Support L2 · R. Duarte');
  const src = await figma.getNodeByIdAsync('39:50316'); const sc = src && src.findOne(n => n.name === 'Content');
  if (sc) { const cc = sc.clone(); c.remove(); add(f, [cc, 'FILL']); pad(cc, 24, 32, 48, 32);
    for (const t of cc.findAll(n => n.type === 'TEXT' && n.textAutoResize === 'HEIGHT' && n.width > 640)) tw(t, 640);
    for (const fr of cc.findAll(n => n.type === 'FRAME' && n.layoutMode !== 'NONE' && n.width > 704 && n.layoutSizingHorizontal === 'FIXED')) { try { fr.layoutSizingHorizontal = 'FILL'; } catch (e) {} }
    for (const r of cc.findAll(n => n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL' && n.width > 704)) { r.layoutWrap = 'WRAP'; } }
  made.push(f); } }
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.35 });
return { made: made.map(f => [f.name, f.id, f.x, f.y, f.height]), skipped: OUT.skipped };
