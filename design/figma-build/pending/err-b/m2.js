// ERR mobile batch 2 — ERR-06 wallet maintenance, ERR-07 wrong network sheet, ERR-07 suspicious sign-in (page 10, 'ERR — Mobile' row 2)
await mInit();
const rowY = placeMine(); // keeps ERR-04..07 frames in their own row under err-a's ERR-01..03 row
const out = {};
async function netOpt(chain, std, fee, status, state = 'Default', warn) { const o = await I('15:890', { State: state }, { Chain: CHAINS[chain], 'Show warning': !!warn }); await ov(o, 'Name', chain); await ov(o, 'Standard', std); await ov(o, 'Fee', fee); await ov(o, 'Status', status); if (warn) await ov(o, 'Warning label', warn); return o; }
// M4 — ERR-06 Wallet maintenance (BNB Chain paused)
{ const f = await mscreen('[ERR-06] Wallet maintenance / 390 / BNB Chain paused', 3);
  add(f, await topbar(), await mBanner('wrench', 'status/warning-tint', 'text/warning', 'BNB Chain wallet maintenance', 'Deposits and withdrawals on BNB Chain are paused until 02:30 UTC — 18 min left. Other networks work as normal, and nothing you hold is affected.', await BTN('Ghost', 'Status page', { size: 'S', trail: 'arrow-right' })));
  const ct = content(); add(f, ct);
  const hd = AL('VERTICAL', { gap: 4 }); add(hd, await T('Deposit USDT', 'Heading/H4', 'text/primary'), await T('Step 1 of 7 · Choose network', 'Caption', 'text/tertiary')); add(ct, hd);
  const bnb = await netOpt('BNB Chain', 'USDT (BEP-20)', '≈ 0.12 USDT', 'Maintenance · until 02:30 UTC', 'Disabled'); const dot = bnb.findOne(n => n.name === 'Status dot'); if (dot) fill(dot, 'status/warning');
  const opts = AL('VERTICAL', { name: 'Network options', gap: 8, w: 358 });
  for (const o of [bnb, await netOpt('Polygon', 'USDT (PoS)', '≈ 0.02 USDT', 'Operational'), await netOpt('Arbitrum', 'USDT (Arbitrum One)', '≈ 0.08 USDT', 'Operational', 'Selected'), await netOpt('Ethereum', 'USDT (ERC-20)', '≈ 2.40 USDT', 'Slower than usual', 'Default', 'Congested'), await netOpt('Solana', 'USDT (SPL)', '≈ 0.01 USDT', 'Operational')]) add(opts, [o, 'FILL']);
  add(ct, [opts, 'FILL']);
  const dm = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dm, await DEMO('S'), await T('Fees and times illustrative', 'Caption', 'text/tertiary'));
  add(ct, [await note('info', 'USDT sent to an existing BNB Chain deposit address during maintenance is credited after 02:30 UTC — it isn’t lost.', 358), 'FILL'], dm);
  add(f, await sticky([await BTN('Primary', 'Continue with Arbitrum', { size: 'L', trail: 'arrow-right' })], 'Min deposit 10.00 USDT · 20 confirmations · network fee paid in your wallet'), await tabbar('Wallet'));
  out.m4 = f.id; }
// M5 — ERR-07 Wrong network (bottom sheet over a 390 × 844 viewport)
{ const f = await mscreen('[ERR-07] Wrong network / 390 / Bottom sheet', 4, 844);
  const bar = f.children[0];
  add(f, await topbar());
  const ct = content(); add(f, ct);
  const hd = AL('VERTICAL', { gap: 4 }); add(hd, await T('Deposit USDT from your wallet', 'Heading/H4', 'text/primary', { w: 358 }), await T('Step 1 of 7 · Choose network', 'Caption', 'text/tertiary')); add(ct, hd);
  const bal = await card('Available balance'); const bv = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(bv, await T('9,215.30', 'Number/M', 'text/primary'), await T('USDT available', 'Body/S', 'text/secondary'), await DEMO('S')); add(bal, bv); add(ct, [bal, 'FILL']);
  const scrim = rect(390, 844 - bar.height, 'scrim/overlay', 0, 'Scrim'); f.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = bar.height;
  const sh = AL('VERTICAL', { name: 'Sheet — Switch to a supported network', gap: 16, p: [8, 16, 8, 16], fill: 'surface/overlay', w: 390 }); radius(sh, 28); for (const c of ['bottomLeftRadius', 'bottomRightRadius']) { sh.setBoundVariable(c, null); sh[c] = 0; } await fx(sh, 'Elevation/4 — Modal');
  const gr = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [4, 0] }); add(gr, rect(40, 4, 'border/strong', 9999, 'Grabber')); add(sh, [gr, 'FILL']);
  const th = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(th, await tile('alert-triangle', 'status/warning-tint', 'text/warning'), await T('Switch to a supported network', 'Heading/H5', 'text/primary', { w: 306 })); add(sh, th);
  add(sh, await T('Your wallet is on an unsupported network (chain ID 10). To send USDT from this wallet, switch it to one of the networks below.', 'Body/S', 'text/secondary', { w: 358 }));
  const wr = AL('HORIZONTAL', { name: 'Wallet row', gap: 8, align: 'CENTER', wrap: true, cgap: 8 }); add(wr, await I('9:418', { Size: 'S', State: 'Default' }, { Address: '0x12ab…9f3C' }), await chip('Unsupported · chain ID 10', false, 'text/warning')); add(sh, [wr, 'FILL']);
  add(sh, await T('SUPPORTED NETWORKS', 'Overline', 'text/tertiary'));
  for (const o of [await netOpt('Arbitrum', 'USDT (Arbitrum One)', '≈ 0.08 USDT', 'Operational', 'Selected'), await netOpt('Polygon', 'USDT (PoS)', '≈ 0.02 USDT', 'Operational'), await netOpt('BNB Chain', 'USDT (BEP-20)', '≈ 0.12 USDT', 'Operational')]) add(sh, [o, 'FILL']);
  add(sh, [await note('shield', 'We never ask for your seed phrase or private key.', 358), 'FILL']);
  add(sh, [await BTN('Primary', 'Switch to Arbitrum', { size: 'L' }), 'FILL'], [await BTN('Ghost', 'Disconnect', { size: 'L' }), 'FILL']);
  const hi = AL('HORIZONTAL', { name: 'Home indicator', justify: 'CENTER', p: [8, 0] }); add(hi, rect(134, 5, 'text/primary', 9999, 'Home indicator')); add(sh, [hi, 'FILL']);
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = 844 - sh.height;
  out.m5 = f.id; out.m5sheetTop = sh.y; }
// M6 — ERR-07 Suspicious sign-in
{ const f = await mscreen('[ERR-07] Suspicious sign-in / 390 / New device alert', 5);
  add(f, await topbar(), await mBanner('shield-alert', 'status/danger-tint', 'text/danger', 'New sign-in from Windows · Edge · Madrid', '25 Nov 2026, 19:06 UTC. If this wasn’t you, secure your account now. Withdrawals requested from a new device are held for 24 h.'));
  const ct = content(); add(f, ct);
  add(ct, await T('Was this you?', 'Heading/H4', 'text/primary'));
  const dc = await card('New device'); const row = AL('HORIZONTAL', { gap: 12, align: 'MIN' }); const col = AL('VERTICAL', { gap: 4 });
  add(col, await T('Windows PC · Edge 131', 'Label/M', 'text/primary'), await T('Madrid, Spain · IP 88.12.•••.203', 'Body/S', 'text/secondary', { w: 270 }), await T('Signed in 25 Nov 2026, 19:06 UTC', 'Caption', 'text/tertiary'));
  add(row, await tile('monitor', 'status/danger-tint', 'text/danger'), col); add(dc, row);
  const st = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(st, await stat('alert-triangle', 'New device and new city', 'text/warning'), await DEMO('S')); add(dc, st); add(ct, [dc, 'FILL']);
  const ud = await card('Your usual devices'); add(ud, await T('Your usual devices', 'Label/M', 'text/primary'), [await list([['monitor', 'MacBook Pro · Chrome · Lisbon — this device', 'icon/muted'], ['smartphone', 'iPhone 15 · Safari · Lisbon', 'icon/muted']]), 'FILL']); add(ct, [ud, 'FILL']);
  add(ct, [await note('mail', 'We also emailed n•••@example.com. Real emails from us always show your anti-phishing code AURORA-27.', 358, 'surface/default', 'icon/brand'), 'FILL']);
  add(f, await sticky([await BTN('Primary', 'Secure account', { size: 'L', lead: 'shield' }), await BTN('Ghost', 'This was me', { size: 'L' })], 'Secure account signs out every other session and asks for a new password.'), await tabbar('Account'));
  out.m6 = f.id; }
fitSection(MS);
const res = { rowY }; for (const k of ['m4', 'm5', 'm6']) { const n = await figma.getNodeByIdAsync(out[k]); res[k] = { id: out[k], name: n.name, h: n.height, flags: audit(n) }; }
res.sheetTop = out.m5sheetTop;
const mine = MS.children.filter(MINE).map(c => ({ n: c.name.slice(0, 30), x: c.x, y: c.y, h: c.height }));
await (await figma.getNodeByIdAsync(out.m4)).screenshot({ scale: 0.5 });
await (await figma.getNodeByIdAsync(out.m5)).screenshot({ scale: 0.5 });
await (await figma.getNodeByIdAsync(out.m6)).screenshot({ scale: 0.5 });
return { section: MS.id, res, mine };
