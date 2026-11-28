// ===== BODY t — Tablet 768 defaults WAL-10..14 (cloned flow + summary cards from the desktop masters) =====
function setStepM(s, n, label, next) { const t = k => s.findOne(x => x.type === 'TEXT' && x.name === k); t('Current label').characters = label; t('Progress text').characters = 'Step ' + n + ' of 9'; t('Next step').characters = 'Next: ' + next; const seg = i => s.findOne(x => x.name === 'Segment ' + i); const done = seg(1).fills, todo = seg(9).fills; for (let i = 1; i <= 9; i++) seg(i).fills = i <= n ? done : todo; }
async function shellT(name, n, x, y, label, next) {
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
  const stp = await I('15:3270', { Steps: '9' }); add(ct, [stp, 'FILL']); setStepM(stp, n, label, next);
  return { f, ct };
}
const TT = [
  ['WAL-10 Withdraw — Step 1 Select Asset / 1440 / Default', 'WAL-10 Withdraw — Step 1 Select Asset / 768 / Default', 1, 'Select asset', 'Select network', 0, 1],
  ['WAL-11 Withdraw — Step 2 Select Network / 1440 / Default', 'WAL-11 Withdraw — Step 2 Select Network / 768 / Default', 2, 'Select network', 'Enter address', 1, 1],
  ['WAL-12 Withdraw — Step 3 Enter Address / 1440 / Default', 'WAL-12 Withdraw — Step 3 Enter Address / 768 / Default', 3, 'Enter address', 'Enter amount', 2, 1],
  ['WAL-13 Withdraw — Step 4 Enter Amount / 1440 / Default', 'WAL-13 Withdraw — Step 4 Enter Amount / 768 / Default', 4, 'Enter amount', 'Fees & summary', 3, 2],
  ['WAL-14 Withdraw — Step 5 Fees & Summary / 1440 / Default', 'WAL-14 Withdraw — Step 5 Fees & Summary / 768 / Default', 5, 'Fees & summary', 'Risk check', 4, 2]
];
clean(TT.map(t => t[1]));
let ty = 0; for (const c of sec.children) if (!c.name.includes('/ 768 /')) ty = Math.max(ty, c.y + c.height); ty += 240;
const out = {}, missing = [];
for (const [src, nm, n, label, next, col, nSide] of TT) {
  const s = sec.children.find(c => c.name === src); if (!s) { missing.push(src); continue; }
  const S = await shellT(nm, n, COLX[col], ty, label, next);
  const fc = s.findOne(x => x.name === 'Flow card').clone(); add(S.ct, [fc, 'FILL']);
  const sd = s.findOne(x => x.name === 'Side summary');
  for (let i = 0; i < Math.min(nSide, sd.children.length); i++) { const c = sd.children[i].clone(); add(S.ct, [c, 'FILL']); }
  out[nm] = S.f.id;
}
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm.slice(0, 6)] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.4 }); }
return { section: sec.id, out, sizes, missing };
