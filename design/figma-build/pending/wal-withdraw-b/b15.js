// ===== WAL-15 Step 6 Risk Validation — content builder (st: Pass | KYC | Flagged; M: 0 desktop/tablet, 1 mobile) =====
async function flow15(fc, st, M) {
  const kyc = st === 'KYC', flag = st === 'Flagged';
  if (st === 'Pass') await fhead(fc, 'Security check passed', 'We ran 6 automatic checks on this withdrawal at 27 Nov 2026, 18:43 UTC. Everything is clear — confirm it with two-factor authentication next.', M);
  if (kyc) await fhead(fc, 'Verify your identity to withdraw', 'Withdrawals need KYC Level 2 — an ID document plus a short selfie check. This account is at Level 1, so the withdrawal is on hold: nothing has been sent and the 1,500.00 USDT stays in Available.', M);
  if (flag) await fhead(fc, 'Almost there — this one needs a manual review', 'Five of six checks passed automatically. You can still confirm now: after 2FA the withdrawal joins a short review queue and is sent as soon as it\'s cleared.', M);
  if (st === 'Pass') add(fc, [await alertBox('success', 'All 6 checks passed in 2.4 s', 'Nothing for you to do. The result is valid for 15 minutes — until 18:58 UTC — so confirm with 2FA before then.'), 'FILL']);
  if (kyc) add(fc, [await alertBox('warning', 'KYC Level 2 is required for withdrawals', 'It takes about 5 minutes and most checks are approved within 10 minutes. We\'ll save this withdrawal and bring you straight back to this step.', { icon: 'id-card', actions: M ? [] : [await BTN('Primary', 'Verify identity — about 5 min', { size: 'S', lead: 'id-card' }), await BTN('Ghost', 'Why we ask', { size: 'S', trail: 'arrow-right' })] }), 'FILL']);
  if (flag) add(fc, [await alertBox('warning', 'Routine AML screening for new destinations — usually under 4 h', 'This is your first withdrawal to ' + AD + ' since you whitelisted it on 14 Oct 2026. A compliance analyst checks it — you don\'t need to send documents. We\'ll email you (look for AURORA-27) when it\'s done.', { icon: 'shield-alert' }), 'FILL']);
  const ok = async (l) => await B('Approved', l || 'Passed');
  const nr = async () => await B('Neutral', 'Not run yet');
  const rows = [
    { s: kyc ? 'fail' : 'pass', t: 'Identity verification (KYC)', d: kyc ? 'Level 1 only — withdrawals need Level 2 (ID document + selfie check)' : 'Level 2 — ID document and liveness verified', right: await I('23:5565', { Status: kyc ? 'Not started' : 'Approved', Level: 'L2' }) },
    { s: kyc ? 'wait' : 'pass', t: 'Withdrawal limits', d: '1,500.00 of 25,000.00 USDT daily limit · minimum 20.00 USDT', right: kyc ? await nr() : await ok('Within limit') },
    { s: 'pass', t: 'Account security', d: '2FA on · no password or email change in the last 24 h · trusted device (MacBook Pro · Chrome · Lisbon)', right: await ok() },
    { s: kyc ? 'wait' : flag ? 'review' : 'pass', t: 'AML transaction screening', d: flag ? 'First withdrawal to this destination — routed to a compliance analyst' : 'Amount and pattern match your usual activity', right: kyc ? await nr() : flag ? await B('Under review', 'Manual review') : await ok('Clear') },
    { s: kyc ? 'wait' : flag ? 'review' : 'pass', t: 'Destination address risk', d: AD + ' · whitelisted 14 Oct 2026 · screened by our blockchain-analytics provider', right: kyc ? await nr() : await I('23:5378', { Level: flag ? 'Medium' : 'Low', Density: 'Comfortable' }) },
    { s: 'pass', t: 'Network status', d: 'Arbitrum One is operational · network fee 0.08 USDT', right: await I('9:377', { Chain: 'Arbitrum', Status: 'Operational' }) }
  ];
  await checks(fc, kyc ? 'Security checks — stopped at identity' : flag ? 'Security checks — 5 of 6 passed' : 'Security checks — 6 of 6 passed', 'Checked 27 Nov 2026, 18:43 UTC', rows, M);
  if (kyc) { const nd = AL('VERTICAL', { name: 'What you\'ll need', gap: 10, p: 16, fill: 'surface/raised', r: 14 }); add(fc, [nd, 'FILL']); await tx(nd, 'What you\'ll need', 'Body/M Strong'); for (const [ic, t1] of [['id-card', 'A valid passport, national ID card or driving licence'], ['face-scan', 'A 10-second selfie video in good light'], ['smartphone', 'Your phone, or a laptop with a camera']]) { const r = hrow('Need — ' + t1.slice(0, 24), 10); add(nd, [r, 'FILL']); r.appendChild(await IC(ic, 18, 'icon/brand')); await tx(r, t1, 'Body/S', 'text/secondary'); } await tx(nd, 'Documents are encrypted and used only for verification. Your balance stays yours while you verify — nothing is frozen, and you can cancel this withdrawal at any time.', 'Caption', 'text/tertiary'); }
  if (flag) add(fc, [await alertBox('info', 'Where your 1,500.00 USDT is during the review', 'It\'s held in Locked until the review is done. You can cancel any time before it\'s sent, and the full amount returns to Available straight away.', { icon: 'lock' }), 'FILL']);
  if (kyc) return M ? { next: 'Verify identity — about 5 min', lead: 'id-card', trail: null, alt: [['Ghost', 'Cancel withdrawal', 'x']], note: 'Back here automatically once you\'re verified' } : { back: 'Back', next: 'Continue to 2FA', state: 'Disabled', note: 'Available after Level 2 verification' };
  if (flag) return { back: 'Back', next: 'Continue to 2FA', note: 'Review starts after you confirm' };
  return { back: 'Back', next: 'Continue to 2FA', note: 'Result valid until 18:58 UTC' };
}
// ===== END WAL-15 builder =====
