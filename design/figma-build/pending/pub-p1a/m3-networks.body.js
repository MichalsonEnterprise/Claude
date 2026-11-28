// ===== m3 — [PUB-09] Supported Networks / 390 : Default (Arbitrum details) + Ethereum details (bottom sheet) =====
const N_NET = '[PUB-09] Supported Networks / 390 / Default — Arbitrum details';
const N_ETH = '[PUB-09] Supported Networks / 390 / Ethereum details (congested) — bottom sheet';
const NETS = [['BNB Chain', 'USDT (BEP-20)', '15', '0.12', 'ok'], ['Polygon', 'USDT (PoS)', '64', '0.02', 'ok'], ['Arbitrum', 'USDT (Arbitrum One)', '20', '0.08', 'ok'], ['Ethereum', 'USDT (ERC-20)', '12', '2.40', 'warn'], ['Solana', 'USDT (SPL)', '32 (finalized)', '0.01', 'ok']];
async function chainChip(name, selected) { const c = await I('17:2766', { State: selected ? 'Selected' : 'Default' }, { Label: name, 'Show icon': true, Icon: CHAINS[name] }); c.name = 'Chip — ' + name; return c; }
const R_NET = /^\[PUB-09\].*\/ 390 \/ Default/;
if (!skipIf(R_NET, N_NET)) {
  const S = await mshell(N_NET, 1140, 120); const C = S.C;
  add(C, [await pageHead('SUPPORTED NETWORKS', 'USDT on five networks', 'Deposit and withdraw USDT on BNB Chain, Polygon, Arbitrum, Ethereum or Solana. Fees and confirmation times differ — pick the network your wallet already uses.', true), 'FILL']);
  const st = box('Network status', { gap: 10, p: 16 }); add(C, [st, 'FILL']);
  const sr = AL('HORIZONTAL', { gap: 8, align: 'CENTER', wrap: true, cgap: 8 }); add(sr, await statusChip('ok', '4 operational'), await statusChip('warn', '1 congested — Ethereum'), await DEMO('XS')); add(st, [sr, 'FILL']);
  const sl = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(sl, [await T('Checked 27 Nov 2026, 18:42 UTC · refreshes every 60 s', 'Caption', 'text/tertiary'), 'FILL'], await T('Status page', 'Label/S', 'text/brand'), await IC('external-link', 14, 'icon/brand')); add(st, [sl, 'FILL']);
  // comparison table → stacked rows
  add(C, [await mhead('COMPARE', 'Fees and confirmations at a glance', 'Tap a network for its full details.', await DEMO('S')), 'FILL']);
  const cmp = box('Comparison — stacked rows (table on desktop)', { gap: 0, p: [4, 0, 4, 0] }); add(C, [cmp, 'FILL']);
  for (let i = 0; i < NETS.length; i++) {
    const [c, std, conf, fee, s] = NETS[i];
    const r = AL('HORIZONTAL', { name: 'Network row — ' + c, gap: 12, p: [12, 16, 12, 16], align: 'CENTER', fill: c === 'Arbitrum' ? 'surface/selected' : null }); if (i < NETS.length - 1) strokeSides(r, 'border/subtle', { b: 1 });
    const l = AL('VERTICAL', { gap: 2 }); const lt = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(lt, await CHAIN(c, 20), await T(c, 'Label/M', 'text/primary')); add(l, lt, await T(std + ' · ' + conf + ' conf.', 'Caption', 'text/tertiary'));
    const rt = AL('VERTICAL', { gap: 4, align: 'MAX' }); const fr = AL('HORIZONTAL', { gap: 4, align: 'BASELINE' }); add(fr, await T(fee, 'Number/S', 'text/primary'), await T('USDT fee', 'Caption', 'text/tertiary')); add(rt, fr, await statusChip(s, s === 'ok' ? 'Operational' : 'Congested'));
    add(r, [l, 'FILL'], rt, await IC('chevron-right', 18, 'icon/muted')); add(cmp, [r, 'FILL']);
  }
  const cn = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(cn, [await T('Fee = typical withdrawal network fee. Min deposit 10.00 USDT and min withdrawal 20.00 USDT on every network; platform withdrawal fee 0.00 USDT.', 'Caption', 'text/tertiary', { w: 320 }), 'FILL'], await DEMO('XS')); add(C, [cn, 'FILL']);
  // chain selector + Arbitrum detail panel
  add(C, [await mhead('NETWORK DETAILS', 'Arbitrum', 'Recommended for everyday deposits — Global Pool draws also settle on Arbitrum.'), 'FILL']);
  const cs = AL('HORIZONTAL', { name: 'Network selector — scrolls horizontally', gap: 8, align: 'CENTER' }); add(C, [cs, 'FILL']); cs.clipsContent = true;
  for (const [c] of [NETS[2], NETS[0], NETS[1], NETS[3], NETS[4]]) add(cs, await chainChip(c, c === 'Arbitrum'));
  const card = await I('23:12849', { Chain: 'Arbitrum' }); card.name = 'Card/Network — Arbitrum'; add(C, [card, 'FILL']);
  add(C, [await kvList('Arbitrum — more details', [['Typical credit time', '≈ 1 min · 20 conf.'], ['Withdrawal network fee', '0.08 USDT'], ['Address format', '0x + 40 hex (EVM)', { mono: false }], ['USDT contract', '0xFd08…Cbb9', { mono: true, demo: true }], ['Daily withdrawal limit', '25,000.00 USDT', { demo: true }], ['Withdrawals with KYC', 'Level 2 required']], { kw: 140 }), 'FILL']);
  const cp = AL('HORIZONTAL', { name: 'Contract note', gap: 8, align: 'CENTER' }); add(cp, await IC('info', 14, 'icon/muted'), [await T('Contract shown is an illustrative placeholder — always copy the address from your Deposit screen.', 'Caption', 'text/tertiary', { w: 320 }), 'FILL']); add(C, [cp, 'FILL']);
  // safety
  const sf = box('Before you send', { gap: 4, p: 20, fill: 'bg/secondary' }); add(C, [sf, 'FILL']);
  add(sf, await T('BEFORE YOU SEND', 'Overline', 'text/brand'), [await T('Same token, same network — every time', 'Heading/H5', 'text/primary', { w: 318 }), 'FILL']);
  for (const [ok, t] of [[true, 'Send only USDT on the network shown next to your deposit address.'], [false, 'Don’t send other tokens or NFTs — they can’t be credited.'], [false, 'Don’t withdraw from an exchange on a network we don’t list (for example TRC-20).'], [true, 'New withdrawal addresses wait 24 h before first use; whitelisted ones don’t.']]) { const r = AL('HORIZONTAL', { gap: 10, p: [8, 0, 8, 0] }); add(r, await IC(ok ? 'check-circle' : 'x-circle', 18, ok ? 'text/success' : 'text/danger'), [await T(t, 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(sf, [r, 'FILL']); }
  add(C, [await callout('warn', 'Sent on the wrong network?', 'Deposits on a network other than the one selected may not be credited automatically. Contact support with the transaction hash — recovery isn’t guaranteed.'), 'FILL']);
  add(C, [await linkRow('How deposits and withdrawals work'), 'FILL']);
  await mlic(C);
  await mfinish(S, await sticky('Sign up to deposit USDT', 'Min deposit 10.00 USDT · 18+ · permitted regions only', { lead: 'deposit' }), 'Wallet');
  OUT.created[N_NET] = S.f.id; EXIST[N_NET] = S.f;
}
if (!skipIf(/^\[PUB-09\].*\/ 390 \/ Ethereum/, N_ETH)) {
  const def = found(R_NET);
  const sh = await sheet('Ethereum', 'USDT (ERC-20) · tapped from the comparison list'); const B = sh.body;
  const hr = AL('HORIZONTAL', { name: 'Network header', gap: 12, align: 'CENTER' }); const tt = AL('VERTICAL', { gap: 2 }); add(tt, await T('Ethereum', 'Heading/H4', 'text/primary'), await T('USDT (ERC-20)', 'Caption', 'text/tertiary')); add(hr, await CHAIN('Ethereum', 36), [tt, 'FILL'], await statusChip('warn', 'Congested'), await DEMO('XS')); add(B, [hr, 'FILL']);
  add(B, [await callout('warn', 'Ethereum is congested right now', 'Deposits still need 12 confirmations but take about 9 min instead of 3. The withdrawal network fee is about 2.40 USDT. Checked 18:42 UTC.'), 'FILL']);
  add(B, [await kvList('Ethereum details', [['Confirmations', '12'], ['Typical credit time', '≈ 3 min (now ≈ 9 min)'], ['Withdrawal network fee', '≈ 2.40 USDT'], ['Platform withdrawal fee', '0.00 USDT'], ['Min deposit · withdrawal', '10.00 · 20.00 USDT'], ['Address format', '0x + 40 hex (EVM)'], ['USDT contract', '0xFd08…Cbb9', { mono: true, demo: true }]], { kw: 150 }), 'FILL']);
  add(B, [await callout('info', 'Cheaper option', 'Arbitrum uses the same 0x address format and costs 0.08 USDT per withdrawal. Switch only if your wallet supports Arbitrum One.'), 'FILL']);
  const fr = AL('HORIZONTAL', { name: 'Actions', gap: 12 }); add(fr, [await BTN('Secondary', 'Compare networks', { size: 'L' }), 'FILL'], [await BTN('Primary', 'Done', { size: 'L' }), 'FILL']); add(sh.foot, [fr, 'FILL']); homeIndicator(sh.foot);
  sh.s.primaryAxisSizingMode = 'AUTO';
  const f = await sheetState(R_NET, N_ETH, 1140, def.y + def.height + 160, sh.s);
  OUT.created[N_ETH] = f.id; EXIST[N_ETH] = f;
}
fitSection(sec);
for (const n of [N_NET, N_ETH]) { const f = sec.children.find(x => x.name === n); if (f && OUT.created[n]) await f.screenshot({ scale: 0.5 }); }
OUT.bounds = sec.children.map(c => [c.name, c.id, Math.round(c.x), Math.round(c.y), Math.round(c.height)]);
return OUT;
