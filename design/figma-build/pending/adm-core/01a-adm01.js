// adm-core #01a — ADM-00 touch-ups + ADM-01 Sign in (Default) + 5 states. Page 09, section 36:522944.
// IDEMPOTENT: skips frames that already exist (by exact name). Places the ADM-01 band below everything else (nextY) on first run.
// ---------- fixes on ADM-00 (built 27 Nov 2026) ----------
{ const np = await figma.getNodeByIdAsync('39:50316');
  const cg = np.findOne(n => n.name === 'Group — Compliance'); const cnt = cg && cg.findOne(n => n.name === 'Count'); if (cnt) cnt.visible = false;
  await rep(np, '#88247', '#88216'); // audit sequence: newest #88,214 at 18:44:30 UTC (demo-data)
  for (const id of ['39:50316', '36:522948', '36:537070', '36:540097']) { const fr = await figma.getNodeByIdAsync(id); const sa = fr.findOne(n => n.name === 'Signed-in admin'); const t = sa && sa.findOne(n => n.type === 'TEXT' && n.name === 'A. Marin'); if (t) t.textAutoResize = 'WIDTH_AND_HEIGHT'; } }
// ---------- ADM-01 Sign in default ----------
let BASE;
{ const ex0 = EX('[ADM-01] Admin login — Sign in / 1440 / Default'); if (ex0) { BASE = ex0.id; } else { const y0 = bandY('ADM-01');
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
  BASE = f.id; OUT.signin = [f.id, f.y, f.height]; } }
// ---------- ADM-01 states (clones of Sign in; the 'Form' column is rebuilt) ----------
{ const base = await figma.getNodeByIdAsync(BASE); const Y1 = base.y, H = base.height + 160;
  async function cloneState(name, x, y) { if (EX(name)) { OUT.skipped.push(name); return null; } const f = base.clone(); sec.appendChild(f); f.x = x; f.y = y; f.name = name; const form = f.findOne(n => n.name === 'Form'); for (const k of [...form.children]) k.remove(); return { f, form }; }
  async function callout(kind, title, bodyT) { const tone = { danger: ['status/danger-tint', 'status/danger', 'alert-circle'], info: ['status/info-tint', 'status/info', 'info'] }[kind]; const c = row({ name: 'Callout — ' + kind, gap: 10, p: [12, 14], fill: tone[0], r: 10, align: 'MIN' }); const tx = col({ gap: 4 }); add(tx, await T(title, 'Label/L', 'text/primary', { w: 370 }), await T(bodyT, 'Body/S', 'text/secondary', { w: 370 })); add(c, await IC(tone[2], 18, tone[1]), tx); return c; }
  async function head(form, over, title, sub, oc = 'text/brand') { add(form, await T(over, 'Overline', oc), await T(title, 'Heading/H2', 'text/primary', { w: 432 }), await T(sub, 'Body/M', 'text/secondary', { w: 432 })); }
  async function email(form, v, state = 'Filled') { const em = await I('13:762', { State: state, Size: 'L' }, { Label: 'Work email', 'Show helper': false }); add(form, [em, 'FILL']); await setT(em, 'Value text', v); }
  async function pass(form, state) { const pw = await I('14:1735', { State: state, Strength: 'Empty' }, { Label: 'Password', 'Show strength': false, 'Show requirements': false }); add(form, [pw, 'FILL']); await setT(pw, 'Value text', state === 'Error' ? '••••••••••••' : 'Enter your password'); return pw; }
  const shots = [];
  { const R = await cloneState('[ADM-01] Admin login — Sign in / 1440 / Error — wrong password', 120, Y1 + H); if (R) { const { f, form } = R;
    await head(form, 'STEP 1 OF 2 · SIGN IN', 'Sign in to the admin console', "Use your staff account. Next you'll confirm with your authenticator app or a hardware security key.");
    add(form, [await callout('danger', 'Email or password is incorrect', '2 attempts left. After 5 failed attempts in 15 minutes the account locks and IT security is notified. This attempt was logged at 18:31 UTC.'), 'FILL']);
    await email(form, 'a.marin@staff.globalpool.example'); const pw = await pass(form, 'Error'); for (const nm of ['Helper text', 'Error text']) await setT(pw, nm, 'Check your password and try again. Passwords are case-sensitive.');
    const cr = row({ name: 'Options', gap: 12 }); add(cr, await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Trust this device for 12 hours', 'Show description': false }), [sp(), 'FILL'], await BTN('Ghost', "Can't sign in?", { size: 'S' })); add(form, [cr, 'FILL']);
    add(form, [await BTN('Primary', 'Continue', { size: 'L', trail: 'arrow-right' }), 'FILL'], [await BTN('Secondary', 'Sign in with a security key', { size: 'L', lead: 'key' }), 'FILL']);
    shots.push(f); } }
  { const R = await cloneState('[ADM-01] Admin login — Sign in / 1440 / Blocked — network not approved', 120, Y1 + 2 * H); if (R) { const { f, form } = R;
    await head(form, 'SIGN-IN BLOCKED', "This network isn't approved for admin access", 'The admin console only accepts sign-ins from approved company networks on managed devices.', 'text/danger');
    add(form, [await callout('danger', 'Attempt blocked and logged · #88205', 'From 185.21.44.xx · Madrid, ES · Windows · Edge · 27 Nov 2026, 18:33 UTC. Your account was not signed in and nothing was accessed.'), 'FILL']);
    add(form, await T('If this was you, contact IT security from a managed device and they will confirm your access. If it was not you, no action is needed — IT security has already been alerted.', 'Body/S', 'text/secondary', { w: 432 }));
    add(form, [await BTN('Primary', 'Contact IT security', { size: 'L', lead: 'mail' }), 'FILL'], [await BTN('Secondary', 'Read the access policy', { size: 'L', lead: 'book' }), 'FILL']);
    add(form, await T('GLOBAL POOL staff will never ask for your password or 2FA codes.', 'Caption', 'text/tertiary', { w: 432 }));
    shots.push(f); } }
  { const R = await cloneState('[ADM-01] Admin login — 2FA / 1440 / Default', 1680, Y1); if (R) { const { f, form } = R;
    await head(form, 'STEP 2 OF 2 · VERIFY', "Confirm it's you", 'Signed in as a.marin@staff.globalpool.example on MacBook Pro · Chrome · Lisbon. Enter the 6-digit code from your authenticator app.');
    const otp = await I('16:3761', { State: 'Filling' }, { Label: 'Authenticator code', Description: 'Codes refresh every 30 seconds in your app.' }); add(form, otp); await setT(otp, 'Resend timer', 'Current code refreshes in 0:18');
    add(form, [await BTN('Primary', 'Verify and sign in', { size: 'L', state: 'Disabled' }), 'FILL'], [await BTN('Secondary', 'Use a security key instead', { size: 'L', lead: 'key' }), 'FILL']);
    const lk = row({ name: 'Links', gap: 8 }); add(lk, await BTN('Ghost', 'Use a backup code', { size: 'S' }), await BTN('Ghost', 'Lost your authenticator?', { size: 'S' })); add(form, lk);
    add(form, [await callout('info', 'Session rules', 'Admin sessions end after 15 minutes without activity. Approvals, restrictions and exports ask for a fresh code even while you are signed in.'), 'FILL']);
    shots.push(f); } }
  { const R = await cloneState('[ADM-01] Admin login — 2FA / 1440 / Locked — too many codes', 1680, Y1 + H); if (R) { const { f, form } = R;
    await head(form, 'STEP 2 OF 2 · VERIFY', 'Too many incorrect codes', 'For your security, sign-in for this account is paused.', 'text/danger');
    const otp = await I('16:3761', { State: 'Disabled' }, { Label: 'Authenticator code', Description: 'Code entry is disabled while the account is locked.' }); add(form, otp); await setT(otp, 'Resend timer', 'Locked');
    add(form, [await callout('danger', 'Sign-in locked until 18:57 UTC (15 minutes)', '5 incorrect codes since 18:41 UTC. IT security was notified automatically. Nothing in the admin console was accessed.'), 'FILL']);
    add(form, [await BTN('Primary', 'Contact IT security', { size: 'L', lead: 'mail' }), 'FILL'], [await BTN('Ghost', 'Back to sign in', { size: 'L', lead: 'arrow-left' }), 'FILL']);
    shots.push(f); } }
  { const R = await cloneState('[ADM-01] Session expired — Re-authenticate / 1440 / Default', 4800, Y1); if (R) { const { f, form } = R;
    await head(form, 'SESSION ENDED', 'You were signed out', 'Your session ended at 19:02 UTC after 15 minutes without activity. Sign in again to go back to Approvals.', 'text/warning');
    add(form, [await callout('info', 'Nothing was submitted while you were away', 'Open dialogs are never sent automatically. AR-1042 is still waiting for a second approver and expires at 22:20 UTC.'), 'FILL']);
    await email(form, 'k.osei@staff.globalpool.example', 'Disabled'); await pass(form, 'Focus');
    add(form, [await BTN('Primary', 'Sign in again', { size: 'L', trail: 'arrow-right' }), 'FILL'], await BTN('Ghost', 'Not you? Use another account', { size: 'S' }));
    shots.push(f); } }
  OUT.states = shots.map(f => [f.name, f.id, f.x, f.y, f.height]);
  OUT.basefix = true; }
fitSection(sec);
const __shot = [BASE, ...(OUT.states||[]).map(s => s[1])];
OUT.list = sec.children.filter(n => n.type === 'FRAME').map(n => [n.name, n.id, Math.round(n.x), Math.round(n.y), Math.round(n.width), Math.round(n.height)]);
// verification: one composite screenshot of the ADM-01 band area
const __b = sec.children.find(n => n.name === 'Band — ADM-01');
for (const id of __shot.slice(0, 1)) { const n = await figma.getNodeByIdAsync(id); if (n) await n.screenshot({ scale: 0.35 }); }
for (const s of (OUT.states||[])) { const n = await figma.getNodeByIdAsync(s[1]); if (n) await n.screenshot({ scale: 0.25 }); }
return OUT;
