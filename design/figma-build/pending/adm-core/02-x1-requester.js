// adm-core pending #2 — ADM-X1 requester side (A. Marin, Finance Lead, 18:20 UTC). Backdrop = clone of ADM-F2 'Withdrawal WD-20931 — Detail / 1440 / Under review' (33:230322, built by adm-finance; cloned, not edited).
// Frames: Confirm with reason Default (empty) / Ready / Error stacked at x=120, Request submitted at x=1680. Dialog = Admin/Confirm With Reason Dialog (25:16172) re-titled for a RELEASE; its Danger submit is swapped to Button/Primary (a release is not destructive).
// touch-up on ADM-02 overview (built in #01b): page-header subtitle narrowed so the header row fits 1136 px
{ const ov = await figma.getNodeByIdAsync('171:73506'); const tb = ov && ov.findOne(n => n.name === 'Title block'); const st = tb && tb.children.find(n => n.type === 'TEXT' && n.characters.startsWith('KPIs for')); if (st) { st.resize(600, st.height); st.textAutoResize = 'HEIGHT'; } }
const y0 = bandY('ADM-X1');
await band('ADM-X1', 'ADM-X1 · Four-eyes approval, confirm-with-reason & re-auth', 'One pattern for every sensitive action. Requester: reason category + written reason + fresh 2FA → request AR-1042 (expires in 4 h). Second approver (different admin, allowed role): reviews, writes their own reason, confirms with 2FA. Self-approval is blocked; expired requests change nothing; every step is hash-chained in the audit log.', y0);
const Y = y0 + 120;
const src = await figma.getNodeByIdAsync('33:230322');
async function req(name, x, y, state) { if (EX(name)) { OUT.skipped.push(name); return null; } const f = src.clone(); sec.appendChild(f); f.x = x; f.y = y; f.name = name; const d = await I('25:16172', { State: state }); d.name = 'Admin/Confirm With Reason Dialog'; await rep(d, 'Reject flagged withdrawal', 'Release flagged withdrawal'); return { f, d }; }
const out = [];
{ const R = await req('[ADM-X1] Four-eyes — Confirm with reason / 1440 / Default (empty)', 120, Y, 'Default'); if (R) { const { f, d } = R; await swapBtn(d, 'Submit for approval', 'Primary'); overlay(f, d); out.push(f); } }
const H = (out[0] ? out[0].height : (EX('[ADM-X1] Four-eyes — Confirm with reason / 1440 / Default (empty)') || { height: 1024 }).height) + 160;
{ const R = await req('[ADM-X1] Four-eyes — Confirm with reason / 1440 / Ready', 120, Y + H, 'Ready'); if (R) { const { f, d } = R; await swapBtn(d, 'Submit for approval', 'Primary'); await setT(d, 'Value', 'AML — screening cleared'); await setT(d, 'Value text', 'AML-3317 closed as a false positive on the velocity rule. Destination 0x7c4e…a21D is whitelisted since 14 Oct 2026 and ownership was proven by signature. Release per FIN-2.3.'); await setT(d, 'Counter', '186 / 500'); overlay(f, d); out.push(f); } }
{ const R = await req('[ADM-X1] Four-eyes — Confirm with reason / 1440 / Error', 120, Y + 2 * H, 'Error'); if (R) { const { f, d } = R; await swapBtn(d, 'Submit for approval', 'Primary'); overlay(f, d); out.push(f); } }
{ const R = await req('[ADM-X1] Four-eyes — Request submitted / 1440 / Awaiting 2nd approver', 1680, Y, 'Submitted'); if (R) { const { f, d } = R; await rep(d, 'AR-1043', 'AR-1042'); await rep(d, '#88244', '#88190'); overlay(f, d); out.push(f); } }
fitSection(sec);
for (const f of out) await f.screenshot({ scale: 0.3 });
return { ids: out.map(f => [f.name, f.id, f.x, f.y, f.height]), skipped: OUT.skipped };
