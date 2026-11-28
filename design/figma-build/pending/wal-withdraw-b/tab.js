// ===== BODY tab — Tablet 768 defaults (WAL-15..19), cloned flow + summary cards from the desktop masters =====
function setStepM(s, n, label, next, err) { const t = k => s.findOne(x => x.type === 'TEXT' && x.name === k); t('Current label').characters = label; t('Progress text').characters = 'Step ' + n + ' of 9'; t('Next step').characters = next ? 'Next: ' + next : (err ? 'Withdrawal not sent — funds returned' : 'All steps complete'); const seg = i => s.findOne(x => x.name === 'Segment ' + i); const done = seg(1).fills, todo = seg(9).fills; for (let i = 1; i <= 9; i++) seg(i).fills = i <= n ? done : todo; if (err) seg(n).fills = [paint('status/danger')]; }
async function shellT(name, n, x, y, label, next, err) {
  const f = await screen(name, 768, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Collapsed', Auth: 'Member' }); body.appendChild(sb); sb.layoutSizingVertical = 'FILL';
  for (const it of sb.findAll(k => k.type === 'INSTANCE' && (k.name === 'Item/Lobby' || k.name === 'Item/Wallet'))) it.setProperties({ State: it.name === 'Item/Wallet' ? 'Active' : 'Default' });
  const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
  add(main, [await I('23:12908', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 20, p: 24 }); add(main, [ct, 'FILL']);
  const ph = hrow('Page header', 12); add(ct, [ph, 'FILL']); await tx(ph, 'Withdraw USDT', 'Heading/H3', 'text/primary', { hug: true }); sp(ph); ph.appendChild(await DEMO('M'));
  const nav = hrow('Wallet sub-nav', 20, { align: 'MAX' }); strokeSides(nav, 'border/subtle', { b: 1 }); add(ct, [nav, 'FILL']);
  for (const l of ['Overview', 'Deposit', 'Withdraw', 'History']) nav.appendChild(await I('20:6831', { State: l === 'Withdraw' ? 'Active' : 'Default' }, { Label: l }));
  const stp = await I('15:3270', { Steps: '9' }); add(ct, [stp, 'FILL']); setStepM(stp, n, label, next, err);
  return { f, ct };
}
const D = 'WAL-15 Withdraw — Step 6 Risk Validation / ';
const TT = [
  [D + '1440 / Pass', D + '768 / Pass', 6, 'Risk check', '2FA confirmation', 0, false, 2],
  ['WAL-16 Withdraw — Step 7 Two-Factor Confirmation / 1440 / Default — email code + authenticator', 'WAL-16 Withdraw — Step 7 Two-Factor Confirmation / 768 / Default', 7, 'Two-factor confirmation', 'Pending', 1, false, 1],
  ['WAL-17 Withdraw — Step 8 Pending / 1440 / Processing', 'WAL-17 Withdraw — Step 8 Pending / 768 / Processing', 8, 'Pending — sending', 'Done', 2, false, 2],
  ['WAL-18 Withdraw — Step 9 Successful / 1440 / Default', 'WAL-18 Withdraw — Step 9 Successful / 768 / Default', 9, 'Withdrawal complete', null, 3, false, 2],
  ['WAL-19 Withdraw — Step 9 Failed / 1440 / Rejected by sanctions screening (alternative outcome)', 'WAL-19 Withdraw — Step 9 Failed / 768 / Rejected by sanctions screening', 9, 'Withdrawal rejected', null, 4, true, 2]
];
clean(TT.map(t => t[1]));
let ty = 0; for (const c of sec.children) if (!c.name.includes('/ 768 /')) ty = Math.max(ty, c.y + c.height); ty += 240;
const out = {}, missing = [];
for (const [src, nm, n, label, next, col, err, nSide] of TT) {
  const s = sec.children.find(c => c.name === src); if (!s) { missing.push(src); continue; }
  const S = await shellT(nm, n, COLX[col], ty, label, next, err);
  const fc = s.findOne(x => x.name === 'Flow card').clone(); add(S.ct, [fc, 'FILL']);
  const sd = s.findOne(x => x.name === 'Side summary');
  for (let i = 0; i < Math.min(nSide, sd.children.length); i++) { const c = sd.children[i].clone(); add(S.ct, [c, 'FILL']); }
  out[nm] = S.f.id;
}
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.5 }); }
return { section: sec.id, out, sizes, missing };
