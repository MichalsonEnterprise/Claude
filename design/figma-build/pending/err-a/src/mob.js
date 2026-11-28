// ERR mobile examples — page 10, section 'ERR — Mobile' (X 253000: 'PRO — Mobile' ends at 252670, so 252000 would overlap)
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('ERR — Mobile', 253000, 0);
async function sk(w, h, r = 6, name = 'Skeleton') { const x = figma.createRectangle(); x.resize(w, h); x.name = name; radius(x, r); await gfill(x, 'Gradient/Skeleton'); return x; }
async function mframe(name) { const old = sec.findChild(n => n.name === name); let x, y; if (old) { x = old.x; y = old.y; old.remove(); } else { x = sec.children.length ? nextX(sec) : 120; y = 120; } const f = await screen(name, 390, { h: 844 }); sec.appendChild(f); f.x = x; f.y = y; const d = await DEMOBAR('DEMO DATA — illustrative values only'); add(f, [d, 'FILL']); return f; }
async function homeInd() { const h = HB('Home indicator', { p: [8, 0, 8, 0], justify: 'CENTER' }); add(h, rect(134, 5, 'text/primary', 9999, 'Home indicator')); return h; }
const ids = {};

// ---------- M1: Transactions empty ----------
const f1 = await mframe('[ERR-01 · MOB] Transactions / 390 / Empty — new account');
const tb1 = await I(IDS.topM, { State: 'Member' }); await setT(tb1, 'Balance value', '0.00'); add(f1, [tb1, 'FILL']);
const c1 = VB('Content', 390, { gap: 16, p: [20, 16, 24, 16] }); add(f1, [c1, 'FILL']); c1.layoutGrow = 1;
const h1 = VB('Title', 358, { gap: 4 }); add(h1, await T('Transactions', 'Heading/H3', 'text/primary'), await T('All networks · newest first', 'Caption', 'text/tertiary'));
add(c1, [h1, 'FILL'], [await I(IDS.seg, { Segments: '4' }), 'FILL']);
const ec = panel('Empty state card', { gap: 12, p: 24 }); ec.counterAxisAlignItems = 'CENTER';
add(ec, await iconTile('receipt', 'neutral', 56), [await T('No transactions yet', 'Heading/H4', 'text/primary', { w: 310, align: 'CENTER' }), 'FILL'], [await T('Deposits, withdrawals, pool entries, prizes and refunds will appear here as soon as they happen.', 'Body/S', 'text/secondary', { w: 310, align: 'CENTER' }), 'FILL']);
add(ec, [await BTN('Primary', 'Make a deposit', { size: 'L', lead: 'deposit' }), 'FILL'], await BTN('Ghost', 'How deposits work', { size: 'L' }));
add(c1, [ec, 'FILL']);
const ic1 = HB('Networks note', { gap: 8, p: [12, 16], r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const ict = await T('Deposit USDT on BNB Chain, Polygon, Arbitrum, Ethereum or Solana. Minimum deposit 10.00 USDT. Filters and export appear once you have activity.', 'Caption', 'text/secondary', { w: 300 });
add(ic1, await IC('info', 16, 'status/info'), ict); ict.layoutGrow = 1; add(c1, [ic1, 'FILL']);
add(f1, await I(IDS.tabM, { Active: 'Wallet' }));
ids.m1 = f1.id;

// ---------- M2: Withdraw validation ----------
const f2 = await mframe('[ERR-02 · MOB] Withdraw — Step 4 Amount / 390 / Validation errors');
const hb = HB('Flow top bar', { gap: 4, p: [0, 8], w: 390, h: 56, align: 'CENTER' }); fill(hb, 'bg/secondary'); strokeSides(hb, 'border/subtle', { b: 1 });
const hs = spacer(); add(hb, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }), await T('Withdraw USDT', 'Label/L', 'text/primary'), hs); hs.layoutGrow = 1; add(hb, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['x'] }));
add(f2, [hb, 'FILL']);
const c2 = VB('Content', 390, { gap: 16, p: [16, 16, 16, 16] }); add(f2, [c2, 'FILL']); c2.layoutGrow = 1;
const sm = HB('Error summary', { gap: 12, p: [12, 16], r: 10, fill: 'status/danger-tint', stroke: 'border/danger' }); const smv = VB('Summary', 280, { gap: 2 });
add(smv, [await T('2 things to fix before you continue', 'Label/M', 'text/primary', { w: 280 }), 'FILL'], [await T('Nothing has been sent. What you typed is kept.', 'Caption', 'text/secondary', { w: 280 }), 'FILL']);
add(sm, await IC('alert-circle', 20, 'status/danger'), smv); smv.layoutGrow = 1;
add(c2, [await I('15:3270', { Steps: '9' }), 'FILL'], [sm, 'FILL'], [await I(IDS.inAddr, { State: 'Invalid' }), 'FILL'], [await I(IDS.inAmt, { State: 'Error' }), 'FILL']);
const fp = panel('Fees preview', { gap: 8, p: 16 });
add(fp, [await kv('Network fee · Arbitrum', '0.08 USDT', { demo: true }), 'FILL'], [await kv('Platform fee', '0.00 USDT'), 'FILL']);
add(c2, [fp, 'FILL']);
const sb = VB('Sticky CTA', 390, { gap: 8, p: [12, 16, 0, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(sb, 'border/subtle', { t: 1 });
add(sb, [await BTN('Primary', 'Continue to fees', { size: 'L', state: 'Disabled', trail: 'arrow-right' }), 'FILL'], await T('Fix the 2 fields above to continue', 'Caption', 'text/tertiary'), [await homeInd(), 'FILL']);
add(f2, [sb, 'FILL']);
ids.m2 = f2.id;

// ---------- M3: Withdrawal failed bottom sheet ----------
const f3 = await mframe('[ERR-02 · MOB] Withdrawal WD-20931 / 390 / Failed to broadcast — bottom sheet');
const vp = figma.createFrame(); vp.name = 'Viewport'; vp.fills = []; vp.clipsContent = true; vp.resize(390, 780); add(f3, [vp, 'FILL']); vp.layoutGrow = 1;
const vpH = vp.height;
const tb3 = await I(IDS.topM, { State: 'Member' }); await setT(tb3, 'Balance value', '10,715.30'); vp.appendChild(tb3); tb3.x = 0; tb3.y = 0;
const bgc = VB('Wallet behind', 358, { gap: 12 }); vp.appendChild(bgc); bgc.x = 16; bgc.y = 76;
const bpn = panel('Balances', { gap: 8, p: 16 });
add(bpn, [await kv('Available', '10,715.30 USDT', { demo: true }), 'FILL'], [await kv('Locked', '350.00 USDT'), 'FILL'], [await kv('Pending', '1,000.00 USDT'), 'FILL'], [await kv('Owed', '415.20 USDT'), 'FILL']);
add(bgc, await T('Wallet', 'Heading/H3', 'text/primary'), [bpn, 'FILL']);
const tab3 = await I(IDS.tabM, { Active: 'Wallet' }); vp.appendChild(tab3); tab3.x = 0; tab3.y = vpH - tab3.height;
const scr = rect(390, vpH, 'scrim/overlay', 0, 'Scrim'); vp.appendChild(scr); scr.x = 0; scr.y = 0;
const sh = VB('Bottom sheet — Withdrawal failed', 390, { gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay' });
for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); sh.bottomLeftRadius = 0; sh.bottomRightRadius = 0; await fx(sh, 'Elevation/4 — Modal');
const gr = HB('Grabber', { justify: 'CENTER' }); add(gr, rect(36, 4, 'border/strong', 9999, 'Grabber'));
const shh = HB('Sheet header', { gap: 8, align: 'CENTER' }); const shs = spacer(); add(shh, await T('Withdrawal failed', 'Heading/H5', 'text/primary'), shs); shs.layoutGrow = 1; add(shh, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['x'] }));
const sst = HB('Status', { gap: 8, align: 'CENTER' }); add(sst, await badge('Failed', null), await T('WD-20931', 'Mono/S', 'text/secondary'), await DEMO('XS'));
const sam = VB('Summary', 358, { gap: 8, p: 16, fill: 'surface/raised', r: 14 });
add(sam, [await kv('Amount', '1,500.00 USDT'), 'FILL'], [await kv('To', '0x7c4e…a21D · Arbitrum', { vs: 'Mono/S' }), 'FILL'], [await kv('Network fee charged', '0.00 USDT'), 'FILL']);
const stl = VB('Timeline', 358, { gap: 12 });
add(stl, [await stepLine('done', 'Submitted', '18:44:02 UTC', 'Risk check passed · confirmed with 2FA'), 'FILL'], [await stepLine('failed', 'Failed to broadcast', '18:59:10 UTC', 'Timed out 3 times between 18:49 and 18:59 UTC while Arbitrum was degraded.'), 'FILL'], [await stepLine('done', 'Returned to Available', '18:59:40 UTC', '1,500.00 USDT is back in Available (now 10,715.30 USDT).'), 'FILL']);
add(sh, [gr, 'FILL'], [shh, 'FILL'], sst, [sam, 'FILL'], [stl, 'FILL'], [await BTN('Primary', 'Withdraw again', { size: 'L', lead: 'withdraw' }), 'FILL'], [await BTN('Secondary', 'Contact support', { size: 'L', lead: 'chat' }), 'FILL']);
add(sh, [await T('Withdraw again starts a new request to the same whitelisted address — you confirm it with 2FA again.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL'], [await homeInd(), 'FILL']);
vp.appendChild(sh); sh.x = 0; sh.y = vpH - sh.height;
ids.m3 = f3.id;

// ---------- M4: Wallet loading ----------
const f4 = await mframe('[ERR-03 · MOB] Wallet / 390 / Loading (skeleton)');
const tb4 = await I(IDS.topM, { State: 'Member' }); await setT(tb4, 'Balance value', '•••'); add(f4, [tb4, 'FILL']);
const c4 = VB('Content', 390, { gap: 16, p: [20, 16, 16, 16] }); add(f4, [c4, 'FILL']); c4.layoutGrow = 1;
add(c4, await T('Wallet', 'Heading/H3', 'text/primary'));
const bc = panel('Balance card — loading', { gap: 12, p: 16 });
add(bc, await T('Total balance', 'Caption', 'text/tertiary'), await sk(200, 32, 6, 'Skeleton/Total'));
for (const pair of [['Available', 'Locked'], ['Pending', 'Owed']]) { const r = HB('Buckets', { gap: 8 }); for (const l of pair) { const b = VB('Bucket/' + l, 150, { gap: 6, p: 12, fill: 'surface/raised', r: 10 }); add(b, await T(l, 'Caption', 'text/tertiary'), await sk(72, 16, 4)); add(r, b); b.layoutGrow = 1; } add(bc, [r, 'FILL']); }
add(c4, [bc, 'FILL']);
const qa = HB('Quick actions', { gap: 8 }); const d1 = await BTN('Primary', 'Deposit', { lead: 'deposit' }), d2 = await BTN('Secondary', 'Withdraw', { lead: 'withdraw', state: 'Disabled' });
add(qa, d1, d2); d1.layoutGrow = 1; d2.layoutGrow = 1; add(qa, await I('7:774', { Type: 'Secondary', Size: 'M', State: 'Default' }, { Icon: ICONS['history'] })); add(c4, [qa, 'FILL']);
add(c4, await T('Recent activity', 'Label/M', 'text/secondary'));
for (let i = 0; i < 3; i++) { const r = HB('Activity card — loading', { gap: 12, p: 12, r: 14, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' }); const rv = VB('Lines', 160, { gap: 6 }); add(rv, await sk(150, 12, 4), await sk(96, 10, 4)); add(r, await sk(36, 36, 9999, 'Skeleton/Icon'), rv); rv.layoutGrow = 1; add(r, await sk(64, 14, 4)); add(c4, [r, 'FILL']); }
add(f4, await I(IDS.tabM, { Active: 'Wallet' }));
ids.m4 = f4.id;

fitSection(sec);
for (const k of ['m1', 'm2', 'm3', 'm4']) { const f = await figma.getNodeByIdAsync(ids[k]); await f.screenshot({ scale: 0.8 }); }
return { section: sec.id, secPos: [sec.x, sec.y, sec.width, sec.height], ids, frames: sec.children.map(f => ({ n: f.name, id: f.id, x: f.x, y: f.y, h: f.height })), vpH, sheetH: sh.height };
