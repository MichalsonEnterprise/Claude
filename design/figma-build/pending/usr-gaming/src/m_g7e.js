// [USR-G7] Favourites / 390 / Empty — section-local x=3180, below Default
const S = await shellG('[USR-G7] Favourites / 390 / Empty', 'Favourites', 'Favourites', 'Games you pin with the heart appear here, ready to open in one tap.');
const C = S.C;
const ec = card('Empty state — No favourites yet', { gap: 0, p: 0, clip: true }); add(C, [ec, 'FILL']);
// illustration strip: real game tiles cropped by the strip edge + angled colour block (no glows/rings)
const il = figma.createFrame(); il.name = 'Illustration — pinned tiles preview'; il.resize(358, 164); il.clipsContent = true; fill(il, 'surface/raised');
const blk = rect(420, 120, 'brand/tint', 0, 'Angled colour block'); il.appendChild(blk); blk.rotation = 12; blk.x = -30; blk.y = 96;
const arts = [['Pool Dice', 46, 52, 8], ['Twenty-One', 222, 52, -8], ['Orbit Rush', 134, 30, 0]];
for (const [g, x, y, rot] of arts) { const a = await thumbArt(g, 0.58); il.appendChild(a); a.x = x; a.y = y; a.rotation = rot; }
const pill = AL('HORIZONTAL', { name: 'Hint pill — Tap ♥ to pin', gap: 6, p: [6, 12, 6, 10], fill: 'surface/overlay', stroke: 'border/subtle', r: 9999, align: 'CENTER' }); il.appendChild(pill); pill.appendChild(await IC('heart', 16, 'icon/brand')); pill.appendChild(await T('Tap ♥ to pin', 'Label/S', 'text/primary')); pill.x = 16; pill.y = 14;
add(ec, [il, 'FILL']);
const eb = AL('VERTICAL', { name: 'Body', gap: 12, p: [20, 16, 16, 16] }); add(ec, [eb, 'FILL']);
add(eb, [await T('No favourites yet', 'Heading/H4', 'text/primary', { w: 326 }), 'FILL']);
add(eb, [await T('Tap the heart on any game — in the lobby, on a game page or in your game history — to pin it here. Favourites sync across your devices.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
add(eb, [await BTN('Primary', 'Browse the lobby', { size: 'L', trail: 'arrow-right' }), 'FILL']);
add(eb, [await BTN('Ghost', 'See GLOBAL POOL Originals', { size: 'L' }), 'FILL']);
// Recently played — quick add
const rp = AL('VERTICAL', { name: 'Recently played', gap: 12 }); add(C, [rp, 'FILL']);
add(rp, [await secHead('Recently played', { sub: 'Tap ♥ to add one of these', demo: true }), 'FILL']);
const lc = card('Recently played list (stacked rows)', { gap: 0, p: [4, 16, 4, 16] }); add(rp, [lc, 'FILL']);
const rows = [['Pool Dice', 'Originals · Today, 16:41 UTC'], ['Orbit Rush', 'Originals · Today, 16:37 UTC'], ['Double Side', 'Originals · Today, 16:28 UTC'], ['Twenty-One', 'Table · Today, 16:22 UTC']];
for (let i = 0; i < rows.length; i++) add(lc, [await listRow(rows[i][0], rows[i][1], await heartBtn(false), { last: i === rows.length - 1 }), 'FILL']);
add(rp, [await T('Popularity never affects a game’s odds — house edge and RTP are fixed for each game and shown on its tile.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
await endG(S, 'Games');
const dflt = sec.children.find(c => c.name === '[USR-G7] Favourites / 390 / Default');
await placeG(S.f, 3180, dflt ? dflt.y + dflt.height + 160 : 2400);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: S.f.name, h: Math.round(S.f.height), section: sec.id };
