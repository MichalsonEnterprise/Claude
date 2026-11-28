// ===== GP-01 Restricted region at 1280 + 768 (mirrors the verified 1440 Restricted frame) =====
const out = { created: {}, skipped: [], log: [] };
const R = exists('[GP-01] Global Pool Hub / 1440 / Restricted region');
let alertSrc = null, alertIdx = 0, rbInfo = null, ctaSrc = null, riskTxt = null, topState = null;
if (R) {
  const c = fnd(R, 'Content');
  if (c) { alertSrc = c.children.find(n => n.type === 'INSTANCE' && /Alert/.test(n.name)) || null; if (alertSrc) alertIdx = c.children.indexOf(alertSrc); }
  const rbs = R.findAll(n => n.type === 'INSTANCE' && n.name === 'Nav/Region Banner' && !n.id.startsWith('I'));
  if (rbs.length) rbInfo = { parentIsFrame: rbs[0].parent.id === R.id, parentName: rbs[0].parent.name, idx: rbs[0].parent.children.indexOf(rbs[0]) };
  ctaSrc = fnd(R, 'Hero CTA row');
  const rk = R.findOne(n => n.type === 'TEXT' && n.name === 'Risk line'); if (rk) riskTxt = rk.characters;
  const mc = fnd(R, 'Main column'); const tp = mc && mc.children.find(n => n.type === 'INSTANCE'); if (tp && tp.variantProperties) topState = tp.variantProperties.State || null;
}
out.log.push({ src1440: !!R, alert: !!alertSrc, alertIdx, rbInfo, cta: ctaSrc ? ctaSrc.children.length : 0, topState, risk: riskTxt });
const shots = [];
for (const BP of ['L', 'T']) {
  const W = BP === 'L' ? 1280 : 768; const NAME = `[GP-01] Global Pool Hub / ${W} / Restricted region`;
  if (exists(NAME)) { out.skipped.push(NAME); continue; }
  const f = await cloneBelow(HUB[BP], NAME);
  const main = fnd(f, 'Main column');
  // 1) region banner pinned above the top bar (member keeps Member top bar — the 'Restricted region' top bar variant is guest-only)
  if (!rbInfo && topState === 'Restricted region') { main.children[0].setProperties({ State: 'Restricted region' }); }
  else {
    const rb = await I('16:3449', { Breakpoint: BP === 'T' ? 'Tablet' : 'Desktop' });
    if (rbInfo && rbInfo.parentIsFrame) f.insertChild(Math.min(rbInfo.idx, f.children.length), rb); else main.insertChild(0, rb);
    rb.layoutSizingHorizontal = 'FILL';
  }
  // 2) inline regional-restriction alert at the top of the content
  const content = fnd(f, 'Content');
  let al;
  if (alertSrc) al = alertSrc.clone();
  else { al = await I('30:17116', { Type: 'Regional restriction', Layout: 'Inline' }); await st(al, 'Body', 'Global Pool participation and GLOBAL POOL games are not available from your current location (United States). Your 35 entries already in round #1,248 stay in the draw. You can still view rounds, verify draws and withdraw your balance.'); }
  content.insertChild(Math.min(alertIdx, content.children.length), al); al.layoutSizingHorizontal = 'FILL';
  // 3) hero CTAs: participate disabled + where-it-is-available + withdraw (no bypass hints)
  const hero = fnd(content, 'Hero — Jackpot banner'); const H0 = hero.height;
  const cta = fnd(hero, 'Hero CTA row'); for (const c of [...cta.children]) c.remove();
  if (ctaSrc && ctaSrc.children.length) { for (const c of ctaSrc.children) cta.appendChild(c.clone()); }
  else add(cta, await BTN('Gold', 'Not available in your region', { size: 'L', state: 'Disabled', lead: 'lock' }), await BTN('Secondary', 'Restricted countries', { size: 'L', lead: 'globe' }), await BTN('Ghost', 'Withdraw funds', { size: 'L', lead: 'withdraw' }));
  cta.resize(BP === 'T' ? 400 : 560, cta.height); cta.primaryAxisSizingMode = 'FIXED'; cta.layoutWrap = 'WRAP'; bnum(cta, 'counterAxisSpacing', 12); cta.counterAxisSizingMode = 'AUTO';
  // 4) risk line copy
  const risk = hero.findOne(n => n.type === 'TEXT' && n.name === 'Risk line');
  if (risk) { await lf(risk); risk.characters = riskTxt || 'New entries are blocked where Global Pool is not licensed. If your location was detected incorrectly, contact support.'; risk.resize(BP === 'T' ? 340 : 520, risk.height); risk.textAutoResize = 'HEIGHT'; }
  // keep the bottom cropped ticket anchored to the (taller) banner edge
  const dH = hero.height - H0; const tks = hero.children.filter(n => n.name === 'Entry ticket (cropped)'); if (tks[1] && dH) tks[1].y += dH;
  fitSection(sec);
  out.created[NAME] = f.id; shots.push([f, hero]);
}
out.frames = sec.children.map(c => ({ id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
for (const [f, h] of shots) { await h.screenshot({ scale: 0.6 }); await f.screenshot({ scale: 0.3 }); }
// pending visual check of the two 1440 GP-02 error states (modal area only)
for (const id of ['33:310193', '34:325577']) { const f = await figma.getNodeByIdAsync(id); if (!f) continue; const m = f.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Modal/Participation Preview')); await (m || f).screenshot({ scale: m ? 0.7 : 0.3 }); }
return out;
