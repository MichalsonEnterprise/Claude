// ===== BODY m1 — Mobile 390: WAL-10 asset sheet, WAL-11 network sheet, WAL-12 Default =====
const P = 'MOB-07 · ';
const N10 = P + 'WAL-10 Withdraw — Step 1 Select Asset / 390 / Default — asset sheet';
const N11 = P + 'WAL-11 Withdraw — Step 2 Select Network / 390 / Default — network sheet';
const N12 = P + 'WAL-12 Withdraw — Step 3 Enter Address / 390 / Default';
clean([N10, N11, N12]);
const out = {}, H = {};
{ const S = await shellM(N10, 1, MX[0], 'Select asset', 'Select network', { sheet: true });
  const bb = await I('14:1974', { Layout: 'Compact' }); add(S.ct, [bb, 'FILL']);
  await tabM(S.f);
  const { sh, scr } = await sheetM(S.f, 'Choose asset');
  await sheetHead(sh, 'Choose what to withdraw', 'Withdrawals are paid out in USDT. Only your Available balance can leave your account.');
  const o1 = hrow('Asset option — USDT (selected)', 12, { p: 16, fill: 'surface/selected', stroke: 'border/brand', r: 14 }); add(sh, [o1, 'FILL']);
  o1.appendChild(await CHAIN('USDT', 32));
  const c1 = AL('VERTICAL', { name: 'Text', gap: 2 }); add(o1, [c1, 'FILL']); await tx(c1, 'USDT', 'Body/M Strong'); await tx(c1, 'Tether USD · 5 networks', 'Caption', 'text/secondary');
  const v1 = AL('VERTICAL', { name: 'Value', gap: 2, align: 'MAX' }); o1.appendChild(v1); const vr = hrow('Amount', 4); v1.appendChild(vr); await tx(vr, '9,215.30', 'Number/S', 'text/primary', { hug: true }); vr.appendChild(await DEMO('XS')); await tx(v1, 'Available', 'Caption', 'text/success', { hug: true });
  o1.appendChild(await IC('check-circle', 20, 'icon/brand'));
  const o2 = AL('VERTICAL', { name: 'Asset option — Bonus funds (not withdrawable)', gap: 10, p: 16, fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); add(sh, [o2, 'FILL']);
  const r2 = hrow('Row', 12); add(o2, [r2, 'FILL']); const it = AL('HORIZONTAL', { name: 'Icon tile', p: 6, fill: 'surface/default', r: 10 }); it.appendChild(await IC('gift', 20, 'icon/muted')); r2.appendChild(it);
  const c2 = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r2, [c2, 'FILL']); await tx(c2, 'Bonus funds', 'Body/M Strong', 'text/secondary'); await tx(c2, 'Not withdrawable yet', 'Caption', 'text/tertiary');
  const v2 = hrow('Value', 4); r2.appendChild(v2); await tx(v2, '50.00', 'Number/S', 'text/tertiary', { hug: true }); v2.appendChild(await DEMO('XS'));
  const m = AL('HORIZONTAL', { name: 'Wagering meter', fill: 'surface/default', r: 9999, h: 6, w: 300, clip: true }); add(o2, [m, 'FILL']); m.appendChild(rect(Math.round(m.width * 0.428), 6, 'brand/primary', 9999, 'Progress'));
  await tx(o2, 'Wagering 642.00 of 1,500.00 USDT (30×) · expires 11 Dec 2026, 23:59 UTC. Moves to Available when complete.', 'Caption', 'text/secondary');
  const al = await alertBox('info', 'Nothing leaves your account until step 7', 'You\'ll review the network, address and every fee first.'); add(sh, [al, 'FILL']);
  await sheetFoot(sh, { next: 'Continue with USDT' });
  H[N10] = pinSheet(S.f, sh, scr); out[N10] = S.f.id; }
{ const S = await shellM(N11, 2, MX[1], 'Select network', 'Enter address', { sheet: true });
  const rc = card('Asset recap', { gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised' }); add(S.ct, [rc, 'FILL']);
  { const a = hrow('Asset value', 6); a.appendChild(await CHAIN('USDT', 16)); await tx(a, 'USDT · Tether USD', 'Body/S Strong', 'text/primary', { hug: true }); await kv(rc, 'Asset', a); }
  await kv(rc, 'Available', [await T('9,215.30 USDT', 'Number/S', 'text/primary'), await DEMO('XS')], { last: true });
  await tabM(S.f);
  const { sh, scr } = await sheetM(S.f, 'Choose network');
  await sheetHead(sh, 'Choose the network', 'Your wallet must accept USDT on the same network. The network fee is taken from your amount.');
  const list = AL('VERTICAL', { name: 'Network list', gap: 8 }); add(sh, [list, 'FILL']);
  for (const [chain, std, fee, status, sel, warn] of [['BNB Chain', 'USDT (BEP-20) · ~2 min', '0.12 USDT', 'Operational'], ['Polygon', 'USDT (PoS) · ~3 min', '0.02 USDT', 'Operational'], ['Arbitrum', 'USDT (Arbitrum One) · ~1 min', '0.08 USDT', 'Operational', true], ['Ethereum', 'USDT (ERC-20) · slower', '2.40 USDT', 'Congested', false, true], ['Solana', 'USDT (SPL) · ~1 min', '0.01 USDT', 'Operational']]) {
    const o = await I('15:890', { State: sel ? 'Selected' : 'Default' }, { Chain: CHAINS[chain], 'Show warning': !!warn }); o.name = 'Network option — ' + chain; add(list, [o, 'FILL']);
    setT(o, 'Name', chain); setT(o, 'Standard', std); setT(o, 'Fee', fee); setT(o, 'Status', status, 0, status === 'Congested' ? 'text/warning' : null);
  }
  const al = await alertBox('warning', 'Wrong-network withdrawals can\'t be recovered', 'Pick Arbitrum One only if your wallet or exchange lists USDT on Arbitrum One.'); add(sh, [al, 'FILL']);
  await sheetFoot(sh, { next: 'Continue with Arbitrum', cancel: false });
  H[N11] = pinSheet(S.f, sh, scr); out[N11] = S.f.id; }
{ const S = await shellM(N12, 3, MX[2], 'Enter address', 'Enter amount');
  await addr12(S.ct, 'Default');
  await footM(S.f, { next: 'Continue to amount', state: 'Disabled', note: 'Choose or paste an address to continue' });
  out[N12] = S.f.id; }
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm.slice(9, 15)] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes, H };
