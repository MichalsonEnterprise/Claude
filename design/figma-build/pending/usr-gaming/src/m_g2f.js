// [USR-G2] My Entries / 390 / Filters — bottom sheet over My entries; section-local x=630, below Empty
const S = await shellG('[USR-G2] My Entries / 390 / Filters', 'My entries', 'My entries', 'Every Global Pool entry you bought, with its round and outcome.', { count: '35', h: 844 });
const C = S.C; C.name = 'Content (behind sheet)';
const fr = AL('HORIZONTAL', { name: 'Status chips (horizontal scroll)', gap: 8, align: 'CENTER', w: 358, clip: true }); add(C, [fr, 'FILL']);
const fb = await I('7:774', { Type: 'Secondary', Size: 'M', State: 'Pressed' }, { Icon: ICONS.filter }); fb.name = 'Filter (opens sheet)'; fr.appendChild(fb);
for (const [l, s] of [['All · 1,284', true], ['Active · 35', false], ['Won · 1', false], ['Refunded · 30', false]]) { const c = await I('17:2766', { State: s ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false }); fr.appendChild(c); }
const tk1 = await I('23:8534', { State: 'Active' }); try { tk1.rescale(358 / 400); } catch (e) {} C.appendChild(tk1);
const tk2 = await I('23:8534', { State: 'Active' }); try { tk2.rescale(358 / 400); } catch (e) {} C.appendChild(tk2);
await tabAbs(S.f, 'Pool');
await sheetG(S.f, 'Filter entries', '2 filters set · the list updates when you tap Show', async (sh) => {
  const s1 = AL('VERTICAL', { name: 'Status', gap: 8 }); add(sh, [s1, 'FILL']); s1.appendChild(await overline('Status'));
  add(s1, [await chipRow([['Active · 35', false], ['Won · 1', true], ['Not selected · 1,218', false], ['Refunded · 30', true]], { wrap: true, name: 'Status chips (multi-select)' }), 'FILL']);
  const s2 = AL('VERTICAL', { name: 'Rounds', gap: 8 }); add(sh, [s2, 'FILL']); s2.appendChild(await overline('Rounds'));
  const rr = AL('HORIZONTAL', { name: 'Round range', gap: 12 }); add(s2, [rr, 'FILL']);
  for (const [l, v] of [['From', 'Round #1,240'], ['To', 'Round #1,248']]) { const sf = await I('13:565', { State: 'Default' }, { Label: l, Value: v, 'Show helper': false, 'Show leading icon': false }); add(rr, [sf, 'FILL']); }
  add(s2, [await T('Rounds drawn 19 – 27 Nov 2026 (one draw a day at 20:00 UTC)', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
  const s3 = AL('VERTICAL', { name: 'Sort by', gap: 8 }); add(sh, [s3, 'FILL']); s3.appendChild(await overline('Sort by'));
  for (const [l, sel] of [['Newest round first', 'Yes'], ['Oldest round first', 'No']]) { const r = await I('20:3259', { Selected: sel, State: 'Default' }, { Label: l, 'Show description': false }); add(s3, [r, 'FILL']); }
  const nb = await noteBox('info', '31 of 1,284 entries match — 1 won in round #1,244 and 30 refunded from cancelled round #1,245.', 'info', 358); nb.appendChild(await DEMO('XS')); add(sh, [nb, 'FILL']);
}, [[await BTN('Ghost', 'Clear all', { size: 'L' }), null], [await BTN('Primary', 'Show 31 entries', { size: 'L' }), 'FILL']]);
const emp = sec.children.find(c => c.name === '[USR-G2] My Entries / 390 / Empty');
await placeG(S.f, 630, emp ? emp.y + emp.height + 160 : 4373);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: S.f.name, h: Math.round(S.f.height), section: sec.id };
