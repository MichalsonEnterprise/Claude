// ===== d3: [PUB-06] Leaderboard / 1440 / Daily · Weekly · Monthly (Member) =====
const ME = { today: '412', week: '1,286', month: '5,032' };
const PER = {
  Daily: { idx: 0, lbl: 'today', h1: 'Top players today', over: 'LEADERBOARD · DAILY RACE', range: 'Fri 27 Nov 2026 · 00:00–23:59 UTC', reset: 'Resets 28 Nov 2026, 00:00 UTC · in 5 h 18 min', pool: '250.00', places: 10, players: '2,914', paid: 'Cash to Available by 01:00 UTC on 28 Nov 2026 — no wagering.',
    prizes: [['1st', '75.00'], ['2nd', '50.00'], ['3rd', '35.00'], ['4th', '25.00'], ['5th', '20.00'], ['6th–10th', '9.00 each']], tiers: ['Diamond', 'Diamond', 'Platinum'],
    rows: [[1, '@orbit_77', '38,420', '75.00'], [2, '@mira.sol', '31,075', '50.00'], [3, '@kestrel', '26,940', '35.00'], [4, '@lumen.eth', '19,380', '25.00'], [5, '@atlas_q', '17,215', '20.00'], [6, '@juno88', '14,960', '9.00'], [7, 'Hidden player', '12,430', '9.00'], [8, '@pixelfox', '11,085', '9.00'], [9, '@tidewalker', '9,870', '9.00'], [10, '@quasar_9', '8,640', '9.00']],
    gap: '26 players ranked #11–#36', near: [[37, '@velvet.io', '436', '—'], [38, '@nova.k (you)', ME.today, '—'], [39, '@ember_ray', '405', '—']],
    me: { rank: '#38', pts: ME.today, to: 'You are 8,228 points behind #10 (8,640), the last prize place today.' } },
  Weekly: { idx: 1, lbl: 'this week', h1: 'Top players this week', over: 'LEADERBOARD · WEEKLY RACE', range: 'Mon 23 – Sun 29 Nov 2026 · UTC', reset: 'Resets Mon 30 Nov 2026, 00:00 UTC · in 2 d 5 h 18 min', pool: '1,000.00', places: 20, players: '9,870', paid: 'Cash to Available by 01:00 UTC on Mon 30 Nov 2026 — no wagering.',
    prizes: [['1st', '300.00'], ['2nd', '180.00'], ['3rd', '120.00'], ['4th–10th', '40.00 each'], ['11th–20th', '12.00 each']], tiers: ['Diamond', 'Diamond', 'Platinum'],
    rows: [[1, '@mira.sol', '164,300', '300.00'], [2, '@orbit_77', '151,880', '180.00'], [3, '@atlas_q', '118,450', '120.00'], [4, '@kestrel', '96,210', '40.00'], [5, '@northwind', '84,770', '40.00'], [6, '@lumen.eth', '77,035', '40.00'], [7, '@cobalt.k', '63,910', '40.00'], [8, 'Hidden player', '58,460', '40.00'], [9, '@zephyr21', '51,325', '40.00'], [10, '@halcyon', '47,980', '40.00']],
    gap: '49 players ranked #11–#59 · #11–#20 win 12.00 USDT each', near: [[60, '@rook.eth', '1,312', '—'], [61, '@nova.k (you)', ME.week, '—'], [62, '@lyra_v', '1,270', '—']],
    me: { rank: '#61', pts: ME.week, to: 'Prize places end at #20 (6,415 points) — 5,129 points to go this week.' } },
  Monthly: { idx: 2, lbl: 'in November', h1: 'Top players in November', over: 'LEADERBOARD · MONTHLY RACE', range: '1–30 Nov 2026 · UTC', reset: 'Resets Tue 1 Dec 2026, 00:00 UTC · in 3 d 5 h 18 min', pool: '5,000.00', places: 50, players: '21,406', paid: 'Cash to Available by 01:00 UTC on Tue 1 Dec 2026 — no wagering.',
    prizes: [['1st', '1,250.00'], ['2nd', '750.00'], ['3rd', '500.00'], ['4th–10th', '150.00 each'], ['11th–50th', '36.25 each']], tiers: ['Diamond', 'Diamond', 'Diamond'],
    rows: [[1, '@orbit_77', '612,450', '1,250.00'], [2, '@mira.sol', '588,130', '750.00'], [3, '@kestrel', '471,920', '500.00'], [4, '@atlas_q', '402,600', '150.00'], [5, '@lumen.eth', '366,215', '150.00'], [6, '@northwind', '318,770', '150.00'], [7, '@drift.sol', '284,090', '150.00'], [8, '@sable', '251,640', '150.00'], [9, '@pixelfox', '236,410', '150.00'], [10, '@tidewalker', '219,875', '150.00']],
    gap: '130 players ranked #11–#140 · #11–#50 win 36.25 USDT each', near: [[141, '@halcyon', '5,060', '—'], [142, '@nova.k (you)', ME.month, '—'], [143, '@cobalt.k', '4,998', '—']],
    me: { rank: '#142', pts: ME.month, to: 'Prize places end at #50 (28,760 points) — 23,728 points to go this month.' } },
};
const shots = [];
function initials(h) { const s = h.replace(/[^a-z0-9]/gi, ''); return h.startsWith('Hidden') ? '–' : s.slice(0, 2).toUpperCase(); }
function segLabels(s, labels, active) { const segs = s.findAll(x => x.type === 'INSTANCE' && Object.keys(x.componentProperties || {}).some(k => k.startsWith('Label#'))); segs.forEach((g, i) => { if (labels[i] != null) setProp(g, 'Label', labels[i]); try { g.setProperties({ State: i === active ? 'Active' : 'Default' }); } catch (e) { OUT.notes.push('segment state: ' + e.message); } }); s.name = 'Tabs/Segmented — ' + labels.join(' | '); return segs.length; }
async function lrow(r) { const st = /you/.test(r[1]) ? 'You' : r[0] === 1 ? 'Gold' : r[0] === 2 ? 'Silver' : r[0] === 3 ? 'Bronze' : 'Default'; const i = await I('31:22665', { State: st }, { Rank: String(r[0]), Player: r[1], Points: r[2], Prize: r[3] === '—' ? '—' : r[3] + ' USDT' }); i.name = 'Table/Leaderboard Row — #' + r[0] + (st === 'You' ? ' (you)' : ''); return i; }
function propText(inst, base) { return inst.findAll(n => n.type === 'TEXT' && n.componentPropertyReferences && n.componentPropertyReferences.characters && n.componentPropertyReferences.characters.split('#')[0] === base)[0] || inst.findAll(n => n.type === 'TEXT' && n.name === base)[0] || null; }
async function fillHeader(h, r1, r2) {
  const rb = r1.absoluteBoundingBox; let n = 0;
  for (const [base, label] of [['Rank', 'Rank'], ['Player', 'Player'], ['Points', 'Points'], ['Prize', 'Prize']]) {
    const a = propText(r1, base), b = propText(r2, base); if (!a) continue; const ab = a.absoluteBoundingBox, bb = (b || a).absoluteBoundingBox;
    const right = Math.abs((ab.x + ab.width) - (bb.x + bb.width)) < 1.5 && Math.abs(ab.x - bb.x) > 1.5;
    const t = await T(label, 'Overline', 'text/tertiary'); h.appendChild(t); t.y = 10;
    if (right) { t.resize(140, t.height); t.textAlignHorizontal = 'RIGHT'; t.x = Math.round(ab.x + ab.width - rb.x - 140); } else t.x = Math.max(0, Math.round(ab.x - rb.x - (base === 'Rank' ? 10 : 0)));
    n++;
  }
  if (!n) OUT.notes.push('Leaderboard header: no prop-bound texts found in Table/Leaderboard Row');
}
async function stat(k, v, on) { const c = AL('VERTICAL', { name: 'Stat — ' + k, gap: 2, p: [10, 12, 10, 12], r: 10, fill: on ? 'brand/tint' : 'surface/raised' }); add(c, await T(k, 'Caption', on ? 'text/brand' : 'text/tertiary'), await T(v, 'Number/S', 'text/primary')); return c; }
let y = 160;
for (const key of ['Daily', 'Weekly', 'Monthly']) {
  const P = PER[key]; const NAME = '[PUB-06] Leaderboard / 1440 / ' + key;
  if (need(NAME)) {
    const S = await shell(NAME, 4800, y, { auth: 'Member', nav: 'Winners', gap: 32 }); const C = S.content;
    const bc = await I('14:1145', { Levels: '2' }); txt(bc, 'Crumb 1', 'Home'); txt(bc, 'Current page', 'Leaderboard'); add(C, bc);
    const { hero: H, copy } = await hero(C, 'Hero — ' + P.h1, { cw: 640, bx: 800, h: 260, block: 'accent/gold-tint', stripe: 'accent/gold' });
    add(copy, await T(P.over, 'Overline', 'text/gold'), [await T(P.h1, 'Heading/H1', 'text/primary', { w: 640 }), 'FILL']);
    add(copy, [await T('Ranked by points — 1 point for every 1.00 USDT you enter in Global Pool or stake in Originals and table games. The top ' + P.places + ' share ' + P.pool + ' USDT in cash prizes.', 'Body/L', 'text/secondary', { w: 640 }), 'FILL']);
    const tr = AL('HORIZONTAL', { name: 'Terms row', gap: 12, align: 'CENTER' }); add(tr, await linkRow('Race terms apply'), await I('6:159'), await T('Prize amounts are DEMO values', 'Caption', 'text/tertiary'), await DEMO('S')); add(copy, tr);
    placeArt(H, artTrophy(), 860, 70);
    // controls
    const ctl = AL('HORIZONTAL', { name: 'Period controls', gap: 16, align: 'CENTER' }); add(C, [ctl, 'FILL']);
    const seg = await I('20:6978', { Segments: '3' }); segLabels(seg, ['Daily', 'Weekly', 'Monthly'], P.idx); add(ctl, seg);
    const per = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(per, await IC('calendar', 16, 'icon/muted'), await T(P.range, 'Label/M', 'text/secondary')); add(ctl, per, await statusChip('info', P.reset, 'clock'));
    const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(ctl, [sp, 'FILL']);
    add(ctl, await BADGE('Live', 'S'), await T('Updated 18:42:05 UTC · refreshes every 60 s', 'Caption', 'text/tertiary'), await DEMO('M'));
    // podium
    const pod = AL('HORIZONTAL', { name: 'Podium — top 3', gap: 16 }); add(C, [pod, 'FILL']);
    for (let i = 0; i < 3; i++) {
      const r = P.rows[i]; const c = box('Podium — #' + r[0] + ' ' + r[1], { gap: 16, p: 24, fill: i === 0 ? 'accent/gold-tint' : 'surface/default', stroke: i === 0 ? 'border/gold' : 'border/subtle' });
      const top = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); const md = AL('HORIZONTAL', { name: 'Medal', w: 40, h: 40, r: 9999, fill: ['vip/gold', 'vip/silver', 'vip/bronze'][i], justify: 'CENTER', align: 'CENTER' }); add(md, await T(String(r[0]), 'Label/L', 'text/on-gold'));
      add(top, md, [await T(['1st', '2nd', '3rd'][i] + ' place', 'Overline', 'text/secondary'), 'FILL'], await I('6:211', { Tier: P.tiers[i], Size: 'S' })); add(c, [top, 'FILL']);
      const pl = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(pl, await I('9:238', { Size: 'L' }, { Initials: initials(r[1]) })); const ph = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(ph, await T(r[1], 'Heading/H5', 'text/primary'), await DEMO('XS')); add(pl, ph); add(c, pl);
      const nums = AL('HORIZONTAL', { gap: 16, align: 'MAX' }); const pv = AL('VERTICAL', { gap: 2 }); add(pv, await T('Points', 'Caption', 'text/tertiary'), await T(r[2], 'Number/L', 'text/primary')); const zv = AL('VERTICAL', { gap: 2 }); add(zv, await T('Prize', 'Caption', 'text/tertiary'), await T(r[3] + ' USDT', 'Number/S', 'text/gold')); add(nums, [pv, 'FILL'], zv); add(c, [nums, 'FILL']);
      add(pod, [c, 'FILL']);
    }
    // rankings + you
    const two = AL('HORIZONTAL', { name: 'Rankings + your position', gap: 24 }); add(C, [two, 'FILL']);
    const tbl = box('Rankings table', { gap: 0, p: 16 }); add(two, tbl);
    const th = AL('HORIZONTAL', { name: 'Table title', gap: 8, align: 'CENTER', p: [4, 0, 12, 0] }); add(th, [await T('Rankings ' + P.lbl, 'Heading/H4', 'text/primary'), 'FILL'], await T(P.players + ' ranked players', 'Caption', 'text/tertiary'), await DEMO('M')); add(tbl, th);
    const hdr = figma.createFrame(); hdr.name = 'Column header — aligned to Table/Leaderboard Row'; hdr.fills = []; hdr.resize(640, 32); hdr.clipsContent = false; strokeSides(hdr, 'border/subtle', { b: 1 }); add(tbl, hdr);
    const rows = []; for (const r of P.rows) { const ri = await lrow(r); add(tbl, ri); rows.push(ri); }
    th.layoutSizingHorizontal = 'FILL';
    const gp = AL('HORIZONTAL', { name: 'Gap — ' + P.gap, p: [10, 16, 10, 16], gap: 8, align: 'CENTER', justify: 'CENTER' }); add(gp, await IC('more', 16, 'icon/muted'), await T(P.gap, 'Caption', 'text/tertiary')); add(tbl, [gp, 'FILL']);
    for (const r of P.near) add(tbl, await lrow(r));
    await fillHeader(hdr, rows[0], rows[9]);
    const tf = AL('HORIZONTAL', { name: 'Table footer', gap: 12, align: 'CENTER', p: [12, 0, 0, 0] }); add(tf, [await T('Top 10 and the players around you. Players who hide their handle appear as “Hidden player”; players on a break or self-excluded are never ranked.', 'Caption', 'text/tertiary', { w: 440 }), 'FILL'], await BTN('Ghost', 'Show top 100', { size: 'S', trail: 'chevron-down' })); add(tbl, [tf, 'FILL']);
    const rc = AL('VERTICAL', { name: 'Right column', gap: 16 }); add(two, [rc, 'FILL']);
    const you = box('Your position', { gap: 14, fill: 'surface/selected', stroke: 'border/brand' });
    const yh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(yh, await I('9:238', { Size: 'M' }, { Initials: 'NK' })); const yn = AL('VERTICAL', { gap: 4 }); add(yn, await T('@nova.k · you', 'Body/M Strong', 'text/primary'), await I('6:211', { Tier: 'Gold', Size: 'S' })); add(yh, [yn, 'FILL'], await DEMO('S')); add(you, [yh, 'FILL']);
    const yr = AL('HORIZONTAL', { gap: 12, align: 'MAX' }); add(yr, await T(P.me.rank, 'Number/L', 'text/brand'), [await T('of ' + P.players + ' ranked players ' + P.lbl + ' · ' + P.me.pts + ' points', 'Body/S', 'text/secondary', { w: 260 }), 'FILL']); add(you, [yr, 'FILL']);
    add(you, [await T(P.me.to, 'Body/S', 'text/primary', { w: 380 }), 'FILL']);
    const sts = AL('HORIZONTAL', { name: 'Your points by period', gap: 8 }); for (const [k, v, on] of [['Today', ME.today, P.idx === 0], ['This week', ME.week, P.idx === 1], ['November', ME.month, P.idx === 2]]) add(sts, [await stat(k, v, on), 'FILL']); add(you, [sts, 'FILL']);
    add(rc, [you, 'FILL']);
    const pz = box('Race prizes', { gap: 12 }); const pzh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(pzh, [await T(key + ' race prizes', 'Heading/H5', 'text/primary'), 'FILL'], await T(P.pool + ' USDT', 'Number/S', 'text/gold'), await DEMO('S')); add(pz, [pzh, 'FILL']);
    add(pz, [await kvList('Prize split', P.prizes.map(([k, v]) => [k, v + ' USDT', { color: 'text/gold', style: 'Number/S' }]), { fill: 'surface/raised', stroke: 'border/subtle', kw: 150 }), 'FILL']);
    add(pz, [await T(P.paid + ' Min. 100 points to qualify. Ties: whoever reached the score first ranks higher.', 'Caption', 'text/secondary', { w: 380 }), 'FILL']);
    const pzt = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(pzt, await linkRow('Race terms apply'), await I('6:159')); add(pz, pzt); add(rc, [pz, 'FILL']);
    const hp = box('How points work', { gap: 10 }); add(hp, await T('How points work', 'Heading/H5', 'text/primary'));
    add(hp, [await kvList('Points rules', [['Global Pool entries', '1 pt per 1.00 USDT'], ['Originals & table games', '1 pt per 1.00 USDT staked'], ['Platform fee (0.05 USDT / entry)', '0 pts'], ['Bonus funds', '0 pts'], ['Refunded entries (round #1,245)', '0 pts']], { fill: 'surface/raised', stroke: 'border/subtle', kw: 190 }), 'FILL']); add(rc, [hp, 'FILL']);
    const rg = box('Responsible gaming', { gap: 12, fill: 'surface/raised' }); const rgh = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(rgh, await IC('heart', 20, 'icon/brand'), [await T('Chasing a rank? Set a limit first.', 'Body/M Strong', 'text/primary', { w: 320 }), 'FILL']); add(rg, [rgh, 'FILL']);
    add(rg, [await T('Points come from money you stake, and you can lose your stake. Today you have used 351.75 of your 500.00 USDT daily participation limit.', 'Body/S', 'text/secondary', { w: 380 }), 'FILL']);
    const trk = AL('HORIZONTAL', { name: 'Limit used — 70%', fill: 'surface/default', r: 9999, h: 8, clip: true }); add(trk, rect(270, 8, 'brand/primary', 9999, 'Used 351.75 / 500.00')); add(rg, [trk, 'FILL']);
    const rgb = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rgb, await BTN('Secondary', 'Set limits', { size: 'S' }), await BTN('Ghost', 'Take a break', { size: 'S' }), await DEMO('XS')); add(rg, rgb); add(rc, [rg, 'FILL']);
    await compliance(C);
    audit(S.f); shots.push(C);
  }
  y += frameH(NAME, 3000) + 160;
}
fitSection(sec);
for (const c of shots) await c.screenshot({ scale: 0.5 });
return OUT;
