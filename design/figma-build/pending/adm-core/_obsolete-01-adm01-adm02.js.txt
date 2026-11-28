// adm-core pending #1 — ADM-00 touch-ups + ADM-01 Sign in (Default) + 5 states + ADM-02 Overview (Default). Page 09, section 36:522944.
// Run once. Places ADM-01 band below the ADM-00 band (nextY), ADM-02 band below ADM-01.
// ---------- fixes on ADM-00 (built 27 Nov 2026) ----------
{ const np = await figma.getNodeByIdAsync('39:50316');
  const cg = np.findOne(n => n.name === 'Group — Compliance'); const cnt = cg && cg.findOne(n => n.name === 'Count'); if (cnt) cnt.visible = false;
  await rep(np, '#88247', '#88216'); // audit sequence: newest #88,214 at 18:44:30 UTC (demo-data)
  for (const id of ['39:50316', '36:522948', '36:537070', '36:540097']) { const fr = await figma.getNodeByIdAsync(id); const sa = fr.findOne(n => n.name === 'Signed-in admin'); const t = sa && sa.findOne(n => n.type === 'TEXT' && n.name === 'A. Marin'); if (t) t.textAutoResize = 'WIDTH_AND_HEIGHT'; } }
// ---------- ADM-01 Sign in default ----------
let BASE;
{ const y0 = nextY(sec);
  await band('ADM-01', 'ADM-01 · Admin login, 2FA & session timeout', 'Separate staff-only entry: work email + password, then authenticator code or hardware key. 15-minute idle timeout with a real countdown and re-authentication. Every attempt is audit-logged; blocked networks get support routes, never workarounds.', y0);
  const f = await screen('[ADM-01] Admin login — Sign in / 1440 / Default', 1440, {}); f.primaryAxisSizingMode = 'AUTO';
  sec.appendChild(f); f.x = 120; f.y = y0 + 120;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body', h: 988 }); add(f, [body, 'FILL']);
  const L = AL('VERTICAL', { name: 'Sign-in panel', w: 560, p: [48, 64], fill: 'bg/secondary', justify: 'SPACE_BETWEEN' }); strokeSides(L, 'border/subtle', { r: 1 });
  add(body, L); L.layoutSizingVertical = 'FILL';
  const top = row({ name: 'Brand row', gap: 12 });
  const env = row({ name: 'Environment tag', gap: 6, p: [4, 10], fill: 'status/danger-tint', r: 9999 }); add(env, ellipse(6, 6, 'status/danger', 'Dot'), await T('PRODUCTION', 'Overline', 'text/danger'));
  add(top, await I('4:797'), await T('Admin console', 'Label/M', 'text/tertiary'), [sp(), 'FILL'], env);
  const form = col({ name: 'Form', gap: 20, w: 432 });
  add(form, await T('STEP 1 OF 2 · SIGN IN', 'Overline', 'text/brand'), await T('Sign in to the admin console', 'Heading/H2', 'text/primary', { w: 432 }), await T("Use your staff account. Next you'll confirm with your authenticator app or a hardware security key.", 'Body/M', 'text/secondary', { w: 432 }));
  const em = await I('13:762', { State: 'Filled', Size: 'L' }, { Label: 'Work email', 'Show helper': false }); add(form, [em, 'FILL']); await setT(em, 'Value text', 'a.marin@staff.globalpool.example');
  const pw = await I('14:1735', { State: 'Focus', Strength: 'Empty' }, { Label: 'Password', 'Show strength': false, 'Show requirements': false }); add(form, [pw, 'FILL']); await setT(pw, 'Value text', 'Enter your password');
  const cr = row({ name: 'Options', gap: 12 }); add(cr, await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Trust this device for 12 hours', 'Show description': false }), [sp(), 'FILL'], await BTN('Ghost', "Can't sign in?", { size: 'S' })); add(form, [cr, 'FILL']);
  add(form, [await BTN('Primary', 'Continue', { size: 'L', trail: 'arrow-right' }), 'FILL']);
  const orr = row({ name: 'Divider', gap: 12 }); add(orr, [rect(10, 1, 'border/subtle', 0, 'Line'), 'FILL'], await T('or', 'Caption', 'text/tertiary'), [rect(10, 1, 'border/subtle', 0, 'Line'), 'FILL']); add(form, [orr, 'FILL']);
  add(form, [await BTN('Secondary', 'Sign in with a security key', { size: 'L', lead: 'key' }), 'FILL']);
  const ft = col({ name: 'Footer', gap: 6 }); add(ft, await T('Authorised GLOBAL POOL staff only. Every sign-in attempt is logged with IP address, device and time.', 'Caption', 'text/tertiary', { w: 432 }), await T('Production · eu-west-1 · v2.14.0', 'Mono/S', 'text/tertiary'));
  add(L, [top, 'FILL'], form, ft);
  const Rp = AL('VERTICAL', { name: 'Policy panel', p: [64, 64], gap: 32, justify: 'CENTER' }); add(body, [Rp, 'FILL']); Rp.layoutSizingVertical = 'FILL';
  const hl = col({ name: 'Headline', gap: 16 }); add(hl, await T('ADMIN CONSOLE · RESTRICTED SYSTEM', 'Overline', 'text/tertiary'), await T('Staff access only.', 'Heading/H1'), await T('The admin console manages player accounts, KYC and money movements. It cannot change draw results, choose winners or pay out from a pool — those actions do not exist here.', 'Body/L', 'text/secondary', { w: 640 }));
  add(Rp, hl);
  const grid = AL('HORIZONTAL', { name: 'Policies', wrap: true, gap: 16, cgap: 16, w: 752 });
  for (const [ic, t, b] of [['fingerprint', '2FA on every sign-in', 'Authenticator app or hardware security key. SMS codes are not accepted for admin accounts.'], ['timer', '15-minute idle timeout', 'Sessions end after 15 minutes without activity. Sensitive actions ask for a fresh 2FA code.'], ['users', 'Four-eyes on sensitive actions', 'Withdrawal releases, account restrictions and configuration changes need a second admin.'], ['history', 'Everything is audited', 'Sign-ins, personal-data views and every action are hash-chained in an append-only audit log.']]) { const cd = panel('Policy — ' + t, { w: 368, gap: 10 }); const tl = AL('HORIZONTAL', { name: 'Icon tile', w: 36, h: 36, fill: 'brand/tint', r: 10, align: 'CENTER', justify: 'CENTER' }); add(tl, await IC(ic, 20, 'icon/brand')); add(cd, tl, await T(t, 'Label/L', 'text/primary'), await T(b, 'Body/S', 'text/secondary', { w: 328 })); add(grid, cd); }
  add(Rp, grid);
  const st = row({ name: 'System status', gap: 10, p: [12, 16], fill: 'surface/default', stroke: 'border/subtle', r: 10 });
  add(st, await IC('check-circle', 18, 'status/success'), await T('Admin console operational', 'Label/L', 'text/primary'), await T('Status as of 27 Nov 2026, 18:30 UTC', 'Caption', 'text/tertiary'), await DEMO('XS'));
  add(Rp, st);
  BASE = f.id; OUT.signin = [f.id, f.y, f.height]; await f.screenshot({ scale: 0.4 }); }
// ---------- ADM-01 states (clones of Sign in; the 'Form' column is rebuilt) ----------
{ const base = await figma.getNodeByIdAsync(BASE); const Y1 = base.y, H = base.height + 160;
  async function cloneState(name, x, y) { const f = base.clone(); sec.appendChild(f); f.x = x; f.y = y; f.name = name; const form = f.findOne(n => n.name === 'Form'); for (const k of [...form.children]) k.remove(); return { f, form }; }
  async function callout(kind, title, bodyT) { const tone = { danger: ['status/danger-tint', 'status/danger', 'alert-circle'], info: ['status/info-tint', 'status/info', 'info'] }[kind]; const c = row({ name: 'Callout — ' + kind, gap: 10, p: [12, 14], fill: tone[0], r: 10, align: 'MIN' }); const tx = col({ gap: 4 }); add(tx, await T(title, 'Label/L', 'text/primary', { w: 370 }), await T(bodyT, 'Body/S', 'text/secondary', { w: 370 })); add(c, await IC(tone[2], 18, tone[1]), tx); return c; }
  async function head(form, over, title, sub, oc = 'text/brand') { add(form, await T(over, 'Overline', oc), await T(title, 'Heading/H2', 'text/primary', { w: 432 }), await T(sub, 'Body/M', 'text/secondary', { w: 432 })); }
  async function email(form, v, state = 'Filled') { const em = await I('13:762', { State: state, Size: 'L' }, { Label: 'Work email', 'Show helper': false }); add(form, [em, 'FILL']); await setT(em, 'Value text', v); }
  async function pass(form, state) { const pw = await I('14:1735', { State: state, Strength: 'Empty' }, { Label: 'Password', 'Show strength': false, 'Show requirements': false }); add(form, [pw, 'FILL']); await setT(pw, 'Value text', state === 'Error' ? '••••••••••••' : 'Enter your password'); return pw; }
  const shots = [];
  { const { f, form } = await cloneState('[ADM-01] Admin login — Sign in / 1440 / Error — wrong password', 120, Y1 + H);
    await head(form, 'STEP 1 OF 2 · SIGN IN', 'Sign in to the admin console', "Use your staff account. Next you'll confirm with your authenticator app or a hardware security key.");
    add(form, [await callout('danger', 'Email or password is incorrect', '2 attempts left. After 5 failed attempts in 15 minutes the account locks and IT security is notified. This attempt was logged at 18:31 UTC.'), 'FILL']);
    await email(form, 'a.marin@staff.globalpool.example'); const pw = await pass(form, 'Error'); for (const nm of ['Helper text', 'Error text']) await setT(pw, nm, 'Check your password and try again. Passwords are case-sensitive.');
    const cr = row({ name: 'Options', gap: 12 }); add(cr, await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Trust this device for 12 hours', 'Show description': false }), [sp(), 'FILL'], await BTN('Ghost', "Can't sign in?", { size: 'S' })); add(form, [cr, 'FILL']);
    add(form, [await BTN('Primary', 'Continue', { size: 'L', trail: 'arrow-right' }), 'FILL'], [await BTN('Secondary', 'Sign in with a security key', { size: 'L', lead: 'key' }), 'FILL']);
    shots.push(f); }
  { const { f, form } = await cloneState('[ADM-01] Admin login — Sign in / 1440 / Blocked — network not approved', 120, Y1 + 2 * H);
    await head(form, 'SIGN-IN BLOCKED', "This network isn't approved for admin access", 'The admin console only accepts sign-ins from approved company networks on managed devices.', 'text/danger');
    add(form, [await callout('danger', 'Attempt blocked and logged · #88205', 'From 185.21.44.xx · Madrid, ES · Windows · Edge · 27 Nov 2026, 18:33 UTC. Your account was not signed in and nothing was accessed.'), 'FILL']);
    add(form, await T('If this was you, contact IT security from a managed device and they will confirm your access. If it was not you, no action is needed — IT security has already been alerted.', 'Body/S', 'text/secondary', { w: 432 }));
    add(form, [await BTN('Primary', 'Contact IT security', { size: 'L', lead: 'mail' }), 'FILL'], [await BTN('Secondary', 'Read the access policy', { size: 'L', lead: 'book' }), 'FILL']);
    add(form, await T('GLOBAL POOL staff will never ask for your password or 2FA codes.', 'Caption', 'text/tertiary', { w: 432 }));
    shots.push(f); }
  { const { f, form } = await cloneState('[ADM-01] Admin login — 2FA / 1440 / Default', 1680, Y1);
    await head(form, 'STEP 2 OF 2 · VERIFY', "Confirm it's you", 'Signed in as a.marin@staff.globalpool.example on MacBook Pro · Chrome · Lisbon. Enter the 6-digit code from your authenticator app.');
    const otp = await I('16:3761', { State: 'Filling' }, { Label: 'Authenticator code', Description: 'Codes refresh every 30 seconds in your app.' }); add(form, otp); await setT(otp, 'Resend timer', 'Current code refreshes in 0:18');
    add(form, [await BTN('Primary', 'Verify and sign in', { size: 'L', state: 'Disabled' }), 'FILL'], [await BTN('Secondary', 'Use a security key instead', { size: 'L', lead: 'key' }), 'FILL']);
    const lk = row({ name: 'Links', gap: 8 }); add(lk, await BTN('Ghost', 'Use a backup code', { size: 'S' }), await BTN('Ghost', 'Lost your authenticator?', { size: 'S' })); add(form, lk);
    add(form, [await callout('info', 'Session rules', 'Admin sessions end after 15 minutes without activity. Approvals, restrictions and exports ask for a fresh code even while you are signed in.'), 'FILL']);
    shots.push(f); }
  { const { f, form } = await cloneState('[ADM-01] Admin login — 2FA / 1440 / Locked — too many codes', 1680, Y1 + H);
    await head(form, 'STEP 2 OF 2 · VERIFY', 'Too many incorrect codes', 'For your security, sign-in for this account is paused.', 'text/danger');
    const otp = await I('16:3761', { State: 'Disabled' }, { Label: 'Authenticator code', Description: 'Code entry is disabled while the account is locked.' }); add(form, otp); await setT(otp, 'Resend timer', 'Locked');
    add(form, [await callout('danger', 'Sign-in locked until 18:57 UTC (15 minutes)', '5 incorrect codes since 18:41 UTC. IT security was notified automatically. Nothing in the admin console was accessed.'), 'FILL']);
    add(form, [await BTN('Primary', 'Contact IT security', { size: 'L', lead: 'mail' }), 'FILL'], [await BTN('Ghost', 'Back to sign in', { size: 'L', lead: 'arrow-left' }), 'FILL']);
    shots.push(f); }
  { const { f, form } = await cloneState('[ADM-01] Session expired — Re-authenticate / 1440 / Default', 4800, Y1);
    await head(form, 'SESSION ENDED', 'You were signed out', 'Your session ended at 19:02 UTC after 15 minutes without activity. Sign in again to go back to Approvals.', 'text/warning');
    add(form, [await callout('info', 'Nothing was submitted while you were away', 'Open dialogs are never sent automatically. AR-1042 is still waiting for a second approver and expires at 22:20 UTC.'), 'FILL']);
    await email(form, 'k.osei@staff.globalpool.example', 'Disabled'); await pass(form, 'Focus');
    add(form, [await BTN('Primary', 'Sign in again', { size: 'L', trail: 'arrow-right' }), 'FILL'], await BTN('Ghost', 'Not you? Use another account', { size: 'S' }));
    shots.push(f); }
  OUT.states = shots.map(f => [f.name, f.id, f.x, f.y, f.height]);
  for (const f of shots) await f.screenshot({ scale: 0.3 }); }
// ---------- ADM-02 Overview default (Super Admin S. Iyer) ----------
{ const y0 = nextY(sec);
  await band('ADM-02', 'ADM-02 · Overview — all KPIs + system health', 'Every brief KPI on one dense page: deposits, withdrawals, gross revenue, platform fees, users, pool liabilities, active rounds, pending withdrawals, KYC statistics and system health. Read-only monitoring; work queues link into their modules. States: default (Super Admin), loading, degraded network, restricted role.', y0);
  const { f, sb, tb, c } = await shell('[ADM-02] Overview / 1440 / Default', 1440, 120, y0 + 120);
  for (const it of sb.findAll(n => n.type === 'INSTANCE' && /^(Group|Item) — /.test(n.name))) { const lbl = it.name.split(' — ')[1]; if (it.name.startsWith('Item')) { it.visible = false; continue; } it.setProperties({ State: lbl === 'Overview' ? 'Active' : 'Default' }); if (lbl === 'Overview') { const ch = it.findOne(n => n.name === 'Chevron'); if (ch) ch.visible = false; } }
  await who(sb, tb, 'SI', 'S. Iyer', 'Super Admin', '10 of 10 modules');
  const seg = await I('20:6978', { Segments: '3' });
  for (const s of seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment'))) { const tx = s.findOne(n => n.type === 'TEXT'); if (tx) s.setProperties({ State: tx.characters.includes('30') ? 'Active' : 'Default' }); }
  await pageHead(c, ['Admin', 'Overview'], 'Overview', 'KPIs for the last 30 days (28 Oct – 26 Nov 2026) and live operations. Data as of 27 Nov 2026, 18:45 UTC · updates live.', [seg, await BTN('Secondary', 'Export snapshot', { size: 'S', lead: 'download' })]);
  async function kpi(trend, label, value, unit, delta, ctx, def) { const t = await I('23:15270', { Trend: trend }); t.name = 'KPI — ' + label; await setT(t, 'Label', label); await setT(t, 'Value', value); await setT(t, 'Unit', unit); await setT(t, 'Delta value', delta); await setT(t, 'vs previous 30 d', ctx); await setT(t, 'Definition', def); return t; }
  async function krow(name, items) { const r = row({ name, gap: 16, align: 'MIN' }); for (const k of items) { const t = await kpi(...k); add(r, [t, 'FILL']); const sk = t.findOne(n => n.name === 'Sparkline'); if (sk) { try { sk.layoutSizingHorizontal = 'FILL'; } catch (e) { sk.resize(240, sk.height); } } } add(c, [r, 'FILL']); return r; }
  await krow('KPIs — money', [['Up', 'Total deposits · 30 d', '12,846,500.00', 'USDT', '+8.4%', 'vs previous 30 d', 'Σ confirmed deposits, all networks'], ['Up', 'Total withdrawals · 30 d', '10,932,140.00', 'USDT', '+6.9%', 'vs previous 30 d', 'Σ executed withdrawals, all networks'], ['Up', 'Gross revenue · 30 d', '811,850.70', 'USDT', '+5.6%', 'vs previous 30 d', 'GGR + platform fees · Revenue reports'], ['Flat', 'Platform fees · 30 d', '60,700.00', 'USDT', '0.0%', 'vs previous 30 d', '1,214,000 entries × 0.05 USDT']]);
  await krow('KPIs — users & liabilities', [['Up', 'Total users', '184,320', 'accounts', '+3.2%', 'vs previous 30 d', 'All registered player accounts'], ['Down', 'Active users · 30 d', '41,206', 'players', '−2.1%', 'vs previous 30 d', 'Placed ≥ 1 bet or pool entry'], ['Flat', 'Pool liabilities', '238,710.40', 'USDT', 'Live', 'snapshot', '186,400.00 open pool + 52,310.40 owed prizes'], ['Flat', 'Active rounds', '1', 'round', 'Live', 'snapshot', 'Round #1,248 · closes 20:00 UTC']]);
  const r3 = row({ name: 'Work queues', gap: 16, align: 'MIN' });
  add(r3, await I('23:15571', { Queue: 'Withdrawals', SLA: 'On track' }), await I('23:15571', { Queue: 'KYC', SLA: 'On track' }));
  const ap = panel('Four-eyes approvals', { gap: 10 }); add(ap, [await ph('Four-eyes approvals', { icon: 'user-check', right: [await BADGE('Pending')] }), 'FILL']);
  for (const [id, t, e] of [['AR-1047', 'Pinfall max bet → 500.00 USDT', '1 h 45 min'], ['AR-1045', 'Lift sign-in suspension · @juno88', '3 h 10 min'], ['AR-1049', 'Export KYC file · REG-221', '3 h 20 min'], ['AR-1042', 'Release WD-20931 · 1,500.00 USDT', '3 h 35 min']]) { const r = row({ name: id, gap: 10, p: [8, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); const l = col({ gap: 2 }); add(l, await T(id, 'Mono/S', 'text/tertiary'), await T(t, 'Body/S', 'text/primary', { w: 200 })); add(r, l, [sp(), 'FILL'], await stat('hourglass', 'icon/muted', e, 'text/tertiary', 'Caption')); add(ap, [r, 'FILL']); }
  add(ap, await BTN('Secondary', 'Open approvals', { size: 'S', trail: 'arrow-right' }));
  add(r3, [ap, 'FILL']); add(c, [r3, 'FILL']);
  const r4 = row({ name: 'Health & KYC', gap: 16, align: 'MIN' });
  const g = await I('30:17353', { Status: 'Operational' }); await setT(g, 'Footnote text', 'No outages in 30 days · Ethereum deposits slower today (congestion)'); add(r4, g);
  const sv = panel('Services', { gap: 4 }); add(sv, [await ph('Services', { icon: 'server' }), 'FILL']);
  for (const [n, m, ic, cl, lab, tc] of [['API gateway', 'p95 42 ms', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Wallet service', 'p95 118 ms', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Chainlink VRF · Arbitrum', 'last fulfilment 37 s', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Chain indexer', '2 blocks behind', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Ethereum deposits', 'avg 9 min to credit', 'alert-triangle', 'status/warning', 'Slower', 'text/warning']]) { const r = row({ name: n, gap: 10, p: [9, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); const l = col({ gap: 2 }); add(l, await T(n, 'Label/M'), await T(m, 'Caption', 'text/tertiary')); add(r, l, [sp(), 'FILL'], await stat(ic, cl, lab, tc)); add(sv, [r, 'FILL']); }
  add(r4, [sv, 'FILL']);
  const ky = panel('KYC statistics', { w: 360, gap: 14 }); add(ky, [await ph('KYC · 30 d', { icon: 'id-card' }), 'FILL']);
  const kn = row({ gap: 8, align: 'MAX' }); add(kn, await T('6,480', 'Number/L'), await T('submitted', 'Body/S', 'text/tertiary')); add(ky, kn);
  const bar = row({ name: 'Outcome bar', gap: 2, r: 9999, clip: true }); add(bar, rect(292, 8, 'status/success', 0, 'Approved'), rect(16, 8, 'status/danger', 0, 'Rejected'), rect(8, 8, 'status/pending', 0, 'Pending')); add(ky, bar);
  for (const [ic, cl, lab, v, tc] of [['check-circle', 'status/success', 'Approved', '5,912 · 91.2%', 'text/success'], ['x-circle', 'status/danger', 'Rejected', '354 · 5.5%', 'text/danger'], ['clock', 'status/pending', 'Pending review', '214 · 3.3%', 'text/secondary']]) { const r = row({ gap: 8 }); add(r, await stat(ic, cl, lab, tc), [sp(), 'FILL'], await T(v, 'Number/S', 'text/primary')); add(ky, [r, 'FILL']); }
  const lv = row({ name: 'By level', gap: 8, p: [10, 0] }); strokeSides(lv, 'border/subtle', { t: 1 });
  for (const [l, v] of [['L1', '3,920'], ['L2', '2,236'], ['L3', '324']]) { const b = col({ gap: 2, p: [6, 10], fill: 'surface/raised', r: 6 }); add(b, await T(l, 'Overline', 'text/tertiary'), await T(v, 'Number/S')); add(lv, [b, 'FILL']); }
  add(ky, [lv, 'FILL'], await T('Median review 6 h 40 min · SLA 48 h · 99% within SLA', 'Caption', 'text/tertiary', { w: 320 }));
  add(r4, ky); add(c, [r4, 'FILL']);
  const r5 = row({ name: 'Pool', gap: 16, align: 'MIN' });
  add(r5, await I('27:15865', { State: 'Default' }));
  const rm = panel('Round #1,248 monitor', { gap: 12 }); add(rm, [await ph('Round #1,248', { icon: 'pool', right: [await BADGE('Live')] }), 'FILL']);
  const pv = col({ gap: 2 }); add(pv, await T('POOL BALANCE', 'Overline', 'text/tertiary'), await T('186,400.00 USDT', 'Number/L', 'text/gold')); add(rm, pv);
  for (const [k, v] of [['Participants', '3,412'], ['Qualifying entries', '18,640'], ['Platform fees (not in pool)', '932.00 USDT'], ['Closes', '27 Nov 2026, 20:00 UTC · in 01:15:00'], ['Threshold', 'Met · 3,412 ≥ 500 players'], ['Draw', 'Chainlink VRF · Arbitrum']]) { const r = row({ gap: 8, p: [6, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await T(k, 'Body/S', 'text/tertiary'), [sp(), 'FILL'], await T(v, 'Label/M', 'text/primary')); add(rm, [r, 'FILL']); }
  const ro = row({ name: 'Read-only note', gap: 8, p: [10, 12], fill: 'surface/raised', r: 10, align: 'MIN' }); add(ro, await IC('lock', 16, 'icon/muted'), await T('Monitoring only. No admin can alter entries, the draw or the payout. Pausing new entries needs two Super Admins.', 'Caption', 'text/secondary', { w: 300 })); add(rm, [ro, 'FILL']);
  add(r5, [rm, 'FILL']); add(c, [r5, 'FILL']);
  const r6 = row({ name: 'Networks & audit', gap: 16, align: 'MIN' });
  const nw = panel('Network health', { gap: 4 }); add(nw, [await ph('Network health', { icon: 'activity' }), 'FILL']);
  for (const [ch, s, cf, t, q] of [['BNB Chain', 'Operational', '15 conf.', '≈ 45 s to credit', '3 deposits confirming'], ['Polygon', 'Operational', '64 conf.', '≈ 2 min', '1 confirming'], ['Arbitrum', 'Operational', '20 conf.', '≈ 30 s', '4 confirming'], ['Ethereum', 'Degraded', '12 conf.', '≈ 9 min · congested', '6 confirming · DP-77412 7 / 12'], ['Solana', 'Operational', '32 · finalized', '≈ 15 s', '0 confirming']]) { const r = row({ name: ch, gap: 12, p: [8, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await I('9:377', { Chain: ch, Status: s }), [sp(), 'FILL'], await T(cf, 'Caption', 'text/tertiary'), await T(t, 'Label/M', s === 'Degraded' ? 'text/warning' : 'text/primary'), await T(q, 'Caption', 'text/tertiary')); add(nw, [r, 'FILL']); }
  add(r6, [nw, 'FILL']);
  const au = panel('Recent sensitive actions', { w: 420, gap: 4 }); add(au, [await ph('Recent sensitive actions', { icon: 'history' }), 'FILL']);
  for (const [tm, wh, ac] of [['18:20', 'A. Marin · Finance', 'Requested AR-1042 · release WD-20931'], ['18:05', 'K. Osei · Compliance', 'Requested AR-1049 · KYC export REG-221'], ['17:55', 'R. Duarte · Support', 'Requested AR-1045 · lift suspension @juno88'], ['16:12', 'S. Iyer · Super Admin', 'Approved AR-1041 · refunds round #1,245']]) { const r = row({ name: tm, gap: 10, p: [8, 0], align: 'MIN' }); strokeSides(r, 'border/subtle', { t: 1 }); const l = col({ gap: 2 }); add(l, await T(ac, 'Body/S', 'text/primary'), await T(wh + ' · hash-chain ✓', 'Caption', 'text/tertiary')); add(r, await T(tm, 'Mono/S', 'text/tertiary'), l); add(au, [r, 'FILL']); }
  add(au, await BTN('Ghost', 'Open audit log', { size: 'S', trail: 'arrow-right' }));
  add(r6, au); add(c, [r6, 'FILL']);
  OUT.overview = [f.id, f.y, f.height];
  await f.screenshot({ scale: 0.45 }); }
fitSection(sec);
return OUT;
