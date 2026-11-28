const D_terms = {
 key: 'terms', id: 'PUB-16', title: 'Terms & Conditions', over: 'LEGAL · TERMS', cur: 1, slug: 'terms',
 lead: 'These terms are the agreement between you and [Operator Ltd — DEMO placeholder], which operates GLOBAL POOL. They explain who can play, how your account and USDT balance work, how the Global Pool and our games run, and what each of us can do if something goes wrong. Please read them before you register.',
 version: 'Version 4.2', effective: 'Effective 1 Dec 2026', updated: 'Updated 27 Nov 2026',
 det: ['4.2', '1 Dec 2026, 00:00 UTC', '27 Nov 2026, 10:00 UTC', '4.1 · 1 Jun 2026'], pdf: 'PDF · 412 KB · English is the binding version',
 sumT: 'The short version', sumN: 'A plain-language overview to help you find your way. It does not replace the full terms below.',
 sum: [
  'You must be 18 or older (or the higher legal age where you live) and located in a permitted jurisdiction to play.',
  'Your balance is held in USDT. Network fees are shown separately and are never part of our platform fee.',
  'Every qualifying Global Pool entry carries a 0.05 USDT platform fee, shown as its own line before you confirm.',
  'Draws use Chainlink VRF and game results use verifiable seeds — nobody, including us, can change an outcome.',
  'You can lose what you stake. Limits, reality checks, cooling-off and self-exclusion are available at any time.'],
 s: [
  { h: 'Eligibility', a: 'eligibility', p: [
   'You may open an account and use real-money features only if you are at least 18 years old — or older, where the law of your place of residence sets a higher age — and you are physically located in a jurisdiction where our licence allows us to offer them. You must act for yourself, not for anyone else, and you may hold only one account.',
   'We check your age and location at registration and again at key moments such as deposits, Global Pool entries and withdrawals. If we cannot confirm that you are eligible, real-money features stay restricted until the check is complete. We do not knowingly accept players who are self-excluded with us or with a national self-exclusion scheme that applies to them.'] },
  { h: 'Account and verification', a: 'account', p: [
   'You are responsible for keeping your sign-in details, your two-factor authentication device and your anti-phishing code private. Tell us at security@example.com straight away if you think someone else has accessed your account — we will lock it while we investigate.',
   'Verification happens in levels. Level 1 confirms your email, age and country. Level 2 adds an identity document and a liveness check and is required before your first withdrawal. Level 3 — enhanced due diligence, including source of funds — may be requested for higher limits or when our AML/KYC Policy requires it.'] },
  { h: 'Deposits and withdrawals', a: 'deposits-withdrawals', p: [
   'All balances are held and shown in USDT. You can deposit and withdraw on BNB Chain, Polygon, Arbitrum, Ethereum and Solana; the minimum deposit is 10.00 USDT and the minimum withdrawal is 20.00 USDT. Blockchain transactions cannot be reversed, so always check the network and the address before you send — funds sent on an unsupported network or to a wrong address may not be recoverable.',
   'We charge no platform fee on withdrawals. The network fee for the chain you choose is shown before you confirm and is deducted from the amount sent. Withdrawals need two-factor confirmation, may be screened under our AML/KYC Policy, and new withdrawal addresses have a 24-hour security cooldown. We never hold a withdrawal for any reason other than the security and compliance checks described in these terms.'] },
  { h: 'Global Pool rules and fees', a: 'global-pool', p: [
   'The Global Pool runs in rounds. Each round publishes its entry price (currently 10.00 USDT), a fixed close time in UTC, a minimum number of participants and a minimum pool size. Entry prices go into the pool in full. The platform fee of 0.05 USDT per qualifying entry is charged separately, shown as its own line before you confirm, and never added to the pool.',
   'When a round closes with its thresholds met, winners are selected by Chainlink VRF and prizes are paid according to the round’s published prize table. If a round does not meet its thresholds, it is cancelled and every entry price and platform fee is refunded under the contract rules. We cannot choose winners, change results or make payouts outside the round rules.'],
   note: 'Example: 35 entries × 10.00 USDT = 350.00 USDT into the pool, plus a separate platform fee of 35 × 0.05 = 1.75 USDT. You confirm a total of 351.75 USDT.', demo: true },
  { h: 'Games and fairness', a: 'games-fairness', p: [
   'Every game page shows its rules, limits and house edge or return to player before you play — for example, Pool Roulette has a house edge of 2.70% and Double Side pays 1.96×. Results come from a server seed committed before your bet combined with your own client seed, so you can check any result on our Provably Fair page.',
   'If a game malfunctions, the affected round is void and stakes are returned. We never alter a result once it has been generated. Bonus funds from promotions carry their own wagering terms, which are shown on each offer before you opt in.'] },
  { h: 'Responsible gaming', a: 'responsible-gaming', p: [
   'Gaming should stay entertainment. You can set daily, weekly or monthly limits on deposits, losses and participation, switch on reality-check reminders, take a cooling-off break from 24 hours to 6 weeks, or self-exclude for 6 months or longer. Lowering a limit takes effect immediately; raising one takes effect only after a 24-hour cool-down.',
   'While a break or self-exclusion is active you cannot deposit, enter rounds or play, but you can always withdraw your available balance, and we send you no marketing. If you are worried about your play, our Responsible Gaming page lists independent organisations that offer free, confidential help.'] },
  { h: 'Restricted territories', a: 'restricted-territories', p: [
   'Our licence does not allow real-money features in certain countries and regions, including the United States. The current list is published on the Restricted Countries page and forms part of these terms. From a restricted territory you can view the site and withdraw any available balance, but you cannot deposit, enter rounds or play.',
   'You must not use a VPN, proxy or any other tool to hide your location or to reach the service from a restricted territory. If an account is used this way, we will restrict it and return any remaining balance after the checks the law requires.'] },
  { h: 'Suspension and closure', a: 'suspension-closure', p: [
   'You can close your account at any time from Account settings or through Support. Any available balance is returned to a withdrawal address you control after the standard checks. Closing your account does not cancel entries already placed in an open round — they are settled or refunded under the round rules.',
   'We may suspend or close an account when the law or our regulator requires it, when verification cannot be completed, or when we have reasonable grounds to suspect fraud, collusion, money laundering or a breach of these terms. We will tell you why unless the law prevents it, and you can ask for the decision to be reviewed.'] },
  { h: 'Liability', a: 'liability', p: [
   'We provide the service with reasonable skill and care and pay out balances and prizes that are properly due to you. We are not responsible for losses caused by events outside our reasonable control — such as blockchain congestion or outages — or by transactions you send to an incorrect address or on an unsupported network.',
   'Nothing in these terms limits liability that cannot be limited by law, including liability for fraud or for death or personal injury caused by negligence, and nothing affects your statutory rights as a consumer.'] },
  { h: 'Complaints and disputes', a: 'disputes', p: [
   'If something goes wrong, contact Support first — most issues are resolved within 2 business days. If you are not satisfied, raise a formal complaint at legal@example.com. We acknowledge every complaint within 48 hours and send a final response within 8 weeks.',
   'If you are still unhappy with our final response, you can refer the complaint free of charge to the independent dispute resolution body named in our licence ([ADR provider — DEMO placeholder]). These terms are governed by the law of [Licensing jurisdiction — DEMO placeholder].'] },
  { h: 'Changes to these terms', a: 'changes', p: [
   'We may update these terms to reflect changes in law, regulation or how the service works. For material changes we notify you by email and in your account at least 30 days before they take effect, and the version number and effective date at the top of this page change with them.',
   'If you do not accept a change, you can close your account and withdraw your balance before the new version takes effect. Earlier versions stay available in the version history below.'] }
 ],
 hist: [
  ['4.2', '1 Dec 2026', 'Clarified refunds for cancelled Global Pool rounds and the 24-hour cooldown for new withdrawal addresses.'],
  ['4.1', '1 Jun 2026', 'Added Solana deposits and withdrawals; updated the restricted territories list.'],
  ['4.0', '12 Mar 2026', 'New terms for the launch of the Global Pool.']]
};
