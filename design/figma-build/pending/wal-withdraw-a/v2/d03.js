// ===== BODY d03 — WAL-12 desktop states Invalid / Whitelisted / New-address cooldown (clones of 48:26939) =====
const SRC = 'WAL-12 Withdraw — Step 3 Enter Address / 1440 / Default'; const out = {};
const N12 = 'WAL-12 Withdraw — Step 3 Enter Address / 1440 / ';
clean([N12 + 'Invalid', N12 + 'Whitelisted', N12 + 'New-address cooldown']);
const f1 = cloneSt(SRC, N12 + 'Invalid'); out.invalid = f1.id;
{ const ia = q(f1, 'Input/Address'); ia.setProperties({ State: 'Invalid' });
  const al = await alertBox('danger', 'This looks like a Solana address', 'You chose Arbitrum One, but 7Hq3…Xk9P is a Solana (SPL) address. Paste an Arbitrum One address that starts with 0x, or go back and switch the network to Solana.', { actions: [await BTN('Secondary', 'Switch network to Solana', { size: 'S', lead: 'swap' }), await BTN('Ghost', 'Clear field', { size: 'S', lead: 'x' })] });
  const fc = ia.parent; fc.insertChild(fc.children.indexOf(ia) + 1, al); al.layoutSizingHorizontal = 'FILL';
  const tips = q(f1, 'Format checks');
  await swapIcon(tips.children[0], 'x-circle', 'status/danger'); { const t = tips.children[0].children.find(x => x.type === 'TEXT'); t.fills = [paint('text/danger')]; t.characters = 'Doesn\'t start with 0x — not an Arbitrum One address'; }
  await swapIcon(tips.children[1], 'x-circle', 'status/danger'); { const t = tips.children[1].children.find(x => x.type === 'TEXT'); t.fills = [paint('text/danger')]; t.characters = 'Checksum can\'t be verified for this format'; }
  await foot(f1, 'Disabled', 'Fix the address to continue'); await setRow(f1, 'Destination', 'Not valid on Arbitrum', 'text/danger', 'Body/S'); }
const f2 = cloneSt(SRC, N12 + 'Whitelisted'); out.whitelisted = f2.id;
{ const sa = q(f2, 'Saved address — Arbitrum cold wallet'); fill(sa, 'surface/selected'); sa.strokes = [paint('border/brand')];
  const rd = sa.findOne(x => x.name === 'Radio'); if (rd) { rd.strokes = [paint('brand/primary')]; if ('appendChild' in rd && rd.type !== 'INSTANCE') { const d = ellipse(10, 10, 'brand/primary', 'Dot'); rd.appendChild(d); if (rd.layoutMode === 'NONE') { d.x = (rd.width - 10) / 2; d.y = (rd.height - 10) / 2; } } }
  q(f2, 'Input/Address').setProperties({ State: 'Whitelisted' });
  const tips = q(f2, 'Format checks'); const ok = await alertBox('success', 'Whitelisted address — ready to use', 'Saved as "Arbitrum cold wallet" on 14 Oct 2026 and confirmed by email + 2FA. Format and checksum verified on Arbitrum One — no cooldown applies.'); ins(tips, ok); tips.remove();
  await foot(f2, 'Default', null); await setRow(f2, 'Destination', await I('9:418', { Size: 'S' }, { Address: AD, 'Show DEMO': true })); }
const f3 = cloneSt(SRC, N12 + 'New-address cooldown'); out.cooldown = f3.id;
{ q(f3, 'Input/Address').setProperties({ State: 'New address' });
  const tips = q(f3, 'Format checks'); const ch = AL('VERTICAL', { name: 'Cooldown options', gap: 12, p: 16, fill: 'surface/raised', r: 14 }); ins(tips, ch); tips.remove();
  await tx(ch, 'Choose how to continue', 'Body/M Strong');
  for (const [ic, t1, t2, bl, ty] of [['clock', 'Save it and withdraw after the cooldown', 'Confirm with email + 2FA now. 0x3f9a…c47E unlocks 28 Nov 2026, 18:42 UTC — we\'ll email you when it\'s ready.', 'Add to whitelist', 'Secondary'], ['shield-check', 'Use a whitelisted address now', 'Arbitrum cold wallet · 0x7c4e…a21D — no waiting.', 'Use cold wallet', 'Secondary']]) { const r = hrow('Option — ' + t1.slice(0, 30), 12, { p: 12, fill: 'surface/default', stroke: 'border/subtle', r: 10 }); add(ch, [r, 'FILL']); r.appendChild(await IC(ic, 20, 'icon/brand')); const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']); await tx(c, t1, 'Body/S Strong'); await tx(c, t2, 'Caption', 'text/secondary'); r.appendChild(await BTN(ty, bl, { size: 'S' })); }
  await tx(ch, 'Why the wait? A 24 h cooldown on every new destination protects your balance if someone else gets into your account. It applies to all players and support can\'t skip it.', 'Caption', 'text/tertiary');
  await foot(f3, 'Disabled', 'Unlocks 28 Nov 2026, 18:42 UTC'); await setRow(f3, 'Destination', await I('9:418', { Size: 'S' }, { Address: AD_NEW, 'Show DEMO': true })); }
fitSection(sec);
for (const f of [f1, f2, f3]) await q(f, 'Flow + summary').screenshot({ scale: 0.45 });
return Object.assign(out, { bounds: [f1, f2, f3].map(f => [f.x, f.y, f.width, f.height]) });
