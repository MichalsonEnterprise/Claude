const D_aml = {
 key: 'aml', id: 'PUB-19', title: 'AML/KYC Policy', over: 'LEGAL · COMPLIANCE', cur: 3, slug: 'aml-kyc',
 lead: 'GLOBAL POOL must prevent money laundering, terrorist financing and fraud. This policy explains how we verify players, which checks we run on deposits and withdrawals, and what happens when a check needs a closer look — so you always know why we ask for something.',
 version: 'Version 2.3', effective: 'Effective 1 Dec 2026', updated: 'Updated 27 Nov 2026',
 det: ['2.3', '1 Dec 2026, 00:00 UTC', '27 Nov 2026, 10:00 UTC', '2.2 · 15 Aug 2026'], pdf: 'PDF · 248 KB · English is the binding version',
 sumT: 'What this means for you', sumN: 'A plain-language overview. The verification levels are described in full in section 2.',
 sum: [
  'Verification has three levels. Level 2 — photo ID and a liveness check — is required before your first withdrawal.',
  'Every deposit and withdrawal address is screened against sanctions lists and blockchain risk data.',
  'A withdrawal is held only as long as a check genuinely needs, and you always see the reason and an expected time.',
  'We may ask where your funds come from for higher limits or activity that looks unusual.',
  'Your documents are encrypted, seen only by trained compliance staff and kept only as long as the law requires.'],
 s: [
  { h: 'Purpose and scope', a: 'purpose', p: [
   'This policy applies to every account, deposit, withdrawal, Global Pool entry and game transaction on GLOBAL POOL. It sets out how [Operator Ltd — DEMO placeholder] meets the anti-money-laundering and counter-terrorist-financing obligations of its gaming licence and of the laws of [Licensing jurisdiction — DEMO placeholder].',
   'Our Money Laundering Reporting Officer owns this policy, reviews it at least once a year and reports to senior management on how well our controls work.'] },
  { h: 'Verification levels', a: 'verification-levels', p: [
   'Level 1 — Basic: your email, date of birth and country, and a check that you are 18+ and in a permitted jurisdiction. It lets you deposit and play within starter limits. Level 2 — Full: a government-issued photo ID and a liveness selfie. Level 2 is required before your first withdrawal and raises your daily withdrawal limit to 25,000.00 USDT.',
   'Level 3 — Enhanced: proof of address and evidence of where your funds come from, such as payslips, exchange statements or tax returns. We ask for Level 3 for higher limits, for large or unusual activity, or when another check identifies a higher risk.'],
   note: 'Typical review times: Level 2 in under 10 minutes; Level 3 within 2 business days of receiving every document.', demo: true },
  { h: 'Customer due diligence', a: 'due-diligence', p: [
   'We confirm that you are who you say you are before you can withdraw, and we keep your information up to date. If your documents expire, your details change or our checks find a mismatch, we ask you to verify again. Until then you can still withdraw your available balance, but deposits and new entries are paused.',
   'We do not accept accounts opened for or on behalf of someone else, accounts using another person’s documents, or more than one account per person.'] },
  { h: 'Sanctions and politically exposed persons', a: 'sanctions-pep', p: [
   'We screen every player at registration, and daily after that, against international sanctions lists and politically exposed person (PEP) databases. A PEP match does not mean we refuse you: it means we apply enhanced due diligence and need senior approval before the account can be used.',
   'We cannot open or keep an account for anyone subject to applicable sanctions. If a sanctions match is confirmed, we must freeze the account and report it to the authorities as the law requires.'] },
  { h: 'Wallet and transaction screening', a: 'screening', p: [
   'Before we credit a deposit or send a withdrawal, we check the blockchain address against sanctions lists and blockchain analytics risk data. Addresses linked to sanctioned entities, mixers, darknet markets or stolen funds are blocked. We also watch for patterns such as deposits that are withdrawn again with little or no play.',
   'If a withdrawal destination fails screening, the withdrawal is rejected, the full amount returns to your Available balance with no network fee charged, and you receive a reference number you can quote to ask for a review.'],
   note: 'Example: withdrawal WD-20850 (600.00 USDT) was rejected because its destination was flagged by sanctions screening. The full amount went back to Available.', demo: true },
  { h: 'Source of funds and source of wealth', a: 'source-of-funds', p: [
   'For higher limits, large deposits or activity that does not match what we know about you, we may ask where your funds came from. We tell you exactly which documents we need and why, and we review them within 2 business days of receiving everything.',
   'While a source-of-funds review is open, you can keep using your available balance within your current limits. If the review cannot be completed, we may lower your limits or pause deposits, but you can always withdraw funds that have passed screening.'] },
  { h: 'Withdrawal reviews', a: 'withdrawal-reviews', p: [
   'Most withdrawals are sent automatically after two-factor confirmation. Some are held for a manual review — for example the first withdrawal to a newly whitelisted address, an unusually large amount or a screening alert. The withdrawal then shows Under review with a plain-language reason and an expected decision time, usually under 4 hours.',
   'We never use reviews to discourage withdrawals, and the same checks apply whether an amount is large or small. Deposits and withdrawals are screened to the same standard.'] },
  { h: 'Reporting and record keeping', a: 'reporting', p: [
   'Where the law requires it, we report suspicious activity to the financial intelligence unit of [Licensing jurisdiction — DEMO placeholder]. The law may prevent us from telling you that a report has been made; a report is not a finding that you have done anything wrong.',
   'We keep verification documents and transaction records for 5 years after an account closes, or longer if a regulator or court requires it.'] },
  { h: 'Protecting your documents', a: 'data-protection', p: [
   'Verification documents are encrypted at rest, stored separately from your account data and open only to trained compliance staff, with every access recorded in an audit log. We use them only for the purposes in this policy and our Privacy Policy.',
   'You can ask privacy@example.com which verification data we hold about you. Some data cannot be deleted before the legal retention period ends.'] },
  { h: 'Your cooperation and how to contact us', a: 'contact', p: [
   'If we ask you for information, please reply within 30 days so your account can stay fully active. Providing false or forged documents leads to account closure and may be reported to the authorities.',
   'Send questions about a verification request or a review to compliance@example.com or ask Support. If you disagree with a decision, a different member of the compliance team will review it, and you can then use the complaints process in our Terms & Conditions.'] }
 ],
 hist: [
  ['2.3', '1 Dec 2026', 'Added address-risk screening for deposits and a reference number on every rejected withdrawal.'],
  ['2.2', '15 Aug 2026', 'Raised the Level 2 daily withdrawal limit to 25,000.00 USDT.'],
  ['2.0', '12 Mar 2026', 'Policy published for the launch of GLOBAL POOL.']]
};
