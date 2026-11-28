// ===== m2: [PUB-06] Leaderboard / 390 / Daily (Member) — weekly/monthly are the same layout (tab switch only, decision #16) =====
const ML = '[PUB-06] Leaderboard / 390 / Daily';
const shots = [];
function initials(h) { const s = h.replace(/[^a-z0-9]/gi, ''); return h.startsWith('Hidden') ? '–' : s.slice(0, 2).toUpperCase(); }
function segLabels(s, labels, active) { const segs = s.findAll(x => x.type === 'INSTANCE' && Object.keys(x.componentProperties || {}).some(k => k.startsWith('Label#'))); segs.forEach((g, i) => { if (labels[i] != null) setProp(g, 'Label', labels[i]); try { g.setProperties({ State: i === active ? 'Active' : 'Default' }); } catch (e) { OUT.notes.push('segment state: ' + e.message); } }); s.name = 'Tabs/Segmented — ' + labels.join(' | '); return segs.length; }
async function mrow(r, you) {
  const row = AL('HORIZONTAL', { name: 'Rank row — #' + r[0] + (you ? ' (you)' : ''), gap: 10, p: [10, 12, 10, 12], r: 10, align: 'CENTER', fill: you ? 'surface/selected' : null }); if (you) stroke(row, 'border/brand');
  const rk = AL('HORIZONTAL', { name: 'Rank', w: 36, h: 28, r: 9999, fill: you ? 'brand/tint' : 'surface/raised', justify: 'CENTER', align: 'CENTER' }); add(rk, await T(String(r[0]), 'Label/S', you ? 'text/brand' : 'text/secondary'));
  const who = AL('VERTICAL', { gap: 2 }); add(who, await T(r[1], 'Body/S Strong', 'text/primary'));
  const val = AL('VERTICAL', { gap: 2, align: 'MAX' }); add(val, await T(r[2], 'Label/M', 'text/primary'), await T(r[3] === '—' ? 'no prize' : r[3] + ' USDT', 'Caption', r[3] === '—' ? 'text/tertiary' : 'text/gold'));
  add(row, rk, await I('9:238', { Size: 'S' }, { Initials: you ? 'NK' : initials(r[1]) }), [who, 'FILL'], val); return row;
}
if (need(ML)) {
  const S = await mshell(ML, 1650, 160, { auth: 'Member', gap: 24 }); const C = S.C;
  const crumb = AL('HORIZONTAL', { name: 'Breadcrumb', gap: 6, align: 'CENTER' }); add(crumb, await T('Home', 'Label/S', 'text/tertiary'), await IC('chevron-right', 14, 'icon/muted'), await T('Leaderboard', 'Label/S', 'text/secondary')); add(C, crumb);
  const b = mbanner(C, 'Banner — Daily race', 196, { p: 20, block: 'accent/gold-tint', stripe: 'accent/gold', bx: 210 });
  const cp = AL('VERTICAL', { name: 'Copy', gap: 6, w: 196 }); add(cp, await T('LEADERBOARD · DAILY RACE', 'Overline', 'text/gold'), [await T('Top players today', 'Heading/H3', 'text/primary', { w: 196 }), 'FILL'], [await T('Top 10 share 250.00 USDT in cash prizes. Race terms apply.', 'Body/S', 'text/secondary', { w: 196 }), 'FILL']); const dm = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dm, await I('6:159'), await DEMO('XS')); add(cp, dm); add(b, cp);
  const tr = artTrophy(); tr.rescale(0.52); abs(b, tr, 222, 52);
  const seg = await I('20:6978', { Segments: '3' }); segLabels(seg, ['Daily', 'Weekly', 'Monthly'], 0); add(C, [seg, 'FILL']);
  const meta = AL('VERTICAL', { name: 'Period', gap: 8 }); const pr = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(pr, await IC('calendar', 16, 'icon/muted'), await T('Fri 27 Nov 2026 · 00:00–23:59 UTC', 'Label/M', 'text/secondary'));
  const lv = AL('HORIZONTAL', { gap: 8, align: 'CENTER', wrap: true, cgap: 6 }); add(lv, await statusChip('info', 'Resets 00:00 UTC · in 5 h 18 min', 'clock'), await BADGE('Live', 'S'), await DEMO('M')); add(meta, pr, [lv, 'FILL'], await T('Updated 18:42:05 UTC · refreshes every 60 s', 'Caption', 'text/tertiary')); add(C, [meta, 'FILL']);
  const you = box('Your position', { gap: 12, fill: 'surface/selected', stroke: 'border/brand' });
  const yh = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(yh, await I('9:238', { Size: 'M' }, { Initials: 'NK' })); const yn = AL('VERTICAL', { gap: 4 }); add(yn, await T('@nova.k · you', 'Body/M Strong', 'text/primary'), await I('6:211', { Tier: 'Gold', Size: 'S' })); add(yh, [yn, 'FILL']); const rkv = AL('VERTICAL', { gap: 0, align: 'MAX' }); add(rkv, await T('#38', 'Number/M', 'text/brand'), await T('of 2,914', 'Caption', 'text/tertiary')); add(yh, rkv); add(you, [yh, 'FILL']);
  add(you, [await T('412 points today — 8,228 behind #10 (8,640), the last prize place.', 'Body/S', 'text/primary', { w: 326 }), 'FILL']);
  const sts = AL('HORIZONTAL', { name: 'Your points by period', gap: 8 }); for (const [k, v, on] of [['Today', '412', true], ['This week', '1,286', false], ['November', '5,032', false]]) { const c = AL('VERTICAL', { name: 'Stat — ' + k, gap: 2, p: [8, 10, 8, 10], r: 10, fill: on ? 'brand/tint' : 'surface/raised' }); add(c, await T(k, 'Caption', on ? 'text/brand' : 'text/tertiary'), await T(v, 'Number/S', 'text/primary')); add(sts, [c, 'FILL']); }
  add(you, [sts, 'FILL'], await DEMO('XS')); add(C, [you, 'FILL']);
  // podium
  const pod = AL('HORIZONTAL', { name: 'Podium — top 3', gap: 8 }); add(C, [pod, 'FILL']);
  const top3 = [[1, '@orbit_77', '38,420', '75.00'], [2, '@mira.sol', '31,075', '50.00'], [3, '@kestrel', '26,940', '35.00']];
  for (let i = 0; i < 3; i++) { const r = top3[i]; const c = box('Podium — #' + r[0], { gap: 8, p: [12, 10, 12, 10], align: 'CENTER', fill: i === 0 ? 'accent/gold-tint' : 'surface/default', stroke: i === 0 ? 'border/gold' : 'border/subtle' }); const md = AL('HORIZONTAL', { name: 'Medal', w: 28, h: 28, r: 9999, fill: ['vip/gold', 'vip/silver', 'vip/bronze'][i], justify: 'CENTER', align: 'CENTER' }); add(md, await T(String(r[0]), 'Label/S', 'text/on-gold')); add(c, md, await I('9:238', { Size: 'M' }, { Initials: initials(r[1]) }), await T(r[1], 'Label/S', 'text/primary'), await T(r[2], 'Number/S', 'text/primary'), await T(r[3] + ' USDT', 'Caption', 'text/gold')); add(pod, [c, 'FILL']); }
  // list
  const lst = box('Rankings today', { gap: 4, p: [12, 8, 8, 8] }); const lh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 8, 4, 8] }); add(lh, [await T('Rankings today', 'Heading/H5', 'text/primary'), 'FILL'], await T('2,914 players', 'Caption', 'text/tertiary'), await DEMO('XS')); add(lst, [lh, 'FILL']);
  for (const r of [[4, '@lumen.eth', '19,380', '25.00'], [5, '@atlas_q', '17,215', '20.00'], [6, '@juno88', '14,960', '9.00'], [7, 'Hidden player', '12,430', '9.00'], [8, '@pixelfox', '11,085', '9.00'], [9, '@tidewalker', '9,870', '9.00'], [10, '@quasar_9', '8,640', '9.00']]) add(lst, [await mrow(r), 'FILL']);
  const gp = AL('HORIZONTAL', { name: 'Gap — #11–#36', p: [8, 12, 8, 12], gap: 6, align: 'CENTER', justify: 'CENTER' }); add(gp, await IC('more', 16, 'icon/muted'), await T('26 players ranked #11–#36', 'Caption', 'text/tertiary')); add(lst, [gp, 'FILL']);
  for (const r of [[37, '@velvet.io', '436', '—'], [38, '@nova.k (you)', '412', '—'], [39, '@ember_ray', '405', '—']]) add(lst, [await mrow(r, r[0] === 38), 'FILL']);
  const more = await BTN('Secondary', 'Show top 100', { size: 'L', trail: 'chevron-down' }); add(lst, [more, 'FILL']); add(C, [lst, 'FILL']);
  add(C, [await T('Players who hide their handle appear as “Hidden player”. Players on a break or self-excluded are never ranked.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
  // prizes + rules
  const pz = box('Daily race prizes', { gap: 10 }); const pzh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(pzh, [await T('Daily race prizes', 'Heading/H5', 'text/primary'), 'FILL'], await T('250.00 USDT', 'Number/S', 'text/gold'), await DEMO('S')); add(pz, [pzh, 'FILL']);
  const pl = AL('VERTICAL', { name: 'Prize split', gap: 0 }); const split = [['1st', '75.00'], ['2nd', '50.00'], ['3rd', '35.00'], ['4th', '25.00'], ['5th', '20.00'], ['6th–10th', '9.00 each']];
  for (let i = 0; i < split.length; i++) { const r = AL('HORIZONTAL', { name: 'Prize — ' + split[i][0], gap: 8, p: [8, 0, 8, 0], align: 'CENTER' }); if (i < split.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(split[i][0], 'Body/S', 'text/secondary', { w: 160 }), 'FILL'], await T(split[i][1] + ' USDT', 'Number/S', 'text/gold')); add(pl, [r, 'FILL']); }
  add(pz, [pl, 'FILL'], [await T('Cash to Available by 01:00 UTC on 28 Nov 2026, no wagering. Min. 100 points. 1 point per 1.00 USDT entered in Global Pool or staked in Originals and table games; fees, bonus funds and refunded entries earn 0.', 'Caption', 'text/secondary', { w: 326 }), 'FILL']);
  const pzt = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(pzt, await linkRow('Race terms apply'), await I('6:159')); add(pz, pzt); add(C, [pz, 'FILL']);
  const rg = box('Responsible gaming', { gap: 10, fill: 'surface/raised' }); const rgh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rgh, await IC('heart', 20, 'icon/brand'), [await T('Chasing a rank? Set a limit first.', 'Body/M Strong', 'text/primary', { w: 290 }), 'FILL']); add(rg, [rgh, 'FILL']);
  add(rg, [await T('Points come from money you stake, and you can lose your stake. Today: 351.75 of your 500.00 USDT participation limit used.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const trk = AL('HORIZONTAL', { name: 'Limit used — 70%', fill: 'surface/default', r: 9999, h: 8, clip: true }); add(trk, rect(228, 8, 'brand/primary', 9999, 'Used 351.75 / 500.00')); add(rg, [trk, 'FILL']);
  const rgb = AL('HORIZONTAL', { gap: 8 }); add(rgb, [await BTN('Secondary', 'Set limits', { size: 'L' }), 'FILL'], [await BTN('Ghost', 'Take a break', { size: 'L' }), 'FILL']); add(rg, [rgb, 'FILL'], await DEMO('XS')); add(C, [rg, 'FILL']);
  await mlic(C);
  await mfinish(S, { tab: 'Home' }); audit(S.f); shots.push(S.f);
}
fitSection(sec);
for (const f of shots) await f.screenshot({ scale: 0.6 });
return OUT;
