// adm-core #03 — ADM-X1 approver side over a clone of the ADM-00 Approvals inbox (36:522948).
// Flow (left→right in the X1 band, after Confirm-with-reason at x=120 and Request submitted at x=1680):
//   x=3240 Re-authenticate (step-up 2FA, K. Osei, 20:30 UTC) → x=4800 Second approver review (Ready) → x=6360 Approved & released.
//   Below the review: Self-approval blocked (A. Marin opens her own AR-1042).
// IDEMPOTENT (skips frames that already exist). Requires #02 (X1 band) to have run.
const bandX = sec.children.find(n => n.name === 'Band — ADM-X1'); if (!bandX) throw new Error('Run 02-x1-requester first (Band — ADM-X1 missing)');
const Y = bandX.y + 120;
const SRC = await figma.getNodeByIdAsync('36:522948'); const H2 = SRC.height + 160;
// touch-up on the requester dialogs from #02: a release is not destructive → header icon tile from danger tint to brand tint
async function brandTile(fid) { const f = await figma.getNodeByIdAsync(fid); const d = f && f.findOne(n => n.type === 'INSTANCE' && n.name === 'Admin/Confirm With Reason Dialog'); if (!d) return 0; let k = 0; for (const n of d.findAll(n => n.type === 'FRAME' && n.width <= 48 && n.height <= 48 && Array.isArray(n.fills) && n.fills[0] && n.fills[0].boundVariables && n.fills[0].boundVariables.color && n.fills[0].boundVariables.color.id === VAR['status/danger-tint'].id)) { n.fills = [paint('brand/tint')]; tint(n, 'icon/brand'); k++; } return k; }
OUT.tiles = []; for (const id of ['178:99766', '178:100079', '178:100360']) OUT.tiles.push(await brandTile(id));
const made = [];
async function setTxt(t, v) { for (const fo of (t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName])) await figma.loadFontAsync(fo); t.characters = v; }
async function back(name, x, y, as, session) { if (EX(name)) { OUT.skipped.push(name); return null; } const f = SRC.clone(); sec.appendChild(f); f.x = x; f.y = y; f.name = name;
  const sb = f.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.id === '22:5501');
  const tb = f.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.id === '22:6483');
  if (as === 'KO') { for (const r of [sb, tb]) if (r) { await setT(r, 'Initials', 'KO'); await setT(r, 'A. Marin', 'K. Osei'); await setT(r, 'Finance Lead', 'Compliance Officer'); } if (sb) await setT(sb, '8 of 10 modules', '7 of 10 modules'); }
  if (sb && session) for (const t of sb.findAll(n => n.type === 'TEXT' && n.characters.startsWith('2FA session'))) await setTxt(t, session);
  return f; }
async function modalShell(w, icon, tile, ic, title, sub) {
  const m = AL('VERTICAL', { name: 'Modal — ' + title, w, fill: 'surface/overlay', stroke: 'border/subtle', r: 20, clip: true }); await fx(m, 'Elevation/4 — Modal');
  const h = row({ name: 'Header', gap: 14, p: [20, 20, 20, 24], align: 'MIN' }); strokeSides(h, 'border/subtle', { b: 1 });
  const tl = AL('HORIZONTAL', { name: 'Icon tile', w: 40, h: 40, fill: tile, r: 10, align: 'CENTER', justify: 'CENTER' }); add(tl, await IC(icon, 20, ic));
  const tx = col({ name: 'Title', gap: 4 }); add(tx, await T(title, 'Heading/H4', 'text/primary', { w: w - 190 }), await T(sub, 'Body/S', 'text/secondary', { w: w - 190 }));
  add(h, tl, [tx, 'FILL'], await DEMO('S'), await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.x }));
  add(m, [h, 'FILL']); return m; }
async function footer(m, cap, btns) { const fr = row({ name: 'Footer', gap: 8, p: [16, 24] }); strokeSides(fr, 'border/subtle', { t: 1 }); const c = await T(cap, 'Caption', 'text/tertiary', { w: 300 }); add(fr, [c, 'FILL'], ...btns); add(m, [fr, 'FILL']); return fr; }
async function line(icon, ic, text, w, tc = 'text/secondary', st = 'Body/S') { const r = row({ name: 'Line — ' + text.slice(0, 24), gap: 10, align: 'MIN' }); add(r, await IC(icon, 16, ic), await T(text, st, tc, { w: w - 26 })); return r; }
async function callout(tint, icon, ic, title, body, w) { const c = row({ name: 'Callout — ' + title.slice(0, 24), gap: 10, p: [12, 14], fill: tint, r: 10, align: 'MIN' }); const tx = col({ gap: 4 }); add(tx, await T(title, 'Label/L', 'text/primary', { w: w - 56 }), await T(body, 'Body/S', 'text/secondary', { w: w - 56 })); add(c, await IC(icon, 18, ic), tx); return c; }
async function arCard(state) { const c = await I('23:24500', { State: state }); c.name = 'Admin/Approval Request Card';
  // the card's own action row is hidden: the dialog footer owns the decision buttons
  const isBtn = k => k.type === 'INSTANCE' && k.mainComponent && k.mainComponent.parent && /^Button\//.test(k.mainComponent.parent.name);
  const rows = new Set(c.findAll(isBtn).map(b => b.parent));
  for (const r of rows) if (r && r !== c && r.children.every(k => isBtn(k) || k.name === 'Spacer')) r.visible = false;
  return c; }
const RW = 428; // right column width inside the 960 review modal (960 − 2×24 padding − 460 card − 24 gap)
async function review(kind) {
  const cfg = { review: ['user-check', 'brand/tint', 'icon/brand', 'Review AR-1042 · release flagged withdrawal', 'Requested by A. Marin (Finance Lead) on 27 Nov 2026, 18:20 UTC · expires 22:20 UTC (in 1 h 49 min)', 'Pending'],
    self: ['ban', 'status/danger-tint', 'status/danger', "AR-1042 · you can't approve your own request", 'Requested by you on 27 Nov 2026, 18:20 UTC · waiting for a second approver · expires 22:20 UTC', 'Pending'],
    approved: ['check-circle', 'status/success-tint', 'status/success', 'AR-1042 approved · WD-20931 released', 'Approved by K. Osei (Compliance Officer) on 27 Nov 2026, 20:31 UTC · decision is final', 'Approved'] }[kind];
  const m = await modalShell(960, cfg[0], cfg[1], cfg[2], cfg[3], cfg[4]);
  const b = row({ name: 'Body', gap: 24, p: 24, align: 'MIN' }); add(m, [b, 'FILL']);
  add(b, await arCard(cfg[5]));
  const r = col({ name: 'Decision', gap: 16, w: RW }); add(b, r);
  if (kind === 'review') {
    add(r, await T('YOUR DECISION · SECOND APPROVER', 'Overline', 'text/brand'));
    const vf = row({ name: '2FA verified', gap: 8, p: [8, 12], fill: 'status/success-tint', r: 10 }); add(vf, await IC('shield-check', 16, 'status/success'), await T('2FA verified 20:30 UTC · valid for this decision until 20:35 UTC', 'Label/M', 'text/success', { w: RW - 48 })); add(r, [vf, 'FILL']);
    add(r, [await I('13:565', { State: 'Default' }, { Label: 'Reason category', Value: 'AML — independent review completed', 'Show helper': false, 'Show leading icon': false }), 'FILL']);
    const ta = await I('16:3858', { State: 'Focus' }, { Label: "Your reason — stored next to the requester's", 'Show counter': true }); add(r, [ta, 'FILL']);
    await setT(ta, 'Value text', 'Reviewed AML-3317 evidence and the signed ownership proof for 0x7c4e…a21D. The velocity hit is explained by the 14 Oct 2026 whitelisting. Agree to release under FIN-2.3.'); await setT(ta, 'Counter', '171 / 500');
    const wh = col({ name: 'What happens', gap: 8, p: 16, fill: 'surface/raised', r: 10 }); add(wh, await T('WHAT HAPPENS WHEN YOU APPROVE', 'Overline', 'text/tertiary'));
    for (const [ic, t] of [['arrow-up-right', '1,500.00 USDT leaves Locked and joins the next Arbitrum batch (every 10 min). The player receives 1,499.92 USDT after the 0.08 USDT network fee.'], ['mail', 'The player sees "Approved — sending" and gets an email. No reason codes are shown to them.'], ['history', 'One audit entry stores both admins, both reasons, IPs and 2FA checks — hash-chained.']]) add(wh, [await line(ic, 'icon/muted', t, RW - 32), 'FILL']);
    add(r, [wh, 'FILL']);
    add(r, [await line('lock', 'icon/muted', "You can't edit the amount, destination or network here. To change anything, reject and ask A. Marin for a new request.", RW, 'text/tertiary', 'Caption'), 'FILL']);
    await footer(m, 'Requester ≠ approver (SYS-1.1) · Reject and Approve both need a reason', [await BTN('Secondary', 'Cancel', { size: 'M' }), await BTN('Danger', 'Reject request', { size: 'M', lead: 'x-circle' }), await BTN('Primary', 'Approve & release', { size: 'M', lead: 'shield-check' })]);
  } else if (kind === 'self') {
    add(r, [await callout('status/danger-tint', 'ban', 'status/danger', "You can't approve your own request", 'You (A. Marin, Finance Lead) requested AR-1042 at 18:20 UTC. Policy SYS-1.1 requires a different admin with Compliance or Super Admin rights to approve or reject it.', RW), 'FILL']);
    add(r, await T('ELIGIBLE APPROVERS', 'Overline', 'text/tertiary'));
    for (const [ini, nm, role, st, ic, cl] of [['KO', 'K. Osei', 'Compliance', 'Online · last active 18:46 UTC', 'check-circle', 'status/success'], ['SI', 'S. Iyer', 'Super Admin', 'Away · back at 21:00 UTC', 'clock', 'icon/muted']]) { const p = row({ name: 'Approver — ' + nm, gap: 10, p: [10, 12], fill: 'surface/raised', r: 10 }); const tx = col({ gap: 2 }); add(tx, await T(nm, 'Label/L'), await stat(ic, cl, st, 'text/tertiary', 'Caption')); add(p, await I('9:238', { Size: 'S' }, { Initials: ini }), tx, [sp(), 'FILL'], await I('23:18440', { Role: role, Size: 'S' })); add(r, [p, 'FILL']); }
    add(r, [await line('lock', 'icon/muted', 'Nothing moves until a second admin decides: WD-20931 stays in Locked and the player keeps seeing "Under review". If nobody decides by 22:20 UTC the request expires and changes nothing.', RW), 'FILL']);
    add(r, [await line('eye', 'icon/muted', 'Opening this request was logged. No decision was recorded.', RW, 'text/tertiary', 'Caption'), 'FILL']);
    await footer(m, 'Withdrawing your request returns WD-20931 to the review queue', [await BTN('Ghost', 'Withdraw my request', { size: 'M' }), await BTN('Secondary', 'Remind approvers', { size: 'M', lead: 'bell' }), await BTN('Primary', 'Approve & release', { size: 'M', state: 'Disabled', lead: 'lock' })]);
  } else {
    add(r, [await callout('status/success-tint', 'check-circle', 'status/success', 'Released to the next Arbitrum batch', 'You approved AR-1042 at 20:31 UTC. WD-20931 (1,500.00 USDT → 0x7c4e…a21D) is sent at 20:32 UTC; the player receives 1,499.92 USDT.', RW), 'FILL']);
    add(r, await T('DECISION TRAIL', 'Overline', 'text/tertiary'));
    for (const [ic, cl, t, s] of [['check-circle', 'status/success', '18:20 UTC · Requested by A. Marin (Finance)', 'AML — screening cleared · 2FA ✓ · audit #88,190'], ['check-circle', 'status/success', '20:31 UTC · Approved by K. Osei (Compliance)', 'AML — independent review completed · 2FA ✓ · audit #88,391'], ['clock', 'status/pending', '20:32 UTC · Broadcast in Arbitrum batch', 'Then 20 confirmations (≈ 30 s). Shown live in Finance → Withdrawals.']]) { const st = row({ name: 'Step — ' + t.slice(0, 20), gap: 10, p: [10, 0], align: 'MIN' }); strokeSides(st, 'border/subtle', { t: 1 }); const tx = col({ gap: 2 }); add(tx, await T(t, 'Label/M', 'text/primary', { w: RW - 30 }), await T(s, 'Caption', 'text/tertiary', { w: RW - 30 })); add(st, await IC(ic, 18, cl), tx); add(r, [st, 'FILL']); }
    add(r, [await line('info', 'icon/muted', "Decisions are final. On-chain transfers can't be reversed — if something is wrong, open an incident and contact the player; never adjust balances by hand.", RW, 'text/tertiary', 'Caption'), 'FILL']);
    await footer(m, 'Hash-chained in the audit log · both reasons stored', [await BTN('Secondary', 'View audit entry', { size: 'M', lead: 'history' }), await BTN('Primary', 'Done', { size: 'M' })]);
  }
  return m; }
// ---- 1. Re-authenticate (step-up 2FA) ----
{ const f = await back('[ADM-X1] Re-authenticate — Fresh 2FA before approving / 1440 / Default', 3240, Y, 'KO', '2FA session · ended 20:15 UTC'); if (f) {
  const m = await modalShell(480, 'fingerprint', 'brand/tint', 'icon/brand', "Confirm it's you", 'Your 2FA session ended at 20:15 UTC. Approving AR-1042 needs a fresh code — open dialogs never submit on their own.');
  const b = col({ name: 'Body', gap: 16, p: 24 }); add(m, [b, 'FILL']);
  const otp = await I('16:3761', { State: 'Filling' }, { Label: 'Authenticator code', Description: 'Enter the 6-digit code from your authenticator app.' }); add(b, otp); await setT(otp, 'Resend timer', 'Current code refreshes in 0:12');
  add(b, await BTN('Ghost', 'Use a security key instead', { size: 'S', lead: 'key' }));
  add(b, [await line('info', 'icon/muted', 'A fresh code covers one sensitive decision for 5 minutes. 5 wrong codes pause your approvals for 15 minutes and alert IT security.', 432, 'text/tertiary', 'Caption'), 'FILL']);
  await footer(m, 'Logged with IP, device and time', [await BTN('Secondary', 'Cancel', { size: 'M' }), await BTN('Primary', 'Verify', { size: 'M', state: 'Disabled' })]);
  overlay(f, m); made.push(f); } }
// ---- 2. Second approver review ----
{ const f = await back('[ADM-X1] Four-eyes — Second approver review / 1440 / Ready to approve', 4800, Y, 'KO', '2FA session · renewed 20:30 UTC'); if (f) { const m = await review('review'); overlay(f, m); made.push(f); } }
// ---- 3. Approved ----
{ const f = await back('[ADM-X1] Four-eyes — Approved / 1440 / Released', 6360, Y, 'KO', '2FA session · renewed 20:30 UTC'); if (f) { const m = await review('approved'); overlay(f, m); made.push(f); } }
// ---- 4. Self-approval blocked (A. Marin) ----
{ const f = await back('[ADM-X1] Four-eyes — Self-approval blocked / 1440 / Requester opens own request', 4800, Y + H2, 'AM', null); if (f) { const m = await review('self'); overlay(f, m); made.push(f); } }
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.32 });
// reference read of the 1440 inbox (for the tablet/mobile approvals scripts)
const tbl = SRC.findOne(n => n.name === 'Approvals table'); const btm = SRC.findOne(n => n.name === 'Bottom row'); const tabs = SRC.findOne(n => n.name === 'Tabs');
const ref = { rows: tbl ? tbl.children.slice(0, 2).map(r => [r.name, Math.round(r.width), r.children.map(c => c.name + ':' + Math.round(c.width) + ':' + c.layoutSizingHorizontal).join('|')]) : null,
  text: tbl ? tbl.findAll(n => n.type === 'TEXT').map(t => t.characters).filter(s => s.trim()).slice(0, 90) : null,
  bottom: btm ? btm.findAll(n => n.type === 'TEXT').map(t => t.characters).slice(0, 30) : null, tabs: tabs ? tabs.findAll(n => n.type === 'TEXT').map(t => t.characters) : null };
return { made: made.map(f => [f.name, f.id, f.x, f.y, f.height]), skipped: OUT.skipped, tiles: OUT.tiles, ref };
