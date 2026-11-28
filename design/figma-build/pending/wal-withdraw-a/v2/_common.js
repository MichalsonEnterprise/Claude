// ===== WAL-WA common (withdraw steps 1–5, agent wal-withdraw-a, continuation v2) =====
const AD = '0x7c4e…a21D';
const AD_NEW = '0x3f9a…c47E';
async function tx(p, s, st = 'Body/M', c = 'text/primary', o = {}) { const t = await T(s, st, c, o.hug ? {} : { w: 200 }); if (o.name) t.name = o.name; p.appendChild(t); if (!o.hug) t.layoutSizingHorizontal = 'FILL'; if (o.align) t.textAlignHorizontal = o.align; return t; }
function sp(p) { const s = AL('HORIZONTAL', { name: 'Spacer', w: 1, h: 1 }); p.appendChild(s); s.layoutSizingHorizontal = 'FILL'; return s; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, w: o.w }); }
function hrow(name, g = 8, o = {}) { return AL('HORIZONTAL', Object.assign({ name, gap: g, align: 'CENTER' }, o)); }
const q = (f, n) => f.findOne(x => x.name === n);
async function kv(p, label, val, o = {}) { const r = hrow('Row — ' + label, 12, { p: [10, 0, 10, 0] }); strokeSides(r, 'border/subtle', { b: o.last ? 0 : 1 }); add(p, [r, 'FILL']); await tx(r, label, 'Body/S', 'text/secondary', { hug: true }); sp(r); if (typeof val === 'string') await tx(r, val, o.vs || 'Body/S Strong', o.vc || 'text/primary', { hug: true }); else for (const v of [].concat(val)) r.appendChild(v); return r; }
async function alertBox(t, title, body, o = {}) { const a = AL('HORIZONTAL', { name: 'Alert/' + t + ' — ' + title.slice(0, 40), gap: 12, p: [14, 16, 14, 16], fill: 'status/' + t + '-tint', stroke: 'status/' + t, r: 14 }); a.appendChild(await IC(o.icon || ({ info: 'info', warning: 'alert-triangle', danger: 'alert-circle', success: 'check-circle' })[t], 20, 'status/' + t)); const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(a, [c, 'FILL']); await tx(c, title, 'Body/M Strong', 'text/primary'); if (body) await tx(c, body, 'Body/S', 'text/secondary'); if (o.actions && o.actions.length) { const r = hrow('Actions', 8, { p: [6, 0, 0, 0], wrap: true, cgap: 8 }); add(c, [r, 'FILL']); for (const b of o.actions) r.appendChild(b); } return a; }
async function hdr(p, icon, title, o = {}) { const h = hrow('Card header — ' + title, 8); add(p, [h, 'FILL']); if (icon) h.appendChild(await IC(icon, 20, o.ic || 'icon/brand')); await tx(h, title, o.st || 'Heading/H5', 'text/primary', { hug: true }); if (o.demo) h.appendChild(await DEMO('S')); sp(h); if (o.right) h.appendChild(o.right); return h; }
// Badge/Status relabelled (status = icon + label)
async function B(status, label, size = 'S') { const b = await BADGE(status, size); if (label) { const t = b.findOne(n => n.type === 'TEXT'); if (t) t.characters = label; } b.name = 'Badge/Status — ' + (label || status); return b; }
async function fhead(fc, title, desc, M) { const h = AL('VERTICAL', { name: 'Flow header', gap: 6 }); add(fc, [h, 'FILL']); await tx(h, title, M ? 'Heading/H4' : 'Heading/H3'); if (desc) await tx(h, desc, M ? 'Body/S' : 'Body/M', 'text/secondary'); return h; }
// set the idx-th TEXT layer called `layer` inside an instance (per-variant text that is not a component property)
function setT(inst, layer, value, idx = 0, color) { const ts = inst.findAll(x => x.type === 'TEXT' && x.name === layer); const t = ts[idx]; if (!t) return false; t.characters = value; if (color) t.fills = [paint(color)]; return true; }
async function chips(p, sel, st, M) { const r = hrow('Quick amounts', 8, { wrap: true, cgap: 8 }); add(p, [r, 'FILL']); for (const l of ['500.00', '1,000.00', '1,500.00', '5,000.00', 'MAX · 9,215.30']) { const c = await I('17:2766', { State: st || (l === sel ? 'Selected' : 'Default') }, { Label: l, 'Show icon': false }); c.name = 'Chip — ' + l; r.appendChild(c); } return r; }
function chipState(f, st) { const r = q(f, 'Quick amounts'); if (!r) return; for (const c of r.children) if (c.type === 'INSTANCE') c.setProperties({ State: st }); }
// daily limit card: s = {used, usedLabel, pct, full, limitNote}
async function limitCard(sd, s = {}) {
  const l = card('Daily withdrawal limit', { gap: 12 }); add(sd, [l, 'FILL']);
  await hdr(l, 'shield', 'Daily withdrawal limit', { right: await I('23:5565', { Status: 'Approved', Level: 'L2' }) });
  const u = hrow('Usage', 6); add(l, [u, 'FILL']); await tx(u, s.used || '0.00', 'Number/S', s.full ? 'text/warning' : 'text/primary', { hug: true }); await tx(u, s.usedLabel || 'of 25,000.00 USDT used today', 'Body/S', 'text/secondary', { hug: true }); u.appendChild(await DEMO('XS'));
  const m = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, h: 8, w: 300, clip: true }); add(l, [m, 'FILL']);
  if (s.pct) { const bar = rect(Math.max(4, Math.round(m.width * s.pct)), 8, s.full ? 'status/warning' : 'brand/primary', 9999, 'Used'); m.appendChild(bar); if (s.full) bar.layoutSizingHorizontal = 'FILL'; }
  await tx(l, s.limitNote || 'Resets 28 Nov 2026, 00:00 UTC · minimum 20.00 USDT per withdrawal · verify Level 3 for a higher limit.', 'Caption', 'text/tertiary');
  return l;
}
// desktop side column (summary + limit + protections + help). s = {n, net, addr, amt, recv, used, usedLabel, pct, full, limitNote, help}
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
  await kv(c, 'You receive', s.recv ? s.recv + ' USDT' : '—', s.recv ? { vs: 'Number/M', vc: 'text/success', last: true } : Object.assign({ last: true }, pend));
  await limitCard(sd, s);
  const p = card('Withdrawal protections', { gap: 10 }); add(sd, [p, 'FILL']);
  await hdr(p, 'shield-check', 'Withdrawal protections');
  for (const [ic, t1, t2] of [['check-circle', '2FA on', 'Email code + authenticator at step 7'], ['check-circle', 'Address whitelist on', '1 Arbitrum address · 1 BNB Chain address'], ['clock', '24 h cooldown', 'For every new destination address'], ['key', 'Anti-phishing code', 'AURORA-27 — shown in every genuine email']]) { const r = hrow('Protection — ' + t1, 10); add(p, [r, 'FILL']); r.appendChild(await IC(ic, 18, ic === 'check-circle' ? 'status/success' : 'icon/muted')); await tx(r, t1, 'Body/S Strong', 'text/primary', { hug: true }); sp(r); await tx(r, t2, 'Caption', 'text/secondary', { hug: true }); }
  if (s.help !== false) { const hc = card('Help', { gap: 8 }); add(sd, [hc, 'FILL']); await hdr(hc, 'help-circle', 'How long does a withdrawal take?', { ic: 'icon/muted' }); await tx(hc, 'Most withdrawals are sent within 30 minutes. A new destination or a large amount can be held for routine AML screening — usually under 4 hours. You can track every step in Withdrawal history.', 'Body/S', 'text/secondary'); const lk = hrow('Links', 4); hc.appendChild(lk); lk.appendChild(await BTN('Ghost', 'Withdrawal FAQ', { size: 'S', trail: 'arrow-right' })); lk.appendChild(await BTN('Ghost', 'Contact support', { size: 'S', lead: 'chat' })); }
  return c;
}
// limit tiles (desktop) / facts card (mobile)
async function limitTiles(p, M, o = {}) {
  const arr = [['MINIMUM', '20.00 USDT', 'per withdrawal, every network', false], ['AVAILABLE NOW', '9,215.30 USDT', 'your withdrawable balance', true], ['LEFT TODAY', o.left || '25,000.00 USDT', o.leftSub || 'KYC Level 2 daily limit', false]];
  if (M) { const c = card('Limits', { gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised' }); add(p, [c, 'FILL']); for (let i = 0; i < arr.length; i++) { const [l, v, , d] = arr[i]; const vals = [await T(v, 'Number/S', i === 2 && o.left ? 'text/warning' : 'text/primary')]; if (d) vals.push(await DEMO('XS')); const r = await kv(c, l.charAt(0) + l.slice(1).toLowerCase(), vals, { last: i === 2 }); gap(r, 8); } return c; }
  const r = AL('HORIZONTAL', { name: 'Limit tiles', gap: 12 }); add(p, [r, 'FILL']);
  for (const [l, v, sub, d] of arr) { const t = AL('VERTICAL', { name: 'Tile — ' + l, gap: 4, p: [12, 16, 12, 16], fill: 'surface/raised', r: 10 }); add(r, [t, 'FILL']); const h = hrow('Tile head', 6); add(t, [h, 'FILL']); await tx(h, l, 'Overline', 'text/tertiary', { hug: true }); if (d) h.appendChild(await DEMO('XS')); await tx(t, v, 'Number/S', l === 'LEFT TODAY' && o.left ? 'text/warning' : 'text/primary', { name: 'Value' }); await tx(t, sub, 'Caption', 'text/secondary', { name: 'Sub' }); }
  return r;
}
async function lockNote(p) { const lr = hrow('Lock note', 10, { p: [12, 16, 12, 16], fill: 'surface/raised', r: 10, align: 'MIN' }); add(p, [lr, 'FILL']); lr.appendChild(await IC('lock', 18, 'balance/locked')); await tx(lr, 'When you confirm at step 7, 1,500.00 USDT moves from Available to Locked until the network confirms the transfer. If it fails or is rejected, the full amount returns to Available — no fee is charged.', 'Body/S', 'text/secondary'); return lr; }
// "You receive" hero block
async function receiveHero(p, M) {
  const hero = AL(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Receive hero', gap: M ? 8 : 16, p: M ? 16 : 20, fill: 'surface/raised', stroke: 'border/subtle', r: 14, align: M ? 'MIN' : 'CENTER' }); add(p, [hero, 'FILL']);
  const hl = AL('VERTICAL', { name: 'You receive', gap: 4 }); add(hero, [hl, 'FILL']);
  await tx(hl, 'YOU RECEIVE', 'Overline', 'text/tertiary');
  const ar = hrow('Amount', 8); add(hl, [ar, 'FILL']); await tx(ar, '1,499.92 USDT', M ? 'Number/L' : 'Number/XL', 'text/primary', { hug: true }); ar.appendChild(await DEMO('S'));
  const dr = hrow('Destination', 8, { wrap: true, cgap: 6 }); add(hl, [dr, 'FILL']); dr.appendChild(await CHAIN('Arbitrum', 16)); await tx(dr, 'Arbitrum One →', 'Body/S', 'text/secondary', { hug: true }); dr.appendChild(await I('9:418', { Size: 'S' }, { Address: AD, 'Show DEMO': true })); dr.appendChild(await B('Approved', 'Whitelisted'));
  if (!M) { const hr = AL('VERTICAL', { name: 'You send', gap: 4, align: 'MAX' }); hero.appendChild(hr); await tx(hr, 'YOU SEND', 'Overline', 'text/tertiary', { hug: true }); await tx(hr, '1,500.00 USDT', 'Number/M', 'text/secondary', { hug: true }); await tx(hr, 'from your Available balance', 'Caption', 'text/tertiary', { hug: true }); }
  return hero;
}
const IRREV = ['Withdrawals can\'t be reversed once they\'re sent', 'After the transfer is broadcast on Arbitrum One, GLOBAL POOL can\'t cancel, recall or refund it. If the address is wrong or the wallet doesn\'t accept USDT on Arbitrum One, the funds are lost. You can cancel at any step until it is broadcast.'];
const CONFIRM_LABEL = 'I\'ve checked the address and network, and I understand this withdrawal can\'t be reversed';
// ===== END WAL-WA common =====
