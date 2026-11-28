const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-08..11/13 History & edge states', 32000, 0);
const NAME = '[GP-13] Edge state — VRF delayed / 1440 / Waiting 00:14:32 (20:14:36 UTC)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await shell(NAME, 'Global Pool', 6360, colY(6360));
add(main, [await phead(['Global Pool', 'Round #1,248'], 'Round #1,248 — draw delayed', 'Entries closed at 20:00:00 UTC and randomness was requested from Chainlink VRF at 20:00:04 UTC. The response is taking longer than usual; nothing about the round has changed.', [await BTN('Secondary', 'Notify me when settled', { lead: 'bell' }), await BTN('Ghost', 'System status', { lead: 'activity' })], await badge('Processing', 'Draw delayed', 'M')), 'FILL']);
add(main, [await subnav('Overview'), 'FILL']);
const rh = await I(C.RH, { Status: 'Drawing' }); await O(rh, { 'Countdown value': 'Delayed', 'Absolute time': 'Requested 20:00:04 · waiting 00:14:32', '~draw in progress': 'awaiting VRF response' }, 'rh');
add(main, [rh, 'FILL']);
const r = row('Row — VRF & impact', { gap: 24, align: 'MIN' });
const vrf = await I(C.VRF, { Step: 'Delayed' });
const rc = col('Right column', { gap: 24 });
const im = card('Card — What this means for you');
add(im, [await ttl('What this means for you'), 'FILL']);
const net = await I(C.NET, { Chain: 'Arbitrum', Status: 'Degraded' }, { 'Show status label': true, 'Show chevron': false });
for (const [k, v, o] of [['Your entries', '35 entries · 350.00 USDT stay locked in #1,248', {}], ['Who decides winners', 'Only the VRF random words — nobody can pick or change them', {}], ['Arbitrum One', '', { node: net }], ['Last checked', '20:14:36 UTC · refreshes every 15 s', {}]]) add(im, [await kv(k, v, Object.assign({ vw: 300 }, o)), 'FILL']);
add(im, [line(), 'FILL'], await T('IF THE RESPONSE KEEPS FAILING', 'Overline', 'text/tertiary'));
add(im, [await stepper([
  { s: 'current', t: 'Waiting for the original request', d: 'Chainlink fulfils request 0x9f2c…e71a as soon as the network catches up. Typical response: under 1 minute.' },
  { s: 'todo', t: 'Request re-sent by the contract', d: 'After 1 hour without a response (21:00:04 UTC) the contract re-requests randomness for the same entries.' },
  { s: 'todo', t: 'Round cancelled and refunded', d: 'After 24 hours without a response the round is cancelled under the contract rules: every stake becomes Owed and every fee returns to Available.' }]), 'FILL']);
const nx = card('Card — Next round', { gap: 12 }); add(nx, [await ttl('Round #1,249 is not affected'), 'FILL'], [await T('It opens on schedule on 28 Nov 2026 at 08:00 UTC. You can already set a reminder.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL'], await BTN('Ghost', 'Remind me at 08:00 UTC', { size: 'S', lead: 'bell' }));
add(rc, [im, 'FILL'], [nx, 'FILL']);
add(r, vrf, [rc, 'FILL']); add(main, [r, 'FILL']);
await foot(main);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
