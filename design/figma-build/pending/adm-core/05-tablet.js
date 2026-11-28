// adm-core #05 — Tablet 768 row: ADM-02 Overview (tablet shell: inline top bar with menu → drawer, no persistent sidebar),
// ADM-01 Sign in (stacked: centred sign-in card, policies below), ADM-X1 Confirm with reason Ready (over ADM-F2's own 768 detail 36:518219). IDEMPOTENT.
//#include _ov.js
//#include _t.js
const made = [];
// 1. ADM-02 overview 768 (column 2 of the tablet row; column 0/1 are kept for the ADM-00 tablet frames of #06)
{ const nm = '[ADM-02] Overview / 768 / Default'; if (EX(nm)) OUT.skipped.push(nm); else { const { f, c } = await tshell(nm, 2, 'SI', 'Overview · S. Iyer, Super Admin'); await ovContent(c, 'T'); made.push(f); } }
// 2. ADM-01 sign in 768 (clone of the 1440 default, re-stacked)
{ const nm = '[ADM-01] Admin login — Sign in / 768 / Default'; if (EX(nm)) OUT.skipped.push(nm); else {
  const f = EX('[ADM-01] Admin login — Sign in / 1440 / Default').clone(); sec.appendChild(f); f.x = XT(3); f.y = YT; f.name = nm; f.resize(768, f.height); f.primaryAxisSizingMode = 'AUTO'; bpMode(f, 'Tablet 768');
  const body = f.findOne(n => n.name === 'Body'); body.layoutMode = 'VERTICAL'; body.primaryAxisSizingMode = 'AUTO'; body.counterAxisAlignItems = 'CENTER'; pad(body, 48, 32, 48, 32); gap(body, 40);
  const L = f.findOne(n => n.name === 'Sign-in panel'); L.layoutSizingVertical = 'HUG'; L.primaryAxisAlignItems = 'MIN'; gap(L, 32); pad(L, 40, 48, 40, 48); stroke(L, 'border/subtle'); radius(L, 20);
  const Rp = f.findOne(n => n.name === 'Policy panel'); Rp.layoutSizingHorizontal = 'FILL'; Rp.layoutSizingVertical = 'HUG'; pad(Rp, 0, 0, 0, 0); gap(Rp, 24);
  const hl = Rp.findOne(n => n.name === 'Headline'); for (const t of hl.findAll(n => n.type === 'TEXT' && n.textAutoResize === 'HEIGHT')) tw(t, 704);
  const grid = Rp.findOne(n => n.name === 'Policies'); grid.resize(704, grid.height); grid.counterAxisSizingMode = 'AUTO';
  for (const cd of grid.children) { cd.resize(344, cd.height); cd.primaryAxisSizingMode = 'AUTO'; for (const t of cd.findAll(n => n.type === 'TEXT' && n.textAutoResize === 'HEIGHT')) tw(t, 304); }
  made.push(f); } }
// 3. ADM-X1 confirm with reason Ready over the 768 withdrawal detail
{ const nm = '[ADM-X1] Four-eyes — Confirm with reason / 768 / Ready'; if (EX(nm)) OUT.skipped.push(nm); else {
  const src = await figma.getNodeByIdAsync('36:518219'); const f = src.clone(); sec.appendChild(f); f.x = XT(4); f.y = YT; f.name = nm;
  const d = await I('25:16172', { State: 'Ready' }); d.name = 'Admin/Confirm With Reason Dialog'; await rep(d, 'Reject flagged withdrawal', 'Release flagged withdrawal'); await swapBtn(d, 'Submit for approval', 'Primary');
  await setT(d, 'Value', 'AML — screening cleared'); await setT(d, 'Value text', 'AML-3317 closed as a false positive on the velocity rule. Destination 0x7c4e…a21D is whitelisted since 14 Oct 2026 and ownership was proven by signature. Release per FIN-2.3.'); await setT(d, 'Counter', '186 / 500');
  for (const n of d.findAll(n => n.type === 'FRAME' && n.width <= 48 && n.height <= 48 && Array.isArray(n.fills) && n.fills[0] && n.fills[0].boundVariables && n.fills[0].boundVariables.color && n.fills[0].boundVariables.color.id === VAR['status/danger-tint'].id)) { n.fills = [paint('brand/tint')]; tint(n, 'icon/brand'); }
  overlay(f, d); made.push(f); } }
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.3 });
return { made: made.map(f => [f.name, f.id, f.x, f.y, f.height]), skipped: OUT.skipped };
