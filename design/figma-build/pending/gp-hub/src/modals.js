function row(kids, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Row', gap: o.gap ?? 8, align: o.align || 'CENTER', justify: o.justify }); add(r, ...kids); return r; }
function col(kids, o = {}) { const r = AL('VERTICAL', { name: o.name || 'Stack', gap: o.gap ?? 4, align: o.align }); add(r, ...kids); return r; }
async function wrapT(parent, text, style, color, w, name) { const t = await T(text, style, color, { w, name }); parent.appendChild(t); t.layoutSizingHorizontal = 'FILL'; return t; }
function bar(w, pct, color = 'brand/primary') { const tr = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, w, h: 6 }); const f = rect(Math.max(6, Math.round(w * pct)), 6, color, 9999, 'Meter fill'); add(tr, f); return tr; }
// modal shell (W = 560 desktop, 390 mobile sheet). sheet=true -> top radius 28 + grabber, no close icon
async function modalShell(W, title, sub, icon, iconColor, tile, sheet) {
  const m = AL('VERTICAL', { name: 'Modal — ' + title, fill: 'surface/overlay', stroke: 'border/subtle', r: sheet ? 0 : 20, clip: true }); m.resize(W, 100); m.counterAxisSizingMode = 'FIXED';
  if (sheet) { for (const c of ['topLeftRadius', 'topRightRadius']) m.setBoundVariable(c, VAR['radius/2xl']); const g = AL('HORIZONTAL', { name: 'Handle', p: [8, 0, 4, 0], justify: 'CENTER' }); add(g, rect(40, 4, 'border/strong', 9999, 'Grabber')); add(m, [g, 'FILL']); }
  await fx(m, 'Elevation/4 — Modal');
  const P = sheet ? 16 : 24;
  const hd = AL('HORIZONTAL', { name: 'Header', p: [sheet ? 8 : 24, P, 20, P], gap: 16, align: 'MIN' }); strokeSides(hd, 'border/subtle', { b: 1 }); add(m, [hd, 'FILL']);
  const tl = AL('HORIZONTAL', { name: 'Icon tile', fill: tile, r: 10, w: 44, h: 44, align: 'CENTER', justify: 'CENTER' }); add(tl, await IC(icon, 22, iconColor)); add(hd, tl);
  const tg = AL('VERTICAL', { name: 'Title group', gap: 4 }); add(hd, [tg, 'FILL']);
  if (sheet) { const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'MIN' }); add(tg, [tr, 'FILL']); const tt = await T(title, 'Heading/H5', 'text/primary', { w: 160, name: 'Title' }); add(tr, [tt, 'FILL']); add(tr, await DEMO('S')); }
  else add(tg, row([await T(title, 'Heading/H4', 'text/primary', { name: 'Title' }), await DEMO('S')], { gap: 8 }));
  await wrapT(tg, sub, 'Body/S', 'text/secondary', W - 2 * P - 120, 'Subtitle');
  add(hd, await I('7:774', { Type: 'Ghost', Size: sheet ? 'M' : 'S', State: 'Default' }, { Icon: ICONS.x }));
  const body = AL('VERTICAL', { name: 'Body', p: [20, P, 20, P], gap: 16 }); add(m, [body, 'FILL']);
  const ft = AL('VERTICAL', { name: 'Footer', p: [16, P, sheet ? 34 : 24, P], gap: 12 }); strokeSides(ft, 'border/subtle', { t: 1 }); add(m, [ft, 'FILL']);
  return { m, body, ft, iw: W - 2 * P };
}
async function stepItem(state, title, desc, iw, extra) {
  const it = AL('HORIZONTAL', { name: 'Step — ' + title, gap: 12, align: 'MIN' });
  const S = { done: ['status/success-tint', 'check', 'status/success'], current: ['status/info-tint', 'spinner', 'status/info'], next: [null, null, null] }[state];
  const dot = AL('HORIZONTAL', { name: 'Indicator', r: 9999, w: 28, h: 28, align: 'CENTER', justify: 'CENTER', fill: S[0] || undefined, stroke: S[0] ? undefined : 'border/strong' });
  if (S[1]) add(dot, await IC(S[1], 16, S[2])); else add(dot, await T('3', 'Label/M', 'text/tertiary'));
  add(it, dot);
  const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(it, [c, 'FILL']);
  await wrapT(c, title, 'Label/L', state === 'next' ? 'text/secondary' : 'text/primary', iw - 40); await wrapT(c, desc, 'Body/S', 'text/tertiary', iw - 40);
  if (extra) add(c, extra);
  return it;
}
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, justify: 'SPACE_BETWEEN', align: 'CENTER', gap: 12 }); add(r, await T(label, 'Body/S', 'text/secondary'), await T(value, o.style || 'Label/M', o.color || 'text/primary')); return r; }
async function callout(text, tone, icon, iw) { const c = AL('HORIZONTAL', { name: 'Callout', gap: 10, p: 12, fill: tone + '-tint', r: 10, align: 'MIN' }); add(c, await IC(icon, 18, tone)); await wrapT(c, text, 'Body/S', 'text/secondary', iw - 52); return c; }
async function pendingBody(body, ft, iw, mobile) {
  const sum = AL(mobile ? 'VERTICAL' : 'HORIZONTAL', { name: 'Amount', p: 16, gap: 8, fill: 'surface/raised', r: 14, justify: mobile ? undefined : 'SPACE_BETWEEN', align: mobile ? undefined : 'CENTER' }); add(body, [sum, 'FILL']);
  add(sum, col([await T('YOU PAY', 'Overline', 'text/tertiary'), await T('351.75 USDT', 'Number/L', 'text/primary')], { gap: 4 }), col([await T('35 × 10.00 = 350.00 USDT', 'Caption', 'text/secondary'), await T('Platform fee 35 × 0.05 = 1.75 USDT', 'Caption', 'text/secondary'), await T('Network fee 0.00 USDT', 'Caption', 'text/secondary')], { gap: 2, align: mobile ? undefined : 'MAX' }));
  const steps = AL('VERTICAL', { name: 'Progress steps', gap: 16 }); add(body, [steps, 'FILL']);
  add(steps, [await stepItem('done', 'Balance reserved', '351.75 USDT moved from Available to Locked at 16:42:20 UTC.', iw), 'FILL']);
  const h = await I('20:5893', { State: 'Default' }, { Hash: '0x3a7c…9e02' });
  add(steps, [await stepItem('current', 'Recording 35 entries on Arbitrum', 'GLOBAL POOL submits one batch transaction for you · 2 of 3 confirmations.', iw, h), 'FILL']);
  add(steps, [await stepItem('next', 'Entry receipt', 'IDs E-1248-00981 … E-1248-01015 are issued when the batch confirms, usually in under a minute.', iw), 'FILL']);
  add(body, col([bar(iw, 0.66, 'status/info'), await T('Step 2 of 3 · about 20 seconds left', 'Caption', 'text/tertiary')], { gap: 6, name: 'Progress' }));
  add(body, [await callout('Round #1,248 closes at 20:00:00 UTC. Entries recorded before close are in the draw. If recording fails, 351.75 USDT goes straight back to Available — nothing is charged.', 'status/info', 'info', iw), 'FILL']);
  const b = AL(mobile ? 'VERTICAL' : 'HORIZONTAL', { name: 'Actions', gap: 12 }); add(ft, [b, 'FILL']);
  const c1 = await BTN('Secondary', 'Close — we’ll notify you', { size: 'L' }); const c2 = await BTN('Gold', 'Confirming 35 entries…', { size: 'L', state: 'Loading' }); if (mobile) add(b, [c2, 'FILL'], [c1, 'FILL']); else add(b, [c1, 'FILL'], [c2, 'FILL']);
  add(ft, row([await I('6:159'), await T('You can lose your stake. Closing this window does not cancel your entries.', 'Caption', 'text/tertiary', { w: iw - 50 })], { gap: 8 }));
}
async function successBody(body, ft, iw, mobile) {
  const tk = await I('23:8534', { State: 'Active' });
  if (mobile) { add(body, tk); tk.rescale(iw / 400); }
  else { const tr = AL('HORIZONTAL', { name: 'Ticket', gap: 16, align: 'CENTER' }); add(body, [tr, 'FILL']); add(tr, tk, col([await T('×35', 'Number/L', 'text/primary'), await T('entries in this round', 'Caption', 'text/tertiary', { w: 96 })], { gap: 2 })); }
  const rc = AL('VERTICAL', { name: 'Receipt', p: 16, gap: 10, fill: 'surface/raised', r: 14 }); add(body, [rc, 'FILL']);
  for (const [l, v, s] of [['Round', '#1,248 · Global Pool'], ['Entry IDs', 'E-1248-00981 … 01015', 'Mono/S'], ['Draw', '27 Nov 2026, 20:00:00 UTC'], ['Randomness', 'Chainlink VRF · Arbitrum']]) { const r = await kv(l, v, { style: s }); add(rc, [r, 'FILL']); }
  const fb = await I('20:8583', { Type: 'Entry' }); add(body, [fb, 'FILL']);
  const lk = await kv('Locked until the draw', '350.00 USDT', { color: 'balance/locked' }); add(body, [lk, 'FILL']);
  const h = await I('20:5893', { State: 'Default' }, { Hash: '0x3a7c…9e02' }); add(body, h);
  add(body, [await callout('≈2.44% chance of any of the 13 prizes · ≈0.188% chance of 1st. Results are published with the VRF proof after 20:00 UTC.', 'status/info', 'percent', iw), 'FILL']);
  const lim = col([row([await T('Today’s participation', 'Caption', 'text/tertiary'), await T('351.75 / 500.00 USDT', 'Label/M', 'text/primary')], { gap: 8, justify: 'SPACE_BETWEEN' }), bar(iw, 0.7035)], { gap: 6, name: 'RG limit' }); add(body, [lim, 'FILL']); lim.children[0].layoutSizingHorizontal = 'FILL';
  const b = AL(mobile ? 'VERTICAL' : 'HORIZONTAL', { name: 'Actions', gap: 12 }); add(ft, [b, 'FILL']);
  const p1 = await BTN('Primary', 'View my entries', { size: 'L', trail: 'arrow-right' }); const p2 = await BTN('Secondary', 'Back to Global Pool', { size: 'L' }); const p3 = await BTN('Ghost', 'Download receipt', { size: mobile ? 'L' : 'L', lead: 'download' });
  if (mobile) add(b, [p1, 'FILL'], [p2, 'FILL'], [p3, 'FILL']); else add(b, p3, [p2, 'FILL'], [p1, 'FILL']);
}
