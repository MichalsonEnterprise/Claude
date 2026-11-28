const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const NAME = '[ADM-B3] Contract Addresses / 1440 / Default';
const { f, c } = await SHELL(NAME, POS('B-1440', 'B3'), 'B', 2, 'SI', 'Search label or address…');
await HEAD(c, ['Admin', 'Blockchain', 'Contract addresses'], 'Contract addresses', 'The canonical address book for contracts and platform wallets — the same list players see on the Fairness and Networks pages. An address only changes through a signed change request (four-eyes + 48 h public notice). Bytecode and ownership are re-verified every hour.', { badges: [await DEMO('M')], actions: [await BTN('Secondary', 'Export address book', { size: 'S', lead: 'download' }), await BTN('Primary', 'Request address change', { size: 'S', lead: 'edit' })] });
await TABS(c, [['All', '14'], ['Arbitrum', '6'], ['BNB Chain', '2'], ['Polygon', '2'], ['Ethereum', '2'], ['Solana', '2']], 'All');
const A = [
  ['GlobalPool v1.3.0', 'Rounds, entries, prize split', 'Contract', 'Arbitrum', '0x4b1d…77ce', 'Bytecode matches audit'],
  ['VRFConsumer v1.1.2', 'Chainlink VRF requests', 'Contract', 'Arbitrum', '0x9e07…2a5f', 'Bytecode matches audit'],
  ['Treasury v1.0.4', 'Pool + fee custody', 'Contract', 'Arbitrum', '0xd3c8…10b9', 'Bytecode matches audit'],
  ['Timelock', '48 h delay for upgrades', 'Contract', 'Arbitrum', '0x1a6f…c3d0', 'Owner = multisig'],
  ['Multisig 3-of-5', '5 signers · threshold 3', 'Multisig', 'Arbitrum', '0x8c22…5e7b', '5 of 5 signers known'],
  ['Hot wallet · Arbitrum', 'Withdrawals', 'Hot wallet', 'Arbitrum', '0x3e94…b21c', 'Balance within limits'],
  ['Deposit router · BNB Chain', 'Per-user deposit addresses', 'Router', 'BNB Chain', '0x2c81…f04a', 'Bytecode matches audit'],
  ['Hot wallet · BNB Chain', 'Withdrawals', 'Hot wallet', 'BNB Chain', '0x6a90…11de', 'Balance within limits'],
  ['Deposit router · Polygon', 'Per-user deposit addresses', 'Router', 'Polygon', '0x8e3b…a7c2', 'Bytecode matches audit'],
  ['Hot wallet · Polygon', 'Withdrawals', 'Hot wallet', 'Polygon', '0x0d57…e6f3', 'Balance within limits'],
  ['Deposit router · Ethereum', 'Per-user deposit addresses', 'Router', 'Ethereum', '0x55f1…3b9e', 'Bytecode matches audit'],
  ['Hot wallet · Ethereum', 'Rotation scheduled · AC-0017', 'Hot wallet', 'Ethereum', '0xa4c0…7d21', 'Change in notice period'],
  ['Deposit program · Solana', 'Per-user deposit accounts', 'Program', 'Solana', '9xQe…Lm4T', 'Program hash matches'],
  ['Hot wallet · Solana', 'Withdrawals', 'Hot wallet', 'Solana', '4tRk…Wp8N', 'Balance within limits']];
const rows = []; for (const a of A) { const warn = a[5].startsWith('Change'); rows.push([{ T: 'Text', p: a[0], s: a[1] }, { T: 'Text', p: a[2], c: 'text/secondary' }, { T: 'Network', p: a[3] }, { T: 'Address', p: a[4], ch: a[3] }, C(await IC(warn ? 'clock' : 'shield-check', 16, warn ? 'status/warning' : 'status/success'), await T(a[5], 'Body/S', warn ? 'text/warning' : 'text/secondary')), { T: 'Text', p: '18:00 UTC', c: 'text/tertiary' }, { T: 'Actions' }]); }
await TABLE(c, 'Address book', [{ k: 'label', l: 'Label', w: 'FILL' }, { k: 'type', l: 'Type', w: 112 }, { k: 'net', l: 'Network', w: 152 }, { k: 'addr', l: 'Address', w: 208 }, { k: 'ver', l: 'Hourly verification', w: 212 }, { k: 'checked', l: 'Checked', w: 100 }, { k: 'act', l: '', w: 44 }], rows, { sel: [11], hideL: ['type', 'checked'], head: await TH('Address book', { meta: 'Last check 18:00 UTC · 14 of 14 verified · next 19:00 UTC' }) });
const rq = CARD('Change request AC-0017', { stroke: 'border/brand', gap: 12 }); await CHEAD(rq, 'AC-0017 · Rotate Ethereum hot wallet', { icon: 'key', badges: [await ST('Approved', 'Approved — notice period')] });
const fr = AL('HORIZONTAL', { name: 'From → to', gap: 12, align: 'CENTER' }); const a1 = await I('9:418', { Size: 'M', State: 'Default' }, { Address: '0xa4c0…7d21', 'Show DEMO': false }); const a2 = await I('9:418', { Size: 'M', State: 'Default' }, { Address: '0x6f18…90cd', 'Show DEMO': true }); for (const ch of [a1, a2]) { const m = ch.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Chain/')); if (m) m.swapComponent(await figma.getNodeByIdAsync(CHAINS['Ethereum'])); } add(fr, a1, await IC('arrow-right', 18, 'icon/muted'), a2); add(rq, fr);
await KV(rq, 'Reason', 'Scheduled quarterly key rotation', { line: 1 }); await KV(rq, 'Requested by', 'S. Iyer · 26 Nov 2026, 10:02 UTC', { line: 1 }); await KV(rq, 'Approved by', 'A. Marin (Finance) · 26 Nov 2026, 14:30 UTC', { line: 1 }); await KV(rq, 'Takes effect', '28 Nov 2026, 10:02 UTC · after 48 h notice', { color: 'text/warning' });
await NOTE(rq, 'info', 'info', 'Until then withdrawals keep using the current wallet. The new address is already published on the Networks page with its effective time so players and auditors can check it.', { w: 420 });
add(rq, await BTN('Secondary', 'Cancel request', { size: 'S', lead: 'x' }));
const vl = CARD('Verification log', { gap: 8 }); await CHEAD(vl, 'Verification log', { icon: 'activity' });
for (const [t, txt, ok] of [['18:00', '14 of 14 verified · bytecode, owner and balances', 1], ['17:00', '14 of 14 verified', 1], ['16:00', '14 of 14 verified', 1], ['15:00', '13 of 14 — Polygon RPC timeout, re-checked 15:04 ✓', 0]]) { const r = AL('HORIZONTAL', { name: t, gap: 12, p: [8, 0, 8, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, await T(t, 'Mono/S', 'text/tertiary'), await IC(ok ? 'check-circle' : 'alert-triangle', 16, ok ? 'status/success' : 'status/warning')); await WT(r, txt, 'Body/S', 'text/secondary', 300); add(vl, [r, 'FILL']); }
await ROW(c, [rq, vl], { gap: 24 });
return await DONE(f);
