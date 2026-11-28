// Section notes (first call only)
if (!sec.children.find(c => c.name.startsWith('Notes —'))) {
  const n = AL('VERTICAL', { name: 'Notes — AUTH-11…17 KYC', gap: 8, p: [24, 32, 24, 32], fill: 'surface/default', r: 14, w: 1440 }); sec.appendChild(n); n.x = 120; n.y = 120;
  await tx(n, 'AUTH-11…17 · KYC verification — Level 2 flow for @nova.k (DEMO)', 'Heading/H4', 'text/primary');
  await tx(n, 'Pattern: KYC dialog (context panel + 5-step wizard) over the dimmed member lobby (Shell/Sidebar + Shell/Topbar Member + scrim), the same dialog pattern as AUTH-01…04. Columns follow the flow Intro → Details → Document → Liveness → Pending → Approved → Rejected; states stack below their default. Mobile 390 frames: page 10, section "AUTH — Mobile C". Limits are symmetric (L1 2,000.00 / L2 25,000.00 USDT per day for deposits and withdrawals; L3 individual). Processing: usually under 10 minutes, up to 24 h. All names, numbers and documents are DEMO.', 'Body/S', 'text/secondary');
}
// ===== AUTH-11 Intro & levels =====
if (sec.children.find(c => c.name === 'AUTH-11 KYC Intro & levels / 1440 / Default')) return { skipped: 'AUTH-11 / 1440 / Default' };
const { d, side, main } = await dialog({ over: 'Level 2 verification', st: 'Higher limits in about 5 minutes', sb: 'Our licence requires an ID check before daily limits go above 2,000.00 USDT. One document and one short selfie video.', artName: 'ID card and passport', chip: ['Approved', 'L1'], step: 0,
  art: async (a) => { band(a, 128, 'mint/700', 150); band(a, 104, 'brand/primary', 14); await passport(a, 196, 26, 12); await idCard(a, 20, 92, -8); },
  facts: [['shield-check', 'Checked against your ID document — never your credit file'], ['user-check', 'A specialist reviews it if the automated check is unsure'], ['smartphone', 'Progress is saved — finish on any device']] });
const tb = box(main, 'VERTICAL', { name: 'Title', gap: 8 });
await tx(tb, 'Verify your identity to raise your limits', 'Heading/H3', 'text/primary');
await tx(tb, "You're on Level 1 — Basic. Level 2 takes about 5 minutes: confirm your details, upload one ID document and record a 10-second selfie video.", 'Body/M', 'text/secondary');
const lt = box(main, 'VERTICAL', { name: 'Levels table', gap: 12 });
const lh = box(lt, 'HORIZONTAL', { name: 'Table title', gap: 8, align: 'CENTER' }); lh.appendChild(await T('Verification levels and daily limits', 'Heading/H5', 'text/primary')); box(lh, 'HORIZONTAL', { name: 'Spacer', h: 1 }); lh.appendChild(await DEMO('M'));
const tbl = box(lt, 'HORIZONTAL', { name: 'Table', fill: 'surface/default', stroke: 'border/subtle', r: 14, clip: true });
const RW = [['', 72], ['You provide', 76], ['Deposits per day', 52], ['Withdrawals per day', 52], ['Review time', 60]];
const lc = box(tbl, 'VERTICAL', { name: 'Row labels', w: 168 }, 'HUG');
for (let i = 0; i < RW.length; i++) { const c = AL('VERTICAL', { name: 'Label cell', p: [0, 16, 0, 20], justify: 'CENTER', w: 168, h: RW[i][1] }); lc.appendChild(c); if (i < RW.length - 1) strokeSides(c, 'border/subtle', { b: 1 }); if (RW[i][0]) await tx(c, RW[i][0], 'Label/M', 'text/tertiary'); }
const COLS = [
  { n: 'Level 1 · Basic', b: ['Approved', 'Completed'], v: ['Name, date of birth and address', '2,000.00 USDT', '2,000.00 USDT', 'Instant'] },
  { n: 'Level 2 · Verified', b: ['New', 'Next step'], hl: true, v: ['+ ID document and 10-second selfie video', '25,000.00 USDT', '25,000.00 USDT', 'Usually under 10 min, up to 24 h'] },
  { n: 'Level 3 · Enhanced', b: ['Neutral', 'On request'], v: ['+ Proof of address and source of funds', 'Set individually', 'Set individually', 'Up to 3 business days'] }];
for (const C of COLS) {
  const col = box(tbl, 'VERTICAL', { name: 'Column — ' + C.n, fill: C.hl ? 'surface/selected' : null }); strokeSides(col, C.hl ? 'border/brand' : 'border/subtle', { l: 1 });
  for (let i = 0; i < RW.length; i++) { const c = AL('VERTICAL', { name: 'Cell', gap: 6, p: [0, 16, 0, 16], justify: 'CENTER', h: RW[i][1] }); col.appendChild(c); c.layoutSizingHorizontal = 'FILL'; if (i < RW.length - 1) strokeSides(c, 'border/subtle', { b: 1 });
    if (i === 0) { await tx(c, C.n, 'Label/L', C.hl ? 'text/brand' : 'text/primary'); const bd = await BADGE(C.b[0], 'S'); c.appendChild(bd); await setT(bd, 'Label', C.b[1]); }
    else { const v = C.v[i - 1]; const isNum = /USDT$/.test(v); await tx(c, v, isNum ? 'Number/S' : 'Body/S', isNum ? 'text/primary' : 'text/secondary'); } }
}
const nd = box(main, 'HORIZONTAL', { name: "What you'll need", gap: 12 });
for (const [ic, h, s] of [['id-card', 'One valid ID document', 'Passport, national ID card or driving licence'], ['camera', 'A camera', 'For a 10-second selfie video on your phone or webcam'], ['clock', 'About 5 minutes', 'Review usually takes under 10 minutes, up to 24 h']]) {
  const c = box(nd, 'VERTICAL', { name: 'Need — ' + h, gap: 8, p: 16, fill: 'surface/raised', r: 14 }); c.layoutSizingVertical = 'FILL'; c.appendChild(await IC(ic, 20, 'icon/brand')); await tx(c, h, 'Label/L', 'text/primary'); await tx(c, s, 'Caption', 'text/secondary'); }
const pv = box(main, 'HORIZONTAL', { name: 'Data privacy notice', gap: 12, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); pv.appendChild(await IC('shield', 20, 'icon/brand'));
const pvc = box(pv, 'VERTICAL', { name: 'Copy', gap: 6 }); await tx(pvc, 'How we handle your data', 'Label/L', 'text/primary');
await tx(pvc, 'Your documents and selfie video are encrypted in transit and at rest, and processed by our verification partner ([Partner name] — DEMO placeholder) only to confirm your identity and meet anti-money-laundering (AML) duties. We keep them for 5 years after your account closes, as the law requires, and never use them for marketing. Face data from the selfie is deleted within 30 days of a decision.', 'Body/S', 'text/secondary');
const pl = box(pvc, 'HORIZONTAL', { name: 'Links', gap: 20 }, 'HUG'); for (const s of ['AML/KYC Policy', 'Privacy Policy', 'Your data rights']) pl.appendChild(await T(s, 'Label/M', 'text/brand'));
await footer(main, [await BTN('Ghost', 'Not now', { size: 'L' })], 'On Level 1 you can still deposit, play and withdraw up to 2,000.00 USDT a day.', [await BTN('Primary', 'Start Level 2', { size: 'L', trail: 'arrow-right' })]);
const f = await shell('AUTH-11 KYC Intro & levels / 1440 / Default', 0, d);
await f.screenshot({ scale: 0.5 });
return { section: sec.id, frame: f.id, dialog: d.id, size: [f.width, f.height], dlg: [d.width, d.height] };
