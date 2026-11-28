const NAME = '[USR-R1] Referrals — Link & Overview / 1440 / Default';
const { f, content } = await DESK(NAME, 6360, 160, { active: 'Affiliates', area: 'Referrals', page: 'Overview', title: 'Refer friends',
  sub: 'Share your link. When friends you invite play the Global Pool, you earn 20% of the platform fees they pay — for 12 months.',
  actions: async () => [await BTN('Ghost', 'Affiliate terms', { lead: 'file' })], tabs: RTABS('Overview') });
const hero = AL('HORIZONTAL', { name: 'Referral hero', fill: 'surface/default', stroke: 'border/subtle', r: 20, clip: true }); add(content, [hero, 'FILL']);
const hc = COL({ name: 'Link & share', gap: 16, p: 32 }); add(hero, [hc, 'FILL']);
const o = ROW({ gap: 8 }); add(o, await T('YOUR REFERRAL LINK', 'Overline', 'text/brand')); add(o, await DEMO('S')); add(hc, o);
add(hc, await T('Earn 20% of the platform fees your friends pay', 'Heading/H2', 'text/primary', { w: 560 }));
add(hc, await T('You earn from the 0.05 USDT fee on each qualifying Global Pool entry they make — never from their deposits, stakes or losses.', 'Body/M', 'text/secondary', { w: 560 }));
const lr = ROW({ name: 'Link row', gap: 12 }); add(hc, [lr, 'FILL']);
const fld = ROW({ name: 'Link field', gap: 10, p: [0, 16, 0, 16], fill: 'surface/raised', stroke: 'border/default', r: 10, h: 48 }); add(fld, await IC('link', 18, 'icon/muted')); add(fld, [await T('https://globalpool.example/r/NOVAK27', 'Mono/M', 'text/primary'), 'FILL']); add(fld, await DEMO('XS')); add(lr, [fld, 'FILL']);
add(lr, await BTN('Primary', 'Copy link', { size: 'L', lead: 'copy' }));
const sr = ROW({ name: 'Code & share', gap: 8 }); add(sr, await T('Code', 'Caption', 'text/tertiary')); const chip = ROW({ gap: 6, p: [4, 10, 4, 10], fill: 'surface/raised', r: 6 }); add(chip, await T('NOVAK27', 'Mono/S', 'text/primary')); add(chip, await IC('copy', 14, 'icon/muted')); add(sr, chip); add(sr, [ROW({}), 'FILL']); add(sr, await T('Share', 'Caption', 'text/tertiary'));
for (const [l, ic] of [['Telegram', 'chat'], ['X', 'external-link'], ['Email', 'mail'], ['QR code', 'qr-code']]) add(sr, await BTN('Secondary', l, { size: 'S', lead: ic })); add(hc, [sr, 'FILL']);
const art = figma.createFrame(); art.name = 'Art — entry tickets cropped by the edge'; art.resize(380, 300); art.fills = []; art.clipsContent = true; add(hero, art); art.layoutSizingVertical = 'FILL';
const bk = rect(360, 700, 'brand/tint', 0, 'Angled block'); bk.rotation = -12; bk.x = 60; bk.y = -120; art.appendChild(bk);
const st = rect(56, 700, 'brand/primary', 0, 'Angled stripe'); st.rotation = -12; st.x = 300; st.y = -90; art.appendChild(st);
const t1 = await I('23:8534', { State: 'Active' }); art.appendChild(t1); t1.rotation = 8; t1.x = 70; t1.y = 40;
const t2 = await I('23:8534', { State: 'Active' }); art.appendChild(t2); t2.rotation = -6; t2.x = 110; t2.y = 170;
const pill = ROW({ name: 'Fee split preview', gap: 8, p: [8, 12, 8, 12], fill: 'surface/overlay', stroke: 'border/subtle', r: 9999 }); await fx(pill, 'Elevation/3'); add(pill, await IC('percent', 16, 'icon/brand')); add(pill, await T('20% of 0.05 = 0.01 USDT per entry', 'Label/S', 'text/primary')); add(pill, await DEMO('XS')); art.appendChild(pill); pill.x = 24; pill.y = 18;
const k = ROW({ name: 'KPIs', gap: 16, align: 'MIN' }); add(content, [k, 'FILL']);
for (const [l, v, ic, cap] of [['Link clicks', '1,904', 'external-link', 'Lifetime · 612 in the last 30 days'], ['Sign-ups', '48', 'user-check', '2.5% of clicks · 9 in the last 30 days'], ['Verified players', '31', 'shield-check', 'KYC complete · 17 still to verify'], ['Active players', '19', 'activity', 'Made a qualifying entry in the last 30 days']]) add(k, [await KPI(l, v, null, { icon: ic, cap }), 'FILL_BOTH']);
const r3 = ROW({ name: 'Earnings & how it works', gap: 16, align: 'MIN' }); add(content, [r3, 'FILL']);
const ec = CARD({ name: 'Your earnings', gap: 16 }); add(r3, [ec, 'FILL']); ec.layoutSizingVertical = 'FILL';
const eh = ROW({ gap: 8 }); add(eh, await T('Your earnings', 'Heading/H4')); add(eh, await DEMO('S')); add(eh, [ROW({}), 'FILL']); add(eh, await BTN('Ghost', 'View earnings', { size: 'S', trail: 'arrow-right' })); add(ec, [eh, 'FILL']);
const es = ROW({ gap: 16, align: 'MIN' }); add(ec, [es, 'FILL']);
for (const [l, v, c, ic] of [['Lifetime earned', '142.50', 'text/primary', 'coins'], ['Available for payout', '48.60', 'balance/available', 'check-circle'], ['Pending', '3.90', 'balance/pending', 'clock'], ['Paid out', '90.00', 'text/secondary', 'receipt']]) { const c2 = COL({ gap: 4 }); const lr2 = ROW({ gap: 6 }); add(lr2, await IC(ic, 16, c === 'text/primary' || c === 'text/secondary' ? 'icon/muted' : c)); add(lr2, await T(l, 'Caption', 'text/tertiary')); add(c2, lr2); add(c2, await AMT(v, { s: 'Number/M', c })); add(es, [c2, 'FILL']); }
const sb = ROW({ name: 'Composition bar', gap: 2 }); add(sb, rect(434, 8, 'border/strong', 4, 'Paid out 90.00')); add(sb, rect(234, 8, 'balance/available', 4, 'Available 48.60')); add(sb, rect(20, 8, 'balance/pending', 4, 'Pending 3.90')); add(ec, sb);
add(ec, await T('142.50 = 90.00 paid out + 48.60 available + 3.90 pending (round #1,248 draws 27 Nov 2026, 20:00 UTC).', 'Caption', 'text/tertiary', { w: 680 }));
const cta = ROW({ gap: 12 }); add(cta, await BTN('Primary', 'Request payout', { lead: 'arrow-up-right' })); add(cta, await CHK('Minimum 20.00 USDT · KYC Level 2 — you’re eligible', 'ok', 360, 'Caption')); add(ec, cta);
const hw = CARD({ name: 'How it works', gap: 14, w: 376 }); add(r3, hw); hw.layoutSizingVertical = 'FILL';
add(hw, await T('How it works', 'Heading/H5'));
for (const [n, a, b] of [['1', 'Share your link or code', 'Friends must be 18+ and live in a permitted country.'], ['2', 'They sign up and verify', 'Commission starts once they complete KYC Level 1.'], ['3', 'You earn 20% of their platform fees', 'On qualifying Global Pool entries, for 12 months from their sign-up.']]) { const r = ROW({ gap: 12, align: 'MIN' }); const nt = AL('HORIZONTAL', { w: 28, h: 28, fill: 'brand/tint', r: 9999, align: 'CENTER', justify: 'CENTER' }); add(nt, await T(n, 'Label/M', 'text/brand')); add(r, nt); const c = COL({ gap: 2 }); add(c, await T(a, 'Body/S Strong')); add(c, await T(b, 'Caption', 'text/tertiary', { w: 260 })); add(r, [c, 'FILL']); add(hw, [r, 'FILL']); }
const exm = ROW({ gap: 8, p: 12, fill: 'surface/raised', r: 10 }); add(exm, [await T('Example: a friend makes 10 entries → 10 × 0.05 = 0.50 USDT in fees → you earn 0.10 USDT', 'Caption', 'text/secondary', { w: 280 }), 'FILL']); add(exm, await DEMO('XS')); add(hw, [exm, 'FILL']);
const pr = CARD({ name: 'Promo — Refer-a-friend boost (RC-14)', dir: 'HORIZONTAL', gap: 16, p: 20, fill: 'brand/tint-subtle', stroke: 'border/brand', align: 'CENTER' }); add(content, [pr, 'FILL']);
add(pr, await TILE('gift', 'icon/brand', 'brand/tint', 48)); const pc = COL({ gap: 4 }); const po = ROW({ gap: 8 }); add(po, await T('REFER-A-FRIEND BOOST · UNTIL 31 DEC 2026, 23:59 UTC', 'Overline', 'text/brand')); add(po, await DEMO('XS')); add(pc, po); add(pc, await T('You and your friend each get 5.00 USDT in bonus funds', 'Heading/H5'));
add(pc, await T('When they verify to KYC Level 2 and make a first deposit of 20.00 USDT or more. Bonus funds carry 1× wagering and expire after 14 days. Self-referrals and duplicate accounts are excluded.', 'Caption', 'text/secondary', { w: 760 })); add(pr, [pc, 'FILL']); add(pr, await BTN('Ghost', 'Terms apply', { size: 'S' })); add(pr, await I('6:159'));
const rl = CARD({ name: 'Keep your link compliant', dir: 'HORIZONTAL', gap: 20, p: [16, 24, 16, 24], fill: 'bg/secondary', align: 'CENTER' }); add(content, [rl, 'FILL']);
add(rl, await T('Keep it fair', 'Label/M', 'text/primary'));
for (const s of ['No self-referrals or extra accounts', 'No sharing in restricted countries or with under-18s', 'No ads on the GLOBAL POOL name', 'No promises of winnings — players can lose their stake']) add(rl, await CHK(s, 'no', 190, 'Caption', 'text/secondary'));
await FOOT(content, 'Referral figures are DEMO. Commission is 20% of platform fees only. We review referral activity; breaches of the Affiliate Terms void commission.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
