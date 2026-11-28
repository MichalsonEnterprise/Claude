const NAME = '[USR-R1] Referrals — Link & Overview / 390 / Default';
const { f, content } = await MOB(NAME, 2160, 160, { title: 'Refer friends', sub: 'Earn 20% of their platform fees', tabs: MRT('Overview') });
const hc = CARD({ name: 'Referral link card', gap: 12, p: 16, r: 20, clip: true }); add(content, [hc, 'FILL']);
const st = rect(60, 400, 'brand/tint', 0, 'Angled stripe'); hc.appendChild(st); st.layoutPositioning = 'ABSOLUTE'; st.rotation = -14; st.x = 300; st.y = -40;
const o = ROW({ gap: 8 }); add(o, await T('YOUR REFERRAL LINK', 'Overline', 'text/brand')); add(o, await DEMO('XS')); add(hc, o);
add(hc, await T('Earn 20% of the platform fees your friends pay', 'Heading/H4', 'text/primary', { w: 290 }));
add(hc, await T('From the 0.05 USDT fee on their Global Pool entries, for 12 months — never from deposits or losses.', 'Caption', 'text/secondary', { w: 300 }));
const fld = ROW({ name: 'Link field', gap: 8, p: [0, 12, 0, 12], fill: 'surface/raised', stroke: 'border/default', r: 10, h: 48 }); add(fld, await IC('link', 16, 'icon/muted')); add(fld, [await T('globalpool.example/r/NOVAK27', 'Mono/S', 'text/primary'), 'FILL']); add(fld, await DEMO('XS')); add(hc, [fld, 'FILL']);
add(hc, [await BTN('Primary', 'Copy link', { size: 'L', lead: 'copy' }), 'FILL']);
for (const pair of [[['Telegram', 'chat'], ['X', 'external-link']], [['Email', 'mail'], ['QR code', 'qr-code']]]) { const r = ROW({ gap: 8 }); for (const [l, ic] of pair) add(r, [await BTN('Secondary', l, { size: 'L', lead: ic }), 'FILL']); add(hc, [r, 'FILL']); }
for (const pair of [[['Link clicks', '1,904', '612 in 30 days'], ['Sign-ups', '48', '9 in 30 days']], [['Verified', '31', '17 to verify'], ['Active', '19', 'Last 30 days']]]) { const r = ROW({ gap: 12, align: 'MIN' }); for (const [l, v, cap] of pair) add(r, [await KPI(l, v, null, { p: 14, size: 'Number/M', cap, cw: 130 }), 'FILL_BOTH']); add(content, [r, 'FILL']); }
const ec = CARD({ name: 'Your earnings', gap: 10, p: 16 }); add(content, [ec, 'FILL']); const eh = ROW({ gap: 8 }); add(eh, await T('Your earnings', 'Heading/H5')); add(eh, await DEMO('XS')); add(ec, eh);
for (const [l, v, c] of [['Lifetime earned', '142.50 USDT', 'text/primary'], ['Available for payout', '48.60 USDT', 'balance/available'], ['Pending (round #1,248)', '3.90 USDT', 'balance/pending'], ['Paid out', '90.00 USDT', 'text/secondary']]) add(ec, [await KV(l, v, { vc: c }), 'FILL']);
add(ec, [await BTN('Secondary', 'Request payout', { size: 'L', lead: 'arrow-up-right' }), 'FILL']);
const pr = CARD({ name: 'Promo — Refer-a-friend boost (RC-14)', gap: 8, p: 16, fill: 'brand/tint-subtle', stroke: 'border/brand' }); add(content, [pr, 'FILL']);
const po = ROW({ gap: 8 }); add(po, await IC('gift', 18, 'icon/brand')); add(po, await T('UNTIL 31 DEC 2026', 'Overline', 'text/brand')); add(po, await DEMO('XS')); add(pr, po);
add(pr, await T('You and your friend each get 5.00 USDT in bonus funds', 'Body/S Strong', 'text/primary', { w: 320 })); add(pr, await T('After their KYC Level 2 and first deposit of 20.00+ USDT. 1× wagering, 14 days. No self-referrals.', 'Caption', 'text/secondary', { w: 320 }));
const pt = ROW({ gap: 8 }); add(pt, await BTN('Ghost', 'Terms apply', { size: 'S' })); add(pt, await I('6:159')); add(pr, pt);
await MFOOT(content, 'Referral figures are DEMO. Share only with adults in permitted countries.');
await MEND(f); FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
