const NAME = '[USR-V4] VIP — Benefits & Tier Comparison / 390 / Default';
const { f, content } = await MOB(NAME, 1650, 160, { title: 'Tiers & benefits', sub: '5 tiers · 29 levels · same odds for all', tabs: MVT('Benefits') });
const tp = AL('HORIZONTAL', { name: 'Tier chips (scroll)', gap: 8, clip: true }); add(content, [tp, 'FILL']);
for (const t of ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']) add(tp, await I('20:6895', { State: t === 'Gold' ? 'Active' : 'Default' }, { Label: t, 'Show icon': false }));
const cw = ROW({ name: 'Current tier card', justify: 'CENTER' }); add(cw, await I('23:12669', { Tier: 'Gold', Current: 'Yes' })); add(content, [cw, 'FILL']);
const cc = CARD({ name: 'Gold vs Platinum', gap: 0, p: 0, clip: true }); add(content, [cc, 'FILL']);
const hh = ROW({ gap: 8, p: [14, 16, 10, 16] }); add(hh, await T('Gold vs Platinum', 'Heading/H5')); add(hh, await DEMO('XS')); add(cc, [hh, 'FILL']);
const hr = ROW({ name: 'Header', fill: 'bg/secondary' }); add(hr, CELL(130, [await TX('BENEFIT', 'Overline', 'text/tertiary')], { py: 10, name: 'h0' })); for (const t of ['Gold', 'Platinum']) { const c = CELL('FILL', [await I('6:211', { Tier: t, Size: 'S' })], { py: 10 }); if (t === 'Gold') fill(c, 'surface/selected'); add(hr, c); c.layoutSizingHorizontal = 'FILL'; } add(cc, [hr, 'FILL']);
for (const [l, a, b] of [['Points needed', '8,000', '20,000'], ['Level-up rewards', '2.00–15.00', '25.00–60.00'], ['Weekly reward', '✓', '✓'], ['Monthly reward', '—', '✓'], ['Support', 'Priority queue', 'Dedicated VIP host'], ['VIP tournaments', 'Monthly invitational', '+ Platinum series']]) { const cells = [CELL(130, [await TX(l, 'Caption', 'text/secondary', 98)], { py: 12 })]; for (const [j, v] of [a, b].entries()) { const k = v === '✓' ? await IC('check-circle', 18, 'status/success') : await TX(v, 'Body/S', v === '—' ? 'text/disabled' : 'text/primary', 90); const c = CELL('FILL', [k], { py: 12 }); if (j === 0) fill(c, 'surface/selected'); cells.push(c); } addRow(cc, cells, { name: 'Row — ' + l }); }
const same = CARD({ name: 'Same for every tier', gap: 10, p: 16, fill: 'brand/tint-subtle', stroke: 'border/brand' }); add(content, [same, 'FILL']);
const sh = ROW({ gap: 8 }); add(sh, await IC('shield-check', 18, 'icon/brand')); add(sh, await T('Same for every tier', 'Heading/H5')); add(same, sh);
for (const s of ['Odds, house edge and payouts', 'Chainlink VRF / seed verification', 'Withdrawal security checks', 'Responsible-gaming tools & limits']) add(same, [await CHK(s, 'info', 300, 'Body/S'), 'FILL']);
add(content, [await BTN('Secondary', 'Compare all five tiers', { size: 'L', trail: 'arrow-right' }), 'FILL']);
await MFOOT(content, 'Thresholds and rewards are DEMO. Benefits can change with 30 days’ notice. 18+.');
await MEND(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
