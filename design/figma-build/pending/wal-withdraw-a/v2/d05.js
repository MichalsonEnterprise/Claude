// ===== BODY d05 — WAL-14 desktop Default (Fees & Summary) =====
const N14 = 'WAL-14 Withdraw — Step 5 Fees & Summary / 1440 / Default';
const S = await shellD(N14, 5, COLX[4], 120, 'Review fees and what arrives');
{ const fc = S.fc;
  await fhead(fc, 'Review your withdrawal', 'Check every line before you continue. The amount below is exactly what arrives in your wallet after the network fee.');
  await receiveHero(fc, false);
  const fb = await I('20:8583', { Type: 'Withdrawal' }); fb.name = 'Tx/Fee Breakdown'; add(fc, [fb, 'FILL']);
  const dc = card('Withdrawal details', { gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised' }); add(fc, [dc, 'FILL']);
  { const a = hrow('Asset value', 6); a.appendChild(await CHAIN('USDT', 16)); await tx(a, 'USDT · Tether USD', 'Body/S Strong', 'text/primary', { hug: true }); await kv(dc, 'Asset', a); }
  await kv(dc, 'Network', await I('9:377', { Chain: 'Arbitrum', Status: 'Operational' }));
  { const d = hrow('Destination value', 6); await tx(d, 'Arbitrum cold wallet', 'Body/S Strong', 'text/primary', { hug: true }); d.appendChild(await I('9:418', { Size: 'S' }, { Address: AD, 'Show DEMO': true })); await kv(dc, 'Destination', d); }
  await kv(dc, 'Estimated arrival', 'Usually under 30 min · up to 4 h if held for AML screening');
  await kv(dc, 'Balance while processing', '1,500.00 USDT moves from Available to Locked', { last: true });
  const al = await alertBox('danger', IRREV[0], IRREV[1], { icon: 'alert-triangle' }); add(fc, [al, 'FILL']);
  const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: CONFIRM_LABEL, 'Show description': true }); cb.name = 'Control/Checkbox — irreversible confirmation'; setT(cb, 'Description', 'Required to continue — this box is never ticked for you.'); add(fc, [cb, 'FILL']);
  const nx = hrow('Next steps', 10, { p: [12, 16, 12, 16], fill: 'surface/raised', r: 10, align: 'MIN' }); add(fc, [nx, 'FILL']); nx.appendChild(await IC('shield-check', 18, 'icon/brand')); await tx(nx, 'Next: an automatic risk check (about 3 s), then 2FA with your email code + authenticator. Nothing is sent until you confirm at step 7.', 'Body/S', 'text/secondary');
  await ffoot(fc, 'Back', 'Continue to security check', { state: 'Disabled', note: 'Tick the box to continue' });
  await side(S.side, { n: 5, net: true, addr: AD, amt: '1,500.00', recv: '1,499.92', used: '1,500.00', usedLabel: 'of 25,000.00 USDT today, including this withdrawal', pct: 0.06, limitNote: '23,500.00 USDT left today after this withdrawal · resets 28 Nov 2026, 00:00 UTC.' }); }
fitSection(sec);
await S.f.screenshot({ scale: 0.45 });
return { def: S.f.id, bounds: [S.f.x, S.f.y, S.f.width, S.f.height] };
