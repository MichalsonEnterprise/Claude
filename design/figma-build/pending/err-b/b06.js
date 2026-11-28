// ERR-06 board — Service status banners (P1)
async function pill(chain, status, label) { const p = await I('9:377', { Chain: chain, Status: status }, { 'Show status label': true, 'Show chevron': false }); if (label) await ov(p, 'Status label', label); return p; }
const { sec, f } = await board({
  col: 2, id: 'ERR-06', pri: 'P1',
  frameName: '[ERR-06] Service status — maintenance, degraded chain, VRF delayed, entries paused / 1440 / Board',
  title: 'Service status — maintenance, degraded chain, VRF delayed, entries paused',
  desc: 'Operational banners and inline states for planned work and incidents. They say what is affected, what is not and until when, and they never hide money: funds in flight are queued, returned to Available or settled by the contract’s own rules.',
  rules: [
    'State what is affected, what is not, and until when — always with absolute UTC times.',
    'Funds in flight are never lost: queued, returned to Available, or settled by contract rule.',
    'Degraded never blocks — show the extra delay or fee and let the player choose.',
    'Maintenance and pauses disable only the affected action; everything else keeps working.',
    'Nobody can change a draw: VRF delays and contract pauses say so explicitly.'
  ],
  map: [
    ['status.maintenance.scheduled · AN-88', '06.1 Scheduled maintenance'],
    ['status.maintenance.active · bnb', '06.2 Maintenance in progress'],
    ['chain.health = degraded · ethereum', '06.3 Degraded chain'],
    ['broadcast_failed ×3 · arbitrum', '06.4 Network outage — withdrawals'],
    ['vrf.request.age > 5 min', '06.5 VRF response delayed'],
    ['GlobalPool.EntriesPaused event', '06.6 New entries paused']
  ],
  cells: [
    { no: '06.1', sev: 'Advisory', name: 'Scheduled maintenance (advance notice)', lib: 'Alert/Banner · Maintenance · Inline (title overridden) · Toast · Info (copy overridden)',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Maintenance', Layout: 'Inline' }); await ov(a, 'Title', 'Scheduled maintenance · 1 Dec 2026, 02:00–02:30 UTC');
        const t = await I('30:16872', { Type: 'Info' }); await ov(t, 'Title', 'Maintenance at 02:00 UTC'); await ov(t, 'Body', 'Deposits and withdrawals on BNB Chain pause from 02:00 to 02:30 UTC. Withdrawals you request now are sent before the window or straight after it.'); await ov(t, 'Label', 'Status page');
        return [a, t]; },
      trigger: 'Announcement AN-88 scheduled by a System admin: BNB Chain node upgrade, 1 Dec 2026, 02:00–02:30 UTC. Banner from 72 h before the start; toast 30 min before.',
      where: 'Wallet, deposit and withdraw pages; site-wide only in the last 24 h before the window.',
      copy: [['Title', 'Scheduled maintenance · 1 Dec 2026, 02:00–02:30 UTC'], ['Body', 'BNB Chain deposits and withdrawals pause during the upgrade. Balances, active entries and draws are not affected.'], ['Toast (30 min before)', 'Maintenance at 02:00 UTC — Deposits and withdrawals on BNB Chain pause from 02:00 to 02:30 UTC. Withdrawals you request now are sent before the window or straight after it.']],
      actions: [['Ghost', 'Status page', 'Status page with every network and the incident history']],
      notes: ['Dismissible; it comes back as 06.2 when the window starts.', 'Times are absolute UTC; the player’s local time shows in a tooltip.'] },
    { no: '06.2', sev: 'Blocking', name: 'Maintenance in progress — one network paused', lib: 'Inline wallet status card · Wallet/Network Pill ×5 (status labels overridden) · Button/Primary · Button/Ghost',
      stage: async () => {
        const pr = AL('HORIZONTAL', { name: 'Network status', gap: 8, wrap: true, cgap: 8 }); add(pr, await pill('BNB Chain', 'Down', 'Maintenance'), await pill('Polygon', 'Operational'), await pill('Arbitrum', 'Operational'), await pill('Ethereum', 'Degraded', 'Congested'), await pill('Solana', 'Operational'));
        const tm = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(tm, await IC('clock', 16, 'icon/muted'), await T('Started 02:00 UTC · ends 02:30 UTC · 18 min left', 'Body/S', 'text/secondary'), await DEMO('S'));
        return [await panel({ w: 720, icon: 'wrench', bg: 'status/warning-tint', fg: 'text/warning', title: 'BNB Chain wallet maintenance in progress', body: 'Deposits and withdrawals on BNB Chain are paused until 02:30 UTC. Other networks work as normal, and nothing you hold is affected.', extra: [[pr, 'FILL'], tm], btns: [['Primary', 'Deposit on Arbitrum', 'deposit'], ['Ghost', 'Status page']] })]; },
      trigger: 'Window AN-88 is active (status.maintenance.active = bnb). Deposit-address generation and withdrawal broadcasts for BNB Chain are paused server-side.',
      where: 'Wallet banner; the BNB Chain option in deposit and withdraw network pickers is disabled and shows the end time.',
      copy: [['Title', 'BNB Chain wallet maintenance in progress'], ['Body', 'Deposits and withdrawals on BNB Chain are paused until 02:30 UTC. Other networks work as normal, and nothing you hold is affected.'], ['Timing', 'Started 02:00 UTC · ends 02:30 UTC · 18 min left'], ['Network pill', 'BNB Chain · Maintenance']],
      actions: [['Primary', 'Deposit on Arbitrum', 'Deposit step 1 with Arbitrum preselected (fee shown)'], ['Ghost', 'Status page', 'Status page — BNB Chain incident']],
      notes: ['USDT sent to an existing BNB Chain deposit address during the window is credited once it ends.', 'Withdrawals requested during the window stay in Locked and are sent at 02:30 UTC.', 'If the window overruns: “Taking longer than planned — next update 02:45 UTC”. Never a looping timer.'] },
    { no: '06.3', sev: 'Warning', name: 'Degraded chain — congested, slower, pricier', lib: 'Alert/Banner · Warning · Inline (default copy) · Wallet/Confirmations Progress · Delayed · Wallet/Network Pill · Degraded',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Warning', Layout: 'Inline' });
        const r = AL('HORIZONTAL', { gap: 16, align: 'CENTER' }); add(r, await I('20:3076', { State: 'Delayed' }), await pill('Ethereum', 'Degraded', 'Congested'));
        return [a, r]; },
      trigger: 'chain.health = degraded for Ethereum: average confirmation time above 2× typical, or network fee above 2.00 USDT. Clears after 15 min back to normal.',
      copy: [['Title', 'Ethereum network is congested'], ['Body', 'Deposits and withdrawals on Ethereum are slower than usual and network fees are higher (≈2.40 USDT). Arbitrum and Polygon are unaffected.'], ['Progress', 'Delayed — Ethereum congested · est. 9 min']],
      actions: [['Secondary', 'Switch network', 'Network picker with Arbitrum suggested (≈0.08 USDT network fee)']],
      notes: ['Never blocks — the player can still use Ethereum with the higher fee shown before confirming.', 'DP-77412 keeps counting confirmations (7 / 12); the estimate updates live.', 'Network fee is always its own line; the platform withdrawal fee stays 0.00 USDT.'] },
    { no: '06.4', sev: 'Blocking', name: 'Network outage — withdrawal broadcasts failing', lib: 'Alert/Banner · Warning · Inline (copy overridden) · Toast · Error (copy overridden) · Wallet/Network Pill · Degraded',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Warning', Layout: 'Inline' }); await ov(a, 'Title', 'Arbitrum withdrawals are delayed'); await ov(a, 'Body', 'Arbitrum has been degraded since 18:47 UTC and broadcasts are timing out. WD-20931 is safe in Locked — if sending fails 3 times, the 1,500.00 USDT returns to Available and no network fee is charged.'); relabel(a, 'Switch network', 'View WD-20931'); hide(a, 'Close');
        const t = await I('30:16872', { Type: 'Error' }); await ov(t, 'Title', 'Withdrawal couldn’t be sent'); await ov(t, 'Body', 'WD-20931 timed out 3 times on Arbitrum (18:49–18:59 UTC). 1,500.00 USDT is back in your Available balance — no network fee was charged.');
        const r = AL('HORIZONTAL', { gap: 16, align: 'CENTER' }); add(r, t, await pill('Arbitrum', 'Degraded'));
        return [a, r]; },
      trigger: 'chain.health = down for Arbitrum, or withdrawal.broadcast_failed three times for WD-20931 (18:49–18:59 UTC). Alternative outcome of WD-20931 — the success path is in WAL-18.',
      copy: [['Banner title', 'Arbitrum withdrawals are delayed'], ['Banner body', 'Arbitrum has been degraded since 18:47 UTC and broadcasts are timing out. WD-20931 is safe in Locked — if sending fails 3 times, the 1,500.00 USDT returns to Available and no network fee is charged.'], ['Toast title', 'Withdrawal couldn’t be sent'], ['Toast body', 'WD-20931 timed out 3 times on Arbitrum (18:49–18:59 UTC). 1,500.00 USDT is back in your Available balance — no network fee was charged.']],
      actions: [['Secondary', 'View WD-20931', 'Withdrawal detail drawer with the failed-broadcast timeline'], ['Ghost', 'Contact support', 'Help centre ticket prefilled with WD-20931']],
      notes: ['After the 3rd failure the amount returns automatically (Available 9,215.30 → 10,715.30 USDT).', 'The player can request again on another network; whitelist and cooldown rules still apply.', 'Banner stays until the network recovers; the toast is sent once.'] },
    { no: '06.5', sev: 'Warning', name: 'VRF response delayed — draw waiting', lib: 'Jackpot/VRF Stepper · Step=Delayed (default copy)',
      stage: async () => [await I('23:11967', { Step: 'Delayed' })],
      trigger: 'Chainlink VRF hasn’t answered round #1,248’s request (0x9f2c…e71a, sent 20:00:04 UTC) after 5 minutes; typical response is 30–90 s. Read from contract events every 10 s.',
      where: 'Round draw screen (GP-05 Delayed), round page, My entries and a Global Pool banner.',
      copy: [['Elapsed', 'Elapsed since request: 14 min 32 s (20:00:04 → 20:14:36 UTC). Typical response: 30–90 s. No winner can be picked until it answers.'], ['Your entries', 'All 35 of your entries (350.00 USDT) stay locked in the round contract. Nobody — including GLOBAL POOL — can pick winners while the draw waits.'], ['Fallback rule', 'If no randomness arrives by 28 Nov 2026, 20:00:04 UTC (24 h after the request), the contract cancels the round and entry amounts go to Owed — 350.00 USDT for you.']],
      actions: [['Ghost', 'Verify request', 'VRF request 0x9f2c…e71a on the block explorer (illustrative)', 'external-link'], ['Secondary', 'Notify me when drawn', 'Push + email opt-in — off until the player switches it on']],
      notes: ['No admin action can pick winners or re-run the draw; the 24 h cancel rule lives in the contract.', 'Deposits, withdrawals and games keep working.'] },
    { no: '06.6', sev: 'Blocking', name: 'New entries paused — contract circuit breaker', lib: 'Alert/Banner · Warning · Inline (copy + action overridden, close hidden) · Button/Gold · Disabled',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Warning', Layout: 'Inline' }); await ov(a, 'Title', 'New Global Pool entries are paused'); await ov(a, 'Body', 'A safety pause on the GlobalPool contract stopped new entries at 19:05 UTC. Your 35 entries in round #1,248 are safe and still count — the draw, prizes and refunds follow the contract rules. Deposits, withdrawals and games are not affected.'); relabel(a, 'Switch network', 'Why entries are paused'); hide(a, 'Close');
        const r = AL('HORIZONTAL', { gap: 16, align: 'CENTER' }); add(r, await BTN('Gold', 'Entries paused', { size: 'L', state: 'Disabled', lead: 'pause-circle' }), await T('Round #1,248 still closes at 20:00 UTC', 'Body/S', 'text/secondary'), await DEMO('S'));
        return [a, r]; },
      trigger: 'GlobalPool contract emits EntriesPaused (circuit breaker, approved by S. Iyer + K. Osei, AR-1039) on 27 Nov 2026, 19:05 UTC. Cleared by EntriesResumed.',
      where: 'Global Pool hub, round page, participation preview and the lobby Global Pool tile.',
      copy: [['Title', 'New Global Pool entries are paused'], ['Body', 'A safety pause on the GlobalPool contract stopped new entries at 19:05 UTC. Your 35 entries in round #1,248 are safe and still count — the draw, prizes and refunds follow the contract rules. Deposits, withdrawals and games are not affected.'], ['Disabled CTA', 'Entries paused'], ['Caption', 'Round #1,248 still closes at 20:00 UTC']],
      actions: [['Secondary', 'Why entries are paused', 'Status page incident with the contract event and transaction'], ['Ghost', 'View my entries', 'Dashboard › My entries, round #1,248']],
      notes: ['Pauses new entries only — never withdrawals, refunds or settlement.', 'If the round can’t settle normally, refunds follow the contract’s cancel rule (entry amounts to Owed).', 'Admin view: Admin/Contract Card · Paused (ADM-B, page 09).'] }
  ],
  extra: async () => {
    const c = AL('VERTICAL', { name: 'Banner priority & stacking', gap: 16, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: CW });
    add(c, await T('Banner priority & stacking', 'Heading/H4', 'text/primary'));
    const pr = AL('HORIZONTAL', { name: 'Priority order', gap: 8, align: 'CENTER', wrap: true, cgap: 8 });
    const items = [['1', 'Regulatory / region', 'map-pin'], ['2', 'Security', 'shield-alert'], ['3', 'Maintenance active · entries paused', 'wrench'], ['4', 'Degraded chain · VRF delayed', 'activity'], ['5', 'Scheduled maintenance', 'calendar'], ['6', 'Info', 'info']];
    for (let i = 0; i < items.length; i++) { const [n, l, ic] = items[i]; const ch = AL('HORIZONTAL', { gap: 8, p: [8, 12], fill: 'surface/raised', stroke: 'border/default', r: 10, align: 'CENTER' }); add(ch, await T(n, 'Mono/S', 'text/brand'), await IC(ic, 16, 'icon/default'), await T(l, 'Label/M', 'text/primary')); add(pr, ch); if (i < items.length - 1) add(pr, await IC('chevron-right', 16, 'icon/muted')); }
    add(c, [pr, 'FILL']);
    add(c, await bul(['One full-width banner at a time — the highest priority wins; the others collapse into “2 more notices” in the notifications panel.', 'Feature-level states (disabled CTAs, disabled network options, inline alerts) always show, whatever banner is on top.', 'Toasts announce transitions (started, recovered, failed); they never carry the only copy of a state.', 'Times are absolute UTC with the local time in a tooltip; countdowns derive from real end times and never loop.'], 1264));
    return c;
  },
  related: ['[GP-05] Round Drawing / Delayed — VRF response overdue / 1440 + 390 (pages 07, 10)', '[WAL-18/19] Withdrawal processing and failure — network failure outcome of WD-20931 (page 06)', '[WAL-07] Deposit pending — Delayed, Ethereum congested (page 06)', '[ADM-B] Contract card · Paused and circuit-breaker approvals (page 09)']
});
fitSection(sec);
const flags = audit(f);
await f.screenshot({ scale: 0.5 });
return { section: sec.id, frame: f.id, name: f.name, x: f.x, w: f.width, h: f.height, flags };
