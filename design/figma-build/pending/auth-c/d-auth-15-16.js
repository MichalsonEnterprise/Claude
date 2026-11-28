// ===== AUTH-15 Pending / AUTH-16 Approved (MODE: 'Pending' | 'Approved') =====
async function build(MODE) {
  const NAME = MODE === 'Approved' ? 'AUTH-16 KYC Approved / 1440 / Default' : 'AUTH-15 KYC Pending / 1440 / Default';
  if (sec.children.find(c => c.name === NAME)) return { skipped: NAME };
  const OK = MODE === 'Approved';

async function stamp(p, x, y, s, c, rot) { const b = AL('HORIZONTAL', { name: 'Stamp — ' + s, p: [8, 14, 8, 14], r: 6, stroke: c, sw: 3, fill: 'bg/secondary', gap: 6, align: 'CENTER' }); p.appendChild(b); b.appendChild(await T(s, 'Label/L', c)); b.x = x; b.y = y; b.rotation = rot; return b; }
function iconTile(ic, bg) { return AL('HORIZONTAL', { name: 'State icon', w: 56, h: 56, r: 14, fill: bg, justify: 'CENTER', align: 'CENTER' }); }
const { d, side, main } = await dialog(OK ? { over: 'Level 2 · Verified', st: 'What changed', sb: 'Your new limits apply now on every network. Nothing else about your account changes.', artName: 'Verified shield over ID card', chip: ['Approved', 'L2'], step: 4, so: { done: true },
    art: async (a) => { band(a, 118, 'mint/700', 160, -12); band(a, 94, 'brand/primary', 14, -12); await idCard(a, 10, 104, -10); const s = await I('23:10035', { Motif: 'Shield' }); a.appendChild(s); s.x = 168; s.y = 46; },
    facts: [['withdraw', 'Withdrawals up to 25,000.00 USDT a day'], ['deposit', 'Deposits up to 25,000.00 USDT a day'], ['calendar', 'We only ask again if your document expires (09 Aug 2031)'], ['sliders', 'Your own deposit limit (5,000.00 USDT a week) still applies']] }
  : { over: 'Submitted · in review', st: 'What happens next', sb: 'Most checks finish in under 10 minutes. A few need a specialist and can take up to 24 hours.', artName: 'ID card in review', chip: ['Pending', 'L2'], step: 4, so: { done: true },
    art: async (a) => { band(a, 118, 'mint/700', 160, -12); band(a, 94, 'brand/primary', 14, -12); await idCard(a, 40, 60, -6); await stamp(a, 150, 150, 'IN REVIEW', 'status/pending', 8); },
    facts: [['refresh', 'Don’t submit again — it would restart the queue'], ['monitor', 'No need to keep this window open'], ['bell', 'We’ll email n•••@example.com and notify you in the app'], ['chat', 'Questions? Live support is available 24/7']] });
const hero = box(main, 'HORIZONTAL', { name: 'Status hero', gap: 16 });
const it = iconTile(); fill(it, OK ? 'status/success-tint' : 'status/pending-tint'); hero.appendChild(it); it.appendChild(await IC(OK ? 'shield-check' : 'hourglass', 28, OK ? 'status/success' : 'status/pending'));
const hc = box(hero, 'VERTICAL', { name: 'Copy', gap: 6 });
const ol = box(hc, 'HORIZONTAL', { name: 'Overline row', gap: 8, align: 'CENTER' }); ol.appendChild(await T(OK ? 'Approved · 27 Nov 2026, 17:06 UTC' : 'Pending review · submitted 27 Nov 2026, 16:58 UTC', 'Overline', OK ? 'text/success' : 'status/pending')); ol.appendChild(await DEMO('XS'));
await tx(hc, OK ? 'You’re verified — Level 2' : 'We’re reviewing your documents', 'Heading/H3', 'text/primary');
await tx(hc, OK ? 'Thanks, Nova. Your identity is confirmed and your higher limits are active now.' : 'Reference KYC-48213-1127. You don’t need to do anything else right now.', 'Body/M', 'text/secondary');
if (!OK) {
  const pc = box(main, 'HORIZONTAL', { name: 'Processing time & progress', gap: 24, p: 20, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
  const tl = box(pc, 'VERTICAL', { name: 'Processing time', gap: 6, w: 220 }, 'HUG'); await tx(tl, 'Typical review time', 'Caption', 'text/tertiary'); await tx(tl, 'Under 10 min', 'Number/L', 'text/primary'); await tx(tl, 'Up to 24 h if a specialist needs to take a look. We review around the clock.', 'Caption', 'text/secondary');
  const tr = box(pc, 'VERTICAL', { name: 'Review progress (icon + label)', gap: 12 });
  for (const [ic, c, h, s] of [['check-circle', 'status/success', 'Submitted', '16:58 UTC · details, ID card and selfie video received'], ['spinner', 'status/pending', 'Automated checks — in progress', 'Document authenticity, face match, sanctions and PEP screening'], ['clock', 'icon/muted', 'Specialist review — only if needed', 'Happens when the automated result is unclear'], ['mail', 'icon/muted', 'Decision', 'By email and in-app notification']]) { const r = box(tr, 'HORIZONTAL', { name: 'Step — ' + h, gap: 10 }); r.appendChild(await IC(ic, 18, c)); const rc = box(r, 'VERTICAL', { name: 'Copy', gap: 2 }); await tx(rc, h, 'Label/M', c === 'icon/muted' ? 'text/secondary' : 'text/primary'); await tx(rc, s, 'Caption', 'text/tertiary'); }
  const sb = box(main, 'VERTICAL', { name: 'What you submitted', gap: 10, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
  const sh = box(sb, 'HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); sh.appendChild(await T('What you submitted', 'Label/L', 'text/primary')); box(sh, 'HORIZONTAL', { name: 'Spacer', h: 1 }); sh.appendChild(await DEMO('XS'));
  for (const s of ['Personal details — Nova Karlsson · born 14 Mar 1994 · Lisboa, Portugal', 'National ID card — front and back · issued in Portugal · valid until 09 Aug 2031', 'Selfie video — 10 seconds · recorded 27 Nov 2026, 16:57 UTC']) await li(sb, 'check-circle', s, { ic: 'status/success', is: 16 });
  const al = await I('30:17116', { Type: 'Info', Layout: 'Inline' }); al.name = 'Alert/Banner — keep playing on Level 1'; main.appendChild(al); al.layoutSizingHorizontal = 'FILL'; await setT(al, 'Title', 'You can keep playing while we check'); await setT(al, 'Body', 'Level 1 limits apply until we finish: deposits and withdrawals up to 2,000.00 USDT a day. Nothing is paused.'); await setT(al, 'Label', 'View my limits');
  await footer(main, [await BTN('Ghost', 'Contact support', { size: 'L', lead: 'chat' })], 'Status updates automatically · last checked 16:59 UTC', [await BTN('Primary', 'Back to lobby', { size: 'L' })]);
} else {
  const lm = box(main, 'VERTICAL', { name: 'New daily limits', gap: 12 });
  const lh = box(lm, 'HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); lh.appendChild(await T('Your new daily limits', 'Heading/H5', 'text/primary')); box(lh, 'HORIZONTAL', { name: 'Spacer', h: 1 }); lh.appendChild(await DEMO('S'));
  const lr = box(lm, 'HORIZONTAL', { name: 'Limit cards', gap: 16 });
  for (const [ic, h] of [['deposit', 'Deposits per day'], ['withdraw', 'Withdrawals per day']]) { const c = box(lr, 'VERTICAL', { name: 'Limit — ' + h, gap: 8, p: 20, fill: 'surface/default', stroke: 'border/success', r: 14 }); const r = box(c, 'HORIZONTAL', { name: 'Label', gap: 8, align: 'CENTER' }); r.appendChild(await IC(ic, 18, 'icon/brand')); await tx(r, h, 'Label/M', 'text/secondary'); await tx(c, '25,000.00 USDT', 'Number/L', 'text/primary'); const w = box(c, 'HORIZONTAL', { name: 'Change', gap: 6, align: 'CENTER' }); w.appendChild(await IC('trending-up', 16, 'status/success')); await tx(w, 'Up from 2,000.00 USDT on Level 1', 'Caption', 'text/success'); }
  const l3 = box(main, 'HORIZONTAL', { name: 'Level 3 — on request', gap: 12, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14, align: 'CENTER' }); l3.appendChild(await IC('layers', 20, 'icon/muted')); const l3c = box(l3, 'VERTICAL', { name: 'Copy', gap: 4 }); await tx(l3c, 'Need more than 25,000.00 USDT a day?', 'Label/L', 'text/primary'); await tx(l3c, 'Level 3 — Enhanced sets individual limits after a proof-of-address and source-of-funds review (up to 3 business days).', 'Body/S', 'text/secondary'); l3.appendChild(await BTN('Secondary', 'About Level 3', { size: 'M' }));
  const rg = box(main, 'HORIZONTAL', { name: 'Responsible gaming note', gap: 12, p: 16, fill: 'status/info-tint', r: 14 }); rg.appendChild(await IC('sliders', 20, 'status/info')); const rgc = box(rg, 'VERTICAL', { name: 'Copy', gap: 4 }); await tx(rgc, 'Your own limits haven’t changed', 'Label/L', 'text/primary'); await tx(rgc, 'Higher verification limits don’t override the limits you set: your deposit limit stays at 5,000.00 USDT a week and your daily loss limit at 200.00 USDT.', 'Body/S', 'text/secondary'); rgc.appendChild(await T('Review limits in Responsible gaming', 'Label/M', 'text/brand'));
  await footer(main, [await BTN('Ghost', 'Back to lobby', { size: 'L' })], 'A confirmation was sent to n•••@example.com.', [await BTN('Primary', 'Go to wallet', { size: 'L', lead: 'wallet' })]);
}
const f = await shell(OK ? 'AUTH-16 KYC Approved / 1440 / Default' : 'AUTH-15 KYC Pending / 1440 / Default', OK ? 5 : 4, d);
await f.screenshot({ scale: 0.5 });
return { frame: f.id, size: [f.width, f.height], dlg: [d.width, d.height] };

}
const __out = [];
for (const __m of ['Pending', 'Approved']) __out.push(await build(__m));
return __out;
