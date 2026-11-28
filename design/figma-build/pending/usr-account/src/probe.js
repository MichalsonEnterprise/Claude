// READ-ONLY probe: page 05 sections + my section frames + text layers/sizes of the library components used by this slice
const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const secs = page.children.filter(n => n.type === 'SECTION').map(s => s.name + ' | ' + s.id + ' | x' + Math.round(s.x) + ' w' + Math.round(s.width) + ' h' + Math.round(s.height) + ' n' + s.children.length);
const mine = page.children.find(n => n.type === 'SECTION' && n.name === 'USR-A1..A10 Account & security');
const frames = mine ? mine.children.map(c => c.name + ' | ' + c.id + ' | ' + Math.round(c.x) + ',' + Math.round(c.y) + ' | ' + Math.round(c.width) + 'x' + Math.round(c.height)) : null;
const want = { '23:17143': 'Card/Security Score', '23:5644': 'User/2FA Status', '23:9199': 'User/Device Row', '23:9317': 'User/Session Row', '25:15811': 'Modal/Danger', '20:3309': 'Control/Toggle', '30:16872': 'Toast', '13:762': 'Input/Text', '16:3761': 'Input/OTP', '20:9454': 'Input/File Upload', '23:5565': 'User/KYC Status Chip', '22:8712': 'Shell/Sidebar Item', '13:565': 'Select/Field', '20:3205': 'Control/Checkbox', '20:3259': 'Control/Radio' };
const comp = {};
for (const [id, nm] of Object.entries(want)) {
  const n = await figma.getNodeByIdAsync(id); if (!n) { comp[nm] = 'MISSING'; continue; }
  const v = n.type === 'COMPONENT_SET' ? n.defaultVariant : n;
  const tx = v.findAllWithCriteria({ types: ['TEXT'] }).slice(0, 18).map(t => t.name + '=' + t.characters.slice(0, 34).replace(/\n/g, ' '));
  comp[nm] = Math.round(v.width) + 'x' + Math.round(v.height) + ' [' + v.name.slice(0, 40) + '] ' + tx.join(' ; ');
}
// other variants worth knowing
const extra = {};
for (const [id, vn] of [['23:9317', 'Status=Expired'], ['30:16872', 'Type=Success'], ['23:5644', 'State=Off']]) { const n = await figma.getNodeByIdAsync(id); const v = n && n.children.find(c => c.name.includes(vn)); if (v) extra[id + ' ' + vn] = v.findAllWithCriteria({ types: ['TEXT'] }).slice(0, 14).map(t => t.name + '=' + t.characters.slice(0, 34)).join(' ; '); }
return { secs, frames, comp, extra };
