const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const LIST = [["[ADM-C4] Sanctions Screening / 1440 / Default", "C4"], ["[ADM-C5] Restricted Countries / 1440 / Default", "C5"], ["[ADM-C6] Self-Exclusion / 1440 / Default", "C6"], ["[ADM-C7] Responsible Gaming Reports / 1440 / Default", "C7"]];
const made = [];
for (const [srcName, key] of LIST) {
  const src = sec.children.find(n => n.name === srcName); if (!src) { MISS.push('missing ' + srcName); continue; }
  const nm = src.name.replace('/ 1440 /', '/ 1280 /'); if (sec.children.find(n => n.name === nm)) { MISS.push('exists ' + nm); continue; }
  const band = src.name.startsWith('[ADM-C') ? 'C-1280' : 'B-1280';
  const p = POS(band, key); const f = src.clone(); sec.appendChild(f); f.name = nm; f.x = p.x; f.y = p.y;
  f.resize(1280, f.height); f.primaryAxisSizingMode = 'AUTO';
  const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === 'Laptop 1280'); if (bm) f.setExplicitVariableModeForCollection(bc, bm.modeId);
  for (const t of f.findAll(n => n.name.startsWith('Table — ') && n.name.includes('{hideL:'))) { const ks = t.name.match(/\{hideL:([^}]*)\}/)[1].split(','); for (const n of t.findAll(x => ks.some(k => x.name === 'Col/' + k || x.name === 'H/' + k))) n.visible = false; }
  for (const n of f.findAll(x => x.name.includes('[hideL]'))) n.visible = false;
  made.push(f);
}
const NAME = '[ADM-B1] Supported Networks / 1440 / Default';
const { f, c } = await SHELL(NAME, POS('B-1440', 'B1'), 'B', 0, 'SI', 'Search network, token, contract…');
await HEAD(c, ['Admin', 'Blockchain', 'Supported networks'], 'Supported networks', 'Networks and token standards accepted for USDT deposits and withdrawals. Any change needs a reason, 2FA and a second approver, takes effect after a 1-hour delay and is written to the audit log. Values are DEMO.', { badges: [await ST('Live', 'Live'), await DEMO('M')], actions: [await BTN('Secondary', 'Config history', { size: 'S', lead: 'history' }), await BTN('Primary', 'Propose change', { size: 'S', lead: 'plus' })] });
await NOTE(c, 'alert-triangle', 'warning', 'Average confirmation 4 min 12 s (normal 2 min 30 s) since 17:20 UTC — incident INC-0457. Players see a slower-network notice and the 2.40 USDT network fee before they confirm. Deposits and withdrawals stay enabled.', { title: 'Ethereum is congested', w: 760, actions: [await BTN('Ghost', 'Open incident', { size: 'S', trail: 'arrow-right' })] });
const st = CARD('Live status', { dir: 'HORIZONTAL', gap: 12, p: [14, 20, 14, 20], align: 'CENTER' }); add(c, [st, 'FILL']);
add(st, await T('Live status', 'Label/L', 'text/primary')); add(st, [SPC(), 'FILL']);
for (const [ch, s] of [['BNB Chain', 'Operational'], ['Polygon', 'Operational'], ['Arbitrum', 'Operational'], ['Ethereum', 'Degraded'], ['Solana', 'Operational']]) add(st, await PILL(ch, s));
add(st, await DEMO('S'));
async function onoff(on, lab) { return C(await IC(on ? 'check-circle' : 'pause-circle', 16, on ? 'status/success' : 'status/warning'), await T(lab || (on ? 'Enabled' : 'Paused'), 'Body/S', on ? 'text/secondary' : 'text/warning')); }
const N = [['BNB Chain', 'USDT · BEP-20', '15', '0.12', '64,820.40', 'Operational'], ['Polygon', 'USDT · PoS', '64', '0.02', '21,305.75', 'Operational'], ['Arbitrum', 'USDT · Arbitrum One', '20', '0.08', '118,940.10', 'Operational'], ['Ethereum', 'USDT · ERC-20', '12', '2.40', '39,610.00', 'Degraded'], ['Solana', 'USDT · SPL', '32 (finalized)', '0.01', '15,488.20', 'Operational']];
const rows = []; for (const n of N) rows.push([C(await PILL(n[0], n[5], false)), { T: 'Text', p: n[1], s: 'Token contract 0xFd08…Cbb9 · illustrative' }, await onoff(1), await onoff(1), CR(await T(n[2], 'Number/S', 'text/primary')), CR(await T(n[3], 'Number/S', n[0] === 'Ethereum' ? 'text/warning' : 'text/primary'), await T('USDT', 'Caption', 'text/tertiary')), { T: 'Amount', p: n[4] }, { T: 'Actions' }]);
await TABLE(c, 'Network configuration', [{ k: 'net', l: 'Network', w: 168 }, { k: 'token', l: 'Token standard', w: 'FILL' }, { k: 'dep', l: 'Deposits', w: 116 }, { k: 'wd', l: 'Withdrawals', w: 124 }, { k: 'conf', l: 'Confirmations', w: 128, r: 1 }, { k: 'fee', l: 'Network fee', w: 128, r: 1 }, { k: 'hot', l: 'Hot wallet', w: 168, r: 1 }, { k: 'act', l: '', w: 44 }], rows, { density: 'Comfortable', hideL: ['hot'], head: await TH('Network configuration · v31', { meta: 'Last change 21 Nov 2026 · S. Iyer + K. Osei' }) });
const lim = CARD('Limits & safeguards', { gap: 10 }); await CHEAD(lim, 'Limits & safeguards · all networks', { icon: 'shield-check' });
for (const [k, v] of [['Minimum deposit', '10.00 USDT'], ['Minimum withdrawal', '20.00 USDT'], ['Daily limit · KYC L2', '25,000.00 USDT'], ['Platform withdrawal fee', '0.00 USDT'], ['New-address cooldown', '24 h'], ['Address format check', 'Per chain · on'], ['Unsupported token sent', 'Held for recovery']]) await KV(lim, k, v, { line: 1 });
const pcard = CARD('Pending change CFG-0088', { stroke: 'border/brand', gap: 12 }); await CHEAD(pcard, 'CFG-0088 · Pause Solana deposits', { icon: 'pause-circle', badges: [await ST('Pending', 'Awaiting 2nd approver')] });
await KV(pcard, 'Window', '1 Dec 2026, 02:00–02:30 UTC'); await KV(pcard, 'Why', 'Validator upgrade · matches announcement AN-88'); await KV(pcard, 'Requested by', 'S. Iyer · 27 Nov 2026, 17:50 UTC'); await KV(pcard, 'Second approver', 'A. Marin (Finance) — pending');
await NOTE(pcard, 'info', 'info', 'Withdrawals on Solana continue. Players see “Deposits on Solana are paused until 02:30 UTC” with the other networks suggested.', { w: 380 });
add(pcard, await BTN('Secondary', 'View request', { size: 'S', trail: 'arrow-right' }));
await WT(pcard, 'You requested this change, so you can’t approve it.', 'Caption', 'text/tertiary', 380);
const hist = CARD('Recent changes', { gap: 8 }); await CHEAD(hist, 'Recent changes', { icon: 'history', demo: false });
for (const [v, d, t, who] of [['v31', '21 Nov 2026', 'Polygon confirmations 128 → 64', 'S. Iyer + K. Osei'], ['v30', '6 Nov 2026', 'Ethereum fee estimate source → provider B', 'S. Iyer + A. Marin'], ['v29', '22 Oct 2026', 'Solana finality: confirmed → finalized (32)', 'S. Iyer + K. Osei']]) { const r = AL('HORIZONTAL', { name: v, gap: 12, p: [8, 0, 8, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, await T(v, 'Mono/S', 'text/brand')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); await WT(tx, t, 'Body/S Strong', 'text/primary', 260); add(tx, await T(d + ' · ' + who, 'Caption', 'text/tertiary')); add(r, [tx, 'FILL']); add(hist, [r, 'FILL']); }
await ROW(c, [lim, pcard], { gap: 24 }); add(c, [hist, 'FILL']);
for (const m of made) await m.screenshot({ scale: 0.3 });
return await DONE(f, { laptop: made.map(m => [m.id, m.name, Math.round(m.height)]) });
