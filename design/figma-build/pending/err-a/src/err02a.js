// ERR-02 Error matrix board — part A (header + rows 1–4) (page 12)
const page = figma.root.children.find(p => p.name === '12 — Empty & Error States'); await figma.setCurrentPageAsync(page);
const sec = section('ERR-01/02/03 Empty, error & loading matrices', 0, 0);
const [B, body] = await board(sec, '[ERR-02] Error matrix / 1440 / Board', 120, nextY(sec));
if (!body.findChild(n => n.name === 'Board header')) add(body, [await boardHeader({
  over: 'ERR-02 · Error states · P0 · page 12',
  title: 'Errors by cause — and how each one recovers',
  body: 'Network, server, timeout, validation and on-chain failures each get a specific message, a plain statement of what happened to the money (“nothing was charged”, “1,500.00 USDT returned to Available”) and a safe next step. Error references make support fast.',
  rules: [['wallet', 'Always state the money status'], ['refresh', 'Retries reuse the idempotency key'], ['edit', 'Keep what the player typed'], ['hash', 'Reference + UTC time for support'], ['ban', 'Never show raw server text']],
  legend: [['Cause · ID', 'Failure family plus its matrix ID (X-01…)'], ['Preview', 'Library instances in the error state, with DEMO data'], ['Trigger', 'The exact condition, status code or chain event'], ['Copy', 'The words we ship'], ['Recovery', 'The next step we offer (primary first)'], ['Dev', 'Retry, idempotency and logging notes']]
}), 'FILL']);

// ---------- Row 1: list request failed (full) ----------
const es = await I(IDS.emptyState, { Type: 'Error' });
await setT(es, 'Body', 'The request to our ledger service timed out. Your balance and funds are not affected — only this list failed to load.');
const x01 = await cell({ id: 'X-01', mod: 'Network · Data request', title: 'List failed to load — transactions table', full: true, kind: 'Table/Empty State · Error', stage: [es],
  trigger: 'GET /transactions returns 504 Gateway Timeout, or the request fails at network level, after one silent automatic retry.',
  copy: '“We couldn’t load your transactions” · “Your balance and funds are not affected — only this list failed to load.” · Error ref TX-LIST-504',
  recovery: 'Try again (primary, re-runs the query) · System status. If cached rows exist they stay visible and the error becomes an inline row above them.',
  dev: 'Silent retry with backoff (0.5 s → 1.5 s) before showing. Error ref = service code + HTTP status + UTC time; copyable and pre-filled into the support form.' });
await row(body, 'Row 1 — Network · list', [x01]);

// ---------- Row 2: action failed (toast) + 5xx ----------
const t1 = await I(IDS.toast, { Type: 'Error' });
await setT(t1, 'Title', 'Couldn’t reach GLOBAL POOL'); await setT(t1, 'Body', 'Your 35 entries weren’t submitted, so nothing was charged. Check your connection and try again.');
await setByChars(t1, 'View details', 'Try again'); await setByChars(t1, 'Contact support', 'System status');
const kept = panel('Selection kept', { gap: 8, p: 16 });
const kh = HB('Kept title', { gap: 8, align: 'CENTER' }); const ks = spacer(); add(kh, await T('Your selection is kept', 'Label/M', 'text/primary'), ks); ks.layoutGrow = 1; add(kh, await DEMO('XS'));
add(kept, [kh, 'FILL'], [await kv('35 entries × 10.00', '350.00 USDT'), 'FILL'], [await kv('Platform fee 35 × 0.05', '1.75 USDT'), 'FILL'], [await kv('Total', '351.75 USDT', { vs: 'Number/M' }), 'FILL']);
const gb = await BTN('Gold', 'Confirm 35 entries · 351.75 USDT', { lead: 'ticket' }); add(kept, [gb, 'FILL']);
const x02 = await cell({ id: 'X-02', mod: 'Network · Action', title: 'Action failed — the request never reached us', kind: 'Toast + form', stage: [t1, [kept, 'FILL']],
  trigger: 'POST /pool/entries rejects with no HTTP response (offline, DNS, TLS or CORS failure) — the request never reached the server.',
  copy: '“Couldn’t reach GLOBAL POOL” · “Your 35 entries weren’t submitted, so nothing was charged. Check your connection and try again.”',
  recovery: 'Try again re-sends with the same idempotency key; the preview keeps 35 entries, the fee line and the total. System status opens the status page.',
  dev: 'Error toasts don’t auto-hide. If the request may have reached the server (timeout), use X-05 — never say “not charged” unless we know.' });

const p5 = panel('5xx panel', { gap: 16, p: 24 });
const ph5 = HB('Top', { gap: 12, align: 'CENTER' }); add(ph5, await iconTile('alert-triangle', 'danger', 40), await T('Something went wrong on our side', 'Heading/H5', 'text/primary'));
add(p5, ph5, [await T('Your balance is safe and nothing was changed. We’ve logged the problem — please try again in a moment.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
const ref = HB('Reference', { gap: 8, p: [8, 8, 8, 12], r: 10, fill: 'surface/raised', stroke: 'border/default', align: 'CENTER' });
const rt = await T('Ref GP-503-2B91-04DE · 27 Nov 2026, 18:44:18 UTC', 'Mono/S', 'text/primary'); add(ref, rt); rt.layoutGrow = 1; add(ref, await DEMO('XS'), await BTN('Ghost', 'Copy', { size: 'S', lead: 'copy' }));
add(p5, [ref, 'FILL']);
const a5 = HB('Actions', { gap: 8, align: 'CENTER' }); add(a5, await BTN('Primary', 'Try again', { lead: 'refresh' }), await BTN('Secondary', 'Status page', { trail: 'external-link' }), await BTN('Ghost', 'Contact support'));
add(p5, a5, [await T('503 with Retry-After: “Back at 18:46 UTC — we’ll retry once automatically.”', 'Caption', 'text/tertiary', { w: 480 }), 'FILL']);
const x04 = await cell({ id: 'X-03', mod: 'Server · 5xx', title: 'Server error — 500 · 502 · 503', kind: 'Inline panel', stage: [[p5, 'FILL']],
  trigger: 'Any 5xx from the API gateway on a read or a non-financial write. 503 carries Retry-After.',
  copy: '“Something went wrong on our side” · “Your balance is safe and nothing was changed.” · Ref GP-503-2B91-04DE',
  recovery: 'Try again · Status page · Contact support (pre-fills the reference). 503: absolute retry time and one automatic retry.',
  dev: 'For money actions “nothing was changed” only appears when the API confirms the rollback; otherwise use X-05. Full-page 500 = PUB-25.' });
await row(body, 'Row 2 — Action failed · 5xx', [x02, x04]);

// ---------- Row 3: 4xx map (full) ----------
const tb = VB('4xx map', 1184, { fill: 'surface/default', stroke: 'border/default', r: 14, clip: true });
const tth = HB('Table title', { gap: 12, p: [16, 20], align: 'CENTER' }); const tts = spacer();
add(tth, await T('HTTP 4xx → what the player sees', 'Heading/H5', 'text/primary'), tts); tts.layoutGrow = 1; add(tth, await DEMO('M'));
add(tb, [tth, 'FILL']);
const COLS = [['Status', 132], ['When', 296], ['Message we show', 456], ['Recovery', 300]];
const hr = HB('Header row', {}); fill(hr, 'bg/secondary');
for (const [l, w] of COLS) { const h = await I(IDS.th, { Align: 'Left', Sort: 'None' }, { Label: l, 'Show sort icon': false }); h.resize(w, 40); add(hr, h); }
add(tb, [hr, 'FILL']);
const MAP = [
  ['400', 'Bad request', 'Malformed or outdated request (e.g. an old app version).', '“Something in this request wasn’t valid. Refresh the page and try again.”', 'Refresh; report with the ref if it repeats'],
  ['401', 'Unauthorised', 'Access token expired or revoked.', '“Your session ended for security. Sign in again — we’ll bring you back here.”', 'Re-auth modal (AUTH-20); typed input is kept'],
  ['403', 'Forbidden', 'Action not allowed for this account, role or region.', '“You can’t do this from your account right now.” + the specific reason', 'Reason link: role (ERR-04), region or self-exclusion (ERR-05)'],
  ['404', 'Not found', 'Round, transaction or page doesn’t exist (yet).', '“We couldn’t find round #1,999. It may not have opened yet.”', 'Go to the current round #1,248'],
  ['409', 'Conflict', 'Same request already processed (idempotency key reused).', '“This withdrawal was already submitted as WD-20931. We didn’t send it twice.”', 'View WD-20931 — no second request'],
  ['422', 'Unprocessable', 'Server-side validation failed on submit.', 'Field messages inline (X-06) + “2 fields need attention” summary', 'Focus moves to the first invalid field'],
  ['429', 'Too many requests', 'Rate limit hit (e.g. 2FA codes, sign-in, search).', '“Too many attempts. You can try again at 18:45 UTC.”', 'Button disabled until the absolute time']
];
for (const [code, name, when, msg, rec] of MAP) {
  const r = HB('Row ' + code, {}); strokeSides(r, 'border/subtle', { t: 1 });
  const c0 = VB('Status', 132, { gap: 4, p: [12, 16] }); const chip = HB('Code', { p: [2, 8], r: 6, fill: code === '401' || code === '403' ? 'status/danger-tint' : 'status/warning-tint' }); add(chip, await T(code, 'Mono/S', code === '401' || code === '403' ? 'text/danger' : 'text/warning')); add(c0, chip, await T(name, 'Label/S', 'text/secondary'));
  const c1 = VB('When', 296, { p: [12, 16] }); add(c1, [await T(when, 'Body/S', 'text/secondary', { w: 264 }), 'FILL']);
  const c2 = VB('Message', 456, { p: [12, 16] }); add(c2, [await T(msg, 'Body/S Strong', 'text/primary', { w: 424 }), 'FILL']);
  const c3 = VB('Recovery', 300, { p: [12, 16] }); add(c3, [await T(rec, 'Body/S', 'text/brand', { w: 268 }), 'FILL']);
  add(r, c0, c1, c2, c3); add(tb, [r, 'FILL']);
}
const x03 = await cell({ id: 'X-04', mod: 'Client · 4xx', title: 'Client errors mapped to plain messages', full: true, kind: 'Message map', stage: [tb],
  trigger: 'Any 4xx response. The UI maps status + error code to one of these messages; raw server text is never shown.',
  copy: 'One message per status (column 3). 403 always names the reason; 429 always gives an absolute time, never a pressure countdown.',
  recovery: 'Column 4. Requests that are safe duplicates (409) resolve to the existing record instead of an error screen.',
  dev: 'Error body: { code, message_key, ref, retry_at? }. Copy keys live in i18n. 401 during a money flow re-authenticates without losing step state.' });
await row(body, 'Row 3 — 4xx map', [x03]);

// ---------- Row 4: timeout + validation ----------
const pt = panel('Timeout panel', { gap: 16, p: 24 });
const tt0 = HB('Top', { gap: 12, align: 'CENTER' }); const ttv = VB('Title', 300, { gap: 2 });
add(ttv, await T('Still checking your withdrawal', 'Heading/H5', 'text/primary'), await T('WD-20931 · 1,500.00 USDT → 0x7c4e…a21D · Arbitrum', 'Caption', 'text/tertiary'));
add(tt0, await iconTile('hourglass', 'info', 40), ttv); ttv.layoutGrow = 1; add(tt0, await DEMO('S'));
add(pt, [tt0, 'FILL'], [await T('We didn’t get a reply within 30 seconds. Please don’t submit again — we’re checking whether your withdrawal was created.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
const steps = VB('Steps', 480, { gap: 12, p: 16, fill: 'surface/raised', r: 10 });
add(steps, [await stepLine('done', 'Request sent', '18:44:02 UTC', 'Signed with your 2FA code'), 'FILL'], [await stepLine('current', 'Checking status', 'attempt 2 of 5', 'We ask again every 5 seconds'), 'FILL'], [await stepLine('todo', 'Result', null, 'Created → the tracker opens · Not created → you can try again'), 'FILL']);
add(pt, [steps, 'FILL'], [await T('1,500.00 USDT stays Locked until we know. A duplicate can’t be created — the request carries an idempotency key.', 'Caption', 'text/tertiary', { w: 480 }), 'FILL']);
const at = HB('Actions', { gap: 8 }); add(at, await BTN('Secondary', 'Check now', { lead: 'refresh' }), await BTN('Ghost', 'View withdrawals')); add(pt, at);
const x05 = await cell({ id: 'X-05', mod: 'Timeout', title: 'Timeout on a money action — outcome unknown', kind: 'Inline panel', stage: [[pt, 'FILL']],
  trigger: 'POST /withdrawals gets no response within the 30 s client timeout — the server may or may not have created WD-20931.',
  copy: '“Still checking your withdrawal” · “Please don’t submit again — we’re checking whether your withdrawal was created.”',
  recovery: 'Auto-poll by idempotency key every 5 s (5 tries) → tracker (WAL-22) or “Not created — try again”. After 5 tries: the 5xx panel with ref.',
  dev: 'Submit button stays Loading until resolved. Leaving the page is fine — the result also arrives as a notification.' });

const es6 = HB('Error summary', { gap: 12, p: [12, 16], r: 10, fill: 'status/danger-tint', stroke: 'border/danger' });
const esv = VB('Summary text', 300, { gap: 2 }); add(esv, await T('2 fields need attention', 'Label/M', 'text/primary'), await T('Fix them to continue — nothing has been sent yet.', 'Caption', 'text/secondary'));
add(es6, await IC('alert-circle', 20, 'status/danger'), esv); esv.layoutGrow = 1;
const ia = await I(IDS.inAddr, { State: 'Invalid' }); const im = await I(IDS.inAmt, { State: 'Error' });
const x06 = await cell({ id: 'X-06', mod: 'Validation', title: 'Form validation — inline field errors', kind: 'Inputs · Error', stage: [[es6, 'FILL'], [ia, 'FILL'], [im, 'FILL'], await BTN('Primary', 'Continue to fees', { state: 'Disabled', trail: 'arrow-right' })], align: 'MIN',
  trigger: 'On blur (format, chain checksum, balance) and again on submit (server 422). Both paths show the same field messages.',
  copy: '“This is not a valid Arbitrum address. Check the network…” · “Exceeds your available balance (9,215.30 USDT)”',
  recovery: 'Each message says how to fix it; focus jumps to the first invalid field; typed values are never cleared. Continue enables once both fields are valid.',
  dev: 'aria-invalid + aria-describedby per field; the summary is a polite live region. Address rules per chain (EVM checksum, Solana base58).' });
await row(body, 'Row 4 — Timeout · Validation', [x05, x06]);

restack(sec); fitSection(sec);
const shots = []; for (const r of body.children.filter(n => n.name.startsWith('Row'))) shots.push(await r.screenshot({ scale: 0.55 }));
const e1 = sec.findChild(n => n.name.startsWith('[ERR-01]')); const eb = e1.findChild(n => n.name === 'Board body');
for (const r of eb.children.filter(n => /^Row [678]/.test(n.name))) shots.push(await r.screenshot({ scale: 0.5 }));
return { board: B.id, size: [B.width, B.height], rows: body.children.map(r => ({ id: r.id, name: r.name, h: Math.round(r.height) })) };
