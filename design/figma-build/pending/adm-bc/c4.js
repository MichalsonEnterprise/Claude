const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const NAME = '[ADM-C4] Sanctions Screening / 1440 / Default';
const { f, c } = await SHELL(NAME, POS('C-1440', 'C4'), 'C', 3, 'KO', 'Search screening ref, user, address…');
await HEAD(c, ['Admin', 'Compliance', 'Sanctions screening'], 'Sanctions screening', 'Users are screened at sign-up, at every KYC step and in a daily rescreen; every withdrawal destination is screened before broadcast. Confirming a match freezes the account and opens a report — it always needs a second approver. List versions shown are DEMO.', { badges: [await DEMO('M')], actions: [await BTN('Secondary', 'Export screening log', { size: 'S', lead: 'download' }), await BTN('Secondary', 'Next rescreen 28 Nov, 06:00', { size: 'S', lead: 'refresh', state: 'Disabled' })] });
const lists = []; for (const [n, t, e] of [['OFAC SDN', '27 Nov 2026, 05:40 UTC', '12,418 entries'], ['EU consolidated', '27 Nov 2026, 05:42 UTC', '5,903 entries'], ['UN Security Council', '26 Nov 2026, 22:10 UTC', '1,012 entries'], ['UK sanctions list', '27 Nov 2026, 05:45 UTC', '4,377 entries']]) { const k = CARD('List — ' + n, { gap: 8, p: 16 }); const h = AL('HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); add(h, await IC('database', 18, 'icon/muted'), await T(n, 'Body/M Strong', 'text/primary')); add(h, [SPC(), 'FILL']); add(h, await DEMO('XS')); add(k, [h, 'FILL']); add(k, await ST('Approved', 'Up to date')); add(k, await T('Updated ' + t, 'Caption', 'text/tertiary'), await T(e + ' · feed (DEMO)', 'Caption', 'text/tertiary')); lists.push(k); }
await ROW(c, lists);
await ROW(c, [await KPI('Flat', 'Users rescreened today', '184,320', 'users', '100%', 'Daily run 27 Nov 06:00–06:41 UTC · coverage of all accounts'), await KPI('Flat', 'Potential matches to review', '2', 'matches', '+1 today', 'Name and PEP matches waiting for a decision'), await KPI('Up', 'Destinations screened (24 h)', '1,186', 'addresses', '+4.1%', 'Before every broadcast · 1 blocked (WD-20850)')], { spark: 1 });
await TABS(c, [['Needs decision', '2'], ['Address hits', '1'], ['Confirmed matches', '0'], ['Dismissed · 30 days', '37']], 'Needs decision');
const M = [
  ['SCR-7712', 'VI', '@velvet.io', '“VELASCO, Ines” · EU consolidated', 82, 'Name + year of birth', ['Under review', 'In review'], '27 Nov, 06:38'],
  ['SCR-7709', 'CK', '@cobalt.k', 'Domestic PEP · municipal office', 77, 'Name + DOB + country', ['Pending', 'Needs 2nd review'], '26 Nov, 06:35'],
  ['SCR-7701', 'NK', '@nova.k', 'Address 0x0f3c…88a1 · OFAC SDN', 100, 'Exact address · WD-20850', ['Rejected', 'Address blocked'], '27 Nov, 18:41'],
  ['SCR-7695', 'HA', '@halcyon', '“HALE, Connor” · UN list', 61, 'Name only', ['Neutral', 'Dismissed — DOB differs'], '26 Nov, 06:33'],
  ['SCR-7690', 'LV', '@lyra_v', '“LYRA” (vessel) · OFAC SDN', 54, 'Name only', ['Neutral', 'Dismissed — entity type'], '25 Nov, 06:30']];
const rows = [];
for (const m of M) rows.push([{ T: 'Text', p: m[0], mono: 1 }, { T: 'User', i: m[1], p: m[2] }, { T: 'Text', p: m[3] }, C(await T(m[4] + ' %', 'Body/S Strong', m[4] >= 80 ? 'text/danger' : m[4] >= 70 ? 'text/warning' : 'text/secondary')), { T: 'Text', p: m[5], c: 'text/secondary' }, { T: 'Status', st: m[6][0], p: m[6][1] }, { T: 'Text', p: m[7], c: 'text/tertiary' }, { T: 'Actions' }]);
await TABLE(c, 'Screening results', [{ k: 'ref', l: 'Ref', w: 104 }, { k: 'user', l: 'User', w: 148 }, { k: 'match', l: 'Matched against', w: 'FILL' }, { k: 'score', l: 'Score', w: 80, r: 1 }, { k: 'basis', l: 'Basis', w: 168 }, { k: 'status', l: 'Status', w: 176 }, { k: 'raised', l: 'Raised (UTC)', w: 116 }, { k: 'act', l: '', w: 44 }], rows, { sel: [0], hideL: ['basis', 'raised'], head: await TH('Recent screening results', { meta: 'Updated 18:44 UTC' }) });
// compare panel
const cp = CARD('Compare SCR-7712', { stroke: 'border/brand', gap: 16 }); add(c, [cp, 'FILL']);
await CHEAD(cp, 'SCR-7712 · @velvet.io vs “VELASCO, Ines”', { icon: 'scale', badges: [await ST('Under review', 'In review')] });
const cols = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(cp, [cols, 'FILL']);
const cmp = []; for (const [fd, us, li, m] of [['Full name', 'Inés Velasco Ortega', 'VELASCO, Ines', 'Partial'], ['Date of birth', '2 Feb 1988', '1988 (year only)', 'Partial'], ['Nationality', 'Spain', 'Venezuela', 'Differs'], ['Residence', 'Japan', '—', 'n/a'], ['Listing basis', '—', 'EU regulation (DEMO reference)', 'n/a']]) cmp.push([{ T: 'Text', p: fd, c: 'text/secondary' }, { T: 'Text', p: us }, { T: 'Text', p: li }, { T: 'Status', st: m === 'Differs' ? 'Approved' : m === 'Partial' ? 'Pending' : 'Neutral', p: m }]);
const tw = AL('VERTICAL', { name: 'Comparison', gap: 8 }); add(cols, [tw, 'FILL']);
await TABLE(tw, 'Comparison', [{ k: 'f', l: 'Attribute', w: 140 }, { k: 'u', l: 'Our user', w: 'FILL' }, { k: 'l', l: 'List entry', w: 'FILL' }, { k: 'm', l: 'Result', w: 120 }], cmp, { bare: 1 });
await WT(tw, '2 partial matches, 1 attribute differs. Policy SAN-2.1: dismiss only when at least one strong identifier (DOB, nationality, document) clearly differs.', 'Caption', 'text/tertiary', 500);
const dec = CARD('Decision', { fill: 'surface/raised', gap: 10, w: 360 }); add(cols, dec);
await CHEAD(dec, 'Decision', { icon: 'user-check', demo: false });
add(dec, [await BTN('Secondary', 'Dismiss as false positive', { size: 'M', lead: 'check' }), 'FILL']);
add(dec, [await BTN('Danger', 'Confirm match (four-eyes)', { size: 'M', lead: 'ban' }), 'FILL']);
await NOTE(dec, 'info', 'info', 'Both need a written reason and your 2FA code. Confirming freezes deposits, play and withdrawals immediately, notifies the MLRO and shows the user a neutral “Account under review” message.', { w: 260 });
return await DONE(f);
