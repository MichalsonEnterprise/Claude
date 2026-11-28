for (const [ID, MODE, col] of [['AUTH-05', 'Request (default)', 0], ['AUTH-05', 'Sent', 0], ['AUTH-06', 'Strength (default)', 1], ['AUTH-06', 'Expired link', 1], ['AUTH-06', 'Success', 1]]) {
await FRAME('[' + ID + '] ' + (ID === 'AUTH-05' ? 'Forgot Password' : 'Reset Password') + ' / 390 / ' + MODE, col, { mobile: true }, async ({ fr, db }) => {
  const bg = await MBG(fr, { auth: 'Guest', tab: 'Home' });
  const s = await SHEET(ID + ' ' + MODE);
  if (ID === 'AUTH-05' && MODE === 'Sent') {
    await SHEAD(s, 'Check your inbox', { back: true });
    add(s, await P('If nova.k@example.com belongs to a GLOBAL POOL account, a reset link is on its way. We show this same message for every address.', 'Body/S', 'text/secondary'));
    add(s, [await BOX('Email details', [await KV('Sent', '16:31 UTC · 27 Nov 2026', { demo: true }), await KV('From', 'no-reply@globalpool.example'), await KV('Works until', '17:01 UTC · single use', { line: false })]), 'FILL']);
    add(s, [await BUL('shield-check', 'icon/brand', 'Look for your anti-phishing code', 'Real emails from us always show the code you chose. No code — don’t tap.'), 'FILL']);
    await STICKY(s, [await BTN('Primary', 'Open email app', { size: 'L', lead: 'mail' }), await BTN('Secondary', 'Resend at 16:32 UTC', { size: 'L', state: 'Disabled', lead: 'refresh' })]);
  } else if (ID === 'AUTH-05') {
    await SHEAD(s, 'Reset your password', { back: true });
    add(s, await P('Enter the email you use for GLOBAL POOL. If it matches an account, we’ll email you a link that works once for 30 minutes.', 'Body/S', 'text/secondary'));
    add(s, [await INPUT('Email address', 'nova.k@example.com', 'Focus'), 'FILL']);
    add(s, [await NOTE('info', 'For your privacy we show the same confirmation whether or not an account uses this email.'), 'FILL']);
    add(s, [await BUL('help-circle', 'icon/brand', 'Can’t open this inbox any more?', 'Start account recovery instead.'), 'FILL']);
    await STICKY(s, [await BTN('Primary', 'Send reset link', { size: 'L', lead: 'mail' }), await BTN('Ghost', 'Back to sign in', { size: 'L' })]);
  } else if (MODE === 'Expired link') {
    await SHEAD(s, 'This link has expired');
    add(s, await TILE('hourglass', 'warning', 48));
    add(s, await P('Reset links work once and for 30 minutes. This one was sent at 16:31 UTC and expired at 17:01 UTC (27 Nov 2026). Your password hasn’t changed.', 'Body/S', 'text/secondary'));
    add(s, [await INPUT('Send a new link to', 'nova.k@example.com', 'Filled'), 'FILL']);
    add(s, [await NOTE('mail', 'Each new link replaces the previous one — always use the newest email.'), 'FILL']);
    await STICKY(s, [await BTN('Primary', 'Send a new link', { size: 'L', lead: 'mail' }), await BTN('Ghost', 'Start account recovery', { size: 'L' })]);
  } else if (MODE === 'Success') {
    await SHEAD(s, 'Password updated');
    add(s, await TILE('check-circle', 'success', 48));
    add(s, await P('Saved 27 Nov 2026, 16:40 UTC. We’ve emailed n•••@example.com to confirm.', 'Body/S', 'text/secondary'));
    add(s, [await BUL('logout', 'text/success', 'Signed out on 2 other devices', 'iPhone 15 · Safari and Windows · Edge.'), 'FILL'], [await BUL('shield-check', 'text/success', '2FA still on', 'Your authenticator and backup codes keep working.'), 'FILL']);
    add(s, [await ALERT('warning', 'Withdrawals pause until 28 Nov, 16:40 UTC', '24-hour hold after a password reset. Deposits, games and entries work as normal.', { icon: 'clock' }), 'FILL']);
    await STICKY(s, [await BTN('Primary', 'Sign in with new password', { size: 'L', lead: 'log-in' })]);
  } else {
    await SHEAD(s, 'Choose a new password');
    add(s, await P('For n•••@example.com · link works until 17:01 UTC.', 'Body/S', 'text/secondary'));
    add(s, [await PWD('New password', 'Focus', 'Fair', { strength: true, req: true }), 'FILL']);
    add(s, [await PWD('Confirm new password', 'Default', 'Empty'), 'FILL']);
    add(s, [await NOTE('info', 'Saving signs out your other devices and pauses withdrawals for 24 h (until 28 Nov, 16:40 UTC).', { ic: 'text/info' }), 'FILL']);
    await STICKY(s, [await BTN('Primary', 'Save new password', { size: 'L', state: 'Disabled' })]);
  }
  MPLACE(fr, db, bg, s);
}); }
