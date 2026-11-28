// ===== ROULETTE KIT — felt, wheel stage, slip (agent g-roulette) =====
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
function colorOf(n) { return n === 0 ? 'Green' : REDS.includes(n) ? 'Red' : 'Black'; }
async function chipI(value, size = 28, state = 'Default') { const c = await I('23:12227', { Value: String(value), State: state }); if (size !== 64) c.rescale(size / 64); c.name = 'Game/Chip — ' + value; return c; }
async function nestedChips(inst) { const out = []; for (const n of inst.findAll(x => x.type === 'INSTANCE')) { let m = null; try { m = await n.getMainComponentAsync(); } catch (e) { } if (m && m.parent && m.parent.id === '23:12227') out.push(n); } return out; }
async function cell(n, state = 'Default', w, h, chipVal) {
  const c = await I('25:16416', { Color: colorOf(n), State: state }); c.name = 'Cell ' + n;
  await setText(c, 'Number', String(n));
  if (w && h && (Math.abs(c.width - w) > 0.5 || Math.abs(c.height - h) > 0.5)) c.resize(w, h);
  if (state === 'Bet placed' || state === 'Winning') { const chs = await nestedChips(c); for (const k of chs) { if (!chipVal) k.visible = false; else if (String(chipVal) !== '5') { try { k.setProperties({ Value: String(chipVal) }); } catch (e) { } } } }
  return c;
}
// outside / column bet box. st: default | bet | hover | win | lose | off
async function obox(label, w, h, o = {}) {
  const st = o.st || 'default';
  const b = AL(o.vertical ? 'VERTICAL' : 'HORIZONTAL', { name: 'Bet — ' + label, gap: o.vertical ? 4 : 6, w, h, r: 6, align: 'CENTER', justify: 'CENTER', fill: st === 'win' ? 'brand/tint' : st === 'hover' ? 'surface/hover' : 'surface/raised', stroke: st === 'win' ? 'border/focus' : st === 'hover' ? 'border/brand' : 'border/default', sw: st === 'win' ? 2 : 1 });
  if (o.dot) { const d = ellipse(12, 12, o.dot, 'Colour dot'); stroke(d, 'border/strong', 1); add(b, d); }
  add(b, await T(label, o.style || 'Label/M', st === 'off' ? 'text/disabled' : st === 'win' ? 'text/brand' : 'text/primary', { name: 'Bet label' }));
  if (o.chip) add(b, await chipI(o.chip, o.chipSize || 28));
  if (st === 'lose') b.opacity = 0.45;
  if (st === 'off') b.opacity = 0.6;
  return b;
}
function oState(o, key) { return (o.ostate && o.ostate[key]) || (o.obets && o.obets[key] ? 'bet' : 'default'); }
// Horizontal felt (desktop / tablet). o: {cw, ch, g, p, cells:{n:state}, bets:{n:chip}, obets:{label:chip}, ostate:{label:st}, marks:[], tip}
async function felt(o = {}) {
  const cw = o.cw || 56, ch = o.ch || 64, g = o.g || 4, p = o.p || 12;
  const F = AL('VERTICAL', { name: 'Felt', gap: g, p, r: 14, fill: 'bg/secondary', stroke: 'border/default' });
  const st = n => (o.cells && o.cells[n]) || 'Default';
  const A = AL('HORIZONTAL', { name: 'Numbers', gap: g }); add(F, A);
  add(A, await cell(0, st(0), cw, 3 * ch + 2 * g, o.bets && o.bets[0]));
  const grid = AL('VERTICAL', { name: 'Grid 1–36', gap: g }); add(A, grid);
  for (const r of [0, 1, 2]) { const row = AL('HORIZONTAL', { name: 'Row ' + (3 - r), gap: g }); for (let c = 0; c < 12; c++) { const n = 3 * c + (3 - r); add(row, await cell(n, st(n), cw, ch, o.bets && o.bets[n])); } add(grid, row); }
  const cols = AL('VERTICAL', { name: 'Column bets', gap: g }); add(A, cols);
  for (const [k, lab] of [['Col 3', '2:1'], ['Col 2', '2:1'], ['Col 1', '2:1']]) { const bx = await obox(lab, cw, ch, { st: oState(o, k), chip: o.obets && o.obets[k], style: 'Label/S', chipSize: 24 }); bx.name = 'Bet — ' + k; add(cols, bx); }
  const pad0 = () => AL('HORIZONTAL', { name: 'Offset', w: cw, h: 4 });
  const B = AL('HORIZONTAL', { name: 'Dozens', gap: g }); add(F, B); add(B, pad0());
  for (const k of ['1st 12', '2nd 12', '3rd 12']) add(B, await obox(k, 4 * cw + 3 * g, Math.round(ch * 0.75), { st: oState(o, k), chip: o.obets && o.obets[k] }));
  const Cc = AL('HORIZONTAL', { name: 'Even-money bets', gap: g }); add(F, Cc); add(Cc, pad0());
  for (const [k, dot] of [['1–18'], ['EVEN'], ['RED', 'status/danger-strong'], ['BLACK', 'ink/950'], ['ODD'], ['19–36']]) add(Cc, await obox(k, 2 * cw + g, Math.round(ch * 0.75), { st: oState(o, k), chip: o.obets && o.obets[k], dot }));
  // overlay marks (chips on lines/corners) + hover outline + tooltip
  const cx = c => p + cw + g + c * (cw + g); const cy = r => p + r * (ch + g);
  const pos = n => ({ c: Math.ceil(n / 3) - 1, r: n % 3 === 0 ? 0 : n % 3 === 2 ? 1 : 2 });
  const pts = [];
  for (const m of (o.marks || [])) {
    let x, y; const a = pos(m.a);
    if (m.type === 'split') { const b = pos(m.b); if (a.r === b.r) { x = cx(Math.max(a.c, b.c)) - g / 2; y = cy(a.r) + ch / 2; } else { x = cx(a.c) + cw / 2; y = cy(Math.max(a.r, b.r)) - g / 2; } }
    else if (m.type === 'street') { x = cx(a.c) + cw / 2; y = cy(2) + ch + g / 2; }
    else if (m.type === 'corner') { x = cx(a.c + 1) - g / 2; y = cy(a.r) - g / 2; }
    else if (m.type === 'line') { x = cx(a.c + 1) - g / 2; y = cy(2) + ch + g / 2; }
    else { x = cx(a.c) + cw / 2; y = cy(a.r) + ch / 2; }
    pts.push({ m, x, y });
  }
  if (o.outline) { const ns = o.outline.map(pos); const x0 = Math.min(...ns.map(q => cx(q.c))) - 3, x1 = Math.max(...ns.map(q => cx(q.c) + cw)) + 3, y0 = Math.min(...ns.map(q => cy(q.r))) - 3, y1 = Math.max(...ns.map(q => cy(q.r) + ch)) + 3; const ol = rect(x1 - x0, y1 - y0, null, 10, 'Hover outline'); stroke(ol, 'border/focus', 2); F.appendChild(ol); ol.layoutPositioning = 'ABSOLUTE'; ol.x = x0; ol.y = y0; }
  for (const q of pts) { const k = await chipI(q.m.value || '1', 24); F.appendChild(k); k.layoutPositioning = 'ABSOLUTE'; k.x = Math.round(q.x - 12); k.y = Math.round(q.y - 12); k.name = 'Chip on felt — ' + q.m.type + ' ' + q.m.label; }
  if (o.tip) { const t = await I('20:10849', { Type: 'Info', Placement: 'Top' }, { Text: o.tip.text }); t.name = 'Tooltip — ' + o.tip.text.slice(0, 30); F.appendChild(t); t.layoutPositioning = 'ABSOLUTE'; const q = pts.find(z => z.m.label === o.tip.at) || pts[0]; if (q) { t.x = Math.round(Math.max(0, q.x - t.width / 2)); t.y = Math.round(q.y - 14 - t.height - 6); } }
  return F;
}
async function feltHint(text) { const r = AL('HORIZONTAL', { name: 'Felt hint', gap: 8, align: 'CENTER' }); add(r, await IC('info', 14, 'icon/muted')); await wrapT(r, text, 'Caption', 'text/tertiary', 600, { name: 'Felt hint text' }); return r; }
async function chipTray(o = {}) {
  const t = AL(o.stack ? 'VERTICAL' : 'HORIZONTAL', { name: 'Chip tray', gap: o.stack ? 12 : 16, p: [12, 16, 12, 16], r: 14, fill: 'bg/secondary', stroke: 'border/subtle', align: o.stack ? null : 'CENTER' });
  const head = o.stack ? AL('HORIZONTAL', { name: 'Chip tray head', gap: 12, align: 'CENTER' }) : t; if (o.stack) add(t, [head, 'FILL']);
  const lab = AL('VERTICAL', { name: 'Chip tray label', gap: 2 }); add(lab, await T('Chip value', 'Label/M', 'text/secondary'), await T(o.sub || 'Pick, then tap the felt', 'Caption', 'text/tertiary', { name: 'Chip tray sub' })); add(head, lab);
  const row = AL('HORIZONTAL', { name: 'Chips', gap: 4, align: 'CENTER' });
  for (const v of ['0.10', '1', '5', '10', '25', '100', '500']) add(row, await chipI(v, o.size || 48, o.off ? 'Disabled' : (v === (o.sel || '5') ? 'Selected' : 'Default')));
  if (!o.stack) add(t, row);
  addSpacer(head);
  const acts = AL('HORIZONTAL', { name: 'Table actions', gap: 8, align: 'CENTER' }); add(head, acts); if (o.stack) add(t, row);
  for (const [l, ic] of [['Undo', 'undo'], ['Clear', 'trash'], ['Repeat', 'refresh']]) add(acts, await BTN('Secondary', l, { size: 'M', lead: ic, state: o.off ? 'Disabled' : (o.disable && o.disable.includes(l) ? 'Disabled' : 'Default') }));
  return t;
}
async function outcomeCard(rows, foot) {
  const c = await card('Outcome preview', { title: 'If the ball lands on…', icon: 'target', demo: 'XS', p: 16, gap: 10, fill: 'bg/secondary' });
  for (const [lab, cnt, net, tone] of rows) { const r = AL('HORIZONTAL', { name: 'Outcome — ' + lab, gap: 8, align: 'CENTER' }); add(r, await T(lab, 'Body/S', 'text/secondary', { name: 'Outcome label' })); addSpacer(r); add(r, await T(cnt, 'Caption', 'text/tertiary', { name: 'Pockets' }), await T(net, 'Number/S', tone === 'win' ? 'text/success' : tone === 'lose' ? 'text/danger' : 'text/primary', { name: 'Net' })); add(c, [r, 'FILL']); }
  if (foot) await wrapT(c, foot, 'Caption', 'text/tertiary', 400, { name: 'Outcome foot' });
  return c;
}
async function payTable(title, rows, foot) {
  const c = await card(title, { title, icon: 'book', p: 16, gap: 8, fill: 'bg/secondary' });
  const hd = AL('HORIZONTAL', { name: 'Pay head', gap: 8 }); for (const [l, w] of [['BET', 0], ['COVERS', 72], ['PAYS', 56], ['CHANCE', 64]]) { const x = await T(l, 'Overline', 'text/tertiary'); if (w) { x.resize(w, x.height); x.textAutoResize = 'HEIGHT'; x.textAlignHorizontal = 'RIGHT'; } add(hd, x); if (!w) x.layoutGrow = 1; } add(c, [hd, 'FILL']);
  for (const r0 of rows) { const [lab, how, cov, pays, chance, hl] = r0; const r = AL('HORIZONTAL', { name: 'Pay — ' + lab, gap: 8, align: 'CENTER', p: [6, 8, 6, 8], r: 6, fill: hl ? 'brand/tint-subtle' : null, stroke: hl ? 'border/brand' : null }); const col = AL('VERTICAL', { name: 'Bet text', gap: 2 }); add(col, await T(lab, 'Body/S Strong', hl ? 'text/brand' : 'text/primary')); if (how) await wrapT(col, how, 'Caption', 'text/tertiary', 200); add(r, col); grow(col); for (const [v, w] of [[cov, 72], [pays, 56], [chance, 64]]) { const x = await T(v, 'Number/S', 'text/primary'); x.resize(w, x.height); x.textAutoResize = 'HEIGHT'; x.textAlignHorizontal = 'RIGHT'; add(r, x); } add(c, [r, 'FILL']); }
  if (foot) await wrapT(c, foot, 'Caption', 'text/tertiary', 400, { name: 'Pay foot' });
  return c;
}
async function limitsCard(o = {}) {
  const c = await card('Limits & odds', { title: 'Limits & odds', icon: 'scale', w: o.w || 360 });
  for (const [l, v, d, col] of (o.rows || [['Per spot', '0.10 – 1,000.00 USDT'], ['Table max per spin', '5,000.00 USDT'], ['This spin', '20.00 / 5,000.00 USDT', true], ['House edge', '2.70% on every bet'], ['Fees', '0.00 USDT']])) add(c, [await kv(l, v, { vstyle: 'Body/S Strong', demo: d, color: col }), 'FILL']);
  await wrapT(c, 'No platform or network fee on game bets. The 0.05 USDT fee applies to Global Pool entries only.', 'Caption', 'text/tertiary', 300, { name: 'Fee note' });
  const risk = AL('HORIZONTAL', { name: 'Risk note', gap: 8 }); add(risk, await IC('alert-circle', 16, 'icon/muted')); await wrapT(risk, o.risk || 'You can lose your stake. Each spin is independent — previous numbers never change the odds of the next one.', 'Caption', 'text/secondary', 280, { name: 'Risk text' }); add(c, [risk, 'FILL']);
  return c;
}
async function slipI(st) { const s = await I('23:16674', { State: st.slip || 'Filled' }); s.name = 'Game/Bet Slip'; let n = 0; if (st.slipMap) n += await repl(s, st.slipMap); if (st.slipSub) n += await repl(s, st.slipSub, true); if (st.slipCta) { const b = s.findAll(x => x.type === 'INSTANCE' && x.name.indexOf('Button') >= 0).find(x => Object.keys(x.componentProperties).some(k => k.startsWith('Label')) && x.height >= 44); if (b) { const lk = Object.keys(b.componentProperties).find(k => k.startsWith('Label')); const pr = {}; pr[lk] = st.slipCta.label; b.setProperties(pr); if (st.slipCta.state) { try { b.setProperties({ State: st.slipCta.state }); } catch (e) { } } n++; } } return { s, n }; }
async function discNum(n, size = 28, o = {}) { const col = colorOf(n); const d = AL('HORIZONTAL', { name: 'Pocket ' + n, w: size, h: size, r: 9999, align: 'CENTER', justify: 'CENTER', fill: col === 'Red' ? 'status/danger-strong' : col === 'Green' ? 'status/success' : 'ink/950', stroke: o.newest ? 'border/focus' : 'border/strong', sw: o.newest ? 2 : 1 }); add(d, await T(String(n), size >= 48 ? 'Heading/H3' : size >= 32 ? 'Label/M' : 'Label/S', col === 'Green' ? 'text/on-primary' : 'text/primary', { name: 'Pocket number' })); return d; }
async function sideCol(st, w) {
  const S = ALV({ name: 'Spin status', gap: 16, w });
  const ph = st.phase;
  const pr = AL('HORIZONTAL', { name: 'Phase row', gap: 8, align: 'CENTER' }); add(pr, await IC(ph.icon || 'roulette', 16, ph.iconColor || 'icon/brand'), await T(ph.label, 'Overline', ph.color || 'text/brand', { name: 'Phase label' })); add(S, pr);
  if (st.pocket != null) { const pk = AL('HORIZONTAL', { name: 'Winning pocket', gap: 16, align: 'CENTER' }); add(pk, await discNum(st.pocket, 64, { newest: true })); const pc = AL('VERTICAL', { name: 'Pocket facts', gap: 4 }); add(pc, await T(ph.title, 'Heading/H2', 'text/primary', { name: 'Phase title' })); await wrapT(pc, st.pocketFacts, 'Body/S', 'text/secondary', 300, { name: 'Pocket facts text' }); add(pk, pc); grow(pc); add(S, [pk, 'FILL']); }
  else { await wrapT(S, ph.title, 'Heading/H2', 'text/primary', w, { name: 'Phase title' }); }
  if (ph.body) await wrapT(S, ph.body, 'Body/S', 'text/secondary', w, { name: 'Phase body' });
  if (st.result) { const rb = await I('23:19422', { Result: st.result.v }); rb.name = 'Game/Result Banner'; add(S, rb); tryFill(rb); st._resMiss = await setTexts(rb, st.result.t || {}); if (st.result.r) st._resN = await repl(rb, st.result.r, true); }
  if (st.outcome) add(S, [await outcomeCard(st.outcome, st.outcomeFoot), 'FILL']);
  if (st.pay) add(S, [await payTable(st.pay.title, st.pay.rows, st.pay.foot), 'FILL']);
  if (st.settle) { const c = await card('Settlement', { title: st.settle.title, icon: 'receipt', p: 16, gap: 8, fill: 'bg/secondary', demo: 'XS' }); for (const [l, v, tone] of st.settle.rows) add(c, [await kv(l, v, { color: tone === 'win' ? 'text/success' : tone === 'lose' ? 'text/danger' : 'text/primary', lstyle: tone === 'total' ? 'Body/S Strong' : 'Body/S', lcolor: tone === 'total' ? 'text/primary' : 'text/secondary' }), 'FILL']); add(S, [c, 'FILL']); }
  if (st.motion) { const mn = AL('HORIZONTAL', { name: 'Motion note', gap: 6, p: [4, 10, 4, 8], r: 9999, stroke: 'border/subtle', align: 'CENTER' }); add(mn, await IC('timer', 14, 'icon/muted'), await T(st.motion, 'Caption', 'text/tertiary', { name: 'Motion note text' })); add(S, mn); }
  return S;
}
async function wheelI(state, size) { const wl = await I('25:15363', { State: state || 'Idle' }); wl.name = 'Game/Roulette Wheel'; if (size && size !== 360) wl.rescale(size / 360); return wl; }
async function stage(st, inner, o = {}) {
  const S = AL('VERTICAL', { name: 'Stage', gap: 20, p: o.p || 24, r: 20, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' });
  const top = AL('HORIZONTAL', { name: 'Stage top', gap: 12, align: 'CENTER' });
  const tl = AL('VERTICAL', { name: 'Spin id', gap: 4 }); add(tl, await T(st.top.label, 'Overline', st.top.color || 'text/tertiary', { name: 'Spin label' }));
  const mr = AL('HORIZONTAL', { name: 'Spin meta row', gap: 6, align: 'CENTER' }); add(mr, await T(st.top.meta, 'Caption', 'text/secondary', { name: 'Spin meta' }), await DEMO('XS')); add(tl, mr); add(top, tl); addSpacer(top);
  add(top, await chip('hash', '37 pockets · 0–36')); add(S, [top, 'FILL']);
  const wsize = o.wheel || 360;
  const wr = AL('HORIZONTAL', { name: 'Wheel row', gap: 32, align: 'CENTER' }); add(S, [wr, 'FILL']);
  add(wr, await wheelI(st.wheel, wsize)); add(wr, await sideCol(st, inner - wsize - 32));
  const F = await felt(Object.assign({}, st.felt || {}, o.feltDims || {})); add(S, F);
  if (st.feltOff) F.opacity = 0.55;
  add(S, [await feltHint(st.hint || 'Tap a number for a straight bet · the line between two numbers = split · outer edge of a column = street · where four meet = corner · edge between two columns = line · right-click or long-press removes a chip'), 'FILL']);
  return S;
}
const PLAY = {
  balance: '9,215.30', topbar: 'Member', rg: 'Normal', rgMap: null, wheel: 'Idle',
  top: { label: 'BETS OPEN · SPIN RL-88191', meta: 'Nonce 417 · server seed hash 8f3c1e…e813 committed before you bet' },
  phase: { label: 'PLACE YOUR BETS', title: 'Place your bets', body: 'Pick a chip, then tap the felt. Bets close when you press Spin — the pocket is fixed by your seed pair, the wheel only reveals it.' },
  felt: { cells: { 19: 'Bet placed' }, bets: { 19: '5' }, obets: { 'RED': '10', '2nd 12': '5' } },
  outcome: [['19 — straight + red + dozen', '1 pocket', '+195.00', 'win'], ['Red in 13–24 (14 16 18 21 23)', '5', '+15.00', 'win'], ['Other red numbers', '12', '±0.00'], ['Black in 13–24', '6', '−5.00', 'lose'], ['Any other number, incl. 0', '13', '−20.00', 'lose']],
  outcomeFoot: 'Expected return 19.46 USDT for every 20.00 staked — the 2.70% house edge applies to every bet type.',
  tray: { sel: '5' }, slip: 'Filled'
};
async function buildPlay(name, x, y, st0) {
  const st = Object.assign({}, PLAY, st0); const w = st.w || 1440; const tab = w < 1000;
  const S = await shellD(name, w, x, y, { collapsed: true, topbar: st.topbar, balance: st.balance, region: st.region, pad: tab ? [24, 24, 40, 24] : [24, 32, 48, 32] });
  const C = S.C; const notes = { sidebarItem: S.found, balance: S.balOk };
  add(C, [await gameHeader({ tablet: tab, muted: st.muted }), 'FILL']);
  if (st.alert) { const ab = await I('30:17116', { Type: st.alert, Layout: 'Inline' }); ab.name = 'Alert/Banner — ' + st.alert; add(C, ab); notes.alertFill = tryFill(ab); if (st.alertMap) notes.alertN = await repl(ab, st.alertMap, true); }
  if (!tab) { const rg = await rgBar(st.rg, st.rgMap); add(C, rg.b); notes.rgFill = tryFill(rg.b); notes.rgN = rg.n; }
  else if (st.rgStrip) add(C, [await st.rgStrip(), 'FILL']);
  const inner = w - 72 - (tab ? 48 : 64); let stg, slip;
  if (!tab) {
    const row = AL('HORIZONTAL', { name: 'Game area', gap: 24 }); add(C, [row, 'FILL']);
    const tcol = AL('VERTICAL', { name: 'Table column', gap: 16 }); add(row, [tcol, 'FILL']);
    stg = await stage(st, inner - 360 - 24 - 48); add(tcol, [stg, 'FILL']);
    add(tcol, [await chipTray(st.tray), 'FILL']);
    const bcol = ALV({ name: 'Bet column', gap: 16, w: 360 }); add(row, bcol);
    const si = await slipI(st); slip = si.s; notes.slipN = si.n; add(bcol, [slip, 'FILL']);
    add(bcol, [await limitsCard(st.limits || {}), 'FILL']);
    if (st.slipNotice) add(bcol, [await callout(st.slipNotice), 'FILL']);
  } else {
    stg = await stage(st, inner - 32, { p: 16, wheel: 200, feltDims: { cw: 40, ch: 52, g: 2, p: 12 } }); add(C, [stg, 'FILL']);
    add(C, [await chipTray(Object.assign({ size: 48, stack: true, sub: 'Tap a chip, then the felt' }, st.tray)), 'FILL']);
    const row = AL('HORIZONTAL', { name: 'Slip & limits', gap: 16 }); add(C, [row, 'FILL']);
    const si = await slipI(st); slip = si.s; notes.slipN = si.n; add(row, slip);
    const lc = await limitsCard({ rows: [['Per spot', '0.10 – 1,000.00'], ['Table max', '5,000.00 / spin'], ['This spin', '20.00 USDT', true], ['House edge', '2.70%'], ['Fees', '0.00 USDT']] }); add(row, [lc, 'FILL']);
  }
  const low = AL(tab ? 'VERTICAL' : 'HORIZONTAL', { name: 'History & seeds', gap: 24 }); add(C, [low, 'FILL']);
  const hs = await I('23:23256', { Game: 'Roulette' }); hs.name = 'Game/History Strip'; add(low, hs); notes.hsFill = tryFill(hs); if (st.histMap) notes.histN = await repl(hs, st.histMap);
  const sd = await I('23:23401', { State: st.seed || 'Active' }); sd.name = 'Game/Seed Display'; add(low, sd); tryFill(sd);
  if (st.extra) await st.extra(C, S);
  add(C, [await compliance({ wrap: tab, compact: tab }), 'FILL']);
  if (st.block) blockStage(stg, await prompt(st.block), st.blockY || 120);
  notes.resMiss = st._resMiss; notes.resN = st._resN;
  return { f: S.f, stg, slip, C, hs, notes, tb: S.tb };
}
// ===== END ROULETTE KIT — felt =====
