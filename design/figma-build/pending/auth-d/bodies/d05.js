for (const MODE of ['Request (default)', 'Sent', 'Error — too many requests']) {
await FRAME('[AUTH-05] Forgot Password / 1440 / ' + MODE, 0, {}, async ({ fr, db }) => {
  const SENT = MODE === 'Sent', ERR = MODE.startsWith('Error');
  const bg = await LOBBYBG(fr, db, { auth: 'Guest', top: 'Guest', label: 'guest lobby behind password-help dialog' });
  const panel = await PANEL({ over: 'PASSWORD HELP', oicon: 'key', title: 'Locked out? We’ll get you back in.', sub: 'Reset links come by email, work once and expire after 30 minutes. Your balance, entries and withdrawals are untouched while you reset.', artName: 'reset email in an inbox (DEMO)', artH: 280,
    art: async (a) => { BLOCKS(a, SENT ? 'status/success' : 'brand/primary'); await MAILCARD(a, 70, 30, -5, { subject: 'Reset your GLOBAL POOL password', lines: ['Requested 27 Nov 2026, 16:31 UTC · works once, until 17:01 UTC', 'Didn’t ask? Ignore this email — nothing changes.'], cta: 'Choose a new password' }); },
    body: async (b) => { add(b, [await BUL('shield-check', 'icon/brand', 'Look for your anti-phishing code', 'Every real email from us shows the code you chose in Security settings. No code — don’t click.'), 'FILL'], [await BUL('alert-triangle', 'text/warning', 'We never ask for your password', 'Not by email, chat or phone. Reset links only open globalpool.example.'), 'FILL']); } });
  const form = FORM();
  if (SENT) {
    await FHEAD(form, { back: 'Back to sign in', icon: 'mail', tone: 'success', over: 'EMAIL SENT', title: 'Check your inbox', sub: 'If nova.k@example.com belongs to a GLOBAL POOL account, a reset link is on its way. For your privacy we show this same message for every address.' });
    add(form, [await BOX('Email details', [await KV('Sent to', 'nova.k@example.com', { demo: true }), await KV('From', 'no-reply@globalpool.example'), await KV('Sent', '27 Nov 2026, 16:31 UTC'), await KV('Link works until', '17:01 UTC · single use', { line: false })]), 'FILL']);
    add(form, [await BUL('search', 'icon/brand', 'Nothing after 5 minutes?', 'Check spam and promotions folders. Sending a new link cancels the previous one.'), 'FILL']);
    const rs = ROW('Resend', [await BTN('Secondary', 'Resend link', { state: 'Disabled', lead: 'refresh' }), await P('Available at 16:32 UTC — 60 s after the last email', 'Caption', 'text/tertiary')], { gap: 12 }); add(form, [rs, 'FILL']);
    await ACTIONS(form, [await BTN('Ghost', 'Use a different email', { size: 'L' })], [await BTN('Primary', 'Back to sign in', { size: 'L', lead: 'log-in' })]);
  } else {
    await FHEAD(form, { back: 'Back to sign in', icon: 'key', tone: ERR ? 'danger' : 'brand', over: 'FORGOT PASSWORD', title: 'Reset your password', sub: 'Enter the email address you use for GLOBAL POOL. If it matches an account, we’ll email you a link to choose a new password.' });
    if (ERR) add(form, [await ALERT('danger', 'Too many reset requests', 'We’ve sent 3 links to this address in the last 15 minutes. To protect the account you can ask again at 16:46 UTC (27 Nov 2026). The newest link still works until 17:01 UTC.', { icon: 'ban' }), 'FILL']);
    add(form, [await INPUT('Email address', 'nova.k@example.com', ERR ? 'Filled' : 'Focus'), 'FILL']);
    add(form, [await NOTE('info', 'For your privacy we show the same confirmation whether or not an account uses this email.'), 'FILL']);
    add(form, [await BUL('wallet', 'icon/brand', 'Signed up with a wallet?', 'Wallet-first accounts have no password — sign in with your wallet instead.'), 'FILL'], [await BUL('help-circle', 'icon/brand', 'Can’t open this inbox any more?', 'Start account recovery — we’ll verify your identity instead of your email.'), 'FILL']);
    await ACTIONS(form, [await BTN('Ghost', ERR ? 'Start account recovery' : 'Back to sign in', { size: 'L' })], [await BTN('Primary', 'Send reset link', { size: 'L', lead: 'mail', state: ERR ? 'Disabled' : 'Default' })]);
  }
  await TWOPANE(fr, bg, panel, form, 'Dialog — Forgot password (' + MODE + ')');
}); }
