// ERR-07 board — Security warnings library (P0)
let m71, a76, n76, ad73;
const { sec, f } = await board({
  col: 3, id: 'ERR-07', pri: 'P0',
  frameName: '[ERR-07] Security warnings library — wrong network, new address, phishing, suspicious sign-in / 1440 / Board',
  title: 'Security warnings library — wrong network, new address, phishing, suspicious sign-in',
  desc: 'Warnings that protect funds and accounts. They appear before the risky step, explain the risk in one sentence, and offer the safe action first. Every security message carries the player’s anti-phishing code so fake messages are easy to spot.',
  rules: [
    'Warn before the risky step, not after it.',
    'Security alerts can’t be dismissed until the player chooses an action.',
    'The anti-phishing code AURORA-27 appears in every email and every 2FA prompt.',
    'We never ask for a seed phrase, private key or 2FA code — by chat, email, phone or DM.',
    'Holds and cooldowns show their exact end time and can’t be skipped, not even by support or VIP status.'
  ],
  map: [
    ['wallet.chainId ∉ supported', '07.1 Wrong network — wallet'],
    ['deposit network ≠ wallet chain', '07.2 Wrong network or token — deposit'],
    ['withdraw.to ∉ whitelist', '07.3 New address — 24 h hold'],
    ['security email · 2FA prompt', '07.4 Anti-phishing code'],
    ['link.domain ∉ allow-list', '07.5 Leaving GLOBAL POOL'],
    ['risk.login = new device / city', '07.6 Suspicious sign-in']
  ],
  cells: [
    { no: '07.1', sev: 'Warning', name: 'Wrong network — connected wallet', lib: 'Modal/Connect Wallet · State=Wrong network · Button/Wallet · Wrong network',
      stage: async () => { m71 = await I('27:16569', { State: 'Wrong network' }); const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(r, await I('7:859', { Size: 'M', State: 'Wrong network' }), await T('Top-bar wallet button while the wallet is on an unsupported chain', 'Caption', 'text/tertiary')); return [m71, r]; },
      trigger: 'The connected wallet reports a chain we don’t support (example: chain ID 10), or a different chain from the one the current step needs (e.g. Arbitrum withdrawal while the wallet is on BNB Chain).',
      where: 'Connect Wallet modal, top-bar wallet button, and any step that needs a wallet signature.',
      copy: async () => [['Title', txt(m71, 'Title')], ['Body', txt(m71, 'Description')], ['Network tag', txt(m71, 'Tag label')]],
      actions: [['Primary', 'Switch to Arbitrum', 'Wallet switch-network prompt; returns to the same step once switched'], ['Secondary', 'Disconnect', 'Disconnects the wallet — platform balance is unaffected']],
      notes: ['Balances, history and entries paid from the platform balance keep working — only on-chain signatures wait.', '“We never ask for your seed phrase” is shown in every state of the modal.', 'Solana is supported through Phantom only.'] },
    { no: '07.2', sev: 'Warning', name: 'Wrong network or token — deposit', lib: 'Alert/Banner · Warning · Inline (copy + action overridden, close hidden) · Wallet/Network Pill · Token/USDT',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Warning', Layout: 'Inline' }); await ov(a, 'Title', 'Send USDT on Arbitrum One only'); await ov(a, 'Body', 'This address accepts USDT on Arbitrum One only. Other tokens, or USDT sent on another network, can’t be credited automatically and may be lost. Check the network in your wallet before you send.'); relabel(a, 'Switch network', 'Change network'); hide(a, 'Close');
        const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const tk = AL('HORIZONTAL', { gap: 6, p: [4, 10], fill: 'surface/raised', stroke: 'border/default', r: 9999, align: 'CENTER' }); add(tk, await CHAIN('USDT', 16), await T('USDT · Arbitrum One', 'Label/S', 'text/primary'));
        add(r, await I('9:377', { Chain: 'Arbitrum', Status: 'Operational' }, { 'Show status label': true, 'Show chevron': true }), tk, await T('Only this pair is accepted at this address', 'Caption', 'text/tertiary'));
        return [a, r]; },
      trigger: 'Always shown on deposit steps 3–4 (address and QR); becomes a confirm-before-copy step when the connected wallet’s chain differs from the selected deposit network.',
      copy: [['Title', 'Send USDT on Arbitrum One only'], ['Body', 'This address accepts USDT on Arbitrum One only. Other tokens, or USDT sent on another network, can’t be credited automatically and may be lost. Check the network in your wallet before you send.'], ['Pair label', 'USDT · Arbitrum One']],
      actions: [['Secondary', 'Change network', 'Deposit step 1 — network picker with fees and confirmations']],
      notes: ['Address format is validated per chain (0x… for EVM networks, base58 for Solana) before an address is shown or accepted.', 'Unrecognised tokens follow the recovery flow in the deposit states — never silently ignored.', 'Not dismissible on the address and QR steps.'] },
    { no: '07.3', sev: 'Security', name: 'New withdrawal address — 24 h security hold', lib: 'Input/Address · State=New address · Button/Primary · Button/Secondary · inline email notice',
      stage: async () => {
        ad73 = await I('15:3617', { State: 'New address' });
        const br = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(br, await BTN('Primary', 'Use 0x7c4e…a21D (whitelisted)', { lead: 'shield-check' }), await BTN('Secondary', 'Add to whitelist'));
        const nt = await note('mail', 'We emailed n•••@example.com about this address. The email shows your anti-phishing code AURORA-27.', 460, 'surface/default', 'icon/brand');
        const dm = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dm, await DEMO('S'), await T('Addresses and times illustrative', 'Caption', 'text/tertiary'));
        return [ad73, nt, br, dm]; },
      trigger: 'The withdrawal destination (0x3f9a…c47E) isn’t on the whitelist. Whitelisting needs 2FA + email confirmation and starts a 24 h hold; withdrawals to it unlock afterwards.',
      where: 'Withdraw step 3 (Address), Account › Security › Withdrawal whitelist.',
      copy: async () => [['Warning title', txt(ad73, 'Warning title')], ['Warning body', txt(ad73, 'Warning body')], ['Email notice', 'We emailed n•••@example.com about this address. The email shows your anti-phishing code AURORA-27.']],
      actions: [['Primary', 'Use 0x7c4e…a21D (whitelisted)', 'Selects the address whitelisted on 14 Oct 2026'], ['Secondary', 'Add to whitelist', 'Modal/2FA + email link, then the 24 h hold starts'], ['Ghost', 'Cancel', 'Back to the withdrawal amount, nothing saved']],
      notes: ['The hold can’t be shortened by support or VIP status.', 'Removing an address is instant; adding one always starts a new 24 h hold.', 'Full screens: withdraw address step, New address state (page 06).'] },
    { no: '07.4', sev: 'Security', name: 'Anti-phishing code — spot fake messages', lib: 'Inline security-email preview · Badge/DEMO · Button/Secondary · Button/Ghost',
      stage: async () => {
        const em = AL('VERTICAL', { name: 'Security email preview', gap: 16, p: 24, fill: 'surface/raised', stroke: 'border/subtle', r: 14, w: 600 });
        for (const [k, v] of [['From', 'GLOBAL POOL Security <security@example.com>'], ['Subject', 'Confirm your new withdrawal address']]) { const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(r, await T(k, 'Caption', 'text/tertiary', { w: 64 }), await T(v, 'Body/S', 'text/primary')); add(em, r); }
        const code = AL('HORIZONTAL', { name: 'Code block', gap: 12, p: [12, 16], fill: 'brand/tint-subtle', stroke: 'border/brand', r: 10, align: 'CENTER' });
        const cv = AL('VERTICAL', { gap: 2 }); add(cv, await T('YOUR ANTI-PHISHING CODE', 'Overline', 'text/tertiary'), await T('AURORA-27', 'Mono/M', 'text/brand')); add(code, await IC('shield-check', 20, 'icon/brand'), cv, await DEMO('S')); add(em, [code, 'FILL']);
        add(em, await T('You asked to whitelist 0x3f9a…c47E on Arbitrum. If this wasn’t you, don’t click anything in this email — open the GLOBAL POOL app and secure your account.', 'Body/S', 'text/secondary', { w: 552 }));
        add(em, [await note('alert-triangle', 'No code, or a different one? It isn’t from us. Forward it to security@example.com and delete it.', 552, 'status/warning-tint', 'text/warning'), 'FILL']);
        return [em]; },
      trigger: 'Every email we send (security, transactions and marketing) and every in-app 2FA prompt shows the player’s code AURORA-27, set in Account › Security.',
      copy: [['Code block', 'YOUR ANTI-PHISHING CODE · AURORA-27'], ['Email warning', 'No code, or a different one? It isn’t from us. Forward it to security@example.com and delete it.'], ['In-app caption (Modal/2FA)', 'Only GLOBAL POOL shows this code. If it’s missing or different, close this window and contact support.']],
      actions: [['Secondary', 'Report phishing', 'In-app report form (or forward to security@example.com)'], ['Ghost', 'Change code', 'Account › Security › Anti-phishing code — 2FA required']],
      notes: ['Changing the code needs 2FA and sends a confirmation to the account email.', 'security@example.com is a placeholder address (DEMO).'] },
    { no: '07.5', sev: 'Warning', name: 'Leaving GLOBAL POOL — unverified link', lib: 'Inline link-check dialog over scrim · Button/Primary · Button/Ghost',
      stage: async () => {
        const dr = AL('HORIZONTAL', { gap: 12, align: 'CENTER', wrap: true, cgap: 8 }); add(dr, await chip('globalpool-bonus.example'), await stat('alert-triangle', 'Not a GLOBAL POOL domain', 'text/warning'));
        const p = await panel({ w: 520, modal: true, icon: 'external-link', bg: 'status/warning-tint', fg: 'text/warning', title: 'You’re leaving GLOBAL POOL', body: 'globalpool-bonus.example isn’t one of our sites. We never ask for your seed phrase, private key or 2FA codes, and support never messages you first.', extra: [dr, [await note('shield', 'Our official domains are listed on the Security page.', 472), 'FILL']], btns: [['Primary', 'Go back to GLOBAL POOL'], ['Ghost', 'Continue to site']] });
        const scr = AL('VERTICAL', { name: 'Scrim (dimmed page)', p: 32, fill: 'scrim/overlay', r: 14, align: 'CENTER', w: 720 }); add(scr, p); return [scr]; },
      trigger: 'A player opens an external link from chat, a profile, an announcement or a pasted URL whose domain isn’t on the allow-list. Known phishing domains are blocked outright.',
      copy: [['Title', 'You’re leaving GLOBAL POOL'], ['Body', 'globalpool-bonus.example isn’t one of our sites. We never ask for your seed phrase, private key or 2FA codes, and support never messages you first.'], ['Domain status', 'Not a GLOBAL POOL domain'], ['Known phishing variant', 'This site has been reported as phishing. We’ve blocked it to protect your account.']],
      actions: [['Primary', 'Go back to GLOBAL POOL', 'Previous page'], ['Ghost', 'Continue to site', 'Opens in a new tab (noopener) — removed for known phishing domains']],
      notes: ['Look-alike domains (e.g. g1obalpool) are flagged even before anyone reports them.', 'The safe action is primary and focused by default.'] },
    { no: '07.6', sev: 'Security', name: 'Suspicious sign-in — new device', lib: 'Alert/Banner · Security · Inline (time aligned to the device record) · User/Notification Item · Security',
      stage: async () => {
        a76 = await I('30:17116', { Type: 'Security', Layout: 'Inline' }); await ov(a76, 'Body', '25 Nov 2026, 19:06 UTC. If this wasn’t you, secure your account now. Withdrawals requested from a new device are held for 24 h.');
        n76 = await I('23:11317', { Type: 'Security', Read: 'No' });
        return [a76, n76]; },
      trigger: 'Risk engine flags a sign-in from a new device and city (Windows · Edge · Madrid, 25 Nov 2026, 19:06 UTC) for @nova.k, whose usual devices are in Lisbon.',
      where: 'Banner on every page until answered, notification centre, and an email with AURORA-27.',
      copy: async () => [['Title', txt(a76, 'Title')], ['Body', txt(a76, 'Body')], ['Notification', txt(n76, 'Title') + ' — ' + txt(n76, 'Body')]],
      actions: [['Primary', 'Secure account', 'Signs out every other session, then password reset and 2FA check'], ['Ghost', 'This was me', 'Marks the device trusted after a 2FA check']],
      notes: ['Not dismissible until the player picks an action.', 'Withdrawals requested from the new device are held 24 h either way.', 'Full screens: [AUTH-21] New-device Login Alert (1440, 390); devices list in Account & security.'] }
  ],
  extra: async () => {
    const c = AL('VERTICAL', { name: 'We will never ask', gap: 16, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: CW });
    add(c, await T('We will never ask you to…', 'Heading/H4', 'text/primary'), await T('Shown on the Security page, in the help centre and linked from every warning above. Reused as-is in support macros.', 'Body/S', 'text/secondary', { w: 900 }));
    const g = AL('HORIZONTAL', { name: 'Never list', gap: 12, wrap: true, cgap: 12, w: 1264 });
    for (const s of ['Share your seed phrase or private key', 'Read out a 2FA or email code', 'Install remote-access software', 'Pay a fee to “unlock” a withdrawal', 'Send funds to a “verification” address', 'Sign a wallet message you don’t recognise']) { const it = AL('HORIZONTAL', { gap: 10, p: [12, 16], fill: 'surface/raised', stroke: 'border/default', r: 10, align: 'CENTER', w: 413 }); add(it, await IC('ban', 18, 'text/danger'), await T(s, 'Body/S', 'text/primary', { w: 350 })); add(g, it); }
    add(c, g);
    return c;
  },
  related: ['[AUTH-09] Connect Wallet / Wrong network / 1440 + 390 (pages 04, 10)', '[AUTH-21] New-device Login Alert / 1440 + 390 (pages 04, 10)', '[WAL-12/13] Withdraw — address step / New address (page 06)', '[WAL-04/05] Deposit — network and address steps (page 06)', '[USR-A] Account & security — anti-phishing code, devices, withdrawal whitelist (page 05)']
});
fitSection(sec);
const flags = audit(f);
await f.screenshot({ scale: 0.5 });
return { section: sec.id, frame: f.id, name: f.name, x: f.x, w: f.width, h: f.height, flags };
