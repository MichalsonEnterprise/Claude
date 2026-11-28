// ===== m2: [PUB-06] Leaderboard / 390 — Weekly (default) + Daily (not ranked yet). Data is read from the desktop
// frames 84:103900 (Weekly) and 84:104905 (Daily) on page 03 so mobile and desktop reconcile; fallbacks = 28 Nov dump.
const OPT = 'Points never change game odds, house edge or your Global Pool chances. Set a loss or participation limit before you chase a place.';
const FB = {
  Weekly: { tab: 1, over: 'Weekly tournament · Orbit Rush', title: 'Orbit Rush Sprint', pool: '2,500.00', cd: [['02', 'days'], ['07', 'hrs'], ['16', 'min'], ['42', 'sec']], ends: 'Ends Sun 29 Nov 2026, 23:59 UTC', meta: 'Mon 23 – Sun 29 Nov · top 20 paid', cta: 'Play Orbit Rush',
    podium: [['@orbit_77', '48,210', '1,000.00 USDT'], ['@mira.sol', '41,880', '500.00 USDT'], ['@kestrel', '37,405', '250.00 USDT']], sub: 'Points = USDT wagered on Orbit Rush · updates every 60 s', rows: [['4', '@lumen.eth', '30,120', '75.00'], ['5', '@atlas_q', '26,930', '75.00']],
    pos: { sub: '· #14 this week', rank: '14', handle: '@nova.k (you)', note: 'Your Orbit Rush wagers this week.', pts: '1,284 pts' }, race: { rank: '#14', rankSub: 'this week', pts: '1,284', prize: '22.50 USDT', note: 'Prize places run to #20.' },
    how: ['1 point per 1.00 USDT wagered on Orbit Rush', 'Global Pool entries never earn race points', 'Ends Sun 29 Nov 2026, 23:59 UTC', 'Ties go to whoever reached the score first', 'Prizes paid to your Available balance — no wagering'], prizes: [['1st', '1,000.00 USDT'], ['2nd', '500.00 USDT'], ['3rd', '250.00 USDT'], ['4th–10th', '75.00 each USDT'], ['11th–20th', '22.50 each USDT']], total: '2,500.00 USDT', split: 'Top 20 paid', opt: OPT },
  Daily: { tab: 0, over: 'Daily race · Fri 27 Nov 2026', title: 'Daily Originals race', pool: '250.00', cd: [['07', 'hrs'], ['17', 'min'], ['42', 'sec']], ends: 'Ends 28 Nov 2026, 00:00 UTC', meta: '1,906 players · top 10 paid', cta: 'Browse Originals',
    podium: [['@quasar_9', '4,812', '100.00 USDT'], ['@ember_ray', '3,960', '50.00 USDT'], ['@orbit_77', '3,415', '30.00 USDT']], sub: 'Updates every 60 s · 16:42 UTC',
    rows: [['4', '@velvet.io', '2,980', '10.00'], ['5', '@juno88', '2,644', '10.00'], ['6', '@northwind', '2,301', '10.00'], ['7', '@pixelfox', '2,118', '10.00'], ['8', '@cobalt.k', '1,870', '10.00'], ['9', '@sable', '1,652', '10.00'], ['10', '@zephyr21', '1,509', '10.00'], ['11', '@halcyon', '1,388', '—']],
    pos: { sub: '· not ranked today', rank: '—', handle: '@nova.k (you)', note: 'No Originals wagers yet today. Global Pool entries (351.75 USDT today) don’t earn race points.', pts: '0 pts' }, race: { rank: '—', rankSub: 'not ranked yet', pts: '0', prize: '—', note: 'Wager on any Original before 00:00 UTC to enter today’s race — or skip it. Races are optional and never change odds.' },
    how: ['1 point per 1.00 USDT wagered on any GLOBAL POOL Original', 'Global Pool entries never earn race points', 'Race resets daily at 00:00 UTC', 'Ties go to whoever reached the score first', 'Prizes paid to your Available balance by 28 Nov 2026, 01:00 UTC — no wagering'], prizes: [['1st', '100.00 USDT'], ['2nd', '50.00 USDT'], ['3rd', '30.00 USDT'], ['4th–10th', '10.00 each USDT']], total: '250.00 USDT', split: 'Top 10 paid · 1st 40% · 2nd 20% · 3rd 12% · 4th–10th 4% each', opt: OPT },
};
const INTRO = 'Climb the daily, weekly and monthly races. Points come from real wagers on GLOBAL POOL games — Global Pool entries never earn race points, and races never change your odds.';
const shots = [];
// small fix from m1 review: move the wrench in the 390 maintenance banner off the ticket stub text
try { const mf = await figma.getNodeByIdAsync('215:81600'); const w = mf && mf.findOne(n => n.name === 'Art — open-end wrench'); if (w) { w.x = w.x + 26; w.y = w.y - 22; OUT.notes.push('maintenance 390: wrench moved'); } } catch (e) { OUT.notes.push('wrench fix: ' + e.message); }
function inInst(n) { let p = n.parent; while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
async function readDesk(id) { try { const f = await figma.getNodeByIdAsync(id); if (!f) return null; const texts = f.findAll(n => n.type === 'TEXT' && !inInst(n)).map(t => t.characters); const insts = f.findAll(n => n.type === 'INSTANCE' && !inInst(n)); const rows = insts.filter(n => n.name.startsWith('Table/Leaderboard Row')).map(i => { const o = {}; for (const [k, v] of Object.entries(i.componentProperties)) if (v.type === 'TEXT') o[k.split('#')[0]] = v.value; return o; }); const btn = insts.find(n => n.name.startsWith('Button/Primary')); let cta = null; if (btn) for (const [k, v] of Object.entries(btn.componentProperties)) if (k.startsWith('Label#')) cta = v.value; return { texts, rows, cta }; } catch (e) { OUT.notes.push('readDesk ' + id + ': ' + e.message); return null; } }
function parseLB(d, fb) {
  const o = JSON.parse(JSON.stringify(fb)); if (!d) { OUT.notes.push('desktop frame not readable, fallback data used for ' + fb.title); return o; } const t = d.texts; const at = s => t.indexOf(s); const used = [];
  try { const e = at('Ends in'); if (e > 3) { o.over = t[e - 4]; o.title = t[e - 3]; o.pool = t[e - 2]; const cd = []; let j = e + 1; while (j < t.length - 1 && !t[j].startsWith('Ends ') && cd.length < 5) { cd.push([t[j], t[j + 1]]); j += 2; } if (cd.length) o.cd = cd; if (t[j] && t[j].startsWith('Ends ')) { o.ends = t[j]; o.meta = t[j + 1] || o.meta; } used.push('hero'); } } catch (e) { }
  if (d.cta) o.cta = d.cta;
  try { const pod = []; for (const pl of ['1st place', '2nd place', '3rd place']) { const i = at(pl); if (i > 0) pod.push([t[i - 1], t[i + 2], t[i + 4]]); } if (pod.length === 3 && pod.every(p => p[0] && p[0].startsWith('@'))) { o.podium = pod; used.push('podium'); } } catch (e) { }
  try { const s = at('Standings'); const l = t.indexOf('Live', s); if (s > 0 && l > 0) o.sub = t[l + 1]; } catch (e) { }
  try { const rows = d.rows.filter(r => r.Rank && r.Player).map(r => [r.Rank, r.Player, r.Points, r.Prize]); if (rows.length) { o.rows = rows; used.push('rows ' + rows.length); } } catch (e) { }
  try { const i = at('Your position'); if (i > 0 && /pts$/.test(t[i + 5] || '')) { o.pos = { sub: t[i + 1], rank: t[i + 2], handle: t[i + 3], note: t[i + 4], pts: t[i + 5] }; used.push('position'); } } catch (e) { }
  try { const i = t.findIndex(s => s.startsWith('Your race')); if (i > 0) { const pI = t.indexOf('Points', i), cI = t.indexOf('Current prize', i); if (pI > i && cI > pI) { o.race = { rank: t[i + 1], rankSub: t[i + 2], pts: t[pI + 1], prize: t[cI + 1], note: t[cI + 2] }; used.push('race'); } } } catch (e) { }
  try { const i = at('How points work'), j = t.indexOf('Full race terms', i); if (i > 0 && j > i + 1) { o.how = t.slice(i + 1, j); used.push('how'); } } catch (e) { }
  try { const i = at('Prize breakdown'), j = t.indexOf('Total', i); if (i > 0 && j > i) { const pr = []; for (let k = i + 1; k < j; k += 2) pr.push([t[k], t[k + 1]]); o.prizes = pr; o.total = t[j + 1]; o.split = t[j + 2] || ''; used.push('prizes'); } } catch (e) { }
  try { const i = at('Races are optional'); if (i > 0) o.opt = t[i + 1]; } catch (e) { }
  OUT.notes.push(fb.title + ': desktop fields used = ' + used.join(', '));
  return o;
}
function initials(h) { const s = h.replace(/[^a-z0-9]/gi, ''); return s.slice(0, 2).toUpperCase(); }
function segLabels(s, labels, active) { const segs = s.findAll(x => x.type === 'INSTANCE' && Object.keys(x.componentProperties || {}).some(k => k.startsWith('Label#'))); segs.forEach((g, i) => { if (labels[i] != null) setProp(g, 'Label', labels[i]); try { g.setProperties({ State: i === active ? 'Active' : 'Default' }); } catch (e) { OUT.notes.push('segment state: ' + e.message); } }); s.name = 'Tabs/Segmented — ' + labels.join(' | '); return segs.length; }
async function mrow(r, you, note) {
  const row = AL('HORIZONTAL', { name: 'Rank row — #' + r[0] + (you ? ' (you)' : ''), gap: 10, p: [10, 12, 10, 12], r: 10, align: 'CENTER', fill: you ? 'surface/selected' : null }); if (you) stroke(row, 'border/brand');
  const rk = AL('HORIZONTAL', { name: 'Rank', w: 36, h: 28, r: 9999, fill: you ? 'brand/tint' : 'surface/raised', justify: 'CENTER', align: 'CENTER' }); add(rk, await T(String(r[0]), 'Label/S', you ? 'text/brand' : 'text/secondary'));
  const who = AL('VERTICAL', { gap: 2 }); add(who, await T(r[1], 'Body/S Strong', 'text/primary')); if (note) add(who, [await T(note, 'Caption', 'text/secondary', { w: 170 }), 'FILL']);
  const val = AL('VERTICAL', { gap: 2, align: 'MAX' }); const pz = r[3]; add(val, await T(String(r[2]).replace(/ pts$/, '') + ' pts', 'Label/M', 'text/primary'), await T(!pz || pz === '—' ? 'no prize' : (/USDT/.test(pz) ? pz : pz + ' USDT'), 'Caption', !pz || pz === '—' ? 'text/tertiary' : 'text/gold'));
  add(row, rk, await I('9:238', { Size: 'S' }, { Initials: you ? 'NK' : initials(r[1]) }), [who, 'FILL'], val); return row;
}
async function buildLB(name, x, y, P) {
  const S = await mshell(name, x, y, { auth: 'Member', gap: 24 }); const C = S.C;
  const crumb = AL('HORIZONTAL', { name: 'Breadcrumb', gap: 6, align: 'CENTER' }); add(crumb, await T('Promotions', 'Label/S', 'text/tertiary'), await IC('chevron-right', 14, 'icon/muted'), await T('Leaderboards', 'Label/S', 'text/secondary')); add(C, crumb);
  const hd = AL('VERTICAL', { name: 'Page header', gap: 8 }); add(hd, [await T('Leaderboards', 'Heading/H2', 'text/primary', { w: 358 }), 'FILL'], [await T(INTRO, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']); add(C, [hd, 'FILL']);
  const seg = await I('20:6978', { Segments: '3' }); segLabels(seg, ['Daily', 'Weekly', 'Monthly'], P.tab); add(C, [seg, 'FILL']);
  // race hero card with a cropped trophy object
  const hc = AL('VERTICAL', { name: 'Race card — ' + P.title, fill: 'surface/default', r: 20, p: 20, gap: 12, clip: true }); stroke(hc, 'border/gold'); add(C, [hc, 'FILL']);
  abs(hc, rect(220, 600, 'accent/gold-tint', 0, 'Angled colour block'), 250, -160, 14); const tro = artTrophy(); tro.rescale(0.34); abs(hc, tro, 262, -2);
  const ov = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ov, await IC('trophy', 16, 'icon/gold'), await T(P.over, 'Overline', 'text/gold', { w: 196 })); add(hc, ov);
  add(hc, [await T(P.title, 'Heading/H3', 'text/primary', { w: 220 }), 'FILL']);
  const pr = AL('HORIZONTAL', { gap: 6, align: 'MAX' }); add(pr, await T(P.pool, 'Number/L', 'text/gold'), await T('USDT prize pool', 'Caption', 'text/secondary')); add(hc, pr);
  add(hc, await T('Ends in', 'Caption', 'text/tertiary')); const cdr = AL('HORIZONTAL', { name: 'Countdown — real end time', gap: 8 }); for (const [v, u] of P.cd) { const bx = AL('VERTICAL', { name: 'Box ' + u, fill: 'surface/raised', r: 10, p: [8, 10, 8, 10], gap: 0, align: 'CENTER' }); add(bx, await T(v, 'Number/S', 'text/primary'), await T(u, 'Caption', 'text/tertiary')); add(cdr, [bx, 'FILL']); } add(hc, [cdr, 'FILL']);
  const er = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(er, await T(P.ends, 'Label/S', 'text/secondary'), await DEMO('S')); add(hc, er, await T(P.meta, 'Caption', 'text/tertiary'), [await BTN('Primary', P.cta, { size: 'L' }), 'FILL']);
  const trm = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(trm, await linkRow('Terms apply', 'external-link'), await I('6:159')); add(hc, trm);
  // podium
  const pod = AL('HORIZONTAL', { name: 'Podium — top 3', gap: 8 }); add(C, [pod, 'FILL']);
  for (let i = 0; i < 3; i++) { const r = P.podium[i]; const c = box('Podium — #' + (i + 1) + ' ' + r[0], { gap: 6, p: [12, 8, 12, 8], align: 'CENTER', fill: i === 0 ? 'accent/gold-tint' : 'surface/default', stroke: i === 0 ? 'border/gold' : 'border/subtle' }); const md = AL('HORIZONTAL', { name: 'Medal', w: 28, h: 28, r: 9999, fill: ['vip/gold', 'vip/silver', 'vip/bronze'][i], justify: 'CENTER', align: 'CENTER' }); add(md, await T(String(i + 1), 'Label/S', 'text/on-gold')); add(c, md, await I('9:238', { Size: 'M' }, { Initials: initials(r[0]) }), await T(r[0], 'Label/S', 'text/primary'), await T(r[1] + ' pts', 'Label/M', 'text/primary'), await T(r[2], 'Caption', 'text/gold')); add(pod, [c, 'FILL']); }
  // standings
  const lst = box('Standings', { gap: 4, p: [12, 8, 8, 8] }); const lh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 8, 0, 8] }); add(lh, [await T('Standings', 'Heading/H5', 'text/primary'), 'FILL'], await BADGE('Live', 'S'), await DEMO('XS')); add(lst, [lh, 'FILL']);
  const sb = AL('HORIZONTAL', { p: [0, 8, 6, 8] }); add(sb, [await T(P.sub, 'Caption', 'text/tertiary', { w: 320 }), 'FILL']); add(lst, [sb, 'FILL']);
  const youRow = P.rows.find(r => /nova\.k/.test(r[1])); const shown = P.rows.filter(r => !/nova\.k/.test(r[1]) && Number(String(r[0]).replace(/\D/g, '')) <= 10);
  for (const r of shown) add(lst, [await mrow(r), 'FILL']);
  const last = shown.length ? Number(shown[shown.length - 1][0]) : 3; const gp = AL('HORIZONTAL', { name: 'Gap — more ranks', p: [8, 12, 8, 12], gap: 6, align: 'CENTER', justify: 'CENTER' }); add(gp, await IC('more', 16, 'icon/muted'), await T('#' + (last + 1) + ' and below in the full standings', 'Caption', 'text/tertiary')); add(lst, [gp, 'FILL']);
  if (youRow) add(lst, [await mrow(youRow, true), 'FILL']);
  else add(lst, [await mrow([P.pos.rank, P.pos.handle, P.pos.pts, P.race.prize], true, P.pos.note), 'FILL']);
  add(lst, [await BTN('Secondary', 'Show full standings', { size: 'L', trail: 'chevron-down' }), 'FILL']); add(C, [lst, 'FILL']);
  // your race
  const yr = box('Your race', { gap: 10, fill: 'surface/selected', stroke: 'border/brand' }); const yh = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(yh, await I('9:238', { Size: 'M' }, { Initials: 'NK' }), [await T('Your race · @nova.k', 'Body/M Strong', 'text/primary', { w: 200 }), 'FILL'], await DEMO('XS')); add(yr, [yh, 'FILL']);
  const ys = AL('HORIZONTAL', { name: 'Your race stats', gap: 8 }); for (const [k, v, s2] of [['Rank', P.race.rank, P.race.rankSub], ['Points', P.race.pts, ''], ['Current prize', P.race.prize, '']]) { const c = AL('VERTICAL', { name: 'Stat — ' + k, gap: 2, p: [8, 10, 8, 10], r: 10, fill: 'surface/raised' }); add(c, await T(k, 'Caption', 'text/tertiary'), await T(v, 'Number/S', k === 'Current prize' && v !== '—' ? 'text/gold' : 'text/primary')); if (s2) add(c, await T(s2, 'Caption', 'text/tertiary')); add(ys, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; } add(yr, [ys, 'FILL']);
  if (P.race.note) add(yr, [await T(P.race.note, 'Body/S', 'text/secondary', { w: 326 }), 'FILL']); add(C, [yr, 'FILL']);
  // how points work
  const hw = box('How points work', { gap: 8 }); add(hw, await T('How points work', 'Heading/H5', 'text/primary')); for (const h of P.how) { const r = AL('HORIZONTAL', { name: 'Rule', gap: 8 }); add(r, await IC('check', 16, 'icon/brand'), [await T(h, 'Body/S', 'text/secondary', { w: 300 }), 'FILL']); add(hw, [r, 'FILL']); } add(hw, await linkRow('Full race terms', 'external-link')); add(C, [hw, 'FILL']);
  // prize breakdown
  const pb = box('Prize breakdown', { gap: 0 }); const pbh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(pbh, [await T('Prize breakdown', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('S')); add(pb, [pbh, 'FILL']);
  for (const [k, v] of [...P.prizes, ['Total', P.total]]) { const r = AL('HORIZONTAL', { name: 'Prize — ' + k, gap: 8, p: [8, 0, 8, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: k === 'Total' ? 0 : 1 }); add(r, [await T(k, k === 'Total' ? 'Body/S Strong' : 'Body/S', 'text/secondary', { w: 140 }), 'FILL'], await T(v, 'Number/S', 'text/gold')); add(pb, [r, 'FILL']); }
  if (P.split) add(pb, [await T(P.split, 'Caption', 'text/tertiary', { w: 326 }), 'FILL']); add(C, [pb, 'FILL']);
  // races are optional
  const op = box('Races are optional', { gap: 10, fill: 'surface/raised' }); const oh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(oh, await IC('shield', 20, 'icon/brand'), [await T('Races are optional', 'Body/M Strong', 'text/primary'), 'FILL']); add(op, [oh, 'FILL'], [await T(P.opt, 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const ob = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(ob, [await BTN('Secondary', 'Set limits', { size: 'L' }), 'FILL'], await I('6:159')); add(op, [ob, 'FILL']); add(C, [op, 'FILL']);
  await mlic(C);
  await mfinish(S, { tab: 'Home' }); audit(S.f); shots.push(S.f); return S.f;
}
const NW = '[PUB-06] Leaderboard / 390 / Weekly (default)';
const ND = '[PUB-06] Leaderboard / 390 / Daily — not ranked yet';
let wy = 160;
if (need(NW)) { const P = parseLB(await readDesk('84:103900'), FB.Weekly); OUT.extracted = { weekly: { podium: P.podium, rows: P.rows.length, pos: P.pos, race: P.race } }; const f = await buildLB(NW, 1650, 160, P); wy = 160 + f.height + 160; }
else { const f = sec.children.find(c => c.name === NW); wy = f.y + f.height + 160; }
if (need(ND)) { const P = parseLB(await readDesk('84:104905'), FB.Daily); await buildLB(ND, 1650, Math.round(wy), P); }
fitSection(sec);
for (const f of shots) await f.screenshot({ scale: 0.6 });
return OUT;
