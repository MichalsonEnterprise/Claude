// ===== WAL-WA mobile shell (page 10, MOB-07 bottom-sheet pattern) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('WAL — Mobile C (Withdraw 1–5)', 147000, 0);
const MX = [120, 630, 1140, 1650, 2160];
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2) { m = Math.max(m, c.y + c.height); any = true; } return any ? m + 160 : 120; }
function clean(names) { for (const c of [...sec.children]) if (names.includes(c.name)) c.remove(); }
function setStepM(s, n, label, next) { const t = k => s.findOne(x => x.type === 'TEXT' && x.name === k); t('Current label').characters = label; t('Progress text').characters = 'Step ' + n + ' of 9'; t('Next step').characters = 'Next: ' + next; const seg = i => s.findOne(x => x.name === 'Segment ' + i); const done = seg(1).fills, todo = seg(9).fills; for (let i = 1; i <= 9; i++) seg(i).fills = i <= n ? done : todo; }
async function shellM(name, n, x, label, next, o = {}) {
  const y = colY(x);
  const f = await screen(name, 390, o.sheet ? { h: 844 } : {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR('DEMO DATA — all figures are illustrative, not real.'), 'FILL']);
  add(f, [await I('23:12908', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [ct, 'FILL']); if (o.sheet) ct.layoutSizingVertical = 'FILL';
  const bh = hrow('Page header', 8); add(ct, [bh, 'FILL']);
  bh.appendChild(await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }));
  await tx(bh, 'Withdraw USDT', 'Heading/H4', 'text/primary', { hug: true }); sp(bh); bh.appendChild(await DEMO('S'));
  const stp = await I('15:3270', { Steps: '9' }); add(ct, [stp, 'FILL']); setStepM(stp, n, label, next);
  return { f, ct };
}
async function tabM(f) { const t = await I('22:5413', { Active: 'Wallet' }); add(f, [t, 'FILL']); return t; }
// sticky bottom CTA + bottom tab bar
async function footM(f, s) {
  const b = AL('VERTICAL', { name: 'Sticky CTA (pinned above tab bar)', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(b, 'border/subtle', { t: 1 }); add(f, [b, 'FILL']);
  if (s.note) await tx(b, s.note, 'Caption', 'text/tertiary', { align: 'CENTER' });
  add(b, [await BTN('Primary', s.next, { size: 'L', state: s.state || 'Default', trail: 'arrow-right' }), 'FILL']);
  await tabM(f); return b;
}
// bottom sheet over the page: scrim + sheet (absolute), pinned to the bottom by pinSheet()
async function sheetM(f, name) {
  const scr = rect(390, f.height, 'scrim/overlay', 0, 'Scrim'); f.appendChild(scr); scr.layoutPositioning = 'ABSOLUTE'; scr.x = 0; scr.y = 0;
  const sh = AL('VERTICAL', { name: 'Bottom sheet — ' + name, gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay', w: 390 }); f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE';
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  const g = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [0, 0, 4, 0] }); add(sh, [g, 'FILL']); g.appendChild(rect(36, 4, 'border/strong', 9999, 'Handle'));
  return { sh, scr };
}
async function sheetHead(sh, title, desc) { const h = AL('VERTICAL', { name: 'Sheet header', gap: 4 }); add(sh, [h, 'FILL']); const r = hrow('Title row', 8); add(h, [r, 'FILL']); await tx(r, title, 'Heading/H4', 'text/primary'); r.appendChild(await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS['x'] })); if (desc) await tx(h, desc, 'Body/S', 'text/secondary'); return h; }
async function sheetFoot(sh, s = {}) { const b = AL('VERTICAL', { name: 'Sheet actions', gap: 8, p: [4, 0, 8, 0] }); add(sh, [b, 'FILL']); if (s.note) await tx(b, s.note, 'Caption', 'text/tertiary', { align: 'CENTER' }); if (s.next) add(b, [await BTN('Primary', s.next, { size: 'L', state: s.state || 'Default', trail: 'arrow-right' }), 'FILL']); if (s.cancel !== false) add(b, [await BTN('Ghost', 'Cancel', { size: 'L' }), 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', justify: 'CENTER', p: [8, 0, 8, 0] }); add(sh, [hi, 'FILL']); hi.appendChild(rect(134, 5, 'text/primary', 9999, 'Indicator')); }
function pinSheet(f, sh, scr) { let H = f.height; if (sh.height > H - 48) { H = Math.ceil(sh.height + 48); f.resize(390, H); scr.resize(390, H); } sh.x = 0; sh.y = H - sh.height; return H; }
async function optCard(p, ic, t1, t2, btn) { const w = AL('VERTICAL', { name: 'Option — ' + t1.slice(0, 30), gap: 10, p: 12, fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); add(p, [w, 'FILL']); const r = hrow('Option row', 12, { align: 'MIN' }); add(w, [r, 'FILL']); const it = AL('HORIZONTAL', { name: 'Icon tile', p: 8, fill: 'brand/tint', r: 10 }); it.appendChild(await IC(ic, 20, 'icon/brand')); r.appendChild(it); const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']); await tx(c, t1, 'Body/S Strong'); await tx(c, t2, 'Caption', 'text/secondary'); if (btn) add(w, [btn, 'FILL']); return w; }
// WAL-12 page content. st = Default | Invalid
async function addr12(ct, st) {
  await fhead(ct, 'Where should we send it?', 'Pick a whitelisted Arbitrum address or paste a new one. We check the format as you type.', true);
  const wh = hrow('Whitelist header', 6); add(ct, [wh, 'FILL']); await tx(wh, 'YOUR WHITELIST ON ARBITRUM', 'Overline', 'text/tertiary', { hug: true }); wh.appendChild(await DEMO('XS')); sp(wh); await tx(wh, 'Manage', 'Label/M', 'text/brand', { hug: true });
  const sa = hrow('Saved address — Arbitrum cold wallet', 12, { p: [12, 16, 12, 16], fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); add(ct, [sa, 'FILL']);
  const rd = AL('HORIZONTAL', { name: 'Radio', w: 20, h: 20, r: 9999, align: 'CENTER', justify: 'CENTER' }); stroke(rd, 'border/strong', 2); sa.appendChild(rd);
  sa.appendChild(await CHAIN('Arbitrum', 24));
  const c = AL('VERTICAL', { name: 'Text', gap: 6 }); add(sa, [c, 'FILL']); const tr = hrow('Title row', 8); add(c, [tr, 'FILL']); await tx(tr, 'Arbitrum cold wallet', 'Body/S Strong', 'text/primary', { hug: true }); tr.appendChild(await B('Approved', 'Whitelisted'));
  c.appendChild(await I('9:418', { Size: 'S' }, { Address: AD, 'Show DEMO': true })); await tx(c, 'Since 14 Oct 2026 · no cooldown', 'Caption', 'text/tertiary');
  const dv = hrow('Divider — or paste a new address', 12); add(ct, [dv, 'FILL']); const l1 = rect(10, 1, 'border/subtle', 0, 'Line'); dv.appendChild(l1); l1.layoutSizingHorizontal = 'FILL'; await tx(dv, 'or paste a new address', 'Caption', 'text/tertiary', { hug: true }); const l2 = rect(10, 1, 'border/subtle', 0, 'Line'); dv.appendChild(l2); l2.layoutSizingHorizontal = 'FILL';
  const ia = await I('15:3617', { State: st === 'Invalid' ? 'Invalid' : 'Default' }, { Label: 'Destination address' }); ia.name = 'Input/Address'; add(ct, [ia, 'FILL']);
  if (st === 'Invalid') { const al = await alertBox('danger', 'This looks like a Solana address', 'You chose Arbitrum One, but 7Hq3…Xk9P is a Solana (SPL) address. Paste an address that starts with 0x, or switch the network to Solana.', { actions: [await BTN('Secondary', 'Switch network to Solana', { size: 'M', lead: 'swap' })] }); add(ct, [al, 'FILL']); }
  const bad = st === 'Invalid';
  const fc = card('Format checks', { gap: 8, p: [12, 16, 12, 16], fill: 'surface/raised' }); add(ct, [fc, 'FILL']);
  for (const [k, t] of [[bad ? 'x' : 'n', bad ? 'Doesn\'t start with 0x — not an Arbitrum One address' : 'Starts with 0x and is 42 characters long'], [bad ? 'x' : 'n', bad ? 'Checksum can\'t be verified for this format' : 'Checksum is verified automatically'], ['i', 'Exchange deposit addresses work if the exchange lists USDT on Arbitrum One']]) { const r = hrow('Check — ' + t.slice(0, 30), 8, { align: 'MIN' }); add(fc, [r, 'FILL']); r.appendChild(await IC(k === 'x' ? 'x-circle' : k === 'i' ? 'info' : 'check', 16, k === 'x' ? 'status/danger' : 'icon/muted')); await tx(r, t, 'Caption', k === 'x' ? 'text/danger' : 'text/secondary'); }
  const wa = await alertBox('warning', 'Double-check before you continue', 'Transfers are irreversible. Clipboard malware can swap a copied address — compare the first and last 4 characters with your wallet app.'); add(ct, [wa, 'FILL']);
}
// WAL-13 page content. st = Default | Over | Limit
async function amt13(ct, st) {
  await fhead(ct, 'How much do you want to withdraw?', 'The Arbitrum network fee is taken from this amount — you see exactly what arrives before you confirm.', true);
  const ia = await I('15:3387', { State: st === 'Over' ? 'Error' : st === 'Limit' ? 'Disabled' : 'Focus' }, { Label: 'Amount to withdraw', 'Show limits': true }); ia.name = 'Input/Amount'; add(ct, [ia, 'FILL']);
  if (st === 'Limit') setT(ia, 'Helper text', 'Daily limit reached — reopens 28 Nov 2026, 00:00 UTC.', 0);
  await chips(ct, st === 'Default' ? '1,500.00' : null, st === 'Limit' ? 'Disabled' : null);
  if (st === 'Default') { await limitTiles(ct, true); const fe = await I('20:3002', { State: 'Normal' }); fe.name = 'Wallet/Fee Estimator'; add(ct, [fe, 'FILL']); await lockNote(ct); }
  if (st === 'Over') { const al = await alertBox('warning', 'Only your Available balance can be withdrawn', 'You entered 12,000.00 USDT; 9,215.30 USDT is Available. Pending deposits (1,000.00) and Owed refunds/rewards (415.20) become withdrawable once they settle. Entry funds stay Locked until the draw.', { actions: [await BTN('Secondary', 'Withdraw max · 9,215.30', { size: 'M' })] }); add(ct, [al, 'FILL']); await limitTiles(ct, true); }
  if (st === 'Limit') { const al = await alertBox('warning', 'Today\'s 25,000.00 USDT limit is reached', 'Separate DEMO scenario: 25,000.00 USDT already withdrawn today. Withdrawals reopen 28 Nov 2026, 00:00 UTC (in 5 h 18 min). Your Available balance stays safe in your account.', { actions: [await BTN('Secondary', 'Raise limit — verify Level 3', { size: 'M', lead: 'shield-check' })] }); add(ct, [al, 'FILL']); await limitCard(ct, { used: '25,000.00', usedLabel: 'of 25,000.00 USDT today', pct: 1, full: true, limitNote: 'Resets 28 Nov 2026, 00:00 UTC · Level 3 (source of funds) can raise it.' }); }
}
// ===== END WAL-WA mobile shell =====
