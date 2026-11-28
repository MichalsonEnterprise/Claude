// column widths: C6 (master + laptop) and B2 master
for (const fr of sec.children.filter(n => /^\[ADM-C6\]|^\[ADM-B2\] Smart Contracts \/ 1440/.test(n.name))) {
  const W = fr.name.startsWith('[ADM-C6]') ? ['Exclusions', { end: 168, source: 164, status: 160 }] : ['Contract functions', { appr: 340 }];
  const tb = fr.findOne(n => n.name.startsWith('Table — ' + W[0])); if (!tb) { MISS.push('fix: no table ' + W[0]); continue; }
  for (const [k, w] of Object.entries(W[1])) for (const n of tb.findAll(x => x.name === 'Col/' + k || x.name === 'H/' + k)) { n.resize(w, n.height); if (n.type === 'FRAME') n.counterAxisSizingMode = 'AUTO'; }
}
// copy fixes: B1 token secondary line; B2 contract cards (subtitles + last event before the 18:44 UTC "now")
{ const b1 = sec.children.find(n => n.name === '[ADM-B1] Supported Networks / 1440 / Default'); if (b1) for (const t of b1.findAll(n => n.type === 'TEXT' && n.characters === 'Token contract 0xFd08…Cbb9 · illustrative')) await setText(t, 'USDT 0xFd08…Cbb9 · illustrative'); }
{ const b2 = sec.children.find(n => n.name === '[ADM-B2] Smart Contracts / 1440 / Default');
  if (b2) { for (const t of b2.findAll(n => n.type === 'TEXT' && n.characters.includes('27 Nov 2026, 20:02 UTC'))) await setText(t, t.characters.replace('27 Nov 2026, 20:02 UTC', '26 Nov 2026, 20:02 UTC'));
    const SUB = { VRFConsumer: 'Randomness requests and VRF callbacks', Treasury: 'Pool and fee balances, payouts and refunds' };
    for (const k of b2.findAll(n => n.type === 'INSTANCE' && n.findOne && n.findOne(x => x.type === 'TEXT' && SUB[x.characters]))) { const nm = k.findOne(x => x.type === 'TEXT' && SUB[x.characters]).characters; for (const t of k.findAll(x => x.type === 'TEXT' && x.characters === 'Rounds, entries, prize settlement & refunds')) await setText(t, SUB[nm]); } } }
// generic overflow fix: horizontal rows (outside instances) whose children overflow -> longest text wraps (HEIGHT + FILL), row Spacer removed
function inInst(n) { let p = n.parent; while (p && p.type !== 'SECTION' && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
const OV = [];
for (const fr of sec.children.filter(n => n.type === 'FRAME')) {
  for (const r of fr.findAll(n => n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL' && n.visible)) {
    if (r.removed || r.name === 'Spacer' || inInst(r)) continue;
    const kids = r.children.filter(k => k.visible && k.layoutPositioning !== 'ABSOLUTE'); if (kids.length < 2) continue;
    const need = kids.reduce((s, k) => s + (k.name === 'Spacer' ? 0 : k.width), 0) + r.itemSpacing * (kids.length - 1) + r.paddingLeft + r.paddingRight;
    if (need <= r.width + 1) continue;
    const txt = kids.filter(k => k.type === 'TEXT' && k.textAutoResize === 'WIDTH_AND_HEIGHT').sort((a, b) => b.width - a.width)[0];
    if (!txt) { OV.push('NO TEXT ' + fr.name.slice(0, 16) + ' › ' + r.name); continue; }
    const sp = kids.find(k => k.name === 'Spacer'); const right = sp && kids.indexOf(txt) > kids.indexOf(sp); if (sp) sp.remove();
    txt.textAutoResize = 'HEIGHT'; txt.layoutSizingHorizontal = 'FILL'; if (right) txt.textAlignHorizontal = 'RIGHT';
    OV.push(fr.name.slice(0, 16) + ' › ' + r.name + ' › ' + txt.characters.slice(0, 28));
  }
}
fitSection(sec);
__R.push({ overflowFixed: OV });
// verification shots for Laptop clones (spare image slots)
for (const nm of ['[ADM-C5] Restricted Countries / 1280 / Default', '[ADM-C6] Self-Exclusion / 1280 / Default', '[ADM-C7] Responsible Gaming Reports / 1280 / Default']) { const fr = sec.children.find(n => n.name === nm); if (fr) await fr.screenshot({ scale: 0.4 }); }
