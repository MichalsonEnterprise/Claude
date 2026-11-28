// ===== TEMPLATE/LEGAL DOCUMENT BUILDER =====
async function pill(name, text) { const p = row(name + ' pill', { gap: 6, p: [4, 10, 4, 10], r: 9999, fill: 'brand/tint' }); add(p, await IC('file', 14, 'icon/brand'), await tx(name, text, 'Label/S', 'text/brand')); return p; }
async function meta(icon, name, text) { const r = row('Meta — ' + name, { gap: 6 }); add(r, await IC(icon, 16, 'icon/muted'), await tx(name, text, 'Body/S', 'text/secondary')); return r; }
async function summary(D, M) {
  const c = AX('VERTICAL', { name: 'Summary callout', p: M ? 20 : 24, gap: 16, fill: 'surface/default', r: 14 }); strokeSides(c, 'brand/primary', { l: 4 });
  const h = row('Summary header', { gap: 12, align: 'MIN' }); add(c, [h, 'FILL']); const hc = col('Summary heading', { gap: 4 }); add(h, await tile('info'), [hc, 'FILL']);
  await wt(hc, 'Summary title', D.sumT, M ? 'Heading/H5' : 'Heading/H4', 'text/primary'); await wt(hc, 'Summary note', D.sumN, 'Body/S', 'text/tertiary');
  for (let i = 1; i <= 5; i++) { const r = row('Summary row ' + i, { gap: 12, align: 'MIN' }); add(c, [r, 'FILL']); add(r, await IC('check-circle', 20, 'icon/brand')); await wt(r, 'Summary ' + i, D.sum[i - 1], M ? 'Body/S' : 'Body/M', 'text/primary'); }
  return c;
}
async function sectionBlock(D, i, M) {
  const s = D.s[i - 1] || D.s[0];
  const S = col('Section ' + i, { gap: M ? 12 : 16, p: [0, 0, M ? 32 : 48, 0] }); strokeSides(S, 'border/subtle', { b: 1 });
  const hr = row('S' + i + ' heading row', { gap: 12 }); add(S, [hr, 'FILL']);
  const nb = AL('HORIZONTAL', { name: 'S' + i + ' num box', fill: 'brand/tint', r: 6, w: M ? 28 : 32, h: M ? 28 : 32, align: 'CENTER', justify: 'CENTER' });
  add(nb, await tx('S' + i + ' num', String(i), M ? 'Label/M' : 'Label/L', 'text/brand')); add(hr, nb);
  await wt(hr, 'S' + i + ' heading', s.h, M ? 'Heading/H4' : 'Heading/H3', 'text/primary');
  const an = await I('7:774', { Type: 'Ghost', Size: M ? 'M' : 'S', State: 'Default' }, { Icon: ICONS.link }); an.name = 'S' + i + ' anchor (copy link)'; add(hr, an);
  await wt(S, 'S' + i + ' p1', s.p[0], M ? 'Body/M' : 'Body/L', 'text/secondary');
  const p2 = await wt(S, 'S' + i + ' p2', s.p[1] || s.p[0], M ? 'Body/M' : 'Body/L', 'text/secondary'); p2.visible = !!s.p[1];
  const nx = row('S' + i + ' note box', { gap: 12, align: 'MIN', p: 16, fill: 'surface/raised', stroke: 'border/subtle', r: 10 }); add(S, [nx, 'FILL']);
  add(nx, await IC('info', 20, 'icon/brand')); await wt(nx, 'S' + i + ' note', s.note || 'Key point for this section.', M ? 'Body/S' : 'Body/M', 'text/primary');
  const dm = await DEMO('S'); dm.name = 'S' + i + ' note DEMO'; add(nx, dm); nx.visible = !!s.note; dm.visible = !!s.demo;
  return S;
}
async function history(D, M) {
  const H = col('Version history', { gap: 0 });
  const hh = row('History header', { gap: 8, p: [0, 0, 12, 0] }); add(H, [hh, 'FILL']);
  add(hh, await tx('History title', 'Version history', M ? 'Heading/H5' : 'Heading/H4', 'text/primary'), await DEMO('XS'));
  const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(hh, [sp, 'FILL']); add(hh, await tx('History link', 'All versions', 'Label/M', 'text/brand'));
  for (let i = 1; i <= 3; i++) { const h = D.hist[i - 1];
    if (M) { const r = col('Hist row ' + i, { gap: 4, p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(H, [r, 'FILL']); const m = row('Hist ' + i + ' meta', { gap: 8 }); add(r, m); add(m, await tx('Hist ' + i + ' ver', 'v' + h[0], 'Label/M', 'text/primary'), await tx('Hist ' + i + ' date', h[1], 'Body/S', 'text/tertiary')); await wt(r, 'Hist ' + i + ' change', h[2], 'Body/S', 'text/secondary'); }
    else { const r = row('Hist row ' + i, { gap: 16, align: 'MIN', p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(H, [r, 'FILL']); const v = await T('v' + h[0], 'Label/M', 'text/primary', { w: 56 }); v.name = 'Hist ' + i + ' ver'; const d = await T(h[1], 'Body/S', 'text/tertiary', { w: 112 }); d.name = 'Hist ' + i + ' date'; add(r, v, d); await wt(r, 'Hist ' + i + ' change', h[2], 'Body/S', 'text/secondary'); }
  }
  return H;
}
async function licence(M) {
  const L = col('Licence & operator', { gap: 12 }); const n = await I('6:158', { Variant: M ? 'Compact' : 'Inline' }); n.name = 'Notice/Licence'; add(L, M ? n : [n, 'FILL']);
  const r = row('Operator row', { gap: 12, align: 'MIN' }); add(L, [r, 'FILL']); add(r, await I('6:159'));
  await wt(r, 'Operator note', 'GLOBAL POOL is operated by [Operator Ltd — DEMO placeholder] under gaming licence [No. 0000/DEMO — placeholder] issued by [Regulator — DEMO placeholder]. Real-money play is offered only to people aged 18+ in permitted jurisdictions.', 'Caption', 'text/tertiary');
  return L;
}
async function docsCard(D, M) {
  const c = card('Legal documents', { p: M ? 12 : 16, gap: 2 }); const t = col('Docs header', { p: [4, 8, 8, 8] }); add(c, [t, 'FILL']); add(t, await tx('Docs title', 'LEGAL DOCUMENTS', 'Overline', 'text/tertiary'));
  for (let i = 1; i <= 6; i++) { const on = i === D.cur; const r = row('Doc row ' + i, { gap: 10, p: M ? [12, 12, 12, 12] : [8, 12, 8, 12], r: 10, fill: on ? 'surface/selected' : null }); add(c, [r, 'FILL']); const ic = await IC('file', 16, on ? 'icon/brand' : 'icon/muted'); ic.name = 'Doc icon ' + i; add(r, ic); await wt(r, 'Doc link ' + i, DOC_LINKS[i - 1], M ? 'Body/M' : 'Body/S', on ? 'text/brand' : 'text/secondary'); }
  return c;
}
async function helpCard(M) { const c = card('Help card', { p: 20, gap: 12 }); add(c, await tile('mail')); await wt(c, 'Help title', 'Questions about this document?', 'Label/L', 'text/primary'); await wt(c, 'Help body', 'Email legal@example.com or chat with Support — we reply within 2 business days.', 'Body/S', 'text/secondary'); const b = await BTN('Secondary', 'Contact support', { size: M ? 'L' : 'S', lead: 'chat' }); add(c, M ? [b, 'FILL'] : b); return c; }
async function tocRow(D, i, M) { const s = D.s[i - 1] || D.s[0]; const on = i === 1; const r = row('TOC row ' + i, { gap: 12, align: M ? 'CENTER' : 'MIN', p: M ? [12, 12, 12, 12] : [8, 12, 8, 12], r: 10, fill: on ? 'brand/tint' : null }); if (on) strokeSides(r, 'brand/primary', { l: 3 });
  const nm = await T(String(i).padStart(2, '0'), 'Mono/S', on ? 'text/brand' : 'text/tertiary', { w: 20 }); nm.name = 'TOC ' + i + ' num'; r.appendChild(nm);
  await wt(r, 'TOC ' + i, s.h, M ? 'Body/M' : 'Body/S', on ? 'text/brand' : 'text/secondary'); r.visible = i <= D.s.length; return r; }
async function buildDesktop(D) {
  const C = figma.createComponent(); C.name = 'Breakpoint=Desktop'; C.layoutMode = 'VERTICAL'; C.resize(1136, 100); C.counterAxisSizingMode = 'FIXED'; C.primaryAxisSizingMode = 'AUTO'; gap(C, 32); fill(C, 'bg/base');
  const bc = row('Breadcrumb', { gap: 8 }); add(C, bc); add(bc, await tx('Crumb 0', 'Home', 'Body/S', 'text/tertiary'), await IC('chevron-right', 16, 'icon/muted'), await tx('Crumb 1', 'Help & legal', 'Body/S', 'text/tertiary'), await IC('chevron-right', 16, 'icon/muted'), await tx('Current page', D.title, 'Body/S Strong', 'text/primary'));
  const HD = row('Doc header', { gap: 48, align: 'MIN', p: [0, 0, 40, 0] }); strokeSides(HD, 'border/subtle', { b: 1 }); add(C, [HD, 'FILL']);
  const L = col('Header copy', { gap: 16 }); add(HD, [L, 'FILL']); add(L, await tx('Doc overline', D.over, 'Overline', 'text/brand'));
  await wt(L, 'Doc title', D.title, 'Heading/H1', 'text/primary'); await wt(L, 'Doc lead', D.lead, 'Body/L', 'text/secondary');
  const mr = row('Doc meta', { gap: 16, wrap: true, cgap: 8 }); add(L, [mr, 'FILL']);
  add(mr, await pill('Version', D.version), await meta('calendar', 'Effective', D.effective), await meta('refresh', 'Updated', D.updated), await meta('clock', 'Read time', readTime(D)), await meta('globe', 'Language', 'English · binding version'));
  const R = card('Document details', { w: 320, gap: 16 }); add(HD, R);
  const rh = row('Details header', { gap: 8 }); add(R, [rh, 'FILL']); add(rh, await tx('Details title', 'Document details', 'Label/L', 'text/primary'), await DEMO('XS'));
  const KV = ['Version', 'Effective', 'Last updated', 'Previous version'];
  for (let k = 0; k < 4; k++) { const r = row('Det row ' + (k + 1), { gap: 12, align: 'MIN' }); add(R, [r, 'FILL']); const a = await T(KV[k], 'Body/S', 'text/tertiary', { w: 112 }); a.name = 'Det k' + (k + 1); r.appendChild(a); await wt(r, 'Det v' + (k + 1), D.det[k], 'Body/S Strong', 'text/primary'); }
  add(R, [await BTN('Secondary', 'Download PDF', { size: 'M', lead: 'download' }), 'FILL']);
  const br = row('Doc actions', { gap: 8 }); add(R, [br, 'FILL']); add(br, await BTN('Ghost', 'Print', { size: 'S', lead: 'file' }), await BTN('Ghost', 'Copy link', { size: 'S', lead: 'link' }));
  await wt(R, 'PDF meta', D.pdf, 'Caption', 'text/tertiary');
  const B = row('Doc body', { gap: 96, align: 'MIN' }); add(C, [B, 'FILL']);
  const rail = col('TOC rail — sticky', { gap: 24, w: 288 }); add(B, rail);
  const tc = card('TOC — sticky (top 88 px)', { p: 16, gap: 2 }); add(rail, [tc, 'FILL']);
  const th = col('TOC header', { gap: 8, p: [4, 8, 12, 8] }); add(tc, [th, 'FILL']); add(th, await tx('TOC title', 'ON THIS PAGE', 'Overline', 'text/tertiary'));
  await wt(th, 'TOC count', D.s.length + ' sections · ' + readTime(D), 'Caption', 'text/tertiary');
  const pr = AL('HORIZONTAL', { name: 'Reading progress', fill: 'surface/raised', r: 9999, w: 240, h: 4 }); add(th, [pr, 'FILL']); add(pr, rect(24, 4, 'brand/primary', 9999, 'Progress fill'));
  for (let i = 1; i <= NSEC; i++) add(tc, [await tocRow(D, i, false), 'FILL']);
  add(rail, [await docsCard(D, false), 'FILL'], [await helpCard(false), 'FILL']);
  const A = col('Article', { gap: 48, w: 720 }); add(B, A);
  add(A, [await summary(D, false), 'FILL']);
  for (let i = 1; i <= NSEC; i++) { const S = await sectionBlock(D, i, false); add(A, [S, 'FILL']); S.visible = i <= D.s.length; }
  add(A, [await history(D, false), 'FILL'], [await licence(false), 'FILL'], await BTN('Ghost', 'Back to top', { size: 'S', lead: 'chevron-up' }));
  return C;
}
async function buildMobile(D) {
  const C = figma.createComponent(); C.name = 'Breakpoint=Mobile'; C.layoutMode = 'VERTICAL'; C.resize(358, 100); C.counterAxisSizingMode = 'FIXED'; C.primaryAxisSizingMode = 'AUTO'; gap(C, 24); fill(C, 'bg/base');
  const bk = row('Back link', { gap: 6 }); add(C, bk); add(bk, await IC('chevron-left', 16, 'icon/brand'), await tx('Crumb 1', 'Help & legal', 'Label/M', 'text/brand'));
  const HD = col('Doc header', { gap: 12 }); add(C, [HD, 'FILL']); add(HD, await tx('Doc overline', D.over, 'Overline', 'text/brand'));
  await wt(HD, 'Doc title', D.title, 'Heading/H2', 'text/primary'); await wt(HD, 'Doc lead', D.lead, 'Body/M', 'text/secondary');
  const mr = row('Doc meta', { gap: 12, wrap: true, cgap: 8 }); add(HD, [mr, 'FILL']);
  add(mr, await pill('Version', D.version), await meta('calendar', 'Effective', D.effective), await meta('refresh', 'Updated', D.updated), await meta('clock', 'Read time', readTime(D)));
  const ar = row('Doc actions', { gap: 12 }); add(C, [ar, 'FILL']); add(ar, [await BTN('Secondary', 'Download PDF', { size: 'L', lead: 'download' }), 'FILL']);
  const cl = await I('7:774', { Type: 'Secondary', Size: 'L', State: 'Default' }, { Icon: ICONS.link }); cl.name = 'Copy link'; add(ar, cl);
  await wt(C, 'PDF meta', D.pdf, 'Caption', 'text/tertiary');
  const acc = col('Contents — collapsible', { gap: 0, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); add(C, [acc, 'FILL']);
  const ah = row('Contents header (tap to expand)', { gap: 12, p: [12, 16, 12, 16] }); add(acc, [ah, 'FILL']);
  const at = col('Contents label', { gap: 2 }); add(ah, await tile('list'), [at, 'FILL']); add(at, await tx('TOC title', 'Contents', 'Label/L', 'text/primary')); await wt(at, 'TOC count', D.s.length + ' sections · ' + readTime(D), 'Caption', 'text/tertiary');
  const cd = await IC('chevron-down', 20, 'icon/default'); cd.name = 'Chevron down'; const cu = await IC('chevron-up', 20, 'icon/brand'); cu.name = 'Chevron up'; add(ah, cd, cu); cu.visible = false;
  const tl = col('TOC list', { gap: 2, p: [8, 8, 8, 8] }); strokeSides(tl, 'border/subtle', { t: 1 }); add(acc, [tl, 'FILL']);
  for (let i = 1; i <= NSEC; i++) add(tl, [await tocRow(D, i, true), 'FILL']);
  tl.visible = false;
  add(C, [await summary(D, true), 'FILL']);
  for (let i = 1; i <= NSEC; i++) { const S = await sectionBlock(D, i, true); add(C, [S, 'FILL']); S.visible = i <= D.s.length; }
  add(C, [await history(D, true), 'FILL'], [await docsCard(D, true), 'FILL'], [await helpCard(true), 'FILL'], [await licence(true), 'FILL'], [await BTN('Secondary', 'Back to top', { size: 'L', lead: 'chevron-up' }), 'FILL']);
  return C;
}
const TPL_DESC = 'Long-form legal document template (PUB-16 Terms & Conditions, PUB-17 Privacy Policy, PUB-19 AML/KYC Policy; reusable for Cookie Policy, Bonus terms, etc.). Variants: Breakpoint=Desktop (1136 content column inside the casino shell: Sidebar 240 + Topbar + Footer Mega) and Breakpoint=Mobile (358 inside a 390 frame).\n\nANATOMY — Desktop: breadcrumb · header (overline, H1 title, Body/L lead, meta row: version pill, effective date, last updated, read time, binding language) + Document details card (version, effective, last updated, previous version, Download PDF, Print, Copy link, PDF size) · body: sticky TOC rail 288 (ON THIS PAGE, reading-progress bar, 11 numbered anchor rows, active row = brand/tint + 3 px mint indicator; Legal documents list with the current doc selected; help card) | article 720 = 72ch measure at Body/L 18/28 (summary callout with 5 plain-language points, numbered sections with anchor buttons, optional worked-example note box with DEMO, version history, licence notice + operator line, Back to top). Mobile: back link, header, Download PDF + Copy link, collapsible Contents accordion (collapsed by default; expanded = show "TOC list", hide "Chevron down", show "Chevron up"), same summary/sections at Body/M, version history, legal documents list (44 px rows), help, licence, Back to top.\n\nOVERRIDES — set TEXT layers by name: Doc overline, Doc title, Current page, Doc lead, Version, Effective, Updated, Read time, Det v1–v4, PDF meta, TOC count, TOC 1–11, Summary title/note/1–5, S1–S11 heading/p1/p2/note, Hist 1–3 ver/date/change. Toggle visibility: Section N, TOC row N, SN p2, SN note box, SN note DEMO. Current doc: Doc row N fill surface/selected + Doc link N text/brand. Scripts editing instances must set figma.skipInvisibleInstanceChildren = false.\n\nDEV NOTES — each section heading has an id (e.g. #eligibility, #global-pool) and the anchor button copies the deep link; TOC rows link to the ids and the active row follows the scroll position (IntersectionObserver); TOC rail is position: sticky; top: 88px (below the 64 px top bar). Download PDF serves the signed PDF of the shown version; Print uses a print stylesheet (hide shell + rail, black text on white, 11 pt, 72ch, headings keep-with-next, URLs printed after links). Version/effective/updated come from the CMS document record; the previous version link opens the archived version. Do not: hide fees, limits or restrictions in long text — the summary callout must state them plainly.';
// ===== END TEMPLATE BUILDER =====
