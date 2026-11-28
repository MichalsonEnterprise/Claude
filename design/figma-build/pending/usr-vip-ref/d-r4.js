const NAME = '[USR-R4] Referrals — Affiliate Earnings / 1440 / Default';
const { f, content } = await DESK(NAME, 11040, 160, { active: 'Affiliates', area: 'Referrals', page: 'Earnings', title: 'Affiliate earnings',
  sub: 'Your 20% share of the platform fees paid by players you invited. Calculated per round and settled after each draw.',
  actions: async () => [await BTN('Secondary', 'Export CSV', { lead: 'download' }), await BTN('Primary', 'Request payout', { lead: 'arrow-up-right' })], tabs: RTABS('Earnings') });
const k = ROW({ name: 'KPIs', gap: 16, align: 'MIN' }); add(content, [k, 'FILL']);
for (const [l, v, o] of [['Lifetime earned', '142.50', { icon: 'coins', cap: 'From 14,250 referred entries · Mar–Nov 2026' }], ['Available for payout', '48.60', { icon: 'check-circle', ic: 'status/success', color: 'balance/available', cap: 'Settled since payout PO-0412 (2 Nov 2026)' }], ['Pending', '3.90', { icon: 'clock', ic: 'status/pending', color: 'balance/pending', cap: 'Round #1,248 — settles after the draw, 27 Nov 2026, 20:00 UTC' }], ['Paid out', '90.00', { icon: 'receipt', cap: '2 payouts to your Available balance' }]]) add(k, [await KPI(l, v, 'USDT', o), 'FILL_BOTH']);
const rec = ROW({ gap: 6 }); add(rec, await IC('scale', 16, 'icon/muted')); add(rec, await T('142.50 lifetime = 90.00 paid out + 48.60 available + 3.90 pending', 'Caption', 'text/tertiary')); add(rec, await DEMO('XS')); add(content, rec);
const cols = ROW({ name: 'Two columns', gap: 16, align: 'MIN' }); add(content, [cols, 'FILL']);
const mc = CARD({ name: 'Monthly earnings', gap: 12 }); add(cols, [mc, 'FILL']); mc.layoutSizingVertical = 'FILL';
const mh = ROW({ gap: 8 }); add(mh, await T('Monthly earnings', 'Heading/H4')); add(mh, await DEMO('S')); add(mh, [ROW({}), 'FILL']); add(mh, await T('Mar – Nov 2026 · USDT', 'Caption', 'text/tertiary')); add(mc, [mh, 'FILL']);
add(mc, await CHART([1.20, 3.60, 5.10, 8.40, 12.30, 14.70, 17.40, 27.30, 52.50], ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'], { w: 696, h: 200, gap: 24, max: 60, grid: [10, 20, 30, 40, 50, 60], fmt: v => String(v), last: true, name: 'monthly commission' }));
const pm = ROW({ gap: 24 }); add(pm, await CHK('Paid: PO-0388 · 40.00 USDT · 5 Oct 2026', 'ok', 200, 'Caption')); add(pm, await CHK('Paid: PO-0412 · 50.00 USDT · 2 Nov 2026', 'ok', 200, 'Caption')); add(pm, await CHK('November so far (lighter bar)', 'clock', 150, 'Caption')); add(mc, pm);
const cc = CARD({ name: 'How your 20% is calculated', gap: 12, w: 376 }); add(cols, cc);
const chh = ROW({ gap: 8 }); add(chh, await T('How your 20% is calculated', 'Heading/H5')); add(chh, await DEMO('S')); add(cc, chh);
for (const [a, b, st] of [['Referred qualifying entries (1–27 Nov)', '5,250'], ['× platform fee per entry', '0.05 USDT'], ['= platform fees', '262.50 USDT'], ['× your share', '20%']]) add(cc, [await KV(a, b), 'FILL']);
const dv = rect(328, 1, 'border/subtle', 0, 'Divider'); add(cc, [dv, 'FILL']);
add(cc, [await KV('= your commission', '52.50 USDT', { ks: 'Body/S Strong', kc: 'text/primary', vs: 'Number/M' }), 'FILL']);
add(cc, await T('November so far: 48.60 available + 3.90 pending', 'Caption', 'text/tertiary'));
add(cc, [await CHK('Calculated on platform fees only — never on deposits, stakes, wins or losses.', 'info', 300, 'Caption'), 'FILL']);
add(cc, [await CHK('Cancelled rounds refund their fees, so they earn no commission (round #1,245).', 'warn', 300, 'Caption'), 'FILL']);
const rt = CARD({ name: 'Earnings by round', gap: 0, p: 0, clip: true }); add(content, [rt, 'FILL']);
const rh = ROW({ gap: 8, p: [20, 24, 16, 24] }); add(rh, await T('Earnings by round', 'Heading/H4')); add(rh, await DEMO('S')); add(rh, [ROW({}), 'FILL']); add(rh, await T('November 2026', 'Caption', 'text/tertiary')); add(rt, [rh, 'FILL']);
const tbl = COL({ name: 'Table', gap: 0 }); add(rt, [tbl, 'FILL']);
await HEADROW(tbl, [['Round', 180], ['Status', 130], ['Entries', 110, true], ['Platform fees', 140, true], ['Your 20%', 120, true], ['Settlement', 'FILL']]);
const RR = [['#1,248', 'Live', 'Open', '390', '19.50', '3.90', 'Pending — settles after the draw, 27 Nov 2026, 20:00 UTC', 'text/secondary'], ['#1,247', 'Confirmed', 'Settled', '410', '20.50', '4.10', 'Available · 26 Nov 2026, 20:02 UTC', 'text/success'], ['#1,246', 'Confirmed', 'Settled', '365', '18.25', '3.65', 'Available · 25 Nov 2026, 20:02 UTC', 'text/success'], ['#1,245', 'Expired', 'Cancelled', '280', '0.00', '0.00', 'No commission — threshold not met, 14.00 USDT fees refunded to players', 'text/tertiary'], ['#1,244', 'Confirmed', 'Settled', '402', '20.10', '4.02', 'Available · 23 Nov 2026, 20:02 UTC', 'text/success'], ['#1,243', 'Confirmed', 'Settled', '376', '18.80', '3.76', 'Available · 22 Nov 2026, 20:02 UTC', 'text/success']];
for (const [i, [r, bs, bl, e, fe, cm, note, nc]] of RR.entries()) { const rc = ROW({ gap: 6 }); add(rc, await IC('pool', 16, 'icon/gold')); add(rc, await T('Round ' + r, 'Body/S Strong')); add(rc, await DEMO('XS'));
  await addRow(tbl, [CELL(180, [rc]), CELL(130, [await BADGEL(bs, bl)]), CELL(110, [await TX(e, 'Number/S')], { right: true }), CELL(140, [await AMT(fe, { c: 'text/secondary' })], { right: true }), CELL(120, [await AMT(cm, { c: cm === '0.00' ? 'text/tertiary' : 'text/primary' })], { right: true }), CELL('FILL', [await TX(note, 'Body/S', nc, 400)])], { name: 'Row — ' + r, last: i === RR.length - 1, fill: bl === 'Open' ? 'surface/selected' : null }); }
const pag = await PAG('1–6 of 27 rounds', 6, 5); add(rt, [pag, 'FILL']);
await FOOT(content, 'Earnings are DEMO values. Commission applies to Global Pool platform fees only (0.05 USDT per qualifying entry); games carry no platform fee.');
FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
