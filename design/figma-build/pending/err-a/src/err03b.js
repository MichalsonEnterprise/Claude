// ERR-03 Loading matrix board — part B (rows 5–8 + L-05 value fix) (page 12)
const page = figma.root.children.find(p => p.name === '12 — Empty & Error States'); await figma.setCurrentPageAsync(page);
const sec = section('ERR-01/02/03 Empty, error & loading matrices', 0, 0);
const [B, body] = await board(sec, '[ERR-03] Loading matrix / 1440 / Board', 120, nextY(sec));
async function sk(w, h, r = 6, name = 'Skeleton') { const x = figma.createRectangle(); x.resize(w, h); x.name = name; radius(x, r); await gfill(x, 'Gradient/Skeleton'); return x; }
// fix: L-05 "While checking" field shows the address being checked, not the placeholder
const c05 = body.findOne(n => n.name.startsWith('Cell L-05'));
if (c05) { const f = c05.findAll(n => n.type === 'INSTANCE' && n.findAll(x => x.type === 'TEXT' && x.name === 'Value text').length)[0]; if (f) { const v = f.findAll(x => x.type === 'TEXT' && x.name === 'Value text')[0]; await loadFor(v); v.characters = '0x7c4e…a21D'; v.fills = [paint('text/primary')]; } }

// ---------- Row 5: chart + drawer (full) ----------
const cd = HB('Chart + drawer', { gap: 16 }); add(cd, await I(IDS.chartLine, { State: 'Loading' }), await I(IDS.drawer, { Content: 'Loading' }));
const l07 = await cell({ id: 'L-07', mod: 'Skeleton · Chart & drawer', title: 'Chart range change and detail drawer — loading', full: true, kind: 'Chart/Line-Area · Drawer/Detail Loading', stage: [cd],
  trigger: 'A chart range change (GET /pool/history?range=14d) or opening a transaction drawer (GET /transactions/:id).',
  copy: 'Chart: the previous range stays visible, dimmed, with an “Updating · last 14 days” chip until new data arrives. Drawer: “Loading transaction details…” under skeleton blocks.',
  recovery: 'The drawer can be closed at any time (Esc). A failure replaces the skeleton in place with Try again — the page behind is untouched.',
  dev: 'The drawer opens instantly with the fields the row already has (ID, amount) and skeletons the rest. First chart load (no previous data) uses Gradient/Skeleton bars inside the axes. Range buttons stay clickable; the last request wins.' });
await row(body, 'Row 5 — Chart · Drawer', [l07]);

// ---------- Row 6: VRF progress + upload ----------
const l08 = await cell({ id: 'L-08', mod: 'Progress · VRF draw', title: 'Draw in progress — waiting for Chainlink VRF', kind: 'Jackpot/VRF Stepper · Pending', stage: [await I(IDS.vrf, { Step: 'Pending' })],
  trigger: 'Round #1,248 closed at 20:00:00 UTC; randomness was requested at 20:00:04 UTC and the VRF response is pending.',
  copy: '“Awaiting VRF response · Elapsed 00:00:21 · Usually under 2 minutes. Nothing to do…”',
  recovery: 'Nothing needed. If fulfilment takes more than 10 min the stepper switches to Delayed with an honest explanation (ERR-06); entries stay valid.',
  dev: 'Elapsed time counts from the real request timestamp. Steps advance on contract events (VRFRequested → VRFFulfilled → RoundSettled). Never animate a fake “drawing” result.' });
const up = await I(IDS.upload, { State: 'Uploading' });
const upn = HB('Upload note', { gap: 8, p: [8, 12], r: 10, fill: 'surface/raised', align: 'CENTER' }); const upt = await T('If the upload fails: “Upload failed — your file wasn’t saved. Try again.” The file stays selected.', 'Caption', 'text/secondary', { w: 380 });
add(upn, await IC('info', 16, 'status/info'), upt); upt.layoutGrow = 1;
const l09 = await cell({ id: 'L-09', mod: 'Progress · Upload', title: 'KYC document upload — byte progress', kind: 'Input/File Upload · Uploading', stage: [up, upn],
  trigger: 'KYC document selected or dropped (AUTH-13); multipart upload in progress.',
  copy: '“63% · 2.4 MB of 3.8 MB · about 4 s left” — the privacy note stays visible during the upload.',
  recovery: 'Cancel upload at any time. On failure the file stays selected and Try again resumes; Continue is disabled until the upload completes.',
  dev: 'Real byte progress from the request; “time left” only after 1 s of samples. Retries resume chunked uploads instead of restarting.' });
await row(body, 'Row 6 — VRF · Upload', [l08, l09]);

// ---------- Row 7: optimistic vs money ----------
const op = VB('Optimistic', 520, { gap: 12 });
add(op, await T('Safe to apply instantly', 'Overline', 'text/tertiary'));
for (const [icon, label, before, after] of [['star', 'Add Orbit Rush to favourites', 'Not saved', 'Saved'], ['bell', 'Mark all notifications as read', '3 unread', '0 unread'], ['sliders', 'Table density', 'Comfortable', 'Compact']]) {
  const r = HB('Op/' + label, { gap: 12, p: [12, 16], r: 10, fill: 'surface/default', stroke: 'border/default', align: 'CENTER' }); const s = spacer();
  add(r, await IC(icon, 20, 'icon/brand'), await T(label, 'Label/M', 'text/primary'), s); s.layoutGrow = 1;
  add(r, await T(before, 'Caption', 'text/tertiary'), await IC('arrow-right', 16, 'icon/muted'), await T(after, 'Label/S', 'text/brand')); add(op, [r, 'FILL']);
}
add(op, await T('If the server says no', 'Overline', 'text/tertiary'));
const rb = await I(IDS.toast, { Type: 'Warning' }); await setT(rb, 'Title', 'Couldn’t save Orbit Rush to favourites'); await setT(rb, 'Body', 'We’ve put it back as it was. Check your connection and try again.'); await setByChars(rb, 'Network status', 'Try again');
add(op, rb);
const l10 = await cell({ id: 'L-10', mod: 'Optimistic UI', title: 'Optimistic UI — favourites, read state, preferences', kind: 'Instant + rollback', stage: [[op, 'FILL']],
  trigger: 'Low-risk, reversible, non-financial actions: favourites, mark as read, UI preferences, collapse/expand.',
  copy: 'The UI changes at once. On failure: “Couldn’t save Orbit Rush to favourites — we’ve put it back as it was.”',
  recovery: 'Automatic rollback to the previous state + a warning toast with Try again. No modal, no lost context.',
  dev: 'Keep the previous state for rollback and reconcile with the response (last write wins). Never optimistic for money, eligibility or limit increases.' });

const mo = VB('Money', 520, { gap: 12 });
const dob = panel('Do', { gap: 12, p: 16, stroke: 'border/success' });
const dh = HB('Do title', { gap: 8, align: 'CENTER' }); add(dh, await IC('check-circle', 20, 'status/success'), await T('Do — show Processing until the server confirms', 'Label/M', 'text/primary'));
const proc = HB('Processing line', { gap: 8, p: [8, 12], r: 10, fill: 'surface/raised', align: 'CENTER' }); const prs = spacer();
add(proc, await IC('spinner', 16, 'status/info'), await T('Processing · 35 entries · round #1,248', 'Body/S', 'text/secondary'), prs); prs.layoutGrow = 1; add(proc, await T('351.75 USDT', 'Number/S', 'balance/locked'));
const conf = HB('Confirmed line', { gap: 8, p: [8, 12], r: 10, fill: 'surface/raised', align: 'CENTER' }); const cfs = spacer();
add(conf, await badge('Confirmed', null), await T('18:05:12 UTC · 35 entries active', 'Body/S', 'text/secondary'), cfs); cfs.layoutGrow = 1; add(conf, await T('8,863.55 USDT left', 'Number/S', 'balance/available'));
add(dob, [dh, 'FILL'], [await kv('Available while processing', '9,215.30 USDT', { demo: true }), 'FILL'], [proc, 'FILL'], [conf, 'FILL']);
const dnb = VB('Don’t', 520, { gap: 8, p: 16, fill: 'status/danger-tint', stroke: 'border/danger', r: 14 });
const dnh = HB('Don’t title', { gap: 8, align: 'CENTER' }); add(dnh, await IC('x-circle', 20, 'status/danger'), await T('Don’t — deduct 351.75 and show 35 tickets before confirmation', 'Label/M', 'text/primary'));
add(dnb, [dnh, 'FILL'], [await T('If the purchase then fails, the player has already seen money leave and tickets appear. Balances come from the server, never from client maths.', 'Caption', 'text/secondary', { w: 480 }), 'FILL']);
add(mo, [dob, 'FILL'], [dnb, 'FILL']);
const l11 = await cell({ id: 'L-11', mod: 'Never optimistic · Money', title: 'Money is never optimistic — pending first', kind: 'Do / Don’t', stage: [[mo, 'FILL']],
  trigger: 'Anything that moves money or changes eligibility: entries, bets, deposits, withdrawals, claims, limit increases.',
  copy: '“Processing · 35 entries · round #1,248 — 351.75 USDT” → “Confirmed 18:05:12 UTC · 35 entries active”. Available changes only after confirmation.',
  recovery: 'If it fails, the Processing line disappears and X-02 / X-05 explain what happened to the money.',
  dev: 'Pending states come from the API response, not client maths. RG limit decreases apply instantly; increases wait 24 h (shown as Pending increase).' });
await row(body, 'Row 7 — Optimistic · Money', [l10, l11]);

// ---------- Row 8: live reconnect + route progress ----------
const lv = VB('Live values', 520, { gap: 12, align: 'CENTER' });
const chip = HB('Reconnecting chip', { gap: 8, p: [6, 12], r: 9999, fill: 'surface/raised', stroke: 'border/default', align: 'CENTER' }); add(chip, await IC('spinner', 14, 'status/warning'), await T('Reconnecting — last update 16:42:18 UTC', 'Label/S', 'text/secondary'));
add(lv, chip, await I('24:13861', { State: 'Open' }));
const l12 = await cell({ id: 'L-12', mod: 'Real-time · Reconnect', title: 'Live pool and countdown while reconnecting', kind: 'Card/Draw Countdown · Open', stage: [lv],
  trigger: 'The live WebSocket drops; the client retries with backoff (1, 2, 4, 8 s…).',
  copy: '“Reconnecting — last update 16:42:18 UTC”. The pool stays at its last confirmed value; the countdown keeps running to the real close time (20:00 UTC).',
  recovery: 'Automatic. After 30 s add Refresh and fall back to HTTP polling every 10 s (toast “Live updates paused”, X-12).',
  dev: 'Never extrapolate or animate the pool value while disconnected. The countdown comes from close_at + server clock offset, not from the socket.' });

const vp = VB('Viewport', 532, { fill: 'bg/base', stroke: 'border/default', r: 14, clip: true });
const bar = HB('Route progress 40%', { w: 532, h: 4 }); fill(bar, 'border/subtle'); add(bar, rect(212, 4, 'brand/primary', 0, 'Progress'));
const pgc = VB('Next page', 532, { gap: 12, p: 20 });
add(pgc, await T('Global Pool', 'Heading/H4', 'text/primary'), await T('Round #1,248 · loading…', 'Caption', 'text/tertiary'), [await sk(492, 120, 14, 'Skeleton/Hero'), 'FILL']);
const two = HB('Cards', { gap: 12 }); const k1 = await sk(240, 80, 14), k2 = await sk(240, 80, 14); add(two, k1, k2); k1.layoutGrow = 1; k2.layoutGrow = 1; add(pgc, [two, 'FILL']);
add(vp, [bar, 'FILL'], [pgc, 'FILL']);
const l13 = await cell({ id: 'L-13', mod: 'Progress · Route change', title: 'Page navigation — top progress bar', kind: '4 px bar + section skeletons', stage: [[vp, 'FILL']],
  trigger: 'Client-side navigation where the next route needs data (e.g. Lobby → Global Pool).',
  copy: 'No text: a 4 px mint bar at the top of the viewport, then the page title renders and sections shimmer.',
  recovery: 'Back and forward stay usable; a second navigation cancels the first.',
  dev: 'Bar appears after 150 ms and trickles to 80 % until data resolves; aria-hidden, while the main region gets aria-busy.' });
await row(body, 'Row 8 — Reconnect · Route', [l12, l13]);

restack(sec); fitSection(sec);
for (const r of body.children.filter(n => /^Row [5678]/.test(n.name))) await r.screenshot({ scale: 0.55 });
const e1 = sec.findChild(n => n.name.startsWith('[ERR-01]')); await e1.findOne(n => n.name === 'Row 7 — Game history · Admin search').screenshot({ scale: 0.5 });
return { board: B.id, size: [B.width, B.height], l05fixed: !!c05, rows: body.children.map(r => ({ id: r.id, name: r.name, h: Math.round(r.height) })), boards: sec.children.map(b => ({ name: b.name, id: b.id, y: b.y, h: b.height })), sec: [sec.width, sec.height] };
