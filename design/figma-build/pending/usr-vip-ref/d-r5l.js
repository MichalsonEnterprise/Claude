const SRC = sec.children.find(c => c.name === '[USR-R5] Referrals — Payout History / 1440 / Default');
if (!SRC) throw new Error('Source frame missing — run the default-state batch first');
const NAME = '[USR-R5] Referrals — Payout History / 1440 / Payout locked — KYC L1 & below minimum (separate DEMO account)';
for (const c of [...sec.children]) if (c.name === NAME) c.remove();
const f = SRC.clone(); f.name = NAME; sec.appendChild(f); f.x = SRC.x; let my = 0; for (const c of sec.children) if (c !== f && Math.abs(c.x - SRC.x) < 2) my = Math.max(my, c.y + c.height); f.y = my + 160;
await sxc(byName(f, 'Shell/Topbar Desktop'), '9,215.30', '342.10');
const ps = byName(f, 'Payout summary');
await sx(ps, 'Payout amount value', '14.30'); const av = ps.findOne(n => n.name === 'Payout amount value'); if (av) av.fills = [paint('text/primary')];
await sx(ps, 'Pending note', 'Separate DEMO account (KYC Level 1, Available 342.10 USDT) — not @nova.k. Pending 0.00 USDT.');
const ctab = ps.findOne(n => n.name === 'Request payout CTA'); if (ctab) ctab.setProperties({ State: 'Disabled' });
for (const [nm, txt] of [['Requirement — minimum', 'Minimum 20.00 USDT — you have 14.30 (5.70 to go)'], ['Requirement — KYC', 'KYC Level 2 needed — you’re on Level 1']]) { const c = byName(ps, nm); if (!c) continue; const t = c.findOne(n => n.type === 'TEXT'); await ld(t); t.characters = txt; const ic = c.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Icon/')); await SWAPIC(ic, 'x-circle', 'status/danger'); fill(c, 'status/danger-tint'); }
const al = ROW({ name: 'Alert — payouts locked', gap: 12, p: [14, 16, 14, 16], fill: 'status/warning-tint', r: 10 }); add(al, await IC('alert-triangle', 20, 'status/warning')); const ac = COL({ gap: 2 }); add(ac, await T('Payouts unlock at KYC Level 2 and 20.00 USDT', 'Body/S Strong')); add(ac, [await T('Your commission keeps accruing and never expires. Verification usually takes under 10 minutes.', 'Caption', 'text/secondary', { w: 400 }), 'FILL']); add(al, [ac, 'FILL']); add(al, await BTN('Primary', 'Verify identity', { size: 'S', lead: 'id-card' }));
ps.insertChild(1, al); al.layoutSizingHorizontal = 'FILL';
await sxc(ps, '@nova.k · GP-48213', 'Paid to this account’s GLOBAL POOL Available balance. No payout fee. Usually reviewed within 24 hours.');
const hc = byName(f, 'Payout history'); const tbl = hc.findOne(n => n.name === 'Table');
for (const r of [...tbl.children].slice(1)) r.remove();
const em = COL({ name: 'Empty state — no payouts yet', gap: 8, p: [40, 24, 40, 24], align: 'CENTER' }); add(em, await TILE('receipt', 'icon/muted', 'surface/raised', 48)); add(em, await T('No payouts yet', 'Heading/H5')); add(em, await T('Your first payout appears here once you reach 20.00 USDT and verify to KYC Level 2.', 'Body/S', 'text/secondary', { w: 420, align: 'CENTER' })); add(tbl, [em, 'FILL']);
FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
