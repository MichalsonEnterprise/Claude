// ERR mobile batch 1 — ERR-04 offline, ERR-05 licence required, ERR-06 entries paused (page 10, 'ERR — Mobile')
await mInit();
const out = {};
// M1 — ERR-04 Offline
{ const f = await mscreen('[ERR-04] Offline — reconnecting / 390 / Global Pool round', 0);
  add(f, await topbar(), await mBanner('wifi-off', 'status/warning-tint', 'text/warning', 'You’re offline', 'Figures below are from 18:42 UTC and may be out of date. Entries, bets and withdrawals are paused until you’re back — nothing is sent twice.', await BTN('Secondary', 'Try again', { size: 'S', lead: 'refresh' })));
  const ct = content(); add(f, ct);
  add(ct, [await roundCard({ asof: true, closeNote: 'Closes 27 Nov 2026, 20:00 UTC — the countdown keeps running while you’re offline.' }), 'FILL']);
  const me = await card('My entries'); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await T('35 entries', 'Heading/H5', 'text/primary'), await DEMO('S')); add(me, r, [await T('350.00 USDT + 1.75 USDT platform fees · E-1248-00981 … E-1248-01015', 'Body/S', 'text/secondary', { w: 326 }), 'FILL'], await stat('check-circle', 'Safe in the round — confirmed before you went offline', 'text/success')); add(ct, [me, 'FILL']);
  add(ct, await stat('refresh', 'Reconnecting automatically · attempt 3 · next try in 8 s', 'text/secondary'));
  add(f, await sticky([await BTN('Gold', 'Reconnect to enter', { size: 'L', state: 'Disabled', lead: 'wifi-off' })], '10.00 USDT + 0.05 USDT platform fee per entry · You can lose your stake · 18+'), await tabbar('Pool'));
  out.m1 = f.id; }
// M2 — ERR-05 Licence required
{ const f = await mscreen('[ERR-05] Licence required / 390 / Global Pool entries off', 1);
  add(f, await topbar(), await mBanner('scale', 'status/warning-tint', 'text/warning', 'Global Pool isn’t licensed where you live', 'Global Pool participation needs a separate local licence in Ontario, Canada, which we don’t hold. Your balance and any owed refunds are unaffected.', await BTN('Ghost', 'Licence details', { size: 'S', trail: 'arrow-right' })));
  const ct = content(); add(f, ct);
  add(ct, [await roundCard({}), 'FILL']);
  const can = await card('What you can still do'); add(can, await T('What you can still do', 'Heading/H5', 'text/primary'), [await list([['check-circle', 'Play Originals and table games — licensed in Ontario'], ['check-circle', 'Withdraw your balance at any time'], ['check-circle', 'Receive refunds from cancelled rounds (Owed → Available)'], ['check-circle', 'Watch rounds and verify every draw']]), 'FILL']); add(ct, [can, 'FILL']);
  add(ct, await I('6:158', { Variant: 'Compact' }));
  add(f, await sticky([await BTN('Gold', 'Entries not available in Ontario', { size: 'L', state: 'Disabled', lead: 'lock' }), await BTN('Secondary', 'Browse Originals', { size: 'L' })], 'DEMO scenario: account registered in Ontario, Canada · 18+'), await tabbar('Pool'));
  out.m2 = f.id; }
// M3 — ERR-06 Entries paused
{ const f = await mscreen('[ERR-06] New entries paused / 390 / Circuit breaker', 2);
  add(f, await topbar(), await mBanner('pause-circle', 'status/warning-tint', 'text/warning', 'New Global Pool entries are paused', 'A safety pause on the GlobalPool contract stopped new entries at 19:05 UTC. Your 35 entries in round #1,248 still count — the draw, prizes and refunds follow the contract rules.', await BTN('Ghost', 'Why entries are paused', { size: 'S', trail: 'arrow-right' })));
  const ct = content(); add(f, ct);
  add(ct, [await roundCard({ status: 'Entries paused', si: 'pause-circle', sc: 'text/warning', closeNote: 'Still closes 27 Nov 2026, 20:00 UTC — the draw runs as scheduled.' }), 'FILL']);
  const ok = await card('Not affected'); add(ok, await T('Not affected', 'Heading/H5', 'text/primary'), [await list([['check-circle', 'Your 35 entries (E-1248-00981 … E-1248-01015) stay in the draw'], ['check-circle', 'Deposits and withdrawals'], ['check-circle', 'Originals and table games'], ['check-circle', 'Refunds and prize settlement']]), 'FILL']); add(ct, [ok, 'FILL']);
  add(f, await sticky([await BTN('Gold', 'Entries paused', { size: 'L', state: 'Disabled', lead: 'pause-circle' }), await BTN('Secondary', 'View my entries', { size: 'L' })], 'Paused since 27 Nov 2026, 19:05 UTC · two-person approval · 18+'), await tabbar('Pool'));
  out.m3 = f.id; }
fitSection(MS);
const res = {}; for (const [k, id] of Object.entries(out)) { const n = await figma.getNodeByIdAsync(id); res[k] = { id, name: n.name, h: n.height, flags: audit(n) }; }
await MS.screenshot({ scale: 0.5 });
return { section: MS.id, secX: MS.x, res };
