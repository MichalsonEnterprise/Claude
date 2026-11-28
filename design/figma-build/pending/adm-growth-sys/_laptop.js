// ===== ADM-GROWTH-SYS laptop pass: clone 1440 masters -> 1280 (Breakpoint Laptop 1280), generic reflow fix, overflow report, screenshots =====
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-A/M Affiliates & marketing, ADM-S System', 86000, 0);
const LY = 6440; // laptop row (section-local y), below the deepest 1440 state (ends 6271)
const LOG = [];
function inInst(n) { let p = n.parent; while (p && p.type !== 'PAGE' && p.type !== 'SECTION') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
function vis(k) { return k.visible && k.layoutPositioning !== 'ABSOLUTE'; }
function setFill(k) { try { if (k.type === 'TEXT') k.textAutoResize = 'HEIGHT'; k.layoutSizingHorizontal = 'FILL'; return true; } catch (e) { return false; } }
function reflow(f, log) {
  const al = f.findAll(n => n.type === 'FRAME' && n.layoutMode && n.layoutMode !== 'NONE' && !inInst(n));
  for (const P of al) {
    const inner = P.width - P.paddingLeft - P.paddingRight; const kids = P.children.filter(vis); if (!kids.length) continue;
    if (P.layoutMode === 'VERTICAL' || P.layoutWrap === 'WRAP') { for (const k of kids) if (k.width > inner + 1) { if (setFill(k)) log.push('V ' + k.name.slice(0, 28)); else log.push('!V ' + k.name.slice(0, 28)); } }
    else {
      const sp = P.itemSpacing > 0 ? P.itemSpacing : 0; const need = () => kids.reduce((s, k) => s + k.width, 0) + sp * (kids.length - 1); let g = 0;
      while (need() > inner + 1 && g++ < 6) {
        const c = kids.filter(k => k.layoutSizingHorizontal !== 'FILL' && k.width >= (k.type === 'INSTANCE' ? 240 : 120));
        if (!c.length) { log.push('!H ' + P.name.slice(0, 28) + ' ' + Math.round(need()) + '>' + Math.round(inner)); break; }
        const ws = c.map(k => k.width); if (c.length > 1 && Math.max(...ws) / Math.min(...ws) < 1.3 && c.length >= kids.filter(k => k.width >= 120).length) { c.forEach(setFill); log.push('Hall ' + P.name.slice(0, 28)); }
        else { const k = c.sort((a, b) => b.width - a.width)[0]; setFill(k); log.push('H ' + P.name.slice(0, 20) + '>' + k.name.slice(0, 20)); }
      }
    }
  }
}
function overflow(f) { const R = f.absoluteBoundingBox.x + f.width + 1; return f.findAll(n => n.visible && !inInst(n) && n.absoluteBoundingBox && n.absoluteBoundingBox.x + n.absoluteBoundingBox.width > R).slice(0, 8).map(n => n.name.slice(0, 30) + ':' + Math.round(n.absoluteBoundingBox.x + n.absoluteBoundingBox.width - R)); }
async function LAPTOP(srcId, yOverride) {
  const src = await figma.getNodeByIdAsync(srcId); if (!src) { LOG.push('no ' + srcId); return null; }
  const nm = src.name.replace('/ 1440 /', '/ 1280 /'); if (sec.children.find(n => n.name === nm)) { LOG.push('exists ' + nm); return null; }
  const f = src.clone(); sec.appendChild(f); f.name = nm; f.x = src.x; f.y = yOverride != null ? yOverride : LY;
  f.resize(1280, f.height); f.primaryAxisSizingMode = 'AUTO';
  const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === 'Laptop 1280'); if (bm) f.setExplicitVariableModeForCollection(bc, bm.modeId);
  const log = []; reflow(f, log); const kf = KPIFIX(f); if (kf) log.push('kpi ' + kf); const ov = overflow(f).concat(instOverflow(f), narrowFill(f).map(x => 'narrow ' + x));
  return { f, log, ov };
}

// ---- generic laptop fixes (added after batch 1 review) ----
function isKPI(x) { return x.type === 'INSTANCE' && x.mainComponent && x.mainComponent.parent && x.mainComponent.parent.name === 'Admin/KPI Tile'; }
function KPIFIX(f) { let n = 0; for (const k of f.findAll(isKPI)) { const kb = k.absoluteBoundingBox; const sp = k.findOne(x => x.name === 'Sparkline'); if (sp) { const w0 = sp.width; try { sp.layoutSizingHorizontal = 'FILL'; n++; } catch (e) { try { sp.resize(k.width - 40, sp.height); n++; } catch (e2) {} } SPARKSCALE(sp); }
  for (const t of k.findAll(x => x.type === 'TEXT' && x.visible)) { const ab = t.absoluteBoundingBox; if (ab && ab.x + ab.width > kb.x + kb.width - 12) { try { t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; n++; } catch (e) { try { t.resize(Math.max(40, kb.x + kb.width - 20 - ab.x), t.height); t.textAutoResize = 'HEIGHT'; n++; } catch (e2) {} } } } } return n; }
function SPARKSCALE(sp) { const kids = sp.children.filter(c => c.name !== 'End dot'); if (!kids.length) return; const full = Math.max(...kids.map(c => c.x + c.width)); const r = (sp.width - 4) / full; if (Math.abs(r - 1) < 0.01) return; sp.clipsContent = true; for (const c of sp.children) { try { const x0 = c.x; if (c.name === 'End dot') { c.x = Math.min(x0 * r, sp.width - c.width); } else { c.resize(Math.max(1, c.width * r), c.height); c.x = x0 * r; } } catch (e) {} } }
// inner overflow: nodes that stick out of their nearest instance ancestor (instance internals don't reflow)
function instOverflow(f) { const r = []; for (const k of f.findAll(x => x.type === 'INSTANCE' && !inInst(x) && x.visible)) { const kb = k.absoluteBoundingBox; if (!kb) continue; const bad = k.findAll(x => x.visible && x.absoluteBoundingBox && x.absoluteBoundingBox.x + x.absoluteBoundingBox.width > kb.x + kb.width + 2); if (bad.length) r.push(k.name.slice(0, 26) + '>' + bad[0].name.slice(0, 20)); } return r.slice(0, 10); }
function narrowFill(f) { return f.findAll(n => !inInst(n) && n.visible && n.layoutSizingHorizontal === 'FILL' && n.parent && n.parent.layoutMode === 'HORIZONTAL' && n.width < 90 && n.width > 0 && n.type !== 'TEXT' && !/Spacer/.test(n.name)).slice(0, 8).map(n => n.name.slice(0, 24) + ':' + Math.round(n.width)); }
function hideCols(f, keys) { let c = 0; for (const n of f.findAll(x => keys.includes(x.name) && !inInst(x))) { n.visible = false; c++; } return c; }
function setColW(f, key, w) { let c = 0; for (const n of f.findAll(x => x.name === key && !inInst(x))) { try { n.resize(w, n.height); if (n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL') n.counterAxisSizingMode = 'AUTO'; if (n.type === 'FRAME' && n.layoutMode === 'VERTICAL') n.primaryAxisSizingMode = 'AUTO'; c++; } catch (e) {} } return c; }

// clipped-content audit: fixed-size auto-layout frames whose children need more room (severe collapse => auto-fix to HUG)
function clipAudit(f, fix) { const r = []; for (const P of f.findAll(n => n.type === 'FRAME' && n.layoutMode && n.layoutMode !== 'NONE' && !inInst(n) && n.visible)) { const kids = P.children.filter(k => k.visible && k.layoutPositioning !== 'ABSOLUTE'); if (!kids.length) continue; const sp = P.itemSpacing > 0 ? P.itemSpacing : 0;
  const need = P.layoutMode === 'VERTICAL' ? kids.reduce((s, k) => s + k.height, 0) + sp * (kids.length - 1) + P.paddingTop + P.paddingBottom : Math.max(...kids.map(k => k.height)) + P.paddingTop + P.paddingBottom;
  if (need > P.height + 2) { const sev = P.height < need * 0.6; let done = ''; if (fix && sev && P.layoutSizingVertical === 'FIXED') { try { P.layoutSizingVertical = 'HUG'; done = ' →HUG'; } catch (e) { done = ' !fix'; } } r.push((sev ? 'SEV ' : '') + P.name.slice(0, 22) + ':' + Math.round(P.height) + '<' + Math.round(need) + ':' + P.layoutSizingVertical[0] + done); } } return r.slice(0, 12); }
// ===== END laptop pass lib =====
