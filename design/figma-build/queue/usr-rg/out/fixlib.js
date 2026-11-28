// ===== RG FIX LIB =====
async function setExact(root, map) { let n = 0; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { const c = t.characters; if (Object.prototype.hasOwnProperty.call(map, c)) { for (const f of t.getRangeAllFontNames(0, c.length)) await figma.loadFontAsync(f); t.characters = map[c]; n++; } } return n; }
async function setPeriod(ls, to) {
  const log = []; const lt = i => i.findAllWithCriteria({ types: ['TEXT'] })[0];
  for (const it of ls.findAllWithCriteria({ types: ['INSTANCE'] })) { let cp; try { cp = it.componentProperties; } catch (e) { continue; } for (const [k, v] of Object.entries(cp)) { if (v.type === 'VARIANT' && v.value === 'Daily') { try { it.setProperties({ [k]: to }); log.push('prop ' + it.name + ' ' + k); } catch (e) { log.push('err ' + e.message); } } } }
  if (log.length) return log;
  const items = ls.findAllWithCriteria({ types: ['INSTANCE'] }).filter(i => { const t = i.findAllWithCriteria({ types: ['TEXT'] }); return t.length === 1 && ['Daily', 'Weekly', 'Monthly'].includes(t[0].characters); });
  const d = items.find(i => lt(i).characters === 'Daily'); const w = items.find(i => lt(i).characters === to);
  if (d && w) { const vd = {}, vw = {}; for (const [k, v] of Object.entries(d.componentProperties)) if (v.type === 'VARIANT') vd[k] = v.value; for (const [k, v] of Object.entries(w.componentProperties)) if (v.type === 'VARIANT') vw[k] = v.value; d.setProperties(vw); w.setProperties(vd); log.push('swap ' + JSON.stringify(vd) + ' ' + JSON.stringify(vw));
    for (const [i, lab] of [[d, 'Daily'], [w, to]]) { const t = lt(i); if (t && t.characters !== lab) { for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = lab; } } }
  else log.push('no items: ' + items.length);
  return log;
}
function setMeter(ls, pct) { const out = []; for (const n of ls.findAll(x => /fill/i.test(x.name) && (x.type === 'RECTANGLE' || x.type === 'FRAME') && x.parent && x.parent.type !== 'INSTANCE' && x.parent.width > 100 && x.height <= 12)) { const pw = n.parent.width; try { if (n.parent.layoutMode && n.parent.layoutMode !== 'NONE') n.layoutSizingHorizontal = 'FIXED'; n.resize(Math.max(6, Math.round(pw * pct)), n.height); out.push(n.name + ' ' + Math.round(n.width) + '/' + Math.round(pw)); } catch (e) { out.push('err ' + n.name + ' ' + e.message); } } return out; }
function meterInfo(ls) { return ls.findAll(n => /fill|progress|bar|meter|track/i.test(n.name) && n.type !== 'TEXT').slice(0, 8).map(n => n.name + ':' + n.type + ':' + Math.round(n.width) + 'x' + Math.round(n.height) + '/' + (n.parent ? n.parent.name + ':' + Math.round(n.parent.width) : '')); }
// ===== END RG FIX LIB =====
