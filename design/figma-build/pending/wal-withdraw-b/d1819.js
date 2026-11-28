// ===== BODY d1819 — WAL-18 Successful + WAL-19 Failed (sanctions / network) desktop =====
const N18 = 'WAL-18 Withdraw — Step 9 Successful / 1440 / Default';
const N19 = 'WAL-19 Withdraw — Step 9 Failed / 1440 / ';
const L19 = [['Sanctions', N19 + 'Rejected by sanctions screening (alternative outcome)'], ['Network', N19 + 'Network failure — retry (alternative outcome)']];
clean([N18].concat(L19.map(x => x[1])));
const out = {};
{ const S = await shellD(N18, 9, COLX[3], 'WD-20931 · 1,499.92 USDT received on Arbitrum One');
  const cta = await flow18(S.fc, 0); await ffootS(S.fc, cta);
  await sumCard(S.side, { n: 9, ref: true, badge: await B('Confirmed', 'Completed'), recvL: 'You received' });
  await balCard(S.side, 'Your balance now', [['check-circle', 'balance/available', 'Available', '9,215.30 USDT'], ['lock', 'balance/locked', 'Locked', '350.00 USDT']], '1,500.00 USDT left Locked when the withdrawal was sent. Locked now holds only your 35 entries in round #1,248.');
  await helpCard(S.side, 'help-circle', 'Don\'t see it in your wallet?', 'Make sure your wallet shows the Arbitrum One network and has USDT (Arbitrum One) added as a token. Still missing? Contact support with WD-20931.', [['Withdrawal FAQ', 'book'], ['Contact support', 'chat']]);
  out[N18] = S.f.id; }
for (const [st, nm] of L19) {
  const S = await shellD(nm, 9, COLX[4], st === 'Sanctions' ? 'WD-20931 · rejected — 1,500.00 USDT returned to Available' : 'WD-20931 · not sent — 1,500.00 USDT returned to Available');
  await stepErr(S.stp);
  const cta = await flow19(S.fc, st, 0); await ffootS(S.fc, cta);
  await sumCard(S.side, { n: 9, ref: true, badge: st === 'Sanctions' ? await B('Rejected') : await B('Failed'), fee: 'Not charged', recvL: 'Returned to Available', recv: '1,500.00 USDT' });
  await balCard(S.side, 'Your balance now', [['check-circle', 'balance/available', 'Available', '10,715.30 USDT'], ['lock', 'balance/locked', 'Locked', '350.00 USDT']], 'Available includes the returned 1,500.00 USDT. Locked holds your 35 entries in round #1,248.');
  await helpCard(S.side, 'chat', st === 'Sanctions' ? 'Questions about this decision?' : 'Need a hand?', st === 'Sanctions' ? 'Support can explain the appeal process and confirm your other addresses are fine to use. Quote AML-58214 — we\'ll never ask for your password or 2FA codes.' : 'Failed broadcasts are rare and never cost you a fee. If a retry fails again, contact support with WD-20931 and we\'ll send it manually.', [['Contact support', 'chat'], ['Withdrawal FAQ', 'book']]);
  out[nm] = S.f.id;
}
fitSection(sec);
// fix WAL-17 Manual review desktop: footer note overflowed the card
{ const f = await figma.getNodeByIdAsync('102:40262'); if (f) { const ft = f.findOne(x => x.name === 'Flow footer'); const nt = ft && ft.children.find(x => x.type === 'TEXT'); if (nt) nt.remove(); } }
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.5 }); }
return { section: sec.id, out, sizes };
