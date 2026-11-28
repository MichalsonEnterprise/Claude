// ===== CR crash mobile: CR-08 Insufficient balance 390 (clone of CR-01 390) + verify all mobile frames =====
async function setChars(t, v) { const fonts = t.getStyledTextSegments(['fontName']).map(s => s.fontName); for (const fn of fonts) await figma.loadFontAsync(fn); t.characters = v; }
async function repl(root, from, to, exact = true) { let n = 0; for (const t of root.findAll(x => x.type === 'TEXT')) { const c = t.characters; if (exact ? c === from : c.includes(from)) { await setChars(t, exact ? to : c.split(from).join(to)); n++; } } return n; }
function inInstance(n, stop) { let p = n.parent; while (p && p !== stop) { if (p.type === 'INSTANCE') return p; p = p.parent; } return null; }
function topInstance(n, stop) { let r = null; let p = n.parent; while (p && p !== stop) { if (p.type === 'INSTANCE') r = p; p = p.parent; } return r; }
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('Games — Mobile Crash', 189000, 0);
const NAME = '[CR-08] Orbit Rush — Error states / 390 / Insufficient balance (DEMO account · Available 4.20 USDT)';
for (const n of sec.children.filter(n => n.name === NAME)) n.remove();
const src = await figma.getNodeByIdAsync('34:386552');
const f = src.clone(); sec.appendChild(f); f.name = NAME; f.primaryAxisSizingMode = 'AUTO';
let colBottom = 0; for (const c of sec.children) { if (c !== f && Math.abs(c.x - 3690) < 2) colBottom = Math.max(colBottom, c.y + c.height); }
f.x = 3690; f.y = Math.round(colBottom + 160);
const miss = []; const log = {};
// balances
log.bal1 = await repl(f, '9,215.30', '4.20');
log.bal2 = await repl(f, '9,215.30 USDT', '4.20 USDT');
log.bal3 = await repl(f, '9,215.30', '4.20', false);
// amount field
let amt = null; for (const t of f.findAll(x => x.type === 'TEXT' && x.characters === '10.00')) { const chain = []; let p = t.parent; while (p && p !== f) { chain.push(p.name); p = p.parent; } if (chain.some(nm => /amount|input|stake/i.test(nm)) && !chain.some(nm => /live|row|list|history|summary|odds/i.test(nm))) { amt = t; break; } }
if (!amt) miss.push('amount text');
let inputBox = null, errPlaced = false;
if (amt) {
  const ti = topInstance(amt, f);
  if (ti && ti.mainComponent && ti.mainComponent.parent && ti.mainComponent.parent.name === 'Input/Amount') { try { ti.setProperties({ State: 'Error' }); errPlaced = true; } catch (e) { miss.push('Input/Amount error ' + e.message); } inputBox = ti; await repl(ti, '9,215.30', '4.20', false); }
  else {
    let p = ti || amt.parent; while (p && p !== f && !(p.strokes && p.strokes.length && p.type !== 'TEXT')) p = p.parent;
    inputBox = (p && p !== f) ? p : (ti || amt.parent);
    if (inputBox.type === 'INSTANCE') { try { inputBox.setProperties({ State: 'Error' }); } catch (e) {} }
    else stroke(inputBox, 'border/danger', 1);
  }
  log.inputBox = inputBox.name + ' / parent ' + inputBox.parent.name + ' ' + inputBox.parent.layoutMode;
  if (!errPlaced) {
    let anchor = inputBox; let host = anchor.parent;
    while (host && (host.type === 'INSTANCE' || inInstance(host, f) || host.layoutMode !== 'VERTICAL')) { anchor = host; host = host.parent; }
    const er = AL('HORIZONTAL', { name: 'Error — insufficient balance', gap: 6, align: 'CENTER' });
    add(er, await IC('alert-circle', 16, 'status/danger')); const et = await T('Exceeds your available balance (4.20 USDT)', 'Caption', 'text/danger', { name: 'Error text', w: 280 }); add(er, et); et.layoutSizingHorizontal = 'FILL';
    host.insertChild(host.children.indexOf(anchor) + 1, er); er.layoutSizingHorizontal = 'FILL'; log.errHost = host.name;
  }
}
// alert card before the bet block
const content = f.findOne(n => n.name === 'Content' && n.type === 'FRAME');
let block = null; if (amt && content) { let p = amt; while (p && p.parent !== content) p = p.parent; block = p; }
const al = AL('VERTICAL', { name: 'Alert — Not enough balance', gap: 12, p: 16, r: 14, fill: 'status/warning-tint', stroke: 'status/warning' });
const ah = AL('HORIZONTAL', { name: 'Alert head', gap: 10, align: 'MIN' }); add(ah, await IC('wallet', 20, 'status/warning'));
const ac = AL('VERTICAL', { name: 'Alert copy', gap: 4 }); add(ac, await T('Not enough balance for this bet', 'Body/M Strong', 'text/primary', { name: 'Alert title', w: 270 }));
const ab = await T('You need 5.80 USDT more to bet 10.00 USDT. USDT deposits on Arbitrum usually arrive in about 2 minutes (20 confirmations).', 'Body/S', 'text/secondary', { name: 'Alert body', w: 270 }); add(ac, ab);
const am = AL('HORIZONTAL', { name: 'Alert meta', gap: 6, align: 'CENTER' }); add(am, await T('DEMO account · Available 4.20 USDT', 'Caption', 'text/tertiary'), await DEMO('XS')); add(ac, am);
add(ah, ac); ac.layoutGrow = 1; ab.layoutSizingHorizontal = 'FILL'; ac.children[0].layoutSizingHorizontal = 'FILL'; add(al, [ah, 'FILL']);
const b1 = await BTN('Primary', 'Deposit USDT', { size: 'L', lead: 'deposit' }); const b2 = await BTN('Secondary', 'Change bet amount', { size: 'L', lead: 'edit' }); add(al, [b1, 'FILL'], [b2, 'FILL']);
if (content) { const idx = block ? content.children.indexOf(block) : 0; content.insertChild(Math.max(0, idx), al); al.layoutSizingHorizontal = 'FILL'; } else miss.push('Content');
log.block = block ? block.name : null;
// CTAs
const ctas = f.findAll(n => n.type === 'INSTANCE' && n.findAll(t => t.type === 'TEXT' && /Place bet/.test(t.characters)).length && n.mainComponent && n.mainComponent.parent && /^Button\//.test(n.mainComponent.parent.name));
log.ctas = ctas.map(c => c.name + ' @' + c.parent.name);
for (const c of ctas) { const sticky = /sticky/i.test(c.parent.name) || /sticky/i.test((c.parent.parent || {}).name || ''); const k = Object.keys(c.componentProperties); if (sticky) { const set = {}; const lk = k.find(x => x.startsWith('Label')); if (lk) set[lk] = 'Deposit USDT to bet'; const sl = k.find(x => x.startsWith('Show leading icon')); if (sl) set[sl] = true; const li = k.find(x => x.startsWith('Leading icon')); if (li) set[li] = ICONS.deposit; c.setProperties(set); } else { try { c.setProperties({ State: 'Disabled' }); } catch (e) { miss.push('cta disable'); } } }
log.risk = await repl(f, 'You can lose your stake. Your bet joins round', 'You can lose your stake. Only deposit what you can afford to lose — set a deposit limit in Responsible gaming. Your bet joins round', false);
fitSection(sec);
const shots = [];
await f.screenshot({ scale: 0.6 });
for (const id of ['34:386552', '34:410457', '34:420337', '34:420839', '34:446321', '34:480272', '34:492427', '36:511112', '36:511527', '36:519473']) { const n = await figma.getNodeByIdAsync(id); if (n) { await n.screenshot({ scale: 0.42 }); shots.push(id + ' ' + Math.round(n.height)); } }
return { id: f.id, x: f.x, y: f.y, h: f.height, miss, log, shots };
