// ===== M2: [PUB-18] Responsible Gaming — 390 Default (resources) =====
const N = '[PUB-18] Responsible Gaming / 390 / Default';
const S = await mshell(N, COLX[1], { y: 120 }); const C = S.C;
await phead(C, 'RESPONSIBLE GAMING', 'Play for fun. Stay in control.', 'Gambling is entertainment that costs money — never a way to earn money or fix money worries. Our tools are free, take a minute to set up and cover every game and the Global Pool.', [['shield-check', 'Free tools · no questions asked'], ['calendar', 'Updated 27 Nov 2026']]);
const ad = AL('HORIZONTAL', { name: '18+ notice', gap: 12, align: 'CENTER', fill: 'bg/secondary', stroke: 'border/subtle', r: 14, p: [12, 16, 12, 16] }); add(ad, await I('6:159'), [await T('Adults only. GLOBAL POOL is for players 18+ in permitted jurisdictions. We verify age before any withdrawal.', 'Body/S', 'text/secondary', { w: 280 }), 'FILL']); add(C, [ad, 'FILL']);
const cta = AL('VERTICAL', { name: 'Primary actions', gap: 8 }); add(C, [cta, 'FILL']);
add(cta, [await BTN('Primary', 'Set your limits', { size: 'L', lead: 'sliders' }), 'FILL'], [await BTN('Secondary', 'Take a break', { size: 'L', lead: 'pause-circle' }), 'FILL'], [await T('Not signed in? We’ll ask you to sign in first — tools apply to your whole account on every device.', 'Caption', 'text/tertiary', { w: 358, align: 'CENTER' }), 'FILL']);
// Tools overview
const tl = AL('VERTICAL', { name: 'Tools overview', gap: 12 }); add(C, [tl, 'FILL']);
add(tl, [await mhead('YOUR TOOLS', 'Four ways to stay in control', 'Lowering protection is always slower than adding it — on purpose.'), 'FILL']);
const TOOLS = [
 ['sliders', 'brand/tint', 'icon/brand', 'Limits', 'Lower: instantly · Raise: after 24 h', 'Set deposit, participation, loss and session-time limits per day, week or month. A pending increase can be cancelled at any time.', 'usage'],
 ['timer', 'status/info-tint', 'text/info', 'Reality checks', 'Every 30, 60 or 90 min', 'A reminder shows how long you’ve played and your net result. Continue, view history or stop — three equal choices, never a hidden close button.', 'reality'],
 ['pause-circle', 'status/warning-tint', 'text/warning', 'Cooling-off', '24 hours · 7 days · 30 days', 'Pause deposits, entries and games. Withdrawals stay open and entries already in a Global Pool round stay in the draw. A break can’t be shortened.', null],
 ['ban', 'status/danger-tint', 'text/danger', 'Self-exclusion', '6 months · 1 year · 5 years · Permanent', 'Close access to every gambling product. It can’t be reversed early, all marketing stops and your balance stays withdrawable.', null],
];
for (const [ic, tintV, icC, title, chip, body, extra] of TOOLS) {
  const c = box('Tool — ' + title, { p: 16, gap: 12 }); add(tl, [c, 'FILL']);
  const h = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(h, await tile(ic, { tint: tintV, ic: icC }), [await T(title, 'Heading/H5', 'text/primary', { w: 200 }), 'FILL'], await IC('chevron-right', 20, 'icon/muted')); add(c, [h, 'FILL']);
  const ch = AL('HORIZONTAL', { name: 'Timing chip', gap: 6, align: 'CENTER', fill: 'surface/raised', r: 9999, p: [4, 10, 4, 10] }); add(ch, await IC('clock', 14, 'icon/muted'), await T(chip, 'Label/S', 'text/secondary')); add(c, ch);
  add(c, [await T(body, 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  if (extra === 'usage') {
    const ex = AL('VERTICAL', { name: 'Example — daily participation limit', gap: 8, fill: 'bg/secondary', r: 10, p: 12 }); add(c, [ex, 'FILL']);
    const r1 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r1, [await T('Daily participation limit', 'Label/M', 'text/secondary', { w: 160 }), 'FILL'], await T('351.75 / 500.00 USDT', 'Number/S', 'text/primary'), await DEMO('XS')); add(ex, [r1, 'FILL']);
    const bar = AL('HORIZONTAL', { name: 'Usage bar 70%', fill: 'surface/raised', r: 9999, h: 6, w: 302 }); const used = rect(211, 6, 'brand/primary', 9999, 'Used 70%'); bar.appendChild(used); add(ex, [bar, 'FILL']);
    add(ex, [await T('148.25 USDT left today · resets 00:00 UTC', 'Caption', 'text/tertiary', { w: 300 }), 'FILL']);
  }
  if (extra === 'reality') {
    const ex = AL('HORIZONTAL', { name: 'Example — reality check', gap: 10, align: 'CENTER', fill: 'bg/secondary', r: 10, p: 12 }); add(c, [ex, 'FILL']);
    add(ex, await IC('timer', 18, 'text/info'), [await T('“You’ve played for 60 minutes. Net result this session: −24.60 USDT.”', 'Body/S', 'text/primary', { w: 240 }), 'FILL'], await DEMO('XS'));
  }
}
// Self-assessment teaser
const sa = box('Self-assessment teaser', { p: 20, gap: 14, fill: 'surface/raised', stroke: 'border/brand', r: 20 }); add(C, [sa, 'FILL']);
add(sa, await T('SELF-ASSESSMENT', 'Overline', 'text/brand'), [await T('Is it still fun? Take a 2-minute check', 'Heading/H4', 'text/primary', { w: 318 }), 'FILL'], [await T('9 private questions based on the Problem Gambling Severity Index. Answers stay on your device — we never see them.', 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
const qp = AL('VERTICAL', { name: 'Question preview', gap: 10, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16 }); add(sa, [qp, 'FILL']);
add(qp, await T('Question 3 of 9', 'Caption', 'text/tertiary'), [await T('Have you gone back another day to try to win back money you lost?', 'Body/M Strong', 'text/primary', { w: 286 }), 'FILL']);
const ops = AL('VERTICAL', { name: 'Options — none selected', gap: 8 }); add(qp, [ops, 'FILL']);
for (const o of ['Never', 'Sometimes', 'Most of the time', 'Almost always']) { const r = await I('20:3259', { Selected: 'No', State: 'Default' }, { Label: o, 'Show description': false }); r.name = 'Option — ' + o; add(ops, [r, 'FILL']); }
add(sa, [await BTN('Secondary', 'Start the self-assessment', { size: 'L', trail: 'arrow-right' }), 'FILL']);
// Warning signs
const ws = box('Signs it may be time for a break', { p: 16, gap: 4 }); add(C, [ws, 'FILL']);
add(ws, [await T('Signs it may be time for a break', 'Heading/H5', 'text/primary', { w: 326 }), 'FILL']);
for (const s of ['Chasing losses or raising stakes to win money back', 'Playing longer or spending more than you planned', 'Borrowing, or using money meant for bills', 'Hiding how much you play from people close to you', 'Feeling anxious, irritable or low when you’re not playing']) { const r = AL('HORIZONTAL', { gap: 10, p: [8, 0, 8, 0] }); add(r, await IC('alert-circle', 18, 'text/warning'), [await T(s, 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(ws, [r, 'FILL']); }
// Help organisations
const ho = AL('VERTICAL', { name: 'Help organisations', gap: 12 }); add(C, [ho, 'FILL']);
add(ho, [await mhead('GET HELP', 'Free, confidential support', 'Independent organisations — not run by GLOBAL POOL. Available 24/7 in many languages.'), 'FILL']);
const hr = await I('24:14743'); hr.name = 'RG/Help Resources'; add(ho, [hr, 'FILL']);
const left = fitInst(hr); if (left.length) NOTES.push('RG/Help Resources overflow at 358: ' + left.join(','));
const more = box('More organisations', { p: [4, 16, 4, 16], gap: 0 }); add(ho, [more, 'FILL']);
const ORGS = [['BeGambleAware', 'begambleaware.org'], ['National Council on Problem Gambling', 'ncpgambling.org'], ['Gambling Therapy (app)', 'gamblingtherapy.org']];
for (let i = 0; i < ORGS.length; i++) { const r = AL('HORIZONTAL', { name: 'Org — ' + ORGS[i][0], gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); if (i < ORGS.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); const t = AL('VERTICAL', { gap: 2 }); add(t, [await T(ORGS[i][0], 'Body/M Strong', 'text/primary', { w: 280 }), 'FILL'], await T(ORGS[i][1], 'Caption', 'text/brand')); add(r, [t, 'FILL'], await IC('external-link', 18, 'icon/muted')); add(more, [r, 'FILL']); }
// Minors + commitments
const mn = box('Protecting minors', { p: 16, gap: 10 }); add(C, [mn, 'FILL']);
const mh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(mh, await tile('user-x', { tint: 'status/danger-tint', ic: 'text/danger' }), [await T('Protecting minors', 'Heading/H5', 'text/primary', { w: 260 }), 'FILL']); add(mn, [mh, 'FILL']);
add(mn, [await T('Under-18s can’t open an account. We check age at sign-up and verify it with ID before any withdrawal. Parents: turn on your device’s built-in parental controls to block gambling sites.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
const cm = box('Our commitments', { p: 16, gap: 4 }); add(C, [cm, 'FILL']);
add(cm, [await T('Our commitments to you', 'Heading/H5', 'text/primary', { w: 326 }), 'FILL']);
for (const s of ['No bonus or promo messages while a break or self-exclusion is active', 'VIP status never changes odds, limits or these tools', 'Withdrawing is never harder than depositing', 'Support can’t shorten a break or exclusion — on purpose']) { const r = AL('HORIZONTAL', { gap: 10, p: [8, 0, 8, 0] }); add(r, await IC('check-circle', 18, 'text/success'), [await T(s, 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(cm, [r, 'FILL']); }
add(C, [await BTN('Ghost', 'Talk to support about gambling', { size: 'L', lead: 'chat' }), 'FILL']);
await mlic(C); await mfinish(S, { tab: 'Home' });
restack(COLX[1]); fitSection(sec);
await S.f.screenshot({ scale: 0.5 });
return { section: sec.id, created: CREATED, audits: [audit(S.f)], notes: NOTES };
