// ===== GP-03 / GP-04 mobile 390 bottom sheets (page 10, section 'GP — Mobile A') =====
// needs: helpers.js + modals.js + msheet.js above
const out = { created: {}, skipped: [], log: [] };
let T3 = ['Confirming your 35 entries', 'Round #1,248 · paid from your platform balance · no gas'];
let T4 = ['You’re in round #1,248', '35 entries confirmed on Arbitrum at 16:42:41 UTC'];
try {
  const p7 = figma.root.children.find(p => p.name === '07 — Global Pool'); await p7.loadAsync();
  for (const [id, arr] of [['34:365199', T3], ['34:383862', T4]]) {
    const d = await figma.getNodeByIdAsync(id); const m = d && d.findOne(n => n.name.startsWith('Modal — '));
    if (m) { arr[0] = m.name.slice(8); const s = m.findOne(n => n.type === 'TEXT' && n.name === 'Subtitle'); if (s) arr[1] = s.characters; }
  }
} catch (e) { out.log.push('desktop title read failed: ' + e.message); }
out.log.push({ T3, T4 });
function fitWide(root, maxW) { for (const n of root.findAll(x => x.type === 'INSTANCE' && x.name === 'Tx/Hash')) { if (n.width > maxW && n.parent && n.parent.layoutMode && n.parent.layoutMode !== 'NONE') n.layoutSizingHorizontal = 'FILL'; } }
const shots = [];
const N3 = '[GP-03] Participation Pending / 390 / Bottom sheet';
if (sec.children.some(n => n.name.startsWith('[GP-03] Participation Pending / 390'))) out.skipped.push(N3);
else {
  const { m, body, ft, iw } = await modalShell(390, T3[0], T3[1], 'hourglass', 'status/info', 'status/info-tint', true);
  m.name = 'Sheet — Participation pending';
  await pendingBody(body, ft, iw, true);
  fitWide(body, iw - 40);
  const r = await overlayM(N3, 1140, m, true);
  out.created[N3] = r.f.id; shots.push(r.f);
}
const N4 = '[GP-04] Participation Success — Entry receipt / 390 / Bottom sheet';
if (sec.children.some(n => n.name.startsWith('[GP-04] Participation Success — Entry receipt / 390'))) out.skipped.push(N4);
else {
  const { m, body, ft, iw } = await modalShell(390, T4[0], T4[1], 'check-circle', 'status/success', 'status/success-tint', true);
  m.name = 'Sheet — Entry receipt';
  await successBody(body, ft, iw, true);
  fitWide(body, iw);
  const r = await overlayM(N4, 1650, m, false);
  out.created[N4] = r.f.id; shots.push(r.f);
}
// consistency fix: round #1,248 1st prize = @orbit_77 (GP-07 public results). Patch the Winner Reveal Card on the mobile No-round hub.
for (const fr of sec.children.filter(n => / No active round$/.test(n.name))) {
  for (const t of fr.findAll(n => n.type === 'TEXT' && n.characters.includes('@lumen.eth'))) { await lf(t); t.characters = t.characters.replace(/@lumen\.eth/g, '@orbit_77'); out.log.push('handle fixed in ' + fr.name); }
}
fitSection(sec);
out.frames = sec.children.map(c => ({ id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
for (const f of shots) await f.screenshot({ scale: 0.6 });
// re-verify sticky participate bar on the 390 Restricted / Wallet-disconnected hubs
for (const id of ['34:473267', '34:482737']) { const f = await figma.getNodeByIdAsync(id); if (!f) continue; const sb = f.findOne(n => n.name === 'Sticky participate bar (pinned above tab bar)'); if (sb) await sb.screenshot({ scale: 1 }); }
return out;
