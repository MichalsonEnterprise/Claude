for (const MODE of ['Strength (default)', 'Expired link', 'Success']) {
await FRAME('[AUTH-06] Reset Password / 1440 / ' + MODE, 1, {}, async ({ fr, db }) => {
  const EXP = MODE === 'Expired link', OK = MODE === 'Success';
  const bg = await LOBBYBG(fr, db, { auth: 'Guest', top: 'Guest', label: 'guest lobby behind reset-password dialog' });
  const panel = await PANEL({ over: 'ACCOUNT SECURITY', oicon: 'lock', title: OK ? 'Other devices were signed out' : EXP ? 'Old links stop working — on purpose' : 'A strong password protects your withdrawals', sub: OK ? 'Anyone who knew your old password has lost access. Your 2FA, balances and entries are unchanged.' : EXP ? 'A reset link works once, for 30 minutes. A stolen or forwarded email can’t be used later.' : 'Use 12+ characters you don’t use anywhere else. A password manager makes this painless.', artName: OK ? 'devices after the reset (DEMO)' : EXP ? 'expired reset email (DEMO)' : 'password strength preview (DEMO)', artH: 300,
    art: async (a) => { BLOCKS(a, OK ? 'status/success' : EXP ? 'status/warning' : 'brand/primary');
      if (OK) await DEVLIST(a, 60, 34, -4, { title: 'Signed-in devices', rows: [['MacBook Pro · Chrome', 'Lisbon · this device', ['check', 'Kept', 'success']], ['iPhone 15 · Safari', 'Lisbon', ['logout', 'Signed out', 'neutral']], ['Windows · Edge', 'Madrid', ['logout', 'Signed out', 'neutral']]] });
      else if (EXP) await MAILCARD(a, 70, 30, -5, { subject: 'Reset your GLOBAL POOL password', lines: ['Sent 27 Nov 2026, 16:31 UTC'], badge: await RB('Expired', 'Expired 17:01 UTC'), cta: 'Choose a new password', ctaType: 'Secondary' });
      else await PWCARD(a, 76, 28, -4); },
    body: async (b) => { add(b, [await BUL('smartphone', 'icon/brand', '2FA stays on', 'You’ll still confirm sign-ins with your authenticator app.'), 'FILL'], [await BUL('clock', 'text/warning', '24-hour withdrawal hold after a reset', 'Stops someone who reset your password from moving funds. Deposits, games and entries keep working.'), 'FILL']); } });
  const form = FORM();
  if (OK) {
    await FHEAD(form, { icon: 'check-circle', tone: 'success', over: 'PASSWORD UPDATED', title: 'Your new password is set', sub: 'Saved 27 Nov 2026, 16:40 UTC. We’ve emailed n•••@example.com to confirm the change.', close: false });
    add(form, [await BUL('logout', 'text/success', 'Signed out on 2 other devices', 'iPhone 15 · Safari · Lisbon and Windows · Edge · Madrid. Sign in there again with the new password.'), 'FILL'], [await BUL('shield-check', 'text/success', 'Two-factor authentication still on', 'Your authenticator app and backup codes keep working.'), 'FILL']);
    add(form, [await ALERT('warning', 'Withdrawals pause until 28 Nov 2026, 16:40 UTC', 'A 24-hour security hold applies after every password reset. Your Available balance stays in your account; deposits, games and Global Pool entries work as normal.', { icon: 'clock' }), 'FILL']);
    add(form, [await NOTE('alert-triangle', 'Didn’t change your password? Contact support now — we’ll lock the account while we check.', { ic: 'text/warning' }), 'FILL']);
    await ACTIONS(form, [await BTN('Ghost', 'Review devices', { size: 'L' })], [await BTN('Primary', 'Sign in with new password', { size: 'L', lead: 'log-in' })]);
  } else if (EXP) {
    await FHEAD(form, { back: 'Back to sign in', icon: 'hourglass', tone: 'warning', over: 'LINK EXPIRED', title: 'This reset link has expired', sub: 'Reset links work once and for 30 minutes. This one was sent at 16:31 UTC and expired at 17:01 UTC (27 Nov 2026). Your password hasn’t changed.' });
    add(form, [await INPUT('Send a new link to', 'nova.k@example.com', 'Filled'), 'FILL']);
    add(form, [await BUL('mail', 'icon/brand', 'Opened an older email?', 'Each new link replaces the previous one — always use the most recent email.'), 'FILL'], [await BUL('help-circle', 'icon/brand', 'No access to this inbox?', 'Start account recovery instead — we’ll verify your identity.'), 'FILL']);
    await ACTIONS(form, [await BTN('Ghost', 'Start account recovery', { size: 'L' })], [await BTN('Primary', 'Send a new link', { size: 'L', lead: 'mail' })]);
  } else {
    await FHEAD(form, { back: 'Back to sign in', icon: 'lock', over: 'RESET PASSWORD', title: 'Choose a new password', sub: 'For n•••@example.com. This link works once, until 17:01 UTC.' });
    add(form, [await PWD('New password', 'Focus', 'Fair', { strength: true, req: true }), 'FILL']);
    add(form, [await PWD('Confirm new password', 'Default', 'Empty'), 'FILL']);
    add(form, [await ALERT('info', 'What happens when you save', 'You’ll be signed out on your 2 other devices, and withdrawals pause for 24 hours (until 28 Nov 2026, 16:40 UTC). Deposits, games and entries aren’t affected.'), 'FILL']);
    await ACTIONS(form, [await BTN('Ghost', 'Cancel', { size: 'L' })], [await BTN('Primary', 'Save new password', { size: 'L', state: 'Disabled' })]);
    add(form, [await NOTE('info', 'Save stays disabled until the password is at least Fair and both fields match.'), 'FILL']);
  }
  await TWOPANE(fr, bg, panel, form, 'Dialog — Reset password (' + MODE + ')');
}); }
