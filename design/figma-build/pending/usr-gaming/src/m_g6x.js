// [USR-G6] Game History / 390 / Export — bottom sheet over Game history; section-local x=2670, below Default
const S = await shellG('[USR-G6] Game History / 390 / Export', 'Game history', 'Game history', 'Every bet you placed in Originals, table and live games, with the seeds to verify each result.', { h: 844 });
const C = S.C; C.name = 'Content (behind sheet)';
const mg = AL('HORIZONTAL', { name: 'Metrics grid', gap: 12, wrap: true, cgap: 12, w: 358 }); add(C, [mg, 'FILL']);
for (const [lab, val, sub, col] of [['Bets today', '10', 'Session started 16:00 UTC · 8 games', 'text/primary'], ['Wagered today', '91.00', 'USDT · counts towards your daily limit', 'text/primary'], ['Paid out today', '66.40', '3 winning bets of 10', 'text/primary'], ['Net today', '−24.60', 'Daily loss limit 200.00 · 175.40 left', 'text/danger']]) {
  const m = card('Metric — ' + lab, { gap: 4, p: 12 }); m.resize(173, m.height); m.counterAxisSizingMode = 'FIXED'; m.primaryAxisSizingMode = 'AUTO'; mg.appendChild(m);
  const hr = AL('HORIZONTAL', { name: 'Label row', gap: 6, align: 'CENTER' }); add(m, [hr, 'FILL']); add(hr, [await overline(lab), 'FILL']); hr.appendChild(await DEMO('XS'));
  m.appendChild(await T(val, 'Number/M', col)); add(m, [await T(sub, 'Caption', 'text/tertiary', { w: 149 }), 'FILL']);
}
await tabAbs(S.f, 'Games');
await sheetG(S.f, 'Export game history', 'Times are UTC. Every row includes what you need to verify the result.', async (sh) => {
  const s1 = AL('VERTICAL', { name: 'Date range', gap: 8 }); add(sh, [s1, 'FILL']); s1.appendChild(await overline('Date range'));
  add(s1, [await chipRow([['Today', false], ['7 days', true], ['30 days', false], ['Custom', false]], { name: 'Range presets' }), 'FILL']);
  add(s1, [await T('20 – 27 Nov 2026 · all times UTC', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
  const s2 = AL('VERTICAL', { name: 'Format', gap: 8 }); add(sh, [s2, 'FILL']); s2.appendChild(await overline('Format'));
  for (const [l, sel] of [['CSV — opens in any spreadsheet app', 'Yes'], ['PDF statement — readable summary, no seeds', 'No']]) { const r = await I('20:3259', { Selected: sel, State: 'Default' }, { Label: l, 'Show description': false }); add(s2, [r, 'FILL']); }
  const s3 = AL('VERTICAL', { name: 'Include', gap: 8 }); add(sh, [s3, 'FILL']); s3.appendChild(await overline('Include (bet ID, game, stake, payout and result are always included)'));
  for (const [l, v] of [['Server seed hash, client seed and nonce', 'Checked'], ['Balance after each bet', 'Unchecked']]) { const c = await I('20:3205', { Value: v, State: 'Default' }, { Label: l, 'Show description': false }); add(s3, [c, 'FILL']); }
  const fc = AL('HORIZONTAL', { name: 'File preview', gap: 12, p: 12, fill: 'surface/raised', r: 10, align: 'CENTER' }); add(sh, [fc, 'FILL']);
  const it = AL('HORIZONTAL', { name: 'Icon tile', w: 40, h: 40, fill: 'surface/default', r: 10, align: 'CENTER', justify: 'CENTER' }); it.appendChild(await IC('file', 20, 'icon/brand')); fc.appendChild(it);
  const ft = AL('VERTICAL', { name: 'File', gap: 2 }); add(fc, [ft, 'FILL']); add(ft, [await T('game-history_2026-11-20_2026-11-27.csv', 'Mono/S', 'text/primary', { w: 250 }), 'FILL']); ft.appendChild(await T('486 bets · 8 games · about 62 KB', 'Caption', 'text/tertiary'));
  fc.appendChild(await DEMO('XS'));
  add(sh, [await T('Exports of more than 10,000 rows are prepared in the background and emailed to n•••@example.com.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
}, [[await BTN('Ghost', 'Cancel', { size: 'L' }), null], [await BTN('Primary', 'Download CSV', { size: 'L', lead: 'download' }), 'FILL']]);
const d6 = sec.children.find(c => c.name === '[USR-G6] Game History / 390 / Default');
await placeG(S.f, 2670, d6 ? d6.y + d6.height + 160 : 1978);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: S.f.name, h: Math.round(S.f.height), section: sec.id };
