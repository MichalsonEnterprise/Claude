const NAME = '[USR-RG5] Reality Checks / 390 / Popup — bottom sheet, 60 minutes reached';
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellM(NAME, 'Reality checks', { bare: true });
const C = S.C; const W = 358;
const ses = AL('HORIZONTAL', { name: 'Session strip', gap: 8, align: 'CENTER', p: [8, 12, 8, 12], fill: 'surface/default', stroke: 'border/subtle', r: 10 }); add(C, [ses, 'FILL']); ses.appendChild(await IC('timer', 16, 'icon/brand')); add(ses, [await T('Session 01:00:00 · net −24.60 USDT', 'Label/S', 'text/primary'), 'FILL']); ses.appendChild(await DEMO('XS')); ses.appendChild(await I('6:159'));
C.appendChild(await T('GLOBAL POOL Originals', 'Heading/H5', 'text/primary'));
for (const pair of [['Crash', 'Dice'], ['Roulette', 'Coinflip']]) { const r = AL('HORIZONTAL', { name: 'Tile row', gap: 12 }); add(C, [r, 'FILL']); for (const g of pair) { const t = await I('23:14885', { Game: g, State: 'Default' }); add(r, [t, 'FILL']); } }
await licM(C); await endM(S);
await sheetM(S.f, 'You have been playing for 60 minutes', 'Your game is paused. The round in progress has been settled.', async (sh) => {
  const st = AL('VERTICAL', { name: 'Stats', gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised', r: 14 }); add(sh, [st, 'FILL']);
  add(st, [await kv('Time this session', '60 min'), 'FILL']); add(st, [await kv('Net result this session', '−24.60 USDT', { color: 'text/danger', divider: false }), 'FILL']);
  for (const [l, ic] of [['Continue playing', 'play'], ['View history', 'history'], ['Take a break', 'pause-circle']]) { const b = await BTN('Secondary', l, { size: 'L', lead: ic }); add(sh, [b, 'FILL']); }
  add(sh, [await T('Next reminder in 60 minutes. Change the interval in Responsible gaming → Reality checks.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
});
const top = byName(sec, '[USR-RG5] Reality Checks / 390 / Settings');
await placeM(S.f, sec, 2160, top ? top.y + top.height + 160 : nextY(sec));
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
