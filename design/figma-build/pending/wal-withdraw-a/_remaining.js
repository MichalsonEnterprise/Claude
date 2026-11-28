// wal-withdraw-a — REMAINING FRAMES (build spec for resumption; run each script as helpers.js + _lib.js + body).
// Desktop layout in section 'WAL-10..14 Withdraw steps 1–5' (36:516030): defaults at y=120, x = 120 / 1680 / 3240 / 4800 / 6360;
// states stacked under their default with colY(x) (+160). Tablet row below all desktop frames (+240), x aligned to the step column.
// Built + verified: WAL-10 D Default 36:527247 · WAL-11 D Default 36:538883 · WAL-12 D Default 48:26939.
// 1) d03-wal12-states.js — ready (Invalid / Whitelisted / New-address cooldown).
// 2) WAL-13 D Default (x 4800): shellD(...,'Withdraw — Step 4 Enter Amount / 1440 / Default', 4, 4800, 120, 'USDT on Arbitrum One → 0x7c4e…a21D');
//    fhead 'How much do you want to withdraw?' + Input/Amount (15:3387) State=Focus FILL named 'Input/Amount';
//    quick-amount chips (Menu/Filter Chip 17:2766, Show icon=false): 500.00 · 1,000.00 · 1,500.00 (Selected) · 5,000.00 · MAX;
//    3 limit tiles (surface/raised): Minimum 20.00 USDT · Available now 9,215.30 USDT (DEMO) · Left today 25,000.00 USDT (KYC L2);
//    Wallet/Fee Estimator (20:3002) State=Normal FILL (1,500.00 − 0.08 → 1,499.92, platform fee 0.00);
//    lock row 'After this withdrawal: Available 7,715.30 USDT · 1,500.00 moves to Locked until it is sent';
//    ffoot('Back','Review fees'); side({n:4, net:true, addr:'0x7c4e…a21D', amt:'1,500.00', recv:'1,499.92', used:'1,500.00', usedLabel:'of 25,000.00 USDT after this withdrawal', pct:0.06}).
// 3) WAL-13 D states (clone Default): 'Min/max — below minimum' (Input Error, value 12.00, helper 'Minimum withdrawal is 20.00 USDT…', fee estimator → info alert, footer Disabled);
//    'Over balance' (Input Error 12,000.00 'Exceeds your available balance (9,215.30 USDT)', warning alert explaining Locked 1,850.00 / Pending 1,000.00 / Owed 415.20 + 'Withdraw max 9,215.30');
//    'Limit reached (separate DEMO scenario: 25,000.00 withdrawn today)' (Input Disabled, limit meter full status/warning, resets 28 Nov 2026 00:00 UTC, 'Raise limit — verify Level 3').
// 4) WAL-14 D Default (x 6360): 'Review your withdrawal' — You receive 1,499.92 USDT (Number/XL) to 0x7c4e…a21D on Arbitrum One; Tx/Fee Breakdown (20:8583) Type=Withdrawal FILL;
//    details (asset, network pill, Address Chip + Whitelisted, est. arrival, Available after 7,715.30); danger/warning irreversibility alert;
//    Control/Checkbox (20:3205) Unchecked 'I've checked the address and network, and I understand this withdrawal can't be reversed';
//    note 'Risk check and 2FA come next — nothing is sent until you confirm with your authenticator code'; ffoot('Back','Continue to security check',{state:'Disabled'}).
// 5) Tablet 768 × 5 (WAL-10..14 Default): screen 768 → DEMOBAR → Body [Shell/Sidebar Collapsed Member 72 | Main 696: Shell/Topbar Mobile Member FILL, Content p24:
//    title, 4 tabs, Nav/Stepper Mobile (15:3270) Steps=9 FILL (Current label / 'Step n of 9' / 'Next: …'), clone 'Flow card' + 'Withdrawal summary' from the desktop default, FILL].
// 6) Mobile 390 (page '10 — Mobile Experience', section 'WAL — Mobile C (Withdraw 1–5)' at 147000,0) — MOB-07 bottom-sheet pattern:
//    WAL-10 sheet 'Choose asset' over the withdraw page (scrim/overlay, 844 fixed); WAL-11 Sheet/Bottom (29:17720) Default with withdraw copy;
//    WAL-12 Default / Invalid / New-address cooldown (full page, sticky CTA + Nav/Mobile Tab Bar Active=Wallet); WAL-13 Default / Over balance / Limit reached;
//    WAL-14 review bottom sheet (Tx/Fee Breakdown + irreversible warning + unchecked checkbox + disabled CTA).
