async function a1(STATE) {
const EDIT = STATE === 'Edit';
const NAME = '[USR-A1] Personal Information / 1440 / ' + (EDIT ? 'Edit' : 'Saved');
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Personal information', { sub: 'Your profile and contact details. Details checked during identity verification are locked — contact support if one of them is wrong.', actions: EDIT ? [] : [await BTN('Secondary', 'Edit details', { size: 'M', lead: 'edit' })] });
const M = S.main;
if (!EDIT) {
  const ok = AL('HORIZONTAL', { name: 'Saved confirmation', gap: 16, p: 20, fill: tk('status/success-tint'), stroke: tk('border/success', 'border/default'), r: 14, align: 'CENTER' }); add(M, [ok, 'FILL']);
  ok.appendChild(await iconTile('check-circle', tk('status/success', 'icon/brand'), 40, 'surface/default'));
  const ot = AL('VERTICAL', { name: 'Text', gap: 2 }); add(ok, [ot, 'FILL']);
  add(ot, [await T('Changes saved · 27 Nov 2026, 18:46 UTC', 'Body/M Strong', 'text/primary', { w: 560 }), 'FILL']);
  add(ot, [await T('Your new phone number is confirmed and your time zone now shows Europe/Lisbon. We emailed a summary of the change to n•••@example.com.', 'Body/S', 'text/secondary', { w: 560 }), 'FILL']);
  ok.appendChild(await DEMO('S'));
}
// Profile card
const pc = card('Card — Profile & contact', { gap: 16 }); add(M, [pc, 'FILL']);
await head(pc, 'Profile & contact', 'Your display name and handle appear in winner feeds. Contact details are never shown to other players.', CW, [EDIT ? await tag('Editing', 'text/brand') : null]);
async function inp(label, value, o = {}) {
  const x = await tryy('Input ' + label, async () => {
    const i = await I('13:762', { State: o.state || 'Filled', Size: 'M' }, { Label: label, 'Show label': true, 'Show leading icon': !!o.lead, 'Show trailing icon': !!o.trail, 'Show helper': !!o.helper, ...(o.lead ? { 'Leading icon': ICONS[o.lead] } : {}), ...(o.trail ? { 'Trailing icon': ICONS[o.trail] } : {}) });
    await byLayer(i, { 'Value text': value, ...(o.helper ? { 'Helper text': o.helper } : {}) }); i.name = 'Input — ' + label; return i; });
  return x;
}
async function sel(label, value) { return await tryy('Select ' + label, async () => { const s = await I('13:565', { State: 'Default' }, { Label: label, Value: value, 'Show helper': false, 'Show leading icon': false }); s.name = 'Select — ' + label; return s; }); }
async function row2(a, b) { const r = AL('HORIZONTAL', { name: 'Field row', gap: 16 }); add(pc, [r, 'FILL']); if (a) add(r, [a, 'FILL']); if (b) add(r, [b, 'FILL']); return r; }
if (EDIT) {
  await row2(await inp('Display name', 'Nova K.', { helper: '3–24 characters. Shown in winner feeds next to @nova.k.' }), await inp('Username', '@nova.k', { state: 'Disabled', trail: 'lock', helper: 'Can change once every 30 days · next change from 14 Dec 2026' }));
  await row2(await inp('Email', 'n•••@example.com', { state: 'Filled', lead: 'mail', helper: 'Changing email asks you to confirm both the old and the new address.' }), await inp('Phone number', '+351 912 345 731', { state: 'Focus', lead: 'smartphone', helper: 'We send a 6-digit code to confirm the new number. Used for support calls only — never for 2FA.' }));
  await row2(await inp('Residential address', 'Rua das Flores 12, 2.º, Lisboa', { helper: 'Moving country? Contact support first — availability depends on your jurisdiction.' }), await inp('Postcode', '1200-195'));
  await row2(await sel('Language', 'English'), await sel('Time zone', 'Europe/Lisbon (UTC+00:00)'));
  const bar = AL('HORIZONTAL', { name: 'Form actions', gap: 12, align: 'CENTER', p: [16, 0, 0, 0] }); strokeSides(bar, 'border/subtle', { t: 1 }); add(pc, [bar, 'FILL']);
  const un = AL('HORIZONTAL', { name: 'Unsaved', gap: 8, align: 'CENTER' }); add(bar, [un, 'FILL']); un.appendChild(await IC('info', 16, 'icon/muted')); un.appendChild(await T('2 unsaved changes: phone number, time zone', 'Body/S', 'text/secondary'));
  bar.appendChild(await BTN('Secondary', 'Cancel', { size: 'M' })); bar.appendChild(await BTN('Primary', 'Save changes', { size: 'M' }));
} else {
  const g = AL('HORIZONTAL', { name: 'Details grid', gap: 32 }); add(pc, [g, 'FILL']);
  const L = AL('VERTICAL', { name: 'Left' }); add(g, [L, 'FILL']); const R = AL('VERTICAL', { name: 'Right' }); add(g, [R, 'FILL']);
  for (const [l, v] of [['Display name', 'Nova K.'], ['Username', '@nova.k'], ['Email', 'n•••@example.com'], ['Language', 'English']]) add(L, [await kv(l, v), 'FILL']);
  add(R, [await kv('Phone number', '+351 9•• ••• 731', { extra: [await chip('check-circle', 'Updated', 'success')] }), 'FILL']);
  for (const [l, v] of [['Residential address', 'Rua das Flores 12, 2.º, Lisboa'], ['Postcode', '1200-195']]) add(R, [await kv(l, v), 'FILL']);
  add(R, [await kv('Time zone', 'Europe/Lisbon (UTC+00:00)', { extra: [await chip('check-circle', 'Updated', 'success')] }), 'FILL']);
}
// Verified identity
const vc = card('Card — Verified identity', { gap: 4 }); add(M, [vc, 'FILL']);
const kc = await tryy('KYC chip', () => I('23:5565', { Status: 'Approved', Level: 'L2' }));
await head(vc, 'Verified identity', 'Checked with KYC Level 2 on 3 Sep 2026. These details can only be corrected by support with a supporting document.', CW, [kc]);
const vg = AL('HORIZONTAL', { name: 'Identity grid', gap: 32, p: [8, 0, 0, 0] }); add(vc, [vg, 'FILL']);
const vL = AL('VERTICAL', { name: 'Left' }); add(vg, [vL, 'FILL']); const vR = AL('VERTICAL', { name: 'Right' }); add(vg, [vR, 'FILL']);
async function lk(l, v) { const lock = await IC('lock', 14, 'icon/muted'); return await kv(l, v, { extra: [lock] }); }
add(vL, [await lk('Legal name', 'Nova Kade'), 'FILL']); add(vL, [await lk('Date of birth', '14 Mar 1994'), 'FILL']);
add(vR, [await lk('Country of residence', 'Portugal · permitted'), 'FILL']); add(vR, [await lk('Nationality', 'Portuguese'), 'FILL']);
const fixr = AL('HORIZONTAL', { name: 'Correction', gap: 12, align: 'CENTER', p: [12, 0, 0, 0] }); add(vc, [fixr, 'FILL']);
add(fixr, [await T('Spotted a mistake? Corrections take 1–2 business days and never affect your balance.', 'Body/S', 'text/tertiary', { w: 520 }), 'FILL']); fixr.appendChild(await BTN('Ghost', 'Request a correction', { size: 'S', trail: 'chevron-right' }));
// Your data
const dc = card('Card — Your data', { gap: 12 }); add(M, [dc, 'FILL']);
await head(dc, 'Your data', 'Download everything we hold about you, or close your account. Closing never locks funds: withdraw first, or we return your balance to your verified address.', CW);
const dr = AL('HORIZONTAL', { name: 'Data actions', gap: 12 }); dc.appendChild(dr);
dr.appendChild(await BTN('Secondary', 'Download my data', { size: 'S', lead: 'download' })); dr.appendChild(await BTN('Ghost', 'Close account', { size: 'S' }));
await footA(S);
if (!EDIT) { const t = await tryy('toast', async () => { const x = await I('30:16872', { Type: 'Success' }); await byLayer(x, { Title: 'Personal information saved', Body: 'Phone number confirmed · 27 Nov 2026, 18:46 UTC', Description: 'Phone number confirmed · 27 Nov 2026, 18:46 UTC' }); return x; }); if (t) floatIn(S.f, t, 1440 - t.width - 24, 128); }
await place(S.f, sec, 0, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
