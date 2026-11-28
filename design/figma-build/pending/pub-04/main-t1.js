const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-04 Game Details', 40000, 0);
const nb = page.children.filter(n => n !== sec && n.x < 54000 && n.x + n.width > 40000).map(n => n.name + ' x' + Math.round(n.x) + '..' + Math.round(n.x + n.width) + ' y' + Math.round(n.y));
let set = sec.findOne(x => x.type === 'COMPONENT_SET' && x.name === TPL_NAME);
const REBUILD = false;
if (set && REBUILD) { set.remove(); set = null; }
for (const o of sec.children.filter(c => c.type === 'COMPONENT' && c.name.startsWith('Breakpoint='))) o.remove();
let built = false;
if (!set) {
  const cD = await buildTpl(false, GD.roulette); sec.appendChild(cD);
  const cM = await buildTpl(true, GD.roulette); sec.appendChild(cM);
  set = figma.combineAsVariants([cD, cM], sec); set.name = TPL_NAME; built = true;
  set.layoutMode = 'HORIZONTAL'; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.counterAxisAlignItems = 'MIN'; gap(set, 48); pad(set, 24); fill(set, 'surface/default'); radius(set, 14);
  set.description = "Game Details page template (PUB-04). Variants: Breakpoint=Desktop (1136 content column inside the casino shell: Shell/Sidebar 240 + Shell/Topbar Desktop + Shell/Footer Mega) and Breakpoint=Mobile (358 content inside a 390 frame with Shell/Topbar Mobile, a sticky CTA bar and Nav/Mobile Tab Bar).\n\nAnatomy: breadcrumb + live players pill (DEMO) · hero (category + fairness chips, game name, tagline, house edge / RTP / limits chips + DEMO, Play CTA, How to play, favourite, 18+ + 'You can lose your stake' + licence small print) with an art stage holding one 'Objects — <game>' group per game (angled Gradient/Tile block, mint stripe, Tile/Game Art, concrete library objects cropped by the banner edge — no glows, rings or particles) · At a glance (6 fact tiles, Number/L) · How to play (4 steps) · Payouts (≤10 rows; desktop table with Table/Header Cell, mobile stacked rows) · Rules summary (≤7) · Provably fair (3 steps + example data, DEMO) · Play card (limits, fee note, CTA, risk line, eligibility) · Live card (DEMO) · Play responsibly card (18+, limits, break, help organisations) · Notice/Licence · Related games (6 Tile/Game Generic).\n\nPer game: override TEXT layers by name (Game name, Tagline, Chip category/fairness, Hero fact n, Fact n label/value/sub, Step n title/body, Payout n bet/covers/pays/chance, Rule n, PF title/body/step n/key n/val n, Rail title/key n/val n/fee, Live title/key n/val n, Small print, Facts note, Payout unit/footnote, Rules footnote); toggle 'Payout row n' and 'Rule row n' visibility; show exactly one 'Objects — <game>' group; for Global Pool hide 'Play CTA'/'Rail CTA' and show the Gold pair 'Play CTA gold'/'Rail CTA gold'; set Label on 'Hdr n' (desktop) or text 'Hdr m1–m4' (mobile); set Art / Players / House edge on 'Related n'; set Title on 'Related header'; show 'Payout DEMO' when amounts are illustrative.\n\nDev notes: house edge, RTP, limits, payouts and rules come from the game config API (GET /games/{slug}); limits are per account and may be lowered by the player's RG limits; live players via WebSocket presence (DEMO); Global Pool figures (pool, entries, close time) stream from the round service and the countdown is derived from the real close time only. Never pre-select a bet side; never hide fees or odds.";
}
set.x = 120; set.y = 320;
let hd = sec.findOne(x => x.name === 'Doc/PUB-04 header');
if (!hd) { hd = col('Doc/PUB-04 header', { gap: 8 }); sec.appendChild(hd); hd.x = 120; hd.y = 80; add(hd, await T('PUB-04 Game Details — template + 6 game pages', 'Heading/H2', 'text/primary'), await T('Left: the Template/Game Details component set (Desktop 1136 + Mobile 358). Right: six 1440 pages built as instances with per-game overrides — Global Pool (Global Jackpot), Pool Roulette, Orbit Rush (Crash), Pool Dice, Double Side (Coinflip), Twenty-One (Blackjack). Mobile 390 frames live on page 10 › PUB-04 — Mobile.', 'Body/M', 'text/secondary', { w: 1500 })); }
fitSection(sec);
const vD = set.children.find(c => c.name === 'Breakpoint=Desktop'), vM = set.children.find(c => c.name === 'Breakpoint=Mobile');
await vD.screenshot({ scale: 0.5 });
await vM.screenshot({ scale: 0.5 });
return { sec: sec.id, set: set.id, built, desktop: vD.id, mobile: vM.id, sizeD: [Math.round(vD.width), Math.round(vD.height)], sizeM: [Math.round(vM.width), Math.round(vM.height)], header: hd.id, nb, MISS: MISS.slice(0, 60) };
