// ===== WAL-16 Step 7 Two-Factor Confirmation — content builder (st: Default | Wrong code | Locked; M: 0 desktop, 1 mobile page, 2 mobile sheet) =====
async function flow16(fc, st, M) {
  const wrong = st === 'Wrong code', lock = st === 'Locked';
  await fhead(fc, lock ? 'Withdrawals paused for 15 minutes' : 'Confirm it\'s you', lock ? 'Too many incorrect codes were entered, so we paused withdrawals to protect your account. Nothing has been sent — the 1,500.00 USDT is still in Available.' : 'Enter the 6-digit code we emailed you and the current code from your authenticator app. Both are needed to send this withdrawal.', M);
  if (lock) add(fc, [await alertBox('danger', 'Locked until 27 Nov 2026, 18:58 UTC', '5 incorrect codes in a row. You can try again in 14 minutes. Lost your authenticator? Recover access — support will never ask for your codes or password.', { icon: 'lock', actions: [await BTN('Secondary', 'Recover 2FA access', { size: 'S', lead: 'key' }), await BTN('Ghost', 'Contact support', { size: 'S', lead: 'chat' })] }), 'FILL']);
  await antiPhish(fc);
  await otp(fc, lock ? 'Disabled' : 'Complete', 'Email code', lock ? 'A new code is emailed when you try again at 18:58 UTC.' : 'Sent to n•••@example.com at 18:43 UTC · valid for 10 minutes', { status: lock ? 'Locked until 18:58 UTC' : null, resend: lock ? null : 'Resend code at 18:44 UTC' });
  await otp(fc, lock ? 'Disabled' : wrong ? 'Error' : 'Complete', 'Authenticator code', 'From your authenticator app (GLOBAL POOL · @nova.k). Codes refresh every 30 seconds.', { status: lock ? 'Locked until 18:58 UTC' : wrong ? 'That code didn\'t match — enter the newest code. 3 of 5 attempts left.' : null, resend: null });
  if (!lock) { const ln = hrow('2FA help links', 4, { wrap: true, cgap: 4 }); add(fc, [ln, 'FILL']); ln.appendChild(await BTN('Ghost', 'Use a backup code', { size: 'S', lead: 'key' })); ln.appendChild(await BTN('Ghost', 'Lost your device?', { size: 'S', lead: 'smartphone' })); }
  if (wrong) add(fc, [await alertBox('danger', 'Incorrect authenticator code', 'After 5 incorrect attempts we pause withdrawals for 15 minutes. Check that your phone sets its time automatically — a clock that\'s a minute off produces wrong codes.'), 'FILL']);
  if (lock) add(fc, [await alertBox('warning', 'Weren\'t you entering these codes?', 'Someone may know your password. Change it and sign out other devices now — it takes about a minute. Your address whitelist and 24 h cooldown stay on.', { icon: 'shield-alert', actions: [await BTN('Secondary', 'Secure my account', { size: 'S', lead: 'shield' }), await BTN('Ghost', 'Review devices', { size: 'S', lead: 'monitor' })] }), 'FILL']);
  if (M !== 2) await recap(fc, M);
  if (!lock && M !== 2) add(fc, [await alertBox('info', 'Crypto withdrawals can\'t be reversed once sent', 'Check the address and network one last time. You can still cancel from Withdrawal history until the transaction is broadcast.'), 'FILL']);
  if (lock) return { back: 'Back to wallet', next: 'Try again at 18:58 UTC', state: 'Disabled', lead: 'lock', trail: null };
  if (wrong) return { back: 'Back', next: 'Confirm withdrawal', state: 'Disabled', lead: 'lock', trail: null, note: 'Re-enter the authenticator code' };
  return { back: 'Back', next: 'Confirm withdrawal · 1,500.00 USDT', lead: 'lock', trail: null };
}
// ===== END WAL-16 builder =====
