// ERR-02 Error matrix board — part B (fix X-02 toast labels + rows 5–8) (page 12)
const page = figma.root.children.find(p => p.name === '12 — Empty & Error States'); await figma.setCurrentPageAsync(page);
const sec = section('ERR-01/02/03 Empty, error & loading matrices', 0, 0);
const [B, body] = await board(sec, '[ERR-02] Error matrix / 1440 / Board', 120, nextY(sec));
// fix: X-02 toast — first run wrote into the nested DEMO badge
const cx02 = body.findOne(n => n.name.startsWith('Cell X-02'));
if (cx02) { const ts = cx02.findOne(n => n.name === 'Preview').children[0]; if (await setByChars(ts, 'Try again', 'DEMO')) { await setByChars(ts, 'System status', 'Try again'); await setByChars(ts, 'Contact support', 'System status'); } }

const m422 = body.findOne(n => n.type === 'TEXT' && n.characters === 'Field messages inline (X-04) + “2 fields need attention” summary'); if (m422) { await loadFor(m422); m422.characters = 'Field messages inline (X-06) + “2 fields need attention” summary'; }

// ---------- Row 5: chain congestion (full) ----------
const al = await I(IDS.alert, { Type: 'Warning', Layout: 'Inline' });
const cp = await I(IDS.confProg, { State: 'Delayed' });
const pills = HB('Network status', { gap: 8, align: 'CENTER' }); add(pills, await T('Network status', 'Label/S', 'text/tertiary'));
for (const [ch, st] of [['Arbitrum', 'Operational'], ['BNB Chain', 'Operational'], ['Ethereum', 'Degraded'], ['Polygon', 'Operational'], ['Solana', 'Operational']]) add(pills, await I(IDS.netPill, { Chain: ch, Status: st }, { 'Show status label': st !== 'Operational', 'Show chevron': false }));
const left = VB('Banner + confirmations', 720, { gap: 16 }); add(left, al, cp, pills);
const fe = await I(IDS.feeEst, { State: 'Congested' });
const wrap = HB('Congestion stage', { gap: 16 }); add(wrap, left, fe);
const x07 = await cell({ id: 'X-07', mod: 'Chain · Congestion', title: 'Ethereum congested — slower and more expensive', full: true, kind: 'Alert/Banner · Fee Estimator', stage: [wrap],
  trigger: 'Chain-status feed marks Ethereum Degraded: base fee above threshold or blocks slower than 2× normal (DEMO, since 18:30 UTC).',
  copy: '“Ethereum network is congested” · Fee estimate “High · 2.40 USDT · ~8–15 min” · “Delayed — Ethereum congested · est. 9 min”',
  recovery: 'Switch to Arbitrum (0.08 USDT) or continue with the higher fee — the player chooses; nothing is switched silently. Deposits already in flight need no action.',
  dev: 'Banner shows on wallet, deposit and withdraw pages only while degraded; pills update over the status WebSocket. Fees come from the live estimator, never hard-coded.' });
await row(body, 'Row 5 — Chain congestion', [x07]);

// ---------- Row 6: deposit reverted + withdrawal failed ----------
const tl1 = await I(IDS.timeline, { State: 'Failed' });
const x09 = await cell({ id: 'X-08', mod: 'Tx failed · Deposit', title: 'Deposit reverted on-chain — not credited', kind: 'Tx/Status Timeline · Failed', stage: [tl1],
  trigger: 'Receipt status 0 (reverted) for a tracked incoming deposit — alternative outcome of DP-77412 (DEMO).',
  copy: '“Failed — Reverted on-chain at block 21,384,899…” · “Not credited — Nothing was added to your balance.”',
  recovery: 'View on explorer · Contact support. No “retry” button: the player’s own wallet sent it, and the deposit address stays valid for a new transfer.',
  dev: 'Never leave a reverted tx in Pending. The row stays in history as Failed (icon + label) with the block number.' });

const tl2 = await I(IDS.timeline, { State: 'Failed' });
await setT(tl2, 'Deposit DP-77412', 'Withdrawal WD-20931'); await setT(tl2, '1,000.00 USDT · Ethereum · 27 Nov 2026', '1,500.00 USDT · Arbitrum · 27 Nov 2026');
const ST = [['Submitted', '18:44:02 UTC', 'Risk check passed · confirmed with 2FA'], ['Failed to broadcast', '18:59:10 UTC', 'Timed out 3 times between 18:49 and 18:59 UTC while Arbitrum was degraded.'], ['Returned to Available', '18:59:40 UTC', '1,500.00 USDT is back in Available (now 10,715.30 USDT). No network fee was charged.']];
for (let i = 0; i < 3; i++) { await setT(tl2, 'Step title', ST[i][0], i); await setT(tl2, 'Timestamp', ST[i][1], i); await setT(tl2, 'Detail', ST[i][2], i); }
const hl = tl2.findAll(n => n.type === 'TEXT' && n.name === 'Transaction hash')[0]; if (hl) hl.visible = false;
const hx = tl2.findAll(n => n.type === 'TEXT' && n.name === 'Hash')[0]; if (hx) { let p = hx.parent; while (p && p.type !== 'INSTANCE') p = p.parent; if (p && p !== tl2) p.visible = false; }
const wa = HB('Actions', { gap: 8 }); add(wa, await BTN('Primary', 'Withdraw again', { size: 'S', lead: 'withdraw' }), await BTN('Ghost', 'View balance', { size: 'S' }));
const x10 = await cell({ id: 'X-09', mod: 'Tx failed · Withdrawal', title: 'Withdrawal failed to broadcast — funds returned', kind: 'Tx/Status Timeline · Failed', stage: [tl2, wa],
  trigger: 'The broadcaster gives up after 3 timeouts — alternative outcome of WD-20931 (DEMO). Funds move from Locked back to Available.',
  copy: '“Failed to broadcast” · “1,500.00 USDT is back in Available (now 10,715.30 USDT). No network fee was charged.”',
  recovery: 'Withdraw again pre-fills the same amount and the same whitelisted address as a new request (new 2FA). Contact support quotes WD-20931.',
  dev: 'Locked 1,850.00 → 350.00; Available 9,215.30 → 10,715.30. A notification and an email go out; the toast in X-12 links here.' });
await row(body, 'Row 6 — Tx failed', [x09, x10]);

// ---------- Row 7: dropped + replaced ----------
const pd = panel('Dropped tx', { gap: 16, p: 24 });
const dt = HB('Top', { gap: 12, align: 'CENTER' }); const dtv = VB('Title', 300, { gap: 2 });
add(dtv, [await T('Transaction no longer found', 'Heading/H5', 'text/primary', { w: 300 }), 'FILL'], await T('Deposit · 250.00 USDT · Polygon', 'Caption', 'text/tertiary'));
add(dt, await iconTile('alert-triangle', 'warning', 40), dtv); dtv.layoutGrow = 1; add(dt, await badge('Expired', 'Dropped'));
const hs1 = await I(IDS.hash, { State: 'Default' }, { Hash: '0x2c8e…71fa' });
add(pd, [dt, 'FILL'], hs1, [await T('We can no longer see this transaction on Polygon. It was most likely dropped because its network fee was too low. No USDT left your wallet and nothing was credited.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
add(pd, [await kv('Last seen in the mempool', '27 Nov 2026, 17:58 UTC', { vs: 'Body/S Strong' }), 'FILL'], [await kv('Credited to your balance', '0.00 USDT', { demo: true }), 'FILL']);
const da = HB('Actions', { gap: 8 }); add(da, await BTN('Primary', 'Show deposit address', { size: 'S', lead: 'qr-code' }), await BTN('Ghost', 'How network fees work', { size: 'S' })); add(pd, da);
const x11 = await cell({ id: 'X-10', mod: 'Tx dropped', title: 'Deposit dropped from the mempool', kind: 'Inline panel', stage: [[pd, 'FILL']],
  trigger: 'A tracked deposit hash is missing from the mempool for 30 min without being mined (evicted, or its nonce reused).',
  copy: '“Transaction no longer found” · “No USDT left your wallet and nothing was credited.”',
  recovery: 'Show deposit address (same address, still valid) to send again · How network fees work. If the tx reappears and confirms, it is credited automatically.',
  dev: 'Keep watching the hash for 24 h; label “Dropped” (icon + text). Platform-sent withdrawals are re-broadcast automatically with a higher fee, at no cost to the player.' });

const pr = panel('Replaced tx', { gap: 16, p: 24 });
const rtp = HB('Top', { gap: 12, align: 'CENTER' }); const rtv = VB('Title', 300, { gap: 2 });
add(rtv, [await T('Transaction replaced — now tracking the new one', 'Heading/H5', 'text/primary', { w: 300 }), 'FILL'], await T('DP-77412 · 1,000.00 USDT · Ethereum', 'Caption', 'text/tertiary'));
add(rtp, await iconTile('swap', 'info', 40), rtv); rtv.layoutGrow = 1; add(rtp, await badge('Processing', 'Confirming'));
const old = HB('Original hash', { gap: 12, p: [8, 12], r: 10, stroke: 'border/default', align: 'CENTER' });
const oh = await T('0x5e1f…c0a8', 'Mono/S', 'text/tertiary'); oh.textDecoration = 'STRIKETHROUGH'; const os = spacer();
add(old, await T('Original', 'Label/S', 'text/tertiary'), oh, os); os.layoutGrow = 1; add(old, await badge('Neutral', 'Replaced'));
const hs2 = await I(IDS.hash, { State: 'Default' }, { Hash: '0x9b2d…14e7' });
const cp2 = await I(IDS.confProg, { State: 'Confirming' }); await setT(cp2, 'Count', '3/12'); await setT(cp2, 'Title', '3 / 12 confirmations'); await setT(cp2, 'Estimate', 'Replacement confirming · est. 6 min');
add(pr, [rtp, 'FILL'], [old, 'FILL'], hs2, [cp2, 'FILL'], [await T('You sped this deposit up in your wallet, so it has a new transaction hash. We switched to the new one automatically — nothing to do.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
const x12 = await cell({ id: 'X-11', mod: 'Tx replaced', title: 'Deposit replaced — speed-up in the wallet', kind: 'Inline panel', stage: [[pr, 'FILL']],
  trigger: 'The same sender + nonce is mined under a different hash (wallet speed-up or cancel) — alternative outcome of DP-77412 (DEMO).',
  copy: '“Transaction replaced — now tracking the new one” · “We switched to the new one automatically — nothing to do.”',
  recovery: 'None needed. If the replacement was a cancel (0 USDT moved), the deposit shows Cancelled · nothing credited, with a link to the deposit address.',
  dev: 'Show both hashes; credit only when the replacement reaches 12 / 12. Never double-credit: dedupe by sender + nonce.' });
await row(body, 'Row 7 — Dropped · Replaced', [x11, x12]);

// ---------- Row 8: toasts + game ----------
const ta = await I(IDS.toast, { Type: 'Error' });
const tb2 = await I(IDS.toast, { Type: 'Error' }); await setT(tb2, 'Title', 'Withdrawal WD-20931 failed'); await setT(tb2, 'Body', '1,500.00 USDT is back in Available. No network fee was charged.');
const tc = await I(IDS.toast, { Type: 'Warning' }); await setT(tc, 'Title', 'Live updates paused — reconnecting'); await setT(tc, 'Body', 'Pool value and countdown may lag for a moment. Last update 18:44:10 UTC.');
const x13 = await cell({ id: 'X-12', mod: 'Toasts', title: 'Background failures — toast stack', kind: 'Toast · Error / Warning', stage: [ta, tb2, tc], sg: 12,
  trigger: 'Background events: AML decisions, withdrawal broadcast results, WebSocket status changes and failed optimistic updates.',
  copy: '“Withdrawal rejected” (WD-20850, sanctions screening) · “Withdrawal WD-20931 failed” · “Live updates paused — reconnecting”',
  recovery: 'Each toast links to its detail (drawer or tracker). Error toasts stay until dismissed; max 3 stacked top-right (bottom on mobile).',
  dev: 'Never use toasts for form validation or for win/loss hype. Screen readers: role=alert for errors, role=status for warnings.' });

const pg = panel('Bet not placed', { gap: 16, p: 24 });
const gt = HB('Top', { gap: 12, align: 'CENTER' }); const gtv = VB('Title', 300, { gap: 2 });
add(gtv, await T('Bet not placed', 'Heading/H5', 'text/primary'), await T('Orbit Rush · round CR-55103 · 10.00 USDT · auto cash-out 2.00×', 'Caption', 'text/tertiary'));
add(gt, await iconTile('wifi-off', 'danger', 40), gtv); gtv.layoutGrow = 1; add(gt, await DEMO('S'));
add(pg, [gt, 'FILL'], [await T('We lost the connection before round CR-55103 started, so your 10.00 USDT bet wasn’t placed. Your balance is unchanged.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
add(pg, [await kv('Available', '9,215.30 USDT', { demo: true }), 'FILL'], [await kv('Reconnecting', 'attempt 3 of 15', { vs: 'Mono/S', vc: 'text/secondary' }), 'FILL']);
const gnote = HB('Note', { gap: 8, p: [8, 12], r: 10, fill: 'status/info-tint' }); const gnt = await T('Bets that were already accepted keep running: an armed auto cash-out still triggers on the server. Manual cash-out is unavailable while offline.', 'Caption', 'text/secondary', { w: 440 });
add(gnote, await IC('info', 16, 'status/info'), gnt); gnt.layoutGrow = 1; add(pg, [gnote, 'FILL']);
const ga = HB('Actions', { gap: 8 }); add(ga, await BTN('Primary', 'Reconnect', { lead: 'refresh' }), await BTN('Ghost', 'Bet history', { lead: 'history' })); add(pg, ga);
const x14 = await cell({ id: 'X-13', mod: 'Games · Connection', title: 'Game action lost — bet not placed', kind: 'Inline panel', stage: [[pg, 'FILL']],
  trigger: 'The game socket drops before the server acknowledges the bet (no bet ID returned) — Orbit Rush and other live Originals.',
  copy: '“Bet not placed” · “…your 10.00 USDT bet wasn’t placed. Your balance is unchanged.”',
  recovery: 'Reconnect (auto-retries every 2 s for 30 s) · Bet history. The bet panel keeps 10.00 USDT and 2.00× so the player re-places it deliberately — never automatically.',
  dev: 'Accepted bets (with a bet ID) are never shown as “not placed”: they resolve server-side and appear in history after reconnect.' });
await row(body, 'Row 8 — Toasts · Game', [x13, x14]);

restack(sec); fitSection(sec);
for (const r of body.children.filter(n => /^Row [5678]/.test(n.name))) await r.screenshot({ scale: 0.55 });
const e1 = sec.findChild(n => n.name.startsWith('[ERR-01]')); const r8 = e1.findOne(n => n.name === 'Row 8 — Admin queue'); await r8.screenshot({ scale: 0.5 });
return { board: B.id, size: [B.width, B.height], rows: body.children.map(r => ({ id: r.id, name: r.name, h: Math.round(r.height) })), x02fixed: !!cx02 };
