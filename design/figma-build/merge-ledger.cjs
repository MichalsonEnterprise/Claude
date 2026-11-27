// Usage: node merge-ledger.js <results.json> [...more]   (workflow result arrays: [{key, ledger:[{id,status,note}], created:[...], issues:[...]}])
// Updates ledger.json statuses (never downgrades VERIFIED), records frame/component ids per agent in built.json,
// and prints counts by status / priority / page.
const fs = require('fs'); const path = require('path');
const dir = __dirname; const L = JSON.parse(fs.readFileSync(path.join(dir, 'ledger.json'), 'utf8'));
const builtPath = path.join(dir, 'built.json'); const built = fs.existsSync(builtPath) ? JSON.parse(fs.readFileSync(builtPath, 'utf8')) : {};
const rank = { 'NOT STARTED': 0, 'BLOCKED': 0, 'IN PROGRESS': 1, 'PARTIAL': 1, 'BUILT': 2, 'VERIFIED': 3 };
const norm = s => { s = String(s || '').toUpperCase(); if (s.startsWith('VERIF')) return 'VERIFIED'; if (s.startsWith('BUILT')) return 'BUILT'; if (s.startsWith('PART') || s.startsWith('IN PROG')) return 'IN PROGRESS'; if (s.startsWith('BLOCK')) return 'BLOCKED'; return 'NOT STARTED'; };
for (const f of process.argv.slice(2)) {
  let res = JSON.parse(fs.readFileSync(f, 'utf8')); if (!Array.isArray(res)) res = res.result || res.results || [res];
  for (const r of res) {
    if (!r) continue; built[r.key] = { section: r.section, created: r.created, issues: r.issues };
    for (const e of r.ledger || []) {
      const ids = String(e.id).split(/[,\s]+/).filter(Boolean);
      for (const id of ids) { const row = L.find(x => x.id === id); if (!row) continue; const s = norm(e.status); if (rank[s] >= rank[row.status] || row.status === 'NOT STARTED') { row.status = s; if (e.note) row.note = e.note; row.by = r.key; } }
    }
  }
}
fs.writeFileSync(path.join(dir, 'ledger.json'), JSON.stringify(L, null, 1)); fs.writeFileSync(builtPath, JSON.stringify(built, null, 1));
const count = (k) => { const o = {}; for (const r of L) { const g = r[k]; o[g] = o[g] || {}; o[g][r.status] = (o[g][r.status] || 0) + 1; } return o; };
const tot = {}; for (const r of L) tot[r.status] = (tot[r.status] || 0) + 1;
console.log('TOTAL', L.length, JSON.stringify(tot)); console.log('BY PRI', JSON.stringify(count('pri'))); console.log('BY PAGE', JSON.stringify(count('page')));
