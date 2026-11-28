const PG = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM — Mobile', 217000, 0);
const NAME = '[ADM-C1] KYC Review — KYC-30418 / 390 / In review';
const { f, c } = await MSHELL(NAME, 'KYC queue');
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('KYC-30418', 'Heading/H3', 'text/primary'), await ST('Under review', 'In review')); add(tr, [SPC(), 'FILL']); add(tr, await DEMO('M')); add(c, [tr, 'FILL']);
await WT(c, 'Level 2 upgrade · submitted 26 Nov 2026, 21:14 UTC · SLA 26 h 30 min left · assigned to you', 'Caption', 'text/tertiary', 358);
const ap = CARD('Applicant', { gap: 10, p: 14 });
const ah = AL('HORIZONTAL', { name: 'Identity', gap: 10, align: 'CENTER' }); add(ah, await I('9:238', { Size: 'M' }, { Initials: 'AQ' })); const an = AL('VERTICAL', { name: 'Name', gap: 2 }); add(an, await T('@atlas_q', 'Body/M Strong', 'text/primary'), await T('GP-51907 · Germany · since 3 Sep 2026', 'Caption', 'text/tertiary')); add(ah, [an, 'FILL']); add(ah, await DEMO('S')); add(ap, [ah, 'FILL']);
await KV(ap, 'Current level', null, { node: await I('23:5565', { Status: 'Approved', Level: 'L1' }) }); await KV(ap, 'Requested', 'L2 · ID + liveness'); await KV(ap, 'Lifetime deposits', '3,450.00 USDT');
add(c, [ap, 'FILL']);
const docs = AL('VERTICAL', { name: 'Documents', gap: 8 }); add(docs, await T('Documents · swipe', 'Label/L', 'text/primary'));
const dr = AL('HORIZONTAL', { name: 'Document tiles (scroll)', gap: 8, clip: true }); for (const [ic, t1, t2, col] of [['id-card', 'Passport', 'SAMPLE · DEMO', 'icon/muted'], ['face-scan', 'Liveness 0.97', 'Passed', 'icon/brand'], ['monitor', 'Device', 'IP matches residence', 'icon/muted']]) { const t = ALW('VERTICAL', { name: 'Doc — ' + t1, gap: 6, w: 150 }); const pv = AL('VERTICAL', { name: 'Preview', w: 150, h: 104, fill: 'surface/raised', stroke: 'border/default', r: 10, align: 'CENTER', justify: 'CENTER' }); add(pv, await IC(ic, 36, col)); add(t, pv); add(t, await T(t1, 'Body/S Strong', 'text/primary'), await T(t2, 'Caption', 'text/tertiary')); add(dr, t); }
add(docs, [dr, 'FILL']); add(c, [docs, 'FILL']);
const ck = CARD('Checks', { gap: 8, p: 14 }); await CHEAD(ck, 'Automated checks', { icon: 'shield-check', demo: false });
for (const [ok, t1, lab] of [[1, 'Document · face 96 % · liveness', 'Pass'], [1, 'Sanctions & PEP', 'Clear'], [0, 'Adverse media · weak match 0.41', 'Review'], [1, 'Duplicates & self-exclusion', 'Clear']]) { const r = AL('HORIZONTAL', { name: 'Check — ' + t1, gap: 10, p: [10, 12, 10, 12], fill: ok ? 'surface/raised' : 'status/warning-tint', r: 10, align: 'CENTER' }); add(r, await IC(ok ? 'check-circle' : 'alert-triangle', 18, ok ? 'status/success' : 'status/warning')); await WT(r, t1, 'Body/S', 'text/primary', 200); add(r, await T(lab, 'Label/M', ok ? 'text/success' : 'text/warning')); add(ck, [r, 'FILL']); }
add(c, [ck, 'FILL']);
const rm = await RISKM('Low', '@atlas_q', 'Account age 85 days · 1 verified wallet · no sanctions or PEP hits'); add(c, [rm, 'FILL']);
const de = CARD('Decision', { gap: 10, p: 14, stroke: 'border/brand' }); await CHEAD(de, 'Decision', { icon: 'scale', ic: 'icon/brand', demo: false });
for (const [l, d] of [['Approve Level 2', 'Limit 25,000.00 USDT / day'], ['Request more information', 'SLA pauses'], ['Reject', 'Reason category + note required']]) add(de, [await I('20:3259', { Selected: 'No', State: 'Default' }, { Label: l, Description: d, 'Show description': true }), 'FILL']);
add(de, [await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'The adverse-media hit is not this person', 'Show description': false }), 'FILL']);
add(de, [await TAREA('Reviewer note', 'Required for Reject or Request info', 'Visible to Compliance only'), 'FILL']);
add(c, [de, 'FILL']);
await STICKY(f, [[await BTN('Secondary', 'Release', { size: 'L', lead: 'undo' }), 'HUG'], [await BTN('Primary', 'Submit decision', { size: 'L', state: 'Disabled', lead: 'check' }), 'FILL']], 'Pick an outcome and confirm the adverse-media check · logged with your 2FA session');
return await DONE(f);
