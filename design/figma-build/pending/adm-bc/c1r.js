const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
// fix C1 queue: hug height + shorter SLA header label
const q = await figma.getNodeByIdAsync('68:53474'); if (q) { q.primaryAxisSizingMode = 'AUTO'; const h = q.findOne(n => n.name === 'H/sla'); if (h) setP(h, 'Label', 'SLA · owner'); }
const NAME = '[ADM-C1] KYC Review — KYC-30418 / 1440 / In review';
const { f, c } = await SHELL(NAME, POS('C-1440', 'C1R'), 'C', 0, 'KO', 'Search KYC ID, user, document number…');
await HEAD(c, ['Admin', 'Compliance', 'KYC queue', 'KYC-30418'], 'Review KYC-30418', 'Level 2 upgrade (ID + liveness) for @atlas_q · submitted 26 Nov 2026, 21:14 UTC · SLA due 28 Nov 2026, 21:14 UTC — 26 h 30 min left · assigned to you', { badges: [await ST('Under review', 'In review'), await DEMO('M')], actions: [await BTN('Ghost', 'Previous', { size: 'S', lead: 'chevron-left' }), await BTN('Ghost', 'Next case', { size: 'S', trail: 'chevron-right' }), await BTN('Secondary', 'Release case', { size: 'S', lead: 'undo' })] });
const cols = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(c, [cols, 'FILL']);
const L = AL('VERTICAL', { name: 'Evidence', gap: 24 }); add(cols, [L, 'FILL']);
const RR = ALW('VERTICAL', { name: 'Decision rail', gap: 24, w: 400 }); add(cols, RR);
// documents
const docs = CARD('Submitted documents'); add(L, [docs, 'FILL']); await CHEAD(docs, 'Submitted documents', { icon: 'id-card' });
await WT(docs, 'Images are watermarked and view-only; every view is logged against your session. Samples below are illustrative — no real document or person.', 'Caption', 'text/tertiary', 500);
const dr = AL('HORIZONTAL', { name: 'Document tiles', gap: 16 }); add(docs, [dr, 'FILL']);
async function tile(title, meta, art) { const t = AL('VERTICAL', { name: 'Doc — ' + title, gap: 8 }); const pv = ALW('VERTICAL', { name: 'Preview', h: 176, fill: 'surface/raised', stroke: 'border/default', r: 10, align: 'CENTER', justify: 'CENTER', gap: 8, clip: true }); for (const a of art) add(pv, a); add(t, [pv, 'FILL']); add(t, await T(title, 'Body/S Strong', 'text/primary'), await T(meta, 'Caption', 'text/tertiary')); add(dr, [t, 'FILL']); }
const pm = AL('HORIZONTAL', { name: 'Passport mock', gap: 12, p: 12, fill: 'surface/default', stroke: 'border/strong', r: 6 }); const ph = AL('VERTICAL', { name: 'Photo', w: 52, h: 64, fill: 'surface/hover', r: 4, align: 'CENTER', justify: 'CENTER' }); add(ph, await IC('user', 28, 'icon/muted')); add(pm, ph);
const ln = AL('VERTICAL', { name: 'Fields', gap: 6 }); add(ln, await T('PASSPORT · DEU', 'Overline', 'text/tertiary'), rect(96, 6, 'border/strong', 9999, 'Line'), rect(72, 6, 'border/strong', 9999, 'Line'), rect(84, 6, 'border/strong', 9999, 'Line'), await T('P<DEU<<•••••<<<<<<<', 'Mono/S', 'text/tertiary')); add(pm, ln);
await tile('Passport — photo page', 'Uploaded 26 Nov, 21:12 · JPG 2.4 MB', [pm, await T('SAMPLE · DEMO', 'Overline', 'text/tertiary')]);
await tile('Selfie — liveness capture', '4 s video · passive + active challenge', [await IC('face-scan', 56, 'icon/brand'), await T('Liveness 0.97 · passed', 'Label/M', 'text/success')]);
await tile('Device & session', 'Captured at submission', [await IC('monitor', 44, 'icon/muted'), await T('Chrome 131 · macOS · Berlin', 'Label/M', 'text/primary'), await T('IP country matches residence', 'Caption', 'text/tertiary')]);
// extracted data
const ex = CARD('Extracted data', { gap: 12 }); add(L, [ex, 'FILL']); await CHEAD(ex, 'Document data vs profile', { icon: 'file' });
const xr = []; for (const [k, a, b, st, lab] of [['Full name', 'ALINE QUAST', 'Aline Quast', 'Approved', 'Match'], ['Date of birth', '14 Mar 1991', '14 Mar 1991 · age 35', 'Approved', 'Match · 18+'], ['Nationality · residence', 'Germany', 'Germany · permitted', 'Approved', 'Match'], ['Document number', 'C01X••••4821', 'Not stored in profile', 'Neutral', 'Recorded'], ['Expiry', '9 Aug 2031', '—', 'Approved', 'Valid']]) xr.push([{ T: 'Text', p: k, c: 'text/secondary' }, { T: 'Text', p: a, mono: k === 'Document number' }, { T: 'Text', p: b }, { T: 'Status', st, p: lab }]);
await TABLE(ex, 'Document vs profile', [{ k: 'field', l: 'Field', w: 176 }, { k: 'doc', l: 'From document (OCR)', w: 'FILL' }, { k: 'profile', l: 'In profile', w: 'FILL' }, { k: 'result', l: 'Result', w: 140 }], xr, { bare: 1 });
// automated checks
const ck = CARD('Automated checks', { gap: 8 }); add(L, [ck, 'FILL']); await CHEAD(ck, 'Automated checks · identity provider', { icon: 'shield-check', right: [await T('Completed 26 Nov, 21:15 UTC', 'Caption', 'text/tertiary')] });
for (const [ok, t1, t2, st, lab] of [[1, 'Document authenticity', 'MRZ checksum valid · security features present · no tampering signals', 'Approved', 'Pass'], [1, 'Face match', 'Selfie vs passport photo 96 % · threshold 90 %', 'Approved', 'Pass'], [1, 'Liveness', 'Passive + active challenge · score 0.97', 'Approved', 'Pass'], [1, 'Sanctions & PEP screening', 'OFAC, EU, UN and UK lists (versions of 27 Nov 2026, 06:00 UTC) · no match', 'Approved', 'Clear'], [0, 'Adverse media', '1 weak name match (score 0.41) — the article names a different date of birth (1968). Reviewer must confirm.', 'Under review', 'Needs review'], [1, 'Duplicate identity & self-exclusion register', 'Document and face not linked to any other account or self-exclusion', 'Approved', 'Clear'], [1, 'Device & IP', 'IP geolocation Germany · no anonymising proxy · device first seen 3 Sep 2026', 'Approved', 'Consistent']]) {
  const r = AL('HORIZONTAL', { name: 'Check — ' + t1, gap: 12, p: [10, 12, 10, 12], fill: ok ? 'surface/raised' : 'status/warning-tint', r: 10, align: 'CENTER' }); add(r, await IC(ok ? 'check-circle' : 'alert-triangle', 18, ok ? 'status/success' : 'status/warning'));
  const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(tx, await T(t1, 'Body/S Strong', 'text/primary')); await WT(tx, t2, 'Caption', 'text/tertiary', 400); add(r, [tx, 'FILL']); add(r, await ST(st, lab)); add(ck, [r, 'FILL']); }
// rail: applicant
const ap = CARD('Applicant'); add(RR, [ap, 'FILL']);
const ah = AL('HORIZONTAL', { name: 'Identity', gap: 12, align: 'CENTER' }); add(ah, await I('9:238', { Size: 'M' }, { Initials: 'AQ' })); const an = AL('VERTICAL', { name: 'Name', gap: 2 }); add(an, await T('@atlas_q', 'Body/M Strong', 'text/primary'), await T('GP-51907 · joined 3 Sep 2026', 'Caption', 'text/tertiary')); add(ah, [an, 'FILL']); add(ah, await DEMO('S')); add(ap, [ah, 'FILL']);
await KV(ap, 'Current level', null, { node: await I('23:5565', { Status: 'Approved', Level: 'L1' }) });
await KV(ap, 'Requested', 'L2 — ID + liveness'); await KV(ap, 'Residence', 'Germany · permitted'); await KV(ap, 'Lifetime deposits', '3,450.00 USDT'); await KV(ap, 'Withdrawal limit after L2', '25,000.00 USDT / day'); await KV(ap, 'Open AML alerts', 'None', { color: 'text/success' });
add(ap, await BTN('Ghost', 'Open user profile', { size: 'S', trail: 'arrow-right' }));
const rm = await RISKM('Low', '@atlas_q', 'Account age 85 days · deposits from 1 verified wallet · no sanctions or PEP hits'); add(RR, [rm, 'FILL']);
// rail: decision
const de = CARD('Decision', { stroke: 'border/brand', gap: 12 }); add(RR, [de, 'FILL']); await CHEAD(de, 'Decision', { icon: 'scale', ic: 'icon/brand', demo: false });
for (const [l, d] of [['Approve Level 2', 'Raises the daily withdrawal limit to 25,000.00 USDT'], ['Request more information', 'User gets a secure upload link; the SLA pauses'], ['Reject', 'Reason category and note required; the user may reapply after 30 days']]) { const r = await I('20:3259', { Selected: 'No', State: 'Default' }, { Label: l, Description: d, 'Show description': true }); add(de, [r, 'FILL']); }
const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I reviewed the adverse-media hit and it does not refer to this person', 'Show description': false }); add(de, [cb, 'FILL']);
const ta = await TAREA('Reviewer note', 'Required for Reject or Request more information. Visible to Compliance only — never shown to the user.', 'Kept in the case file for 5 years'); add(de, [ta, 'FILL']);
const sb = await BTN('Primary', 'Submit decision', { size: 'M', state: 'Disabled', lead: 'check' }); add(de, [sb, 'FILL']);
await WT(de, 'Choose an outcome and confirm the adverse-media check to continue. L2 needs one reviewer; L3, PEP or sanctions hits need a second approver. Recorded in the immutable audit log with your 2FA session.', 'Caption', 'text/tertiary', 340);
// rail: history
const hi = CARD('Case history', { gap: 12 }); add(RR, [hi, 'FILL']); await CHEAD(hi, 'Case history', { icon: 'history', demo: false });
await STEPS(hi, [['done', 'Submitted by user', '26 Nov 2026, 21:14 UTC · web · Chrome · Berlin'], ['done', 'Provider checks completed', '26 Nov 2026, 21:15 UTC · 6 pass, 1 needs review'], ['done', 'Assigned to K. Osei', '27 Nov 2026, 17:02 UTC · round-robin'], ['now', 'In review', 'Opened 27 Nov 2026, 18:38 UTC · 3 images viewed (logged)'], ['next', 'Decision', 'Due by 28 Nov 2026, 21:14 UTC']]);
return await DONE(f, { fixedQueue: !!q });
