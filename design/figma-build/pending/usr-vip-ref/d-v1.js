const NAME = '[USR-V1] VIP — Current Level & Progress / 1440 / Default';
const { f, content } = await DESK(NAME, 120, 160, { active: 'VIP Club', area: 'VIP Club', page: 'Level & progress', title: 'VIP Club',
  sub: 'Your tier, level and the rewards you have unlocked. Status points count your play from the last 365 days.',
  actions: async () => [await BTN('Ghost', 'How VIP works', { lead: 'help-circle' }), await BTN('Secondary', 'Compare tiers', { trail: 'arrow-right' })], tabs: VTABS('Level & progress') });
const r1 = ROW({ name: 'Status row', gap: 16, align: 'MIN' }); add(content, [r1, 'FILL']);
const hero = AL('HORIZONTAL', { name: 'Status hero — Gold III', fill: 'surface/default', stroke: 'border/subtle', r: 20, clip: true }); add(r1, [hero, 'FILL']);
const hc = COL({ name: 'Status', gap: 16, p: 32 }); add(hero, [hc, 'FILL']);
const tr = ROW({ gap: 10 }); add(tr, await I('6:211', { Tier: 'Gold', Size: 'M' })); add(tr, await T('Level 14 of 29', 'Label/M', 'text/secondary')); add(tr, await DEMO('S')); add(hc, tr);
add(hc, await T('Gold III', 'Heading/H1', 'text/primary'));
const pts = ROW({ gap: 8, align: 'MAX' }); add(pts, await T('12,840', 'Number/XL', 'text/primary')); add(pts, await T('/ 20,000 status points to Platinum', 'Body/M', 'text/tertiary')); add(hc, pts);
const track = figma.createFrame(); track.name = 'Tier track (0 → 20,000)'; track.resize(520, 40); track.fills = []; track.clipsContent = false;
track.appendChild(BAR(520, 0.642, 'vip/gold', 10));
for (const [lbl, v] of [['Silver 2,500', 2500], ['Gold 8,000', 8000], ['Platinum 20,000', 20000]]) { const x = Math.round(520 * v / 20000); const tk = rect(2, 16, 'border/strong', 0, 'Tick ' + lbl); tk.x = Math.min(518, x - 1); tk.y = -3; track.appendChild(tk); const t = await T(lbl, 'Caption', 'text/tertiary'); track.appendChild(t); t.x = Math.min(520 - t.width, Math.max(0, x - t.width / 2)); t.y = 20; }
add(hc, track);
add(hc, await T('1,160 points to Level 15 (Gold IV) · 7,160 points to Platinum. Next roll-off: 410 pts on 1 Dec 2026 — you stay Gold (minimum 8,000).', 'Body/S', 'text/secondary', { w: 520 }));
const hb = ROW({ gap: 12 }); add(hb, await BTN('Primary', 'See what Platinum unlocks', { trail: 'arrow-right' })); add(hb, await BTN('Ghost', 'Points history', { lead: 'history' })); add(hc, hb);
const art = figma.createFrame(); art.name = 'Art — crown & coin cropped by the edge'; art.resize(240, 300); art.fills = []; art.clipsContent = true; add(hero, art); art.layoutSizingVertical = 'FILL';
const b1 = rect(300, 640, 'accent/gold-tint-strong', 0, 'Angled block'); b1.rotation = -14; b1.x = 30; b1.y = -80; art.appendChild(b1);
const b2 = rect(70, 640, 'vip/gold', 0, 'Angled stripe'); b2.rotation = -14; b2.x = 190; b2.y = -60; art.appendChild(b2);
const cr = await I('23:10035', { Motif: 'Crown' }); cr.resize(250, 250); art.appendChild(cr); cr.x = 40; cr.y = 40;
const co = await I('23:10035', { Motif: 'Coin' }); co.resize(130, 130); art.appendChild(co); co.x = -20; co.y = 230;
const wr = CARD({ name: 'Weekly reward — 115.20 owed', gap: 14, p: 24, w: 376 }); add(r1, wr); wr.layoutSizingVertical = 'FILL';
const o1 = ROW({ gap: 8 }); add(o1, await T("THIS WEEK'S VIP REWARD", 'Overline', 'text/tertiary')); add(o1, await DEMO('XS')); add(wr, o1);
const am = ROW({ gap: 8 }); add(am, await IC('coins', 28, 'balance/owed')); add(am, await T('115.20', 'Number/L', 'balance/owed')); add(am, await T('USDT', 'Body/M', 'text/tertiary')); add(wr, am);
add(wr, [await T('Gold weekly reward for your play Mon 16 – Sun 22 Nov 2026. It sits in your Owed balance (415.20 USDT).', 'Body/S', 'text/secondary', { w: 320 }), 'FILL']);
add(wr, [await CHK('Settles to Available automatically on Mon 30 Nov 2026, 10:00 UTC', 'clock', 300), 'FILL']);
add(wr, [await BTN('Primary', 'Claim 115.20 USDT now', { size: 'L' }), 'FILL']);
add(wr, [await T('Optional — claiming early moves it to Available today. No wagering, nothing expires.', 'Caption', 'text/tertiary', { w: 320 }), 'FILL']);
const lv = CARD({ name: 'Gold levels', gap: 20 }); add(content, [lv, 'FILL']);
const lh = ROW({ gap: 12 }); const lt = COL({ gap: 4 }); add(lt, await T('Your path through Gold', 'Heading/H4')); add(lt, await T('Six levels in Gold, then Platinum. Level-up rewards are paid in USDT to your Available balance — no wagering.', 'Body/S', 'text/secondary', { w: 640 })); add(lh, [lt, 'FILL']); add(lh, await DEMO('S')); add(lv, [lh, 'FILL']);
const lad = ROW({ name: 'Level ladder', gap: 12, align: 'MIN' }); add(lv, [lad, 'FILL']);
const L = [[12, 'Gold I', '8,000', '2.00', 'done', 'Claimed 12 Oct'], [13, 'Gold II', '10,000', '3.00', 'done', 'Claimed 2 Nov'], [14, 'Gold III', '12,000', '5.00', 'now', 'Claimed 25 Nov'], [15, 'Gold IV', '14,000', '8.00', 'next', '1,160 pts to go'], [16, 'Gold V', '16,000', '10.00', 'lock', '3,160 pts to go'], [17, 'Gold VI', '18,000', '15.00', 'lock', '5,160 pts to go'], [18, 'Platinum I', '20,000', '25.00', 'lock', '7,160 pts to go']];
for (const [n, nm, th, rw, st, note] of L) { const now = st === 'now'; const ok = st === 'done' || now;
  const t = CARD({ name: 'Level ' + n + ' — ' + nm, gap: 8, p: 16, fill: now ? 'surface/selected' : 'surface/raised', stroke: now ? 'border/brand' : 'border/subtle' }); add(lad, [t, 'FILL']);
  const top = ROW({ gap: 6, justify: 'SPACE_BETWEEN' }); add(top, await T('LEVEL ' + n, 'Overline', now ? 'text/brand' : 'text/tertiary')); add(top, await IC(ok ? 'check-circle' : st === 'next' ? 'target' : 'lock', 16, ok ? 'status/success' : st === 'next' ? 'icon/brand' : 'icon/muted')); add(t, [top, 'FILL']);
  add(t, await T(nm, 'Heading/H5', st === 'lock' ? 'text/secondary' : 'text/primary')); add(t, await T(th + ' pts', 'Caption', 'text/tertiary'));
  add(t, await AMT(rw, { c: ok ? 'text/primary' : 'text/secondary' }));
  if (st === 'next') add(t, BAR(104, 840 / 2000, 'brand/primary', 6));
  add(t, await T(now ? 'You are here · ' + note : note, 'Caption', now ? 'text/brand' : st === 'done' ? 'text/success' : 'text/tertiary', { w: 104 })); }
const r3 = ROW({ name: 'Info row', gap: 16, align: 'MIN' }); add(content, [r3, 'FILL']);
const bn = CARD({ name: 'Your Gold benefits', gap: 12 }); add(r3, [bn, 'FILL']); bn.layoutSizingVertical = 'FILL';
add(bn, await T('Your Gold benefits', 'Heading/H5'));
for (const s of ['Weekly reward, calculated every Monday 10:00 UTC', 'Level-up rewards from 2.00 to 15.00 USDT', 'Priority support queue', 'Monthly Gold invitational tournament']) add(bn, [await CHK(s, 'ok', 280), 'FILL']);
add(bn, await BTN('Ghost', 'Compare all tiers', { size: 'S', trail: 'arrow-right' }));
const hp = CARD({ name: 'How you earn points', gap: 12 }); add(r3, [hp, 'FILL']); hp.layoutSizingVertical = 'FILL';
add(hp, await T('How you earn status points', 'Heading/H5'));
for (const [ic, a, d] of [['pool', 'Global Pool entries', "1 pt per 1.00 USDT entered — the 0.05 USDT fee doesn't count"], ['games', 'Originals & table games', '1 pt per 1.00 USDT staked'], ['ban', 'Bonus funds & refunded entries', '0 pts — e.g. cancelled round #1,245']]) { const rr = ROW({ gap: 12, align: 'MIN' }); add(rr, await TILE(ic, 'icon/default', 'surface/raised', 32)); const cc = COL({ gap: 2 }); add(cc, await T(a, 'Body/S Strong', 'text/primary')); add(cc, await T(d, 'Caption', 'text/tertiary', { w: 250 })); add(rr, [cc, 'FILL']); add(hp, [rr, 'FILL']); }
const ex = ROW({ gap: 6 }); add(ex, await T('Example: 35 entries in round #1,248 = 350 pts', 'Caption', 'text/secondary')); add(ex, await DEMO('XS')); add(hp, ex);
const rg = CARD({ name: 'Play within your limits', gap: 12 }); add(r3, [rg, 'FILL']); rg.layoutSizingVertical = 'FILL';
const rgh = ROW({ gap: 8 }); add(rgh, await IC('shield', 20, 'icon/brand')); add(rgh, await T('Play within your limits', 'Heading/H5')); add(rg, rgh);
add(rg, [await T('Levels reward play you were going to do anyway — never chase a level. VIP status never changes odds or outcomes.', 'Body/S', 'text/secondary', { w: 300 }), 'FILL']);
add(rg, [await KV('Daily participation limit', '351.75 / 500.00 USDT', { demo: true }), 'FILL']); add(rg, BAR(320, 351.75 / 500, 'brand/primary', 6));
const rb = ROW({ gap: 8 }); add(rb, await BTN('Secondary', 'Set limits', { size: 'S' })); add(rb, await BTN('Ghost', 'Take a break', { size: 'S', lead: 'pause-circle' })); add(rg, rb);
await FOOT(content, 'VIP status, points and rewards never change odds, outcomes or security checks. All values are DEMO. 18+ only, in permitted jurisdictions.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
