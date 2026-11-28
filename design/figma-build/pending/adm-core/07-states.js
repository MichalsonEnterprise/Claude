// adm-core #07 — two remaining 1440 states:
//  (a) [ADM-01] Session timeout — Warning (real countdown to an absolute sign-out time) over the Approvals inbox (K. Osei, 19:00 UTC), x=3240 in the ADM-01 row;
//  (b) [ADM-02] Overview — Restricted role (Support L2 R. Duarte): money KPIs, pool liabilities, finance queue, pool balance chart and audit panel are
//      removed (not blurred) and replaced by one explanation panel; sidebar groups without access show the lock state. x=1680 in the ADM-02 row. IDEMPOTENT.
const made = [];
async function stxt(t, v) { const fs = t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]; for (const fo of fs) await figma.loadFontAsync(fo); t.characters = v; }
// ---------- (a) session timeout warning ----------
{ const nm = '[ADM-01] Session timeout — Warning / 1440 / 01:42 left'; if (EX(nm)) OUT.skipped.push(nm); else {
  const base = EX('[ADM-01] Admin login — Sign in / 1440 / Default'); const SRC = await figma.getNodeByIdAsync('36:522948');
  const f = SRC.clone(); sec.appendChild(f); f.x = 3240; f.y = base.y; f.name = nm;
  const sb = f.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.id === '22:5501'); const tb = f.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.id === '22:6483');
  for (const r of [sb, tb]) if (r) { await setT(r, 'Initials', 'KO'); await setT(r, 'A. Marin', 'K. Osei'); await setT(r, 'Finance Lead', 'Compliance Officer'); } if (sb) await setT(sb, '8 of 10 modules', '7 of 10 modules');
  if (sb) for (const t of sb.findAll(n => n.type === 'TEXT' && n.characters.startsWith('2FA session'))) await stxt(t, '2FA session · until 19:30 UTC');
  const m = AL('VERTICAL', { name: 'Modal — Session timeout warning', w: 440, fill: 'surface/overlay', stroke: 'border/subtle', r: 20, clip: true }); await fx(m, 'Elevation/4 — Modal');
  const b = col({ name: 'Body', gap: 16, p: [28, 28, 24, 28] });
  const tl = AL('HORIZONTAL', { name: 'Icon tile', w: 44, h: 44, fill: 'status/warning-tint', r: 10, align: 'CENTER', justify: 'CENTER' }); add(tl, await IC('timer', 22, 'status/warning'));
  const hr = row({ gap: 12 }); add(hr, tl, [sp(), 'FILL'], await DEMO('S')); add(b, [hr, 'FILL']);
  add(b, await T('Still there?', 'Heading/H4'));
  const cd = row({ name: 'Countdown', gap: 8, align: 'MAX' }); add(cd, await T('01:42', 'Number/XL', 'text/primary'), await T('until sign-out at 19:02 UTC', 'Body/S', 'text/secondary')); add(b, cd);
  const pr = row({ name: 'Countdown bar', gap: 0, r: 9999, clip: true, w: 384 }); const used = rect(10, 6, 'status/warning', 0, 'Elapsed 13:18 of 15:00'); add(pr, [used, 'FILL'], rect(45, 6, 'surface/raised', 0, 'Remaining 01:42')); add(b, [pr, 'FILL']);
  add(b, [await T('No activity since 18:47 UTC. Admin sessions end after 15 minutes without activity. Unsent dialogs are discarded at sign-out — nothing is submitted for you.', 'Body/S', 'text/secondary', { w: 384 }), 'FILL']);
  const nt = row({ name: 'Note', gap: 8, p: [10, 12], fill: 'surface/raised', r: 10, align: 'MIN' }); add(nt, await IC('info', 16, 'icon/muted'), await T('Staying signed in needs no new code. Approvals, restrictions and exports still ask for a fresh 2FA code.', 'Caption', 'text/secondary', { w: 332 })); add(b, [nt, 'FILL']);
  add(m, [b, 'FILL']);
  const fr = row({ name: 'Footer', gap: 8, p: [16, 28] }); strokeSides(fr, 'border/subtle', { t: 1 }); add(fr, [await BTN('Secondary', 'Sign out now', { size: 'L', lead: 'logout' }), 'FILL'], [await BTN('Primary', 'Stay signed in', { size: 'L' }), 'FILL']); add(m, [fr, 'FILL']);
  overlay(f, m); made.push(f); } }
// ---------- (b) overview, restricted role ----------
{ const nm = '[ADM-02] Overview / 1440 / Restricted role — Support L2'; if (EX(nm)) OUT.skipped.push(nm); else {
  const src = EX('[ADM-02] Overview / 1440 / Default'); const f = src.clone(); sec.appendChild(f); f.x = 1680; f.y = src.y; f.name = nm;
  const sb = f.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.id === '22:5501'); const tb = f.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.id === '22:6483');
  await who(sb, tb, 'RD', 'R. Duarte', 'Support L2', '3 of 10 modules');
  const ALLOWED = ['Overview', 'User Management', 'Blockchain Management'];
  for (const it of sb.findAll(n => n.type === 'INSTANCE' && /^Group — /.test(n.name))) { const lbl = it.name.split(' — ')[1]; if (!ALLOWED.includes(lbl)) { it.setProperties({ State: 'No access' }); const cnt = it.findOne(n => n.name === 'Count'); if (cnt) cnt.visible = false; } }
  const c = f.findOne(n => n.name === 'Content');
  const money = c.findOne(n => n.name === 'KPIs — money'); const idx = c.children.indexOf(money); money.visible = false;
  const pl = c.findOne(n => n.name === 'KPI — Pool liabilities'); if (pl) pl.visible = false;
  const wq = c.findOne(n => n.name === 'Work queues'); if (wq) { const ins = wq.children.filter(n => n.type === 'INSTANCE'); if (ins[0]) ins[0].visible = false; if (ins[1]) ins[1].visible = false; }
  const pool = c.findOne(n => n.name === 'Pool'); if (pool && pool.children[0]) pool.children[0].visible = false;
  const nw = c.findOne(n => n.name === 'Networks & audit'); if (nw) { const au = nw.findOne(n => n.name === 'Recent sensitive actions'); if (au) au.visible = false; }
  const np = row({ name: 'Restricted — financial KPIs', gap: 16, p: [20, 24], fill: 'surface/default', stroke: 'border/subtle', r: 14, align: 'MIN' });
  const tl = AL('HORIZONTAL', { name: 'Icon tile', w: 40, h: 40, fill: 'surface/raised', r: 10, align: 'CENTER', justify: 'CENTER' }); add(tl, await IC('lock', 20, 'icon/muted'));
  const tx = col({ gap: 6 }); add(tx, await T('Financial KPIs are hidden for your role', 'Label/L'), await T('Deposits, withdrawals, revenue, platform fees, pool liabilities, the withdrawal queue and the audit feed are limited to Finance, Compliance and Super Admin. They are left out of this page — not blurred — so no figures reach your screen.', 'Body/S', 'text/secondary', { w: 760 }));
  const ac = row({ gap: 8 }); add(ac, await BTN('Secondary', 'Request access', { size: 'S', lead: 'key' }), await BTN('Ghost', 'Role permissions', { size: 'S', trail: 'arrow-right' })); add(tx, ac);
  add(np, tl, [tx, 'FILL'], await I('23:18440', { Role: 'Support', Size: 'M' }));
  c.insertChild(idx, np); np.layoutSizingHorizontal = 'FILL';
  const ph = c.findOne(n => n.name === 'Page header'); if (ph) { const st = ph.findAll(n => n.type === 'TEXT' && n.characters.startsWith('KPIs for'))[0]; if (st) await stxt(st, 'Player and operations KPIs for the last 30 days. Data as of 27 Nov 2026, 18:45 UTC · updates live. Some panels are hidden for the Support role.'); const ex = ph.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Button/Secondary'))[0]; if (ex) ex.visible = false; }
  made.push(f); } }
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.32 });
return { made: made.map(f => [f.name, f.id, f.x, f.y, f.height]), skipped: OUT.skipped };
