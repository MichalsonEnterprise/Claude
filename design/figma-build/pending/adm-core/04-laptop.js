// adm-core #04 — Laptop 1280 row: ADM-00 Approvals inbox (clone of 36:522948), ADM-01 Sign in (clone, policy grid re-flowed),
// ADM-02 Overview (rebuilt for a 976 px column: KPI values Number/M, queues 2-up, services/network/audit full width),
// ADM-X1 Confirm with reason Ready (over ADM-F2's own 1280 detail 34:468177). IDEMPOTENT. Requires #01a, #01b, #02.
//#include _ov.js
let bandL = sec.children.find(n => n.name === 'Band — Laptop 1280');
if (!bandL) { bandL = AL('VERTICAL', { name: 'Band — Laptop 1280', gap: 8 }); add(bandL, await T('Laptop 1280 · ADM-00 / ADM-01 / ADM-02 / ADM-X1', 'Heading/H2'), await T('Same shell with a 976 px content column: KPI values step down to Number/M, side-by-side panels re-flow into full-width rows, dialogs keep their desktop size. Wide texts are re-wrapped, never clipped.', 'Body/L', 'text/secondary', { w: 1400 })); sec.appendChild(bandL); bandL.x = 120; bandL.y = nextY(sec); }
const YL = bandL.y + 120; const XL = i => 120 + i * 1400;
const made = [];
function prep(src, name, i) { const f = src.clone(); sec.appendChild(f); f.x = XL(i); f.y = YL; f.name = name; f.resize(1280, f.height); f.primaryAxisSizingMode = 'AUTO'; bpMode(f, 'Laptop 1280'); return f; }
// 1. ADM-00 inbox
{ const nm = '[ADM-00] Admin shell — Approvals inbox / 1280 / Default'; if (EX(nm)) OUT.skipped.push(nm); else {
  const f = prep(await figma.getNodeByIdAsync('36:522948'), nm, 0); const c = f.findOne(n => n.name === 'Content');
  for (const t of c.findAll(n => n.type === 'TEXT' && n.textAutoResize === 'HEIGHT' && n.width > 520)) tw(t, 520);
  made.push(f); } }
// 2. ADM-01 sign in
{ const nm = '[ADM-01] Admin login — Sign in / 1280 / Default'; if (EX(nm)) OUT.skipped.push(nm); else {
  const f = prep(EX('[ADM-01] Admin login — Sign in / 1440 / Default'), nm, 1);
  const Rp = f.findOne(n => n.name === 'Policy panel'); pad(Rp, 48, 48, 48, 48);
  const hl = Rp.findOne(n => n.name === 'Headline'); for (const t of hl.findAll(n => n.type === 'TEXT' && n.textAutoResize === 'HEIGHT')) tw(t, 600);
  const grid = Rp.findOne(n => n.name === 'Policies'); grid.resize(608, grid.height); grid.counterAxisSizingMode = 'AUTO';
  for (const cd of grid.children) { cd.resize(296, cd.height); cd.primaryAxisSizingMode = 'AUTO'; for (const t of cd.findAll(n => n.type === 'TEXT' && n.textAutoResize === 'HEIGHT')) tw(t, 256); }
  made.push(f); } }
// 3. ADM-02 overview (rebuilt)
{ const nm = '[ADM-02] Overview / 1280 / Default'; if (EX(nm)) OUT.skipped.push(nm); else {
  const { f, sb, tb, c } = await shell(nm, 1280, XL(2), YL);
  for (const it of sb.findAll(n => n.type === 'INSTANCE' && /^(Group|Item) — /.test(n.name))) { const lbl = it.name.split(' — ')[1]; if (it.name.startsWith('Item')) { it.visible = false; continue; } it.setProperties({ State: lbl === 'Overview' ? 'Active' : 'Default' }); if (lbl === 'Overview') { const ch = it.findOne(n => n.name === 'Chevron'); if (ch) ch.visible = false; } }
  await who(sb, tb, 'SI', 'S. Iyer', 'Super Admin', '10 of 10 modules');
  await ovContent(c, 'L'); made.push(f); } }
// 4. ADM-X1 confirm with reason (Ready) over the 1280 withdrawal detail
{ const nm = '[ADM-X1] Four-eyes — Confirm with reason / 1280 / Ready'; if (EX(nm)) OUT.skipped.push(nm); else {
  const src = await figma.getNodeByIdAsync('34:468177'); const f = src.clone(); sec.appendChild(f); f.x = XL(3); f.y = YL; f.name = nm;
  const d = await I('25:16172', { State: 'Ready' }); d.name = 'Admin/Confirm With Reason Dialog'; await rep(d, 'Reject flagged withdrawal', 'Release flagged withdrawal'); await swapBtn(d, 'Submit for approval', 'Primary');
  await setT(d, 'Value', 'AML — screening cleared'); await setT(d, 'Value text', 'AML-3317 closed as a false positive on the velocity rule. Destination 0x7c4e…a21D is whitelisted since 14 Oct 2026 and ownership was proven by signature. Release per FIN-2.3.'); await setT(d, 'Counter', '186 / 500');
  overlay(f, d); made.push(f); } }
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.3 });
return { made: made.map(f => [f.name, f.id, f.x, f.y, f.height]), skipped: OUT.skipped };
