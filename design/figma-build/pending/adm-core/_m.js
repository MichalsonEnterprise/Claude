// ===== ADM-CORE mobile helpers (page 10, section 'ADM — Mobile'); same inline admin top bar + tab bar as the adm-bc mobile frames =====
function setP(inst, base, val) { if (!inst || inst.type !== 'INSTANCE') return false; const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === base); if (!k) return false; inst.setProperties({ [k]: val }); return true; }
// my mobile frames sit in their own row under anything already in the section (adm-bc / adm-finance frames use y = 160)
function MROW() { const mine = sec.children.filter(n => /MOB-11/.test(n.name)); if (mine.length) return { x: Math.max(...mine.map(n => n.x + n.width)) + 120, y: Math.min(...mine.map(n => n.y)) }; return { x: 120, y: sec.children.length ? nextY(sec) + 80 : 160 }; }
async function MSHELL(name, ini, back) {
  if (EX(name)) { OUT.skipped.push(name); return null; }
  const p = MROW(); const f = await screen(name, 390, {}); sec.appendChild(f); f.x = p.x; f.y = p.y;
  add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Admin Topbar — Mobile', gap: 8, p: [8, 12, 8, 12], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  if (back) { add(bar, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }), await T(back, 'Label/L', 'text/primary')); }
  else { const lm = await I('4:792'); lm.rescale(28 / lm.width); add(bar, lm, await T('Admin', 'Label/L', 'text/primary')); const env = AL('HORIZONTAL', { name: 'PROD', p: [2, 8, 2, 8], stroke: 'border/danger', r: 6 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(bar, env); }
  add(bar, [sp(), 'FILL']);
  const bl = row({ name: 'Alerts bell', gap: 2 }); add(bl, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.bell })); const bc = await I('6:216', { Size: 'S' }); setP(bc, 'Count', '5'); add(bl, bc); add(bar, bl);
  add(bar, await I('9:238', { Size: 'S' }, { Initials: ini }));
  add(f, [bar, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [c, 'FILL']);
  return { f, c, bar };
}
async function MTABS(f, active) { const tb = AL('VERTICAL', { name: 'Admin Tab Bar — Mobile', fill: 'bg/secondary' }); strokeSides(tb, 'border/subtle', { t: 1 }); const r = AL('HORIZONTAL', { name: 'Tabs', p: [4, 4, 0, 4] }); for (const [ic, lab, cnt] of [['dashboard', 'Overview'], ['user-check', 'Approvals', '4'], ['id-card', 'KYC', '214'], ['shield-alert', 'Alerts', '23'], ['menu', 'More']]) { const on = lab === active; const t = AL('VERTICAL', { name: 'Tab ' + lab, gap: 4, p: [8, 0, 6, 0], align: 'CENTER' }); const ir = row({ name: 'Icon', gap: 2 }); add(ir, await IC(ic, 24, on ? 'icon/brand' : 'icon/muted')); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', cnt); add(ir, b); } add(t, ir, await T(lab, 'Label/S', on ? 'text/brand' : 'text/tertiary')); add(r, [t, 'FILL']); } add(tb, [r, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(tb, [hi, 'FILL']); add(f, [tb, 'FILL']); return tb; }
async function mtitle(c, title, sub) { const h = col({ name: 'Page title', gap: 4 }); const r = row({ gap: 8 }); add(r, await T(title, 'Heading/H3'), await DEMO('M')); add(h, r, await T(sub, 'Body/S', 'text/secondary', { w: 358 })); add(c, [h, 'FILL']); return h; }
async function mcard(name, o = {}) { return AL('VERTICAL', Object.assign({ name, gap: 10, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }, o)); }
async function wt(parent, s, style = 'Body/S', color = 'text/secondary', w = 326) { const t = await T(s, style, color, { w }); add(parent, [t, 'FILL']); return t; }
// ===== END mobile helpers =====
