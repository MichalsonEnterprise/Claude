for (const MODE of (typeof M09 !== 'undefined' ? M09 : ['List', 'Wrong network', 'WalletConnect deep link'])) {
const { sec, fr, db, X } = await START('AUTH-09 Connect Wallet / 390 / ' + MODE, MODE === 'WalletConnect deep link' ? 6 : 5, { mobile: true });
const bg = await MBG(fr, { auth: 'Member', tab: 'Wallet' });
const s = await SHEET(MODE, { gap: 16 });
const seed = ROW('Seed phrase notice', [await IC('shield-check', 18, 'text/success'), COL('T', [await T('We never ask for your seed phrase', 'Body/S Strong', 'text/primary'), await P('Connecting a wallet never moves funds.', 'Caption', 'text/secondary')], { gap: 2 })], { gap: 10, align: 'MIN', p: [12, 14, 12, 14], fill: 'status/success-tint', stroke: 'status/success', r: 10 });
if (MODE === 'List') {
  await SHEAD(s, 'Connect a wallet');
  add(s, await P('Use a self-custody wallet to deposit, withdraw and verify ownership. Entries are always paid from your platform balance.', 'Body/S', 'text/secondary'));
  add(s, await T('CHOOSE A WALLET APP', 'Overline', 'text/tertiary'));
  const L = COL('Providers', [], { gap: 8 });
  for (const [n, m, id, tag, st] of [['WalletConnect', 'Opens a wallet app on this phone', '27:15874', 'Recommended'], ['Trust Wallet', 'Mobile app', '27:15878'], ['Coinbase Wallet', 'Mobile app', '27:15876'], ['Phantom (Solana)', 'Connects on Solana only', '27:15880', 'Solana'], ['Ledger via WalletConnect', 'Hardware wallet through the Ledger Live app', '27:15882', 'Hardware'], ['Browser wallet', 'Not detected — open this page in your wallet’s in-app browser', '27:15872', null, 'Disabled']]) add(L, [await PROVROW(n, m, id, { tag, state: st }), 'FILL']);
  add(s, [L, 'FILL']);
  add(s, [seed, 'FILL']);
  add(s, await P('By connecting you confirm you are 18+ and located in a permitted jurisdiction. Terms and Privacy Policy apply.', 'Caption', 'text/tertiary'));
} else if (MODE === 'Wrong network') {
  await SHEAD(s, 'Switch network');
  add(s, ROW('Head', [await TILE('alert-triangle', 'warning', 40), COL('T', [await T('Unsupported network', 'Body/S Strong', 'text/primary'), await T('Your wallet is on chain ID 10', 'Caption', 'text/tertiary')], { gap: 2 })], { gap: 12 }));
  add(s, await P('Deposits and withdrawals only work on the networks below. Switching is free and no funds move — your wallet will ask you to approve it.', 'Body/S', 'text/secondary'));
  const k = COL('Wallet', [], { gap: 0, p: [4, 14, 4, 14], fill: 'bg/secondary', stroke: 'border/subtle', r: 12 });
  add(k, [await KV('Wallet', '0x12ab…9f3C', { vs: 'Mono/S', demo: true }), 'FILL'], [await KV('Network', await RB('Restricted', 'Unsupported · chain ID 10'), { line: false }), 'FILL']);
  add(s, [k, 'FILL']);
  add(s, await T('SUPPORTED NETWORKS', 'Overline', 'text/tertiary'));
  const w = ROW('Networks', [], { gap: 8, wrap: true, cgap: 8 }); for (const ch of ['Arbitrum', 'BNB Chain', 'Polygon', 'Ethereum', 'Solana']) add(w, await I('9:377', { Chain: ch, Status: 'Operational' }, { 'Show status label': false, 'Show chevron': false })); add(s, [w, 'FILL']);
  add(s, [await NOTE('info', 'Solana is available through Phantom only. Ethereum is congested right now — network fees are higher (2.40 USDT per withdrawal).'), 'FILL']);
  await STICKY(s, [await BTN('Primary', 'Switch to Arbitrum', { size: 'L', lead: 'swap' }), await BTN('Ghost', 'Disconnect', { size: 'L', lead: 'logout' })]);
} else {
  await SHEAD(s, 'Approve in Trust Wallet', { back: true });
  add(s, [ROW('Hand-off', [await I('27:15878'), COL('T', [await T('Trust Wallet is open', 'Body/S Strong', 'text/primary'), await T('Waiting for you to tap Connect…', 'Caption', 'text/tertiary')], { gap: 2 }), [SPACER(), 'FILL'], await IC('spinner', 20, 'icon/brand')], { gap: 12, p: [14, 14, 14, 14], fill: 'surface/raised', stroke: 'border/subtle', r: 12 }), 'FILL']);
  const st = COL('Steps', [], { gap: 14 });
  add(st, [await NUMSTEP(1, 'done', 'Trust Wallet opened', 'We sent the request through WalletConnect'), 'FILL'], [await NUMSTEP(2, 'now', 'Tap Connect in Trust Wallet', 'It only shares your public address'), 'FILL'], [await NUMSTEP(3, 'next', 'Come back to this browser', 'We’ll confirm the connection here'), 'FILL']);
  add(s, [st, 'FILL']);
  add(s, [ROW('Expiry', [await IC('clock', 16, 'icon/muted'), await T('Connection link expires in 04:52', 'Caption', 'text/secondary'), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 8 }), 'FILL']);
  add(s, [seed, 'FILL']);
  await STICKY(s, [await BTN('Secondary', 'Open Trust Wallet again', { size: 'L', lead: 'external-link' }), await BTN('Ghost', 'Copy connection link', { size: 'L', lead: 'copy' })]);
}
MPLACE(fr, db, bg, s);
OUT.push(await FINISH(sec, fr, X, { mobile: true })); }
