const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('GP — Mobile C', 175000, 0);
const NAME = '[GP-13] Edge state — VRF delayed / 390 / Waiting 00:14:32 (20:14:36 UTC)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await mshell(NAME, 2160, colY(2160));
add(main, [await mhead('Global Pool', 'Round #1,248', 'Entries closed 20:00:00 UTC · randomness requested 20:00:04 UTC.', await badge('Processing', 'Draw delayed')), 'FILL']);
const bn = AL('VERTICAL', { name: 'Callout — VRF delayed', p: 16, gap: 8, fill: 'status/warning-tint', stroke: 'border/default', r: 14 });
const bh = row('Head', { gap: 8, align: 'MIN' }); add(bh, await IC('hourglass', 20, 'status/warning'), [await T('The draw is taking longer than usual', 'Body/S Strong', 'text/primary', { w: 290 }), 'FILL']);
add(bn, [bh, 'FILL'], [await T('Chainlink VRF hasn’t answered yet (waiting 00:14:32). Your entries are safe and nothing about the round has changed. No action needed.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
add(main, [bn, 'FILL']);
const vs = card('Card — Draw randomness', { p: 16, gap: 12 }); const hs = await I(C.HASH, { State: 'Default' }, { Hash: '0x9f2c…e71a', 'Show explorer link': true });
add(vs, [await ttl('Draw randomness', { s: 'Label/L', right: [await badge('Pending', 'Delayed')] }), 'FILL']);
add(vs, [await stepper([
  { s: 'done', t: 'Randomness requested', d: '20:00:04 UTC · Chainlink VRF on Arbitrum One', extra: hs },
  { s: 'warn', t: 'Awaiting VRF response', d: 'Elapsed 00:14:32 · typical response under 1 minute' },
  { s: 'todo', t: 'Randomness fulfilled', d: 'Random words and proof verified on-chain.' },
  { s: 'todo', t: 'Round settled', d: 'Winners mapped from the random words; prizes credited.' }]), 'FILL']);
add(main, [vs, 'FILL']);
const net = await I(C.NET, { Chain: 'Arbitrum', Status: 'Degraded' }, { 'Show status label': true, 'Show chevron': false });
add(main, [await mcard('What this means for you', null, [['Your entries', '35 · 350.00 USDT locked'], ['Winners decided by', 'VRF random words only'], ['Network', '', { node: net }], ['Last checked', '20:14:36 UTC · every 15 s']]), 'FILL']);
const fb = card('Card — If it keeps failing', { p: 16, gap: 8 }); add(fb, [await ttl('If the response keeps failing', { s: 'Label/L', demo: false }), 'FILL']);
for (const t of ['After 1 hour (21:00:04 UTC) the contract re-requests randomness for the same entries.', 'After 24 hours without a response the round is cancelled: stakes become Owed, fees return to Available.']) { const r = row('Rule', { gap: 8, align: 'MIN' }); add(r, await IC('info', 16, 'icon/muted'), await T(t, 'Body/S', 'text/secondary', { w: 300 })); add(fb, [r, 'FILL']); }
add(main, [fb, 'FILL']);
await mfoot(main);
await sticky(f, [await BTN('Secondary', 'Notify me when settled', { size: 'L', lead: 'bell' })]);
await mtab(f);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
