const FLOW = {
  id: 'PRO-09', pri: 'P1', name: 'PRO-09 Admin → Finance', flowName: 'PRO-09 · Admin → Finance', start: 'Q',
  goal: 'A. Marin (Finance Lead, DEMO) opens the withdrawals queue, reviews AML-flagged WD-20931 (1,500.00 USDT → 0x7c4e…a21D, Arbitrum), requests release with a reason and 2FA, then K. Osei (Compliance) approves as second approver after a fresh 2FA and the payout broadcasts. Branches: reject with reason (validation), wrong 2FA code and self-approval blocked.',
  checks: ['Four-eyes: the second approver must be Compliance or Super Admin and can never be the requester', 'Reason + 2FA on every decision; each step writes a hash-chained audit entry', 'Fees explicit: 1,500.00 − network fee 0.08 − platform fee 0.00 = 1,499.92 USDT received', 'Reject returns the funds to Available; admins cannot edit balances, ledger entries or pay arbitrary amounts', 'Withdrawal, users, hashes and amounts are DEMO'],
  frames: [
    { k: 'Q', step: '1', src: '33:142492', code: 'ADM-F2', title: 'Withdrawals queue', row: 0, col: 0 },
    { k: 'D', step: '2', src: '33:230322', code: 'ADM-F2', title: 'WD-20931 — under review', row: 0, col: 1 },
    { k: 'XC', step: '3', src: '178:99766', code: 'ADM-X1', title: 'Release — reason + 2FA (empty)', row: 0, col: 2 },
    { k: 'XR', step: '4', src: '178:100079', code: 'ADM-X1', title: 'Release — ready to submit', row: 0, col: 3 },
    { k: 'XS', step: '5', src: '178:100654', code: 'ADM-X1', title: 'Request AR-1042 submitted', row: 0, col: 4 },
    { k: 'AW', step: '6', src: '33:256090', code: 'ADM-F2', title: 'Awaiting 2nd approver', row: 0, col: 5 },
    { k: 'SR', step: '7', src: '180:144187', code: 'ADM-X1', title: '2nd approver review — K. Osei', row: 0, col: 6 },
    { k: 'RA', step: '8', src: '180:143765', code: 'ADM-X1', title: 'Fresh 2FA before approving', row: 0, col: 7 },
    { k: 'XA', step: '9', src: '180:144734', code: 'ADM-X1', title: 'Approved — released', row: 0, col: 8 },
    { k: 'BR', step: '10', src: '33:256794', code: 'ADM-F2', title: 'Approved — broadcasting', row: 0, col: 9 },
    { k: 'RJ', step: 'B1', src: '33:255802', code: 'ADM-F2', title: 'Reject — reason + 2FA required', kind: 'error', row: 1, col: 1, cond: 'IF the admin rejects without a category, a reason of ≥ 20 characters or a valid 2FA code → "Fix 3 fields" summary and inline errors; nothing is sent. A valid reject also needs a second approver and returns 1,500.00 USDT to Available.' },
    { k: 'XE', step: 'B2', src: '178:100360', code: 'ADM-X1', title: 'Wrong 2FA code', kind: 'error', row: 1, col: 2, cond: 'IF the 2FA code does not match → "That code didn’t match. 4 attempts left."; after 5 failures the admin is locked out for 15 min.' },
    { k: 'SB', step: 'B3', src: '180:145242', code: 'ADM-X1', title: 'Self-approval blocked', kind: 'error', row: 1, col: 5, cond: 'IF the requester (A. Marin) opens her own request → approve controls are disabled; opening is logged, no decision recorded; WD-20931 stays Locked.' }
  ],
  links: [
    { from: 'Q', to: 'D', hot: [277, 1028, 1134, 42], label: 'Open WD-20931' },
    { from: 'D', to: 'XC', hot: [1214, 216, 198, 40], label: 'Approve · step 1 of 2' },
    { from: 'D', to: 'RJ', hot: [1092, 216, 114, 40], label: 'Reject…', kind: 'error' },
    { from: 'XC', to: 'XR', hot: [488, 355, 465, 120], label: 'Pick category, write reason, enter 2FA', smart: true },
    { from: 'XC', to: 'XE', hot: [762, 862, 193, 40], label: 'Submit with a wrong code', kind: 'error' },
    { from: 'XR', to: 'XS', hot: [762, 876, 193, 40], label: 'Submit for approval' },
    { from: 'XS', to: 'AW', hot: [[887, 756, 68, 40], [727, 756, 152, 40]], label: 'Done' },
    { from: 'AW', to: 'SR', chip: 'Sign in as K. Osei (Compliance)', label: 'Second approver opens Approvals' },
    { from: 'AW', to: 'SB', hot: [1188, 1530, 289, 32], label: 'Try to approve own request', kind: 'error' },
    { from: 'SR', to: 'RA', find: /^Approve( and release| & release| ·.*| request)?$/, chip: 'Approve', label: 'Approve (fresh 2FA required)' },
    { from: 'RA', to: 'XA', find: /^(Confirm|Verify|Verify and approve|Approve)$/, chip: 'Code verified', label: 'Fresh 2FA verified' },
    { from: 'XA', to: 'BR', chip: 'Open WD-20931 in Finance', label: 'Broadcast in Arbitrum batch' },
    { from: 'RJ', to: 'D', hot: [674, 931, 80, 40], label: 'Cancel', loop: true },
    { from: 'XE', to: 'XS', hot: [762, 927, 193, 40], label: 'Re-enter code → Submit', loop: true }
  ]
};
