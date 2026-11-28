// ===== m4 — [PUB-13] Security Center / 390 / Default =====
const N_SEC = '[PUB-13] Security Center / 390 / Default';
if (!skipIf(/^\[PUB-13\].*\/ 390/, N_SEC)) {
  const S = await mshell(N_SEC, 1650, 120); const C = S.C;
  add(C, [await pageHead('SECURITY CENTER', 'How we protect your account and your USDT', 'What we do on our side, what you can switch on in two minutes, and where to report a problem.', true), 'FILL']);
  // incident status
  const inc = box('Incident status', { gap: 12, p: 16 }); add(C, [inc, 'FILL']);
  const ih = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ih, await IC('check-circle', 20, 'text/success'), [await T('All systems operational', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('S')); add(inc, [ih, 'FILL']);
  add(inc, [await T('No open incidents. Last incident: delayed Ethereum deposits on 14 Nov 2026, 09:12 UTC — resolved in 38 min, no funds affected.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const np = AL('HORIZONTAL', { name: 'Network status pills', gap: 8, wrap: true, cgap: 8 }); for (const [c, s] of [['BNB Chain', 'Operational'], ['Polygon', 'Operational'], ['Arbitrum', 'Operational'], ['Ethereum', 'Degraded'], ['Solana', 'Operational']]) { const p = await I('9:377', { Chain: c, Status: s }, { 'Show status label': false, 'Show chevron': false }); p.name = 'Wallet/Network Pill — ' + c; add(np, p); } add(inc, [np, 'FILL']);
  const il = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(il, [await T('Ethereum: congested, deposits slower (≈ 9 min)', 'Caption', 'text/warning'), 'FILL'], await T('Status page', 'Label/S', 'text/brand'), await IC('external-link', 14, 'icon/brand')); add(inc, [il, 'FILL']);
  // custody model
  add(C, [await mhead('CUSTODY MODEL', 'Where the money sits', 'Player balances are kept apart from operating funds and reconciled every hour.', await DEMO('S')), 'FILL']);
  const cu = box('Custody model', { gap: 12, p: 16 }); add(C, [cu, 'FILL']);
  const cb = AL('HORIZONTAL', { name: 'Split bar — cold 95% / hot 5%', gap: 2 }); add(cu, [cb, 'FILL']); const c1 = rect(306, 12, 'brand/primary', 4, 'Cold storage 95%'); add(cb, [c1, 'FILL']); add(cb, rect(16, 12, 'accent/gold', 4, 'Hot wallet 5%'));
  const cl = AL('HORIZONTAL', { gap: 12 }); add(cl, [await T('Cold storage 95%', 'Caption', 'text/secondary'), 'FILL'], await T('Hot wallet 5%', 'Caption', 'text/secondary')); add(cu, [cl, 'FILL']);
  for (const [ic, t, b] of [['lock', 'Cold storage', '3-of-5 multi-signature vault with offline keys held by separate officers.'], ['wallet', 'Hot wallet', 'Pays withdrawals; topped up from cold storage only with two approvals.'], ['contract', 'Pool contract', 'This round’s pool — 186,400.00 USDT — sits in the GlobalPool contract on Arbitrum, not in our wallets.'], ['scale', 'Segregated & reconciled', 'Player balances are ring-fenced from company money; ledger and chain are reconciled hourly.']]) add(cu, [await iconRow(ic, t, b, { w: 260, line: t !== 'Segregated & reconciled' }), 'FILL']);
  // smart contracts & audits
  add(C, [await mhead('SMART CONTRACTS & AUDITS', 'Published, versioned, audited', 'Audit firm names and reports are placeholders until the final reports are published.', await DEMO('S')), 'FILL']);
  const sc = box('Contracts', { gap: 0, p: [4, 16, 4, 16] }); add(C, [sc, 'FILL']);
  const CT = [['GlobalPool', 'v1.3.0', '0x4b1d…77ce'], ['VRFConsumer', 'v1.1.2', '0x9e07…2a5f'], ['Treasury', 'v1.0.4', '0xd3c8…10b9']];
  for (let i = 0; i < CT.length; i++) { const [n, v, a] = CT[i]; const r = AL('VERTICAL', { name: 'Contract — ' + n, gap: 6, p: [12, 0, 12, 0] }); if (i < CT.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); const t1 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(t1, await CHAIN('Arbitrum', 16), [await T(n + ' ' + v, 'Label/M', 'text/primary'), 'FILL'], await statusChip('info', 'Audited — DEMO placeholder')); const t2 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(t2, await T(a, 'Mono/S', 'text/secondary'), await DEMO('XS'), [AL('HORIZONTAL', { name: 'spacer' }), 'FILL'], await T('Explorer', 'Label/S', 'text/brand'), await IC('external-link', 14, 'icon/brand')); add(r, [t1, 'FILL'], [t2, 'FILL']); add(sc, [r, 'FILL']); }
  add(C, [await BTN('Secondary', 'Audit reports (placeholder)', { size: 'L', lead: 'file' }), 'FILL']);
  // VRF
  const vr = box('Chainlink VRF', { gap: 10, p: 16, fill: 'bg/secondary' }); add(C, [vr, 'FILL']);
  const vh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(vh, await IC('shield-check', 20, 'icon/brand'), [await T('Draws use Chainlink VRF', 'Heading/H5', 'text/primary'), 'FILL']); add(vr, [vh, 'FILL']);
  add(vr, [await T('Every Global Pool winner comes from a verifiable random number with an on-chain proof. Round #1,248: request 0x9f2c…e71a at 20:00:04 UTC.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL'], [await BTN('Primary', 'Verify a draw', { size: 'L', lead: 'shield-check' }), 'FILL']);
  // account protection
  add(C, [await mhead('PROTECT YOUR ACCOUNT', 'Five switches, two minutes', 'All free. Security and transaction alerts can’t be turned off.'), 'FILL']);
  const ap = box('Account protection', { gap: 0, p: [4, 16, 4, 16] }); add(C, [ap, 'FILL']);
  const AP = [['smartphone', 'Two-factor authentication', 'Authenticator app codes on sign-in and every withdrawal. No SMS codes — SIM swaps can steal them.'], ['mail', 'Anti-phishing code', 'A word you choose appears in every email we send, so fakes are easy to spot.'], ['list', 'Withdrawal address whitelist', 'Withdraw only to saved addresses. New addresses wait 24 h before first use.'], ['monitor', 'Device & sign-in alerts', 'A new device triggers an email and an in-app alert with “Secure my account”.'], ['key', 'Session control', 'See every signed-in device and end them all in one tap.']];
  for (let i = 0; i < AP.length; i++) { const [ic, t, b] = AP[i]; add(ap, [await iconRow(ic, t, b, { w: 270, line: i < AP.length - 1 }), 'FILL']); }
  // anti-phishing email preview (example code, not a real user's)
  const em = box('Example email — anti-phishing code', { gap: 8, p: 16 }); add(C, [em, 'FILL']);
  const eh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(eh, [await T('WHAT A REAL EMAIL LOOKS LIKE', 'Overline', 'text/tertiary'), 'FILL'], await DEMO('XS')); add(em, [eh, 'FILL']);
  add(em, await T('From: GLOBAL POOL <no-reply@globalpool.example>', 'Mono/S', 'text/secondary'), await T('Subject: Withdrawal requested — 1,500.00 USDT', 'Body/S Strong', 'text/primary'));
  const code = AL('HORIZONTAL', { name: 'Code row', gap: 8, p: [8, 12, 8, 12], r: 10, fill: 'brand/tint', align: 'CENTER' }); add(code, await IC('shield', 16, 'icon/brand'), [await T('Your anti-phishing code:', 'Body/S', 'text/secondary'), 'FILL'], await T('SUNSET-42', 'Mono/M', 'text/brand')); add(em, [code, 'FILL']);
  add(em, [await T('Example code only. No code, or the wrong one? Don’t click anything — forward the email to security@globalpool.example.', 'Caption', 'text/tertiary', { w: 326 }), 'FILL']);
  // never ask
  const nv = box('We will never ask', { gap: 0, p: [12, 16, 12, 16], fill: 'bg/secondary' }); add(C, [nv, 'FILL']); add(nv, await T('We will never ask you for', 'Heading/H5', 'text/primary'));
  for (const t of ['Your seed phrase or private keys', 'A 2FA code by phone, chat or social media', 'A “test” transfer to verify your wallet', 'Remote access to your computer or phone']) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [8, 0, 8, 0] }); add(r, await IC('x-circle', 16, 'text/danger'), [await T(t, 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(nv, [r, 'FILL']); }
  // bug bounty
  const bb = box('Bug bounty', { gap: 12, p: 20, stroke: 'border/brand' }); add(C, [bb, 'FILL']);
  const bh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(bh, [await T('BUG BOUNTY', 'Overline', 'text/brand'), 'FILL'], await DEMO('S')); add(bb, [bh, 'FILL']);
  add(bb, [await T('Up to 50,000.00 USDT for critical findings', 'Heading/H4', 'text/primary', { w: 318 }), 'FILL']);
  for (const [k, v] of [['Critical', 'up to 50,000.00'], ['High', 'up to 10,000.00'], ['Medium', 'up to 2,000.00'], ['Low', 'up to 250.00']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(v + ' USDT', 'Label/M', 'text/primary')); add(bb, [r, 'FILL']); }
  add(bb, [await T('Scope: smart contracts, web app and public APIs. Safe harbour for good-faith research; first response within 48 h.', 'Caption', 'text/tertiary', { w: 318 }), 'FILL']);
  add(bb, [await BTN('Primary', 'Report a vulnerability', { size: 'L', lead: 'shield-alert' }), 'FILL'], [await BTN('Ghost', 'Read the disclosure policy', { size: 'L' }), 'FILL']);
  // compromised account
  const ca = box('Think your account is compromised?', { gap: 12, p: 16, fill: 'status/danger-tint', stroke: 'border/danger' }); add(C, [ca, 'FILL']);
  const ch = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ch, await IC('alert-circle', 20, 'text/danger'), [await T('Think your account is compromised?', 'Heading/H5', 'text/primary', { w: 290 }), 'FILL']); add(ca, [ch, 'FILL']);
  add(ca, [await T('“Secure my account” signs out every device, pauses withdrawals for 24 h and asks you to reset your password. Your balance and entries stay safe.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL'], [await BTN('Secondary', 'Secure my account', { size: 'L', lead: 'lock' }), 'FILL']);
  await mlic(C);
  await mfinish(S, null, 'Account');
  OUT.created[N_SEC] = S.f.id; EXIST[N_SEC] = S.f;
  fitSection(sec);
  await S.f.screenshot({ scale: 0.5 });
}
OUT.bounds = sec.children.map(c => [c.name, c.id, Math.round(c.x), Math.round(c.y), Math.round(c.height)]);
return OUT;
