// ===== WAL-WB mobile shell (page 10) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('WAL — Mobile D (Withdraw 6–9)', 154000, 0);
const MX = [120, 630, 1140, 1650, 2160];
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2) { m = Math.max(m, c.y + c.height); any = true; } return any ? m + 160 : 120; }
function clean(names) { for (const c of [...sec.children]) if (names.includes(c.name)) c.remove(); }
function setStepM(s, n, label, next, err) { const t = k => s.findOne(x => x.type === 'TEXT' && x.name === k); t('Current label').characters = label; t('Progress text').characters = 'Step ' + n + ' of 9'; t('Next step').characters = next ? 'Next: ' + next : (err ? 'Withdrawal not sent — funds returned' : 'All steps complete'); const seg = i => s.findOne(x => x.name === 'Segment ' + i); const done = seg(1).fills, todo = seg(9).fills; for (let i = 1; i <= 9; i++) seg(i).fills = i <= n ? done : todo; if (err) seg(n).fills = [paint('status/danger')]; }
async function shellM(name, n, x, label, next, o = {}) {
  const y = colY(x);
  const f = await screen(name, 390, o.sheet ? { h: 844 } : {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR('DEMO DATA — all figures are illustrative, not real.'), 'FILL']);
  add(f, [await I('23:12908', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [ct, 'FILL']);
  const bh = hrow('Page header', 8); add(ct, [bh, 'FILL']);
  bh.appendChild(await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }));
  await tx(bh, 'Withdraw USDT', 'Heading/H4', 'text/primary', { hug: true }); sp(bh); bh.appendChild(await DEMO('S'));
  const stp = await I('15:3270', { Steps: '9' }); add(ct, [stp, 'FILL']); setStepM(stp, n, label, next, o.err);
  return { f, ct };
}
// sticky bottom CTA (primary + at most one alternative) + bottom tab bar
async function footM(f, s, o = {}) {
  const b = AL('VERTICAL', { name: 'Sticky CTA (pinned above tab bar)', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(b, 'border/subtle', { t: 1 }); add(f, [b, 'FILL']);
  if (s.next) add(b, [await BTN(s.nextType || 'Primary', s.next, { size: 'L', state: s.state || 'Default', lead: s.lead, trail: s.trail === undefined ? 'arrow-right' : s.trail }), 'FILL']);
  for (const [ty, l, ic] of (s.alt || []).slice(0, 1)) add(b, [await BTN(ty, l, { size: 'L', lead: ic }), 'FILL']);
  if (s.note) await tx(b, s.note, 'Caption', 'text/tertiary', { align: 'CENTER' });
  if (!o.noTab) add(f, [await I('22:5413', { Active: 'Wallet' }), 'FILL']);
  return b;
}
// bottom sheet over the page: scrim + sheet anchored to the bottom of a fixed 844 frame
async function sheetM(f, name) {
  const scr = rect(390, 844, 'scrim/overlay', 0, 'Scrim'); f.appendChild(scr); scr.layoutPositioning = 'ABSOLUTE'; scr.x = 0; scr.y = 0;
  const sh = AL('VERTICAL', { name: 'Bottom sheet — ' + name, gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay', w: 390 }); f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE';
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  const g = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [0, 0, 4, 0] }); add(sh, [g, 'FILL']); g.appendChild(rect(36, 4, 'border/strong', 9999, 'Handle'));
  return sh;
}
async function sheetFoot(sh, s) { const b = AL('VERTICAL', { name: 'Sheet actions', gap: 8, p: [4, 0, 8, 0] }); add(sh, [b, 'FILL']); add(b, [await BTN('Primary', s.next, { size: 'L', state: s.state || 'Default', lead: s.lead, trail: s.trail === undefined ? 'arrow-right' : s.trail }), 'FILL']); add(b, [await BTN('Ghost', 'Cancel', { size: 'L' }), 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', justify: 'CENTER', p: [8, 0, 8, 0] }); add(sh, [hi, 'FILL']); hi.appendChild(rect(134, 5, 'text/primary', 9999, 'Indicator')); }
// ===== END WAL-WB mobile shell =====
