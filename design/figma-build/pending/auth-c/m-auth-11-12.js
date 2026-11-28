// ===== Mobile AUTH-11 Intro (MODE 'Intro') / AUTH-12 Details (MODE 'Default' | 'Validation') =====
async function build(MODE) {
  const NAME = MODE === 'Intro' ? 'AUTH-11 KYC Intro & levels / 390 / Default' : 'AUTH-12 KYC Personal Details / 390 / ' + MODE;
  if (sec.children.find(c => c.name === NAME)) return { skipped: NAME };

if (MODE === 'Intro') {
  const { f, body } = await mscreen('AUTH-11 KYC Intro & levels / 390 / Default', 0, { chip: ['Approved', 'L1'], step: 0 });
  await artBanner(body, 'ID card and passport', 150, async (a) => { band(a, 96, 'mint/700', 150, -12); band(a, 74, 'brand/primary', 12, -12); const pp = figma.createFrame(); pp.name = 'Illustration — passport (DEMO)'; pp.resize(120, 160); fill(pp, 'mint/800'); radius(pp, 10); a.appendChild(pp); R(pp, 0, 0, 12, 160, 'mint/900', 0, 'Spine'); await TT(pp, 30, 22, 'PASSPORT', 'Overline', 'mint/400'); const g = await IC('globe', 48, 'mint/400'); pp.appendChild(g); g.x = 42; g.y = 56; pp.x = 230; pp.y = 18; pp.rotation = 10; await idCard(a, 24, 50, -8); });
  const hd = box(body, 'VERTICAL', { name: 'Title', gap: 8 }); await tx(hd, 'Level 2 verification', 'Overline', 'text/brand'); await tx(hd, 'Verify your identity to raise your limits', 'Heading/H4', 'text/primary'); await tx(hd, "You're on Level 1 — Basic. Level 2 takes about 5 minutes: your details, one ID document and a 10-second selfie video.", 'Body/S', 'text/secondary');
  const lv = box(body, 'VERTICAL', { name: 'Levels (stacked cards instead of table)', gap: 12 });
  const lh = box(lv, 'HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); await tx(lh, 'Levels and daily limits', 'Heading/H5', 'text/primary'); lh.appendChild(await DEMO('M'));
  for (const L of [{ n: 'Level 1 · Basic', b: ['Approved', 'Completed'], p: 'Name, date of birth and address', dep: '2,000.00 USDT', wd: '2,000.00 USDT', t: 'Instant' }, { n: 'Level 2 · Verified', b: ['New', 'Next step'], hl: true, p: '+ ID document and 10-second selfie video', dep: '25,000.00 USDT', wd: '25,000.00 USDT', t: 'Usually under 10 min, up to 24 h' }, { n: 'Level 3 · Enhanced', b: ['Neutral', 'On request'], p: '+ Proof of address and source of funds', dep: 'Set individually', wd: 'Set individually', t: 'Up to 3 business days' }]) {
    const c = box(lv, 'VERTICAL', { name: 'Level card — ' + L.n, gap: 10, p: 16, fill: L.hl ? 'surface/selected' : 'surface/default', stroke: L.hl ? 'border/brand' : 'border/subtle', sw: L.hl ? 2 : 1, r: 14 });
    const h = box(c, 'HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); await tx(h, L.n, 'Label/L', L.hl ? 'text/brand' : 'text/primary'); const bd = await BADGE(L.b[0], 'S'); await setT(bd, 'Label', L.b[1]); h.appendChild(bd);
    await tx(c, L.p, 'Body/S', 'text/secondary');
    for (const [k, v] of [['Deposits per day', L.dep], ['Withdrawals per day', L.wd], ['Review time', L.t]]) { const r = box(c, 'HORIZONTAL', { name: 'Row — ' + k, gap: 8, align: 'CENTER' }); await tx(r, k, 'Caption', 'text/tertiary'); r.appendChild(await T(v, /USDT$/.test(v) ? 'Number/S' : 'Label/M', 'text/primary')); }
  }
  const nd = box(body, 'VERTICAL', { name: "What you'll need", gap: 12 }); await tx(nd, 'What you’ll need', 'Heading/H5', 'text/primary');
  for (const [ic, s] of [['id-card', 'One valid ID: passport, national ID card or driving licence'], ['camera', 'Your phone camera for a 10-second selfie video'], ['clock', 'About 5 minutes · review usually under 10 minutes, up to 24 h']]) await li(nd, ic, s);
  const pv = box(body, 'VERTICAL', { name: 'Data privacy notice', gap: 8, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); await li(pv, 'shield', 'How we handle your data', { st: 'Label/L', c: 'text/primary' });
  await tx(pv, 'Documents and video are encrypted and processed by our verification partner ([Partner name] — DEMO placeholder) only for identity and AML checks. Kept 5 years after account closure as the law requires; face data deleted within 30 days of a decision. Never used for marketing.', 'Body/S', 'text/secondary');
  const pl = box(pv, 'HORIZONTAL', { name: 'Links', gap: 20 }, 'HUG'); for (const s of ['AML/KYC Policy', 'Privacy Policy']) pl.appendChild(await T(s, 'Label/M', 'text/brand'));
  const lr = box(body, 'HORIZONTAL', { name: 'Licence & 18+', gap: 8, align: 'CENTER' }, 'HUG'); lr.appendChild(await I('6:159')); lr.appendChild(await I('6:158', { Variant: 'Compact' }));
  await mfinish(f, { cta: [await BTN('Primary', 'Start Level 2', { size: 'L', trail: 'arrow-right' })], note: 'On Level 1 you can still deposit, play and withdraw up to 2,000.00 USDT a day.', tab: true });
  await f.screenshot({ scale: 0.5 }); return { frame: f.id, size: [f.width, f.height] };
} else {
  const V = MODE === 'Validation';
  const { f, body } = await mscreen('AUTH-12 KYC Personal Details / 390 / ' + MODE, 1, { chip: ['Approved', 'L1'], step: 1 });
  const hd = box(body, 'VERTICAL', { name: 'Title', gap: 8 }); await tx(hd, 'Confirm your personal details', 'Heading/H4', 'text/primary'); await tx(hd, 'Exactly as on your ID document. You can change them until you submit.', 'Body/S', 'text/secondary');
  if (V) { const es = box(body, 'HORIZONTAL', { name: 'Error summary', gap: 10, p: 14, fill: 'status/danger-tint', stroke: 'border/danger', r: 14 }); es.appendChild(await IC('x-circle', 20, 'status/danger')); const ec = box(es, 'VERTICAL', { name: 'Copy', gap: 4 }); await tx(ec, '4 fields need your attention', 'Label/L', 'text/primary'); await tx(ec, 'Last name · Date of birth · Postal code · Accuracy confirmation', 'Body/S', 'text/danger'); }
  const fm = box(body, 'VERTICAL', { name: 'Form (single column, 48 px fields)', gap: 14 });
  async function inp(label, value, state, helper, trail) { const p = { Label: label, 'Show leading icon': false, 'Show helper': !!helper, 'Show trailing icon': !!trail }; if (trail) p['Trailing icon'] = ICONS[trail]; const n = await I('13:762', { State: state, Size: 'L' }, p); n.name = 'Input/Text L — ' + label; await setT(n, 'Value text', value); if (helper) await setT(n, 'Helper text', helper); fm.appendChild(n); n.layoutSizingHorizontal = 'FILL'; return n; }
  async function sel(label, value, helper) { const n = await I('13:565', { State: 'Default' }, { Label: label, Value: value, 'Show helper': !!helper, 'Show leading icon': false }); n.name = 'Select/Field — ' + label; if (helper) await setT(n, 'Helper text', helper); fm.appendChild(n); n.layoutSizingHorizontal = 'FILL'; return n; }
  await inp('First name(s)', 'Nova', 'Filled', 'As on your ID, including middle names');
  if (V) await inp('Last name(s)', 'K.', 'Error', "Enter your full last name — initials aren't accepted."); else await inp('Last name(s)', 'Karlsson', 'Filled', 'As on your ID');
  if (V) await inp('Date of birth', '14 / 03 / 2010', 'Error', 'You must be 18 or older. This date makes you 16.', 'calendar'); else await inp('Date of birth', '14 / 03 / 1994', 'Filled', 'DD / MM / YYYY', 'calendar');
  await sel('Nationality', 'Portugal', 'As shown on your ID document');
  await inp('Residential address', 'Rua do Exemplo 12, 3.º Esq.', 'Filled', 'Street, number and floor — no PO boxes');
  await inp('City', 'Lisboa', 'Filled', null);
  if (V) await inp('Postal code', '11000', 'Error', 'Use the format 0000-000, e.g. 1100-001.'); else await inp('Postal code', '1100-001', 'Filled', 'Format 0000-000');
  await sel('Country of residence', 'Portugal', 'Permitted region · matches your account'); await sel('Occupation', 'Software developer', 'Required by anti-money-laundering rules');
  const pep = box(fm, 'VERTICAL', { name: 'PEP declaration', gap: 8, p: 14, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); await tx(pep, 'Are you a politically exposed person (PEP)?', 'Label/L', 'text/primary'); await tx(pep, 'Someone with a prominent public role in the last 12 months, or a close family member or associate. Answering yes doesn’t stop you verifying.', 'Caption', 'text/secondary');
  for (const [lab, ds, on] of [['No', 'I am not a PEP', V], ['Yes', 'I am a PEP or closely related to one', false]]) { const r = await I('20:3259', { Selected: on ? 'Yes' : 'No', State: 'Default' }, { Label: lab, Description: ds, 'Show description': true }); r.name = 'Control/Radio — ' + lab; pep.appendChild(r); r.layoutSizingHorizontal = 'FILL'; }
  const cb = await I('20:3205', { Value: 'Unchecked', State: V ? 'Error' : 'Default' }, { Label: 'I confirm these details are accurate and belong to me', 'Show description': true }); cb.name = 'Control/Checkbox — accuracy declaration (unchecked)'; fm.appendChild(cb); cb.layoutSizingHorizontal = 'FILL'; await setT(cb, 'Description', 'False information can lead to refusal and account closure.'); if (V) await setT(cb, 'Helper text', 'Please confirm your details are accurate.');
  await mfinish(f, { cta: [await BTN('Primary', 'Continue', { size: 'L', trail: 'arrow-right' })], note: V ? 'Fix the 4 highlighted fields to continue.' : 'Saved automatically · 16:44 UTC' });
  await f.screenshot({ scale: 0.5 }); return { frame: f.id, size: [f.width, f.height] };
}

}
const __out = [];
for (const __m of ['Intro', 'Default', 'Validation']) __out.push(await build(__m));
return __out;
