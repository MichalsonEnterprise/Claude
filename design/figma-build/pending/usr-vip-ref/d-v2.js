const NAME = '[USR-V2] VIP — Points & History / 1440 / Default';
const { f, content } = await DESK(NAME, 1680, 160, { active: 'VIP Club', area: 'VIP Club', page: 'Points', title: 'Status points',
  sub: 'Every point from the last 365 days: where it came from, your running balance and when older points roll off.',
  actions: async () => [await BTN('Secondary', 'Export CSV', { lead: 'download' })], tabs: VTABS('Points') });
const k = ROW({ name: 'KPIs', gap: 16, align: 'MIN' }); add(content, [k, 'FILL']);
for (const [l, v, u, o] of [['Status points', '12,840', 'pts', { icon: 'crown', ic: 'vip/gold', cap: 'Rolling 365 days · Gold III, Level 14' }], ['This week', '+1,286', 'pts', { icon: 'trending-up', ic: 'status/success', color: 'text/success', cap: 'Mon 23 – Sun 29 Nov 2026, so far' }], ['This month', '5,032', 'pts', { icon: 'calendar', cap: '1–27 Nov 2026 · +18.6% vs October' }], ['To Platinum', '7,160', 'pts', { icon: 'target', ic: 'icon/brand', cap: '64.2% of 20,000 · Gold IV in 1,160 pts' }]]) { const c = await KPI(l, v, u, o); add(k, [c, 'FILL_BOTH']); }
const cols = ROW({ name: 'Two columns', gap: 16, align: 'MIN' }); add(content, [cols, 'FILL']);
const hist = CARD({ name: 'Points history', gap: 0, p: 0, clip: true }); add(cols, [hist, 'FILL']);
const hh = ROW({ name: 'Card header', gap: 12, p: [20, 24, 16, 24] }); add(hh, await T('Points history', 'Heading/H4')); add(hh, await DEMO('S')); const spc = ROW({}); add(hh, [spc, 'FILL']);
const seg = await I('20:6978', { Segments: '4' }); const segs = seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment')); ['All', 'Global Pool', 'Games', 'Level-ups'].forEach((l, i) => { if (segs[i]) setP(segs[i], { Label: l }); }); add(hh, seg); add(hist, [hh, 'FILL']);
const tbl = COL({ name: 'Table', gap: 0 }); add(hist, [tbl, 'FILL']);
await HEADROW(tbl, [['Date', 176], ['Activity', 'FILL'], ['Source', 168], ['Points', 112, true], ['Balance', 120, true]]);
const H = [['27 Nov 2026, 14:12', 'Round #1,248 · 35 entries', '350.00 USDT entered · fee excluded', 'Global Pool', 'pool', '+350', '12,840'], ['27 Nov 2026, 11:05', 'Orbit Rush', '124.00 USDT staked', 'Originals', 'crash', '+124', '12,490'], ['26 Nov 2026, 21:40', 'Pool Dice', '80.00 USDT staked', 'Originals', 'dice', '+80', '12,366'], ['26 Nov 2026, 18:02', 'Twenty-One', '90.00 USDT staked', 'Table games', 'cards', '+90', '12,286'], ['26 Nov 2026, 12:15', 'Round #1,247 · 15 entries', '150.00 USDT entered', 'Global Pool', 'pool', '+150', '12,196'], ['25 Nov 2026, 19:30', 'Level up — Gold III (Level 14)', 'Level-up reward 5.00 USDT → Rewards', 'VIP', 'crown', '0', '12,046'], ['25 Nov 2026, 19:30', 'Round #1,246 · 20 entries', '200.00 USDT entered', 'Global Pool', 'pool', '+200', '12,046'], ['25 Nov 2026, 09:10', 'Vault Sweeper', '46.00 USDT staked', 'Originals', 'games', '+46', '11,846']];
for (const [i, [d, a, a2, s, ic, p, b]] of H.entries()) { const src = ROW({ gap: 8 }); add(src, await IC(ic, 16, ic === 'crown' ? 'icon/gold' : 'icon/muted')); add(src, await T(s, 'Body/S', 'text/secondary'));
  const pc = ROW({ gap: 4 }); add(pc, await T(p, 'Number/S', p === '0' ? 'text/tertiary' : 'text/success')); add(pc, await DEMO('XS'));
  await addRow(tbl, [CELL(176, [await TX(d, 'Body/S', 'text/secondary')]), CELL('FILL', [await TWO(a, a2)]), CELL(168, [src]), CELL(112, [pc], { right: true }), CELL(120, [await TX(b, 'Number/S')], { right: true })], { name: 'Row — ' + a, last: i === H.length - 1, fill: ic === 'crown' ? 'accent/gold-tint' : null }); }
const pag = await I('23:16756', { Type: 'Numbered' }); await sx(pag, 'Range', '1–8 of 214'); add(hist, [pag, 'FILL']);
const side = COL({ name: 'Side column', gap: 16, w: 376 }); add(cols, side);
const ch = CARD({ name: 'Points by week', gap: 12 }); add(side, [ch, 'FILL']);
const chh = ROW({ gap: 8 }); add(chh, await T('Points by week', 'Heading/H5')); add(chh, await DEMO('S')); add(ch, chh);
add(ch, await CHART([980, 1410, 860, 1530, 1240, 1180, 1326, 1286], ['5 Oct', '12', '19', '26', '2 Nov', '9', '16', '23'], { w: 328, h: 140, max: 1600, grid: [500, 1000, 1500], fmt: v => (v / 1000).toFixed(1) + 'k', last: true, name: 'weekly points' }));
add(ch, [await T('Week of 23 Nov is still running (lighter bar). Peak: 1,530 pts in the week of 26 Oct.', 'Caption', 'text/tertiary', { w: 320 }), 'FILL']);
const ro = CARD({ name: 'Roll-off schedule', gap: 12 }); add(side, [ro, 'FILL']);
add(ro, await T('Roll-off schedule', 'Heading/H5'));
for (const [d, v] of [['1 Dec 2026', '−410 pts'], ['1 Jan 2027', '−1,050 pts'], ['1 Feb 2027', '−920 pts']]) add(ro, [await KV(d, v, { demo: true, vc: 'text/secondary' }), 'FILL']);
add(ro, [await CHK('With no further play you keep Gold until at least 1 Feb 2027 (10,460 pts ≥ 8,000).', 'info', 300), 'FILL']);
const no = CARD({ name: "What doesn't earn points", gap: 10 }); add(side, [no, 'FILL']);
add(no, await T("What doesn't earn points", 'Heading/H5'));
for (const s of ['The 0.05 USDT platform fee on each entry', 'Bets placed with bonus funds', 'Refunded entries — round #1,245 was cancelled, so its 30 entries earned 0 pts']) add(no, [await CHK(s, 'lock', 300), 'FILL']);
await FOOT(content, 'Points are a loyalty measure only — they have no cash value and never change odds or outcomes. All values are DEMO.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
