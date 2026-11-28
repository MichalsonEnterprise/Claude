// adm-core m-02 — MOB-11 approvals on page 10: Approvals queue / 390 (K. Osei, Compliance Officer, 18:46 UTC)
// and the ADM-X1 second-approver review as a bottom sheet over the queue (AR-1042). IDEMPOTENT.
//#include _m.js
const made = [];
const RQ = [ // id, title, detail, requester, role chip, requested, expires, your role — same 4 open requests as the 1440 inbox (K. Osei's view)
  ['AR-1047', 'Pinfall max bet 1,000.00 → 500.00 USDT', 'Games · config v14 · effective from the next round only', 'S. Iyer', 'Super Admin', '16:30 UTC', '20:30 UTC · 1 h 44 min', 'role'],
  ['AR-1045', 'Lift sign-in suspension · @juno88', 'Users · player passed the ID re-check', 'R. Duarte', 'Support', '17:55 UTC', '21:55 UTC · 3 h 09 min', 'yes'],
  ['AR-1049', 'Export KYC file for regulator request REG-221', 'Compliance · 1 encrypted file, 7-day link', 'You', 'Compliance', '18:05 UTC', '22:05 UTC · 3 h 19 min', 'self'],
  ['AR-1042', 'Release flagged withdrawal WD-20931', 'Finance · 1,500.00 USDT → 0x7c4e…a21D · Arbitrum', 'A. Marin', 'Finance', '18:20 UTC', '22:20 UTC · 3 h 34 min', 'yes']];
async function reqCard(r) { const [id, t, d, by, role, at, exp, el] = r; const k = await mcard('Request — ' + id, { gap: 8 });
  const top = row({ gap: 8 }); add(top, await T(id, 'Mono/S', 'text/tertiary'), await BADGE('Pending'), [sp(), 'FILL'], await stat('hourglass', 'icon/muted', exp, 'text/tertiary', 'Caption')); add(k, [top, 'FILL']);
  await wt(k, t, 'Label/L', 'text/primary'); await wt(k, d, 'Body/S', 'text/secondary');
  const rq = row({ gap: 8 }); const av = await I('9:238', { Size: 'XS' }, { Initials: by === 'You' ? 'KO' : by.split(' ').map(s => s[0]).join('').replace('.', '') }); add(rq, av, await T((by === 'You' ? 'Requested by you' : by) + ' · ' + at, 'Caption', 'text/secondary'), await I('23:18440', { Role: role, Size: 'S' }), [sp(), 'FILL'], await DEMO('XS')); add(k, [rq, 'FILL']);
  if (el === 'self') { const n = row({ name: 'Self-approval note', gap: 8, p: [10, 12], fill: 'surface/raised', r: 10, align: 'MIN' }); add(n, await IC('ban', 16, 'icon/muted')); await wt(n, "Your own request — another Compliance admin or the Super Admin must decide. You can withdraw it.", 'Caption', 'text/secondary', 290); add(k, [n, 'FILL']); add(k, [await BTN('Ghost', 'Withdraw my request', { size: 'L' }), 'FILL']); }
  else if (el === 'role') { const n = row({ name: 'Role note', gap: 8, p: [10, 12], fill: 'surface/raised', r: 10, align: 'MIN' }); add(n, await IC('lock', 16, 'icon/muted')); await wt(n, 'Super Admin only — you can see it, but you can’t decide it.', 'Caption', 'text/secondary', 290); add(k, [n, 'FILL']); add(k, [await BTN('Ghost', 'View details', { size: 'L' }), 'FILL']); }
  else add(k, [await BTN(id === 'AR-1042' ? 'Primary' : 'Secondary', 'Review', { size: 'L', trail: 'arrow-right' }), 'FILL']);
  return k; }
async function queue(name) { const S = await MSHELL(name, 'KO'); if (!S) return null; const { f, c } = S;
  await mtitle(c, 'Approvals', 'Four-eyes requests. You can decide requests from other admins only; every decision needs a reason and a fresh 2FA code.');
  const tabs = row({ name: 'Filter pills (scrolls)', gap: 8, w: 358, clip: true }); for (const [l, on] of [['Open · 4', true], ['Waiting for me · 2', false], ['Created by me · 1', false], ['Decided today · 4', false]]) { const p = await I('20:6895', { State: on ? 'Active' : 'Default' }); if (!setP(p, 'Label', l)) { const tx = p.findOne(n => n.type === 'TEXT'); if (tx) await setT(p, tx.name, l); } add(tabs, p); } add(c, [tabs, 'FILL']);
  const pol = row({ name: 'Policy strip', gap: 8, p: [10, 12], fill: 'brand/tint-subtle', r: 10, align: 'MIN' }); add(pol, await IC('shield-check', 16, 'icon/brand')); await wt(pol, 'SYS-1.1 · the requester can never approve · requests expire after 4 h and then change nothing', 'Caption', 'text/secondary', 300); add(c, [pol, 'FILL']);
  for (const r of RQ) add(c, [await reqCard(r), 'FILL']);
  await MTABS(f, 'Approvals'); return f; }
// ---------- 1. Queue ----------
{ const f = await queue('[MOB-11] Approvals queue / 390 / Open'); if (f) made.push(f); }
// ---------- 2. Review sheet (AR-1042) over the queue ----------
{ const f = await queue('[ADM-X1 · MOB-11] Review AR-1042 / 390 / Bottom sheet'); if (f) {
  f.primaryAxisSizingMode = 'FIXED'; f.resize(390, 844); f.clipsContent = true;
  const s = rect(390, 808, 'scrim/overlay', 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 36;
  const sh = AL('VERTICAL', { name: 'Sheet — Review AR-1042', w: 390, fill: 'surface/overlay', stroke: 'border/subtle' }); for (const k of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(k, VAR['radius/2xl']); await fx(sh, 'Elevation/4 — Modal');
  const gr = AL('HORIZONTAL', { name: 'Grabber', p: [8, 0, 4, 0], justify: 'CENTER' }); add(gr, rect(36, 4, 'border/strong', 9999, 'Grabber')); add(sh, [gr, 'FILL']);
  const hd = row({ name: 'Header', gap: 8, p: [4, 8, 8, 16] }); add(hd, await T('Review AR-1042', 'Heading/H5'), await DEMO('S'), [sp(), 'FILL'], await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.x })); add(sh, [hd, 'FILL']);
  const bd = col({ name: 'Body', gap: 12, p: [4, 16, 12, 16] });
  const sm = col({ name: 'Summary', gap: 6, p: 12, fill: 'surface/raised', r: 10 }); add(sm, await T('RELEASE FLAGGED WITHDRAWAL · WD-20931', 'Overline', 'text/tertiary'));
  const am = row({ gap: 6, align: 'MAX' }); add(am, await T('1,500.00', 'Number/M'), await T('USDT', 'Label/M', 'text/tertiary'), [sp(), 'FILL'], await I('9:377', { Chain: 'Arbitrum', Status: 'Operational' })); add(sm, [am, 'FILL']);
  const ad = row({ gap: 6 }); add(ad, await T('→ 0x7c4e…a21D', 'Mono/S', 'text/secondary'), await T('· @nova.k · KYC L2 · player receives 1,499.92', 'Caption', 'text/tertiary')); add(sm, ad);
  const rq = row({ gap: 6, p: [6, 0, 0, 0] }); strokeSides(rq, 'border/subtle', { t: 1 }); add(rq, await I('9:238', { Size: 'XS' }, { Initials: 'AM' }), await T('A. Marin · 18:20 UTC', 'Caption', 'text/secondary'), await I('23:18440', { Role: 'Finance', Size: 'S' })); add(sm, [rq, 'FILL']);
  await wt(sm, '“AML-3317 closed as a false positive on the velocity rule. Destination whitelisted since 14 Oct 2026, ownership proven by signature. Release per FIN-2.3.”', 'Caption', 'text/secondary', 334);
  add(bd, [sm, 'FILL']);
  const ta = await I('16:3858', { State: 'Focus' }, { Label: 'Your reason (required)', 'Show counter': true }); add(bd, [ta, 'FILL']); await setT(ta, 'Value text', 'Reviewed AML-3317 evidence and the signed ownership proof. Velocity hit explained by the 14 Oct whitelisting. Agree to release.'); await setT(ta, 'Counter', '128 / 500');
  const otp = await I('16:3761', { State: 'Complete' }, { Label: 'Fresh 2FA code', Description: 'Needed for every decision, even inside an active session.' }); add(bd, otp);
  const nt = row({ name: 'Audit note', gap: 8, align: 'MIN' }); add(nt, await IC('history', 16, 'icon/muted')); await wt(nt, 'Both admins, both reasons, IPs and 2FA checks are stored in one hash-chained audit entry. You can’t edit amount, address or network.', 'Caption', 'text/tertiary', 330); add(bd, [nt, 'FILL']);
  add(sh, [bd, 'FILL']);
  const ft = col({ name: 'Sticky footer', gap: 0, p: [12, 16, 0, 16] }); strokeSides(ft, 'border/subtle', { t: 1 }); const fa = row({ name: 'Actions', gap: 8 }); add(fa, [await BTN('Danger', 'Reject', { size: 'L', lead: 'x-circle' }), 'FILL'], [await BTN('Primary', 'Approve & release', { size: 'L', lead: 'shield-check' }), 'FILL']); add(ft, [fa, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(ft, [hi, 'FILL']); add(sh, [ft, 'FILL']);
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = 844 - sh.height; made.push(f); } }
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.5 });
return { made: made.map(f => [f.name, f.id, f.x, f.y, f.height]), skipped: OUT.skipped };
