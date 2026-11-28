const S19 = ['Start', 'Verify identity', 'Wallet recovery', 'Cooling-off notice', 'Success'];
for (const MODE of (typeof M19 !== 'undefined' ? M19 : S19)) { const k = S19.indexOf(MODE);
await FRAME('[AUTH-19] Account Recovery — Step ' + (k + 1) + ' ' + MODE + ' / 390 / Default', 3 + k, { mobile: true }, async ({ fr }) => {
  await MFLOW(fr, 'Account recovery', k === 4 ? 5 : k, 5, { over: 'STEP ' + (k + 1) + ' OF 5 · ' + MODE.toUpperCase() });
  const c = await MCONTENT(fr, 20);
  if (k === 0) {
    await MHEAD(c, { icon: 'shield-check', title: 'Recover your account', sub: 'Tell us which account it is and what you’ve lost access to.' });
    add(c, [await INPUT('Email or user ID', 'nova.k@example.com', 'Filled', { icon: 'user' }), 'FILL']);
    const g = COL('What can’t you access? (nothing pre-selected)', [], { gap: 8 }); add(g, await T('What can’t you access?', 'Label/M', 'text/primary'));
    for (const [l, d] of [['My authenticator app (2FA)', 'Lost, reset or replaced phone'], ['My email inbox', 'Can’t receive emails here any more'], ['Both', 'We’ll use your ID and verified wallet']]) add(g, [await RADIO(l, d, 'No'), 'FILL']);
    add(c, [g, 'FILL']);
    const w = await MCARD('What to expect', { icon: 'clock', tone: 'brand' }); for (const [ic, t] of [['id-card', 'ID + 30-second video selfie'], ['wallet', 'Optional: free signature with your verified wallet'], ['hourglass', 'Mandatory 48-hour withdrawal hold afterwards']]) add(w, [await BUL(ic, 'icon/brand', t, null, { ts: 'Body/S' }), 'FILL']); add(c, [w, 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Continue', { size: 'L', state: 'Disabled', trail: 'arrow-right' })]);
  } else if (k === 1) {
    await MHEAD(c, { icon: 'id-card', title: 'Confirm it’s really you', sub: 'We match your ID and a video selfie with your KYC Level 2 record (case REC-6620).' });
    await IDCARD(c, 0, 0, 0);
    const up = await I('20:9454', { State: 'Uploaded' }, { Label: 'Identity document', Description: 'Passport, ID card or driving licence · max 10 MB', 'Show privacy note': true }); await TX(up, 'File name', 'passport-photo-page.jpg'); add(c, [up, 'FILL']);
    const lv = ROW('Liveness check', [await TILE('camera', 'brand', 40), COL('Text', [await T('Selfie & liveness', 'Body/S Strong', 'text/primary'), await T('About 30 seconds', 'Caption', 'text/tertiary')], { gap: 2 }), [SPACER(), 'FILL'], await CHIP('clock', 'Not started', 'neutral')], { gap: 12, p: [12, 12, 12, 12], fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); add(c, [lv, 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Start camera', { size: 'L', lead: 'camera' }), await BTN('Ghost', 'Back', { size: 'L' })]);
  } else if (k === 2) {
    await MHEAD(c, { icon: 'wallet', title: 'Sign with your verified wallet', sub: 'Optional and free. It shortens the review from up to 24 hours to about 2.' });
    add(c, [await WALLETROW({ name: 'Browser wallet · verified', badge: await CHIP('check', 'Verified', 'success') }), 'FILL']);
    const m = COL('Recovery message (human-readable)', [], { gap: 8, p: [12, 14, 14, 14], fill: 'bg/secondary', stroke: 'border/default', r: 10 }); add(m, [ROW('Head', [await IC('file', 16, 'icon/muted'), await T('Message you’ll sign', 'Label/S', 'text/secondary'), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 8 }), 'FILL']); add(m, await P('GLOBAL POOL account recovery for GP-48213.\n\nSigning proves you control 0x12ab…9f3C. No transaction, no gas.\n\nCase: REC-6620 · Nonce: c41e07…\nIssued 17:05 UTC · expires 17:15 UTC', 'Mono/S', 'text/primary')); add(c, [m, 'FILL']);
    add(c, [await NOTE('lock', 'We never ask for your seed phrase. Anyone who does is not GLOBAL POOL.'), 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Open wallet app to sign', { size: 'L', lead: 'wallet' }), await BTN('Ghost', 'Skip — use ID only', { size: 'L' })]);
  } else if (k === 3) {
    await MHEAD(c, { icon: 'hourglass', tone: 'warning', title: 'Recovery approved — withdrawals pause for 48 hours', sub: 'Approved 27 Nov 2026, 17:12 UTC. Withdrawals and security changes unlock on 29 Nov 2026, 17:12 UTC.' });
    await HOLDCARD(c, 0, 0, 0);
    const two = await MCARD('During the hold', { icon: 'list', tone: 'brand' }); for (const s of ['Withdrawals and address changes', 'Changing email or turning off 2FA']) add(two, [await BUL('pause-circle', 'icon/muted', s, null, { ts: 'Body/S' }), 'FILL']); for (const s of ['Sign in, balances, deposits and games', 'Limits, breaks and self-exclusion']) add(two, [await BUL('check', 'text/success', s, null, { ts: 'Body/S' }), 'FILL']); add(c, [two, 'FILL']);
    add(c, [await CHECK('I understand withdrawals are paused until 29 Nov 2026, 17:12 UTC'), 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Continue', { size: 'L', state: 'Disabled', trail: 'arrow-right' }), await BTN('Ghost', 'This wasn’t me', { size: 'L' })]);
  } else {
    await MHEAD(c, { icon: 'check-circle', tone: 'success', title: 'Welcome back, Nova', sub: 'Recovered and secured — 27 Nov 2026, 17:16 UTC.' });
    for (const [t, d] of [['New password set', '17:15 UTC'], ['New authenticator linked', '10 fresh backup codes created'], ['Signed out everywhere else', 'iPhone 15 and Windows · Edge'], ['Confirmation emailed', 'Shows your anti-phishing code AURORA-27']]) add(c, [await BUL('check-circle', 'text/success', t, d), 'FILL']);
    add(c, [await ALERT('warning', 'Withdrawals unlock 29 Nov, 17:12 UTC', 'Your 9,215.30 USDT Available balance is safe. Deposits and games work within your limits.', { icon: 'clock' }), 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Go to lobby', { size: 'L', trail: 'arrow-right' }), await BTN('Ghost', 'Review security settings', { size: 'L' })]);
  }
}); }
