async function flowCard(sub) {
  let card = sub.children.find(n => n.name === 'Flow map — ' + FLOW.id);
  if (card) return card;
  card = AL('HORIZONTAL', { name: 'Flow map — ' + FLOW.id, gap: 64, p: 56, fill: 'surface/default', stroke: 'border/subtle', r: 20 });
  const c1 = AL('VERTICAL', { name: 'Intro', gap: 24, w: 880 });
  const ov = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(ov, await T('PROTOTYPE FLOW · ' + FLOW.pri + ' · PAGE 11', 'Overline', 'text/brand'), await DEMO('S'));
  add(c1, ov, await T(FLOW.name, 'Heading/H1', 'text/primary', { w: 880 }), await T(FLOW.goal, 'Body/L', 'text/secondary', { w: 880 }));
  const how = AL('VERTICAL', { name: 'How to play', gap: 8, p: 24, fill: 'surface/raised', r: 14, w: 880 });
  add(how, await T('How to play', 'Label/L', 'text/primary'), await T('Present ▶ → Flows → "' + FLOW.flowName + '". Click the dashed hotspots for the happy path. The prototype bar on top of every frame holds Simulate chips for the error branches plus Back and Restart — every frame has a way out.', 'Body/M', 'text/secondary', { w: 832 }));
  const lg = AL('VERTICAL', { name: 'Legend', gap: 10 });
  for (const [c, t] of [['brand/primary', 'Happy path — click the dashed hotspot'], ['status/warning', 'Error branch — Simulate chip or a failing action'], ['status/info', 'Alternate outcome — still a valid end state']]) { const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(r, rect(56, 4, c, 0, 'Legend line'), await T(t, 'Body/S', 'text/secondary')); add(lg, r); }
  const ck = AL('VERTICAL', { name: 'Rules this flow proves', gap: 10 }); add(ck, await T('Rules this flow proves', 'Label/L', 'text/primary'));
  for (const s of FLOW.checks) { const r = AL('HORIZONTAL', { gap: 10 }); add(r, await IC('shield-check', 16, 'icon/brand'), await T(s, 'Body/S', 'text/secondary', { w: 840 })); add(ck, r); }
  add(c1, how, lg, ck);
  const c2 = AL('VERTICAL', { name: 'Happy path', gap: 14, w: 1040 }); add(c2, await T('Happy path', 'Heading/H4', 'text/primary'));
  const mains = MAINS();
  for (let i = 0; i < mains.length; i++) {
    const f = mains[i]; const nx = mains[i + 1];
    const out = nx ? FLOW.links.find(l => l.from === f.k && l.to === nx.k) : null;
    const loops = FLOW.links.filter(l => l.from === f.k && l.loop).map(l => 'Loop: ' + linkLabel(l) + ' → ' + (FLOW.frames.find(x => x.k === l.to) || {}).step);
    const r = AL('HORIZONTAL', { gap: 16 }); const st = AL('VERTICAL', { gap: 2 });
    add(st, await T(f.title + '  ·  ' + f.code, 'Label/L', 'text/primary', { w: 980 }), await T((out ? linkLabel(out) + ' → step ' + nx.step : 'End of flow — Restart or Back from the prototype bar') + (loops.length ? '. ' + loops.join('. ') : ''), 'Body/S', 'text/secondary', { w: 980 }));
    add(r, await circ(f.step, 'brand/primary'), st); add(c2, r);
  }
  const c3 = AL('VERTICAL', { name: 'Branches', gap: 14, w: 1040 }); add(c3, await T('Branches & alternate outcomes', 'Heading/H4', 'text/primary'));
  for (const f of FLOW.frames.filter(f => String(f.step).startsWith('B'))) {
    const inl = FLOW.links.find(l => l.to === f.k);
    const from = inl ? FLOW.frames.find(x => x.k === inl.from) : null;
    const r = AL('HORIZONTAL', { gap: 16 }); const st = AL('VERTICAL', { gap: 2 });
    add(st, await T(f.title + '  ·  ' + f.code, 'Label/L', 'text/primary', { w: 980 }), await T(f.cond, 'Body/S', 'text/secondary', { w: 980 }));
    if (from) add(st, await T('From ' + (String(from.step).startsWith('B') ? 'branch ' : 'step ') + from.step + ' via ' + (inl.chip && !inl.hot ? 'Simulate chip "' + inl.chip + '"' : 'hotspot "' + linkLabel(inl) + '"') + (f.exit ? ' · exit: ' + f.exit : ''), 'Caption', 'text/tertiary', { w: 980 }));
    add(r, await circ(f.step, COLOR(f.kind)), st); add(c3, r);
  }
  add(card, c1, c2, c3);
  sub.appendChild(card); card.x = 120; card.y = 120; return card;
}
