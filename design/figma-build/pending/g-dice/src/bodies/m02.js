// Mobile DI-04 win / lose (x 1650) + GM-01 reality check & session sheets (x 3690)
{ const shots = [];
  shots.push((await mk('[DI-04] Result / 390 / Win — rolled 73.21 (+10.00 USDT)', 1650, async () => buildM('n', { balance: '9,225.30', avail: '9,225.30', roll: { v: '73.21', state: 'win' }, rgm: { timer: '00:42:21', net: '−14.60 USDT', lim: '14.60 / 200.00 USDT', pct: 0.07 },
    top: { label: 'SETTLED · D-88213', meta: 'Nonce 417 · 18:42:07 UTC · next nonce 418' },
    read: { over: 'RESULT', value: '73.21', color: 'text/success', chip: 'win', chipLabel: 'Win · inside 50.50 – 99.99' },
    result: { v: 'Win', head: 'You won 20.00 USDT', detail: 'Rolled 73.21 · over 50.50 · 2.0000× · D-88213', net: '+10.00' }, last: [['73.21', 1]].concat(LAST.slice(0, 5)), cta: { label: 'Roll again · 10.00 USDT' } }))).f);
  shots.push((await mk('[DI-04] Result / 390 / Lose — rolled 31.07 (−10.00 USDT)', 1650, async () => buildM('n', { roll: { v: '31.07', state: 'lose' }, rgm: { timer: '00:42:47' },
    top: { label: 'SETTLED · D-88214', meta: 'Nonce 418 · 18:42:33 UTC · next nonce 419' },
    read: { over: 'RESULT', value: '31.07', color: 'text/danger', chip: 'lose', chipLabel: 'Lose · below your 50.50 target' },
    result: { v: 'Lose', head: 'No win this roll', detail: 'Rolled 31.07 · needed 50.50 or higher · D-88214', net: '−10.00' }, last: [['31.07', 0], ['73.21', 1]].concat(LAST.slice(0, 4)), cta: { label: 'Roll again · 10.00 USDT' }, ctaNote: 'The next roll is still 49.50% — a loss doesn’t make a win due' }))).f);
  shots.push((await mk('[GM-01] Reality check / 390 / Bottom sheet over Pool Dice — 60 minutes', 3690, async () => { const R = await buildM('n', { rgm: { timer: '01:00:00' } });
    await mSheet(R.f, 'Time check — 60 minutes', async (sh) => {
      await wrapT(sh, 'You’ve been playing for 60 minutes. Here’s your session so far.', 'Body/M', 'text/secondary', 358, { name: 'Sheet body' });
      const st = AL('HORIZONTAL', { name: 'Session stats', gap: 8 }); for (const [l, v, c] of [['SESSION TIME', '01:00:00', 'text/primary'], ['NET RESULT', '−24.60 USDT', 'text/danger']]) { const t = AL('VERTICAL', { name: 'Stat — ' + l, gap: 4, p: 12, r: 10, fill: 'bg/secondary', stroke: 'border/subtle' }); const lr = AL('HORIZONTAL', { name: 'Stat label', gap: 6, align: 'CENTER' }); add(lr, await T(l, 'Overline', 'text/tertiary'), await DEMO('XS')); add(t, lr, await T(v, 'Number/S', c)); add(st, [t, 'FILL']); } add(sh, [st, 'FILL']);
      for (const [l, ic] of [['Continue playing', 'play'], ['View history', 'history'], ['Take a break', 'pause-circle']]) add(sh, [await BTN('Secondary', l, { size: 'L', lead: ic }), 'FILL']);
      await wrapT(sh, 'Next reminder at 19:00 UTC. Change the interval in Responsible gaming. It only appears between rolls.', 'Caption', 'text/tertiary', 358, { name: 'Sheet note', align: 'CENTER' }); });
    return R; })).f);
  shots.push((await mk('[GM-01] Session strip / 390 / Approaching daily loss limit — session sheet (DEMO scenario)', 3690, async () => { const R = await buildM('n', { rgm: { warn: true, net: '−172.40 USDT', lim: '172.40 / 200.00 USDT', pct: 0.86, msg: 'Approaching your daily loss limit · 27.60 USDT left today' } });
    await mSheet(R.f, 'This session', async (sh) => {
      for (const [l, v, c] of [['Started', '27 Nov 2026, 18:00 UTC'], ['Time played', '00:42:18'], ['Net result', '−172.40 USDT', 'text/danger'], ['Daily loss limit used', '172.40 / 200.00 USDT', 'text/warning']]) add(sh, [await kv(l, v, { vstyle: 'Body/S Strong', color: c, demo: true }), 'FILL']);
      const tr = AL('HORIZONTAL', { name: 'Meter', h: 6, r: 9999, fill: 'border/default', clip: true }); add(sh, [tr, 'FILL']); add(tr, rect(308, 6, 'status/warning', 0, 'Meter fill 86%'));
      await wrapT(sh, '27.60 USDT left today · play pauses at 200.00 · resets 28 Nov 2026, 00:00 UTC', 'Caption', 'text/tertiary', 358, { name: 'Limit note' });
      add(sh, [await callout({ tone: 'warning', icon: 'alert-triangle', title: 'You’re close to your daily loss limit', body: 'Lowering a limit applies straight away; raising it waits 24 h.' }), 'FILL']);
      add(sh, [await BTN('Secondary', 'Take a break', { size: 'L', lead: 'pause-circle' }), 'FILL'], [await BTN('Ghost', 'Set limits', { size: 'L', lead: 'sliders' }), 'FILL']); });
    return R; })).f);
  for (const f of shots) await f.screenshot({ scale: 0.5 }); }
