// ===== BODY d04 — WAL-13 desktop: Default + Min/max (below minimum) + Over balance + Limit reached =====
const N13 = 'WAL-13 Withdraw — Step 4 Enter Amount / 1440 / ';
const names = [N13 + 'Default', N13 + 'Min/max — below minimum', N13 + 'Over balance', N13 + 'Limit reached — separate DEMO scenario (25,000.00 already withdrawn today)'];
clean(names);
const out = {};
const S = await shellD(names[0], 4, COLX[3], 120, 'USDT on Arbitrum One → 0x7c4e…a21D');
{ const fc = S.fc;
  await fhead(fc, 'How much do you want to withdraw?', 'Enter the amount in USDT. The Arbitrum network fee is taken from this amount, so you always see exactly what arrives before you confirm.');
  const amt = await I('15:3387', { State: 'Focus' }, { Label: 'Amount to withdraw', 'Show limits': true }); amt.name = 'Input/Amount'; add(fc, [amt, 'FILL']);
  await chips(fc, '1,500.00');
  await limitTiles(fc, false);
  const fe = await I('20:3002', { State: 'Normal' }); fe.name = 'Wallet/Fee Estimator'; add(fc, [fe, 'FILL']);
  await lockNote(fc);
  await ffoot(fc, 'Back', 'Review fees', { note: 'You can still change the amount at step 5' });
  await side(S.side, { n: 4, net: true, addr: AD, amt: '1,500.00', recv: '1,499.92', used: '1,500.00', usedLabel: 'of 25,000.00 USDT today, including this withdrawal', pct: 0.06, limitNote: '23,500.00 USDT left today after this withdrawal · resets 28 Nov 2026, 00:00 UTC · minimum 20.00 USDT.' });
  out.def = S.f.id; }
// (a) below minimum
const fa = cloneSt(names[0], names[1]); out.min = fa.id;
{ const ia = q(fa, 'Input/Amount'); ia.setProperties({ State: 'Error' });
  setT(ia, 'Value text', '12.00'); setT(ia, 'Fiat hint', '≈ $12.00'); setT(ia, 'Helper text', 'Below the 20.00 USDT minimum — enter 20.00 or more.', 0);
  chipState(fa, 'Default');
  const fe = q(fa, 'Wallet/Fee Estimator'); const al = await alertBox('info', 'Withdrawals range from 20.00 USDT up to your limit', 'Minimum 20.00 USDT per withdrawal on every network. Maximum = the lower of your Available balance (9,215.30 USDT) and what is left of today\'s 25,000.00 USDT limit.', { actions: [await BTN('Secondary', 'Use minimum · 20.00', { size: 'S' }), await BTN('Ghost', 'Withdraw max · 9,215.30', { size: 'S' })] }); ins(fe, al); fe.remove();
  q(fa, 'Lock note').remove();
  await foot(fa, 'Disabled', 'Enter at least 20.00 USDT');
  await setRow(fa, 'Amount', '12.00 USDT · below minimum', 'text/danger', 'Body/S Strong');
  await setRow(fa, 'Network fee', '≈ 0.08 USDT', 'text/primary', 'Number/S');
  await setRow(fa, 'You receive', '—', 'text/tertiary', 'Body/S');
  await swapLimit(fa, { used: '0.00', usedLabel: 'of 25,000.00 USDT used today', pct: 0, limitNote: 'Resets 28 Nov 2026, 00:00 UTC · minimum 20.00 USDT per withdrawal · verify Level 3 for a higher limit.' }); }
// (b) over balance
const fb = cloneSt(names[0], names[2]); out.over = fb.id;
{ const ia = q(fb, 'Input/Amount'); ia.setProperties({ State: 'Error' });
  chipState(fb, 'Default');
  const fe = q(fb, 'Wallet/Fee Estimator'); const al = await alertBox('warning', 'Only your Available balance can be withdrawn', 'You entered 12,000.00 USDT, but 9,215.30 USDT is Available. 1,000.00 USDT is still Pending (deposit DP-77412, 7 / 12 confirmations) and 415.20 USDT is Owed (refund + VIP reward, settling) — both become withdrawable once they settle. Funds in active round entries stay Locked until the draw.', { actions: [await BTN('Secondary', 'Withdraw max · 9,215.30', { size: 'S' }), await BTN('Ghost', 'View balance breakdown', { size: 'S', lead: 'wallet' })] }); ins(fe, al); fe.remove();
  q(fb, 'Lock note').remove();
  await foot(fb, 'Disabled', 'Lower the amount to continue');
  await setRow(fb, 'Amount', '12,000.00 USDT · over Available', 'text/danger', 'Body/S Strong');
  await setRow(fb, 'Network fee', '≈ 0.08 USDT', 'text/primary', 'Number/S');
  await setRow(fb, 'You receive', '—', 'text/tertiary', 'Body/S');
  await swapLimit(fb, { used: '0.00', usedLabel: 'of 25,000.00 USDT used today', pct: 0, limitNote: 'Resets 28 Nov 2026, 00:00 UTC · the limit isn\'t the issue here — your Available balance is.' }); }
// (c) limit reached — separate DEMO scenario
const fcx = cloneSt(names[0], names[3]); out.limit = fcx.id;
{ const ia = q(fcx, 'Input/Amount'); ia.setProperties({ State: 'Disabled' });
  setT(ia, 'Helper text', 'Daily limit reached — withdrawals reopen 28 Nov 2026, 00:00 UTC.', 0);
  chipState(fcx, 'Disabled');
  const tl = q(fcx, 'Tile — LEFT TODAY'); if (tl) { const v = tl.findOne(x => x.name === 'Value'); v.characters = '0.00 USDT'; v.fills = [paint('text/warning')]; tl.findOne(x => x.name === 'Sub').characters = 'Limit reached · resets 00:00 UTC'; }
  const fe = q(fcx, 'Wallet/Fee Estimator'); const al = await alertBox('warning', 'You\'ve reached today\'s 25,000.00 USDT withdrawal limit', 'In this separate DEMO scenario you have already withdrawn 25,000.00 USDT today (KYC Level 2 limit). Withdrawals reopen 28 Nov 2026, 00:00 UTC — in 5 h 18 min. Your Available balance stays in your account and can still be used. Verify Level 3 (source of funds) to apply for a higher limit.', { actions: [await BTN('Secondary', 'Raise limit — verify Level 3', { size: 'S', lead: 'shield-check' }), await BTN('Ghost', 'Remind me at 00:00 UTC', { size: 'S', lead: 'bell' })] }); ins(fe, al); fe.remove();
  q(fcx, 'Lock note').remove();
  await foot(fcx, 'Disabled', 'Reopens 28 Nov 2026, 00:00 UTC');
  await setRow(fcx, 'Amount', 'Limit reached today', 'text/warning', 'Body/S Strong');
  await setRow(fcx, 'Network fee', '≈ 0.08 USDT', 'text/primary', 'Number/S');
  await setRow(fcx, 'You receive', '—', 'text/tertiary', 'Body/S');
  await swapLimit(fcx, { used: '25,000.00', usedLabel: 'of 25,000.00 USDT used today', pct: 1, full: true, limitNote: 'Limit reached · resets 28 Nov 2026, 00:00 UTC (in 5 h 18 min) · Level 3 can raise it.' }); }
fitSection(sec);
const F = [S.f, fa, fb, fcx];
await S.f.screenshot({ scale: 0.4 });
for (const f of [fa, fb, fcx]) await q(f, 'Flow + summary').screenshot({ scale: 0.4 });
return Object.assign(out, { bounds: F.map(f => [f.x, f.y, f.width, f.height]) });
