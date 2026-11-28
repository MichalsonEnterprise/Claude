// ===== BODY m2 — Mobile 390: WAL-12 Invalid, WAL-12 New-address cooldown (sheet), WAL-13 Default =====
const P = 'MOB-07 · ';
const N12i = P + 'WAL-12 Withdraw — Step 3 Enter Address / 390 / Invalid';
const N12c = P + 'WAL-12 Withdraw — Step 3 Enter Address / 390 / New-address cooldown — sheet';
const N13 = P + 'WAL-13 Withdraw — Step 4 Enter Amount / 390 / Default';
clean([N12i, N12c, N13]);
const out = {}, H = {};
{ const S = await shellM(N12i, 3, MX[2], 'Enter address', 'Enter amount');
  await addr12(S.ct, 'Invalid');
  await footM(S.f, { next: 'Continue to amount', state: 'Disabled', note: 'Fix the address to continue' });
  out[N12i] = S.f.id; }
{ const S = await shellM(N12c, 3, MX[2], 'Enter address', 'Enter amount', { sheet: true });
  await fhead(S.ct, 'Where should we send it?', null, true);
  const ia = await I('15:3617', { State: 'New address' }, { Label: 'Destination address' }); ia.name = 'Input/Address'; add(S.ct, [ia, 'FILL']);
  await tabM(S.f);
  const { sh, scr } = await sheetM(S.f, 'New-address cooldown');
  await sheetHead(sh, 'New address — 24 h cooldown', '0x3f9a…c47E isn\'t on your whitelist yet. To protect your balance, a new destination unlocks 24 h after you add it.');
  const fx1 = card('Cooldown facts', { gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised' }); add(sh, [fx1, 'FILL']);
  await kv(fx1, 'Address', await I('9:418', { Size: 'S' }, { Address: AD_NEW, 'Show DEMO': true }));
  await kv(fx1, 'Unlocks', '28 Nov 2026, 18:42 UTC');
  await kv(fx1, 'To add it', 'Email code + 2FA', { last: true });
  await optCard(sh, 'clock', 'Add it and withdraw after the cooldown', 'We\'ll email you when 0x3f9a…c47E unlocks.', await BTN('Primary', 'Add to whitelist', { size: 'L', lead: 'plus' }));
  await optCard(sh, 'shield-check', 'Use a whitelisted address now', 'Arbitrum cold wallet · 0x7c4e…a21D — no waiting.', await BTN('Secondary', 'Use cold wallet', { size: 'L' }));
  await tx(sh, 'The cooldown applies to every player — support can\'t skip it.', 'Caption', 'text/tertiary', { align: 'CENTER' });
  await sheetFoot(sh, {});
  H[N12c] = pinSheet(S.f, sh, scr); out[N12c] = S.f.id; }
{ const S = await shellM(N13, 4, MX[3], 'Enter amount', 'Fees & summary');
  await amt13(S.ct, 'Default');
  await footM(S.f, { next: 'Review fees' });
  out[N13] = S.f.id; }
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm.slice(9, 15) + nm.slice(-12)] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes, H };
