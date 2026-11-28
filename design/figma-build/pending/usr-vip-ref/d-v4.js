const NAME = '[USR-V4] VIP — Benefits & Tier Comparison / 1440 / Default';
const { f, content } = await DESK(NAME, 4800, 160, { active: 'VIP Club', area: 'VIP Club', page: 'Benefits', title: 'Tiers & benefits',
  sub: 'Five tiers and 29 levels. Higher tiers add rewards and service — never better odds or lighter security checks.',
  actions: async () => [await BTN('Secondary', 'Points history', { lead: 'history' })], tabs: VTABS('Benefits') });
const ch = await I('23:17672', {}, { Title: 'All five tiers', 'Show live dot': false, 'Show All': false, 'Show arrows': true }); add(content, [ch, 'FILL']);
const trk = AL('HORIZONTAL', { name: 'Tier track (scrolls)', gap: 16, clip: true }); add(content, [trk, 'FILL']);
for (const t of ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']) add(trk, await I('23:12669', { Tier: t, Current: t === 'Gold' ? 'Yes' : 'No' }));
const tc = CARD({ name: 'Tier comparison', gap: 0, p: 0, clip: true }); add(content, [tc, 'FILL']);
const th = ROW({ gap: 12, p: [20, 24, 16, 24] }); add(th, await T('Compare tiers', 'Heading/H4')); add(th, await DEMO('S')); add(th, [ROW({}), 'FILL']); add(th, await T('Reward amounts in USDT, paid to Available', 'Caption', 'text/tertiary')); add(tc, [th, 'FILL']);
const tbl = COL({ name: 'Table', gap: 0 }); add(tc, [tbl, 'FILL']);
const TIERS = [['Bronze', '0 pts'], ['Silver', '2,500 pts'], ['Gold', '8,000 pts'], ['Platinum', '20,000 pts'], ['Diamond', '50,000 pts']];
const hcells = [CELL(296, [await TX('BENEFIT', 'Overline', 'text/tertiary')], { py: 12 })];
for (const [t, p] of TIERS) { const c = COL({ gap: 4 }); const r = ROW({ gap: 6 }); add(r, await I('6:211', { Tier: t, Size: 'S' })); if (t === 'Gold') add(r, await BADGEL('New', 'Your tier')); add(c, r); add(c, await T(p, 'Caption', 'text/tertiary')); const cell = CELL('FILL', [c], { py: 12 }); if (t === 'Gold') fill(cell, 'surface/selected'); hcells.push(cell); }
await addRow(tbl, hcells, { name: 'Header row', fill: 'bg/secondary' });
const ROWS = [['Levels', ['1–5', '6–11', '12–17', '18–23', '24–29']], ['Level-up rewards', ['0.50–1.50', '1.00–1.80', '2.00–15.00', '25.00–60.00', '100.00–500.00']], ['Weekly reward', ['—', '✓', '✓', '✓', '✓']], ['Monthly reward', ['—', '—', '—', '✓', '✓']], ['Support', ['Standard', 'Standard', 'Priority queue', 'Dedicated VIP host', 'Dedicated VIP host']], ['VIP tournaments', ['—', '—', 'Monthly invitational', '+ Platinum series', 'All VIP events']], ['SAME FOR EVERY TIER'], ['Odds, house edge & RTP', 'Same'], ['Draw & result verification (Chainlink VRF / seeds)', 'Same'], ['Withdrawal security checks & limits', 'Same'], ['Responsible-gaming tools & limits', 'Same']];
for (const [i, [lab, vals]] of ROWS.entries()) {
  if (!vals) { await addRow(tbl, [CELL('FILL', [await TX(lab, 'Overline', 'text/brand')], { py: 10 })], { name: 'Group — ' + lab, fill: 'brand/tint-subtle' }); continue; }
  const cells = [CELL(296, [await TX(lab, 'Body/S Strong', 'text/primary', 260)])];
  for (let j = 0; j < 5; j++) { const v = Array.isArray(vals) ? vals[j] : vals; let k;
    if (v === '✓') k = await IC('check-circle', 18, 'status/success'); else if (v === '—') k = await TX('—', 'Body/S', 'text/disabled'); else if (v === 'Same') { k = ROW({ gap: 6 }); add(k, await IC('scale', 16, 'icon/muted')); add(k, await T('Same', 'Body/S', 'text/secondary')); } else k = await TX(v, i === 1 ? 'Number/S' : 'Body/S', 'text/primary');
    const cell = CELL('FILL', [k]); if (j === 2) fill(cell, 'surface/selected'); cells.push(cell); }
  await addRow(tbl, cells, { name: 'Row — ' + lab, last: i === ROWS.length - 1 }); }
const r3 = ROW({ name: 'Next tier & fair play', gap: 16, align: 'MIN' }); add(content, [r3, 'FILL']);
const nx = CARD({ name: 'What Platinum adds', gap: 12 }); add(r3, [nx, 'FILL']); nx.layoutSizingVertical = 'FILL';
const nh = ROW({ gap: 8 }); add(nh, await I('6:211', { Tier: 'Platinum', Size: 'M' })); add(nh, await T('What Platinum adds for you', 'Heading/H5')); add(nh, await DEMO('S')); add(nx, nh);
for (const s of ['A monthly reward on top of the weekly one', 'A dedicated VIP host (replies within 1 h, 08:00–24:00 UTC)', 'Level-up rewards from 25.00 USDT', 'Invitations to the Platinum tournament series']) add(nx, [await CHK(s, 'ok', 480), 'FILL']);
add(nx, [await KV('Your progress', '12,840 / 20,000 pts', { demo: true }), 'FILL']); add(nx, BAR(500, 0.642, 'vip/platinum', 8)); add(nx, await T('7,160 points to go. Points come from normal play — there is no way to buy them.', 'Caption', 'text/tertiary', { w: 500 }));
const fp = CARD({ name: 'Fair play — what VIP never changes', gap: 12 }); add(r3, [fp, 'FILL']); fp.layoutSizingVertical = 'FILL';
const fh = ROW({ gap: 8 }); add(fh, await IC('shield-check', 20, 'icon/brand')); add(fh, await T('What VIP never changes', 'Heading/H5')); add(fp, fh);
for (const s of ['Odds, house edge and payouts are identical for every player', 'Draw results come from Chainlink VRF and verifiable seeds — status can’t influence them', 'Withdrawals go through the same security checks at every tier', 'We never offer higher limits or paused reality checks as a VIP perk']) add(fp, [await CHK(s, 'info', 480), 'FILL']);
add(fp, await BTN('Ghost', 'Responsible gaming tools', { size: 'S', lead: 'shield', trail: 'arrow-right' }));
await FOOT(content, 'Tier thresholds and reward ranges are DEMO values. VIP benefits can change with 30 days’ notice. 18+ only, in permitted jurisdictions.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
