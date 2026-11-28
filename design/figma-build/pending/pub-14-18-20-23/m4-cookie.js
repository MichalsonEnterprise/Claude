// ===== M4: [PUB-23] Cookie Consent — 390 Banner (first visit) + Preferences bottom sheet =====
const COOKIE_TITLE = 'Cookies on GLOBAL POOL';
const COOKIE_BODY = 'We use essential cookies to keep you signed in and secure and to check your region and age. With your OK we’d also use preference, analytics and marketing cookies. Nothing non-essential is set until you choose.';
const CATS = [
 ['Essential', 'Sign-in, security and fraud checks, region and age checks, and remembering this choice.', true, '6 cookies'],
 ['Preferences', 'Remember your language, display settings and game sound.', false, '3 cookies'],
 ['Analytics', 'Aggregated first-party usage statistics that help us fix and improve pages.', false, '4 cookies'],
 ['Marketing', 'Measure our campaigns and show our offers on other sites. Never used during a break or self-exclusion.', false, '5 cookies'],
];
async function lobbyBg(name, y) {
  const S = await mshell(name, COLX[3], { y, h: 844, p: [16, 16, 16, 16], gap: 20 }); const C = S.C;
  const dc = await I('24:13861', { State: 'Open' }); dc.name = 'Card/Draw Countdown — Open'; add(C, [dc, 'FILL']);
  const rh = AL('HORIZONTAL', { name: 'Row header — Originals', gap: 8, align: 'CENTER' }); add(rh, [await T('GLOBAL POOL Originals', 'Heading/H5', 'text/primary', { w: 220 }), 'FILL'], await T('All', 'Label/M', 'text/brand')); add(C, [rh, 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Tile track — scrolls', gap: 12, w: 358, clip: true }); add(C, [tr, 'FILL']);
  for (const [art, pl, tag] of [['24:13176', '1,062', 'HOT'], ['24:13239', '146', null], ['24:13297', '206', 'NEW']]) { const t = await I('28:16529', { State: 'Default' }, { Art: art, Players: pl, 'Show tag': !!tag, Tag: tag || '', 'House edge': 'House edge 1.00%' }); tr.appendChild(t); }
  const tab = await I('22:5413', { Active: 'Home' }); tab.name = 'Nav/Mobile Tab Bar'; S.f.appendChild(tab); tab.layoutPositioning = 'ABSOLUTE'; tab.resize(390, tab.height); tab.x = 0; tab.y = 844 - tab.height;
  return { ...S, tab };
}
// ---------- Frame 1: Banner — first visit ----------
const N1 = '[PUB-23] Cookie Consent / 390 / Banner — first visit';
const B = await lobbyBg(N1, 120);
const bn = AL('VERTICAL', { name: 'Cookie banner — non-blocking, pinned above tab bar', fill: 'surface/overlay', stroke: 'border/subtle', r: 20, p: 20, gap: 14, w: 358 }); await fx(bn, 'Elevation/4 — Modal');
const bh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(bh, await tile('cookie'), [await T(COOKIE_TITLE, 'Heading/H5', 'text/primary', { w: 240 }), 'FILL']); add(bn, [bh, 'FILL']);
add(bn, [await T(COOKIE_BODY, 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
const lk = AL('HORIZONTAL', { name: 'Policy links', gap: 16 }); add(lk, await T('Cookie policy', 'Label/M', 'text/brand'), await T('Privacy policy', 'Label/M', 'text/brand')); add(bn, lk);
const ba = AL('VERTICAL', { name: 'Actions — equal prominence', gap: 8 }); add(bn, [ba, 'FILL']);
for (const l of ['Accept all', 'Reject non-essential', 'Preferences']) add(ba, [await BTN('Secondary', l, { size: 'L' }), 'FILL']);
add(bn, [await T('Change your choice any time under “Cookie settings” in the footer.', 'Caption', 'text/tertiary', { w: 318 }), 'FILL']);
B.f.appendChild(bn); bn.layoutPositioning = 'ABSOLUTE'; bn.x = 16; bn.y = 844 - B.tab.height - 12 - bn.height;
// ---------- Frame 2: Preferences — bottom sheet ----------
const N2 = '[PUB-23] Cookie Consent / 390 / Preferences — bottom sheet';
const P = await lobbyBg(N2, below(N1));
const scrim = rect(390, 844, 'scrim/overlay', 0, 'Scrim'); P.f.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = 0;
const sh = AL('VERTICAL', { name: 'Sheet/Bottom — Cookie preferences', fill: 'surface/overlay', w: 390, gap: 0 });
for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); strokeSides(sh, 'border/subtle', { t: 1 }); await fx(sh, 'Elevation/4 — Modal'); sh.clipsContent = true;
const gb = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [8, 0, 4, 0] }); add(gb, rect(36, 4, 'border/strong', 9999, 'Grabber')); add(sh, [gb, 'FILL']);
const hd = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [8, 16, 12, 16] }); strokeSides(hd, 'border/subtle', { b: 1 });
const cl = await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS['x'] }); cl.name = 'Close — returns to banner, nothing saved';
add(hd, await tile('cookie'), [await T('Cookie preferences', 'Heading/H4', 'text/primary', { w: 220 }), 'FILL'], cl); add(sh, [hd, 'FILL']);
const bd = AL('VERTICAL', { name: 'Body — scrolls', gap: 12, p: [16, 16, 16, 16] }); add(sh, [bd, 'FILL']);
add(bd, [await T('Essential cookies are always on because the site can’t work without them. Everything else stays off until you switch it on.', 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
for (const [nm, ds, ess, n] of CATS) {
  const c = box('Category — ' + nm, { p: [12, 16, 12, 16], gap: 6 }); add(bd, [c, 'FILL']);
  const tg = await I('20:3309', { On: ess ? 'Yes' : 'No', State: ess ? 'Disabled' : 'Default' }, { Label: nm, Description: ds, 'Show description': true }); tg.name = 'Control/Toggle — ' + nm + (ess ? ' (always on)' : ' (off by default)'); add(c, [tg, 'FILL']);
  const lf = fitInst(tg); if (lf.length) NOTES.push('Toggle overflow ' + nm + ': ' + lf.join(','));
  const m = AL('HORIZONTAL', { name: 'Meta', gap: 6, align: 'CENTER' }); if (ess) add(m, await IC('lock', 14, 'icon/muted'), await T('Always on · ' + n, 'Caption', 'text/tertiary')); else add(m, await T('Off · ' + n, 'Caption', 'text/tertiary'), await T('· View cookies', 'Caption', 'text/brand')); add(c, [m, 'FILL']);
}
add(bd, [await T('Cookie policy · Privacy policy · Last updated 27 Nov 2026', 'Caption', 'text/brand', { w: 358 }), 'FILL']);
const ft = AL('VERTICAL', { name: 'Sticky footer', gap: 8, p: [12, 16, 8, 16], fill: 'surface/overlay', align: 'CENTER' }); strokeSides(ft, 'border/subtle', { t: 1 });
const fr = AL('HORIZONTAL', { name: 'Accept / reject — equal weight', gap: 8 }); add(fr, [await BTN('Secondary', 'Reject non-essential', { size: 'M' }), 'FILL'], [await BTN('Secondary', 'Accept all', { size: 'M' }), 'FILL']); add(ft, [fr, 'FILL']);
add(ft, [await BTN('Primary', 'Save my choices', { size: 'L' }), 'FILL'], rect(134, 5, 'text/primary', 9999, 'Home indicator')); add(sh, [ft, 'FILL']);
P.f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0;
const MAXH = 844 - 72; if (sh.height > MAXH) { const over = sh.height - MAXH; bd.layoutSizingVertical = 'FIXED'; bd.resize(390, bd.height - over); bd.clipsContent = true; NOTES.push('Sheet body clipped to scroll area by ' + Math.round(over) + 'px'); }
sh.y = 844 - sh.height;
restack(COLX[3]); fitSection(sec);
await B.f.screenshot({ scale: 0.75 }); await P.f.screenshot({ scale: 0.75 });
return { section: sec.id, created: CREATED, audits: [audit(B.f), audit(P.f)], notes: NOTES, sheetH: Math.round(sh.height), bannerH: Math.round(bn.height) };
