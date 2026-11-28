for (const MODE of (typeof D10 !== 'undefined' ? D10 : ['Request', 'Success'])) { const { sec, fr, db, X } = await START('AUTH-10 Wallet Verification / 1440 / ' + MODE, 6);
const bg = await LOBBYBG(fr, db, { label: 'member lobby behind wallet verification dialog' });
const d = DIALOG(fr, { dir: 'VERTICAL', w: 560, gap: 20, p: [24, 32, 32, 32], name: 'Dialog — Verify wallet ownership (' + MODE + ')' }); await fx(d, 'Elevation/4 — Modal');
const CFG = { Request: ['key', 'brand', 'VERIFY OWNERSHIP · STEP 2 OF 2', 'Sign a message in your wallet', 'This proves you control 0x12ab…9f3C. It’s free — signing a message is not a transaction and can’t move funds.'], Success: ['check-circle', 'success', 'WALLET VERIFIED', 'This wallet is now verified', 'Your signature matched 0x12ab…9f3C. You can deposit from it now and add it as a withdrawal address.'], Rejected: ['x-circle', 'danger', 'SIGNATURE DECLINED', 'You declined the signature', 'Nothing happened: no transaction was sent and no fees were charged. The wallet stays connected but unverified.'], 'Expired nonce': ['clock', 'warning', 'REQUEST EXPIRED', 'This sign-in request has expired', 'Each message works once and expires 10 minutes after it’s issued. This one was issued at 16:42 UTC and expired at 16:52 UTC.'] }[MODE];
add(d, [ROW('Header', [await TILE(CFG[0], CFG[1], 48), [SPACER(), 'FILL'], await XBTN()], { align: 'MIN' }), 'FILL']);
const hd = COL('Title', [], { gap: 8 }); add(hd, await T(CFG[2], 'Overline', CFG[1] === 'brand' ? 'text/brand' : 'text/' + CFG[1]), await P(CFG[3], 'Heading/H3', 'text/primary'), await P(CFG[4], 'Body/M', 'text/secondary')); add(d, [hd, 'FILL']);
if (MODE === 'Request') {
  add(d, [await WALLETROW(), 'FILL']);
  add(d, [await MSGBOX(), 'FILL']);
  add(d, ROW('Guarantees', [await CHIP('check', 'No transaction'), await CHIP('check', 'No gas · 0.00'), await CHIP('check', 'Can’t move funds')], { gap: 8 }));
  add(d, [ROW('Waiting', [await IC('spinner', 20, 'icon/brand'), COL('T', [await T('Waiting for your signature in Browser wallet…', 'Body/S Strong', 'text/primary'), await T('Expires at 16:52 UTC · 09:12 left', 'Caption', 'text/tertiary')], { gap: 2 }), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 12, p: [12, 16, 12, 16], fill: 'surface/raised', stroke: 'border/subtle', r: 10 }), 'FILL']);
  add(d, [await NOTE('shield-check', 'Only sign if the message starts with “GLOBAL POOL wants you to sign in” and your wallet shows globalpool.example. Never sign anything that asks to approve tokens or send funds.', { ic: 'icon/brand' }), 'FILL']);
  await ACTIONS(d, [await BTN('Ghost', 'Cancel')], [await BTN('Secondary', 'Open wallet again', { lead: 'external-link' })]);
  const pop = await EXTPOPUP({ title: 'Signature request', sign: true, no: 'Reject', yes: 'Sign' }); await FLOAT(fr, pop, 1440 - 340 - 24, db.height + 8);
} else if (MODE === 'Success') {
  add(d, [await WALLETROW({ badge: await RB('Approved', 'Verified') }), 'FILL']);
  const k = COL('Verification record', [], { gap: 0, p: [4, 16, 4, 16], fill: 'bg/secondary', stroke: 'border/subtle', r: 10 });
  add(k, [await KV('Verified', '27 Nov 2026, 16:43 UTC', { demo: true }), 'FILL'], [await KV('Signature', '0x4c1d…92ab', { vs: 'Mono/S', demo: true }), 'FILL'], [await KV('Nonce', '8f3a91… · used, can’t be reused', { vs: 'Mono/S' }), 'FILL'], [await KV('Transaction', 'None — gas spent 0.00', { line: false }), 'FILL']);
  add(d, [k, 'FILL']);
  add(d, [await BUL('deposit', 'icon/brand', 'Deposit USDT from this wallet', 'Send USDT (BEP-20) on BNB Chain. Minimum deposit 10.00 USDT.', { tile: 'brand' }), 'FILL'], [await BUL('shield-check', 'icon/brand', 'Use it for withdrawals', 'Add it to your whitelist — new withdrawal addresses have a 24-hour cooldown.', { tile: 'brand' }), 'FILL']);
  await ACTIONS(d, [await BTN('Ghost', 'Done')], [await BTN('Secondary', 'Add to whitelist'), await BTN('Primary', 'Deposit USDT', { lead: 'deposit' })]);
  const t = await TOAST('Success', 'Wallet verified', '0x12ab…9f3C is verified. No transaction was sent and no gas was spent.'); await FLOAT(fr, t, 1440 - t.width - 24, db.height + 80);
} else if (MODE === 'Rejected') {
  add(d, [await WALLETROW({ badge: await RB('Pending', 'Unverified') }), 'FILL']);
  add(d, [await ALERT('info', 'Why we ask for a signature', 'It’s the only way to prove the wallet is yours without moving any funds. Unverified wallets can’t be used for withdrawals.'), 'FILL']);
  const w = COL('Options', [], { gap: 14 }); add(w, await T('What you can do', 'Label/M', 'text/primary'));
  add(w, [await BUL('refresh', 'icon/brand', 'Try again', 'We’ll send a fresh message with a new nonce — check it starts with “GLOBAL POOL wants you to sign in”.'), 'FILL'], [await BUL('wallet', 'icon/brand', 'Use a different wallet', 'Disconnect this one and connect another.'), 'FILL'], [await BUL('clock', 'icon/brand', 'Verify later', 'You can deposit and play from your balance. Verify any time in Wallet → Connected wallets.'), 'FILL']);
  add(d, [w, 'FILL']);
  await ACTIONS(d, [await BTN('Ghost', 'Disconnect wallet')], [await BTN('Secondary', 'Later'), await BTN('Primary', 'Try again', { lead: 'refresh' })]);
} else {
  add(d, [await WALLETROW({ badge: await RB('Pending', 'Unverified') }), 'FILL']);
  add(d, [await MSGBOX({ expired: true, label: 'Expired message' }), 'FILL']);
  add(d, [await ALERT('warning', 'Still see the old request in your wallet?', 'Reject it there. Signing an expired message does nothing — we only accept the newest nonce, once.'), 'FILL']);
  await ACTIONS(d, [await BTN('Ghost', 'Cancel')], [await BTN('Primary', 'Get a new message', { lead: 'refresh' })]);
}
CENTER(fr, d, bg, MODE === 'Request' ? { dx: -120 } : {});
OUT.push(await FINISH(sec, fr, X)); }
