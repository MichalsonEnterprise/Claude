// ===== WAL-WA desktop shell (page 06) =====
const page = figma.root.children.find(p => p.name === '06 — Wallet & Transactions'); await figma.setCurrentPageAsync(page);
const sec = section('WAL-10..14 Withdraw steps 1–5', 34000, 0);
const COLX = [120, 1680, 3240, 4800, 6360];
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2 && !c.name.includes('/ 768 /')) { m = Math.max(m, c.y + c.height); any = true; } return any ? m + 160 : 120; }
function clean(names) { for (const c of [...sec.children]) if (names.includes(c.name)) c.remove(); }
function cloneSt(src, name) { clean([name]); const s = sec.children.find(c => c.name === src); const y = colY(s.x); const f = s.clone(); sec.appendChild(f); f.name = name; f.x = s.x; f.y = y; return f; }
// footer: set Primary state + note text (creates the note if missing, removes it when note is null)
async function foot(f, state, note) { const ft = q(f, 'Flow footer'); const pb = ft.children.find(x => x.type === 'INSTANCE' && x.name.startsWith('Button/Primary')); pb.setProperties({ State: state }); let nt = ft.children.find(x => x.type === 'TEXT'); if (note) { if (!nt) { nt = await T(note, 'Caption', 'text/tertiary'); ft.insertChild(ft.children.indexOf(pb), nt); } else nt.characters = note; } else if (nt) nt.remove(); }
async function setRow(f, label, val, color, style) { const r = q(f, 'Row — ' + label); r.children[r.children.length - 1].remove(); if (typeof val === 'string') await tx(r, val, style || 'Body/S Strong', color || 'text/primary', { hug: true }); else r.appendChild(val); }
async function swapIcon(row, name, color) { row.children[0].remove(); row.insertChild(0, await IC(name, 16, color)); }
function ins(before, node) { const p = before.parent; p.insertChild(p.children.indexOf(before), node); node.layoutSizingHorizontal = 'FILL'; }
async function swapLimit(f, s) { const sd = q(f, 'Side summary'); const old = sd.children.find(c => c.name === 'Daily withdrawal limit'); const i = sd.children.indexOf(old); old.remove(); const n = await limitCard(sd, s); sd.insertChild(i, n); return n; }
async function shellD(name, n, x, y, ctx) {
  clean([name]);
  const f = await screen(name, 1440, {}); f.primaryAxisSizingMode = 'AUTO'; sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Member' }); body.appendChild(sb); sb.layoutSizingVertical = 'FILL';
  for (const it of sb.findAll(k => k.type === 'INSTANCE' && (k.name === 'Item/Lobby' || k.name === 'Item/Wallet'))) it.setProperties({ State: it.name === 'Item/Wallet' ? 'Active' : 'Default' });
  const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
  add(main, [await I('23:9832', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 24, p: 32 }); add(main, [ct, 'FILL']);
  const ph = hrow('Page header', 16); add(ct, [ph, 'FILL']);
  const ti = AL('VERTICAL', { name: 'Title', gap: 4 }); add(ph, [ti, 'FILL']);
  await tx(ti, 'Withdraw USDT', 'Heading/H2', 'text/primary', { hug: true });
  await tx(ti, 'Send USDT from your Available balance to an external wallet in a few short steps. GLOBAL POOL charges no withdrawal fee — you only pay the network fee, shown before you confirm.', 'Body/M', 'text/secondary');
  ph.appendChild(await DEMO('M')); ph.appendChild(await BTN('Ghost', 'Withdrawal history', { lead: 'history' })); ph.appendChild(await BTN('Secondary', 'Deposit', { lead: 'deposit' }));
  const nav = hrow('Wallet sub-nav', 24, { align: 'MAX' }); strokeSides(nav, 'border/subtle', { b: 1 }); add(ct, [nav, 'FILL']);
  for (const l of ['Overview', 'Deposit', 'Withdraw', 'Transaction history', 'Connected wallets', 'Address whitelist']) nav.appendChild(await I('20:6831', { State: l === 'Withdraw' ? 'Active' : 'Default' }, { Label: l }));
  const sbar = hrow('Stepper bar', 24, { p: [16, 24, 16, 24], fill: 'surface/default', stroke: 'border/subtle', r: 14 }); add(ct, [sbar, 'FILL']);
  const fl = AL('VERTICAL', { name: 'Flow label', gap: 2 }); sbar.appendChild(fl);
  await tx(fl, 'WITHDRAW · STEP ' + n + ' OF 9', 'Overline', 'text/tertiary', { hug: true }); await tx(fl, ctx, 'Body/S Strong', 'text/primary', { hug: true });
  add(sbar, [await I('15:3122', { Steps: 9, Current: n }), 'FILL']);
  const row = AL('HORIZONTAL', { name: 'Flow + summary', gap: 24 }); add(ct, [row, 'FILL']);
  const fc = card('Flow card', { gap: 20, p: 24, r: 20, w: 640 }); row.appendChild(fc);
  const side = AL('VERTICAL', { name: 'Side summary', gap: 16 }); add(row, [side, 'FILL']);
  return { f, fc, side, ct };
}
async function ffoot(fc, back, next, o = {}) { const r = hrow('Flow footer', 12, { p: [20, 0, 0, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(fc, [r, 'FILL']); r.appendChild(await BTN('Ghost', back, { size: 'L', lead: back === 'Cancel' ? null : 'arrow-left' })); sp(r); if (o.note) await tx(r, o.note, 'Caption', 'text/tertiary', { hug: true }); r.appendChild(await BTN('Primary', next, { size: 'L', state: o.state || 'Default', trail: 'arrow-right' })); return r; }
// ===== END WAL-WA desktop shell =====
