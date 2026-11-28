// targeted fix: an earlier spacer fix also overrode 'Spacer' layers INSIDE the Topbar and tile instances of G1 mobile -> reset those instances and re-apply their props
const g1fix = [];
for (const id of ['149:124843', '149:125119', '149:125183', '149:125239', '149:125295', '149:125364']) {
  const inst = await figma.getNodeByIdAsync(id); if (!inst || inst.type !== 'INSTANCE') continue;
  const nm = inst.name; const cp = inst.componentProperties; const keep = {}; for (const [k, v] of Object.entries(cp)) if (v.type !== 'VARIANT') keep[k] = v.value;
  inst.resetOverrides(); if (Object.keys(keep).length) inst.setProperties(keep); inst.name = nm; g1fix.push(id);
}
