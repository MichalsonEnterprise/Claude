// ===== AUTH-17 Rejected (MODE: 'Reasons' | 'Resubmit') =====
async function build(MODE) {
  const NAME = 'AUTH-17 KYC Rejected / 1440 / ' + MODE;
  if (sec.children.find(c => c.name === NAME)) return { skipped: NAME };
  const RS = MODE === 'Resubmit';

async function stamp(p, x, y, s, c, rot) { const b = AL('HORIZONTAL', { name: 'Stamp — ' + s, p: [8, 14, 8, 14], r: 6, stroke: c, sw: 3, fill: 'bg/secondary', gap: 6, align: 'CENTER' }); p.appendChild(b); b.appendChild(await T(s, 'Label/L', c)); b.x = x; b.y = y; b.rotation = rot; return b; }
const { d, side, main } = await dialog(RS ? { over: 'Resubmission', st: 'Only 2 things to redo', sb: 'We kept everything that passed, so this takes about 3 minutes.', artName: 'ID card marked resubmit', chip: ['Rejected', 'L2'], step: 4, so: { err: 2 },
    art: async (a) => { band(a, 118, 'mint/700', 160, -12); band(a, 94, 'brand/primary', 14, -12); await passport(a, 186, 30, 10); await idCard(a, 16, 90, -8); },
    facts: [['check-circle', 'Selfie video — passed, kept'], ['check-circle', 'Date of birth and address — passed, kept'], ['clock', 'Review usually under 10 minutes, up to 24 h']] }
  : { over: 'Level 2 · Not approved yet', st: 'You can fix this', sb: 'Most resubmissions are approved on the next try. Your Level 1 account keeps working meanwhile.', artName: 'ID card marked resubmit', chip: ['Rejected', 'L2'], step: 4, so: { err: 2 },
    art: async (a) => { band(a, 118, 'mint/700', 160, -12); band(a, 94, 'brand/primary', 14, -12); await idCard(a, 40, 60, -6); await stamp(a, 156, 150, 'RESUBMIT', 'status/danger', 8); },
    facts: [['check-circle', 'Only redo what failed — your selfie video passed'], ['clock', 'Resubmissions are reviewed in under 10 minutes, up to 24 h'], ['wallet', 'Deposits, play and withdrawals up to 2,000.00 USDT a day still work'], ['chat', 'Think we got it wrong? Ask a specialist to re-check']] });
const tb = box(main, 'HORIZONTAL', { name: 'Status hero', gap: 16 });
const it = AL('HORIZONTAL', { name: 'State icon', w: 56, h: 56, r: 14, fill: RS ? 'brand/tint' : 'status/danger-tint', justify: 'CENTER', align: 'CENTER' }); tb.appendChild(it); it.appendChild(await IC(RS ? 'edit' : 'alert-triangle', 28, RS ? 'icon/brand' : 'status/danger'));
const hc = box(tb, 'VERTICAL', { name: 'Copy', gap: 6 });
const ol = box(hc, 'HORIZONTAL', { name: 'Overline row', gap: 8, align: 'CENTER' }); ol.appendChild(await T(RS ? 'Fix and resubmit · reference KYC-48213-1127' : 'Reviewed 27 Nov 2026, 17:21 UTC · reference KYC-48213-1127', 'Overline', RS ? 'text/brand' : 'text/danger')); ol.appendChild(await DEMO('XS'));
await tx(hc, RS ? 'Fix 2 items and submit again' : 'We couldn’t verify your ID yet', 'Heading/H3', 'text/primary');
await tx(hc, RS ? 'Your last name and a valid document. Everything else from your first submission is kept.' : 'We found 3 issues with the document you sent. Fix them and resubmit — it takes about 3 minutes.', 'Body/M', 'text/secondary');
if (!RS) {
  const rl = box(main, 'VERTICAL', { name: 'Reasons (category + what we found + how to fix)', gap: 12 });
  for (const [ic, cat, found, fix, act] of [
    ['calendar', 'Document expired', 'The national ID card expired on 02 Jan 2026. We can only accept documents that are valid on the day you submit.', 'Upload a valid document. If your ID card is being renewed, your passport or driving licence works too.', 'Upload a different document'],
    ['eye-off', 'Photo too blurry', 'The back of the card was out of focus, so the document number and the machine-readable lines couldn’t be read.', 'Lay the card flat on a dark surface, turn the flash off and tap to focus before you take the photo.', 'See photo tips'],
    ['user-x', 'Name doesn’t match', 'The document shows KARLSSON-SILVA, but your profile says Karlsson.', 'If your legal name has changed, update your last name to match your ID. We re-check it automatically.', 'Edit personal details']]) {
    const c = box(rl, 'HORIZONTAL', { name: 'Reason — ' + cat, gap: 16, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
    const t = AL('HORIZONTAL', { name: 'Icon', w: 40, h: 40, r: 10, fill: 'status/danger-tint', justify: 'CENTER', align: 'CENTER' }); c.appendChild(t); t.appendChild(await IC(ic, 20, 'status/danger'));
    const cc = box(c, 'VERTICAL', { name: 'Copy', gap: 6 }); const h = box(cc, 'HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); h.appendChild(await T(cat, 'Label/L', 'text/primary')); const bd = await BADGE('Rejected', 'S'); await setT(bd, 'Label', 'Needs fixing'); h.appendChild(bd);
    await tx(cc, found, 'Body/S', 'text/secondary');
    const fx3 = box(cc, 'HORIZONTAL', { name: 'How to fix', gap: 8, p: [10, 12, 10, 12], fill: 'surface/raised', r: 10 }); fx3.appendChild(await IC('wrench', 16, 'icon/brand')); const fc = box(fx3, 'VERTICAL', { name: 'Copy', gap: 2 }); await tx(fc, 'How to fix', 'Label/S', 'text/brand'); await tx(fc, fix, 'Body/S', 'text/primary');
    cc.appendChild(await T(act + ' →', 'Label/M', 'text/brand'));
  }
  const ps = box(main, 'HORIZONTAL', { name: 'What passed', gap: 16, align: 'CENTER', wrap: true, cgap: 8 }); ps.appendChild(await T('Passed:', 'Label/M', 'text/tertiary'));
  for (const s of ['Selfie video', 'Date of birth', 'Address', 'Sanctions & PEP screening']) { const r = box(ps, 'HORIZONTAL', { name: 'Passed — ' + s, gap: 6, align: 'CENTER' }, 'HUG'); r.appendChild(await IC('check-circle', 16, 'status/success')); r.appendChild(await T(s, 'Label/M', 'text/primary')); }
  await footer(main, [await BTN('Ghost', 'Ask for a re-check', { size: 'L', lead: 'chat' })], 'Your Level 1 limits stay active: up to 2,000.00 USDT a day.', [await BTN('Primary', 'Fix and resubmit', { size: 'L', trail: 'arrow-right' })]);
} else {
  async function sect(n, title, badge) { const c = box(main, 'VERTICAL', { name: 'Item ' + n + ' — ' + title, gap: 12, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); const h = box(c, 'HORIZONTAL', { name: 'Head', gap: 10, align: 'CENTER' }); const b = AL('HORIZONTAL', { name: 'Number', w: 24, h: 24, r: 9999, fill: 'brand/tint', justify: 'CENTER', align: 'CENTER' }); h.appendChild(b); b.appendChild(await T(String(n), 'Label/S', 'text/brand')); await tx(h, title, 'Label/L', 'text/primary'); const bd = await BADGE(badge[0], 'S'); await setT(bd, 'Label', badge[1]); h.appendChild(bd); return c; }
  const s1 = await sect(1, 'Update your last name', ['Approved', 'Fixed']);
  const r1 = box(s1, 'HORIZONTAL', { name: 'Fields', gap: 20 });
  for (const [lab, val, st, hp] of [['First name(s)', 'Nova', 'Filled', 'Unchanged'], ['Last name(s)', 'Karlsson-Silva', 'Success', 'Now matches your document']]) { const n = await I('13:762', { State: st, Size: 'M' }, { Label: lab, 'Show leading icon': false, 'Show trailing icon': false, 'Show helper': true }); n.name = 'Input/Text — ' + lab; await setT(n, 'Value text', val); await setT(n, 'Helper text', hp); r1.appendChild(n); n.layoutSizingHorizontal = 'FILL'; }
  const s2 = await sect(2, 'Upload a valid document', ['Approved', 'Fixed']);
  await li(s2, 'id-card', 'Passport · issued in Portugal · valid until 03 May 2034 · photo page only', { ic: 'icon/brand', c: 'text/primary', st: 'Label/M' });
  const up = await I('20:9454', { State: 'Uploaded' }, { Label: 'Passport — photo page', Description: 'All four corners visible, no glare', 'Show privacy note': false }); up.name = 'Input/File Upload — passport (Uploaded)'; await setT(up, 'File name', 'passport_photo_page.jpg'); await setT(up, 'Meta text', 'Uploaded · 2.9 MB · all quality checks passed'); s2.appendChild(up); up.layoutSizingHorizontal = 'FILL';
  const s3 = await sect(3, 'Selfie video', ['Neutral', 'Kept']); await li(s3, 'check-circle', 'Passed on 27 Nov 2026 — you don’t need to record it again.', { ic: 'status/success', is: 16 });
  const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I confirm these details are accurate and belong to me', 'Show description': true }); cb.name = 'Control/Checkbox — accuracy declaration (unchecked)'; main.appendChild(cb); cb.layoutSizingHorizontal = 'FILL'; await setT(cb, 'Description', 'Giving false information can lead to your verification being refused and your account being closed.');
  await footer(main, [await BTN('Secondary', 'Back', { size: 'L', lead: 'arrow-left' })], 'Tick the confirmation to submit. Review usually takes under 10 minutes, up to 24 h.', [await BTN('Primary', 'Submit again', { size: 'L', state: 'Disabled', lead: 'check' })]);
}
const f = await shell('AUTH-17 KYC Rejected / 1440 / ' + MODE, 6, d);
await f.screenshot({ scale: 0.5 });
return { frame: f.id, size: [f.width, f.height], dlg: [d.width, d.height] };

}
const __out = [];
for (const __m of ['Reasons', 'Resubmit']) __out.push(await build(__m));
return __out;
