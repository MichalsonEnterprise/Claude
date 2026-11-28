// ===== MAIN t1: section + Template/Legal Document set (idempotent: reuses an existing set) =====
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-16/17/19 Legal documents', 90000, 0);
let hdr = sec.findChild(n => n.name === 'Doc/PUB-16/17/19 header');
if (!hdr) { hdr = col('Doc/PUB-16/17/19 header', { gap: 8, w: 1590 }); sec.appendChild(hdr); hdr.x = 120; hdr.y = 120;
  await wt(hdr, 'Title', 'PUB-16 / 17 / 19 — Legal documents', 'Heading/H2', 'text/primary');
  await wt(hdr, 'Subtitle', 'Template/Legal Document (below) drives Terms & Conditions, Privacy Policy and AML/KYC Policy at 1440 (casino shell) and 390 (page 10, section “PUB-16/17/19 — Mobile”). Sticky table of contents, version + effective date + last updated, anchor-linked numbered headings, Body/L 72ch print-friendly measure, Download PDF and a plain-language summary callout. Copy is real, substantive opening text per section; operator, licence and regulator names are DEMO placeholders.', 'Body/M', 'text/secondary'); }
let set = sec.findChild(n => n.type === 'COMPONENT_SET' && n.name === TPL_NAME); let built = false;
if (!set) { for (const o of [...sec.children, ...figma.currentPage.children].filter(n => n.type === 'COMPONENT' && /^Breakpoint=(Desktop|Mobile)$/.test(n.name))) o.remove(); // orphans of an interrupted run
  const dc = await buildDesktop(D_terms); const mc = await buildMobile(D_terms);
  set = figma.combineAsVariants([dc, mc], sec); set.name = TPL_NAME; built = true;
  set.layoutMode = 'HORIZONTAL'; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.counterAxisAlignItems = 'MIN'; gap(set, 48); pad(set, 24); fill(set, 'surface/default'); radius(set, 14);
  set.description = TPL_DESC; }
set.x = 120; set.y = Math.round(hdr.y + hdr.height + 48);
fitSection(sec);
const dv = set.children.find(c => c.name === 'Breakpoint=Desktop'), mv = set.children.find(c => c.name === 'Breakpoint=Mobile');
const sh = [await vshot(dv, { cols: 2, chunkH: 1500, scale: 0.42 }), await vshot(mv, { cols: 4, chunkH: 2000, scale: 0.42 })];
return { sec: sec.id, hdr: hdr.id, set: set.id, built, desktop: dv.id, mobile: mv.id, sizes: [Math.round(dv.width), Math.round(dv.height), Math.round(mv.width), Math.round(mv.height)], setBox: [set.x, set.y, Math.round(set.width), Math.round(set.height)], over: [overflowList(dv).slice(0, 10), overflowList(mv).slice(0, 10)], sh };
