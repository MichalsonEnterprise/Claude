// READY TO RUN (blocked by Figma MCP rate limit on 27–28 Nov 2026). Prefix with the full helpers.js, then run in ONE use_figma call.
// Builds WAL-12 desktop states Invalid / Whitelisted / New-address cooldown by cloning
// 'WAL-12 Withdraw — Step 3 Enter Address / 1440 / Default' (48:26939) and stacking them below it.
// ===== WAL-W state lib =====
const page = figma.root.children.find(p => p.name === '06 — Wallet & Transactions'); await figma.setCurrentPageAsync(page);
const sec = section('WAL-10..14 Withdraw steps 1–5', 34000, 0);
async function tx(p, s, st = 'Body/M', c = 'text/primary', o = {}) { const t = await T(s, st, c, o.hug ? {} : { w: 200 }); if (o.name) t.name = o.name; p.appendChild(t); if (!o.hug) t.layoutSizingHorizontal = 'FILL'; if (o.align) t.textAlignHorizontal = o.align; return t; }
function hrow(name, g = 8, o = {}) { return AL('HORIZONTAL', Object.assign({ name, gap: g, align: 'CENTER' }, o)); }
async function alertBox(t, title, body, o = {}) { const a = AL('HORIZONTAL', { name: 'Alert/' + t + ' — ' + title.slice(0, 40), gap: 12, p: [14, 16, 14, 16], fill: 'status/' + t + '-tint', stroke: 'status/' + t, r: 14 }); a.appendChild(await IC(o.icon || ({ info: 'info', warning: 'alert-triangle', danger: 'alert-circle', success: 'check-circle' })[t], 20, 'status/' + t)); const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(a, [c, 'FILL']); await tx(c, title, 'Body/M Strong', 'text/primary'); if (body) await tx(c, body, 'Body/S', 'text/secondary'); if (o.actions) { const r = hrow('Actions', 8, { p: [6, 0, 0, 0] }); c.appendChild(r); for (const b of o.actions) r.appendChild(b); } return a; }
function colY(x) { let m = 0; for (const c of sec.children) if (Math.abs(c.x - x) < 2) m = Math.max(m, c.y + c.height); return m + 160; }
function cloneSt(src, name) { for (const o of sec.children.filter(c => c.name === name)) o.remove(); const s = sec.children.find(c => c.name === src); const y = colY(s.x); const f = s.clone(); sec.appendChild(f); f.name = name; f.x = s.x; f.y = y; return f; }
const q = (f, n) => f.findOne(x => x.name === n);
function foot(f, state, note) { const ft = q(f, 'Flow footer'); ft.findOne(x => x.type === 'INSTANCE' && x.name.startsWith('Button/Primary')).setProperties({ State: state }); const nt = ft.children.find(x => x.type === 'TEXT'); if (nt) { if (note) nt.characters = note; else nt.remove(); } }
async function setRow(f, label, val, color, style) { const r = q(f, 'Row — ' + label); r.children[r.children.length - 1].remove(); if (typeof val === 'string') await tx(r, val, style || 'Body/S Strong', color || 'text/primary', { hug: true }); else r.appendChild(val); }
async function swapIcon(row, name, color) { row.children[0].remove(); row.insertChild(0, await IC(name, 16, color)); }
function ins(fc, before, node) { fc.insertChild(fc.children.indexOf(before), node); node.layoutSizingHorizontal = 'FILL'; }
// ===== END state lib =====
const SRC = 'WAL-12 Withdraw — Step 3 Enter Address / 1440 / Default'; const out = {};
const f1 = cloneSt(SRC, 'WAL-12 Withdraw — Step 3 Enter Address / 1440 / Invalid'); out.invalid = f1.id;
{ const fc = q(f1, 'Flow card'); const ia = q(f1, 'Input/Address'); ia.setProperties({ State: 'Invalid' });
  const al = await alertBox('danger', 'This looks like a Solana address', 'You chose Arbitrum One, but 7Hq3…Xk9P is a Solana (SPL) address. Paste an Arbitrum One address that starts with 0x, or go back and switch the network to Solana.', { actions: [await BTN('Secondary', 'Switch network to Solana', { size: 'S', lead: 'swap' }), await BTN('Ghost', 'Clear field', { size: 'S', lead: 'x' })] });
  fc.insertChild(fc.children.indexOf(ia) + 1, al); al.layoutSizingHorizontal = 'FILL';
  const tips = q(f1, 'Format checks');
  await swapIcon(tips.children[0], 'x-circle', 'status/danger'); tips.children[0].children[1].fills = [paint('text/danger')]; tips.children[0].children[1].characters = 'Doesn\'t start with 0x — not an Arbitrum One address';
  await swapIcon(tips.children[1], 'x-circle', 'status/danger'); tips.children[1].children[1].fills = [paint('text/danger')]; tips.children[1].children[1].characters = 'Checksum can\'t be verified for this format';
  foot(f1, 'Disabled', 'Fix the address to continue'); await setRow(f1, 'Destination', 'Not valid on Arbitrum', 'text/danger', 'Body/S'); }
const f2 = cloneSt(SRC, 'WAL-12 Withdraw — Step 3 Enter Address / 1440 / Whitelisted'); out.whitelisted = f2.id;
{ const fc = q(f2, 'Flow card'); const sa = q(f2, 'Saved address — Arbitrum cold wallet'); fill(sa, 'surface/selected'); sa.strokes = [paint('border/brand')];
  const rd = sa.findOne(x => x.name === 'Radio'); rd.strokes = [paint('brand/primary')]; rd.appendChild(ellipse(10, 10, 'brand/primary', 'Dot'));
  q(f2, 'Input/Address').setProperties({ State: 'Whitelisted' });
  const tips = q(f2, 'Format checks'); const ok = await alertBox('success', 'Whitelisted address — ready to use', 'Saved as "Arbitrum cold wallet" on 14 Oct 2026 and confirmed by email + 2FA. Format and checksum verified on Arbitrum One — no cooldown applies.'); ins(fc, tips, ok); tips.remove();
  foot(f2, 'Default', null); await setRow(f2, 'Destination', await I('9:418', { Size: 'S' }, { Address: '0x7c4e…a21D', 'Show DEMO': true })); }
const f3 = cloneSt(SRC, 'WAL-12 Withdraw — Step 3 Enter Address / 1440 / New-address cooldown'); out.cooldown = f3.id;
{ const fc = q(f3, 'Flow card'); q(f3, 'Input/Address').setProperties({ State: 'New address' });
  const tips = q(f3, 'Format checks'); const ch = AL('VERTICAL', { name: 'Cooldown options', gap: 12, p: 16, fill: 'surface/raised', r: 14 }); ins(fc, tips, ch); tips.remove();
  await tx(ch, 'Choose how to continue', 'Body/M Strong');
  for (const [ic, t1, t2, bl] of [['clock', 'Save it and withdraw after the cooldown', 'Confirm with email + 2FA now. 0x3f9a…c47E unlocks 28 Nov 2026, 18:42 UTC — we\'ll email you when it\'s ready.', 'Add to whitelist'], ['shield-check', 'Use a whitelisted address now', 'Arbitrum cold wallet · 0x7c4e…a21D — no waiting.', 'Use cold wallet']]) { const r = hrow('Option — ' + t1.slice(0, 30), 12, { p: 12, fill: 'surface/default', stroke: 'border/subtle', r: 10 }); add(ch, [r, 'FILL']); r.appendChild(await IC(ic, 20, 'icon/brand')); const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']); await tx(c, t1, 'Body/S Strong'); await tx(c, t2, 'Caption', 'text/secondary'); r.appendChild(await BTN('Secondary', bl, { size: 'S' })); }
  await tx(ch, 'Why the wait? A 24 h cooldown on every new destination protects your balance if someone else gets into your account. It applies to all players and support can\'t skip it.', 'Caption', 'text/tertiary');
  foot(f3, 'Disabled', 'Unlocks 28 Nov 2026, 18:42 UTC'); await setRow(f3, 'Destination', await I('9:418', { Size: 'S' }, { Address: '0x3f9a…c47E', 'Show DEMO': true })); }
fitSection(sec);
for (const f of [f1, f2, f3]) await q(f, 'Flow + summary').screenshot({ scale: 0.4 });
return Object.assign(out, { ys: [f1.y, f2.y, f3.y], hs: [f1.height, f2.height, f3.height] });
