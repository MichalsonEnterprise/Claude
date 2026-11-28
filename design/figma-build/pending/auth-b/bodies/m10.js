for (const MODE of (typeof M10 !== 'undefined' ? M10 : ['Request', 'Expired nonce'])) {
const { sec, fr, db, X } = await START('AUTH-10 Wallet Verification / 390 / ' + MODE, 7, { mobile: true });
const bg = await MBG(fr, { auth: 'Member', tab: 'Wallet' });
const s = await SHEET(MODE, { gap: 16 });
if (MODE === 'Request') {
  await SHEAD(s, 'Verify wallet ownership');
  add(s, await P('Sign a free message to prove you control this wallet. It’s not a transaction and can’t move funds.', 'Body/S', 'text/secondary'));
  { const wr = await WALLETROW({ mark: '27:15878', name: 'Trust Wallet · WalletConnect' }); wr.children[1].appendChild(wr.children[2]); add(s, [wr, 'FILL']); }
  { const mb = await MSGBOX(); const it = mb.findOne(n => n.type === 'TEXT' && n.characters === 'Issued by globalpool.example'); if (it) it.characters = 'globalpool.example'; add(s, [mb, 'FILL']); }
  add(s, [ROW('Guarantees', [await CHIP('check', 'No transaction'), await CHIP('check', 'No gas · 0.00')], { gap: 8, wrap: true, cgap: 8 }), 'FILL']);
  add(s, [ROW('Waiting', [await IC('spinner', 18, 'icon/brand'), COL('T', [await T('Waiting for your signature…', 'Body/S Strong', 'text/primary'), await T('Expires at 16:52 UTC · 09:12 left', 'Caption', 'text/tertiary')], { gap: 2 })], { gap: 10, p: [10, 12, 10, 12], fill: 'surface/raised', stroke: 'border/subtle', r: 10 }), 'FILL']);
  await STICKY(s, [await BTN('Primary', 'Open Trust Wallet to sign', { size: 'L', lead: 'external-link' }), await BTN('Ghost', 'Cancel', { size: 'L' })]);
} else {
  await SHEAD(s, 'Request expired');
  add(s, ROW('Head', [await TILE('clock', 'warning', 40), COL('T', [await T('This message has expired', 'Body/S Strong', 'text/primary'), await T('Issued 16:42 UTC · expired 16:52 UTC', 'Caption', 'text/tertiary')], { gap: 2 })], { gap: 12 }));
  add(s, await P('Each sign-in message works once and expires after 10 minutes, so an old signature can’t be reused by anyone else.', 'Body/S', 'text/secondary'));
  add(s, [await MSGBOX({ expired: true, label: 'Expired message' }), 'FILL']);
  add(s, [await ALERT('warning', 'Old request still in your wallet?', 'Reject it there. We only accept the newest nonce.'), 'FILL']);
  await STICKY(s, [await BTN('Primary', 'Get a new message', { size: 'L', lead: 'refresh' }), await BTN('Ghost', 'Cancel', { size: 'L' })]);
}
MPLACE(fr, db, bg, s);
OUT.push(await FINISH(sec, fr, X, { mobile: true })); }
