const NAME = '[USR-R3] Referrals — Invited Users / 1440 / Default';
const { f, content } = await DESK(NAME, 9480, 160, { active: 'Affiliates', area: 'Referrals', page: 'Invited users', title: 'Invited users',
  sub: 'Everyone who joined with your link or code. Handles are masked to protect their privacy.',
  actions: async () => [await SEARCH('Search by handle…'), await BTN('Secondary', 'Export CSV', { lead: 'download' })], tabs: RTABS('Invited users') });
const fr = ROW({ name: 'Filters', gap: 16 }); add(content, [fr, 'FILL']);
const seg = await I('20:6978', { Segments: '4' }); const s = seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment')); ['All · 48', 'Active · 19', 'Inactive · 12', 'Unverified · 17'].forEach((l, i) => { if (s[i]) setP(s[i], { Label: l }); }); add(fr, seg);
add(fr, [ROW({}), 'FILL']); add(fr, await T('Sorted by your commission, highest first', 'Caption', 'text/tertiary'));
const pv = ROW({ name: 'Privacy note', gap: 10, p: [12, 16, 12, 16], fill: 'status/info-tint', r: 10 }); add(pv, await IC('eye-off', 18, 'status/info')); add(pv, [await T('You see activity totals only — never your friends’ balances, deposits, wins or losses. Commission runs for 12 months from each friend’s sign-up.', 'Body/S', 'text/secondary', { w: 900 }), 'FILL']); add(content, [pv, 'FILL']);
const tc = CARD({ name: 'Invited users table', gap: 0, p: 0, clip: true }); add(content, [tc, 'FILL']);
const tbl = COL({ name: 'Table', gap: 0 }); add(tc, [tbl, 'FILL']);
await HEADROW(tbl, [['Player', 'FILL'], ['KYC', 130], ['Status', 140], ['Entries', 110, true], ['Fees generated', 140, true], ['Your 20%', 124, true], ['Earning until', 150]]);
const U = [['JU', '@ju•••88', '4 Mar 2026', 'L2', 'Active', '3,120', '156.00', '31.20', '4 Mar 2027'], ['PI', '@pi•••fox', '19 Apr 2026', 'L2', 'Active', '2,480', '124.00', '24.80', '19 Apr 2027'], ['TI', '@ti•••ker', '2 May 2026', 'L2', 'Active', '1,960', '98.00', '19.60', '2 May 2027'], ['ZE', '@ze•••21', '11 Jun 2026', 'L1', 'Active', '1,410', '70.50', '14.10', '11 Jun 2027'], ['HA', '@ha•••on', '23 Jul 2026', 'L2', 'Active', '1,105', '55.25', '11.05', '23 Jul 2027'], ['LY', '@ly•••_v', '8 Aug 2026', 'L1', 'Active', '860', '43.00', '8.60', '8 Aug 2027'], ['DR', '@dr•••sol', '30 Aug 2026', 'L2', 'Inactive', '640', '32.00', '6.40', '30 Aug 2027'], ['NO', '@no•••ind', '14 Sep 2026', 'L1', 'Active', '520', '26.00', '5.20', '14 Sep 2027'], ['CO', '@co•••t.k', '21 Oct 2026', 'L1', 'Active', '310', '15.50', '3.10', '21 Oct 2027'], ['SA', '@sa•••le', '20 Nov 2026', '—', 'Unverified', '0', '0.00', '0.00', 'Starts after KYC']];
for (const [ini, h, j, kyc, st, e, fe, cm, until] of U) { const pc = ROW({ gap: 10 }); const av = await I('9:238', { Size: 'S' }, { Initials: ini, 'Show status': false }); add(pc, av); add(pc, await TWO(h, 'Joined ' + j)); add(pc, await DEMO('XS'));
  const kb = kyc === '—' ? await BADGEL('Neutral', 'Not started') : await BADGEL('Approved', 'KYC ' + kyc);
  const sb = st === 'Active' ? await BADGEL('Confirmed', 'Active') : st === 'Inactive' ? await BADGEL('Neutral', 'Inactive 30 d+') : await BADGEL('Pending', 'Awaiting KYC');
  await addRow(tbl, [CELL('FILL', [pc], { py: 12 }), CELL(130, [kb]), CELL(140, [sb]), CELL(110, [await TX(e, 'Number/S')], { right: true }), CELL(140, [await AMT(fe, { c: 'text/secondary' })], { right: true }), CELL(124, [await AMT(cm, { c: cm === '0.00' ? 'text/tertiary' : 'text/success' })], { right: true }), CELL(150, [await TX(until, 'Body/S', until.startsWith('Starts') ? 'text/tertiary' : 'text/secondary')])], { name: 'Row — ' + h }); }
const tot = ROW({}); add(tot, await T('All 48 players', 'Body/S Strong')); add(tot, await DEMO('XS'));
await addRow(tbl, [CELL('FILL', [tot]), CELL(130, []), CELL(140, []), CELL(110, [await TX('14,250', 'Number/S')], { right: true }), CELL(140, [await AMT('712.50')], { right: true }), CELL(124, [await AMT('142.50', { c: 'text/success' })], { right: true }), CELL(150, [])], { name: 'Totals row', fill: 'bg/secondary', last: true });
const pag = await PAG('1–10 of 48', 10, 5); add(tc, [pag, 'FILL']);
const hn = ROW({ name: 'Help row', gap: 24 }); add(content, [hn, 'FILL']);
add(hn, await CHK('Unverified friends don’t earn you commission until they complete KYC Level 1. You can resend your link — we never share their details with you.', 'info', 520, 'Caption'));
add(hn, await CHK('Seeing a handle you don’t recognise? Report it — self-referrals and fake accounts void commission.', 'warn', 460, 'Caption'));
await FOOT(content, 'Handles, counts and amounts are DEMO. Commission = 20% of the 0.05 USDT platform fee on referred qualifying entries.');
FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
