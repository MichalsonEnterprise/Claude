// ===== AUTH-12 Personal details (VALID=false → Default, true → Validation) =====
async function build(VALID) {
  const NAME = 'AUTH-12 KYC Personal Details / 1440 / ' + (VALID ? 'Validation' : 'Default');
  if (sec.children.find(c => c.name === NAME)) return { skipped: NAME };

const { d, side, main } = await dialog({ over: 'Step 2 of 5 · Details', st: 'Why we ask', sb: 'Licensed operators must confirm who their players are. We match what you enter here with your ID document automatically.', artName: 'ID card with name highlighted', chip: ['Approved', 'L1'], step: 1,
  art: async (a) => { band(a, 120, 'mint/700', 160, -10); band(a, 98, 'brand/primary', 14, -10); await idCard(a, 46, 56, -6, { hl: true }); },
  facts: [['id-card', 'Use your legal name exactly as on your ID, including middle names'], ['calendar', 'Date format DD / MM / YYYY — you must be 18 or older'], ['shield-check', 'We never run a credit check or share your details for marketing']] });
const tb = box(main, 'VERTICAL', { name: 'Title', gap: 8 });
await tx(tb, 'Confirm your personal details', 'Heading/H3', 'text/primary');
await tx(tb, 'Enter them exactly as they appear on your ID document. You can change them until you submit.', 'Body/M', 'text/secondary');
if (VALID) {
  const es = box(main, 'HORIZONTAL', { name: 'Error summary', gap: 12, p: 16, fill: 'status/danger-tint', stroke: 'border/danger', r: 14 }); es.appendChild(await IC('x-circle', 20, 'status/danger'));
  const ec = box(es, 'VERTICAL', { name: 'Copy', gap: 6 }); await tx(ec, '4 fields need your attention before you can continue', 'Label/L', 'text/primary');
  for (const s of ['Last name(s) — enter your full last name', 'Date of birth — you must be 18 or older', 'Postal code — use the format 0000-000', 'Confirm that your details are accurate']) await li(ec, 'arrow-right', s, { is: 14, ic: 'status/danger', st: 'Body/S', c: 'text/danger', gap: 8 });
}
const form = box(main, 'VERTICAL', { name: 'Form', gap: 16 });
async function inp(label, value, state, helper, o = {}) { const p = { Label: label, 'Show leading icon': false, 'Show helper': !!helper }; if (o.trail) { p['Show trailing icon'] = true; p['Trailing icon'] = ICONS[o.trail]; } else p['Show trailing icon'] = false; const n = await I('13:762', { State: state, Size: 'M' }, p); n.name = 'Input/Text — ' + label; await setT(n, 'Value text', value); if (helper) await setT(n, 'Helper text', helper); return n; }
async function sel(label, value, helper, state = 'Default') { const n = await I('13:565', { State: state }, { Label: label, Value: value, 'Show helper': !!helper, 'Show leading icon': false }); n.name = 'Select/Field — ' + label; if (helper) await setT(n, 'Helper text', helper); return n; }
function frow(nodes) { const r = box(form, 'HORIZONTAL', { name: 'Field row', gap: 20 }); for (const n of nodes) { r.appendChild(n); n.layoutSizingHorizontal = 'FILL'; } return r; }
frow([await inp('First name(s)', 'Nova', 'Filled', 'As on your ID, including middle names'), VALID ? await inp('Last name(s)', 'K.', 'Error', "Enter your full last name as shown on your ID — initials aren't accepted.") : await inp('Last name(s)', 'Karlsson', 'Filled', 'As on your ID')]);
frow([VALID ? await inp('Date of birth', '14 / 03 / 2010', 'Error', 'You must be 18 or older to verify. This date makes you 16.', { trail: 'calendar' }) : await inp('Date of birth', '14 / 03 / 1994', 'Filled', 'DD / MM / YYYY', { trail: 'calendar' }), await sel('Nationality', 'Portugal', 'As shown on your ID document')]);
frow([await inp('Residential address', 'Rua do Exemplo 12, 3.º Esq.', 'Filled', 'Street, number and floor — no PO boxes')]);
frow([await inp('City', 'Lisboa', 'Filled', null), VALID ? await inp('Postal code', '11000', 'Error', 'Use the format 0000-000, e.g. 1100-001.') : await inp('Postal code', '1100-001', 'Filled', 'Format 0000-000')]);
frow([await sel('Country of residence', 'Portugal', 'Permitted region · matches your account'), await sel('Occupation', 'Software developer', 'Required by anti-money-laundering rules')]);
const pep = box(form, 'VERTICAL', { name: 'PEP declaration', gap: 8, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
await tx(pep, 'Are you a politically exposed person (PEP)?', 'Label/L', 'text/primary');
await tx(pep, 'A PEP holds, or held in the last 12 months, a prominent public role — or is a close family member or associate of someone who does. Answering yes does not stop you verifying.', 'Caption', 'text/secondary');
const pr = box(pep, 'HORIZONTAL', { name: 'Answer (no default selection)', gap: 16 });
for (const [lab, ds, on] of [['No', 'I am not a PEP', VALID], ['Yes', 'I am a PEP or closely related to one', false]]) { const r = await I('20:3259', { Selected: on ? 'Yes' : 'No', State: 'Default' }, { Label: lab, Description: ds, 'Show description': true }); r.name = 'Control/Radio — ' + lab; pr.appendChild(r); r.layoutSizingHorizontal = 'FILL'; }
const cb = await I('20:3205', { Value: 'Unchecked', State: VALID ? 'Error' : 'Default' }, { Label: 'I confirm these details are accurate and belong to me', 'Show description': true }); cb.name = 'Control/Checkbox — accuracy declaration (unchecked)'; form.appendChild(cb); cb.layoutSizingHorizontal = 'FILL';
await setT(cb, 'Description', 'Giving false information can lead to your verification being refused and your account being closed.'); if (VALID) await setT(cb, 'Helper text', 'Please confirm your details are accurate.');
await footer(main, [await BTN('Secondary', 'Back', { size: 'L', lead: 'arrow-left' })], VALID ? 'Fix the 4 highlighted fields to continue. Nothing has been submitted yet.' : 'Saved automatically · 27 Nov 2026, 16:44 UTC', [await BTN('Primary', 'Continue', { size: 'L', trail: 'arrow-right' })]);
const f = await shell('AUTH-12 KYC Personal Details / 1440 / ' + (VALID ? 'Validation' : 'Default'), 1, d);
await f.screenshot({ scale: 0.5 });
return { frame: f.id, size: [f.width, f.height], dlg: [d.width, d.height] };

}
const __out = [];
for (const __m of [false, true]) __out.push(await build(__m));
return __out;
