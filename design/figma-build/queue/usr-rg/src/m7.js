const STEP = __STEP__;
const LBL = { 1: 'Step 1 — Choose period', 2: 'Step 2 — Consequences (1 year)', 3: 'Step 3 — Confirm with password', 4: 'Active — until 27 Nov 2027, 16:45 UTC' };
const NAME = '[USR-RG7] Self-Exclusion / 390 / ' + LBL[STEP];
const old = byName(sec, NAME); if (old) old.remove();
const ACT = STEP === 4; const W = 358;
let bn = null;
if (ACT) { bn = AL('VERTICAL', { name: 'Banner — self-exclusion active', gap: 8, p: [12, 16, 12, 16], fill: tk('status/info-tint') }); strokeSides(bn, tk('status/info', 'border/default'), { b: 1 }); const h = AL('HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); bn.appendChild(h); h.appendChild(await IC('shield-check', 20, 'status/info')); h.appendChild(await T('Self-excluded until 27 Nov 2027', 'Body/S Strong', 'text/primary')); h.appendChild(await DEMO('XS')); bn.appendChild(await T('Games, Global Pool, deposits and marketing are closed. Withdrawals stay open.', 'Caption', 'text/secondary', { w: 358 })); }
const S = await shellM(NAME, 'Self-exclusion', { title: 'Self-exclusion', sub: STEP === 4 ? null : 'Closes access for the period you choose. It cannot be undone early.', banner: bn, noDeposit: ACT });
const C = S.C;
let cta = null;
if (STEP !== 3) {
  const st = await I('25:14013', { Step: ['Choose period', 'Consequences', 'Confirm', 'Active'][STEP - 1] }); add(C, [st, 'FILL']); st.name = 'RG/Self-Exclusion Step'; await txt(st, 'Indefinite', 'Permanent');
} else {
  const sc = card('Self-Exclusion Step — Confirm (password + typed confirmation)', { gap: 16, p: 16, r: 20 }); add(C, [sc, 'FILL']);
  const pr = AL('HORIZONTAL', { name: 'Progress', gap: 8 }); add(sc, [pr, 'FILL']); for (let i = 0; i < 3; i++) { const b = rect(10, 4, 'brand/primary', 9999, 'Segment ' + (i + 1)); pr.appendChild(b); b.layoutSizingHorizontal = 'FILL'; }
  sc.appendChild(await T('Step 3 of 3 · Confirm', 'Overline', 'text/tertiary'));
  add(sc, [await T('Confirm self-exclusion for 1 year', 'Heading/H4', 'text/primary', { w: W - 32 }), 'FILL']);
  const sm = AL('VERTICAL', { name: 'Summary', gap: 0, p: [4, 12, 4, 12], fill: 'surface/raised', r: 14 }); add(sc, [sm, 'FILL']);
  add(sm, [await kv('Ends', '27 Nov 2027, 16:45 UTC'), 'FILL']); add(sm, [await kv('Early reversal', 'Not possible', { demo: false, divider: false, color: 'text/warning' }), 'FILL']);
  const pw = await I('14:1735', { State: 'Default', Strength: 'Empty' }, { Label: 'Your password', 'Show strength': false, 'Show requirements': false }); add(sc, [pw, 'FILL']);
  const ty = await I('13:762', { State: 'Default', Size: 'L' }, { Label: 'Type SELF-EXCLUDE to confirm', 'Show label': true, 'Show helper': true }); add(sc, [ty, 'FILL']); await txt(ty, 'Placeholder', 'SELF-EXCLUDE');
  const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I understand this cannot be reversed before 27 Nov 2027.', 'Show description': false }); add(sc, [cb, 'FILL']);
  cta = [await BTN('Danger', 'Self-exclude for 1 year', { size: 'L', state: 'Disabled' }), await BTN('Ghost', 'Back', { size: 'L', lead: 'arrow-left' })];
}
if (STEP === 1) { const alt = card('Card — Shorter options', { gap: 12, p: 16 }); add(C, [alt, 'FILL']); alt.appendChild(await T('Not sure you need this long?', 'Heading/H5', 'text/primary')); add(alt, [await bullet('pause-circle', 'Cooling-off: 24 hours to 30 days', null, W - 32), 'FILL']); add(alt, [await bullet('sliders', 'Lower your limits — applies at once', null, W - 32), 'FILL']); const b = await BTN('Secondary', 'See shorter options', { size: 'L' }); add(alt, [b, 'FILL']); }
if (STEP === 2 || STEP === 3) { const mc = card('Card — Your money', { gap: 0, p: 16 }); add(C, [mc, 'FILL']); const mh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER', p: [0, 0, 4, 0] }); add(mc, [mh, 'FILL']); add(mh, [await T('Your money stays yours', 'Heading/H5', 'text/primary'), 'FILL']); mh.appendChild(await DEMO('S'));
  add(mc, [await kv('Available', '9,215.30'), 'FILL']); add(mc, [await kv('Entries refunded (#1,248)', '+350.00'), 'FILL']); add(mc, [await kv('Owed credited', '+415.20'), 'FILL']); add(mc, [await kv('DP-77412 on confirm', '1,000.00'), 'FILL']); add(mc, [await kv('WD-20931 continues', '1,500.00'), 'FILL']); add(mc, [await kv('Total', '12,480.50 USDT', { divider: false }), 'FILL']);
  add(C, [await noteBox('megaphone', 'All marketing stops at once: no offers, emails, push or VIP contact.', 'info', W), 'FILL']); }
if (STEP === 4) { const wd = card('Card — Withdraw', { gap: 12, p: 16 }); add(C, [wd, 'FILL']); wd.appendChild(await T('Available to withdraw now', 'Body/S', 'text/secondary')); const wv = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); wd.appendChild(wv); wv.appendChild(await T('9,980.50 USDT', 'Number/L', 'balance/available')); wv.appendChild(await DEMO('S')); add(wd, [await T('Includes 350.00 refunded entries and 415.20 owed. DP-77412 (1,000.00) is added once confirmed; WD-20931 (1,500.00) keeps processing.', 'Caption', 'text/tertiary', { w: W - 32 }), 'FILL']); cta = [await BTN('Primary', 'Withdraw funds', { size: 'L', lead: 'withdraw' })]; }
const help = await I('24:14743'); add(C, [help, 'FILL']);
await licM(C); await endM(S, cta ? { cta } : {});
await placeM(S.f, sec, 3690 + (STEP - 1) * 510, 160);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
