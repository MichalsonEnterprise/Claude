// ===== BODY d15 — WAL-15 desktop: Pass / KYC required / Flagged (+ read-only probe of mobile components) =====
const N15 = 'WAL-15 Withdraw — Step 6 Risk Validation / 1440 / ';
const L15 = [['Pass', N15 + 'Pass'], ['KYC', N15 + 'KYC required — separate DEMO scenario (Level 1 account)'], ['Flagged', N15 + 'Flagged — manual review']];
clean(L15.map(x => x[1]));
const out = {};
for (const [st, nm] of L15) {
  const S = await shellD(nm, 6, COLX[0], '1,500.00 USDT → ' + AD + ' on Arbitrum One');
  const cta = await flow15(S.fc, st, 0);
  await ffootS(S.fc, cta);
  await sumCard(S.side, { n: 6 });
  await limitCard(S.side, st === 'KYC' ? { kyc: true } : {});
  await protCard(S.side);
  if (st === 'KYC') await helpCard(S.side, 'help-circle', 'Why do I need Level 2?', 'Licensed operators must confirm who receives every withdrawal. Level 2 (ID + liveness) is checked once — after that, withdrawals up to 25,000.00 USDT a day only need 2FA.', [['KYC & AML policy', 'book'], ['Contact support', 'chat']]);
  out[nm] = S.f.id;
}
fitSection(sec);
const probe = {};
for (const [k, id, v] of [['stepperM', '15:3270', { Steps: '9' }], ['topM', '23:12908', { State: 'Member' }], ['tab', '22:5413', { Active: 'Wallet' }], ['otp', '16:3761', { State: 'Complete' }], ['sbC', '23:6697', { State: 'Collapsed', Auth: 'Member' }]]) {
  const i = await I(id, v); probe[k] = { w: Math.round(i.width), h: Math.round(i.height) };
  if (k === 'stepperM' || k === 'otp') probe[k].texts = i.findAll(n => n.type === 'TEXT').map(t => t.name + '=' + t.characters.slice(0, 40));
  if (k === 'stepperM') probe[k].kids = i.findAll(n => n.type !== 'TEXT').slice(0, 30).map(c => c.name + ':' + c.type + ':' + Math.round(c.width));
  i.remove();
}
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.5 }); }
return { section: sec.id, out, sizes, probe };
