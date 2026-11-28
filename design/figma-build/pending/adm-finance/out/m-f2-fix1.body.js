// ===== ADM-F2 Mobile fix 1 (page 10): queue card time/SLA line, sticky caption, compact bottom sheets so they fit the 844 viewport =====
const PG = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(PG);
async function setTx(t, v) { if (!t || t.type !== 'TEXT') return; const fs = t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]; for (const f of fs) await figma.loadFontAsync(f); t.characters = String(v); }
const out = { q: [], cap: 0, sheets: {} };
// 1. Queue: requested time moves to line 1 (before the chevron); line 4 becomes "Due in …"
const Q = await figma.getNodeByIdAsync('209:77692');
for (const k of Q.findAll(n => n.type === 'FRAME' && n.name.startsWith('Request WD-'))) {
  const l4t = k.findOne(n => n.type === 'TEXT' && / · SLA .* left$/.test(n.characters)); if (!l4t) continue;
  const [tm, rest] = l4t.characters.split(' · SLA '); await setTx(l4t, 'Due in ' + rest.replace(' left', ''));
  const l1 = k.findOne(n => n.name === 'L1'); if (l1 && !l1.findOne(n => n.type === 'TEXT' && n.characters === tm + ' UTC')) { const t = await T(tm + ' UTC', 'Caption', 'text/tertiary'); l1.insertChild(l1.children.length - 1, t); }
  out.q.push([k.name, tm, l4t.characters]);
}
// 2. Sticky-bar caption (detail + the two sheet clones)
for (const id of ['209:78027', '209:78251', '209:78467']) { const f = await figma.getNodeByIdAsync(id); for (const t of f.findAll(n => n.type === 'TEXT' && n.characters.startsWith('Chat icon = '))) { await setTx(t, 'Chat = ask @nova.k for info · every decision needs 2FA + a written reason and is audit-logged'); out.cap++; } }
// 3. Sheets: tighter body, shorter copy, re-anchor to the bottom of the 844 viewport
async function fixSheet(id, fn) {
  const fr = await figma.getNodeByIdAsync(id); const sh = fr.findOne(n => n.name.startsWith('Bottom sheet')); const bd = sh.findOne(n => n.name === 'Body');
  gap(bd, 12); await fn(sh, bd);
  let h = sh.height; const otpDesc = sh.findOne(n => n.type === 'TEXT' && n.characters.startsWith('Enter the 6-digit')); if (h > 780 && otpDesc) { otpDesc.visible = false; h = sh.height; }
  sh.y = 844 - sh.height; out.sheets[fr.name.split(' / ').pop()] = { h: Math.round(sh.height), top: Math.round(sh.y), otpDescHidden: otpDesc ? !otpDesc.visible : null }; return fr;
}
const A = await fixSheet('209:78251', async (sh, bd) => {
  const last = bd.children[bd.children.length - 1]; if (last && last.name === 'Note' && last.findOne(n => n.type === 'TEXT' && n.characters.startsWith('Your admin ID'))) last.remove();
  const v = sh.findOne(n => n.type === 'TEXT' && n.characters.startsWith('AML-3317 reviewed')); await setTx(v, 'AML-3317 reviewed: funded by own deposits (DP-77380). Destination proven 14 Oct 2026; sanctions clear, no flagged-cluster exposure.');
  await setTx(sh.findOne(n => n.type === 'TEXT' && n.characters === '183 / 500'), '131 / 500');
  await setTx(sh.findOne(n => n.type === 'TEXT' && n.characters.startsWith('Shown to the second approver')), 'Shown to the second approver · written to the append-only audit log with your admin ID, IP and time.');
});
const R = await fixSheet('209:78467', async (sh, bd) => {
  await setTx(sh.findOne(n => n.type === 'TEXT' && n.characters.startsWith('Can’t reject yet')), 'Not rejected — the reason needs 20+ characters. WD-20931 stays Under review.');
  await setTx(sh.findOne(n => n.type === 'TEXT' && n.characters.startsWith('On reject:')), 'On reject, 1,500.00 USDT returns to Available (→ 10,715.30). @nova.k is notified with a summary and can appeal.');
});
for (const n of [Q, A, R]) await n.screenshot({ scale: n.height > 1000 ? 0.5 : 0.6 });
return out;
