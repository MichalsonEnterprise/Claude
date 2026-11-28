const NAME = '[PUB-12] About Us / 1440 / Default';
const S = await shell(NAME, 3240, 120, '—'); const C = S.content;
const { hero, copy } = await crumbHero(C, 'About us', 'Hero — About GLOBAL POOL');
add(copy, await T('ABOUT GLOBAL POOL', 'Overline', 'text/brand'));
add(copy, [await T('A global jackpot anyone can check', 'Heading/H1', 'text/primary', { w: 560 }), 'FILL']);
add(copy, [await T('One shared prize pool drawn every day, plus a catalogue of original games. Every draw is decided by Chainlink VRF, every fee is shown as its own line, and every limit you set is honoured. That is the whole idea.', 'Body/L', 'text/secondary', { w: 560 }), 'FILL']);
const acts = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(acts, await BTN('Primary', 'See today’s round', { size: 'L' }), await BTN('Ghost', 'How it works', { size: 'L', trail: 'arrow-right' })); add(copy, acts);
const hn = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(hn, await I('6:159'), await T('Available only in permitted jurisdictions · Play responsibly', 'Caption', 'text/tertiary')); add(copy, hn);
abs(hero, rect(560, 820, 'accent/gold-tint', 0, 'Angled colour block — gold tint'), 720, -170, 14);
abs(hero, rect(64, 820, 'brand/primary', 0, 'Angled colour block — mint stripe'), 650, -170, 14);
const tk = await I('23:8534', { State: 'Active' }); tk.name = 'Object — entry ticket (cropped)'; abs(hero, tk, 900, 250, 12);
const dc = await I('24:13861', { State: 'Open' }); dc.name = 'Preview — Card/Draw Countdown (cropped)'; abs(hero, dc, 700, 44); await fx(dc, 'Elevation/3 — Popover');

// ---- mission ----
const mis = AL('HORIZONTAL', { name: 'Mission', gap: 48, p: [8, 0, 8, 0] }); add(C, [mis, 'FILL']);
const ml = AL('VERTICAL', { gap: 12 }); add(mis, [ml, 'FILL']);
add(ml, await T('OUR MISSION', 'Overline', 'text/brand'), [await T('Make every draw, fee and payout verifiable by the people who play.', 'Display/M', 'text/primary', { w: 640 }), 'FILL']);
const mr = AL('VERTICAL', { gap: 12, w: 420 }); add(mis, mr);
add(mr, [await T('Most online jackpots ask you to trust a number. We publish the pool, the entries, the randomness request and the settlement transaction for every round — from round #1 on 29 Jun 2023 to round #1,248 closing tonight at 20:00 UTC.', 'Body/M', 'text/secondary', { w: 420 }), 'FILL'], [await T('If something we show can’t be checked, we treat it as a bug.', 'Body/M Strong', 'text/primary', { w: 420 }), 'FILL']);

// ---- principles ----
add(C, [await head('WHAT WE STAND FOR', 'Three principles we don’t trade off', 'They shape every screen, from the lobby to the withdrawal form.'), 'FILL']);
const pr = AL('HORIZONTAL', { name: 'Principles', gap: 16 }); add(C, [pr, 'FILL']);
for (const [ic, t, b, l] of [
  ['shield-check', 'Verifiable', 'Global Pool winners are picked by Chainlink VRF on Arbitrum and settled on-chain; Originals use a committed server seed you can check after every bet. Our admins cannot choose winners or edit results.', 'Verify a draw'],
  ['receipt', 'Transparent fees', 'A 0.05 USDT platform fee per qualifying entry, always on its own line. Network fees are shown before you confirm. House edge is printed on every game.', 'See all fees'],
  ['heart', 'Responsible by default', 'Deposit, loss and session limits, reality checks, cooling-off and self-exclusion are one tap away — and never harder to use than the deposit button.', 'Responsible gaming']]) {
  const c = await I('23:16859', { State: 'Default' }, { Title: t, Body: b, Link: l, 'Show link': true, Icon: ICONS[ic] }); c.name = 'Card/Feature — ' + t; tint(c.findOne(n => n.name === 'Icon'), 'icon/brand'); add(pr, [c, 'FILL_BOTH']);
}
const nv = box('What we will never do', { gap: 16, p: 24 }); add(C, [nv, 'FILL']);
add(nv, await T('What we will never do', 'Heading/H5', 'text/primary'));
const ng = AL('HORIZONTAL', { gap: 12, wrap: true, cgap: 12 }); add(nv, [ng, 'FILL']);
for (const t of ['Pre-tick consent boxes or marketing opt-ins', 'Run countdowns that aren’t tied to a real close time', 'Hide odds, fees or limits behind extra clicks', 'Make withdrawals or self-exclusion harder than deposits', 'Let anyone — including staff — pick winners or change results', 'Suggest VPNs or other ways around regional restrictions']) {
  const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER', w: 352 }); add(r, await IC('x-circle', 18, 'text/danger'), [await T(t, 'Body/S', 'text/secondary', { w: 320 }), 'FILL']); add(ng, r); }

// ---- numbers ----
add(C, [await head('BY THE NUMBERS', 'Three years of daily draws', null, await DEMO('M')), 'FILL']);
const nb = AL('HORIZONTAL', { name: 'Numbers', gap: 16 }); add(C, [nb, 'FILL']);
for (const [v, l, s] of [['1,248', 'daily rounds', 'since round #1 on 29 Jun 2023'], ['184,320', 'registered players', 'in permitted jurisdictions'], ['0.05 USDT', 'platform fee per entry', 'unchanged since round #1'], ['5', 'networks for USDT', 'BNB Chain, Polygon, Arbitrum, Ethereum, Solana']]) {
  const b = box('Number — ' + l, { gap: 6, p: 24 }); add(nb, [b, 'FILL_BOTH']);
  const h = AL('HORIZONTAL', { gap: 8, align: 'CENTER', justify: 'SPACE_BETWEEN' }); add(h, await T(v, 'Number/L', 'text/primary'), await DEMO('XS')); add(b, [h, 'FILL']);
  add(b, await T(l, 'Body/M Strong', 'text/primary'), [await T(s, 'Body/S', 'text/tertiary', { w: 220 }), 'FILL']); }

// ---- timeline ----
add(C, [await head('OUR STORY', 'How we got here', null, await DEMO('M')), 'FILL']);
const tl = AL('HORIZONTAL', { name: 'Timeline', gap: 0 }); add(C, [tl, 'FILL']);
const ms = [['29 Jun 2023', 'Round #1', 'First daily Global Pool round drawn with Chainlink VRF on Arbitrum.'], ['2024', 'Originals', 'Orbit Rush, Pool Dice and Double Side launch with seed verification on every bet.'], ['2025', 'Contract v1.3.0', 'GlobalPool upgraded behind a 48 h timelock and 3-of-5 multisig.'], ['2026', 'Five networks', 'USDT on BNB Chain, Polygon, Arbitrum, Ethereum and Solana; RG tools in every game.'], ['27 Nov 2026', 'Round #1,248', 'Open now — closes 20:00 UTC with 3,412 participants.']];
for (let i = 0; i < ms.length; i++) { const [d, t, b] = ms[i];
  const st = AL('VERTICAL', { name: 'Milestone — ' + t, gap: 10, p: [0, 16, 0, 0] }); add(tl, [st, 'FILL']);
  const rail = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rail, ellipse(12, 12, i === ms.length - 1 ? 'brand/primary' : 'border/strong', 'Dot')); const ln = rect(100, 2, i === ms.length - 1 ? null : 'border/default', 0, 'Rail'); add(rail, [ln, 'FILL']); add(st, [rail, 'FILL']);
  add(st, await T(d, 'Label/M', i === ms.length - 1 ? 'text/brand' : 'text/tertiary'), await T(t, 'Heading/H5', 'text/primary'), [await T(b, 'Body/S', 'text/secondary', { w: 200 }), 'FILL']); }

// ---- team ----
add(C, [await head('THE TEAM', 'People behind the pool', 'Placeholder profiles: names and roles are fictional for this design. Staff never ask for passwords, 2FA codes or seed phrases.', await DEMO('M')), 'FILL']);
const tg = AL('HORIZONTAL', { name: 'Team grid', gap: 16, wrap: true, cgap: 16 }); add(C, [tg, 'FILL']);
for (const [ini, n, r, d] of [['SI', 'S. Iyer', 'Head of Platform Operations', 'Keeps daily rounds on schedule and leads incident response.'], ['KO', 'K. Osei', 'Compliance Officer (MLRO)', 'Licensing, AML/KYC and sanctions screening.'], ['AM', 'A. Marin', 'Finance Lead', 'Treasury, withdrawal reviews and daily reconciliation.'], ['RD', 'R. Duarte', 'Player Support (L2)', 'Runs the 24/7 support desk and complaint handling.'], ['ML', 'M. Lindqvist', 'Smart-contract Engineering', 'Owns the GlobalPool and VRFConsumer contracts and their audits.'], ['TO', 'T. Okafor', 'Responsible Gaming Lead', 'Designs limits, reality checks and self-exclusion flows.']]) {
  const b = AL('HORIZONTAL', { name: 'Team — ' + n, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 20, gap: 16, w: 368 });
  const av = await I('9:238', { Size: 'L' }, { Initials: ini, 'Show status': false }); add(b, av);
  const tx = AL('VERTICAL', { gap: 4 }); const nr = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(nr, await T(n, 'Body/M Strong', 'text/primary'), await DEMO('XS'));
  add(tx, nr, await T(r, 'Label/M', 'text/brand'), [await T(d, 'Body/S', 'text/secondary', { w: 230 }), 'FILL']); add(b, [tx, 'FILL']); add(tg, b); }

// ---- licence & company ----
add(C, [await head('LICENCE & COMPANY', 'Who operates GLOBAL POOL', null), 'FILL']);
const lc = AL('HORIZONTAL', { name: 'Licence & company', gap: 16 }); add(C, [lc, 'FILL']);
add(lc, await I('6:158', { Variant: 'Card' }));
const co = box('Company details', { gap: 0, p: 24 }); add(lc, [co, 'FILL_BOTH']);
const coh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(coh, [await T('Company details', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('S')); add(co, [coh, 'FILL']);
for (const [k, v] of [['Operator', '[Operator name] — placeholder'], ['Registered office', '[Registered address] — placeholder'], ['Gaming licence', '[Regulator], licence no. [number] — placeholder'], ['Where we operate', 'Permitted jurisdictions only — see Restricted countries'], ['Press & partnerships', 'press@globalpool.example (placeholder address)']]) {
  const r = AL('HORIZONTAL', { gap: 16, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await T(k, 'Body/S', 'text/tertiary', { w: 180 }), [await T(v, 'Body/S Strong', 'text/primary', { w: 360 }), 'FILL']); add(co, [r, 'FILL']); }
const cta = AL('HORIZONTAL', { gap: 8, p: [12, 0, 0, 0] }); add(cta, await BTN('Secondary', 'Contact us', { size: 'S', lead: 'mail' }), await BTN('Ghost', 'Restricted countries', { size: 'S', trail: 'arrow-right' })); add(co, cta);
await licence(C);
S.f.primaryAxisSizingMode = 'AUTO'; fitSection(sec);
await hero.screenshot({ scale: 0.5 });
return { frame: S.f.id, content: C.id, hero: hero.id, h: S.f.height };
