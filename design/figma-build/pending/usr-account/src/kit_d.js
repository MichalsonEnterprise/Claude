// ===== ACCOUNT KIT — DESKTOP SHELL =====
const STEP = 1560; // 1440 + 120
const MW = 856;    // main column width (1136 content − 256 sub-nav − 24 gap)
const CW = MW - 48; // inner width of a padded card in main
// desktop section is split into two bands: A1–A5 (band 0) and A6–A10 (band 1) — the section has ~12,000 px before USR-F1..F6 at X=36000
const BANDF = (n) => { const m = /\[USR-A(\d+)\]/.exec(n); return m && +m[1] >= 6 ? 1 : 0; };
const NAV = [
  ['Profile', [['Personal information', 'user'], ['Notification preferences', 'bell']]],
  ['Security', [['Security overview', 'shield-check'], ['Two-factor authentication', 'key'], ['Anti-phishing code', 'mail'], ['Login history', 'history'], ['Connected devices', 'monitor'], ['Session management', 'activity']]],
  ['Verification', [['KYC status', 'id-card'], ['Verification documents', 'file']]],
];
function groupOf(label) { for (const [g, items] of NAV) if (items.some(i => i[0] === label)) return g; return 'Account'; }
async function navItem(label, icon, on) {
  const it = await tryy('navItem ' + label, async () => { const x = await I('22:8712', { State: on ? 'Active' : 'Default', Collapsed: 'No' }, { Label: label, Icon: ICONS[icon], 'Show badge': false, 'Show count': false, 'Show chevron': false }); const ic = x.findOne(n => n.name === 'Icon'); if (ic) { ic.resize(20, 20); tint(ic, on ? 'icon/brand' : 'icon/muted'); } return x; });
  if (it) { it.name = 'Sub-nav — ' + label; return it; }
  const r = AL('HORIZONTAL', { name: 'Sub-nav — ' + label, gap: 12, p: [8, 12, 8, 12], align: 'CENTER', r: 10, fill: on ? 'brand/tint' : null });
  r.appendChild(await IC(icon, 20, on ? 'icon/brand' : 'icon/muted')); r.appendChild(await T(label, 'Label/M', on ? 'text/brand' : 'text/secondary')); return r;
}
async function subnav(active) {
  const c = ALX('VERTICAL', { name: 'Account sub-nav', gap: 16, p: [16, 12, 16, 12], fill: 'surface/default', stroke: 'border/subtle', r: 14, w: 256 });
  const u = AL('HORIZONTAL', { name: 'Account holder', gap: 12, align: 'CENTER', p: [0, 4, 16, 4] }); add(c, [u, 'FILL']); strokeSides(u, 'border/subtle', { b: 1 });
  u.appendChild(await I('9:238', { Size: 'M' }, { Initials: 'NK', 'Show status': false }));
  const ut = AL('VERTICAL', { name: 'Name', gap: 2 }); add(u, [ut, 'FILL']); ut.appendChild(await T('Nova K.', 'Body/S Strong', 'text/primary')); ut.appendChild(await T('@nova.k · GP-48213', 'Caption', 'text/tertiary'));
  u.appendChild(await DEMO('XS'));
  for (const [g, items] of NAV) {
    const grp = AL('VERTICAL', { name: 'Group — ' + g, gap: 2 }); add(c, [grp, 'FILL']);
    const gl = AL('HORIZONTAL', { name: 'Group label', p: [0, 8, 4, 8] }); add(grp, [gl, 'FILL']); gl.appendChild(await T(g, 'Overline', 'text/tertiary'));
    for (const [label, icon] of items) add(grp, [await navItem(label, icon, label === active), 'FILL']);
  }
  const lo = AL('HORIZONTAL', { name: 'Footer', p: [12, 0, 0, 0] }); add(c, [lo, 'FILL']); strokeSides(lo, 'border/subtle', { t: 1 }); lo.appendChild(await BTN('Ghost', 'Log out', { size: 'S', lead: 'logout' }));
  return c;
}
// Desktop page: DEMOBAR → [Shell/Sidebar | Topbar → Content(breadcrumb, title, [sub-nav | main])]
async function shellA(name, active, o = {}) {
  const f = await screen(name, 1440, {}); add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Member' }); body.appendChild(sb); sb.layoutSizingVertical = 'FILL';
  await tryy('sbNone', () => sbNone(sb));
  const col = AL('VERTICAL', { name: 'Main column' }); add(body, [col, 'FILL']);
  const tb = await I('23:9832', { State: 'Member' }); add(col, [tb, 'FILL']);
  if (o.banner) add(col, [o.banner, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 24, p: [32, 32, 48, 32] }); add(col, [C, 'FILL']);
  const crumb = AL('HORIZONTAL', { name: 'Breadcrumb', gap: 8, align: 'CENTER' }); C.appendChild(crumb);
  const parts = ['Account', groupOf(active), active];
  for (let i = 0; i < parts.length; i++) { if (i) crumb.appendChild(await IC('chevron-right', 14, 'icon/muted')); crumb.appendChild(await T(parts[i], 'Body/S', i === parts.length - 1 ? 'text/primary' : 'text/tertiary')); }
  const hr = AL('HORIZONTAL', { name: 'Title row', gap: 24, align: 'MAX' }); add(C, [hr, 'FILL']);
  const hl = AL('VERTICAL', { name: 'Title', gap: 8 }); add(hr, [hl, 'FILL']);
  hl.appendChild(await T(o.title || active, 'Heading/H2', 'text/primary'));
  if (o.sub) hl.appendChild(await T(o.sub, 'Body/M', 'text/secondary', { w: 720 }));
  const hra = AL('HORIZONTAL', { name: 'Title actions', gap: 12, align: 'CENTER' }); hr.appendChild(hra);
  hra.appendChild(await DEMO('M')); for (const a of (o.actions || [])) if (a) hra.appendChild(a);
  const cols = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(C, [cols, 'FILL']);
  cols.appendChild(await subnav(active));
  const main = AL('VERTICAL', { name: 'Main', gap: 24 }); add(cols, [main, 'FILL']);
  return { f, sb, tb, col, C, main };
}
async function footA(S) { const lic = await I('6:158', { Variant: 'Inline' }); add(S.C, [lic, 'FILL']); return lic; }
// modal over the page: scrim + centred modal near the top of the viewport
async function overlay(S, m, y = 168) { scrimOver(S.f); floatIn(S.f, m, Math.round((1440 - m.width) / 2), y); return m; }
// ===== END ACCOUNT KIT — DESKTOP SHELL =====
