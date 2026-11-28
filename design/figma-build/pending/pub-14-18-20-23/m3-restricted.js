// ===== M3: [PUB-20] Restricted Countries — 390 Default grouped list + Search “united” =====
const BADGE_MAP = { Restricted: 'Restricted', Permitted: 'Approved', Limited: 'Pending' };
async function stat(st) { const b = await BADGE(BADGE_MAP[st], 'S'); b.name = 'Status — ' + st; firstText(b, st); return b; }
const REG = [
 ['Europe', [
  ['Portugal', 'Permitted', 'All products available'],
  ['Germany', 'Limited', 'Global Pool only — casino games need a national licence'],
  ['France', 'Restricted', 'National online-gambling licence required'],
  ['Netherlands', 'Restricted', 'National online-gambling licence required'],
  ['Spain', 'Restricted', 'National online-gambling licence required'],
  ['United Kingdom', 'Restricted', 'UK Gambling Commission licence required']]],
 ['Americas', [
  ['Brazil', 'Limited', 'Global Pool and Originals only'],
  ['Canada', 'Limited', 'Not available in Ontario; permitted elsewhere'],
  ['Mexico', 'Permitted', 'All products available'],
  ['United States', 'Restricted', 'Online gambling regulated state by state — no licence held']]],
 ['Asia-Pacific', [
  ['Australia', 'Restricted', 'Interactive gambling services prohibited'],
  ['Japan', 'Restricted', 'Gambling prohibited by law'],
  ['Singapore', 'Restricted', 'Remote gambling prohibited'],
  ['New Zealand', 'Permitted', 'All products available']]],
 ['Middle East & Africa', [
  ['Iran', 'Restricted', 'International sanctions'],
  ['South Africa', 'Limited', 'Global Pool only'],
  ['United Arab Emirates', 'Restricted', 'Gambling prohibited by law'],
  ['Nigeria', 'Permitted', 'All products available']]],
];
async function legend(C) {
  const lg = box('Status legend', { p: [4, 16, 4, 16], gap: 0 }); add(C, [lg, 'FILL']);
  const L = [['Permitted', 'Sign up, deposit, play and enter the Global Pool.'], ['Limited', 'Some products unavailable — shown per country.'], ['Restricted', 'No gambling products. You can still sign in and withdraw.']];
  for (let i = 0; i < L.length; i++) { const r = AL('HORIZONTAL', { name: 'Legend — ' + L[i][0], gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); if (i < L.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); const b = await stat(L[i][0]); const w = AL('HORIZONTAL', { w: 96 }); add(w, b); add(r, w, [await T(L[i][1], 'Body/S', 'text/secondary', { w: 220 }), 'FILL']); add(lg, [r, 'FILL']); }
}
async function crow(parent, name, st, why, o = {}) {
  const r = AL('HORIZONTAL', { name: 'Country — ' + name, gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); if (!o.last) strokeSides(r, 'border/subtle', { b: 1 });
  const t = AL('VERTICAL', { gap: 2 }); const nm = await T(name, 'Body/M Strong', 'text/primary', { w: 200 }); if (o.term) hilite(nm, o.term); add(t, [nm, 'FILL']); if (o.region) add(t, await T(o.region, 'Overline', 'text/tertiary')); add(t, [await T(why, 'Caption', 'text/tertiary', { w: 200 }), 'FILL']);
  add(r, [t, 'FILL'], await stat(st)); add(parent, [r, 'FILL']); return r;
}
async function travel(C) {
  const tv = box('Travelling?', { p: 16, gap: 10, fill: 'bg/secondary' }); add(C, [tv, 'FILL']);
  const h = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(h, await tile('map-pin', { tint: 'status/info-tint', ic: 'text/info' }), [await T('Travelling or moved?', 'Heading/H5', 'text/primary', { w: 260 }), 'FILL']); add(tv, [h, 'FILL']);
  add(tv, [await T('Availability follows where you are right now, not your nationality. In a restricted region you can still sign in, see your history and withdraw your balance. Please don’t use a VPN or proxy — accounts that hide their location are restricted.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const lk = AL('HORIZONTAL', { gap: 4, align: 'CENTER' }); add(lk, await T('Contact support about your region', 'Label/M', 'text/brand'), await IC('arrow-right', 16, 'icon/brand')); add(tv, lk);
}
// ---------- Frame 1: Default — grouped list ----------
const N1 = '[PUB-20] Restricted Countries / 390 / Default — grouped list';
const S1 = await mshell(N1, COLX[2], { y: 120 }); const C1 = S1.C;
const cnt = REG.reduce((s, g) => s + g[1].length, 0);
await phead(C1, 'AVAILABILITY', 'Restricted countries', 'Where GLOBAL POOL games and the Global Pool are available. We check your location at sign-in and before every deposit, entry and bet.', [['calendar', 'Last updated 27 Nov 2026'], ['file', 'Version 2026.11']]);
const you = box('Your region', { p: 16, gap: 10, stroke: 'border/success' }); add(C1, [you, 'FILL']);
const yr = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(yr, await tile('map-pin'), [await T('Your region: Portugal', 'Body/M Strong', 'text/primary', { w: 160 }), 'FILL'], await stat('Permitted'), await DEMO('XS')); add(you, [yr, 'FILL']);
add(you, [await T('Detected from your network location just now. All products are available to you.', 'Caption', 'text/tertiary', { w: 326 }), 'FILL']);
await legend(C1);
const sf = AL('VERTICAL', { name: 'Search + filters', gap: 12 }); add(C1, [sf, 'FILL']);
add(sf, [await search('Search a country or region', false), 'FILL'], [await pills(['All · ' + cnt, 'Restricted · 10', 'Limited · 4', 'Permitted · 4'], 'All · ' + cnt, 'Status filters — scrolls horizontally'), 'FILL']);
const dl = AL('HORIZONTAL', { name: 'List label', gap: 8, align: 'CENTER' }); add(dl, [await T('Illustrative list — the licensed operator publishes the binding list.', 'Caption', 'text/tertiary', { w: 270 }), 'FILL'], await DEMO('M')); add(C1, [dl, 'FILL']);
for (const [reg, rows] of REG) {
  const g = box('Region — ' + reg, { p: [16, 16, 4, 16], gap: 4 }); add(C1, [g, 'FILL']);
  const nR = rows.filter(r => r[1] === 'Restricted').length, nL = rows.filter(r => r[1] === 'Limited').length, nP = rows.filter(r => r[1] === 'Permitted').length;
  const gh = AL('HORIZONTAL', { name: 'Region header', gap: 12, align: 'CENTER', p: [0, 0, 8, 0] }); strokeSides(gh, 'border/subtle', { b: 1 });
  const gt = AL('VERTICAL', { gap: 2 }); add(gt, await T(reg, 'Heading/H5', 'text/primary'), await T(nR + ' restricted · ' + nL + ' limited · ' + nP + ' permitted', 'Caption', 'text/tertiary')); add(gh, await IC('globe', 20, 'icon/muted'), [gt, 'FILL'], await IC('chevron-up', 20, 'icon/muted')); add(g, [gh, 'FILL']);
  for (let i = 0; i < rows.length; i++) await crow(g, rows[i][0], rows[i][1], rows[i][2], { last: i === rows.length - 1 });
}
const why = box('Why some countries are restricted', { p: 16, gap: 10 }); add(C1, [why, 'FILL']);
add(why, [await T('Why are some countries restricted?', 'Heading/H5', 'text/primary', { w: 326 }), 'FILL'], [await T('Online gambling needs a licence in each country. Where we don’t hold one, where gambling is prohibited, or where international sanctions apply, we don’t offer games or the Global Pool. Limited means a local licence covers only some products.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
await travel(C1); await mlic(C1); await mfinish(S1, { tab: 'Home' });
// ---------- Frame 2: Search — “united” ----------
const N2 = '[PUB-20] Restricted Countries / 390 / Search — “united”';
const S2 = await mshell(N2, COLX[2], { y: below(N1) }); const C2 = S2.C;
await phead(C2, 'AVAILABILITY', 'Restricted countries', null, [['calendar', 'Last updated 27 Nov 2026']]);
const sf2 = AL('VERTICAL', { name: 'Search + filters', gap: 12 }); add(C2, [sf2, 'FILL']);
add(sf2, [await search('united', true), 'FILL'], [await pills(['All · 3', 'Restricted · 3', 'Limited · 0', 'Permitted · 0'], 'All · 3', 'Status filters — scrolls horizontally'), 'FILL']);
const rc = AL('HORIZONTAL', { name: 'Result count', gap: 8, align: 'CENTER' }); add(rc, [await T('3 countries match “united”', 'Body/M Strong', 'text/primary', { w: 220 }), 'FILL'], await DEMO('S'), await T('Clear', 'Label/M', 'text/brand')); add(C2, [rc, 'FILL']);
const rl = box('Results', { p: [4, 16, 4, 16], gap: 0 }); add(C2, [rl, 'FILL']);
const HITS = [['United States', 'Americas', 'Online gambling regulated state by state — no licence held'], ['United Kingdom', 'Europe', 'UK Gambling Commission licence required'], ['United Arab Emirates', 'Middle East & Africa', 'Gambling prohibited by law']];
for (let i = 0; i < HITS.length; i++) await crow(rl, HITS[i][0], 'Restricted', HITS[i][2], { term: 'united', region: HITS[i][1], last: i === HITS.length - 1 });
// detail of the first match
const dt = box('Detail — United States', { p: 16, gap: 12, stroke: 'border/danger' }); add(C2, [dt, 'FILL']);
const dh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(dh, await tile('ban', { tint: 'status/danger-tint', ic: 'text/danger' }), [await T('United States', 'Heading/H5', 'text/primary', { w: 180 }), 'FILL'], await stat('Restricted')); add(dt, [dh, 'FILL']);
add(dt, [await T('Online gambling is licensed state by state and GLOBAL POOL holds no US licence, so no gambling products are offered anywhere in the United States.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
async function list(title, items, ic, col) { const l = AL('VERTICAL', { name: title, gap: 6 }); add(l, await T(title, 'Label/M', 'text/primary')); for (const s of items) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await IC(ic, 16, col), [await T(s, 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(l, [r, 'FILL']); } return l; }
add(dt, [await list('Still available', ['Sign in and see your balance and history', 'Withdraw your Available balance', 'Responsible-gaming tools and support'], 'check-circle', 'text/success'), 'FILL'], [await list('Not available', ['Deposits and new sign-ups', 'Global Pool entries and all games', 'Promotions and VIP rewards'], 'x-circle', 'text/danger'), 'FILL']);
add(dt, [await BTN('Secondary', 'How to withdraw from a restricted region', { size: 'L' }), 'FILL']);
await travel(C2);
const nf = AL('HORIZONTAL', { name: 'Not listed', gap: 10, align: 'CENTER', fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16 }); add(nf, await IC('help-circle', 20, 'icon/muted'), [await T('Can’t find your country? It isn’t supported yet — contact support before you sign up.', 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(C2, [nf, 'FILL']);
await mlic(C2); await mfinish(S2, { tab: 'Home' });
restack(COLX[2]); fitSection(sec);
await S1.f.screenshot({ scale: 0.5 }); await S2.f.screenshot({ scale: 0.5 });
return { section: sec.id, created: CREATED, audits: [audit(S1.f), audit(S2.f)], notes: NOTES };
