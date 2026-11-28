const NAME = '[USR-R3] Referrals — Invited Users / 390 / Default';
const { f, content } = await MOB(NAME, 3180, 160, { title: 'Invited users', sub: '48 players · handles masked', tabs: MRT('Invited') });
const se = await SEARCH('Search by handle…', 'M'); add(content, [se, 'FILL']);
const fp = AL('HORIZONTAL', { name: 'Filter pills (scroll)', gap: 8, clip: true }); add(content, [fp, 'FILL']);
for (const [i, l] of ['All · 48', 'Active · 19', 'Inactive · 12', 'Unverified · 17'].entries()) add(fp, await I('20:6895', { State: i === 0 ? 'Active' : 'Default' }, { Label: l, 'Show icon': false }));
const pv = ROW({ name: 'Privacy note', gap: 8, p: [10, 12, 10, 12], fill: 'status/info-tint', r: 10, align: 'MIN' }); add(pv, await IC('eye-off', 16, 'status/info')); add(pv, [await T('Activity totals only — never balances, deposits, wins or losses.', 'Caption', 'text/secondary', { w: 300 }), 'FILL']); add(content, [pv, 'FILL']);
for (const [ini, h, j, kyc, st, e, fe, cm, until] of [['JU', '@ju•••88', '4 Mar 2026', 'L2', 'Active', '3,120', '156.00', '31.20', '4 Mar 2027'], ['PI', '@pi•••fox', '19 Apr 2026', 'L2', 'Active', '2,480', '124.00', '24.80', '19 Apr 2027'], ['TI', '@ti•••ker', '2 May 2026', 'L2', 'Active', '1,960', '98.00', '19.60', '2 May 2027'], ['ZE', '@ze•••21', '11 Jun 2026', 'L1', 'Active', '1,410', '70.50', '14.10', '11 Jun 2027'], ['DR', '@dr•••sol', '30 Aug 2026', 'L2', 'Inactive', '640', '32.00', '6.40', '30 Aug 2027'], ['SA', '@sa•••le', '20 Nov 2026', '—', 'Unverified', '0', '0.00', '0.00', 'Starts after KYC']]) {
  const c = CARD({ name: 'User card — ' + h, gap: 10, p: 14 }); add(content, [c, 'FILL']);
  const top = ROW({ gap: 10 }); add(top, await I('9:238', { Size: 'S' }, { Initials: ini, 'Show status': false })); add(top, [await TWO(h, 'Joined ' + j + ' · ' + (kyc === '—' ? 'KYC not started' : 'KYC ' + kyc), { w: 160 }), 'FILL']);
  add(top, st === 'Active' ? await BADGEL('Confirmed', 'Active') : st === 'Inactive' ? await BADGEL('Neutral', 'Inactive') : await BADGEL('Pending', 'Awaiting KYC')); add(c, [top, 'FILL']);
  const m = ROW({ gap: 8, align: 'MIN' }); for (const [l, v, col] of [['Entries', e, 'text/primary'], ['Fees', fe, 'text/secondary'], ['Your 20%', cm, cm === '0.00' ? 'text/tertiary' : 'text/success']]) { const k = COL({ gap: 2 }); add(k, await T(l, 'Caption', 'text/tertiary')); add(k, await T(v, 'Number/S', col)); add(m, [k, 'FILL']); } add(m, await DEMO('XS')); add(c, [m, 'FILL']);
  add(c, await T('Earning until ' + until, 'Caption', 'text/tertiary')); }
add(content, [await BTN('Secondary', 'Show more (6 of 48)', { size: 'L' }), 'FILL']);
add(content, [await KV('All 48 players · lifetime', '142.50 USDT', { demo: true, vc: 'text/success' }), 'FILL']);
await MFOOT(content, 'Handles and amounts are DEMO. Commission = 20% of the 0.05 USDT platform fee.');
await MEND(f); FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
