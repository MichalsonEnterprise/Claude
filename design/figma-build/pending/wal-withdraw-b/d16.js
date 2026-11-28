// ===== BODY d16 — WAL-16 desktop: Default / Wrong code / Locked =====
const N16 = 'WAL-16 Withdraw — Step 7 Two-Factor Confirmation / 1440 / ';
const L16 = [['Default', N16 + 'Default — email code + authenticator'], ['Wrong code', N16 + 'Wrong code'], ['Locked', N16 + 'Locked (15 min)']];
clean(L16.map(x => x[1]));
const out = {};
for (const [st, nm] of L16) {
  const S = await shellD(nm, 7, COLX[1], 'Security check passed · 1,500.00 USDT → ' + AD);
  const cta = await flow16(S.fc, st, 0);
  await ffootS(S.fc, cta);
  await sumCard(S.side, { n: 7 });
  await protCard(S.side);
  if (st === 'Locked') await helpCard(S.side, 'shield-alert', 'Why withdrawals lock', 'A 15-minute pause after 5 wrong codes stops anyone guessing their way in. It applies to every account and support can\'t lift it early — your balance is untouched.', [['Security settings', 'settings'], ['Contact support', 'chat']]);
  else await helpCard(S.side, 'help-circle', 'Can\'t get a code?', 'Email codes can take up to a minute — check spam for a message showing AURORA-27. No authenticator? Use one of your 10 backup codes, or recover 2FA from Security settings.', [['2FA help', 'book'], ['Contact support', 'chat']]);
  out[nm] = S.f.id;
}
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.5 }); }
return { section: sec.id, out, sizes };
