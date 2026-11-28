// ===== GP-01 No active round at 1280 + 768 (between #1,248 settle and #1,249 open) =====
const out = { created: {}, skipped: [], log: [] };
async function nextHero(content, idx, cw, BP) {
  const TB = BP === 'T'; const P = TB ? 28 : 40;
  const h = AL(TB ? 'VERTICAL' : 'HORIZONTAL', { name: 'Hero — Next round banner', p: P, gap: TB ? 24 : 32, fill: 'surface/default', stroke: 'border/subtle', r: 20, clip: true, align: TB ? 'MIN' : 'CENTER' });
  content.insertChild(idx, h); h.layoutSizingHorizontal = 'FILL';
  const left = AL('VERTICAL', { name: 'Next round', gap: 20 }); if (TB) add(h, left); else add(h, [left, 'FILL']);
  const tw = TB ? 400 : undefined;
  add(left, row([await T('NEXT ROUND · #1,249', 'Overline', 'text/tertiary'), await DEMO('S')], { gap: 8 }));
  const hl = await T('Next round opens 28 Nov 2026, 08:00 UTC', TB ? 'Heading/H2' : 'Heading/H1', 'text/primary', { w: tw || 480, name: 'Headline' }); add(left, hl); if (!TB) hl.layoutSizingHorizontal = 'FILL';
  const sm = await T('Round #1,248 settled at 20:02:10 UTC — 13 winning entries shared the 186,400.00 USDT pool and prizes are in winners’ Owed balances. Entries for #1,249 open at 08:00 UTC; nothing can be bought before then.', 'Body/M', 'text/secondary', { w: tw || 480, name: 'Summary' }); add(left, sm); if (!TB) sm.layoutSizingHorizontal = 'FILL';
  const cta = row([await BTN('Secondary', 'Remind me at 08:00 UTC', { size: 'L', lead: 'bell' }), await BTN('Ghost', 'See round #1,248 results', { size: 'L', trail: 'arrow-right' })], { name: 'Hero CTA row', gap: 12 });
  add(left, cta); cta.resize(TB ? 400 : 480, cta.height); cta.primaryAxisSizingMode = 'FIXED'; cta.layoutWrap = 'WRAP'; bnum(cta, 'counterAxisSpacing', 12); cta.counterAxisSizingMode = 'AUTO'; if (!TB) cta.layoutSizingHorizontal = 'FILL';
  add(left, row([await I('6:159'), await T('Reminders stay off until you turn them on: one notification when the round opens, no marketing.', 'Caption', 'text/tertiary', { w: TB ? 340 : 420, name: 'Risk line' })], { name: 'Hero helper', gap: 8, align: 'MIN' }));
  add(left, await I('6:158', { Variant: 'Compact' }));
  const dc = await I('24:13861', { State: 'Next round' }); add(h, dc);
  const H = h.height, L = 2.6 * H;
  if (TB) { absAdd(h, rect(300, L, 'accent/gold-tint-strong', 0, 'Angled block / gold'), cw - 50, -60, -10, 0); absAdd(h, rect(26, L, 'brand/primary', 0, 'Angled block / mint'), cw - 108, -60, -10, 1); }
  else { absAdd(h, rect(300, L, 'accent/gold-tint-strong', 0, 'Angled block / gold'), cw - 150, -60, -20, 0); absAdd(h, rect(26, L, 'brand/primary', 0, 'Angled block / mint'), cw - 208, -60, -20, 1); }
  return h;
}
async function nextCard() {
  const nx = card('What happens next', { gap: 16, p: 24 });
  add(nx, row([await IC('calendar', 20, 'icon/brand'), await T('What happens next', 'Heading/H5', 'text/primary'), await DEMO('XS')], { gap: 8 }));
  const S = [['28 Nov 2026, 08:00 UTC', 'Round #1,249 opens', 'Entry 10.00 USDT + 0.05 USDT platform fee per entry, paid from your platform balance.'], ['28 Nov 2026, 20:00:00 UTC', 'Round #1,249 closes', 'If both minimums are met, Chainlink VRF picks 13 winning entries. If not, every entry is refunded.'], ['Any time', 'Claim your owed refund', '300.00 USDT from cancelled round #1,245 is in your Owed balance.']];
  for (const [t1, t2, t3] of S) { const it = AL('VERTICAL', { name: 'Next step', gap: 4, p: 16, fill: 'surface/raised', r: 10 }); add(nx, [it, 'FILL']); add(it, await T(t1, 'Overline', 'text/brand')); await wrapT(it, t2, 'Label/L', 'text/primary', 360); await wrapT(it, t3, 'Body/S', 'text/secondary', 360); }
  add(nx, await BTN('Secondary', 'Claim in Wallet', { size: 'S', lead: 'wallet' }));
  return nx;
}
async function verifyCard() {
  const c = card('Verify this draw', { gap: 12, p: 20 });
  add(c, row([await IC('shield-check', 20, 'icon/brand'), await DEMO('XS')], { gap: 8 }));
  await wrapT(c, 'Check this draw yourself', 'Label/L', 'text/primary', 200);
  await wrapT(c, 'Chainlink VRF request 0x9f2c…e71a was fulfilled at 20:00:41 UTC after 3 confirmations and settled at 20:02:10 UTC. Re-run the winner selection from the random word and the entry snapshot — no account needed.', 'Body/S', 'text/secondary', 200);
  add(c, await BTN('Secondary', 'Verify round #1,248', { size: 'S', lead: 'shield-check' }));
  return c;
}
async function winCard() { const w = await I('23:16334', { State: 'Public winner' }); for (const t of w.findAll(n => n.type === 'TEXT' && n.characters.includes('@lumen.eth'))) { await lf(t); t.characters = t.characters.replace(/@lumen\.eth/g, '@orbit_77'); } return w; }
async function common(f) {
  const gp = fnd(f, 'Item/Global Pool'); const lb = gp && gp.findOne(n => n.name === 'Badge'); if (lb) lb.visible = false;
  const ph = fnd(f, 'Page header'); const title = ph && fnd(ph, 'Title'); const badge = title && title.findOne(n => n.type === 'INSTANCE' && n.name === 'Badge/Status'); if (badge) { try { badge.setProperties({ Status: 'Neutral' }); } catch (e) { out.log.push('badge: ' + e.message); } await st(badge, 'Label', 'Between rounds'); }
  const me = fnd(f, 'My entries');
  if (me) { await st(me, 'ME sub', 'entries · not selected'); await st(me, 'ME locked', '0.00 USDT locked — released'); await st(me, 'ME fees', '351.75 USDT spent (350.00 + 1.75 fees)'); }
}
const shots = [];
for (const BP of ['L', 'T']) {
  const W = BP === 'L' ? 1280 : 768; const NAME = `[GP-01] Global Pool Hub / ${W} / No active round`;
  if (exists(NAME)) { out.skipped.push(NAME); continue; }
  const f = await cloneBelow(HUB[BP], NAME); const cw = CW[BP];
  await common(f);
  const content = fnd(f, 'Content');
  const oldHero = fnd(content, 'Hero — Jackpot banner'); const hi = content.children.indexOf(oldHero); oldHero.remove();
  const h = await nextHero(content, hi, cw, BP);
  const feed = fnd(content, 'Recent entries feed'); if (feed) feed.remove();
  const log = { BP };
  if (BP === 'L') {
    const rh = content.children.find(n => n.type === 'INSTANCE' && n.name === 'Jackpot/Round Header') || content.children.find(n => n.type === 'INSTANCE' && n.variantProperties && n.variantProperties.Status === 'Open'); if (rh) { try { rh.setProperties({ Status: 'Settled' }); } catch (e) { out.log.push('rh: ' + e.message); } } log.rh = !!rh;
    const r1 = fnd(content, 'My entries & threshold');
    if (r1) { r1.name = 'My entries & result'; const th = r1.children.find(n => n.type === 'INSTANCE'); if (th) th.remove(); const w = await winCard(); add(r1, w); log.r1 = true; }
    const r2 = fnd(content, 'Prizes & VRF');
    if (r2) { r2.name = 'Prizes & next steps'; const vx = r2.children[1]; if (vx) vx.remove(); const nx = await nextCard(); add(r2, [nx, 'FILL']); nx.layoutSizingVertical = 'FILL'; log.r2 = true; }
    const od = fnd(content, 'Your odds');
    const pr = AL('HORIZONTAL', { name: 'Draw proof', gap: 16 }); content.insertChild(od ? content.children.indexOf(od) : content.children.length - 2, pr); pr.layoutSizingHorizontal = 'FILL'; if (od) od.remove();
    const vrf = await I('23:11967', { Step: 'Settled' }); add(pr, vrf); const vc = await verifyCard(); add(pr, [vc, 'FILL']); vc.layoutSizingVertical = 'FILL'; log.odds = !!od;
  } else {
    const r1 = fnd(content, 'Round & my entries');
    if (r1) { const rc = r1.children.find(n => n.type === 'INSTANCE'); if (rc) { try { rc.setProperties({ Status: 'Settled' }); } catch (e) { out.log.push('rc: ' + e.message); } for (const [k, v] of [['Round', 'Round #1,248'], ['Handle', '@orbit_77'], ['Prize', '93,200.00 USDT']]) await st(rc, k, v); await st(rc, 'Value', '186,400.00', 0); await st(rc, 'Value', '3,412', 1); await st(rc, 'Value', '18,640', 2); await st(rc, 'Value', '27 Nov 2026, 20:02 UTC', 3); } log.r1 = !!rc; }
    const r2 = fnd(content, 'Threshold & odds');
    if (r2) { r2.name = 'Result & proof'; for (const c of [...r2.children]) c.remove(); const w = await winCard(); add(r2, w); const vc = await verifyCard(); add(r2, [vc, 'FILL']); vc.layoutSizingVertical = 'FILL'; log.r2 = true; }
    const vx = fnd(content, 'VRF explainer — How the winner is drawn'); const vi = vx ? content.children.indexOf(vx) : -1; if (vx) vx.remove();
    const nx = await nextCard(); const r3 = fnd(content, 'Prizes & money flow'); content.insertChild(vi >= 0 ? vi : (r3 ? content.children.indexOf(r3) + 1 : 6), nx); nx.layoutSizingHorizontal = 'FILL'; log.vx = !!vx;
  }
  out.log.push(log);
  fitSection(sec);
  out.created[NAME] = f.id; shots.push([f, h]);
}
// consistency: round #1,248 1st prize = @orbit_77 (as on GP-07) — patch the 1440 No-round winner card too
const N1440 = exists('[GP-01] Global Pool Hub / 1440 / No active round');
if (N1440) for (const t of N1440.findAll(n => n.type === 'TEXT' && n.characters.includes('@lumen.eth'))) { await lf(t); t.characters = t.characters.replace(/@lumen\.eth/g, '@orbit_77'); out.log.push('1440 handle fixed'); }
fitSection(sec);
out.frames = sec.children.map(c => ({ id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
for (const [f, h] of shots) { await h.screenshot({ scale: 0.6 }); await f.screenshot({ scale: 0.3 }); }
{ const lr = await figma.getNodeByIdAsync('34:325577'); const m = lr && lr.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Modal/Participation Preview')); if (m) await m.screenshot({ scale: 0.6 }); }
return out;
