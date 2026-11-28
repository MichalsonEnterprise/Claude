const p10 = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(p10);
const AF = (async () => {}).constructor; const __L = await new AF('figma', (await figma.getNodeByIdAsync('78:57471')).characters)(figma);
if (__L.sec.parent === p10 && __L.sec.children.length === 0) __L.sec.remove();
const { paint, fill, stroke, strokeSides, radius, AL, add, T, fx, rect, I, IC, DEMO, DEMOBAR, BTN, BADGE, screen, fitSection, nextX, section, ICONS } = __L;
const sec = section('ADM — Mobile', 217000, 0);
async function lf(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
const sp = () => AL('HORIZONTAL', { name: 'Spacer', h: 1 });
const row = (o = {}) => AL('HORIZONTAL', Object.assign({ align: 'CENTER', gap: 12 }, o));
const col = (o = {}) => AL('VERTICAL', Object.assign({ gap: 8 }, o));
const panel = (name, o = {}) => AL('VERTICAL', Object.assign({ name, gap: 12, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }, o));
async function W(text, style, color, parent, w = 300) { const t = await T(text, style, color, { w }); add(parent, [t, 'FILL']); return t; }
async function SB(status, label, size = 'S') { const b = await BADGE(status, size); if (label) { const t = b.findAll(n => n.type === 'TEXT')[0]; if (t) { await lf(t); t.characters = label; } } return b; }
async function ph(title, icon, ic = 'icon/muted', demo = true) { const r = row({ name: 'Card header', gap: 8 }); add(r, await IC(icon, 18, ic), await T(title, 'Heading/H5')); add(r, [sp(), 'FILL']); if (demo) add(r, await DEMO('S')); return r; }
function meter(pct, color, w = 320) { const tr = figma.createFrame(); tr.name = 'Meter'; tr.resize(w, 8); fill(tr, 'surface/raised'); radius(tr, 9999); tr.clipsContent = true; const f = rect(Math.round(w * pct), 8, color, 9999, 'Meter fill'); tr.appendChild(f); f.constraints = { horizontal: 'SCALE', vertical: 'STRETCH' }; return tr; }
const NAME = '[ADM-P3] Active Round / 390 / Open — monitoring';
{ const old = sec.children.find(n => n.name === NAME); if (old) old.remove(); }
const X = nextX(sec), Y = 160;
const f = await screen(NAME, 390, { x: X, y: Y }); sec.appendChild(f); f.x = X; f.y = Y;
add(f, [await DEMOBAR(), 'FILL']);
const tb = row({ name: 'Admin Topbar — Mobile (inline)', gap: 4, p: [6, 8], h: 56 }); fill(tb, 'bg/secondary'); strokeSides(tb, 'border/subtle', { b: 1 });
add(tb, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.menu }), await I('4:792'), await T('Admin', 'Label/L', 'text/primary'));
const env = row({ gap: 4, p: [2, 8], fill: 'status/danger-tint', r: 9999 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(tb, env); add(tb, [sp(), 'FILL']);
const nt = await I('16:3356', { Unread: 'Yes', State: 'Default' }); nt.rescale(1.1); add(tb, nt, await I('9:238', { Size: 'S' }, { Initials: 'SI', 'Show status': false }));
add(f, [tb, 'FILL']);
const c = AL('VERTICAL', { name: 'Content', p: [16, 16, 24, 16], gap: 16 }); add(f, [c, 'FILL']);
const hd = col({ gap: 6, name: 'Page header' });
add(hd, await T('Admin › Global Pool › Active round', 'Caption', 'text/tertiary'));
const tr = row({ gap: 8 }); add(tr, await T('Round #1,248', 'Heading/H3'), await SB('Live', 'Open'), await DEMO('M')); add(hd, tr);
await W('Read-only live monitoring. Close time, entries and the draw are set by the contract.', 'Body/S', 'text/secondary', hd);
add(c, [hd, 'FILL']);
const nv = row({ name: 'Sub-nav — scroll', gap: 0 }); const vp = AL('HORIZONTAL', { name: 'Viewport', gap: 8, clip: true });
for (const [l, a] of [['Overview', false], ['Active round', true], ['VRF', false], ['Settlement', false], ['Refunds', false]]) add(vp, await I('20:6895', { State: a ? 'Active' : 'Default' }, { Label: l, 'Show icon': false }));
add(nv, [vp, 'FILL'], await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS['chevron-right'] })); add(c, [nv, 'FILL']);
// countdown + pool
const cd = panel('Countdown & pool', { gap: 14 });
add(cd, await T('Entries close in', 'Overline', 'text/tertiary'));
const bx = row({ name: 'Countdown', gap: 8 });
for (const [v, l] of [['03', 'hours'], ['17', 'min'], ['42', 'sec']]) { const b = AL('VERTICAL', { name: 'Box ' + l, gap: 2, p: [10, 0], fill: 'surface/raised', stroke: 'border/subtle', r: 10, align: 'CENTER' }); add(b, await T(v, 'Number/L', 'text/primary'), await T(l, 'Caption', 'text/tertiary')); add(bx, [b, 'FILL']); }
add(cd, [bx, 'FILL']);
await W('Closes 27 Nov 2026, 20:00:00 UTC — automatic; VRF is requested at close.', 'Caption', 'text/tertiary', cd);
const dv = rect(10, 1, 'border/subtle', 0, 'Divider'); add(cd, [dv, 'FILL']);
add(cd, await T('Pool balance', 'Overline', 'text/tertiary'));
const pr = row({ gap: 8, align: 'BASELINE' }); add(pr, await T('186,400.00', 'Number/L', 'text/gold'), await T('USDT', 'Label/M', 'text/secondary'), await DEMO('S')); add(cd, pr);
await W('18,640 entries × 10.00 USDT. Platform fees (932.00) go to Treasury and are not part of the pool.', 'Caption', 'text/tertiary', cd);
add(c, [cd, 'FILL']);
// stats grid
const gr = row({ name: 'Stats grid', gap: 12, wrap: true, cgap: 12 });
for (const [l, v, s] of [['Participants', '3,412', '+128 last hour'], ['Entries', '18,640', 'median 3 / account'], ['Platform fees', '932.00', 'USDT · excluded'], ['Declined today', '37', 'RG 29 · region 8']]) { const b = AL('VERTICAL', { name: 'Stat — ' + l, gap: 2, p: 14, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: 173 }); add(b, await T(l, 'Overline', 'text/tertiary'), await T(v, 'Number/M', 'text/primary'), await T(s, 'Caption', 'text/tertiary')); add(gr, b); }
add(c, [gr, 'FILL']);
// threshold
const th = panel('Threshold');
add(th, await ph('Threshold — met', 'target', 'status/success'));
for (const [l, v, p] of [['Participants', '3,412 / 500 min', 1], ['Pool', '186,400.00 / 50,000.00 min', 1]]) { const r = row({ gap: 8 }); add(r, await T(l, 'Label/M', 'text/primary')); add(r, [sp(), 'FILL']); add(r, await T(v, 'Number/S', 'text/secondary'), await IC('check-circle', 16, 'status/success')); add(th, [r, 'FILL'], [meter(p, 'status/success'), 'FILL']); }
add(c, [th, 'FILL']);
// integrity
const ig = panel('Integrity checks', { gap: 0 });
add(ig, await ph('Integrity checks', 'shield-check'));
for (const [ok, l, v] of [[1, 'Ledger = on-chain events', '18,640 / 18,640'], [1, 'Pool = entries × 10.00', '186,400.00'], [1, 'Fees to Treasury', '932.00'], [1, 'Restricted-region entries', '0'], [0, 'Relayer batch awaiting finality', '14 / 20']]) { const r = row({ gap: 10, p: [12, 0], h: 48 }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await IC(ok ? 'check-circle' : 'clock', 18, ok ? 'status/success' : 'status/info')); await W(l, 'Body/S', 'text/primary', r, 160); add(r, await T(v, 'Label/M', 'text/secondary')); add(ig, [r, 'FILL']); }
add(c, [ig, 'FILL']);
// entry stream as cards
const es = panel('Live entry stream');
const eh = row({ gap: 8 }); add(eh, await IC('activity', 18, 'icon/muted'), await T('Live entries', 'Heading/H5')); add(eh, [sp(), 'FILL']); add(eh, await SB('Live', 'Streaming')); add(es, [eh, 'FILL']);
for (const [t, h, n, a, tx] of [['16:42:11', '@juno88', '5', '50.00', '0x6c1e…a93f'], ['16:42:04', '@tidewalker', '2', '20.00', '0x2b7d…04c1'], ['16:41:57', '@pixelfox', '10', '100.00', '0xe40a…7b28']]) { const b = AL('VERTICAL', { name: 'Entry ' + tx, gap: 6, p: 12, fill: 'surface/raised', r: 10 }); const r1 = row({ gap: 8 }); add(r1, await I('9:238', { Size: 'XS' }, { Initials: h.slice(1, 3).toUpperCase(), 'Show status': false }), await T(h, 'Label/M', 'text/primary')); add(r1, [sp(), 'FILL']); add(r1, await T(t + ' UTC', 'Mono/S', 'text/tertiary')); add(b, [r1, 'FILL']); const r2 = row({ gap: 8 }); add(r2, await T(n + ' entries · ' + a + ' USDT + ' + (Number(n) * 0.05).toFixed(2) + ' fee', 'Body/S', 'text/secondary')); add(r2, [sp(), 'FILL']); add(r2, await T(tx, 'Mono/S', 'text/tertiary'), await DEMO('XS')); add(b, [r2, 'FILL']); add(es, [b, 'FILL']); }
add(es, [await BTN('Ghost', 'View all 18,640 entries', { size: 'L', trail: 'arrow-right' }), 'FILL']);
add(c, [es, 'FILL']);
// controls
const ct = panel('Permitted controls');
add(ct, await ph('Permitted controls', 'sliders', 'icon/muted', false));
await W('Pausing affects NEW entries only and needs a reason, 2FA and a second approver from another role.', 'Body/S', 'text/secondary', ct);
add(ct, [await BTN('Danger', 'Request pause of new entries', { size: 'L', lead: 'pause-circle' }), 'FILL'], [await BTN('Secondary', 'Export entries CSV', { size: 'L', lead: 'download' }), 'FILL']);
const na = AL('VERTICAL', { name: 'Not available', gap: 6, p: 12, fill: 'surface/raised', r: 10 }); add(na, await T('Not available by design', 'Overline', 'text/tertiary'));
for (const s of ['Change close time or entries', 'Trigger, re-roll or override the draw', 'Choose winners or payouts']) { const r = row({ gap: 8 }); add(r, await IC('ban', 14, 'status/danger')); await W(s, 'Body/S', 'text/primary', r, 260); add(na, [r, 'FILL']); }
add(ct, [na, 'FILL']); add(c, [ct, 'FILL']);
// sticky bottom bar
const sb = AL('VERTICAL', { name: 'Sticky bottom bar', gap: 8, p: [12, 16, 8, 16] }); fill(sb, 'bg/secondary'); strokeSides(sb, 'border/subtle', { t: 1 }); await fx(sb, 'Elevation/3 — Popover');
const s1 = row({ gap: 10 }); const lv = col({ gap: 0 }); add(lv, await T('Closes in 03:17:42', 'Label/L', 'text/primary'), await T('Live · updated 16:42:18 UTC', 'Caption', 'text/success')); add(s1, [lv, 'FILL'], await BTN('Secondary', 'Actions', { size: 'L', trail: 'chevron-up' })); add(sb, [s1, 'FILL']);
add(f, [sb, 'FILL']);
function setP(i, k, v) { const d = i.componentProperties; const key = Object.keys(d).find(x => x.split('#')[0] === k); if (key) i.setProperties({ [key]: v }); }
{ const tbar = AL('VERTICAL', { name: 'Admin Tab Bar — Mobile', fill: 'bg/secondary' }); strokeSides(tbar, 'border/subtle', { t: 1 }); const trow = AL('HORIZONTAL', { name: 'Tabs', p: [4, 4, 0, 4] });
for (const [ic, lab, cnt] of [['dashboard', 'Overview'], ['pool', 'Pool'], ['user-check', 'Approvals', '4'], ['shield-alert', 'Alerts'], ['menu', 'More']]) { const on = lab === 'Pool'; const t = AL('VERTICAL', { name: 'Tab ' + lab, gap: 4, p: [8, 0, 6, 0], align: 'CENTER' }); const ir = AL('HORIZONTAL', { name: 'Icon', gap: 2, align: 'CENTER' }); add(ir, await IC(ic, 24, on ? 'icon/brand' : 'icon/muted')); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', cnt); add(ir, b); } add(t, ir); add(t, await T(lab, 'Label/S', on ? 'text/brand' : 'text/tertiary')); add(trow, [t, 'FILL']); }
add(tbar, [trow, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(tbar, [hi, 'FILL']); add(f, [tbar, 'FILL']); }
fitSection(sec);
await f.screenshot({ scale: 0.6 });
return { id: f.id, sec: sec.id, x: X, h: Math.round(f.height), inventory: sec.children.map(n => ({ id: n.id, name: n.name, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) })) };
