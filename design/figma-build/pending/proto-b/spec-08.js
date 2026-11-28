const FLOW = {
  id: 'PRO-08', pri: 'P1', name: 'PRO-08 Admin → User Management', flowName: 'PRO-08 · Admin → User Management', start: 'OV',
  goal: 'Finance lead A. Marin (DEMO) goes from the admin overview to Users, opens @nova.k, applies a withdrawal hold with a reason, a fresh 2FA code and a second approver, sees the active restriction with its audit trail and later lifts it with reason + 2FA. Branches: restricted role, 2FA failure lock and an expired admin session.',
  checks: ['Restrictions never change balances, ledger entries, active entries or round results', 'Every action needs a reason (≥ 20 characters), a fresh 2FA code and writes an immutable, hash-chained audit entry', 'Withdrawal holds and sign-in suspensions need a second approver (four-eyes); the requester cannot approve', 'Role-based access: Support L2 sees read-only tiles and can only request access', 'Users, admins, IDs and amounts are DEMO'],
  frames: [
    { k: 'OV', step: '1', src: '171:73506', code: 'ADM-02', title: 'Admin overview', row: 0, col: 0 },
    { k: 'U1', step: '2', src: '34:461531', code: 'ADM-U1', title: 'Users list', row: 0, col: 1 },
    { k: 'U2', step: '3', src: '32:99005', code: 'ADM-U2', title: 'User profile — @nova.k', row: 0, col: 2 },
    { k: 'U8D', step: '4', src: '33:316337', code: 'ADM-U8', title: 'Restrictions — none active', row: 0, col: 3 },
    { k: 'U8A', step: '5', src: '34:331125', code: 'ADM-U8', title: 'Apply hold — reason + 2FA + four-eyes', row: 0, col: 4 },
    { k: 'U8R', step: '6', src: '34:401900', code: 'ADM-U8', title: 'Restriction active — after 2nd approval', row: 0, col: 5 },
    { k: 'U8L', step: '7', src: '34:402702', code: 'ADM-U8', title: 'Lift restriction — reason + 2FA', row: 0, col: 6 },
    { k: 'B1', step: 'B1', src: '221:192192', code: 'ADM-02', title: 'Restricted role — Support L2', kind: 'error', row: 1, col: 0, cond: 'IF the signed-in role has no user-management write permission (Support L2) → tiles are read-only, actions hidden, Request access offered.' },
    { k: 'B2', step: 'B2', src: '170:67433', code: 'ADM-01', title: '2FA failed 5× — locked', kind: 'error', row: 1, col: 4, cond: 'IF five wrong 2FA codes are entered while confirming → admin sign-in locks for 15 min, Security is alerted; nothing was applied.' },
    { k: 'B3', step: 'B3', src: '170:67648', code: 'ADM-01', title: 'Session expired — re-authenticate', kind: 'error', row: 1, col: 6, cond: 'IF the admin session expires (30 min idle) during the action → re-authenticate with password + 2FA; the draft reason is kept.' }
  ],
  links: [
    { from: 'OV', to: 'U1', hot: [12, 134, 224, 36], label: 'User Management → Users' },
    { from: 'OV', to: 'B1', chip: 'Signed in as Support L2', kind: 'error' },
    { from: 'U1', to: 'U2', hot: [297, 677, 1094, 40], label: 'Open @nova.k' },
    { from: 'U2', to: 'U8D', hot: [852, 482, 101, 44], label: 'Restrictions tab' },
    { from: 'U8D', to: 'U8A', hot: [[562, 1031, 76, 32], [918, 1031, 76, 32], [555, 1193, 76, 32]], label: 'Apply… withdrawal hold' },
    { from: 'U8A', to: 'U8R', find: /^(Submit for approval|Request approval|Send for approval|Submit request)$/, chip: 'Second approver approves', label: 'Submit → Compliance approves (four-eyes)' },
    { from: 'U8A', to: 'B2', chip: '2FA wrong 5×', kind: 'error' },
    { from: 'U8R', to: 'U8L', hot: [839, 636, 155, 32], label: 'Lift restriction…' },
    { from: 'U8L', to: 'U8D', find: /^(Lift restriction|Lift now|Confirm lift|Lift hold)$/, chip: 'Lift confirmed', label: 'Reason + 2FA → lifted, audit entry', loop: true },
    { from: 'U8L', to: 'B3', chip: 'Session expired', kind: 'error' },
    { from: 'B3', to: 'U8L', find: /^(Re-authenticate|Verify and continue|Continue|Sign in)$/, label: 'Re-authenticate → back to the draft', loop: true }
  ]
};
