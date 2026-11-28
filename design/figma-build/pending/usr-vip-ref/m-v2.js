const NAME = '[USR-V2] VIP — Points & History / 390 / Default';
const { f, content } = await MOB(NAME, 630, 160, { title: 'Status points', sub: '12,840 pts · rolling 365 days', tabs: MVT('Points') });
for (const pair of [[['Status points', '12,840', { cap: 'Gold III' }], ['This week', '+1,286', { color: 'text/success', cap: 'Mon 23 Nov – now' }]], [['This month', '5,032', { cap: '+18.6% vs Oct' }], ['To Platinum', '7,160', { cap: '64.2% of 20,000' }]]]) { const r = ROW({ gap: 12, align: 'MIN' }); for (const [l, v, o] of pair) add(r, [await KPI(l, v, 'pts', { ...o, p: 14, size: 'Number/M', cw: 130 }), 'FILL_BOTH']); add(content, [r, 'FILL']); }
const hc = CARD({ name: 'Points history', gap: 0, p: 0, clip: true }); add(content, [hc, 'FILL']);
const hh = ROW({ gap: 8, p: [16, 16, 8, 16] }); add(hh, await T('Points history', 'Heading/H5')); add(hh, await DEMO('XS')); add(hh, [ROW({}), 'FILL']); add(hh, await BTN('Ghost', 'Filter', { size: 'S', lead: 'filter' })); add(hc, [hh, 'FILL']);
for (const [a, d, ic, p, b] of [['Round #1,248 · 35 entries', '27 Nov, 14:12 · Global Pool', 'pool', '+350', '12,840'], ['Orbit Rush · 124.00 staked', '27 Nov, 11:05 · Originals', 'crash', '+124', '12,490'], ['Pool Dice · 80.00 staked', '26 Nov, 21:40 · Originals', 'dice', '+80', '12,366'], ['Twenty-One · 90.00 staked', '26 Nov, 18:02 · Table games', 'cards', '+90', '12,286'], ['Round #1,247 · 15 entries', '26 Nov, 12:15 · Global Pool', 'pool', '+150', '12,196'], ['Level up — Gold III', '25 Nov, 19:30 · reward 5.00 USDT', 'crown', '0', '12,046']]) {
  const r = ROW({ name: 'Item — ' + a, gap: 12, p: [12, 16, 12, 16], fill: ic === 'crown' ? 'accent/gold-tint' : null }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await TILE(ic, ic === 'crown' ? 'icon/gold' : 'icon/default', 'surface/raised', 36)); add(r, [await TWO(a, d), 'FILL']);
  const rc = COL({ gap: 2, align: 'MAX' }); add(rc, await T(p, 'Number/S', p === '0' ? 'text/tertiary' : 'text/success')); add(rc, await T(b, 'Caption', 'text/tertiary')); add(r, rc); add(hc, [r, 'FILL']); }
const lm = ROW({ p: 16 }); add(lm, [await BTN('Secondary', 'Load more (208)', { size: 'L' }), 'FILL']); add(hc, [lm, 'FILL']);
const ro = CARD({ name: 'Roll-off schedule', gap: 10, p: 16 }); add(content, [ro, 'FILL']);
add(ro, await T('Roll-off schedule', 'Heading/H5')); for (const [d, v] of [['1 Dec 2026', '−410 pts'], ['1 Jan 2027', '−1,050 pts'], ['1 Feb 2027', '−920 pts']]) add(ro, [await KV(d, v, { demo: true, vc: 'text/secondary' }), 'FILL']);
add(ro, [await CHK('You keep Gold until at least 1 Feb 2027 even with no play.', 'info', 300, 'Caption'), 'FILL']);
add(content, [await CHK('Not counted: the 0.05 USDT entry fee, bonus-fund bets and refunded entries (round #1,245).', 'lock', 330, 'Caption'), 'FILL']);
await MFOOT(content, 'Points have no cash value. DEMO values.');
await MEND(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
