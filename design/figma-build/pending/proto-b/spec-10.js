const FLOW = {
  id: 'PRO-10', pri: 'P1', name: 'PRO-10 Admin → Pool Monitoring', flowName: 'PRO-10 · Admin → Pool Monitoring', start: 'P1',
  goal: 'An admin (DEMO) monitors Global Pool round #1,248 from the pool overview through live monitoring, the Chainlink VRF request on Arbitrum (requested 20:00:04, fulfilled 20:00:41 UTC) and settlement crediting. Branches: VRF delayed, the circuit breaker for NEW entries (reason + 2FA + second approval) and the refund view of cancelled round #1,245.',
  checks: ['Admins can watch, never pick winners, edit results, re-request randomness or move pool funds', 'VRF delay → incident and public delay notice; refunds follow the contract rules only', 'Pausing NEW entries needs reason + 2FA + a second approver; existing entries are untouched', 'Settlement credits are read from the contract — the only action is re-submitting a failed batch', 'Pool 186,400.00 USDT = 18,640 × 10.00; fees 932.00 are outside the pool (DEMO)'],
  frames: [
    { k: 'P1', step: '1', src: '67:52462', code: 'ADM-P1', title: 'Pool overview', row: 0, col: 0 },
    { k: 'P3', step: '2', src: '69:56617', code: 'ADM-P3', title: 'Round #1,248 — live monitoring', row: 0, col: 1 },
    { k: 'P7', step: '3', src: '80:62189', code: 'ADM-P7', title: 'VRF fulfilled in 37 s', row: 0, col: 2 },
    { k: 'P8', step: '4', src: '80:63898', code: 'ADM-P8', title: 'Settlement — crediting batch 3 of 4', row: 0, col: 3 },
    { k: 'P9', step: 'B1', src: '171:67227', code: 'ADM-P9', title: 'Refund status — round #1,245', kind: 'alt', row: 1, col: 0, cond: 'IF a round is cancelled (threshold not met: 412 / 500 participants) → refunds per contract rules, batch progress and owed balances; no manual payouts.' },
    { k: 'PR', step: 'B2', src: '171:70215', code: 'ADM-P10', title: 'Pause new entries — request', kind: 'alt', row: 1, col: 1, cond: 'IF an incident needs it → request a pause of NEW entries with a reason and 2FA; it does nothing until a second admin approves.' },
    { k: 'PS', step: 'B3', src: '171:70991', code: 'ADM-P10', title: 'Second approval — approver view', kind: 'alt', row: 1, col: 2, cond: 'THEN a Compliance or Super Admin approver reviews the request (cannot be the requester).' },
    { k: 'PP', step: 'B4', src: '171:71700', code: 'ADM-P10', title: 'New entries paused', kind: 'alt', row: 1, col: 3, cond: 'THEN new entries are paused after dual approval; existing entries, the draw and settlement continue unchanged.' },
    { k: 'P7D', step: 'B5', src: '171:72535', code: 'ADM-P7', title: 'VRF delayed — no fulfilment after 12 min', kind: 'error', row: 1, col: 4, cond: 'IF no VRF fulfilment arrives 12 min after the request → incident INC-0458 and a "Draw delayed" notice; re-request and manual draws are not available by design.' }
  ],
  links: [
    { from: 'P1', to: 'P3', hot: [592, 552, 144, 32], label: 'Monitor round' },
    { from: 'P1', to: 'P9', hot: [892, 254, 73, 44], label: 'Refunds tab', kind: 'alt' },
    { from: 'P3', to: 'P7', hot: [758, 274, 40, 44], chip: 'Round closes 20:00:00 UTC', label: 'Close 20:00:00 UTC → VRF requested 20:00:04' },
    { from: 'P3', to: 'PR', hot: [864, 2057, 147, 32], label: 'Request pause', kind: 'alt' },
    { from: 'P7', to: 'P8', hot: [[910, 1358, 121, 32], [798, 274, 94, 44]], label: 'Fulfilled 20:00:41 → settlement' },
    { from: 'P7', to: 'P7D', chip: 'No fulfilment after 12 min', kind: 'error' },
    { from: 'P8', to: 'P1', hot: [276, 274, 82, 44], label: 'Overview tab', loop: true },
    { from: 'PR', to: 'PS', find: /^(Submit for approval|Request pause|Send for approval|Submit request)$/, chip: 'Submit request', label: 'Submit for second approval', kind: 'alt' },
    { from: 'PS', to: 'PP', find: /^(Approve|Approve pause|Approve and pause)$/, chip: 'Approver approves', label: 'Approve (second admin)', kind: 'alt' },
    { from: 'P7D', to: 'P7', chip: 'Fulfilment arrives', kind: 'alt', loop: true }
  ]
};
