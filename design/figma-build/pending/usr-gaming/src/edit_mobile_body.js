const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const F = async (id) => await figma.getNodeByIdAsync(id);
const m2d = await F('34:432315'), m3e = await F('34:486169'), m4 = await F('34:503168'), m5o = await F('36:514932'), m5s = await F('36:524169'), m6x = await F('152:65321');
// 1) Rounds #1,247 (40 entries, 402.00) / #1,246 (24 entries, 241.20) — demo-data financial history extras
await setTxt('34:432572', null, '40 entries');
await setTxt('34:486458', '25 entries', '40 entries');
await setTxt('34:503331', '25 entries · 251.25 USDT', '40 entries · 402.00 USDT');
await setTxt('34:503358', '40 entries · 402.00 USDT', '24 entries · 241.20 USDT');
// 2) G5 — VIP weekly reward 115.20 (16–22 Nov) calculated Mon 23 Nov 10:00 UTC, auto-settles Mon 30 Nov 10:00 UTC
for (const f of [m5o, m5s]) {
  await repIn(f, 'Settlement is automatic — nothing to claim.', 'Settlement is automatic — you never need to claim anything.');
  await repIn(f, 'The daily run at 21:00 UTC moves them to Available', 'The daily run at 21:00 UTC moves prizes and refunds to Available (VIP weekly rewards settle by themselves after 7 days)');
  await repIn(f, 'No. Everything owed settles automatically in the daily run.', 'No. Everything owed settles automatically — prizes and refunds in the daily run, VIP rewards 7 days after they are calculated.');
}
await setTxt('36:515022', null, 'Refund settles today, 21:00 UTC');
await setTxt('36:515135', null, 'Auto-settles 30 Nov 2026, 10:00 UTC');
await setTxt('36:515177', null, '23 Nov 2026, 10:00 UTC · auto-settled');
await setTxt('36:515186', null, '12 Nov 2026 · claimed in VIP Club');
await setTxt('36:524193', null, 'Nothing is owed right now. 415.20 USDT moved to Available on its own — the refund on 27 Nov, the VIP reward on 30 Nov. No action was needed.');
await setTxt('36:524197', null, 'Last item settled 30 Nov 2026, 10:00 UTC');
await setTxt('36:524198', null, 'Refund batch tx 0x6b2e…41a9 · next run 30 Nov, 21:00 UTC');
await setTxt('36:524216', null, 'Settled · last 7 days');
await setTxt('36:524279', null, 'Settled 30 Nov 2026, 10:00 UTC');
await setTxt('36:524314', null, '30 Nov 2026, 10:00 UTC');
await swapRows('36:524306', '36:524314');
// 3) fix 04 — G6 390 Export: filename gets the full width (DEMO badge moves under it), sheet re-pinned to the bottom
const fc = m6x.findOne(n => n.type === 'FRAME' && n.name === 'File preview');
const ft = fc.findOne(n => n.type === 'FRAME' && n.name === 'File');
const demo = fc.children.find(c => c.type === 'INSTANCE');
if (demo) { ft.appendChild(demo); LOG.ok.push(demo.id); }
const fname = ft.findOne(n => n.type === 'TEXT' && n.characters.startsWith('game-history'));
if (fname) { fname.layoutSizingHorizontal = 'FILL'; LOG.ok.push(fname.id); }
const sh6 = m6x.findOne(n => n.type === 'FRAME' && n.name.startsWith('Bottom sheet')); sh6.y = m6x.height - sh6.height;
