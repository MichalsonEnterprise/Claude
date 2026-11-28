// ===== ADM-BC tablet + mobile shells =====
async function TSHELL(name, key, activeLabel) {
  GUARD(name); const pos = POS('C-768', key);
  const f = await screen(name, 768, {}); sec.appendChild(f); f.x = pos.x; f.y = pos.y;
  add(f, [await DEMOBAR(), 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Admin Topbar — Tablet (inline)', gap: 8, p: [10, 24, 10, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  add(bar, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.menu }));
  const lm = await I('4:792'); lm.rescale(28 / lm.width); add(bar, lm);
  const pr = AL('VERTICAL', { name: 'Product', gap: 0 }); add(pr, await T('Admin console', 'Label/L', 'text/primary'), await T('Compliance', 'Caption', 'text/tertiary')); add(bar, pr);
  const env = AL('HORIZONTAL', { name: 'PROD', p: [2, 8, 2, 8], stroke: 'border/danger', r: 6 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(bar, env);
  add(bar, [SPC(), 'FILL']);
  for (const [ic, cnt] of [['search'], ['user-check', '4'], ['bell', '5']]) { const g = AL('HORIZONTAL', { name: 'Btn ' + ic, gap: 0, align: 'CENTER' }); add(g, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS[ic] })); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', cnt); add(g, b); } add(bar, g); }
  add(bar, await I('9:238', { Size: 'S' }, { Initials: 'KO' }));
  add(f, [bar, 'FILL']);
  const sn = AL('HORIZONTAL', { name: 'Compliance sub-nav (scrolls)', gap: 0, p: [0, 16, 0, 16], fill: 'bg/secondary', clip: true }); strokeSides(sn, 'border/subtle', { b: 1 });
  for (const [l, cnt] of MODS.C.items) { const t = await I('20:6831', { State: l === activeLabel ? 'Active' : 'Default' }, { Label: l, 'Show count': !!cnt }); if (cnt) { const cc = findI(t, 'Count') || byMain(t, 'Badge/Count'); if (cc) setP(cc, 'Count', cnt); } add(sn, t); }
  add(f, [sn, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 20, p: [24, 32, 48, 32] }); add(f, [c, 'FILL']);
  return { f, c };
}
function MPOS() { const mine = sec.children.filter(n => /^\[ADM-C[12]\]/.test(n.name)); if (mine.length) return { x: Math.max(...mine.map(n => n.x + n.width)) + 120, y: 160 }; return { x: nextX(sec), y: 160 }; }
async function MSHELL(name, back) {
  GUARD(name); const p = MPOS(); const f = await screen(name, 390, {}); sec.appendChild(f); f.x = p.x; f.y = p.y;
  add(f, [await DEMOBAR(), 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Admin Topbar — Mobile', gap: 8, p: [8, 12, 8, 12], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  if (back) { add(bar, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] })); add(bar, await T(back, 'Label/L', 'text/primary')); }
  else { const lm = await I('4:792'); lm.rescale(28 / lm.width); add(bar, lm); add(bar, await T('Admin', 'Label/L', 'text/primary')); const env = AL('HORIZONTAL', { name: 'PROD', p: [2, 8, 2, 8], stroke: 'border/danger', r: 6 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(bar, env); }
  add(bar, [SPC(), 'FILL']);
  const ap = AL('HORIZONTAL', { name: 'Approvals', gap: 2, align: 'CENTER' }); add(ap, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['user-check'] })); const bc = await I('6:216', { Size: 'S' }); setP(bc, 'Count', '4'); add(ap, bc); add(bar, ap);
  add(bar, await I('9:238', { Size: 'S' }, { Initials: 'KO' }));
  add(f, [bar, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [c, 'FILL']);
  return { f, c };
}
async function MTABS(f, active) { const tb = AL('VERTICAL', { name: 'Admin Tab Bar — Mobile', fill: 'bg/secondary' }); strokeSides(tb, 'border/subtle', { t: 1 }); const row = AL('HORIZONTAL', { name: 'Tabs', p: [4, 4, 0, 4] }); for (const [ic, lab, cnt] of [['dashboard', 'Overview'], ['user-check', 'Approvals', '4'], ['id-card', 'KYC', '214'], ['shield-alert', 'Alerts', '23'], ['menu', 'More']]) { const on = lab === active; const t = AL('VERTICAL', { name: 'Tab ' + lab, gap: 4, p: [8, 0, 6, 0], align: 'CENTER' }); const ir = AL('HORIZONTAL', { name: 'Icon', gap: 2, align: 'CENTER' }); add(ir, await IC(ic, 24, on ? 'icon/brand' : 'icon/muted')); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', cnt); add(ir, b); } add(t, ir); add(t, await T(lab, 'Label/S', on ? 'text/brand' : 'text/tertiary')); add(row, [t, 'FILL']); } add(tb, [row, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(tb, [hi, 'FILL']); add(f, [tb, 'FILL']); return tb; }
async function STICKY(f, kids, cap) { const s = AL('VERTICAL', { name: 'Sticky action bar', gap: 8, p: [12, 16, 0, 16], fill: 'surface/overlay' }); strokeSides(s, 'border/subtle', { t: 1 }); const r = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); for (const k of kids) add(r, k); add(s, [r, 'FILL']); if (cap) await WT(s, cap, 'Caption', 'text/tertiary', 358); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(s, [hi, 'FILL']); add(f, [s, 'FILL']); return s; }
// ===== END ADM-BC tablet + mobile shells =====
