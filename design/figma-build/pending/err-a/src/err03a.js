// ERR-03 Loading matrix board — part A (header + rows 1–4) (page 12)
const page = figma.root.children.find(p => p.name === '12 — Empty & Error States'); await figma.setCurrentPageAsync(page);
const sec = section('ERR-01/02/03 Empty, error & loading matrices', 0, 0);
const [B, body] = await board(sec, '[ERR-03] Loading matrix / 1440 / Board', 120, nextY(sec));
async function sk(w, h, r = 6, name = 'Skeleton') { const x = figma.createRectangle(); x.resize(w, h); x.name = name; radius(x, r); await gfill(x, 'Gradient/Skeleton'); return x; }
if (!body.findChild(n => n.name === 'Board header')) add(body, [await boardHeader({
  over: 'ERR-03 · Loading states · P0 · page 12',
  title: 'Loading: skeletons, spinners, progress and optimistic UI',
  body: 'Pick the pattern by what we know. Layout known → skeleton. Short action → in-button spinner. Measurable work → determinate progress with real numbers. Safe, reversible change → optimistic UI with rollback. Money never moves optimistically.',
  rules: [['clock', '0–300 ms: show nothing'], ['layers', '300 ms–10 s: skeleton or spinner'], ['hourglass', 'Over 10 s: “Still loading…” + cancel'], ['alert-triangle', 'Over 30 s: error with ref (ERR-02)'], ['eye', 'Reduced motion: no shimmer']],
  legend: [['Surface · ID', 'Where the loading state appears, plus its matrix ID (L-01…)'], ['Preview', 'Library instances in their Loading state'], ['Trigger', 'The request or event that is in flight'], ['Copy', 'Visible and screen-reader text'], ['Recovery', 'What happens when it takes too long or fails'], ['Dev', 'Timing, motion and data rules']]
}), 'FILL']);

// ---------- Row 1: table skeleton (full) ----------
const tc = VB('Table card', 1152, { gap: 12, p: [16, 16, 8, 16], fill: 'surface/default', stroke: 'border/default', r: 14, clip: true });
const tbar = await I('23:11446', { State: 'Default' });
const hr = HB('Header row', {}); fill(hr, 'bg/secondary');
for (const [l, w, a] of [['Description', 296, 'Left'], ['Date', 184, 'Left'], ['Network', 188, 'Left'], ['Status', 148, 'Left'], ['Amount', 208, 'Right'], ['Actions', 96, 'Left']]) { const h = await I(IDS.th, { Align: a, Sort: l === 'Date' ? 'Desc' : 'None' }, { Label: l, 'Show sort icon': l === 'Date' }); h.resize(w, 40); add(hr, h); }
const rowsV = VB('Skeleton rows', 1120, {}); for (let i = 0; i < 5; i++) add(rowsV, await I(IDS.skelRow, { Density: 'Comfortable' }));
add(tc, tbar, hr, rowsV, await T('Loading transactions…  (aria-busy · announced to screen readers)', 'Caption', 'text/tertiary'));
const l01 = await cell({ id: 'L-01', mod: 'Skeleton · Table', title: 'Transaction table — first load', full: true, kind: 'Table/Skeleton Row ×5', stage: [tc],
  trigger: 'Route mount or filter change; GET /transactions pending for more than 300 ms.',
  copy: 'No visible placeholder text. The table is aria-busy and announces “Loading transactions…”.',
  recovery: 'After 10 s: “Still loading…” under the table with Cancel. After 30 s: the X-01 error state with a reference.',
  dev: 'Skeleton mirrors the final columns and 56 px row height (no layout shift). Gradient/Skeleton shimmer 1.2 s loop; prefers-reduced-motion → static bars. Toolbar is usable immediately.' });
await row(body, 'Row 1 — Table skeleton', [l01]);

// ---------- Row 2: balance skeleton + button spinners ----------
const bp = panel('Balance card — loading', { gap: 16, p: 20 });
const bt = HB('Total', { gap: 12, align: 'CENTER' }); const btv = VB('Total', 220, { gap: 6 }); add(btv, await T('Total balance', 'Caption', 'text/tertiary'), await sk(200, 36, 6, 'Skeleton/Total'));
add(bt, await iconTile('wallet', 'neutral', 40), btv);
const bb = HB('Buckets', { gap: 8 });
for (const l of ['Available', 'Locked', 'Pending', 'Owed']) { const b = VB('Bucket/' + l, 110, { gap: 6, p: 12, fill: 'surface/raised', r: 10 }); add(b, await T(l, 'Caption', 'text/tertiary'), await sk(64, 16, 4)); add(bb, b); b.layoutGrow = 1; }
const ra = VB('Recent activity', 480, { gap: 12 }); add(ra, await T('Recent activity', 'Label/M', 'text/secondary'));
for (let i = 0; i < 3; i++) { const r = HB('Activity skeleton', { gap: 12, align: 'CENTER' }); const rv = VB('Lines', 200, { gap: 6 }); add(rv, await sk(180, 12, 4), await sk(120, 10, 4)); const s = spacer(); add(r, await sk(32, 32, 9999, 'Skeleton/Icon'), rv, s); s.layoutGrow = 1; add(r, await sk(80, 14, 4)); add(ra, [r, 'FILL']); }
const ba = HB('Quick actions', { gap: 8 }); add(ba, await BTN('Primary', 'Deposit', { lead: 'deposit' }), await BTN('Secondary', 'Withdraw', { lead: 'withdraw', state: 'Disabled' }), await BTN('Ghost', 'History', { lead: 'history' }));
add(bp, [bt, 'FILL'], [bb, 'FILL'], [ra, 'FILL'], ba);
const l02 = await cell({ id: 'L-02', mod: 'Skeleton · Cards', title: 'Wallet balance card — loading', kind: 'Gradient/Skeleton', stage: [[bp, 'FILL']],
  trigger: 'GET /wallet/balances pending (first load, or refetch after a deposit-credited event).',
  copy: 'Labels stay visible (Total balance, Available, Locked, Pending, Owed); only the numbers shimmer. Never show 0.00 while loading.',
  recovery: 'Deposit stays enabled; Withdraw is disabled until Available is known (tooltip “Loading your balance…”). Error → inline Try again in the card.',
  dev: 'A cached balance may be shown instead, dimmed with “Updated 18:42 UTC” — never mixed with live numbers in one card.' });

const bg = VB('Button states', 520, { gap: 12 });
const BL = [['Primary', 'Deposit USDT', 'Primary · deposit / save'], ['Gold', 'Confirm 35 entries', 'Gold · Global Pool entry only'], ['Danger', 'Revoke device', 'Danger · destructive confirm'], ['Secondary', 'Export CSV', 'Secondary · background job']];
const g1 = HB('Grid row 1', { gap: 12 }), g2 = HB('Grid row 2', { gap: 12 });
for (let i = 0; i < 4; i++) { const [t, l, cap] = BL[i]; const c = VB('Loading/' + t, 250, { gap: 8, p: 16, fill: 'surface/default', stroke: 'border/default', r: 10, align: 'MIN' }); add(c, await BTN(t, l, { state: 'Loading' }), await T(cap, 'Caption', 'text/tertiary')); add(i < 2 ? g1 : g2, c); c.layoutGrow = 1; }
const spn = HB('Spinner sizes', { gap: 16, p: [12, 16], fill: 'surface/default', stroke: 'border/default', r: 10, align: 'CENTER' });
for (const s of [16, 20, 24]) { const it = HB('Spinner ' + s, { gap: 6, align: 'CENTER' }); add(it, await IC('spinner', s, 'icon/brand'), await T(s + ' px', 'Mono/S', 'text/tertiary')); add(spn, it); }
const sps = spacer(); add(spn, sps); sps.layoutGrow = 1; add(spn, await T('Inline: “Confirming…”', 'Caption', 'text/secondary'));
add(bg, [g1, 'FILL'], [g2, 'FILL'], [spn, 'FILL']);
const l03 = await cell({ id: 'L-03', mod: 'Spinner · Buttons', title: 'In-button spinners for short actions', kind: 'Button/* · Loading', stage: [[bg, 'FILL']],
  trigger: 'A user action expected to finish in under ~2 s (submit, confirm, approve), or a wait with no measurable progress.',
  copy: 'Buttons keep their width; screen readers hear “Confirming…”, “Saving…”. No percentage when we don’t know it.',
  recovery: 'Repeat clicks are ignored while loading. Past 30 s on a money action → the X-05 timeout pattern.',
  dev: 'Button State=Loading. Disable the whole form while submitting, not only the button. Spinner icon 16/20/24: icon/brand on charcoal, text/on-primary inside mint buttons.' });
await row(body, 'Row 2 — Card skeleton · Spinners', [l02, l03]);

// ---------- Row 3: lobby skeleton (full) ----------
const lob = VB('Lobby — loading', 1192, { gap: 16 });
const lh = HB('Carousel header', { gap: 8, align: 'CENTER' }); const ls = spacer();
add(lh, await IC('zap', 20, 'icon/brand'), await T('GLOBAL POOL Originals', 'Heading/H5', 'text/primary'), ls); ls.layoutGrow = 1;
add(lh, await I('7:774', { Type: 'Secondary', Size: 'S', State: 'Disabled' }, { Icon: ICONS['chevron-left'] }), await I('7:774', { Type: 'Secondary', Size: 'S', State: 'Disabled' }, { Icon: ICONS['chevron-right'] }));
const tiles = HB('Tile skeletons', { gap: 12 }); for (let i = 0; i < 7; i++) add(tiles, await sk(160, 213, 14, 'Skeleton/Tile 3:4'));
const lb = await I(IDS.liveBets, { State: 'Loading' });
add(lob, [lh, 'FILL'], tiles, lb);
const l04 = await cell({ id: 'L-04', mod: 'Skeleton · Lobby', title: 'Lobby carousel + live bets — loading', full: true, kind: 'Tile skeletons · Table/Live Bets Loading', stage: [lob],
  trigger: 'Lobby first paint while GET /games/catalogue and the live-bets WebSocket snapshot are pending.',
  copy: 'Section titles render at once (“GLOBAL POOL Originals”, the Live bets tabs); only tiles and rows shimmer. Footer: “Loading latest entries…”.',
  recovery: 'If the WebSocket snapshot fails, the table falls back to polling every 10 s and shows the “Live updates paused” toast (X-12).',
  dev: 'Tiles keep the 3:4 ratio (160×213); carousel arrows stay disabled until data arrives. Never use fake player counts or wins as placeholders.' });
await row(body, 'Row 3 — Lobby skeleton', [l04]);

// ---------- Row 4: inline check + confirmations ----------
const ic = VB('Address check', 520, { gap: 12, align: 'MIN' });
const a1 = await I(IDS.inAddr, { State: 'Focus' });
const chk = HB('Checking', { gap: 8, p: [8, 12], r: 10, fill: 'surface/raised', align: 'CENTER' }); const ckt = await T('Checking 0x7c4e…a21D — format ✓ · whitelist… · screening…', 'Caption', 'text/secondary');
add(chk, await IC('spinner', 16, 'icon/brand'), ckt);
const a2 = await I(IDS.inAddr, { State: 'Whitelisted' });
add(ic, await T('1 · While checking', 'Overline', 'text/tertiary'), [a1, 'FILL'], chk, await T('2 · Result', 'Overline', 'text/tertiary'), [a2, 'FILL']);
const l05 = await cell({ id: 'L-05', mod: 'Spinner · Inline check', title: 'Inline check — destination address', kind: 'Input/Address · Focus → Whitelisted', stage: [[ic, 'FILL']], align: 'MIN',
  trigger: 'Paste or blur in the destination field → instant format check (client), then whitelist + screening (API, about 1 s).',
  copy: '“Checking 0x7c4e…a21D — format ✓ · whitelist… · screening…” → Whitelisted state (or Invalid / New address with the 24 h cooldown).',
  recovery: 'Continue stays disabled until the check returns; editing the field cancels the pending check.',
  dev: 'Debounce 400 ms; show the inline spinner only after 300 ms. Results cached per address for the session.' });

const cf = VB('Confirmations', 520, { gap: 16 });
add(cf, await I(IDS.confProg, { State: 'Confirming' }), await I(IDS.toast, { Type: 'Tx pending' }));
const cfn = HB('Pending line', { gap: 12, p: [12, 16], r: 10, fill: 'surface/default', stroke: 'border/default', align: 'CENTER' }); const cs = spacer();
add(cfn, await IC('clock', 20, 'balance/pending'), await T('Pending', 'Label/M', 'text/primary'), cs); cs.layoutGrow = 1; add(cfn, await T('1,000.00 USDT', 'Number/S', 'balance/pending'), await DEMO('XS'));
add(cf, [cfn, 'FILL']);
const l06 = await cell({ id: 'L-06', mod: 'Progress · Confirmations', title: 'Deposit confirming — determinate progress', kind: 'Confirmations Progress · Toast Tx pending', stage: [cf],
  trigger: 'Deposit DP-77412 detected on Ethereum and counting confirmations (7 / 12).',
  copy: '“7 / 12 confirmations · est. 2 min” — the amount sits under Pending, not Available.',
  recovery: 'No action needed; View on explorer. If confirmations stall beyond 2× the estimate → Delayed state (X-07).',
  dev: 'Real counts from the chain watcher (WebSocket); the estimate uses the network’s block time. Credit at 12 / 12 exactly once, then the toast turns Success.' });
await row(body, 'Row 4 — Inline check · Confirmations', [l05, l06]);

restack(sec); fitSection(sec);
for (const r of body.children.filter(n => n.name.startsWith('Row'))) await r.screenshot({ scale: 0.55 });
const e2 = sec.findChild(n => n.name.startsWith('[ERR-02]')); await e2.findOne(n => n.name === 'Row 2 — Action failed · 5xx').screenshot({ scale: 0.5 });
return { board: B.id, size: [B.width, B.height], rows: body.children.map(r => ({ id: r.id, name: r.name, h: Math.round(r.height) })) };
