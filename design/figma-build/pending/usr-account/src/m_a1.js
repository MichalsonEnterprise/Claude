async function ma1() {
const NAME = '[USR-A1] Personal Information / 390 / Edit';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellM(NAME, { back: 'Account', title: 'Personal information', sub: 'Details checked during verification are locked. Contact support to correct them.' });
const C = S.C;
async function inp(label, value, o = {}) { return await tryy('Input ' + label, async () => { const i = await I('13:762', { State: o.state || 'Filled', Size: 'L' }, { Label: label, 'Show label': true, 'Show leading icon': !!o.lead, 'Show trailing icon': !!o.trail, 'Show helper': !!o.helper, ...(o.lead ? { 'Leading icon': ICONS[o.lead] } : {}), ...(o.trail ? { 'Trailing icon': ICONS[o.trail] } : {}) }); await byLayer(i, { 'Value text': value, ...(o.helper ? { 'Helper text': o.helper } : {}) }); i.name = 'Input — ' + label; return i; }); }
const pc = card('Card — Profile & contact', { gap: 16, p: 16 }); add(C, [pc, 'FILL']);
const hh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(pc, [hh, 'FILL']); add(hh, [await T('Profile & contact', 'Heading/H5', 'text/primary'), 'FILL']); hh.appendChild(await tag('Editing', 'text/brand'));
for (const x of [
  await inp('Display name', 'Nova K.', { helper: 'Shown in winner feeds next to @nova.k.' }),
  await inp('Username', '@nova.k', { state: 'Disabled', trail: 'lock', helper: 'Next change from 14 Dec 2026' }),
  await inp('Email', 'n•••@example.com', { lead: 'mail' }),
  await inp('Phone number', '+351 912 345 731', { state: 'Focus', lead: 'smartphone', helper: 'We send a code to confirm. Never used for 2FA.' }),
  await inp('Residential address', 'Rua das Flores 12, 2.º, Lisboa'),
  await inp('Postcode', '1200-195'),
]) if (x) add(pc, [x, 'FILL']);
for (const [l, v] of [['Language', 'English'], ['Time zone', 'Europe/Lisbon (UTC+00:00)']]) { const s = await tryy('select ' + l, () => I('13:565', { State: 'Default' }, { Label: l, Value: v, 'Show helper': false, 'Show leading icon': false })); if (s) add(pc, [s, 'FILL']); }
const vc = card('Card — Verified identity', { gap: 4, p: 16 }); add(C, [vc, 'FILL']);
const vh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(vc, [vh, 'FILL']); add(vh, [await T('Verified identity', 'Heading/H5', 'text/primary'), 'FILL']);
const kc = await tryy('kyc', () => I('23:5565', { Status: 'Approved', Level: 'L2' })); if (kc) vh.appendChild(kc);
for (const [l, v] of [['Legal name', 'Nova Kade'], ['Date of birth', '14 Mar 1994'], ['Country', 'Portugal · permitted'], ['Nationality', 'Portuguese']]) add(vc, [await kv(l, v, { extra: [await IC('lock', 14, 'icon/muted')] }), 'FILL']);
add(vc, [await BTN('Ghost', 'Request a correction', { size: 'S', trail: 'chevron-right' })]);
await licM(C);
await endM(S, { cta: [await BTN('Secondary', 'Cancel', { size: 'L' }), await BTN('Primary', 'Save changes', { size: 'L' })] });
await placeM(S.f, sec, 1); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
