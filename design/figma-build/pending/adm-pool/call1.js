await figma.setCurrentPageAsync(figma.root.children.find(p => p.name === '09 — Admin Panel'));
const AF = (async () => {}).constructor; const { VAR, __COLS, paint, fill, stroke, strokeSides, bnum, gap, pad, radius, AL, add, T, fx, rect, I, tint, screen, fitSection, nextX, ICONS, CHAINS, IC, CHAIN, DEMO, DEMOBAR, BTN, BADGE, section, sec, LY, COLX, lf, setT, sp, row, col, panel, W, ph, SB, stat, kv, check, step, pipeline, meter, segbar, chip, bars, cell, table, tfoot, shell, pageHead, subnav, immut, kpi, kpiRow, split, overlay, laptop } = await new AF('figma', (await figma.getNodeByIdAsync('78:57471')).characters)(figma);
const OUT = []; let P10ID, P10B, P10C;
{ for (const id of ['80:59955', '80:61181']) { const f = await figma.getNodeByIdAsync(id); for (const t of f.findAll(n => n.type === 'TEXT' && n.characters === '2.00% each')) { await lf(t); t.characters = '2.00%'; } } }
{
const NAME = '[ADM-P9] Refund Status / 1440 / Default';
const { f, c } = await shell(NAME, COLX(8), 160);
await pageHead(c, 'Refunds', 'Refund status — round #1,245', 'Cancelled rounds refund every entry to the account that bought it (RefundOnCancel — 10.00 USDT per entry, to the entrant only). Players claim in the app; after the 7-day claim window the contract can push the remainder. Amounts and recipients cannot be edited.', [await BTN('Secondary', 'Export CSV', { size: 'S', lead: 'download' })], await SB('Expired', 'Cancelled'));
await subnav(c, 'Refunds');
await kpiRow(c, [
  await kpi('Flat', 'Refund obligation', '41,200.00', 'USDT', '4,120 entries', '10.00 USDT per entry', '412 accounts'),
  await kpi('Up', 'Refunded (claimed)', '38,900.00', 'USDT', '94.4%', '3,890 entries · RefundClaimed', '393 accounts'),
  await kpi('Flat', 'Outstanding', '2,300.00', 'USDT', '19 accounts', 'Shown to players as Owed', '230 entries'),
  await kpi('Flat', 'Fees released', '206.00', 'USDT', '4,120 × 0.05', 'Back to Available at cancellation', 'not charged')
]);
const why = panel('Why it was cancelled');
add(why, await ph('Why it was cancelled', { icon: 'alert-triangle', ic: 'status/warning' }));
add(why, await I('23:8618', { State: 'Not met' }));
await W('Round #1,245 closed below both minimums (412 / 500 participants · 41,200.00 / 50,000.00 USDT). The contract emitted RoundCancelled in the same block, requested no randomness and opened refunds. No admin decision was involved.', 'Body/S', 'text/secondary', why, 520);
const prg = col({ gap: 6, name: 'Progress' }); const pr = row({ gap: 8 }); add(pr, await T('Refunded', 'Label/M', 'text/primary')); add(pr, [sp(), 'FILL']); add(pr, await T('38,900.00 / 41,200.00 USDT · 94.4%', 'Number/S', 'text/secondary')); add(prg, [pr, 'FILL'], [meter(0.944, 'status/success', 8, 520), 'FILL']); add(why, [prg, 'FILL']);
const op = panel('Contract-defined operations', { stroke: 'border/brand' });
add(op, await ph('Contract-defined operations', { icon: 'rotate-ccw', ic: 'icon/brand', demo: false }));
const o1 = AL('VERTICAL', { name: 'Reminder', gap: 8, p: 14, fill: 'surface/raised', r: 10 }); add(o1, await T('Remind unclaimed players', 'Label/L', 'text/primary')); await W('In-app + email to the 19 players with unclaimed refunds. Max once per 48 h · last sent 26 Nov 2026, 09:00 UTC.', 'Caption', 'text/tertiary', o1, 280); add(o1, [await BTN('Secondary', 'Send reminder', { size: 'M', lead: 'mail' }), 'FILL']); add(op, [o1, 'FILL']);
const o2 = AL('VERTICAL', { name: 'Push', gap: 8, p: 14, fill: 'surface/raised', r: 10 }); add(o2, await T('Push remaining refunds', 'Label/L', 'text/primary')); await W('Calls GlobalPool.refundUnclaimed(1245) after the claim window closes on 1 Dec 2026, 20:00 UTC. The contract sends 10.00 USDT per entry to each original entrant — there is no amount or recipient field.', 'Caption', 'text/tertiary', o2, 280); add(o2, [await BTN('Primary', 'Available from 1 Dec, 20:00 UTC', { size: 'M', state: 'Disabled', lead: 'lock' }), 'FILL']); add(op, [o2, 'FILL']);
await W('Both actions need 2FA and are written to the audit log. Manual or partial refunds do not exist.', 'Caption', 'text/tertiary', op, 300);
split(c, why, op, 360);
const B = [['24 Nov 2026', 'Player claims', '238', '2,402', '24,020.00', 'Confirmed', 'Refunded'], ['25 Nov 2026', 'Player claims', '104', '1,031', '10,310.00', 'Confirmed', 'Refunded'], ['26 Nov 2026', 'Player claims', '39', '362', '3,620.00', 'Confirmed', 'Refunded'], ['27 Nov 2026', 'Player claims', '12', '95', '950.00', 'Confirmed', 'Refunded'], ['Unclaimed', 'Claim window until 1 Dec 2026, 20:00 UTC', '19', '230', '2,300.00', 'Pending', 'Claimable']];
const bp = panel('Refund ledger', { gap: 0, p: 0 });
const bh = await ph('Claims by day', { icon: 'receipt' }); pad(bh, 16, 20, 16, 20); add(bp, [bh, 'FILL']);
const btb = await table('Refund claims', [{ h: 'Day', w: 160 }, { h: 'Method', w: 260, fill: true }, { h: 'Accounts', w: 110, a: 'Right' }, { h: 'Entries', w: 110, a: 'Right', tab: false }, { h: 'Amount', w: 170, a: 'Right' }, { h: 'Status', w: 140 }], B.map(b => [{ p: b[0] }, { p: b[1] }, { t: 'Number', v: b[2] }, { t: 'Number', v: b[3] }, { t: 'Amount', v: b[4] }, { t: 'Status', st: b[5], l: b[6] }]), { foot: await tfoot('Σ 412 accounts · 4,120 entries · 41,200.00 USDT · RefundClaimed events on Arbitrum') });
btb.strokes = []; radius(btb, 0); add(bp, [btb, 'FILL']);
add(c, [bp, 'FILL']);
const F7 = await figma.getNodeByIdAsync('34:398768');
const hs = F7 ? F7.findAll(n => n.type === 'TEXT' && /^@[a-z0-9._]+$/i.test(n.characters)).map(t => t.characters) : [];
const HS = hs.length >= 6 ? hs.slice(0, 6) : ['@nova.k', '@kestrel', '@zephyr21', '@sable', '@pixelfox', '@juno88'];
const EN = [30, 50, 40, 25, 20, 10];
const opn = panel('Outstanding', { gap: 0, p: 0 });
const oh = await ph('Unclaimed refunds — largest 6 of 19', { icon: 'coins', ic: 'icon/gold' }); pad(oh, 16, 20, 16, 20); add(opn, [oh, 'FILL']);
const otb = await table('Outstanding', [{ h: 'Account', w: 200, fill: true }, { h: 'Entries', w: 90, a: 'Right' }, { h: 'Owed', w: 150, a: 'Right' }, { h: 'Status', w: 140 }], HS.map((h, i) => [h, EN[i]]).sort((x, y) => y[1] - x[1]).map(([h, e]) => [{ t: 'User', h, demo: true }, { t: 'Number', v: String(e) }, { t: 'Amount', v: (e * 10).toFixed(2) }, { t: 'Status', st: 'Pending', l: 'Claimable' }]), { foot: await tfoot('+ 13 more · 55 entries · 550.00 USDT') });
otb.strokes = []; radius(otb, 0); add(opn, [otb, 'FILL']);
const rl = panel('Refund rules', { fill: 'surface/raised' });
add(rl, await ph('Refund rules (contract)', { icon: 'contract', demo: false }));
for (const t of ['Cancelled when the round closes below 500 participants or 50,000.00 USDT pool', '10.00 USDT back per entry — to the entrant only, never to another address', 'Platform fee (0.05 per entry) released at cancellation', 'Unclaimed after 7 days: pushed by refundUnclaimed()', 'No admin can change amounts, recipients or timing']) { const r = row({ gap: 8, align: 'MIN' }); add(r, await IC('check', 16, 'icon/brand')); await W(t, 'Body/S', 'text/secondary', r, 280); add(rl, [r, 'FILL']); }
split(c, opn, rl, 360);
const lap = await laptop(f, LY); fitSection(sec);
await f.screenshot({ scale: 0.4 }); await lap.screenshot({ scale: 0.3 });
OUT.push({ desktop: f.id, laptop: lap.id, h: Math.round(f.height), lh: Math.round(lap.height), hs });
}
{
const NAME = '[ADM-P10] Immutable by Design & Circuit Breaker / 1440 / Default — entries open';
const { f, c } = await shell(NAME, COLX(9), 160);
await pageHead(c, 'Policy & circuit breaker', 'Immutable by design', 'What the GlobalPool contract decides on its own, what admins may do, and what nobody can do. The only emergency control is a circuit breaker that pauses NEW entries — it needs a reason, 2FA and a second approver from another role.', [await BTN('Secondary', 'Download policy (PDF)', { size: 'S', lead: 'download' })]);
await subnav(c, 'Policy & breaker');
// three-column policy
const pol = row({ name: 'Policy columns', gap: 16, align: 'MIN' });
const COLS = [
  ['contract', 'The contract decides', 'icon/brand', 'surface/default', 'border/subtle', 'check', 'icon/brand', ['Opening and closing each round at its scheduled time', 'Requesting Chainlink VRF at close and verifying the proof', 'Deriving 13 winning entries from the random value', 'Prize split 50 / 20 / 10 / 10 × 2% of the pool', 'Cancelling below threshold and opening refunds']],
  ['user-check', 'Admins may — audited', 'status/success', 'surface/default', 'border/subtle', 'check-circle', 'status/success', ['Pause and resume NEW entries — reason, 2FA, four-eyes', 'Push refunds of a cancelled round in contract batches', 'Re-submit a failed credit batch, unchanged', 'Post pre-approved incident notices to players', 'Export rounds, entries, allocations and audit logs']],
  ['ban', 'Nobody can — by design', 'status/danger', 'status/danger-tint', 'border/danger', 'ban', 'status/danger', ['Edit, choose or re-roll a draw result', 'Pick, replace or exclude winners', 'Pay out from the pool to any address', 'Change prize split, close time or entries of a live round', 'Edit ledger entries or adjust balances silently']]
];
for (const [ic, title, icc, fl, st, bi, bic, items] of COLS) { const p = AL('VERTICAL', { name: 'Policy — ' + title, gap: 12, p: 20, fill: fl, stroke: st, r: 14 }); const h = row({ gap: 8 }); add(h, await IC(ic, 20, icc), await T(title, 'Heading/H5')); add(p, h); for (const s of items) { const r = row({ gap: 8, align: 'MIN' }); add(r, await IC(bi, 16, bic)); await W(s, 'Body/S', 'text/primary', r, 280); add(p, [r, 'FILL']); } add(pol, [p, 'FILL']); }
add(c, [pol, 'FILL']); for (const k of pol.children) k.layoutSizingVertical = 'FILL';
// circuit breaker panel
const cb = panel('Circuit breaker', { gap: 16, p: 24 });
add(cb, await ph('Circuit breaker — new entries', { icon: 'pause-circle', right: [await SB('Confirmed', 'Entries open', 'M')] }));
const cbr = row({ name: 'Breaker body', gap: 24, align: 'MIN' });
const lft = col({ gap: 12 });
await W('Use only for an incident that could make new entries unsafe (e.g. RPC or relayer failure, suspected exploit, regulator instruction). Pausing does not touch existing entries, the scheduled close, the draw, settlement, refunds or withdrawals.', 'Body/M', 'text/secondary', lft, 520);
const ef = row({ name: 'Effects', gap: 8, wrap: true, cgap: 8 });
for (const [ok, s] of [[true, 'Existing 18,640 entries stay valid'], [true, 'Close 20:00:00 UTC unchanged'], [true, 'Draw + settlement run as scheduled'], [true, 'Withdrawals unaffected'], [false, 'New purchases blocked with a player notice']]) { const r = row({ gap: 6, p: [6, 10], fill: ok ? 'status/success-tint' : 'status/warning-tint', r: 9999 }); add(r, await IC(ok ? 'check' : 'pause', 14, ok ? 'status/success' : 'status/warning'), await T(s, 'Label/S', 'text/primary')); add(ef, r); }
add(lft, [ef, 'FILL']);
const rules = col({ gap: 0 });
for (const k of [await kv('Who can request', 'Super Admin · Finance Lead · Compliance Officer'), await kv('Second approver', 'Different person and different role'), await kv('Re-authentication', '2FA for requester and approver'), await kv('Request expires', '30 min if not approved'), await kv('Resume', 'Same dual-approval flow', { line: false })]) add(rules, [k, 'FILL']);
add(lft, [rules, 'FILL']);
add(cbr, [lft, 'FILL']);
const act = AL('VERTICAL', { name: 'Breaker action', gap: 12, p: 20, fill: 'surface/raised', stroke: 'border/subtle', r: 14 });
add(act, await T('Current state', 'Overline', 'text/tertiary'));
const cs = row({ gap: 8 }); add(cs, await IC('play', 20, 'status/success'), await T('New entries open', 'Heading/H5', 'text/primary')); add(act, cs);
await W('Last change 9 Nov 2026, 14:54 UTC — resumed after incident INC-0412 (AR-0975).', 'Caption', 'text/tertiary', act, 280);
add(act, [await BTN('Danger', 'Request pause of new entries', { size: 'L', lead: 'pause-circle' }), 'FILL']);
await W('Opens a request with reason, incident reference and 2FA. Nothing changes until a second admin approves.', 'Caption', 'text/tertiary', act, 280);
act.resize(340, act.height); add(cbr, act);
add(cb, [cbr, 'FILL']);
add(c, [cb, 'FILL']);
// contract + history
const hist = panel('Breaker history', { gap: 0, p: 0 });
const hh = await ph('Circuit-breaker history', { icon: 'history', right: [await chip('lock', 'Immutable audit log · hash-chained', 'text/secondary')] }); pad(hh, 16, 20, 16, 20); add(hist, [hh, 'FILL']);
const HS = [['9 Nov 2026, 14:54', 'Resume entries', 'AR-0975', 'K. Osei → S. Iyer', 'INC-0412 resolved — RPC failover healthy', 'Confirmed', 'Approved'], ['9 Nov 2026, 14:12', 'Pause new entries', 'AR-0974', 'S. Iyer → K. Osei', 'INC-0412 — primary RPC returning stale blocks', 'Confirmed', 'Approved'], ['2 Oct 2026, 09:31', 'Pause new entries', 'AR-0811', 'A. Marin → —', 'Test of procedure — not approved, expired after 30 min', 'Expired', 'Expired']];
const ht = await table('Breaker history', [{ h: 'Time (UTC)', w: 160 }, { h: 'Action', w: 150 }, { h: 'Request', w: 100 }, { h: 'Requested → approved', w: 180, tab: false }, { h: 'Reason', w: 260, fill: true }, { h: 'Result', w: 130 }], HS.map(h => [{ p: h[0] }, { p: h[1] }, { p: h[2] }, { p: h[3] }, { p: h[4] }, { t: 'Status', st: h[5], l: h[6] }]), { foot: await tfoot('3 events · audit entries #86,102, #86,139, #81,477') });
ht.strokes = []; radius(ht, 0); add(hist, [ht, 'FILL']);
add(c, [hist, 'FILL']);
const gv = panel('Governance');
add(gv, await ph('Contract governance — how rules can change', { icon: 'scale', demo: false }));
for (const [t, d] of [['New audited version', 'Rule changes ship as a new contract version (e.g. v1.4.0) with a public audit report.'], ['48 h timelock', 'The upgrade is queued on-chain and visible to everyone before it can execute.'], ['3-of-5 multisig', 'Independent signers — no single admin, including Super Admin, can upgrade alone.'], ['Next round only', 'A live round always finishes under the rules it opened with. Players are notified 7 days ahead.']]) { const r = row({ gap: 12, align: 'MIN', p: [8, 0] }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, await IC('check-circle', 18, 'icon/brand')); const tc = col({ gap: 2 }); add(tc, await T(t, 'Label/L', 'text/primary')); await W(d, 'Body/S', 'text/secondary', tc, 420); add(r, [tc, 'FILL']); add(gv, [r, 'FILL']); }
await W('Previous version v1.2.4 (0x61e0…b3a8) is deprecated and read-only; its rounds remain verifiable.', 'Caption', 'text/tertiary', gv);
const cc = await I('24:14297', { State: 'Active' }); await setT(cc, 'RoundSettled · 27 Nov 2026, 20:02 UTC', 'EntryPurchased · 27 Nov 2026, 16:42 UTC');
split(c, gv, cc, 440);
const lap = await laptop(f, LY); fitSection(sec);
await f.screenshot({ scale: 0.4 }); await lap.screenshot({ scale: 0.3 });
P10ID = f.id; OUT.push({ desktop: f.id, laptop: lap.id, h: Math.round(f.height), lh: Math.round(lap.height) });
}
{
const SRC = await figma.getNodeByIdAsync(P10ID);
const NAME = '[ADM-P10] Immutable by Design & Circuit Breaker / 1440 / Pause request — reason + 2FA + four-eyes';
{ const old = sec.children.find(n => n.name === NAME); if (old) old.remove(); }
const f = SRC.clone(); sec.appendChild(f); f.name = NAME; f.x = SRC.x; f.y = SRC.y + SRC.height + 160;
const dlg = AL('VERTICAL', { name: 'Dialog — Request pause of new entries', gap: 20, p: 28, fill: 'surface/overlay', stroke: 'border/subtle', r: 20, w: 600 });
await fx(dlg, 'Elevation/4 — Modal');
const hd = row({ name: 'Dialog header', gap: 14, align: 'MIN' });
const it = AL('HORIZONTAL', { name: 'Icon tile', p: 10, fill: 'status/danger-tint', r: 10 }); add(it, await IC('pause-circle', 24, 'status/danger')); add(hd, it);
const ht = col({ gap: 4 }); add(ht, await T('Request pause of new entries', 'Heading/H4')); await W('Global Pool · round #1,248 (open). Nothing changes until a second admin from another role approves.', 'Body/S', 'text/secondary', ht, 420); add(hd, [ht, 'FILL']);
add(hd, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.x }));
add(dlg, [hd, 'FILL']);
const eff = AL('VERTICAL', { name: 'What happens', gap: 8, p: 14, fill: 'surface/raised', stroke: 'border/subtle', r: 10 });
add(eff, await T('What happens if approved', 'Overline', 'text/tertiary'));
for (const [ok, s] of [[false, 'New purchases are blocked; players see “New entries are temporarily paused”'], [true, 'Existing 18,640 entries stay valid — nothing is refunded or removed'], [true, 'Close 20:00:00 UTC, VRF draw and settlement run unchanged'], [true, 'Deposits, withdrawals and other games are unaffected']]) { const r = row({ gap: 8 }); add(r, await IC(ok ? 'check' : 'pause', 16, ok ? 'status/success' : 'status/warning')); await W(s, 'Body/S', 'text/primary', r, 440); add(eff, [r, 'FILL']); }
add(dlg, [eff, 'FILL']);
const r1 = row({ name: 'Fields row', gap: 12, align: 'MIN' });
const sel = await I('13:565', { State: 'Default' }, { Label: 'Reason category', Value: 'Infrastructure incident' }); add(r1, [sel, 'FILL']);
const inc = await I('13:762', { State: 'Filled', Size: 'M' }, { Label: 'Incident reference', 'Show leading icon': false }); await setT(inc, 'Value text', 'INC-0457'); add(r1, [inc, 'FILL']);
add(dlg, [r1, 'FILL']);
const ta = await I('16:3858', { State: 'Focus' }, { Label: 'Reason — shown to the approver and in the audit log', 'Show counter': true }); await setT(ta, 'Value text', 'Arbitrum RPC provider reports elevated reorg risk since 16:50 UTC. Pausing new entries until node health is green. Existing entries, the 20:00 UTC close and the draw are unaffected.'); add(dlg, [ta, 'FILL']);
const ap = await I('13:565', { State: 'Default' }, { Label: 'Second approver (different role)', Value: 'K. Osei · Compliance Officer' }); add(dlg, [ap, 'FILL']);
const otp = await I('16:3761', { State: 'Complete' }, { Label: 'Your 2FA code', Description: 'Authenticator app · S. Iyer' }); add(dlg, otp);
const nts = col({ gap: 8, name: 'Notices' });
for (const [ic, icc, t] of [['users', 'status/info', 'Four-eyes: K. Osei must approve with their own 2FA within 30 min (until 17:25 UTC), otherwise the request expires.'], ['lock', 'icon/muted', 'Recorded in the immutable audit log as AR-1039 when you submit. The reason cannot be edited afterwards.']]) { const r = row({ gap: 8, align: 'MIN' }); add(r, await IC(ic, 16, icc)); await W(t, 'Caption', 'text/secondary', r, 480); add(nts, [r, 'FILL']); }
add(dlg, [nts, 'FILL']);
const ft = row({ name: 'Dialog footer', gap: 12 }); strokeSides(ft, 'border/subtle', { t: 1 }); pad(ft, 16, 0, 0, 0); add(ft, await DEMO('S')); add(ft, [sp(), 'FILL']); add(ft, await BTN('Secondary', 'Cancel', { size: 'M' }), await BTN('Danger', 'Submit for approval', { size: 'M', lead: 'pause-circle' }));
add(dlg, [ft, 'FILL']);
overlay(f, dlg, 150);
fitSection(sec);
await f.screenshot({ scale: 0.3 });
P10B = f.id; OUT.push({ id: f.id, h: Math.round(f.height), dh: Math.round(dlg.height) });
}
{
const SRC = await figma.getNodeByIdAsync(P10ID);
const PREV = await figma.getNodeByIdAsync(P10B);
const NAME = '[ADM-P10] Immutable by Design & Circuit Breaker / 1440 / Second approval — approver view';
{ const old = sec.children.find(n => n.name === NAME); if (old) old.remove(); }
const f = SRC.clone(); sec.appendChild(f); f.name = NAME; f.x = SRC.x; f.y = PREV.y + PREV.height + 160;
const sb = f.findOne(n => n.name === 'Nav/Admin Sidebar'), tb = f.findOne(n => n.name === 'Nav/Admin Topbar');
async function setTC(root, keys, v) { let k = 0; for (const t of root.findAll(n => n.type === 'TEXT' && (keys.includes(n.name) || keys.includes(n.characters)))) { await lf(t); t.characters = v; k++; } return k; }
const WHO = []; for (const r of [sb, tb]) { WHO.push(await setTC(r, ['Initials'], 'KO'), await setTC(r, ['A. Marin', 'S. Iyer'], 'K. Osei'), await setTC(r, ['Finance Lead', 'Super Admin'], 'Compliance Officer')); }
WHO.push(await setTC(sb, ['8 of 10 modules', '10 of 10 modules'], '7 of 10 modules'));
const cb = f.findOne(n => n.name === 'Circuit breaker');
const hdr = cb.findOne(n => n.name === 'Panel header'); const oldB = hdr.children[hdr.children.length - 1]; const nb = await SB('Pending', 'Pause requested · awaiting you', 'M'); hdr.insertChild(hdr.children.indexOf(oldB), nb); oldB.remove();
const act = cb.findOne(n => n.name === 'Breaker action'); for (const k of [...act.children]) k.remove();
fill(act, 'surface/selected'); stroke(act, 'border/brand', 1);
add(act, await T('Approval request AR-1039', 'Overline', 'text/brand'));
const t1 = row({ gap: 8 }); add(t1, await IC('pause-circle', 20, 'status/warning'), await T('Pause new entries', 'Heading/H5', 'text/primary'), await DEMO('XS')); add(act, t1);
const kl = col({ gap: 0 });
for (const k of [await kv('Requested by', 'S. Iyer · Super Admin'), await kv('Requested', '16:55:02 UTC'), await kv('Incident', 'INC-0457 · infrastructure'), await kv('Expires', '17:25:02 UTC · 27:41 left', { color: 'text/warning', line: false })]) add(kl, [k, 'FILL']);
add(act, [kl, 'FILL']);
const rq = AL('VERTICAL', { name: 'Reason', gap: 4, p: 12, fill: 'surface/default', stroke: 'border/subtle', r: 10 }); add(rq, await T('Reason (as submitted)', 'Overline', 'text/tertiary')); await W('“Arbitrum RPC provider reports elevated reorg risk since 16:50 UTC. Pausing new entries until node health is green. Existing entries, the 20:00 UTC close and the draw are unaffected.”', 'Body/S', 'text/primary', rq, 280); add(act, [rq, 'FILL']);
const otp = await I('16:3761', { State: 'Filling' }, { Label: 'Your 2FA code', Description: 'Authenticator app · K. Osei' }); add(act, otp); otp.rescale(0.8);
const bt = row({ gap: 8 }); add(bt, [await BTN('Secondary', 'Reject with reason', { size: 'M' }), 'FILL'], [await BTN('Danger', 'Approve & pause', { size: 'M', lead: 'check' }), 'FILL']); add(act, [bt, 'FILL']);
await W('You cannot approve your own request. Approving writes audit entry AR-1039 · approve with your name, time and 2FA.', 'Caption', 'text/tertiary', act, 280);
// state banner under sub-nav
const c = f.findOne(n => n.name === 'Content'); const nav = c.findOne(n => n.name === 'Pool sub-nav');
const bn = row({ name: 'State banner', gap: 12, p: [12, 16], fill: 'status/info-tint', stroke: 'border/subtle', r: 10 });
add(bn, await IC('users', 18, 'status/info')); const bc = col({ gap: 2 }); add(bc, await T('Four-eyes approval pending — new entries are still OPEN', 'Label/L', 'text/primary')); await W('S. Iyer (Super Admin) requested a pause at 16:55:02 UTC. Only a second admin from a different role can approve; the request expires at 17:25:02 UTC.', 'Body/S', 'text/secondary', bc, 700); add(bn, [bc, 'FILL'], await DEMO('S'));
c.insertChild(c.children.indexOf(nav) + 1, bn); bn.layoutSizingHorizontal = 'FILL';
fitSection(sec);
await f.screenshot({ scale: 0.3 });
P10C = f.id; OUT.push({ id: f.id, h: Math.round(f.height), who: WHO });
}
{
const SRC = await figma.getNodeByIdAsync(P10ID);
const PREV = await figma.getNodeByIdAsync(P10C);
const NAME = '[ADM-P10] Immutable by Design & Circuit Breaker / 1440 / New entries paused — after dual approval';
{ const old = sec.children.find(n => n.name === NAME); if (old) old.remove(); }
const f = SRC.clone(); sec.appendChild(f); f.name = NAME; f.x = SRC.x; f.y = PREV.y + PREV.height + 160;
const c = f.findOne(n => n.name === 'Content'); const nav = c.findOne(n => n.name === 'Pool sub-nav');
const bn = row({ name: 'State banner', gap: 12, p: [14, 16], fill: 'status/warning-tint', stroke: 'border/subtle', r: 10 });
add(bn, await IC('pause-circle', 20, 'status/warning')); const bc = col({ gap: 2 }); add(bc, await T('New entries paused since 17:02:48 UTC — AR-1039', 'Label/L', 'text/primary')); await W('Requested by S. Iyer (Super Admin) at 16:55:02, approved by K. Osei (Compliance Officer) at 17:02:48 — both with 2FA. Existing 18,640 entries stay valid; the 20:00:00 UTC close and the VRF draw are unchanged. Players see “New entries are temporarily paused”.', 'Body/S', 'text/secondary', bc, 700); add(bn, [bc, 'FILL'], await DEMO('S'));
c.insertChild(c.children.indexOf(nav) + 1, bn); bn.layoutSizingHorizontal = 'FILL';
const cb = f.findOne(n => n.name === 'Circuit breaker');
const hdr = cb.findOne(n => n.name === 'Panel header'); const oldB = hdr.children[hdr.children.length - 1]; const nb = await SB('Restricted', 'Entries paused', 'M'); hdr.insertChild(hdr.children.indexOf(oldB), nb); oldB.remove();
const act = cb.findOne(n => n.name === 'Breaker action'); for (const k of [...act.children]) k.remove();
fill(act, 'status/warning-tint'); stroke(act, 'border/subtle', 1);
add(act, await T('Current state', 'Overline', 'text/tertiary'));
const cs = row({ gap: 8 }); add(cs, await IC('pause-circle', 20, 'status/warning'), await T('New entries paused', 'Heading/H5', 'text/primary')); add(act, cs);
const kl = col({ gap: 0 });
for (const k of [await kv('Paused at', '17:02:48 UTC · 14 min ago'), await kv('Request', 'AR-1039 · INC-0457', { demo: true }), await kv('Purchases declined since', '412 · players notified'), await kv('Round close', '20:00:00 UTC · unchanged', { line: false })]) add(kl, [k, 'FILL']);
add(act, [kl, 'FILL']);
add(act, [await BTN('Primary', 'Request resume of entries', { size: 'L', lead: 'play' }), 'FILL']);
await W('Resume uses the same flow: reason, 2FA and a second approver from another role. If still paused at 20:00 UTC the round closes with the entries it has; the 500-participant / 50,000.00 threshold still applies.', 'Caption', 'text/tertiary', act, 280);
// history: add the new pause as first row (clone row 1 and edit)
const tbl = f.findOne(n => n.name === 'Table — Breaker history');
const r1 = tbl.children[1]; const nr = r1.clone(); tbl.insertChild(1, nr);
const vals = ['27 Nov 2026, 17:02', 'Pause new entries', 'AR-1039', 'S. Iyer → K. Osei', 'INC-0457 — RPC provider reorg risk'];
for (let i = 0; i < 5; i++) await setT(nr.children[i], 'Primary', vals[i]);
const ft = tbl.findOne(n => n.name === 'Table footer'); if (ft) await setT(ft, ft.findAll(n => n.type === 'TEXT')[0].name, '4 events · audit entries #88,240, #86,102, #86,139, #81,477');
// contract card -> Paused
const cc = f.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === 'Admin/Contract Card'); if (cc) cc.setProperties({ State: 'Paused' });
fitSection(sec);
await f.screenshot({ scale: 0.3 });
OUT.push({ id: f.id, h: Math.round(f.height) });
}
{
const SRC = await figma.getNodeByIdAsync('80:62189');
const NAME = '[ADM-P7] VRF Status / 1440 / Delayed — no fulfilment after 12 min (scenario)';
{ const old = sec.children.find(n => n.name === NAME); if (old) old.remove(); }
const f = SRC.clone(); sec.appendChild(f); f.name = NAME; f.x = SRC.x; f.y = SRC.y + SRC.height + 160;
const c = f.findOne(n => n.name === 'Content');
const ph_ = c.findOne(n => n.name === 'Page header');
const tr = ph_.findOne(n => n.name === 'Title row'); const ob = tr.children[1]; const nb = await SB('Under review', 'Delayed', 'S'); tr.insertChild(1, nb); ob.remove();
const sub = ph_.findOne(n => n.name === 'Title block').children[2]; await lf(sub); sub.characters = 'Scenario: round #1,248 closed at 20:00:00 UTC and requested randomness at 20:00:04, but no fulfilment has arrived. Entries are closed and safe; settlement waits. Snapshot 27 Nov 2026, 20:12:30 UTC.';
const chp = ph_.findOne(n => n.name.startsWith('Chip —')); if (chp) { const t = chp.findOne(n => n.type === 'TEXT'); await lf(t); t.characters = 'Coordinator degraded · 3 networks affected'; t.fills = [paint('text/warning')]; tint(chp.findOne(n => n.type === 'INSTANCE'), 'status/warning'); }
// alert banner
const nav = c.findOne(n => n.name === 'Pool sub-nav');
const bn = AL('VERTICAL', { name: 'Delay alert', gap: 12, p: [16, 20], fill: 'status/warning-tint', stroke: 'border/subtle', r: 14 });
const a1 = row({ gap: 12, align: 'MIN' }); add(a1, await IC('alert-triangle', 22, 'status/warning'));
const ac = col({ gap: 4 }); add(ac, await T('VRF fulfilment delayed — 12 min 26 s since request 0x9f2c…e71a', 'Heading/H5', 'text/primary')); await W('The oracle network reports degraded fulfilment on Arbitrum. The contract keeps waiting for the same request; if nothing arrives within 24 h (by 28 Nov 2026, 20:00:04 UTC) it cancels round #1,248 and refunds every entry. On-call was paged at 20:10:04 UTC.', 'Body/S', 'text/secondary', ac, 760); add(a1, [ac, 'FILL'], await DEMO('S'));
add(bn, [a1, 'FILL']);
const a2 = row({ gap: 8, wrap: true, cgap: 8 }); add(a2, await BTN('Secondary', 'Post “Draw delayed” notice', { size: 'S', lead: 'megaphone' }), await BTN('Secondary', 'Open incident INC-0458', { size: 'S', lead: 'flag' }), await BTN('Ghost', 'Oracle status page', { size: 'S', trail: 'external-link' }));
add(a2, [sp(), 'FILL']); add(a2, await stat('ban', 'status/danger', 'Re-request and manual draw are not available', 'text/secondary', 'Label/S'));
add(bn, [a2, 'FILL']);
c.insertChild(c.children.indexOf(nav) + 1, bn); bn.layoutSizingHorizontal = 'FILL';
// stepper + KV
const stp = f.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === 'Jackpot/VRF Stepper'); if (stp) stp.setProperties({ Step: 'Delayed' });
for (const [lab, val] of [['KV — Fulfilled', 'Not yet — waiting 12 min 26 s'], ['KV — Confirmations', '0 / 3'], ['KV — Proof', 'Pending fulfilment'], ['KV — Callback gas', '—'], ['KV — Winners derived', 'Waiting for randomness']]) { const k = f.findOne(n => n.name === lab); if (!k) continue; const ts = k.findAll(n => n.type === 'TEXT'); const t = ts[1]; if (t) { await lf(t); t.characters = val; if (lab === 'KV — Fulfilled') t.fills = [paint('text/warning')]; } }
const pk = f.findOne(n => n.name === 'KV — Proof'); if (pk) { const i = pk.findOne(n => n.type === 'INSTANCE' && n.name === 'Icon/check-circle'); if (i) i.remove(); const nk = await IC('clock', 16, 'status/info'); pk.appendChild(nk); }
const wk = f.findOne(n => n.name === 'KV — Winners derived'); if (wk) { const b = wk.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Button/')); if (b) b.remove(); }
// history first row
const ht = f.findOne(n => n.name === 'Table — VRF requests'); const r1 = ht.children[1];
await setT(r1.children[3], 'Primary', '—'); await setT(r1.children[4], 'Value', '12 min+');
const sc = r1.children[5].findOne(n => n.type === 'INSTANCE'); if (sc) { sc.setProperties({ Status: 'Pending' }); const x = sc.findAll(n => n.type === 'TEXT')[0]; if (x) { await lf(x); x.characters = 'Awaiting fulfilment'; } }
await setT(r1.children[6], 'Primary', 'Closed · settlement waits');
r1.fills = [paint('status/warning-tint')];
// delay rules: mark "> 10 min" as current
const s10 = f.findOne(n => n.name === 'Step — > 10 min'); if (s10) { fill(s10, 'surface/selected'); stroke(s10, 'border/brand', 1); const ov = s10.findAll(n => n.type === 'TEXT')[0]; await lf(ov); ov.characters = 'Now'; ov.fills = [paint('text/info')]; tint(s10.findOne(n => n.type === 'INSTANCE'), 'status/info'); }
const s0 = f.findOne(n => n.name === 'Step — 0 – 10 min'); if (s0) { const ov = s0.findAll(n => n.type === 'TEXT')[0]; await lf(ov); ov.characters = 'Exceeded'; ov.fills = [paint('text/warning')]; }
fitSection(sec);
await f.screenshot({ scale: 0.3 });
OUT.push({ id: f.id, h: Math.round(f.height) });
}
return OUT;
