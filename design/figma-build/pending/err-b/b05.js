// ERR-05 board — Regulatory states (P0)
const K = { ok: ['check-circle', 'text/success'], no: ['ban', 'text/danger'], hide: ['eye-off', 'text/tertiary'], view: ['eye', 'text/info'] };
const { sec, f } = await board({
  col: 1, id: 'ERR-05', pri: 'P0',
  frameName: '[ERR-05] Regulatory states — region, licence, self-exclusion, age gate / 1440 / Board',
  title: 'Regulatory states — restricted region, licence required, self-excluded, age gate',
  desc: 'Honest, specific states for when the law or the player’s own choice stops play. Each one names the rule, keeps money and history reachable, and points to support and help organisations. None of them suggests a way around the restriction.',
  rules: [
    'Name the rule and the jurisdiction — never a vague “not available”.',
    'Never suggest a VPN, proxy, mirror domain or any other way around a restriction.',
    'Withdrawals, statements, account security and support stay open in every state.',
    'Not dismissible while the condition applies; no countdowns, offers or “play now” shortcuts.',
    'Help organisations and 18+ are visible on every regulatory state.'
  ],
  map: [
    ['geo.country ∈ restricted · IP + residence', '05.1 Banner + locked game tiles'],
    ['403 jurisdiction_blocked · play/deposit', '05.2 Blocked-action interstitial'],
    ['403 product_unlicensed · per product', '05.3 Licence required'],
    ['403 self_excluded · until 27 Nov 2027', '05.4 Self-excluded'],
    ['age_gate = under_18 · DOB < 18', '05.5 Age-gate fail'],
    ['every request · server-side checks', 'Availability matrix (below)']
  ],
  cells: [
    { no: '05.1', sev: 'Restricted', name: 'Restricted region — banner and locked games', lib: 'Alert/Banner · Regional restriction · Inline · Tile/Game · Restricted ×3 · Button/Gold · Disabled',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Regional restriction', Layout: 'Inline' });
        const r = AL('HORIZONTAL', { name: 'Locked tiles', gap: 12 }); for (const g of ['Global Pool', 'Roulette', 'Crash']) add(r, await I('23:14885', { Game: g, State: 'Restricted' }));
        return [a, r, await BTN('Gold', 'Not available in your region', { size: 'L', state: 'Disabled', lead: 'lock' })]; },
      trigger: 'Network location (IP) or declared residence is on the Restricted Countries list — example: United States. Checked at sign-in and before every deposit, bet or entry.',
      where: 'Pinned under the top bar on every page (Nav/Region Banner full width on the public site); game tiles switch to their Restricted state; Gold CTAs disabled.',
      copy: [['Title', 'Not available in your region'], ['Body', 'GLOBAL POOL games are not available in your region (United States). You can still view your account and withdraw funds.'], ['Tile overlay', 'Not available in your region'], ['Disabled CTA', 'Not available in your region']],
      actions: [['Secondary', 'Withdraw funds', 'Withdraw step 1 — to a whitelisted address'], ['Ghost', 'Restricted countries', 'Restricted Countries page with the reason per country']],
      notes: ['Not dismissible; no VPN, proxy or mirror-domain hint anywhere.', 'Location looks wrong? Support checks proof of residence — we never ask players to change their location.', 'Entries already bought stay in the draw.'] },
    { no: '05.2', sev: 'Blocking', name: 'Restricted region — blocked action interstitial', lib: 'Inline interstitial card · Button/Primary · Button/Secondary · Button/Ghost · Badge/DEMO',
      stage: async () => {
        const det = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(det, await IC('map-pin', 16, 'icon/muted'), await T('From your network location · checked 27 Nov 2026, 18:42 UTC', 'Caption', 'text/tertiary'), await DEMO('S'));
        return [await panel({ w: 640, h: 'Heading/H4', icon: 'map-pin', bg: 'status/warning-tint', fg: 'text/warning', title: 'GLOBAL POOL isn’t available in your region', body: 'Real-money games — Global Pool rounds, Originals and table games — need a licence in every country where they’re offered. We don’t hold one for the United States, so from here you can’t play, deposit or enter rounds.',
          extra: [det, [await note('globe', 'Travelling? Your account, balance and open entries are safe — access returns automatically when you’re back in a permitted country.', 592), 'FILL'], [await note('help-circle', 'Location looks wrong? Support can check it with you — we never ask you to change it.', 592), 'FILL']],
          btns: [['Primary', 'Withdraw funds', 'withdraw'], ['Secondary', 'Contact support', 'chat'], ['Ghost', 'Restricted countries']] })]; },
      trigger: 'API returns 403 jurisdiction_blocked when a player in a restricted region opens a game, deposit or Global Pool deep link (e.g. /games/orbit-rush from the United States).',
      copy: [['Title', 'GLOBAL POOL isn’t available in your region'], ['Body', 'Real-money games — Global Pool rounds, Originals and table games — need a licence in every country where they’re offered. We don’t hold one for the United States, so from here you can’t play, deposit or enter rounds.'], ['Travel note', 'Travelling? Your account, balance and open entries are safe — access returns automatically when you’re back in a permitted country.'], ['Location note', 'Location looks wrong? Support can check it with you — we never ask you to change it.']],
      actions: [['Primary', 'Withdraw funds', 'Withdraw step 1 (whitelisted address, normal security checks)'], ['Secondary', 'Contact support', 'Help centre ticket, topic “Location”'], ['Ghost', 'Restricted countries', 'Restricted Countries page']],
      notes: ['Replaces the blocked page; header, wallet and account menu stay usable.', 'Full screen: [PUB-21] Geo-block interstitial (1440, 390).'] },
    { no: '05.3', sev: 'Restricted', name: 'Licence required — product not licensed here', lib: 'Alert/Banner · Regulatory notice · Inline (copy overridden) · Notice/Licence · Card · Button/Gold · Disabled',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Regulatory notice', Layout: 'Inline' }); await ov(a, 'Title', 'Global Pool isn’t licensed where you live'); await ov(a, 'Body', 'Global Pool participation needs a separate local licence in Ontario, Canada, which we don’t hold. Entries are switched off for accounts registered there; Originals and table games stay available, and your balance and any owed refunds are unaffected.');
        return [a, await I('6:158', { Variant: 'Card' }), await BTN('Gold', 'Entries not available in Ontario', { size: 'L', state: 'Disabled', lead: 'lock' })]; },
      trigger: 'API returns 403 product_unlicensed: the player’s jurisdiction is permitted for some products but not this one (DEMO scenario: Global Pool in Ontario, Canada). Evaluated per product, not per site.',
      where: 'Global Pool hub, round pages and the participation preview; the lobby tile shows the same lock.',
      copy: [['Title', 'Global Pool isn’t licensed where you live'], ['Body', 'Global Pool participation needs a separate local licence in Ontario, Canada, which we don’t hold. Entries are switched off for accounts registered there; Originals and table games stay available, and your balance and any owed refunds are unaffected.'], ['Disabled CTA', 'Entries not available in Ontario']],
      actions: [['Ghost', 'Licence details', 'Licence & jurisdiction page (licence number placeholder, regulator, permitted regions)']],
      notes: ['The persistent licence notice (Notice/Licence) stays on every gambling surface in every state.', 'Refunds from cancelled rounds are still paid to Owed → Available.', 'No “notify me when available” marketing opt-in is pre-checked.'] },
    { no: '05.4', sev: 'Restricted', name: 'Self-excluded', lib: 'Inline account-state card · Button/Primary · Button/Secondary · Button/Ghost · RG/Help Resources',
      stage: async () => {
        const facts = await bul(['Entries bought before your break (35 in round #1,248) still settle; prizes go to Available.', 'Owed 415.20 USDT (refund + VIP reward earned before your break) settles to Available and can be withdrawn.', 'No emails, push messages or bonus offers until the break ends.'], 672);
        const dm = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dm, await DEMO('S'), await T('Values illustrative', 'Caption', 'text/tertiary'));
        const p = await panel({ w: 720, h: 'Heading/H4', icon: 'pause-circle', bg: 'status/info-tint', fg: 'text/info', title: 'You’re taking a break until 27 Nov 2027, 16:45 UTC', body: 'You chose to self-exclude on 27 Nov 2026, 16:45 UTC. Until then you can’t play, enter Global Pool rounds or deposit — and the break can’t be shortened or undone early, not even by support.', extra: [[facts, 'FILL'], dm], btns: [['Primary', 'Withdraw balance', 'withdraw'], ['Secondary', 'Download statements', 'download'], ['Ghost', 'Talk to support']] });
        return [p, await I('24:14743')]; },
      trigger: 'Account flag rg.self_excluded is active (1 year, set 27 Nov 2026, 16:45 UTC). Shown at sign-in and in place of any game, Global Pool, promotion or VIP page; API answers 403 self_excluded.',
      copy: [['Title', 'You’re taking a break until 27 Nov 2027, 16:45 UTC'], ['Body', 'You chose to self-exclude on 27 Nov 2026, 16:45 UTC. Until then you can’t play, enter Global Pool rounds or deposit — and the break can’t be shortened or undone early, not even by support.'], ['Help block', 'Support is available — free, confidential help with gambling, 24/7.']],
      actions: [['Primary', 'Withdraw balance', 'Withdraw step 1 — security checks as usual'], ['Secondary', 'Download statements', 'Financial history export (CSV)'], ['Ghost', 'Talk to support', 'Support can help withdraw or close the account — never end the break']],
      notes: ['There is no “end early” or “play now” option anywhere; games, Global Pool, promotions and VIP are hidden from navigation.', 'The break can be made longer or permanent, never shorter.', 'Full screen: [AUTH-18] Restricted Account / Self-excluded (1440, 390).'] },
    { no: '05.5', sev: 'Blocking', name: 'Age-gate fail — under 18', lib: 'Inline age-gate result dialog over scrim · Badge/18+ · Button/Secondary · Button/Ghost',
      stage: async () => {
        const b18 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(b18, await I('6:159'), await T('Adults only', 'Label/S', 'text/secondary'));
        const lock = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(lock, await IC('lock', 14, 'icon/muted'), await T('The site stays locked on this device.', 'Caption', 'text/tertiary'));
        const p = await panel({ w: 520, modal: true, icon: 'ban', bg: 'status/danger-tint', fg: 'text/danger', title: 'You must be 18 or older to use GLOBAL POOL', body: 'You told us you’re under 18, so we can’t let you in. GLOBAL POOL — including Global Pool rounds, Originals and every promotion — is for adults only.',
          extra: [b18, [await note('heart', 'Free, confidential support about gambling — for you or someone you know: Gambling Therapy (gamblingtherapy.org) · GamCare (gamcare.org.uk).', 472), 'FILL'], [await note('info', 'Parents and carers: free filtering tools can block gambling sites on shared phones and computers.', 472), 'FILL'], lock],
          btns: [['Secondary', 'Leave GLOBAL POOL'], ['Ghost', 'Responsible Gaming policy']] });
        const scr = AL('VERTICAL', { name: 'Scrim (dimmed page)', p: 32, fill: 'scrim/overlay', r: 14, align: 'CENTER', w: 720 }); add(scr, p); return [scr]; },
      trigger: 'Visitor answers “No, I’m under 18” in the age gate, or the date of birth at registration is under 18 (or the higher legal age where they live).',
      copy: [['Title', 'You must be 18 or older to use GLOBAL POOL'], ['Body', 'You told us you’re under 18, so we can’t let you in. GLOBAL POOL — including Global Pool rounds, Originals and every promotion — is for adults only.'], ['Help', 'Free, confidential support about gambling — for you or someone you know.'], ['Parents', 'Parents and carers: free filtering tools can block gambling sites on shared phones and computers.'], ['Footer', 'The site stays locked on this device.']],
      actions: [['Secondary', 'Leave GLOBAL POOL', 'Neutral exit page (no games, no offers)'], ['Ghost', 'Responsible Gaming policy', 'Responsible Gaming page']],
      notes: ['No “change my answer” or retry button; the 18+ and jurisdiction checkboxes are never pre-checked.', 'Details typed before the answer are discarded, not stored.', 'Full screens: [PUB-22] Age gate · Failure (1440, 390).'] }
  ],
  extra: async () => {
    const c = AL('VERTICAL', { name: 'Availability matrix', gap: 0, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: CW });
    const h = AL('VERTICAL', { gap: 6, p: [0, 0, 16, 0] }); add(h, await T('Availability by regulatory state', 'Heading/H4', 'text/primary'), await T('Enforced server-side on every request; the UI mirrors the API answer. Status is icon + label, never colour alone.', 'Body/S', 'text/secondary', { w: 900 })); add(c, h);
    const cols = ['FEATURE', 'RESTRICTED REGION', 'LICENCE REQUIRED', 'SELF-EXCLUDED', 'AGE-GATE FAIL'];
    const hr = AL('HORIZONTAL', { name: 'Header row', p: [10, 0] }); strokeSides(hr, 'border/default', { b: 1 }); for (let i = 0; i < 5; i++) { const x = AL('HORIZONTAL', { w: i ? 246 : 280 }); add(x, await T(cols[i], 'Overline', 'text/tertiary')); add(hr, x); } add(c, [hr, 'FILL']);
    const rows = [
      ['Browse lobby & game pages', ['view', 'View only'], ['ok', 'Available'], ['hide', 'Hidden'], ['no', 'Locked']],
      ['Originals & table games', ['no', 'Blocked'], ['ok', 'Available'], ['hide', 'Hidden'], ['no', 'Locked']],
      ['Global Pool entries', ['no', 'Blocked'], ['no', 'Not licensed'], ['hide', 'Hidden'], ['no', 'Locked']],
      ['Deposits', ['no', 'Blocked'], ['ok', 'Available'], ['no', 'Blocked'], ['no', 'Locked']],
      ['Withdrawals', ['ok', 'Open · whitelisted address'], ['ok', 'Open'], ['ok', 'Open'], ['view', 'No account created']],
      ['Entries already bought', ['ok', 'Stay in the draw'], ['ok', 'Stay in the draw'], ['ok', 'Settle as normal'], ['view', 'Not applicable']],
      ['Promotions & marketing', ['hide', 'Paused'], ['hide', 'Global Pool offers hidden'], ['hide', 'Hidden · no emails or push'], ['hide', 'Hidden']],
      ['Account, history, RG tools & support', ['ok', 'Available'], ['ok', 'Available'], ['ok', 'Available'], ['view', 'Help pages only']]
    ];
    for (const [feat, ...vals] of rows) {
      const r = AL('HORIZONTAL', { name: 'Row — ' + feat, p: [12, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 });
      const fc = AL('HORIZONTAL', { w: 280 }); add(fc, await T(feat, 'Body/S', 'text/primary', { w: 264 })); add(r, fc);
      for (const [k, lb] of vals) { const x = AL('HORIZONTAL', { w: 246 }); add(x, await stat(K[k][0], lb, K[k][1])); add(r, x); }
      add(c, [r, 'FILL']);
    }
    return c;
  },
  related: ['[PUB-21] Geo-block interstitial / United States (restricted) / 1440 + 390 (pages 03, 10)', '[PUB-22] Age gate + licence notice / Default · Failure / 1440 + 390 (pages 03, 10)', '[AUTH-18] Restricted Account / Suspended · Under review · Self-excluded · Geo-restricted / 1440 + 390 (pages 04, 10)', '[USR-RG] Responsible gaming — self-exclusion and cooling-off flow (page 05)', '[GP-01] Global Pool hub / Restricted (page 07)']
});
// carry-over fix for the ERR-04 board (04.3 password placeholder)
const b4 = await figma.getNodeByIdAsync('275:2410');
if (b4) { const c3 = b4.findOne(n => n.name.startsWith('Cell 04.3')); const pw = c3 && c3.findAll(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === 'Input/Password')[0]; if (pw) await ov(pw, 'Value text', 'Enter your password'); }
fitSection(sec);
const flags = audit(f);
await f.screenshot({ scale: 0.5 });
return { section: sec.id, frame: f.id, name: f.name, x: f.x, w: f.width, h: f.height, flags };
