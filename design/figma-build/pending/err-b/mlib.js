// ===== ERR-B MOBILE LIB (pending/err-b/mlib.js) — paste after helpers.js + lib.js =====
const PAGE10 = '10 — Mobile Experience', MSEC = 'ERR — Mobile'; let MS;
async function mInit() { const page = figma.root.children.find(p => p.name === PAGE10); await figma.setCurrentPageAsync(page); MS = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === MSEC); if (!MS) { let mx = 0; for (const n of figma.currentPage.children) if (n.type === 'SECTION') mx = Math.max(mx, n.x + n.width); MS = section(MSEC, Math.max(252000, Math.ceil((mx + 400) / 1000) * 1000), 0); } return MS; }
// ERR — Mobile is shared with the err-a slice (ERR-01..03 in row 1): ERR-04..07 frames go in their own row below it
const MINE = n => /^\[ERR-0[4-7]\]/.test(n.name);
function myRowY() { let m = 0; for (const c of MS.children) if (!MINE(c)) m = Math.max(m, c.y + c.height); return Math.max(1124, m + 160); }
function placeMine() { const y = myRowY(); for (const c of MS.children) if (MINE(c) && c.y !== y) c.y = y; return y; }
async function mscreen(name, col, h) { const old = MS.children.find(n => n.name === name); const pos = old ? { x: old.x, y: myRowY() } : { x: 120 + col * 510, y: myRowY() }; if (old) old.remove(); const f = await screen(name, 390, h ? { h } : {}); MS.appendChild(f); f.x = pos.x; f.y = pos.y; add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']); return f; }
async function topbar() { return await I('23:12908', { State: 'Member' }); }
async function tabbar(active) { return await I('22:5413', { Active: active }); }
async function mBanner(icon, bg, fg, title, body, btn) { const b = AL('VERTICAL', { name: 'Banner — ' + title, gap: 8, p: [12, 16], fill: bg, w: 390 }); strokeSides(b, 'border/subtle', { b: 1 }); const h = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(h, await IC(icon, 18, fg), await T(title, 'Label/M', 'text/primary', { w: 332 })); add(b, h, await T(body, 'Body/S', 'text/secondary', { w: 358 })); if (btn) add(b, btn); return b; }
function content() { return AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16], w: 390 }); }
async function card(name, gapPx = 12) { return AL('VERTICAL', { name, gap: gapPx, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: 358 }); }
async function cdown(h, m, s) { const r = AL('HORIZONTAL', { name: 'Countdown', gap: 6, align: 'CENTER' }); const parts = [[h, 'h'], [m, 'm'], [s, 's']]; for (let i = 0; i < 3; i++) { const b = AL('VERTICAL', { gap: 0, p: [6, 12], fill: 'surface/raised', stroke: 'border/default', r: 10, align: 'CENTER' }); add(b, await T(parts[i][0], 'Number/M', 'text/primary'), await T(parts[i][1], 'Caption', 'text/tertiary')); add(r, b); if (i < 2) add(r, await T(':', 'Number/M', 'text/tertiary')); } return r; }
async function roundCard(o = {}) {
  const c = await card('Round #1,248');
  const hd = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(hd, await T('Round #1,248', 'Heading/H5', 'text/primary'), await stat(o.si || 'clock', o.status || 'Open', o.sc || 'text/success')); add(c, hd);
  add(c, await T(o.asof ? 'POOL BALANCE · AS OF 18:42 UTC' : 'POOL BALANCE', 'Overline', 'text/tertiary'));
  const v = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(v, await T('186,400.00', 'Number/L', 'text/gold'), await T('USDT', 'Label/M', 'text/secondary'), await DEMO('S')); add(c, v);
  if (o.countdown !== false) { add(c, await cdown('03', '17', '42')); add(c, [await T(o.closeNote || 'Closes 27 Nov 2026, 20:00 UTC', 'Caption', 'text/tertiary', { w: 326 }), 'FILL']); }
  add(c, [await T('3,412 participants · 18,640 qualifying entries', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  return c;
}
async function sticky(btns, cap) { const s = AL('VERTICAL', { name: 'Sticky CTA', gap: 8, p: [12, 16], fill: 'bg/secondary', w: 390 }); strokeSides(s, 'border/subtle', { t: 1 }); for (const b of btns) add(s, [b, 'FILL']); if (cap) add(s, await T(cap, 'Caption', 'text/tertiary', { w: 358, align: 'CENTER' })); return s; }
async function list(items, w = 326) { const c = AL('VERTICAL', { name: 'List', gap: 10, w }); for (const [ic, lb, col] of items) { const r = AL('HORIZONTAL', { gap: 8, align: 'MIN', w }); const t = await T(lb, 'Body/S', 'text/primary', { w: w - 26 }); add(r, await IC(ic, 18, col || 'text/success'), t); add(c, [r, 'FILL']); } return c; }
// ===== END ERR-B MOBILE LIB =====
