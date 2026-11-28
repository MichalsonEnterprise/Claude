// ERR-01 Empty-state matrix board (page 12)
const page = figma.root.children.find(p => p.name === '12 — Empty & Error States'); await figma.setCurrentPageAsync(page);
const sec = section('ERR-01/02/03 Empty, error & loading matrices', 0, 0);
const [B, body] = await board(sec, '[ERR-01] Empty-state matrix / 1440 / Board', 120, 120);
if (!body.findChild(n => n.name === 'Board header')) add(body, [await boardHeader({
  over: 'ERR-01 · Empty states · P0 · page 12',
  title: 'Empty states, module by module',
  body: 'Every list, table and balance in GLOBAL POOL has a designed zero state. Each cell names the module, the exact trigger, the copy we ship and the recovery action we offer. Empty states inform — they never push anyone to deposit or play.',
  rules: [['check-circle', 'Say what is empty and why'], ['arrow-right', 'One next step, two at most'], ['ban', 'No pressure to deposit or play'], ['eye', 'Disabled actions stay visible, with the reason'], ['layers', 'Tables reuse Table/Empty State']],
  legend: [['Module · ID', 'Surface the state belongs to, plus its matrix ID (E-01…)'], ['Preview', 'Library instances in the real state, with DEMO data'], ['Trigger', 'The exact condition or API result that shows it'], ['Copy', 'The words we ship'], ['Recovery', 'The next step we offer (primary first)'], ['Dev', 'Behaviour notes for engineering']]
}), 'FILL']);

// ---------- Row 1: Wallet + Entries ----------
const balP = panel('Balance — empty', {});
const tp = HB('Total', { gap: 12, align: 'CENTER' }); const tv = VB('Total value', 200, { gap: 2 });
add(tv, await T('Total balance', 'Caption', 'text/tertiary'), await T('0.00 USDT', 'Number/L', 'text/primary'));
const s1 = spacer(); add(tp, await iconTile('wallet', 'neutral', 40), tv, s1); s1.layoutGrow = 1; add(tp, await DEMO('S'));
const bk = HB('Buckets', { gap: 8 });
for (const l of ['Available', 'Locked', 'Pending', 'Owed']) { const b = await miniStat(l, '0.00', { vc: 'text/secondary' }); add(bk, b); b.layoutGrow = 1; }
add(balP, [tp, 'FILL'], [bk, 'FILL']);
const e01 = await emptyBlock({ title: 'Your wallet is empty', body: 'Deposit USDT on BNB Chain, Polygon, Arbitrum, Ethereum or Solana. Minimum deposit 10.00 USDT. Funds show as Pending until the network confirms them.', actions: [await BTN('Primary', 'Deposit USDT', { lead: 'deposit' }), await BTN('Secondary', 'Withdraw', { lead: 'withdraw', state: 'Disabled' })], note: 'Withdraw unlocks once you have an Available balance.' });
const c01 = await cell({ id: 'E-01', mod: 'Wallet', title: 'Wallet overview — brand-new account', kind: 'Page section', stage: [[balP, 'FILL'], [e01, 'FILL']],
  trigger: 'GET /wallet/balances returns total 0.00 and the ledger has no entries (new account, any KYC level).',
  copy: '“Your wallet is empty” · “Deposit USDT on BNB Chain, Polygon, Arbitrum, Ethereum or Solana. Minimum deposit 10.00 USDT.”',
  recovery: 'Deposit USDT (primary) → WAL-03 deposit flow. Withdraw stays visible but disabled, with the reason underneath.',
  dev: 'All four buckets render 0.00 (never blank). No welcome-bonus upsell inside the empty state; promotions live in their own slots.' });

const tk = HB('Ticket placeholder', { gap: 16, p: [16, 20], r: 14, stroke: 'border/strong', align: 'CENTER' }); tk.dashPattern = [6, 4];
const tt = VB('Ticket text', 300, { gap: 2 }); add(tt, await T('Round #1,248 · Open', 'Label/M', 'text/secondary'), await T('0 entries', 'Number/M', 'text/primary'), await T('18,640 qualifying entries from 3,412 players', 'Caption', 'text/tertiary'));
add(tk, await iconTile('ticket', 'neutral', 48), tt); tt.layoutGrow = 1; add(tk, await DEMO('S'));
const e04 = await emptyBlock({ title: 'No entries in round #1,248', body: 'Round #1,248 closes 27 Nov 2026, 20:00 UTC. Each entry costs 10.00 USDT plus a 0.05 USDT platform fee, both shown before you confirm.', actions: [await BTN('Gold', 'Enter round #1,248', { lead: 'ticket' }), await BTN('Ghost', 'How the draw works')], note: 'You can lose your stake · 18+ · Only where Global Pool is licensed' });
const c04 = await cell({ id: 'E-02', mod: 'Global Pool · My entries', title: 'My entries — none in the open round', kind: 'Tab panel', stage: [[tk, 'FILL'], [e04, 'FILL']],
  trigger: 'GET /pool/rounds/1248/my-entries returns 0 while round #1,248 is Open (closes 20:00 UTC).',
  copy: '“No entries in round #1,248” · “Round #1,248 closes 27 Nov 2026, 20:00 UTC. Each entry costs 10.00 USDT plus a 0.05 USDT platform fee…”',
  recovery: 'Enter round (Gold) → GP-02 preview with fee line, odds and unchecked consent. Secondary: How the draw works.',
  dev: 'No round open → swap CTA for “Next round opens 28 Nov 2026, 08:00 UTC” + Remind me. Countdown text only from the real close time.' });
await row(body, 'Row 1 — Wallet · Entries', [c01, c04]);

// ---------- Row 2: Transactions (full) ----------
const es1 = await I(IDS.emptyState, { Type: 'No data' });
await setT(es1, 'Body', 'Deposits, withdrawals, pool entries, prizes and refunds will appear here as soon as they happen.');
const c02 = await cell({ id: 'E-03', mod: 'Transactions', title: 'Transaction history — no activity yet', full: true, kind: 'Table/Empty State · No data', stage: [es1],
  trigger: 'GET /transactions?cursor= returns [] and the account has never had a ledger movement.',
  copy: '“No transactions yet” · “Deposits, withdrawals, pool entries, prizes and refunds will appear here as soon as they happen.”',
  recovery: 'Make a deposit (primary) · How deposits work (secondary). Toolbar filters, density and Export CSV are hidden until there is at least one row.',
  dev: 'Same component in Wallet › History, Financial history (USR-F) and admin user ledgers. Height 356 inside the 1120 table card; header row stays rendered.' });
await row(body, 'Row 2 — Transactions', [c02]);

// ---------- Row 3: Winnings + Referrals ----------
const w1 = await statRow([['Prizes won', '0.00 USDT'], ['Owed to you', '0.00 USDT']]);
const e05 = await emptyBlock({ icon: 'trophy', title: 'No winnings yet', body: 'Prizes from Global Pool draws and game wins appear here once they settle. Most entries don’t win — only play with money you can afford to lose.', actions: [await BTN('Secondary', 'View past draws', { lead: 'history' }), await BTN('Ghost', 'Set a limit', { lead: 'shield' })] });
const c05 = await cell({ id: 'E-04', mod: 'Winnings', title: 'My winnings — nothing won yet', kind: 'Page', stage: [[w1, 'FILL'], [e05, 'FILL']],
  trigger: 'GET /winnings returns [] — no settled prizes and no Owed items (refunds or rewards).',
  copy: '“No winnings yet” · “Most entries don’t win — only play with money you can afford to lose.”',
  recovery: 'View past draws (results + VRF proofs). The RG “Set a limit” link is always present; there is no “Play now” push.',
  dev: 'Neutral trophy icon, not gold: gold is reserved for real prize moments. Owed refunds/rewards would fill this list, so it is only empty when both are 0.' });

const lk = HB('Referral link', { gap: 8, p: [8, 8, 8, 12], r: 10, fill: 'surface/raised', stroke: 'border/default', align: 'CENTER' });
const lt = await T('globalpool.example/r/NOVAK27', 'Mono/S', 'text/primary'); add(lk, lt); lt.layoutGrow = 1; add(lk, await DEMO('XS'), await BTN('Secondary', 'Copy link', { size: 'S', lead: 'copy' }));
const r1 = await statRow([['Clicks', '0'], ['Sign-ups', '0'], ['Earned', '0.00 USDT']]);
const e06 = await emptyBlock({ icon: 'users', title: 'Nobody has joined with your link yet', body: 'You earn 20% of the 0.05 USDT platform fee on qualifying Global Pool entries by players you refer, for 12 months. Terms apply.', actions: [await BTN('Primary', 'Share link', { lead: 'link' }), await BTN('Ghost', 'Referral terms')] });
const c06 = await cell({ id: 'E-05', mod: 'Referrals', title: 'Invited users — nobody yet (new referrer)', kind: 'Page', stage: [[r1, 'FILL'], [lk, 'FILL'], [e06, 'FILL']],
  trigger: 'GET /referrals/invited returns 0 sign-ups. Clicks may already be above 0 — the stats row shows the real counts.',
  copy: '“Nobody has joined with your link yet” · “You earn 20% of the 0.05 USDT platform fee … for 12 months. Terms apply.”',
  recovery: 'Share link (primary) · Copy link inline · Referral terms. Never sample or placeholder users in the table.',
  dev: 'Alternative state for a new referrer (@nova.k’s demo account has 48 sign-ups). Commission wording must match USR-R1 and the Affiliate terms.' });
await row(body, 'Row 3 — Winnings · Referrals', [c05, c06]);

// ---------- Row 4: Filters no results (full) ----------
const es2 = await I(IDS.emptyState, { Type: 'No results' });
await setT(es2, 'Body', 'No refunds on Solana between 20 and 27 Nov 2026. Try removing a filter or widening the date range.');
const c03 = await cell({ id: 'E-06', mod: 'Any table · Filters', title: 'Filtered list — no matches', full: true, kind: 'Table/Empty State · No results', stage: [es2],
  trigger: 'Filters applied (Type = Refund · Network = Solana · 20–27 Nov 2026) and the query returns 0 rows, while the unfiltered list has rows.',
  copy: '“No results match your filters” · “No refunds on Solana between 20 and 27 Nov 2026. Try removing a filter or widening the date range.”',
  recovery: 'Clear all filters (primary) · Edit filters (secondary). Active filter chips stay visible above the empty state.',
  dev: 'Body names the active filters in words. Search with no match uses the same variant: “No transaction matches ‘0x9b2d…’ — paste the full hash.”' });
await row(body, 'Row 4 — Filters', [c03]);

// ---------- Row 5: Notifications + Favourites ----------
const nh = HB('Notifications header', { gap: 8, align: 'CENTER' });
const sg = await I(IDS.seg, { Segments: '2' }); await setNth(sg, 0, 'Unread 0'); await setNth(sg, 1, 'All 14');
const s5 = spacer(); add(nh, sg, s5); s5.layoutGrow = 1; add(nh, await BTN('Ghost', 'Mark all as read', { size: 'S', state: 'Disabled' }));
const e07 = await emptyBlock({ icon: 'bell', title: 'You’re all caught up', body: 'Security alerts, deposits, withdrawals and round results appear here. Promotional messages stay off unless you turn them on.', actions: [await BTN('Secondary', 'Notification settings', { lead: 'settings' }), await BTN('Ghost', 'Show all 14')] });
const c07 = await cell({ id: 'E-07', mod: 'Notifications', title: 'Notification centre — nothing unread', kind: 'Popover + page', stage: [[nh, 'FILL'], [e07, 'FILL']],
  trigger: 'Unread tab active and unread count = 0 (WebSocket badge cleared). A brand-new account with 0 notifications in total uses the same block without “Show all”.',
  copy: '“You’re all caught up” · “Promotional messages stay off unless you turn them on.”',
  recovery: 'Notification settings · Show all (read) notifications. “Mark all as read” is disabled, not hidden.',
  dev: 'Bell badge hidden at 0 (not “0”). Security notifications can’t be turned off — settings link explains why.' });

const ph = HB('Tile placeholders', { gap: 12, align: 'CENTER' });
for (let i = 0; i < 4; i++) { const t = AL('VERTICAL', { name: 'Placeholder tile', w: 100, h: 133, r: 10, stroke: 'border/strong', justify: 'CENTER', align: 'CENTER' }); t.dashPattern = [6, 4]; add(t, await IC('star', 24, 'icon/muted')); add(ph, t); }
const e11 = await emptyBlock({ title: 'No favourites yet', body: 'Tap the star on any game tile to keep it here — Orbit Rush, Pool Dice, Twenty-One or any GP Studios slot.', actions: [await BTN('Secondary', 'Browse Originals', { lead: 'games' })] });
const c11 = await cell({ id: 'E-08', mod: 'Lobby · Favourites', title: 'Favourites row — nothing saved', kind: 'Carousel row', stage: [ph, [e11, 'FILL']],
  trigger: 'GET /games/favourites returns [] for a signed-in player.',
  copy: '“No favourites yet” · “Tap the star on any game tile to keep it here…”',
  recovery: 'Browse Originals → lobby Originals row. Recently played uses the same pattern (“Games you play show up here”).',
  dev: 'Row keeps its height (tile placeholders 100×133, dashed border/strong) so the lobby does not jump when the first favourite is added.' });
await row(body, 'Row 5 — Notifications · Favourites', [c07, c11]);

// ---------- Row 6: Devices (full) ----------
const dv = await I(IDS.device, { State: 'Current', Interaction: 'Default' });
const e08 = await emptyBlock({ w: 640, title: 'No other devices are signed in', body: 'When you sign in on another phone or browser it appears here with its location and last activity, so you can spot anything you don’t recognise.', actions: [await BTN('Secondary', 'Sign-in history', { lead: 'history' }), await BTN('Ghost', 'Security settings', { lead: 'shield' })] });
const c08 = await cell({ id: 'E-09', mod: 'Account · Devices', title: 'Connected devices — only this device', full: true, kind: 'List', stage: [dv, e08],
  trigger: 'GET /devices returns only the current session (MacBook Pro · Chrome · Lisbon). The list is never truly empty while you are signed in.',
  copy: '“No other devices are signed in” · “…so you can spot anything you don’t recognise.”',
  recovery: 'Sign-in history (USR-A6) · Security settings. “Sign out all other devices” is hidden because there is nothing to revoke.',
  dev: 'User/Device Row State=Current stays on top; the empty block replaces the “Other devices” list. Sessions page (USR-A8) uses the same copy pattern.' });
await row(body, 'Row 6 — Devices', [c08]);

// ---------- Row 7: Game history + Admin search ----------
const gh = HB('Columns', { gap: 0 });
for (const [l, w] of [['Round', 120], ['Bet', 100], ['Cash-out', 100], ['Payout', 100], ['Seed', 112]]) { const h = await I(IDS.th, { Align: 'Left', Sort: 'None' }, { Label: l, 'Show sort icon': false }); h.resize(w, 40); add(gh, h); }
const e12 = await emptyBlock({ icon: 'crash', tone: 'brand', title: 'No Orbit Rush bets yet', body: 'Every bet you place shows here with its round ID, cash-out, payout and seed, so you can verify any result yourself.', actions: [await BTN('Secondary', 'How provably fair works', { lead: 'shield-check' }), await BTN('Ghost', 'Set a session limit')] });
const c12 = await cell({ id: 'E-10', mod: 'Games · Bet history', title: 'Game history tab — no bets in this game', kind: 'Table', stage: [gh, [e12, 'FILL']],
  trigger: 'GET /games/orbit-rush/bets?player=me returns [] (any Original: Pool Dice, Double Side, Pool Roulette…).',
  copy: '“No Orbit Rush bets yet” · “…so you can verify any result yourself.”',
  recovery: 'How provably fair works (opens the verifier tab) · Set a session limit. No “Place your first bet” nudge.',
  dev: 'Column headers stay so the layout matches the filled table. Game name comes from the catalogue (original names only).' });

const sr = await I(IDS.search, { Size: 'M', State: 'Filled' }); await setNth(sr, 0, 'GP-99999');
const e10 = await emptyBlock({ icon: 'search', title: 'No user matches “GP-99999”', body: 'Check the ID format (GP- followed by 5 digits) or search by email, wallet address or transaction hash. Addresses and hashes must match exactly.', actions: [await BTN('Ghost', 'Clear search', { size: 'S', lead: 'x' })], note: 'Search is logged to the audit trail (#88,214 · R. Duarte).' });
const c10 = await cell({ id: 'E-11', mod: 'Admin · User search', admin: true, title: 'Admin user search — no match', kind: 'Admin', stage: [sr, [e10, 'FILL']],
  trigger: 'Admin › Users search returns 0 results for an exact-ID query.',
  copy: '“No user matches “GP-99999”” · “Check the ID format (GP- followed by 5 digits)…”',
  recovery: 'Clear search. No “create user” shortcut — accounts are only created by players.',
  dev: 'Partial e-mail matches are masked (n•••@example.com) per role. Command palette (⌘K) uses Nav/Command Palette State=No results.' });
await row(body, 'Row 7 — Game history · Admin search', [c12, c10]);

// ---------- Row 8: Admin queue (full) ----------
const qt = VB('Admin queue', 1184, { fill: 'surface/default', stroke: 'border/default', r: 14, clip: true });
const qh = HB('Queue title', { gap: 12, p: [16, 20], align: 'CENTER' });
const qs = spacer(); add(qh, await T('Withdrawal queue', 'Heading/H5', 'text/primary'), await badge('Live', null), await DEMO('M'), qs); qs.layoutGrow = 1;
add(qh, await T('Pending review · 0', 'Label/M', 'text/secondary'), await BTN('Secondary', 'Export CSV', { size: 'S', state: 'Disabled', lead: 'download' }));
add(qt, [qh, 'FILL']);
const hr = HB('Header row', { gap: 0 }); fill(hr, 'bg/secondary');
for (const [l, w] of [['Request', 220], ['User', 168], ['Amount', 160], ['Destination', 224], ['Risk', 144], ['Status', 132], ['Requested', 136]]) { const h = await I(IDS.th, { Align: l === 'Amount' ? 'Right' : 'Left', Sort: l === 'Requested' ? 'Asc' : 'None' }, { Label: l, 'Show sort icon': l === 'Requested' }); h.resize(w, 40); add(hr, h); }
add(qt, [hr, 'FILL']);
const qe = VB('Empty body', 1184, { p: [48, 24, 56, 24], align: 'CENTER' });
add(qe, await emptyBlock({ w: 560, icon: 'check-circle', tone: 'success', title: 'No withdrawals waiting for review', body: 'New requests arrive in real time and are ordered oldest first. Review SLA is 4 h. Last decision: WD-20850 rejected by A. Marin at 18:42 UTC.', actions: [await BTN('Secondary', 'View processed today', { size: 'S', lead: 'history' }), await BTN('Ghost', 'Queue rules', { size: 'S' })] }));
add(qt, [qe, 'FILL']);
const c09 = await cell({ id: 'E-12', mod: 'Admin · Finance tables', admin: true, title: 'Admin queue table — queue is clear', full: true, kind: 'Admin table', stage: [qt],
  trigger: 'Admin › Finance › Withdrawals, filter Status = Pending review, count = 0 (alternative to the 37-item DEMO queue).',
  copy: '“No withdrawals waiting for review” · “New requests arrive in real time… Review SLA is 4 h.”',
  recovery: 'View processed today (filtered history). Bulk action bar, select-all and filters are not shown when nothing is selectable; Export CSV is disabled.',
  dev: 'Same pattern for KYC (214), AML alerts, approvals inbox (four-eyes) and reconciliation mismatches: “No … waiting” + last decision + SLA. Header stays for column memory.' });
await row(body, 'Row 8 — Admin queue', [c09]);

restack(sec); fitSection(sec);
const rows = body.children.filter(n => n.name.startsWith('Row'));
const shots = [];
for (const r of rows) shots.push(await r.screenshot({ scale: 0.55 }));
return { section: sec.id, board: B.id, size: [B.width, B.height], rows: rows.map(r => ({ id: r.id, name: r.name, h: Math.round(r.height), cells: r.children.map(c => Math.round(c.height)) })) };
