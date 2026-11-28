// ===== tablet helpers (shared by #05 and #06) =====
function setP(inst, base, val) { if (!inst || inst.type !== 'INSTANCE') return false; const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === base); if (!k) return false; inst.setProperties({ [k]: val }); return true; }
let bandT = sec.children.find(n => n.name === 'Band — Tablet 768');
if (!bandT) { bandT = AL('VERTICAL', { name: 'Band — Tablet 768', gap: 8 }); add(bandT, await T('Tablet 768 · ADM-00 / ADM-01 / ADM-02 / ADM-X1', 'Heading/H2'), await T('The sidebar becomes a drawer behind the menu button; the top bar keeps search, four-eyes approvals and alerts. Content is one 704 px column with 2-up KPI tiles. Dialogs stay centred at 520 px.', 'Body/L', 'text/secondary', { w: 1400 })); sec.appendChild(bandT); bandT.x = 120; bandT.y = nextY(sec); }
const YT = bandT.y + 120; const XT = i => 120 + i * 888;
async function tshell(name, i, ini, ctx) {
  const f = await screen(name, 768, {}); sec.appendChild(f); f.x = XT(i); f.y = YT; add(f, [await DEMOBAR(), 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Admin Topbar — Tablet (inline)', gap: 8, p: [10, 24, 10, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  add(bar, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.menu }));
  const lm = await I('4:792'); lm.rescale(28 / lm.width); add(bar, lm);
  const pr = col({ name: 'Product', gap: 0 }); add(pr, await T('Admin console', 'Label/L'), await T(ctx, 'Caption', 'text/tertiary')); add(bar, pr);
  const env = AL('HORIZONTAL', { name: 'PROD', p: [2, 8, 2, 8], stroke: 'border/danger', r: 6 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(bar, env);
  add(bar, [sp(), 'FILL']);
  for (const [ic, cnt] of [['search'], ['user-check', '4'], ['bell', '5']]) { const g = row({ name: 'Btn ' + ic, gap: 0 }); add(g, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS[ic] })); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', cnt); add(g, b); } add(bar, g); }
  add(bar, await I('9:238', { Size: 'S' }, { Initials: ini }));
  add(f, [bar, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 20, p: [24, 32, 48, 32] }); add(f, [c, 'FILL']);
  return { f, c, bar }; }
// ===== END tablet helpers =====
