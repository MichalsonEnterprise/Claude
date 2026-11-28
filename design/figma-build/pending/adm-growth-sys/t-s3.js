// [ADM-S3] Audit Logs / 768 / Default — tablet: no sidebar, inline admin top bar, scrolling System sub-nav, entries as stacked cards
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-A/M Affiliates & marketing, ADM-S System', 86000, 0);
const NAME = '[ADM-S3] Audit Logs / 768 / Default';
const s3m = await figma.getNodeByIdAsync('66:51328');
const below = sec.children.filter(n => Math.abs(n.x - s3m.x) < 2 && n.name.includes('/ 1280 /'));
const Y = Math.max(...below.map(n => n.y + n.height)) + 160;
const { f, c } = await TSHELL(NAME, { x: s3m.x, y: Y }, 'System', [['Admin roles', '6'], ['Permissions'], ['Audit logs'], ['API settings'], ['Security', '2'], ['System configuration', '1']], 'Audit logs', 'SI');
// title
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('Audit logs', 'Heading/H3', 'text/primary'), await ST('Confirmed', 'Chain verified'), await DEMO('M')); add(tr, [SPC(), 'FILL']);
add(tr, await BTN('Secondary', 'Verify chain now', { size: 'S', lead: 'refresh' }), await BTN('Primary', 'Export signed log', { size: 'S', lead: 'download' })); add(c, [tr, 'FILL']);
await WT(c, 'Every admin action and system event, written once and never edited. Each entry stores the hash of the one before it, and an hourly Merkle root is anchored on Arbitrum — anyone holding an export can prove nothing was changed.', 'Body/S', 'text/secondary', 704);
// integrity tiles 2 × 2
const grid = AL('HORIZONTAL', { name: 'Integrity status (2 columns)', gap: 16, wrap: 1, cgap: 16 }); add(c, [grid, 'FILL']);
for (const [lab, val, vc, sub, ic] of [['CHAIN STATUS', 'Verified', 'text/success', 'entries #1 – #88,214 · checked 18:45 UTC', 'shield-check'], ['LAST ON-CHAIN ANCHOR', '18:00 UTC', 'text/primary', 'Arbitrum block 284,112,904', 'link'], ['NEXT ANCHOR', '19:00 UTC', 'text/primary', 'hourly Merkle root of new entries', 'clock'], ['ENTRIES TODAY', '2,416', 'text/primary', 'admins + system jobs · kept 7 years', 'database']]) {
  const k = CARD('Tile ' + lab, { w: 344, gap: 6, p: 16 }); const h = AL('HORIZONTAL', { name: 'Label row', gap: 6, align: 'CENTER' }); add(h, await IC(ic, 16, 'icon/muted'), await T(lab, 'Overline', 'text/tertiary')); add(h, [SPC(), 'FILL']); add(h, await DEMO('XS')); add(k, [h, 'FILL']);
  add(k, await T(val, 'Number/M', vc)); await WT(k, sub, 'Caption', 'text/tertiary', 300); add(grid, k);
}
// toolbar
const tb = AL('HORIZONTAL', { name: 'Controls', gap: 8, align: 'CENTER' }); add(tb, [await SEARCH('Search actor, action code, target or entry #', 'M'), 'FILL']); add(tb, await I('23:5397', { State: 'Default' }, { Label: 'Filters' })); add(tb, await BTN('Secondary', 'Export view', { size: 'M', lead: 'download' })); add(c, [tb, 'FILL']);
const chips = AL('HORIZONTAL', { name: 'Quick filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['Actor', 0], ['Action', 0], ['Target type', 0], ['Date: Today', 1], ['Integrity: any', 0]]) add(chips, await CHIP(l, s)); add(c, [chips, 'FILL']);
const sm = AL('HORIZONTAL', { name: 'Summary', gap: 8, align: 'CENTER' }); add(sm, await T('2,416 entries · no filters · newest first', 'Caption', 'text/tertiary'), await DEMO('XS')); add(sm, [SPC(), 'FILL']); add(sm, await IC('lock', 14, 'icon/muted'), await T('Exports are watermarked with your admin ID and logged', 'Caption', 'text/tertiary')); add(c, [sm, 'FILL']);
// entries
const list = CARD('Entries — stacked cards', { gap: 0, p: 0 }); list.clipsContent = true; add(c, [list, 'FILL']);
const lh = AL('VERTICAL', { name: 'List header', gap: 4, p: [16, 16, 16, 16] }); strokeSides(lh, 'border/subtle', { b: 1 }); add(list, [lh, 'FILL']);
const lr = AL('HORIZONTAL', { name: 'Title', gap: 8, align: 'CENTER' }); add(lr, await T('Entries · 27 Nov 2026 (UTC)', 'Heading/H5', 'text/primary'), await DEMO('M')); add(lr, [SPC(), 'FILL']); add(lr, await BTN('Ghost', 'Newest first', { size: 'S', trail: 'chevron-down' })); add(lh, [lr, 'FILL']);
await WT(lh, 'Read-only. Tap an entry for the full payload, the previous-entry hash and its Merkle proof. No role has an edit or delete action.', 'Caption', 'text/tertiary', 640);
// role chip: library variants, Marketing cloned from the desktop master (no Marketing variant in Admin/Role Chip)
let mkChip = null; try { const src = s3m.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === 'Admin/Role Chip' && n.findOne(t => t.type === 'TEXT' && t.characters === 'Marketing')); if (src) mkChip = src; } catch (e) { MISS.push('mk ' + e.message); }
async function ROLE(r) { if (r === 'Marketing') { if (mkChip) { try { const k = mkChip.clone(); return k; } catch (e) { MISS.push('mkclone'); } } const p = AL('HORIZONTAL', { name: 'Role chip — Marketing (inline)', gap: 4, p: [2, 8, 2, 6], fill: 'surface/raised', r: 9999, align: 'CENTER' }); add(p, await IC('megaphone', 12, 'icon/brand'), await T('Marketing', 'Label/S', 'text/secondary')); return p; } return await I('23:18440', { Role: r, Size: 'S' }); }
const E = [
  ['18:44:30', 'LM', 'L. Moreau', 'Marketing', 'Saved CMS draft', 'cms.draft.save', 'CMS-122', 'v3 draft', 'Daily rewards page autosave; draft only, no publish rights.', '10.24.9.31 · Admin console', '0x8e41…07bd', '88,214'],
  ['18:42:07', 'AM', 'A. Marin', 'Finance', 'Rejected withdrawal', 'withdrawal.reject', 'WD-20850', '@nova.k', 'Destination flagged by sanctions screening (run SCR-5521). Funds returned to Available per policy AML-4.2.', '10.24.8.17 · Admin console', '0x5c09…e3a1', '88,213'],
  ['18:31:55', 'KO', 'K. Osei', 'Compliance', 'Requested changes', 'promotion.review', 'PR-208', 'Black Friday reload', '“Risk-free”, guaranteed wins, looping timer, missing key terms, cooling-off audience.', '10.24.8.40 · Admin console', '0x2f7a…91c4', '88,212'],
  ['18:20:12', 'SI', 'S. Iyer', 'Super Admin', 'Approved role change', 'role.assign.approve', 'AR-1046', 'J. Ortiz', 'Support L2 for weekend escalations; requested by R. Duarte.', '10.24.8.12 · Admin console', '0xb310…5e2d', '88,211'],
  ['18:00:00', 'SY', 'System', null, 'Anchored audit chain', 'audit.anchor', 'Arbitrum', 'anchor tx', 'Merkle root of entries #87,904–#88,210 written on-chain.', 'Scheduler · automated job', '0x77c2…a0f9', '88,210'],
  ['17:58:03', 'RD', 'R. Duarte', 'Support', 'Placed restriction', 'account.restrict', 'GP-51877', '@rook.eth', 'Player asked for a 30-day break in chat T-55102; cooling-off applied.', '10.24.9.8 · Admin console', '0x0d95…3b6e', '88,209']];
for (let i = 0; i < E.length; i++) {
  const e = E[i]; const k = AL('VERTICAL', { name: 'Entry #' + e[11], gap: 8, p: [14, 16, 14, 16] }); if (i < E.length - 1) strokeSides(k, 'border/subtle', { b: 1 });
  const r1 = AL('HORIZONTAL', { name: 'When · who · integrity', gap: 10, align: 'CENTER' });
  const tm = AL('VERTICAL', { name: 'Time', gap: 0 }); add(tm, await T(e[0], 'Mono/S', 'text/primary'), await T('27 Nov 2026', 'Caption', 'text/tertiary')); add(r1, tm);
  add(r1, await I('9:238', { Size: 'XS' }, { Initials: e[1] })); add(r1, await T(e[2], 'Body/S Strong', 'text/primary')); if (e[3]) add(r1, await ROLE(e[3])); else add(r1, await T('automated', 'Caption', 'text/tertiary'));
  add(r1, [SPC(), 'FILL']); add(r1, await IC('check-circle', 16, 'status/success'), await T('Chain ✓', 'Caption', 'text/success'), await T('#' + e[11], 'Mono/S', 'text/tertiary')); add(k, [r1, 'FILL']);
  const r2 = AL('HORIZONTAL', { name: 'Action · target', gap: 8, align: 'CENTER' }); add(r2, await T(e[4], 'Body/M Strong', 'text/primary'));
  const code = AL('HORIZONTAL', { name: 'Action code', p: [2, 6, 2, 6], fill: 'surface/raised', r: 4 }); add(code, await T(e[5], 'Mono/S', 'text/secondary')); add(r2, code); add(r2, [SPC(), 'FILL']);
  add(r2, await T(e[6], 'Mono/S', 'text/brand'), await T(e[7], 'Caption', 'text/tertiary')); add(k, [r2, 'FILL']);
  await WT(k, e[8], 'Body/S', 'text/secondary', 640);
  const r4 = AL('HORIZONTAL', { name: 'Source · hash', gap: 8, align: 'CENTER' }); add(r4, await IC('globe', 14, 'icon/muted'), await T(e[9], 'Caption', 'text/tertiary')); add(r4, [SPC(), 'FILL']); add(r4, await T('hash', 'Caption', 'text/tertiary'), await T(e[10], 'Mono/S', 'text/tertiary'), await DEMO('XS'), await IC('chevron-right', 16, 'icon/muted')); add(k, [r4, 'FILL']);
  add(list, [k, 'FILL']);
}
const pgr = await PAGER('Cursor', '1–20 of 2,416'); add(list, [pgr, 'FILL']);
// integrity explainer + signed exports, stacked
const hw = CARD('How integrity works', { gap: 12 }); add(c, [hw, 'FILL']);
await CHEAD(hw, 'How integrity works', { icon: 'shield-check', ic: 'icon/brand', demo: false, sub: 'Tamper-evident by construction — not by policy alone' });
const g2 = AL('HORIZONTAL', { name: 'Principles (2 columns)', gap: 12, wrap: 1, cgap: 12 }); add(hw, [g2, 'FILL']);
for (const [ic, t1, t2] of [['hash', 'Hash chain', 'Each entry stores the SHA-256 hash of the previous entry; changing one breaks every hash after it.'], ['link', 'On-chain anchor', 'Every hour the Merkle root is written to AuditAnchor v1.0.0 0x5a3e…c91d on Arbitrum (DEMO).'], ['database', 'Write-once storage', 'Entries live in WORM storage for 7 years. There is no edit or delete API for any role.'], ['undo', 'Corrections', 'A mistake is fixed by a new entry that references the original — history is never rewritten.']]) {
  const p = AL('HORIZONTAL', { name: t1, gap: 10, p: [12, 12, 12, 12], fill: 'surface/raised', r: 10, w: 314 }); p.counterAxisSizingMode = 'AUTO'; add(p, await IC(ic, 18, 'icon/brand')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); await WT(tx, t1, 'Body/S Strong', 'text/primary', 250); await WT(tx, t2, 'Caption', 'text/tertiary', 250); add(p, [tx, 'FILL']); add(g2, p);
}
const ex = CARD('Signed exports', { gap: 10 }); add(c, [ex, 'FILL']);
await CHEAD(ex, 'Signed exports', { icon: 'download', sub: 'CSV or JSON with Merkle proofs, signed with the platform key and watermarked with the exporting admin' });
for (const [a, b] of [['EXP-0412 · E. Lindqvist (external auditor) · 20 Nov', 'Full month · CSV'], ['EXP-0411 · K. Osei · 18 Nov', 'Compliance actions · JSON'], ['EXP-0409 · S. Iyer · 2 Nov', 'Role changes · CSV']]) { const r = AL('HORIZONTAL', { name: a.slice(0, 8), gap: 8, p: [8, 0, 8, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, await IC('file', 16, 'icon/muted'), await T(a, 'Body/S', 'text/secondary')); add(r, [SPC(), 'FILL']); add(r, await T(b, 'Body/S Strong', 'text/primary'), await DEMO('XS')); add(ex, [r, 'FILL']); }
await NOTE(ex, 'info', 'info', 'Every export needs a purpose and 2FA, and is itself written to this log as a new entry.', { w: 600 });
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { frame: f.id, name: f.name, w: f.width, h: Math.round(f.height), x: f.x, y: f.y, mk: !!mkChip, miss: [...new Set(MISS)].slice(0, 30) };
