// ===== M1: [PUB-14] FAQ — 390 Default, Search “withdraw”, No results “bonus code” =====
const CATS = [
 ['Fees', 'percent', [
  ['What does the 0.05 USDT platform fee cover?', 'It pays for running each draw — the Chainlink VRF request, on-chain settlement and prize payouts. It is charged once per qualifying entry, shown as its own line before you confirm, and never added to the pool.'],
  ['Do I pay a fee to withdraw?', 'GLOBAL POOL charges 0.00 USDT. You only pay the network fee of the chain you pick — for example 0.08 USDT on Arbitrum or 2.40 USDT on Ethereum — shown before you confirm.'],
  ['Are there fees on game bets?', 'No platform fee on Originals or table games. Each game shows its house edge instead, e.g. Orbit Rush 1.00% or Pool Roulette 2.70%.']]],
 ['Deposits & withdrawals', 'wallet', [
  ['Which networks can I deposit USDT on?', 'BNB Chain, Polygon, Arbitrum, Ethereum and Solana. Minimum deposit 10.00 USDT. Send only USDT on the network you selected — tokens sent on another network may be lost.'],
  ['How long does a withdrawal take?', 'Most withdrawals are sent within minutes of the automatic checks. A first payout to a new address or an AML flag can add a manual review — usually under 4 hours — and we always show the reason and the expected time.'],
  ['Why is there a 24-hour cooldown on new addresses?', 'It protects you if someone gets into your account: a newly whitelisted address can receive withdrawals 24 hours after you add it.']]],
 ['Global Pool', 'pool', [
  ['How is the winner chosen?', 'When a round closes at its published time, Chainlink VRF on Arbitrum returns a random number that the contract maps to entries. Nobody — including us — can choose or change winners.'],
  ['What if a round misses its threshold?', 'A round needs at least 500 participants and 50,000.00 USDT. If it closes below either, it is cancelled and every entry and platform fee is refunded to your Owed balance.']]],
 ['Fairness', 'shield-check', [
  ['How do I verify a game result?', 'Every Originals bet uses a committed server seed, your client seed and a nonce. Open Provably Fair, paste them in and compare — the result and hash must match.'],
  ['Can VIP status or promotions change my odds?', 'No. Odds, house edge and draws are the same for every player and every tier.']]],
 ['KYC & security', 'id-card', [
  ['Why do I need to verify my identity?', 'Licensed operators must confirm your age and identity. Level 2 (ID + liveness check) unlocks withdrawals of up to 25,000.00 USDT a day.'],
  ['Will you ever ask for my seed phrase?', 'Never. We never ask for your seed phrase, private keys, password or 2FA codes. Every email from us shows your anti-phishing code.']]],
 ['Restrictions', 'globe', [
  ['Can I play from my country?', 'Only where GLOBAL POOL is licensed or permitted. Check Restricted countries — if your region is restricted you can still sign in and withdraw your balance.'],
  ['Can I use a VPN?', 'No. Hiding your location with a VPN or proxy breaks our terms and the account is restricted. When you travel, play resumes once you are back in a permitted region.']]],
];
const TOTAL = CATS.reduce((s, c) => s + c[2].length, 0);
async function faqCard(parent, q, a, o = {}) {
  const inst = await I('23:16819', { State: o.open ? 'Expanded' : 'Collapsed' }, { Question: q, Answer: a }); inst.name = 'Card/FAQ Item — ' + q.slice(0, 44);
  add(parent, [inst, 'FILL']);
  if (o.open) { if (o.example) txt(inst, 'Example', o.example); const ls = inst.findAll(n => n.type === 'TEXT' && n.name === 'Link label'); if (o.links) o.links.forEach((l, i) => { if (ls[i]) ls[i].characters = l; }); if (!o.example) { const ex = inst.findOne(n => n.name === 'Example'); if (ex) { const pp = ex.parent; if (pp && pp !== inst && !pp.findOne(n => n.name === 'Answer')) pp.visible = false; else ex.visible = false; } } }
  if (o.term) hilite(inst.findOne(n => n.type === 'TEXT' && n.name === 'Question'), o.term);
  const left = fitInst(inst); if (left.length) NOTES.push('FAQ item overflow: ' + q.slice(0, 30) + ' ' + left.join(','));
  return inst;
}
async function helpCard(C) {
  const h = box('Still need help?', { p: 20, gap: 12 }); add(C, [h, 'FILL']);
  const hr = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(hr, await tile('chat'), [await T('Still need help?', 'Heading/H5', 'text/primary', { w: 260 }), 'FILL']); add(h, [hr, 'FILL']);
  add(h, [await T('Real people, around the clock. Live chat answers in minutes; most emails get a first reply in about 2 hours.', 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
  add(h, [await BTN('Primary', 'Start live chat', { size: 'L', lead: 'chat' }), 'FILL'], [await BTN('Secondary', 'Email support', { size: 'L', lead: 'mail' }), 'FILL']);
  const rg = box('Responsible gaming', { p: 16, gap: 10, fill: 'bg/secondary' }); add(C, [rg, 'FILL']);
  const rr = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(rr, await tile('shield', { tint: 'status/info-tint', ic: 'text/info' }), [await T('Playing more than you planned?', 'Body/M Strong', 'text/primary', { w: 220 }), 'FILL'], await I('6:159')); add(rg, [rr, 'FILL']);
  add(rg, [await T('Set deposit, loss or time limits, take a break or self-exclude — free, and it works on every game and the Global Pool.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const lk = AL('HORIZONTAL', { gap: 4, align: 'CENTER' }); add(lk, await T('Responsible gaming tools', 'Label/M', 'text/brand'), await IC('arrow-right', 16, 'icon/brand')); add(rg, lk);
}
// ---------- Frame 1: Default — All questions ----------
const N1 = '[PUB-14] FAQ / 390 / Default — All questions';
const S1 = await mshell(N1, COLX[0], { y: 120 }); const C1 = S1.C;
await phead(C1, 'HELP CENTRE', 'Frequently asked questions', 'Straight answers on fees, deposits and withdrawals, the Global Pool draw, fairness, KYC and where we operate.', [['book', TOTAL + ' answers in 6 categories'], ['calendar', 'Updated 27 Nov 2026']]);
const sb1 = AL('VERTICAL', { name: 'Search + categories', gap: 12 }); add(C1, [sb1, 'FILL']);
add(sb1, [await search('Search the FAQ — e.g. “withdrawal fee”', false), 'FILL'], [await pills(['All', ...CATS.map(c => c[0])], 'All'), 'FILL']);
for (let ci = 0; ci < CATS.length; ci++) {
  const [cat, ic, qs] = CATS[ci];
  const g = AL('VERTICAL', { name: 'Category — ' + cat, gap: 12 }); add(C1, [g, 'FILL']);
  const gh = AL('HORIZONTAL', { name: 'Category header', gap: 12, align: 'CENTER' }); add(gh, await tile(ic), [await T(cat, 'Heading/H5', 'text/primary', { w: 200 }), 'FILL'], await T(qs.length + ' questions', 'Caption', 'text/tertiary')); add(g, [gh, 'FILL']);
  for (let qi = 0; qi < qs.length; qi++) {
    const open = ci === 0 && qi === 0;
    await faqCard(g, qs[qi][0], qs[qi][1], open ? { open: true, example: 'Example: 35 entries → 350.00 USDT to the pool + 1.75 USDT platform fee = 351.75 USDT in total.', links: ['Read the fee schedule', 'How draws are verified'] } : {});
  }
}
await helpCard(C1); await mlic(C1); await mfinish(S1, { tab: 'Home' });
// ---------- Frame 2: Search results “withdraw” ----------
const N2 = '[PUB-14] FAQ / 390 / Search results — “withdraw”';
const S2 = await mshell(N2, COLX[0], { y: below(N1) }); const C2 = S2.C;
await phead(C2, 'HELP CENTRE', 'Frequently asked questions', null, null);
const sb2 = AL('VERTICAL', { name: 'Search + filters', gap: 12 }); add(C2, [sb2, 'FILL']);
add(sb2, [await search('withdraw', true), 'FILL']);
const RES = [
 ['Deposits & withdrawals', 'How long does a withdrawal take?', CATS[1][2][1][1], true],
 ['Deposits & withdrawals', 'Why is there a 24-hour cooldown before I can withdraw to a new address?', CATS[1][2][2][1]],
 ['Deposits & withdrawals', 'What are the withdrawal minimum and daily limit?', 'Minimum 20.00 USDT on every network. At KYC Level 2 you can withdraw up to 25,000.00 USDT per day.'],
 ['Fees', 'Do I pay a fee to withdraw?', CATS[0][2][1][1]],
 ['Restrictions', 'Can I withdraw if my country is restricted?', 'Yes. You can always sign in and withdraw your Available balance from a restricted region — only deposits, entries and games are blocked.'],
];
add(sb2, [await pills(['All · ' + RES.length, 'Deposits & withdrawals · 3', 'Fees · 1', 'Restrictions · 1'], 'All · ' + RES.length, 'Result filters — scrolls horizontally'), 'FILL']);
const rm = AL('HORIZONTAL', { name: 'Result count', gap: 8, align: 'CENTER' }); add(rm, [await T(RES.length + ' answers match “withdraw”', 'Body/M Strong', 'text/primary', { w: 260 }), 'FILL'], await T('Clear', 'Label/M', 'text/brand')); add(C2, [rm, 'FILL']);
const rl = AL('VERTICAL', { name: 'Results', gap: 16 }); add(C2, [rl, 'FILL']);
for (const [cat, q, a, open] of RES) {
  const it = AL('VERTICAL', { name: 'Result — ' + q.slice(0, 40), gap: 6 }); add(rl, [it, 'FILL']);
  add(it, await T(cat.toUpperCase(), 'Overline', 'text/tertiary'));
  const c = await faqCard(it, q, a, open ? { open: true, term: 'withdraw', example: 'Example: WD-20931 · 1,500.00 USDT to a new Arbitrum address → manual AML review, decision expected by 22:44 UTC.', links: ['Withdrawal steps', 'Network fees'] } : { term: 'withdraw' });
  if (open) hilite(c.findOne(n => n.type === 'TEXT' && n.name === 'Answer'), 'withdraw');
}
await helpCard(C2); await mlic(C2); await mfinish(S2, { tab: 'Home' });
// ---------- Frame 3: No results “bonus code” ----------
const N3 = '[PUB-14] FAQ / 390 / Search — no results “bonus code”';
const S3 = await mshell(N3, COLX[0], { y: below(N2) }); const C3 = S3.C;
await phead(C3, 'HELP CENTRE', 'Frequently asked questions', null, null);
add(C3, [await search('bonus code', true), 'FILL']);
const em = box('Empty state — no results', { p: 24, gap: 16, align: 'CENTER' }); add(C3, [em, 'FILL']);
add(em, await tile('search', { size: 28, p: 12, tint: 'surface/raised', ic: 'icon/muted' }));
add(em, [await T('No answers for “bonus code”', 'Heading/H4', 'text/primary', { w: 310, align: 'CENTER' }), 'FILL'], [await T('Check the spelling or try a shorter word. Welcome offers don’t need a code — eligible offers appear on the Promotions page with their full terms.', 'Body/S', 'text/secondary', { w: 310, align: 'CENTER' }), 'FILL']);
const sug = AL('HORIZONTAL', { name: 'Suggestions', gap: 8, align: 'CENTER', wrap: true, cgap: 8, justify: 'CENTER' }); add(em, [sug, 'FILL']);
for (const s of ['bonus', 'welcome offer', 'wagering']) { const ch = await I('17:2766', { State: 'Default' }, { Label: s, 'Show icon': false }); ch.name = 'Suggestion — ' + s; sug.appendChild(ch); }
add(em, [await BTN('Secondary', 'Browse all ' + TOTAL + ' questions', { size: 'L' }), 'FILL'], [await BTN('Ghost', 'Contact support', { size: 'L', lead: 'chat' }), 'FILL']);
const pop = AL('VERTICAL', { name: 'Popular questions', gap: 12 }); add(C3, [pop, 'FILL']);
add(pop, [await mhead('POPULAR', 'People often ask', null), 'FILL']);
const pl = box('Popular list', { p: [4, 16, 4, 16], gap: 0 }); add(pop, [pl, 'FILL']);
const POP = ['What does the 0.05 USDT platform fee cover?', 'How long does a withdrawal take?', 'How is the winner chosen?', 'Can I play from my country?'];
for (let i = 0; i < POP.length; i++) { const r = AL('HORIZONTAL', { name: 'Row — ' + POP[i].slice(0, 30), gap: 12, align: 'CENTER', p: [14, 0, 14, 0] }); if (i < POP.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(POP[i], 'Body/M', 'text/primary', { w: 280 }), 'FILL'], await IC('chevron-right', 20, 'icon/muted')); add(pl, [r, 'FILL']); }
await helpCard(C3); await mlic(C3); await mfinish(S3, { tab: 'Home' });
restack(COLX[0]); fitSection(sec);
await S1.f.screenshot({ scale: 0.5 }); await S2.f.screenshot({ scale: 0.5 }); await S3.f.screenshot({ scale: 0.5 });
return { section: sec.id, created: CREATED, audits: [audit(S1.f), audit(S2.f), audit(S3.f)], notes: NOTES };
