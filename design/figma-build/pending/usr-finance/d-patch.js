// d-patch: align desktop/tablet USR-F frames (page 05) with later demo-data additions
// (WD-20931 timeline 18:43/18:44 → decision by 22:44 UTC, new-destination AML reason; VIP weekly reward cycle 16–22 Nov auto-settles Mon 30 Nov 10:00;
//  Gold III level-up 5.00 on 25 Nov 19:32; rakeback 2.96 on 24 Nov 09:12; WD-20702/WD-20511 moved to the primary BNB address so WD-20931 is the first to 0x7c4e…a21D)
await Promise.all([['Inter','Regular'],['Inter','Medium'],['Inter','Semi Bold'],['Inter','Bold'],['Geist Mono','Regular'],['Geist Mono','Medium']].map(([family, style]) => figma.loadFontAsync({ family, style })));
const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const LOG = [], MISS = [];
async function sc(t, s) { const fonts = t.characters.length ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]; for (const f of fonts) await figma.loadFontAsync(f); t.characters = s; }
const texts = (root) => root.findAll(n => n.type === 'TEXT');
async function rep(root, from, to, exact = true) { if (!root) { MISS.push('no root for ' + from); return 0; } let k = 0; for (const t of texts(root)) { const ch = t.characters; if (exact ? ch === from : ch.includes(from)) { await sc(t, exact ? to : ch.split(from).join(to)); k++; } } if (!k) MISS.push(root.name.slice(0, 36) + ' :: ' + from.slice(0, 44)); return k; }
const rowsIn = (fr) => fr.findAll(n => n.type === 'FRAME' && n.name.startsWith('Row — '));
function findRow(fr, prefix, containing) { const r = rowsIn(fr).find(r => r.name.startsWith('Row — ' + prefix) && (!containing || texts(r).some(t => t.characters.includes(containing)))); if (!r) MISS.push(fr.name.slice(0, 30) + ' :: row ' + prefix + (containing ? ' / ' + containing : '')); return r; }
function reorder(list, tag) { const rows = list.filter(Boolean); if (rows.length !== list.length) { MISS.push('reorder skipped ' + tag); return; } const p = rows[0].parent; if (rows.some(r => r.parent !== p)) { MISS.push('reorder parents differ ' + tag); return; } const base = Math.min(...rows.map(r => p.children.indexOf(r))); rows.forEach((r, i) => p.insertChild(base + i, r)); LOG.push('reordered ' + tag); }
async function setStatus(row, status, label, oldLabel) { const b = row.findOne(n => n.type === 'INSTANCE' && n.name === 'Status badge'); if (!b) { MISS.push('status badge in ' + row.name); return; } try { b.setProperties({ Status: status }); } catch (e) { MISS.push('status prop ' + e.message.slice(0, 60)); } const lt = b.findOne(n => n.type === 'TEXT' && n.name === 'Label'); if (lt) await sc(lt, label); else await rep(row, oldLabel, label); }
async function toBNB(row, oldSub, newSub) { if (!row) return; await rep(row, oldSub, newSub); await rep(row, '0x7c4e…a21D', '0x12ab…9f3C'); const m = row.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Chain/')); const bnb = await figma.getNodeByIdAsync('4:754'); for (const x of m) x.swapComponent(bnb); LOG.push('BNB ' + row.name + ' marks ' + m.length); }
const shots = [];
// ---------- F2 Withdrawals ----------
const F2 = await figma.getNodeByIdAsync('72:48152');
if (F2) {
  await rep(F2, '17:58', '18:44', false); await rep(F2, '21:58', '22:44', false);
  for (const t of texts(F2).filter(t => t.characters.startsWith('Routine AML screening'))) await sc(t, 'Routine AML screening for a new destination: this is your first withdrawal to 0x7c4e…a21D since you whitelisted it on 14 Oct 2026. Usually under 4 h — decision expected by 27 Nov 2026, 22:44 UTC. The amount stays Locked until it is sent, and you receive 1,499.92 USDT after the 0.08 USDT Arbitrum network fee.');
  await rep(F2, 'AML screening', 'Manual AML review');
  await rep(F2, 'Amount screening', 'First use of an address');
  await rep(F2, 'Withdrawals above 1,000.00 USDT get an AML check, usually done within 4 h.', 'The first withdrawal to a newly whitelisted address gets a routine AML check, usually under 4 h — as with WD-20931.');
  await toBNB(findRow(F2, 'WD-20702'), 'Arbitrum · received 1,249.92 · tx 0x0be4…7a31', 'BNB Chain · received 1,249.88 · tx 0x0be4…7a31');
  await toBNB(findRow(F2, 'WD-20511'), 'Arbitrum · received 999.92 · tx 0x9a6d…14c2', 'BNB Chain · received 999.88 · tx 0x9a6d…14c2');
  await rep(F2, 'Network fees paid so far: 0.86 USDT', 'Network fees paid so far: 0.98 USDT');
  const tr = F2.findOne(n => n.name === 'In review — WD-20931'); if (tr) shots.push(tr);
}
// ---------- F3 Fees ----------
const F3 = await figma.getNodeByIdAsync('74:49145');
if (F3) {
  await rep(F3, '17:58', '18:44', false); await rep(F3, '0.86', '0.98');
  const w = findRow(F3, 'WD-20931'), e = findRow(F3, 'Round #1,248'); reorder([w, e], 'F3');
}
// ---------- F4 Rewards ----------
const F4 = await figma.getNodeByIdAsync('86:49985');
if (F4) {
  for (const t of texts(F4).filter(t => t.characters.startsWith('Earned for 23 – 29 Nov 2026'))) await sc(t, 'Earned for 16 – 22 Nov 2026 at VIP Gold (tier 3 of 5). Claiming moves it from Owed to Available with no wagering requirement. Not claimed by Mon 30 Nov 2026, 10:00 UTC? It settles to Available automatically — you never lose it.');
  const rA = findRow(F4, 'VIP Gold weekly reward', 'Week 23 – 29 Nov 2026'), rB = findRow(F4, 'VIP Gold weekly reward', 'Week 16 – 22 Nov 2026'), rL = findRow(F4, 'VIP level-up'), rR = findRow(F4, 'Rakeback claim');
  const d3 = findRow(F4, 'Daily reward · day 3'), d2 = findRow(F4, 'Daily reward · day 2'), d1 = findRow(F4, 'Daily reward · day 1'), cb = findRow(F4, 'Weekly cashback'), tn = findRow(F4, 'Orbit Rush Sprint'), ms = findRow(F4, 'Mission');
  if (rA) { await rep(rA, 'Week 23 – 29 Nov 2026', 'Week 16 – 22 Nov · settles 30 Nov'); await rep(rA, '27 Nov 2026', '23 Nov 2026'); }
  if (rB) { await rep(rB, 'Week 16 – 22 Nov 2026', 'Week 9 – 15 Nov 2026'); await rep(rB, '20 Nov 2026', '23 Nov 2026'); await rep(rB, 'Claimed 20 Nov', 'Auto-settled 23 Nov'); }
  if (rL) { await rep(rL, 'VIP level-up · Gold level 14', 'VIP level-up · Gold III'); await rep(rL, 'Reached 12,000 points', 'Level 14 · reached 12,000 points'); await rep(rL, '12 Nov 2026', '25 Nov 2026'); await rep(rL, '16:44 UTC', '19:32 UTC'); await rep(rL, '+25.00', '+5.00'); rL.name = 'Row — VIP level-up · Gold III'; }
  if (rR) { await rep(rR, '+2.86', '+2.96'); await rep(rR, '08:15 UTC', '09:12 UTC'); }
  reorder([d3, rL, d2, rR, d1, rA, rB, cb, tn, ms], 'F4');
  if (rA) shots.push(rA.parent);
}
// ---------- F6 (1440 default, 1440 export, 768) ----------
for (const id of ['90:114727', '109:103285', '109:104557']) {
  const fr = await figma.getNodeByIdAsync(id); if (!fr) { MISS.push('frame ' + id); continue; }
  await rep(fr, '17:58', '18:44', false); await rep(fr, '21:58', '22:44', false);
  const rV = findRow(fr, 'VIP Gold weekly reward');
  if (rV) {
    await rep(rV, 'VIP Gold weekly reward', 'VIP level-up · Gold III');
    for (const t of texts(rV).filter(t => /week 23 – 29 Nov/i.test(t.characters))) await sc(t, t.characters.startsWith('Reward') ? 'Reward · level 14, no wagering' : 'Level 14 · cash, no wagering');
    await rep(rV, '27 Nov 2026', '25 Nov 2026'); await rep(rV, '10:00 UTC', '19:32 UTC'); await rep(rV, '+115.20', '+5.00');
    await setStatus(rV, 'Confirmed', 'Credited', 'Owed'); rV.name = 'Row — VIP level-up · Gold III';
  }
  reorder([findRow(fr, 'WD-20931'), findRow(fr, 'DP-77412'), findRow(fr, 'Round #1,248'), findRow(fr, 'Round #1,247'), rV, findRow(fr, 'Round #1,246'), findRow(fr, 'Refund · round #1,245'), findRow(fr, 'Fee reversal'), findRow(fr, 'Round #1,245'), findRow(fr, 'DP-77380')], 'F6 ' + id);
  if (id === '90:114727') { const w = findRow(fr, 'WD-20931'); if (w) shots.push(w.parent); }
}
for (const s of shots) await s.screenshot({ scale: 0.5 });
return { log: LOG, miss: MISS, shots: shots.map(s => s.id + ' ' + s.name) };
