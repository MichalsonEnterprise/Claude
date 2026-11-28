// ===== [PUB-14] FAQ — 390 Search results “withdraw” + No results “bonus code” (cloned from the mobile Default 34:435744) =====
const SRC_ID = '34:435744'; const SRC = await figma.getNodeByIdAsync(SRC_ID);
const N2 = '[PUB-14] FAQ / 390 / Search results — “withdraw”';
const N3 = '[PUB-14] FAQ / 390 / Search — no results “bonus code”';
async function faqCard(parent, q, a, o = {}) {
  const inst = await I('23:16819', { State: o.open ? 'Expanded' : 'Collapsed' }, { Question: q, Answer: a }); inst.name = 'Card/FAQ Item — ' + q.slice(0, 44);
  add(parent, [inst, 'FILL']);
  if (o.open) { if (o.example) txt(inst, 'Example', o.example); const ls = inst.findAll(n => n.type === 'TEXT' && n.name === 'Link label'); (o.links || []).forEach((l, i) => { if (ls[i]) ls[i].characters = l; }); }
  if (o.term) { hilite(inst.findOne(n => n.type === 'TEXT' && n.name === 'Question'), o.term); if (o.open) hilite(inst.findOne(n => n.type === 'TEXT' && n.name === 'Answer'), o.term); }
  return inst;
}
async function countBlock(title, sub, right) { const rc = AL('VERTICAL', { name: 'Result count', gap: 4 }); const r1 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r1, [await T(title, 'Body/M Strong', 'text/primary', { w: 220 }), 'FILL']); if (right) add(r1, await T(right, 'Label/M', 'text/brand')); add(rc, [r1, 'FILL'], [await T(sub, 'Caption', 'text/tertiary', { w: 358 }), 'FILL']); return rc; }
async function chips(labels, name) { const r = AL('HORIZONTAL', { name, gap: 8, wrap: true, cgap: 8 }); for (const l of labels) { const c = await I('17:2766', { State: 'Default' }, { Label: l, 'Show icon': true, Icon: ICONS['search'] }); c.name = 'Suggestion — ' + l; r.appendChild(c); } return r; }

// ---------- Frame A: Search results — “withdraw” ----------
const A = await cloneFrom(SRC_ID, N2, SRC.y + SRC.height + 160);
const CA = A.findChild(n => n.name === 'Content');
for (const n of [...CA.children]) if (n.name.startsWith('Group — ') || n.name === 'Card — More categories') n.remove();
const sA = CA.findChild(n => n.name === 'Input/Search — FAQ'); await search(sA, 'withdraw'); sA.name = 'Input/Search — “withdraw” (filled, Clear)';
const tabsA = CA.findChild(n => n.name.startsWith('Category tabs')); tabsA.name = 'Result filters — horizontal scroll';
const TL = [['All · 6', null], ['Deposits & withdrawals · 3', null], ['Fees · 1', 'percent'], ['KYC & security · 1', 'fingerprint'], ['Restrictions · 1', 'globe']];
const pillsA = tabsA.children;
// existing order: All, Fees, Deposits & withdrawals, Global Pool, Fairness -> relabel in relevance order
const order = [0, 2, 1, 3, 4];
for (let i = 0; i < 5; i++) { const p = pillsA[order[i]]; setProp(p, 'Label', TL[i][0]); if (TL[i][1]) { setProp(p, 'Icon', ICONS[TL[i][1]]); setProp(p, 'Show icon', true); } p.name = 'Tabs/Pill — ' + TL[i][0]; }
for (let i = 0; i < 5; i++) tabsA.insertChild(i, pillsA.find(p => p.name === 'Tabs/Pill — ' + TL[i][0]));
const cntA = ins(CA, tabsA, await countBlock('6 results for “withdraw”', 'Matched in questions and answers · sorted by relevance', 'Clear search'));
const RL = AL('VERTICAL', { name: 'Results — 6', gap: 16 }); ins(CA, cntA, RL);
const RES = [
 ['DEPOSITS & WITHDRAWALS', null, 'How long does a withdrawal take?', 'Most withdrawals pass our automated security and AML checks within minutes; a manual review can take up to 4 hours. We then broadcast the transaction — on Arbitrum it lands after 20 confirmations, about a minute.', { open: true, example: 'Example: WD-20931 · 1,500.00 USDT to 0x7c4e…a21D on Arbitrum · network fee 0.08 USDT · platform fee 0.00 · you receive 1,499.92 USDT', links: ['Withdrawal steps', 'Network fees'] }],
 ['DEPOSITS & WITHDRAWALS', null, 'Why can’t I withdraw to a new address straight away?', 'A newly whitelisted address can receive withdrawals 24 hours after you add it. The pause protects you if someone gets into your account.', {}],
 ['DEPOSITS & WITHDRAWALS', null, 'What are the minimum and maximum withdrawal amounts?', 'Minimum 20.00 USDT on every network. With KYC Level 2 you can withdraw up to 25,000.00 USDT a day.', {}],
 ['FEES', null, 'Are there fees on deposits or withdrawals?', 'GLOBAL POOL charges no deposit or withdrawal fee. You pay only the network fee of the chain you pick, shown before you confirm.', {}],
 ['KYC & SECURITY', '…ID document and liveness check and lifts your withdrawal limit to 25,000.00 USDT a day…', 'Why do I need to verify my identity (KYC)?', 'Licensed operators must confirm your age and identity. Level 2 adds an ID document and liveness check and lifts your withdrawal limit to 25,000.00 USDT a day.', {}],
 ['RESTRICTIONS', '…you can sign in, view your account and withdraw; play and new entries pause…', 'I’m travelling to a restricted country — what happens to my funds?', 'Nothing is lost. In a restricted region you can sign in, view your account and withdraw; play and new entries pause until you are back in a permitted region.', {}],
];
for (const [cat, snip, q, a, o] of RES) {
  const it = AL('VERTICAL', { name: 'Result — ' + q.slice(0, 40), gap: 6 }); add(RL, [it, 'FILL']);
  const hr = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(hr, await T(cat, 'Overline', 'text/tertiary')); if (snip) add(hr, await T('· Matched in answer', 'Caption', 'text/brand')); add(it, [hr, 'FILL']);
  await faqCard(it, q, a, { ...o, term: 'withdraw' });
  if (snip) { const sn = AL('HORIZONTAL', { name: 'Answer snippet', gap: 8, p: [8, 12, 8, 12], fill: 'bg/secondary', r: 10 }); const st = await T('“' + snip + '”', 'Body/S', 'text/secondary', { w: 310 }); hilite(st, 'withdraw'); add(sn, [st, 'FILL']); add(it, [sn, 'FILL']); }
}
const alt = AL('VERTICAL', { name: 'Not quite it', gap: 10 }); ins(CA, RL, alt);
add(alt, [await T('Not quite it? Try a related search, or ask live support below.', 'Body/S', 'text/secondary', { w: 358 }), 'FILL'], [await chips(['withdrawal limit', 'network fee'], 'Related searches'), 'FILL']);

// ---------- Frame B: No results — “bonus code” ----------
const B = await cloneFrom(SRC_ID, N3, 0);
const CB = B.findChild(n => n.name === 'Content');
for (const n of [...CB.children]) if (n.name.startsWith('Group — ') || n.name === 'Card — More categories') n.remove();
const sB = CB.findChild(n => n.name === 'Input/Search — FAQ'); await search(sB, 'bonus code'); sB.name = 'Input/Search — “bonus code” (filled, Clear)';
const tabsB = CB.findChild(n => n.name.startsWith('Category tabs'));
const cntB = ins(CB, tabsB, await countBlock('0 results for “bonus code”', 'We searched all 16 questions and answers', 'Clear search'));
const em = box('Empty state — no results', { p: 24, gap: 16, align: 'CENTER' }); ins(CB, cntB, em);
add(em, await tile('search', { size: 28, p: 12, tint: 'surface/raised', ic: 'icon/muted' }));
add(em, [await T('Nothing matches “bonus code”', 'Heading/H4', 'text/primary', { w: 310, align: 'CENTER' }), 'FILL'], [await T('Try fewer or different words, check the spelling, or browse a category above. These searches do have answers:', 'Body/S', 'text/secondary', { w: 310, align: 'CENTER' }), 'FILL']);
const sg = await chips(['platform fee', 'withdrawal time', 'verify a draw'], 'Suggested searches'); sg.primaryAxisAlignItems = 'CENTER'; add(em, [sg, 'FILL']);
add(em, [await BTN('Secondary', 'Clear search', { size: 'L', lead: 'x' }), 'FILL']);
const pr = box('Card — Looking for a promotion', { p: 20, gap: 12 }); ins(CB, em, pr);
const ph = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(ph, await tile('gift'), [await T('Looking for a promotion?', 'Heading/H5', 'text/primary', { w: 200 }), 'FILL'], await I('6:159')); add(pr, [ph, 'FILL']);
add(pr, [await T('Welcome offers don’t need a code. The welcome offer, daily rewards, rakeback and tournaments — each with its key terms — are on the Promotions page. 18+. Terms apply.', 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
add(pr, [await BTN('Secondary', 'See promotions', { size: 'L', trail: 'arrow-right' }), 'FILL']);
const pop = AL('VERTICAL', { name: 'Popular questions', gap: 12 }); ins(CB, pr, pop);
add(pop, [await T('Popular questions', 'Heading/H5', 'text/primary', { w: 358 }), 'FILL']);
const pl = box('Card — Popular questions', { p: [4, 16, 4, 16], gap: 0 }); add(pop, [pl, 'FILL']);
const POP = ['What does the 0.05 USDT platform fee cover?', 'How long does a withdrawal take?', 'How can I verify a Global Pool draw?'];
for (let i = 0; i < POP.length; i++) { const r = AL('HORIZONTAL', { name: 'Row — ' + POP[i].slice(0, 30), gap: 12, align: 'CENTER', p: [14, 0, 14, 0] }); if (i < POP.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, await T('0' + (i + 1), 'Label/M', 'text/tertiary'), [await T(POP[i], 'Body/M', 'text/primary', { w: 250 }), 'FILL'], await IC('chevron-right', 20, 'icon/muted')); add(pl, [r, 'FILL']); }
// place B below A once A has its final height
B.y = A.y + A.height + 160;
fitSection(sec);
const audits = [A, B].map(f => ({ id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), x: f.x, y: f.y, overflow: overflowList(f).slice(0, 10) }));
let shots = 0; shots += await vshots(A, 0.7, 2140); shots += await vshots(B, 0.7, 2140);
return { section: sec.id, created: CREATED, audits, notes: NOTES, shots };
