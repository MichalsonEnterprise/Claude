// ERR-04 board — Permission, session & connectivity states
const { sec, f } = await board({
  col: 0, id: 'ERR-04', pri: 'P1',
  frameName: '[ERR-04] Permission, session & offline states / 1440 / Board',
  title: 'Permission, session & connectivity states',
  desc: 'What players and admins see when access is refused, a session ends or the connection drops. Each state says what happened, confirms that balances and entries are safe, and offers one clear next step. Previews are library instances with per-state copy overrides.',
  rules: [
    'Money and entries are never lost or duplicated: every write carries an idempotency key, and after a drop we show the server’s answer, not a guess.',
    'Say what happened, what is safe and the one next step — never a bare 401, 403 or “Something went wrong”.',
    'After signing in again, players land on the same page; drafts are kept except passwords and codes.',
    'Permission messages name the level or role that is needed and how to get it.',
    'Status is always icon + label, never colour alone.'
  ],
  map: [
    ['403 kyc_level_required', '04.1 Verification level required'],
    ['403 role_forbidden · admin RBAC', '04.2 Admin — no access'],
    ['401 session_expired · idle 30 min', '04.3 Session expired'],
    ['401 step_up_required · 2FA > 15 min', '04.4 Confirm it’s you'],
    ['offline · WebSocket closed > 5 s', '04.5 Offline, reconnecting'],
    ['reconnected · request state unknown', '04.6 Back online / check before retry']
  ],
  cells: [
    { no: '04.1', sev: 'Restricted', name: 'Verification level required (player)', lib: 'Inline gate card · User/KYC Status Chip ×2 · Button/Primary · Button/Ghost — DEMO scenario: Level 1 account',
      stage: async () => { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await I('23:5565', { Status: 'Approved', Level: 'L1' }), await IC('arrow-right', 16, 'icon/muted'), await I('23:5565', { Status: 'Not started', Level: 'L2' }), await DEMO('S'));
        return [await panel({ w: 560, icon: 'id-card', bg: 'status/warning-tint', fg: 'text/warning', title: 'Level 2 verification needed', body: 'Withdrawals above 2,000.00 USDT a day need KYC Level 2 (photo ID + liveness check). Until then you can still withdraw up to 2,000.00 USDT today — your balance stays fully available.', extra: [r], btns: [['Primary', 'Verify identity', 'id-card'], ['Ghost', 'Withdraw up to 2,000.00']] })]; },
      trigger: 'API returns 403 kyc_level_required when a Level 1 account (separate DEMO scenario) asks to withdraw more than its daily limit, or opens referral payouts (Level 2 + 2FA required).',
      where: 'Inline, in place of the step that was refused (withdraw step 4, referral payout dialog).',
      copy: [['Title', 'Level 2 verification needed'], ['Body', 'Withdrawals above 2,000.00 USDT a day need KYC Level 2 (photo ID + liveness check). Until then you can still withdraw up to 2,000.00 USDT today — your balance stays fully available.'], ['Status chips', 'KYC L1 · Approved → KYC L2 · Not started']],
      actions: [['Primary', 'Verify identity', 'KYC Level 2 step (AUTH-11…17), then back to the withdrawal'], ['Ghost', 'Withdraw up to 2,000.00', 'Withdraw step 4 with the amount capped at the Level 1 limit']],
      notes: ['Never a bare “403”: the card names the level and what it unlocks.', 'Deposits and play are not blocked by this gate.', 'While Level 2 is being reviewed, the card shows KYC Pending instead.'] },
    { no: '04.2', sev: 'Restricted', name: 'Admin — role does not include this module', lib: 'Nav/Admin Item (Default · Child · No access) · Admin/Role Chip ×2 · inline no-access card',
      stage: async () => {
        const nav = AL('VERTICAL', { name: 'Admin nav (excerpt)', gap: 2, p: 8, fill: 'bg/secondary', stroke: 'border/subtle', r: 14, w: 248 });
        for (const [v, p] of [[{ Level: 'Group', State: 'Default' }, { Label: 'Finance', Icon: ICONS.wallet }], [{ Level: 'Child', State: 'Default' }, { Label: 'Withdrawals' }], [{ Level: 'Group', State: 'No access' }, { Label: 'Marketing', Icon: ICONS.megaphone }], [{ Level: 'Group', State: 'No access' }, { Label: 'System', Icon: ICONS.server }]]) add(nav, [await I('22:5497', v, p), 'FILL']);
        const rr = AL('HORIZONTAL', { gap: 8, align: 'CENTER', wrap: true, cgap: 8 }); add(rr, await T('Your role', 'Caption', 'text/tertiary'), await I('23:18440', { Role: 'Finance', Size: 'M' }), await T('Needed', 'Caption', 'text/tertiary'), await I('23:18440', { Role: 'Super Admin', Size: 'M' }), await DEMO('S'));
        const pn = await panel({ w: 456, icon: 'lock', bg: 'status/warning-tint', fg: 'text/warning', title: 'You don’t have access to System', body: 'System settings are limited to the Super Admin role. Ask S. Iyer for access — requests need a second approver and are recorded in the audit log.', extra: [[rr, 'FILL']], btns: [['Primary', 'Request access'], ['Secondary', 'Back to Finance']], bs: 'S' });
        const row = AL('HORIZONTAL', { gap: 16, align: 'MIN' }); add(row, nav, pn); return [row]; },
      trigger: 'Admin RBAC returns 403 role_forbidden — e.g. A. Marin (Finance Lead) opens System › Settings from a shared link. Modules outside the role show the “No access” lock in the sidebar.',
      copy: [['Title', 'You don’t have access to System'], ['Body', 'System settings are limited to the Super Admin role. Ask S. Iyer for access — requests need a second approver and are recorded in the audit log.'], ['Role chips', 'Your role · Finance → Needed · Super Admin']],
      actions: [['Primary', 'Request access', 'Access request in Approvals (ADM-00) with a mandatory reason, four-eyes'], ['Secondary', 'Back to Finance', 'Finance overview']],
      notes: ['Checked server-side: restricted data is never sent to the browser behind the message.', 'Every denied attempt is written to the audit log (actor, module, time).', 'Read-only roles get the same card titled “Read-only access”.'] },
    { no: '04.3', sev: 'Advisory', name: 'Session expired', lib: 'Inline re-auth dialog over scrim · Input/Text (Filled) · Input/Password · Button/Primary · Button/Ghost',
      stage: async () => {
        const em = await I('13:762', { State: 'Filled', Size: 'M' }, { Label: 'Email', 'Show helper': false }); await ov(em, 'Value text', 'n•••@example.com');
        const pw = await I('14:1735', { State: 'Default', Strength: 'Empty' }, { Label: 'Password', 'Show strength': false, 'Show requirements': false }); await ov(pw, 'Value text', 'Enter your password');
        const safe = await note('shield-check', 'Your balances, 35 entries in round #1,248 (closes 20:00 UTC) and withdrawal WD-20931 are exactly as you left them.', 392, 'status/success-tint', 'text/success');
        const dm = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dm, await DEMO('S'), await T('Values illustrative', 'Caption', 'text/tertiary'));
        const pn = await panel({ w: 440, modal: true, icon: 'clock', bg: 'status/info-tint', fg: 'text/info', title: 'You were signed out to keep your account safe', body: 'No activity for 30 minutes — last activity 27 Nov 2026, 18:12 UTC. Sign in again and we’ll bring you back to where you were.', extra: [[safe, 'FILL'], [em, 'FILL'], [pw, 'FILL'], dm], btns: [['Primary', 'Sign in', 'log-in'], ['Ghost', 'Go to lobby']] });
        const scr = AL('VERTICAL', { name: 'Scrim (dimmed page)', p: 32, fill: 'scrim/overlay', r: 14, align: 'CENTER', w: 720 }); add(scr, pn); return [scr]; },
      trigger: 'API returns 401 session_expired: no activity for 30 minutes (timeout set in Security settings) or the refresh token expired. Raised by the idle timer or the next request.',
      copy: [['Title', 'You were signed out to keep your account safe'], ['Body', 'No activity for 30 minutes — last activity 27 Nov 2026, 18:12 UTC. Sign in again and we’ll bring you back to where you were.'], ['Reassurance', 'Your balances, 35 entries in round #1,248 (closes 20:00 UTC) and withdrawal WD-20931 are exactly as you left them.']],
      actions: [['Primary', 'Sign in', 'Password, then authenticator code (AUTH-08); returns to the same page'], ['Ghost', 'Go to lobby', 'Signed-out lobby']],
      notes: ['Form drafts are kept (never passwords or 2FA codes); open bet slips are cleared — nothing is placed.', 'Live data stops behind the scrim; balances are re-fetched after sign-in.', 'Full screens: [AUTH-20] Session Expired / Re-auth Modal (1440, 390).'] },
    { no: '04.4', sev: 'Security', name: 'Confirm it’s you (step-up re-auth)', lib: 'Modal/2FA · State=Default (title, description and primary label overridden)',
      stage: async () => { const m = await I('25:16745', { State: 'Default' }); await ov(m, 'Title', 'Confirm it’s you'); await ov(m, 'Description', 'Adding a new withdrawal address needs a fresh 2FA check. Your last check was 47 min ago.'); relabel(m, 'Confirm withdrawal', 'Confirm'); return [m]; },
      trigger: 'API returns 401 step_up_required when the last 2FA check is older than 15 minutes and the player adds or removes a whitelisted address, changes email, password or 2FA, raises a limit or reveals backup codes.',
      copy: [['Title', 'Confirm it’s you'], ['Body', 'Adding a new withdrawal address needs a fresh 2FA check. Your last check was 47 min ago.'], ['Anti-phishing block', 'YOUR ANTI-PHISHING CODE · AURORA-27']],
      actions: [['Primary', 'Confirm', 'Completes the original action — the player doesn’t start again'], ['Secondary', 'Cancel', 'Back to the form, nothing changed'], ['Ghost', 'Use backup code', 'Backup-code entry; “Lost your device?” opens recovery (AUTH-19)']],
      notes: ['5 wrong codes lock 2FA for 15 minutes (Modal/2FA · Locked) — the lock end time is shown.', 'The anti-phishing code is always shown so players can spot fake prompts.'] },
    { no: '04.5', sev: 'Warning', name: 'Offline — reconnecting', lib: 'Alert/Banner · Warning · Inline (copy + action overridden, close hidden) · Button/Gold · Disabled',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Warning', Layout: 'Inline' }); await ov(a, 'Title', 'You’re offline'); await ov(a, 'Body', 'We can’t reach GLOBAL POOL. Figures on this page are from 18:42 UTC and may be out of date. Entries, bets and withdrawals are paused until you’re back — nothing is sent twice.'); relabel(a, 'Switch network', 'Try again'); hide(a, 'Close');
        const r = AL('HORIZONTAL', { gap: 16, align: 'CENTER' }); add(r, await stat('wifi-off', 'Offline', 'text/warning'), await T('Reconnecting automatically · attempt 3 · next try in 8 s', 'Body/S', 'text/secondary'), await DEMO('S'));
        return [a, r, await BTN('Gold', 'Reconnect to enter', { size: 'L', state: 'Disabled' })]; },
      trigger: 'The browser reports offline, or the live WebSocket has been closed for more than 5 s and two REST retries failed.',
      where: 'Pinned under the top bar on every page; money buttons switch to their Disabled state.',
      copy: [['Title', 'You’re offline'], ['Body', 'We can’t reach GLOBAL POOL. Figures on this page are from 18:42 UTC and may be out of date. Entries, bets and withdrawals are paused until you’re back — nothing is sent twice.'], ['Status line', 'Reconnecting automatically · attempt 3 · next try in 8 s'], ['Disabled CTA', 'Reconnect to enter']],
      actions: [['Secondary', 'Try again', 'Immediate reconnect; otherwise back-off 2 → 4 → 8 → 16 s, max 30 s']],
      notes: ['Not dismissible while offline; replaced by the 04.6 toast on reconnect.', 'Countdowns keep running from the absolute close time (20:00 UTC) — they never freeze or reset.', 'History, limits and self-exclusion stay readable from cache.'] },
    { no: '04.6', sev: 'Recovery', name: 'Back online / check before you retry', lib: 'Toast · Success + Toast · Warning (copy overridden)',
      stage: async () => {
        const s = await I('30:16872', { Type: 'Success' }); await ov(s, 'Title', 'Back online'); await ov(s, 'Body', 'Live data refreshed at 18:44 UTC. Round #1,248 still closes at 20:00 UTC.'); await ov(s, 'Label', 'View round');
        const w = await I('30:16872', { Type: 'Warning' }); await ov(w, 'Title', 'Check before you retry'); await ov(w, 'Body', 'We lost the connection while buying 5 entries. Check My entries — if they aren’t there, nothing was charged.'); await ov(w, 'Label', 'Open My entries');
        return [s, w]; },
      trigger: 'Connection restored. Requests in flight are replayed with the same idempotency key; if the server’s answer still can’t be confirmed, the warning toast replaces any automatic retry.',
      copy: [['Success toast', 'Back online — Live data refreshed at 18:44 UTC. Round #1,248 still closes at 20:00 UTC.'], ['Warning toast', 'Check before you retry — We lost the connection while buying 5 entries. Check My entries — if they aren’t there, nothing was charged.']],
      actions: [['Ghost', 'View round', 'Global Pool round #1,248'], ['Ghost', 'Open My entries', 'Dashboard › My entries filtered to round #1,248']],
      notes: ['Success toast auto-dismisses after 6 s; the warning stays until closed.', 'Purchases are never retried automatically without the original idempotency key.'] }
  ],
  related: ['[AUTH-20] Session Expired / Re-auth Modal / 1440 + 390 (pages 04, 10)', '[AUTH-08] 2FA Challenge — Withdrawal / Default · Wrong code · Locked (page 04)', '[ADM-00] Admin shell — no permission state (page 09, Tablet 768 band)', '[AUTH-11…17] KYC verification levels and flow (page 04)']
});
fitSection(sec);
const flags = audit(f);
await f.screenshot({ scale: 0.5 });
return { section: sec.id, secX: sec.x, frame: f.id, name: f.name, w: f.width, h: f.height, flags };
