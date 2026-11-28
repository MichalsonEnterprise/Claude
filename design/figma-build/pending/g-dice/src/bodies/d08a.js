// GM-01 shared Game session RG bar + reality check (x 11040): reality check modal, session details (approaching), spec board
{ const X = 11040; const shots = [];
  const A = await mk('[GM-01] Reality check / 1440 / 60-minute reminder over Pool Dice', X, async () => { const R = await buildPlay('n', 0, 0, { rgRepl: { '00:42:18': '01:00:00' } });
    const sc = await scrimOver(R.f, 200); gap(sc, 16); const rc = await I('23:24938'); rc.name = 'RG/Reality Check'; add(sc, rc);
    add(sc, await T('Shown every 60 minutes of play (change it in Responsible gaming → Reality check). It only appears between rolls — never during one.', 'Caption', 'text/secondary', { w: 448, align: 'CENTER', name: 'Reality check note' }));
    R.notes.rcTexts = rc.findAll(n => n.type === 'TEXT').map(t => t.characters).slice(0, 12); return R; });
  shots.push(A.f);
  const B = await mk('[GM-01] Session bar / 1440 / Approaching daily loss limit — session details open (DEMO scenario)', X, async () => { const R = await buildPlay('n', 0, 0, { rg: 'Approaching limit' });
    R.notes.rgTexts = R.rg.findAll(n => n.type === 'TEXT').map(t => t.characters).slice(0, 16);
    const p = AL('VERTICAL', { name: 'Session details popover', gap: 14, p: 20, r: 14, fill: 'surface/overlay', stroke: 'border/subtle', w: 400 }); await fx(p, 'Elevation/3 — Popover');
    const hd = AL('HORIZONTAL', { name: 'Popover head', gap: 8, align: 'CENTER' }); add(hd, await IC('timer', 20, 'icon/brand'), await T('This session', 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await iconBtn('x', { type: 'Ghost', size: 'S' })); add(p, [hd, 'FILL']);
    for (const [l, v, c] of [['Started', '27 Nov 2026, 18:00 UTC'], ['Time played', '00:42:18'], ['Games', 'Pool Dice · Orbit Rush'], ['Net result', '−172.40 USDT', 'text/danger']]) add(p, [await kv(l, v, { vstyle: 'Body/S Strong', color: c, demo: true }), 'FILL']);
    const ll = AL('VERTICAL', { name: 'Loss limit', gap: 6 }); add(ll, [await kv('Daily loss limit used', '172.40 / 200.00 USDT', { vstyle: 'Body/S Strong', color: 'text/warning', demo: true }), 'FILL']);
    const tr = AL('HORIZONTAL', { name: 'Meter', h: 6, r: 9999, fill: 'border/default', clip: true }); add(ll, [tr, 'FILL']); add(tr, rect(310, 6, 'status/warning', 0, 'Meter fill 86%'));
    add(ll, await T('27.60 USDT left today · play pauses at 200.00 · resets 28 Nov 2026, 00:00 UTC', 'Caption', 'text/tertiary', { w: 360, name: 'Limit note' })); add(p, [ll, 'FILL']);
    add(p, [await callout({ tone: 'warning', icon: 'alert-triangle', title: 'You’re close to your daily loss limit', body: 'This is a good moment for a break. Lowering a limit applies straight away.' }), 'FILL']);
    const a = AL('HORIZONTAL', { name: 'Popover actions', gap: 8, wrap: true, cgap: 8 }); add(a, await BTN('Secondary', 'Take a break', { size: 'S', lead: 'pause-circle' }), await BTN('Ghost', 'Set limits', { size: 'S', lead: 'sliders' }), await BTN('Ghost', 'Session history', { size: 'S', lead: 'history' })); add(p, [a, 'FILL']);
    R.C.appendChild(p); p.layoutPositioning = 'ABSOLUTE'; p.x = R.C.width - 32 - 400; p.y = R.rg.y + R.rg.height + 8; return R; });
  shots.push(B.f);
  for (const f of shots) await f.screenshot({ scale: 0.4 }); }
