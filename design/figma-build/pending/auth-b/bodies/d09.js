for (const MODE of (typeof D09 !== 'undefined' ? D09 : ['List', 'WalletConnect QR', 'Connecting'])) { const { sec, fr, db, X } = await START('AUTH-09 Connect Wallet / 1440 / ' + MODE, 5);
const bg = await LOBBYBG(fr, db, { top: MODE === 'Wrong network' ? 'Member wrong network' : 'Member', label: 'member lobby behind Connect wallet modal' });
const m = await MODAL(fr, bg, '27:16569', { State: MODE });
if (MODE === 'Connecting') { const pop = await EXTPOPUP({ title: 'Connection request', no: 'Cancel', yes: 'Connect' }); await FLOAT(fr, pop, 1440 - 340 - 24, db.height + 8); }
if (MODE === 'Success') { const t = await TOAST('Success', 'Wallet connected', 'Browser wallet 0x12ab…9f3C on BNB Chain. Verify ownership before your first withdrawal.'); const ta = t.findOne(x => x.type === 'TEXT' && /^View receipt/.test(x.characters)); if (ta) ta.characters = 'Manage wallets'; await FLOAT(fr, t, 1440 - t.width - 24, db.height + 80); }
OUT.push(await FINISH(sec, fr, X)); }
