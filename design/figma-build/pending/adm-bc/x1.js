const LIST = [['68:53474', 'C1Q'], ['75:56265', 'C1R'], ['77:56703', 'C2'], ['86:116072', 'C3']];
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
// ADM-P section (56000, w 15720) ends at 71720 and overlaps x=70000: shift this section right (children move with it)
if (Math.round(sec.x) === 70000) sec.x = 72000;
// fixes on desktop masters before cloning
const CTX = { '68:53474': { 'Decisions today': 'vs yesterday', 'Median time to decision': 'vs previous 7 d' }, '77:56703': { 'Open alerts': 'vs yesterday', 'Alerts closed (7 days)': 'vs previous 7 d' }, '86:116072': { 'Open cases': 'vs yesterday', 'Reports filed in November': 'vs October', 'Funds held by restriction': 'held, not seized' } };
for (const [fid, m] of Object.entries(CTX)) { const fr = await figma.getNodeByIdAsync(fid); if (!fr) continue; for (const k of fr.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Admin/KPI Tile — '))) { const lab = k.name.replace('Admin/KPI Tile — ', ''); if (m[lab]) { const t = k.findOne(n => n.type === 'TEXT' && /^vs /.test(n.characters)); if (t) await setText(t, m[lab]); else MISS.push('ctx ' + lab); } } }
{ const c3 = await figma.getNodeByIdAsync('86:116072'); const k = c3 && c3.findOne(n => n.name === 'Admin/KPI Tile — Funds held by restriction'); if (k) await setT(k, 'Definition', 'WD-20952 + WD-20960 · held under restriction, not seized'); }
const made = [];
for (const [id, key] of LIST) {
  const src = await figma.getNodeByIdAsync(id); if (!src) { MISS.push('no ' + id); continue; }
  const nm = src.name.replace('/ 1440 /', '/ 1280 /'); if (sec.children.find(n => n.name === nm)) { MISS.push('exists ' + nm); continue; }
  const band = src.name.startsWith('[ADM-C') ? 'C-1280' : 'B-1280';
  const p = POS(band, key); const f = src.clone(); sec.appendChild(f); f.name = nm; f.x = p.x; f.y = p.y;
  f.resize(1280, f.height); f.primaryAxisSizingMode = 'AUTO';
  const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === 'Laptop 1280'); if (bm) f.setExplicitVariableModeForCollection(bc, bm.modeId);
  for (const t of f.findAll(n => n.name.startsWith('Table — ') && n.name.includes('{hideL:'))) { const ks = t.name.match(/\{hideL:([^}]*)\}/)[1].split(','); for (const n of t.findAll(x => ks.some(k => x.name === 'Col/' + k || x.name === 'H/' + k))) n.visible = false; }
  for (const n of f.findAll(x => x.name.includes('[hideL]'))) n.visible = false;
  for (const t of f.findAll(n => n.type === 'TEXT' && n.parent && n.parent.name && n.parent.name.startsWith('Doc — '))) { t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; }
  if (f.name.startsWith('[ADM-C1] KYC Review')) { const rr = f.findOne(n => n.name === 'Decision rail'); if (rr) { rr.resize(360, rr.height); rr.primaryAxisSizingMode = 'AUTO'; } const pm = f.findOne(n => n.name === 'Passport mock'); if (pm) pm.rescale(0.85); for (const t of f.findAll(n => n.type === 'TEXT')) { if (t.characters === 'Chrome 131 · macOS · Berlin') await setText(t, 'Chrome · Berlin'); else if (t.characters === 'IP country matches residence') await setText(t, 'IP matches residence'); } }
  made.push(f);
}
const NAME = '[ADM-C4] Sanctions Screening / 1440 / Default';
const { f, c } = await SHELL(NAME, POS('C-1440', 'C4'), 'C', 3, 'KO', 'Search screening ref, user, address…');
await HEAD(c, ['Admin', 'Compliance', 'Sanctions screening'], 'Sanctions screening', 'Users are screened at sign-up, at every KYC step and in a daily rescreen; every withdrawal destination is screened before broadcast. Confirming a match freezes the account and opens a report — it always needs a second approver. List versions shown are DEMO.', { badges: [await DEMO('M')], actions: [await BTN('Secondary', 'Export screening log', { size: 'S', lead: 'download' }), await BTN('Secondary', 'Next rescreen 28 Nov, 06:00', { size: 'S', lead: 'refresh', state: 'Disabled' })] });
const lists = []; for (const [n, t, e] of [['OFAC SDN', '27 Nov 2026, 05:40 UTC', '12,418 entries'], ['EU consolidated', '27 Nov 2026, 05:42 UTC', '5,903 entries'], ['UN Security Council', '26 Nov 2026, 22:10 UTC', '1,012 entries'], ['UK sanctions list', '27 Nov 2026, 05:45 UTC', '4,377 entries']]) { const k = CARD('List — ' + n, { gap: 8, p: 16 }); const h = AL('HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); add(h, await IC('database', 18, 'icon/muted'), await T(n, 'Body/M Strong', 'text/primary')); add(h, [SPC(), 'FILL']); add(h, await DEMO('XS')); add(k, [h, 'FILL']); add(k, await ST('Approved', 'Up to date')); add(k, await T('Updated ' + t, 'Caption', 'text/tertiary'), await T(e + ' · feed (DEMO)', 'Caption', 'text/tertiary')); lists.push(k); }
await ROW(c, lists);
await ROW(c, [await KPI('Flat', 'Users rescreened today', '184,320', 'users', '100%', 'Daily run 27 Nov 06:00–06:41 UTC · coverage of all accounts', 'coverage'), await KPI('Flat', 'Potential matches to review', '2', 'matches', '+1 today', 'Name and PEP matches waiting for a decision', 'vs yesterday'), await KPI('Up', 'Destinations screened (24 h)', '1,186', 'addresses', '+4.1%', 'Before every broadcast · 1 blocked (WD-20850)', 'vs previous 24 h')], { spark: 1 });
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
for (const m of made) await m.screenshot({ scale: 0.3 });
return await DONE(f, { laptop: made.map(m => [m.id, m.name, Math.round(m.height)]) });
