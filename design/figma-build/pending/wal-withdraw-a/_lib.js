// ===== WAL-W lib (withdraw steps 1–5) =====
const page = figma.root.children.find(p => p.name === '06 — Wallet & Transactions'); await figma.setCurrentPageAsync(page);
const sec = section('WAL-10..14 Withdraw steps 1–5', 34000, 0);
async function tx(p, s, st = 'Body/M', c = 'text/primary', o = {}) { const t = await T(s, st, c, o.hug ? {} : { w: 200 }); if (o.name) t.name = o.name; p.appendChild(t); if (!o.hug) t.layoutSizingHorizontal = 'FILL'; if (o.align) t.textAlignHorizontal = o.align; return t; }
function sp(p) { const s = AL('HORIZONTAL', { name: 'Spacer', w: 1, h: 1 }); p.appendChild(s); s.layoutSizingHorizontal = 'FILL'; return s; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, w: o.w }); }
function hrow(name, g = 8, o = {}) { return AL('HORIZONTAL', Object.assign({ name, gap: g, align: 'CENTER' }, o)); }
async function kv(p, label, val, o = {}) { const r = hrow('Row — ' + label, 12, { p: [10, 0, 10, 0] }); strokeSides(r, 'border/subtle', { b: o.last ? 0 : 1 }); add(p, [r, 'FILL']); await tx(r, label, 'Body/S', 'text/secondary', { hug: true }); sp(r); if (typeof val === 'string') await tx(r, val, o.vs || 'Body/S Strong', o.vc || 'text/primary', { hug: true }); else for (const v of [].concat(val)) r.appendChild(v); return r; }
async function alertBox(t, title, body, o = {}) { const a = AL('HORIZONTAL', { name: 'Alert/' + t + ' — ' + title.slice(0, 40), gap: 12, p: [14, 16, 14, 16], fill: 'status/' + t + '-tint', stroke: 'status/' + t, r: 14 }); a.appendChild(await IC(o.icon || ({ info: 'info', warning: 'alert-triangle', danger: 'alert-circle', success: 'check-circle' })[t], 20, 'status/' + t)); const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(a, [c, 'FILL']); await tx(c, title, 'Body/M Strong', 'text/primary'); if (body) await tx(c, body, 'Body/S', 'text/secondary'); if (o.actions) { const r = hrow('Actions', 8, { p: [6, 0, 0, 0] }); c.appendChild(r); for (const b of o.actions) r.appendChild(b); } return a; }
async function hdr(p, icon, title, o = {}) { const h = hrow('Card header — ' + title, 8); add(p, [h, 'FILL']); if (icon) h.appendChild(await IC(icon, 20, o.ic || 'icon/brand')); await tx(h, title, 'Heading/H5', 'text/primary', { hug: true }); if (o.demo) h.appendChild(await DEMO('S')); sp(h); if (o.right) h.appendChild(o.right); return h; }
async function shellD(name, n, x, y, ctx) {
  for (const o of sec.children.filter(c => c.name === name)) o.remove();
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
async function fhead(fc, title, desc) { const h = AL('VERTICAL', { name: 'Flow header', gap: 6 }); add(fc, [h, 'FILL']); await tx(h, title, 'Heading/H3'); await tx(h, desc, 'Body/M', 'text/secondary'); return h; }
async function ffoot(fc, back, next, o = {}) { const r = hrow('Flow footer', 12, { p: [20, 0, 0, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(fc, [r, 'FILL']); r.appendChild(await BTN('Ghost', back, { size: 'L', lead: back === 'Cancel' ? null : 'arrow-left' })); sp(r); if (o.note) await tx(r, o.note, 'Caption', 'text/tertiary', { hug: true }); r.appendChild(await BTN('Primary', next, { size: 'L', state: o.state || 'Default', trail: 'arrow-right' })); return r; }
async function side(sd, s) {
  const c = card('Withdrawal summary', { gap: 0 }); add(sd, [c, 'FILL']);
  const st = AL('HORIZONTAL', { name: 'Step chip', p: [2, 8, 2, 8], fill: 'surface/raised', r: 9999 }); await tx(st, 'Step ' + s.n + ' of 9', 'Caption', 'text/secondary', { hug: true });
  const h = await hdr(c, null, 'Withdrawal summary', { demo: true, right: st }); pad(h, 0, 0, 8, 0);
  const pend = { vs: 'Body/S', vc: 'text/tertiary' };
  const a = hrow('Asset value', 6); a.appendChild(await CHAIN('USDT', 16)); await tx(a, 'USDT · Tether USD', 'Body/S Strong', 'text/primary', { hug: true }); await kv(c, 'Asset', a);
  if (s.net) { const v = hrow('Network value', 6); v.appendChild(await CHAIN('Arbitrum', 16)); await tx(v, 'Arbitrum One', 'Body/S Strong', 'text/primary', { hug: true }); await kv(c, 'Network', v); } else await kv(c, 'Network', 'Choose in step 2', pend);
  if (s.addr) await kv(c, 'Destination', await I('9:418', { Size: 'S' }, { Address: s.addr, 'Show DEMO': true })); else await kv(c, 'Destination', 'Enter in step 3', pend);
  await kv(c, 'Amount', s.amt ? s.amt + ' USDT' : 'Enter in step 4', s.amt ? { vs: 'Number/S' } : pend);
  await kv(c, 'Network fee', s.net ? (s.amt ? '−0.08 USDT' : '≈ 0.08 USDT') : 'Depends on network', s.net ? { vs: 'Number/S' } : pend);
  await kv(c, 'Platform fee', '0.00 USDT', { vs: 'Number/S' });
  await kv(c, 'You receive', s.recv || '—', s.recv ? { vs: 'Number/M', vc: 'text/success', last: true } : Object.assign({ last: true }, pend));
  const l = card('Daily withdrawal limit', { gap: 12 }); add(sd, [l, 'FILL']);
  await hdr(l, 'shield', 'Daily withdrawal limit', { right: await I('23:5565', { Status: 'Approved', Level: 'L2' }) });
  const u = hrow('Usage', 6); add(l, [u, 'FILL']); await tx(u, s.used || '0.00', 'Number/S', s.full ? 'text/warning' : 'text/primary', { hug: true }); await tx(u, s.usedLabel || 'of 25,000.00 USDT used today', 'Body/S', 'text/secondary', { hug: true }); u.appendChild(await DEMO('XS'));
  const m = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, h: 8, w: 430, clip: true }); add(l, [m, 'FILL']); if (s.pct) m.appendChild(rect(Math.max(4, Math.round(430 * s.pct)), 8, s.full ? 'status/warning' : 'brand/primary', 9999, 'Used'));
  await tx(l, s.limitNote || 'Resets 28 Nov 2026, 00:00 UTC · minimum 20.00 USDT per withdrawal · verify Level 3 for a higher limit.', 'Caption', 'text/tertiary');
  const p = card('Withdrawal protections', { gap: 10 }); add(sd, [p, 'FILL']);
  await hdr(p, 'shield-check', 'Withdrawal protections');
  for (const [ic, t1, t2] of [['check-circle', '2FA on', 'Authenticator code required at step 7'], ['check-circle', 'Address whitelist on', '1 Arbitrum address · 1 BNB Chain address'], ['clock', '24 h cooldown', 'For every new destination address'], ['key', 'Anti-phishing code', 'AURORA-27 — shown in every genuine email']]) { const r = hrow('Protection — ' + t1, 10); add(p, [r, 'FILL']); r.appendChild(await IC(ic, 18, ic === 'check-circle' ? 'status/success' : 'icon/muted')); await tx(r, t1, 'Body/S Strong', 'text/primary', { hug: true }); sp(r); await tx(r, t2, 'Caption', 'text/secondary', { hug: true }); }
  if (s.help !== false) { const hc = card('Help', { gap: 8 }); add(sd, [hc, 'FILL']); await hdr(hc, 'help-circle', 'How long does a withdrawal take?', { ic: 'icon/muted' }); await tx(hc, 'Most withdrawals are sent within 30 minutes. A new destination or a large amount can be held for routine AML screening — usually under 4 hours. You can track every step in Withdrawal history.', 'Body/S', 'text/secondary'); const lk = hrow('Links', 4); hc.appendChild(lk); lk.appendChild(await BTN('Ghost', 'Withdrawal FAQ', { size: 'S', trail: 'arrow-right' })); lk.appendChild(await BTN('Ghost', 'Contact support', { size: 'S', lead: 'chat' })); }
  return c;
}
// ===== END WAL-W lib =====
