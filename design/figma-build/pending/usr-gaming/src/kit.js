// ===== USR-GAMING MOBILE KIT (usr-gaming continuation, 28 Nov 2026) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('USR — Mobile B', 98000, 0);
function tk(n, fb = 'surface/raised') { return VAR[n] ? n : fb; }
const GT = ['My games', 'My entries', 'Active rounds', 'Results', 'Winnings', 'Game history', 'Favourites'];
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Fortune Ring': '24:13399', 'Pool Dice': '24:13443', 'Double Side': '24:13473', 'Pool Roulette': '25:14777', 'Twenty-One': '25:14841', 'Neon Koi': '25:14992' };
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 12, p: o.p ?? 16, fill: tk(o.fill || 'surface/default'), stroke: tk(o.stroke || 'border/subtle', 'border/default'), r: o.r ?? 14, clip: !!o.clip }); }
function meter(w, pct, color = 'brand/primary', h = 6) { const tr = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, w, h, clip: true }); tr.appendChild(rect(Math.max(6, Math.round(w * pct)), h, color, 9999, 'Meter fill')); return tr; }
function spacer() { return AL('HORIZONTAL', { name: 'Spacer', h: 1 }); }
async function iconTile(icon, color = 'icon/brand', s = 40, fillTok = 'surface/raised') { const t = AL('HORIZONTAL', { name: 'Icon tile', w: s, h: s, fill: fillTok, r: 10, align: 'CENTER', justify: 'CENTER' }); t.appendChild(await IC(icon, Math.round(s / 2), color)); return t; }
async function noteBox(icon, text, tone, w = 358) { const b = AL('HORIZONTAL', { name: 'Note — ' + tone, gap: 8, p: 12, fill: tk('status/' + tone + '-tint'), r: 10 }); b.appendChild(await IC(icon, 16, tk('status/' + tone, 'icon/default'))); const t = await T(text, 'Body/S', 'text/primary', { w: w - 48 }); add(b, [t, 'FILL']); return b; }
async function overline(s) { return await T(s, 'Overline', 'text/tertiary'); }
async function secHead(title, o = {}) {
  const r = AL('HORIZONTAL', { name: 'Section header — ' + title, gap: 8, align: 'CENTER' });
  const l = AL('VERTICAL', { name: 'Title', gap: 2 }); add(r, [l, 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); l.appendChild(tr);
  tr.appendChild(await T(title, 'Heading/H5', 'text/primary')); if (o.demo) tr.appendChild(await DEMO('S'));
  if (o.sub) add(l, [await T(o.sub, 'Caption', 'text/tertiary', { w: 240 }), 'FILL']);
  if (o.link) { const lk = AL('HORIZONTAL', { name: 'Link — ' + o.link + ' (44px target)', gap: 4, align: 'CENTER', p: [12, 0, 12, 8] }); lk.appendChild(await T(o.link, 'Label/M', 'text/brand')); lk.appendChild(await IC('arrow-right', 16, 'icon/brand')); r.appendChild(lk); }
  return r;
}
async function thumbArt(g, s = 0.3) { const c = await figma.getNodeByIdAsync(ART[g]); const i = c.createInstance(); try { i.rescale(s); } catch (e) { i.resize(Math.round(160 * s), Math.round(213 * s)); } i.name = 'Thumb — ' + g; return i; }
async function tileG(g, players, he, o = {}) { const t = await I('28:16529', { State: 'Default' }, { Art: ART[g], Players: players, 'Show tag': !!o.tag, Tag: o.tag || 'HOT', 'House edge': he }); t.name = 'Tile — ' + g; if (o.scale) { try { t.rescale(o.scale); } catch (e) {} } return t; }
async function heartBtn(on) { const b = await I('7:774', { Type: on ? 'Ghost' : 'Secondary', Size: 'L', State: 'Default' }, { Icon: ICONS.heart }); tint(b, on ? 'icon/brand' : 'icon/default'); b.name = on ? 'Remove from favourites (♥ on)' : 'Add to favourites (♥ off)'; return b; }
async function cdBoxes(parts) { const r = AL('HORIZONTAL', { name: 'Countdown (real close 20:00:00 UTC)', gap: 4, align: 'CENTER' }); for (let i = 0; i < parts.length; i++) { if (i) r.appendChild(await T(':', 'Number/M', 'text/tertiary')); const b = AL('VERTICAL', { name: 'Box ' + parts[i][1], p: [6, 8, 6, 8], fill: 'surface/raised', r: 10, align: 'CENTER' }); b.appendChild(await T(parts[i][0], 'Number/M', 'text/gold')); b.appendChild(await T(parts[i][1], 'Caption', 'text/tertiary')); r.appendChild(b); } return r; }
async function shellG(name, active, title, sub, o = {}) {
  for (const c of sec.children.filter(c => c.name === name)) c.remove();
  const f = await screen(name, 390, o.h ? { h: o.h } : {});
  add(f, [await DEMOBAR('DEMO DATA — every figure here is illustrative.'), 'FILL']);
  add(f, [await I('23:12908', { State: 'Member' }), 'FILL']);
  const H = AL('VERTICAL', { name: 'Page header', gap: 8, p: [12, 16, 12, 16] }); add(f, [H, 'FILL']);
  const back = AL('HORIZONTAL', { name: 'Back (44px target)', gap: 4, align: 'CENTER' }); back.appendChild(await IC('chevron-left', 20, 'icon/muted')); back.appendChild(await T('Dashboard · Gaming', 'Label/M', 'text/secondary')); H.appendChild(back);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(H, [tr, 'FILL']); add(tr, [await T(title, 'Heading/H3', 'text/primary'), 'FILL']); if (o.titleRight) tr.appendChild(o.titleRight);
  add(H, [await T(sub, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  const nav = figma.createFrame(); nav.name = 'Gaming sub-nav (horizontal scroll)'; nav.fills = []; nav.clipsContent = true; nav.resize(390, 44);
  const row = AL('HORIZONTAL', { name: 'Tabs', gap: 8, p: [4, 16, 4, 16] }); nav.appendChild(row); let act = null;
  for (const t of GT) { const p = await I('20:6895', { State: t === active ? 'Active' : 'Default' }, { Label: t === active && o.count ? t + ' · ' + o.count : t, 'Show icon': false }); p.name = 'Gaming tab/' + t; row.appendChild(p); if (t === active) act = p; }
  const off = Math.max(0, Math.min((act ? act.x : 0) - 60, row.width - 390)); row.x = -off; row.y = 0;
  add(f, [nav, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 24, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
  return { f, C };
}
async function complianceG(f) { const cp = AL('HORIZONTAL', { name: 'Compliance', gap: 12, p: 16, align: 'CENTER' }); strokeSides(cp, 'border/subtle', { t: 1 }); add(f, [cp, 'FILL']); cp.appendChild(await I('6:159')); add(cp, [await T('Licensed play in permitted regions only · 18+ · Outcomes are random and verifiable — you can lose your stake.', 'Caption', 'text/tertiary', { w: 300 }), 'FILL']); return cp; }
async function endG(S, tab = 'Games') { await complianceG(S.f); const tb = await I('22:5413', { Active: tab }); add(S.f, [tb, 'FILL']); return tb; }
async function tabAbs(f, tab = 'Games') { const tb = await I('22:5413', { Active: tab }); f.appendChild(tb); tb.layoutPositioning = 'ABSOLUTE'; tb.x = 0; tb.y = f.height - tb.height; return tb; }
function scrimOver(f) { const s = rect(f.width, f.height, 'scrim/overlay', 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; s.resize(f.width, f.height); return s; }
async function sheetG(f, title, sub, build, footer) {
  scrimOver(f);
  const sh = AL('VERTICAL', { name: 'Bottom sheet — ' + title, gap: 20, p: [8, 16, 0, 16], fill: 'surface/overlay', w: 390 }); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']);
  const gr = AL('HORIZONTAL', { name: 'Grabber row', justify: 'CENTER', p: [0, 0, 0, 0] }); add(sh, [gr, 'FILL']); gr.appendChild(rect(40, 4, 'border/strong', 9999, 'Grabber'));
  const hd = AL('HORIZONTAL', { name: 'Header', gap: 12 }); add(sh, [hd, 'FILL']);
  const ht = AL('VERTICAL', { name: 'Title', gap: 4 }); add(hd, [ht, 'FILL']); add(ht, [await T(title, 'Heading/H4', 'text/primary', { w: 300 }), 'FILL']); if (sub) add(ht, [await T(sub, 'Body/S', 'text/secondary', { w: 300 }), 'FILL']);
  const x = await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.x }); x.name = 'Close sheet'; hd.appendChild(x);
  await build(sh);
  const ft = AL('HORIZONTAL', { name: 'Sticky footer', gap: 12, p: [12, 0, 12, 0] }); strokeSides(ft, 'border/subtle', { t: 1 }); add(sh, [ft, 'FILL']);
  for (const [b, m] of footer) add(ft, m ? [b, m] : b);
  const hi = AL('HORIZONTAL', { name: 'Home indicator', justify: 'CENTER', align: 'CENTER', h: 34 }); add(sh, [hi, 'FILL']); hi.appendChild(rect(134, 5, 'text/primary', 9999, 'Home indicator bar'));
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = f.height - sh.height; return sh;
}
async function chipRow(items, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Chips', gap: 8, w: 358, wrap: !!o.wrap, cgap: 8, clip: !o.wrap }); for (const [label, sel] of items) { const c = await I('17:2766', { State: sel ? 'Selected' : 'Default' }, { Label: label, 'Show icon': false }); c.name = 'Chip — ' + label; r.appendChild(c); } return r; }
async function listRow(g, meta, right, o = {}) {
  const r = AL('HORIZONTAL', { name: 'Row — ' + g, gap: 12, align: 'CENTER', p: [10, 0, 10, 0] }); if (!o.last) strokeSides(r, 'border/subtle', { b: 1 });
  r.appendChild(await thumbArt(g, 0.3));
  const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(g, 'Body/M Strong', 'text/primary', { w: 180 }), 'FILL']); add(tx, [await T(meta, 'Caption', 'text/tertiary', { w: 180 }), 'FILL']);
  if (right) r.appendChild(right);
  return r;
}
async function placeG(f, x, y) { sec.appendChild(f); f.x = x; f.y = y; fitSection(sec); return f; }
// ===== END KIT =====
