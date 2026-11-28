// ===== BODY m3 — Mobile 390: WAL-13 Over balance, WAL-13 Limit reached, WAL-14 review sheet =====
const P = 'MOB-07 · ';
const N13o = P + 'WAL-13 Withdraw — Step 4 Enter Amount / 390 / Over balance';
const N13l = P + 'WAL-13 Withdraw — Step 4 Enter Amount / 390 / Limit reached — separate DEMO scenario (25,000.00 already withdrawn today)';
const N14 = P + 'WAL-14 Withdraw — Step 5 Fees & Summary / 390 / Default — review sheet';
clean([N13o, N13l, N14]);
const out = {}, H = {};
{ const S = await shellM(N13o, 4, MX[3], 'Enter amount', 'Fees & summary');
  await amt13(S.ct, 'Over');
  await footM(S.f, { next: 'Review fees', state: 'Disabled', note: 'Lower the amount to continue' });
  out[N13o] = S.f.id; }
{ const S = await shellM(N13l, 4, MX[3], 'Enter amount', 'Fees & summary');
  await amt13(S.ct, 'Limit');
  await footM(S.f, { next: 'Review fees', state: 'Disabled', note: 'Reopens 28 Nov 2026, 00:00 UTC' });
  out[N13l] = S.f.id; }
{ const S = await shellM(N14, 5, MX[4], 'Fees & summary', 'Risk check', { sheet: true });
  await fhead(S.ct, 'How much do you want to withdraw?', null, true);
  const ia = await I('15:3387', { State: 'Focus' }, { Label: 'Amount to withdraw', 'Show limits': false }); ia.name = 'Input/Amount'; add(S.ct, [ia, 'FILL']);
  await tabM(S.f);
  const { sh, scr } = await sheetM(S.f, 'Review withdrawal');
  await sheetHead(sh, 'Review your withdrawal', null);
  const dr = hrow('Destination', 8, { wrap: true, cgap: 6, p: [10, 12, 10, 12], fill: 'surface/raised', r: 10 }); add(sh, [dr, 'FILL']); dr.appendChild(await CHAIN('Arbitrum', 16)); await tx(dr, 'Arbitrum One →', 'Body/S', 'text/secondary', { hug: true }); dr.appendChild(await I('9:418', { Size: 'S' }, { Address: AD, 'Show DEMO': true })); dr.appendChild(await B('Approved', 'Whitelisted'));
  const fb = await I('20:8583', { Type: 'Withdrawal' }); fb.name = 'Tx/Fee Breakdown'; add(sh, [fb, 'FILL']);
  const al = await alertBox('danger', IRREV[0], 'Once broadcast on Arbitrum One it can\'t be cancelled, recalled or refunded. A wrong address or network means the funds are lost.', { icon: 'alert-triangle' }); add(sh, [al, 'FILL']);
  const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: CONFIRM_LABEL, 'Show description': false }); cb.name = 'Control/Checkbox — irreversible confirmation'; add(sh, [cb, 'FILL']);
  await sheetFoot(sh, { next: 'Continue to security check', state: 'Disabled', note: 'Tick the box to continue · risk check and 2FA come next', cancel: false });
  H[N14] = pinSheet(S.f, sh, scr); out[N14] = S.f.id; }
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm.slice(9, 15) + nm.slice(-12)] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes, H };
