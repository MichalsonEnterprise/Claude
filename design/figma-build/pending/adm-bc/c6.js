const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const NAME = '[ADM-C6] Self-Exclusion / 1440 / Default';
const { f, c } = await SHELL(NAME, POS('C-1440', 'C6'), 'C', 5, 'KO', 'Search player, GP- ID or register ref…');
await HEAD(c, ['Admin', 'Compliance', 'Self-exclusion'], 'Self-exclusion & cooling-off', 'Breaks requested by players or imported from the national self-exclusion register (DEMO). While a break is active, players can still sign in and withdraw; play, entries, deposits and all marketing stop, and open entries are refunded under the round rules.', { badges: [await DEMO('M')], actions: [await BTN('Secondary', 'Register sync log', { size: 'S', lead: 'refresh' }), await BTN('Secondary', 'Export for regulator', { size: 'S', lead: 'download' })] });
const can = CARD('What admins can and cannot do', { dir: 'HORIZONTAL', gap: 24, fill: 'brand/tint-subtle', stroke: 'border/brand' }); add(c, [can, 'FILL']);
for (const [ic, col, title, items] of [['check-circle', 'status/success', 'Admins can', ['View and export exclusions for the regulator', 'Record a support contact on the player’s file', 'Handle reinstatement after the period ends: player request + 24 h cool-down + RG check-in']], ['ban', 'status/danger', 'Admins cannot', ['End, shorten or pause an exclusion early', 'Edit start or end dates, or delete a record', 'Send bonuses, promotions or win-back messages']]]) {
  const col1 = AL('VERTICAL', { name: title, gap: 8 }); const h = AL('HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); add(h, await IC(ic, 18, col), await T(title, 'Label/L', 'text/primary')); add(col1, h); for (const it of items) { const r = AL('HORIZONTAL', { name: 'Item', gap: 8 }); add(r, rect(4, 4, 'border/strong', 9999, 'Bullet')); r.counterAxisAlignItems = 'CENTER'; await WT(r, it, 'Body/S', 'text/secondary', 420); add(col1, [r, 'FILL']); } add(can, [col1, 'FILL']); }
await ROW(c, [await KPI('Flat', 'Active self-exclusions', '2,416', 'players', '+74 this week', '6 months 812 · 1 year 943 · 5 years 402 · indefinite 259', 'vs last week'), await KPI('Flat', 'Active cooling-off', '318', 'players', '24 h 96 · 7 d 151 · 30 d 71', 'Ends automatically; no early end on request', 'right now'), await KPI('Flat', 'Blocked re-registrations (30 d)', '12', 'attempts', '+2 this week', 'Same document, face or device as an excluded player', 'vs last week')], { spark: 1 });
await TABS(c, [['Active', '2,734'], ['Ending in 7 days', '41'], ['Reinstatement requests', '3'], ['Ended · 90 days', '512']], 'Active');
const X = [
  ['PF', '@pixelfox', 'GP-47120', 'Self-exclusion · 5 years', '14 Mar 2026', '14 Mar 2031', 'Player · app', '0.00', ['Restricted', 'Breach blocked']],
  ['IE', '@ivy.eth', 'GP-38214', 'Self-exclusion · indefinite', '2 Feb 2025', 'No end date', 'National register', '0.00', ['Restricted', 'Active']],
  ['FW', '@fenwick', 'GP-44009', 'Self-exclusion · 6 months', '1 Jun 2026', '1 Dec 2026', 'Support-assisted', '0.00', ['Restricted', 'Active · ends in 4 d']],
  ['SV', '@sora_v', 'GP-50317', 'Cooling-off · 7 days', '25 Nov, 16:42', '2 Dec, 16:42', 'Player · web', '312.40', ['Pending', 'Cooling-off']],
  ['BR', '@blitz_r', 'GP-49933', 'Cooling-off · 24 hours', '27 Nov, 07:05', '28 Nov, 07:05', 'Player · app', '0.00', ['Pending', 'Cooling-off']],
  ['MQ', '@maple.q', 'GP-41876', 'Self-exclusion · 1 year', '20 Nov 2025', 'Ended 20 Nov 2026', 'Player · web', '58.00', ['Under review', 'Return requested']]];
const rows = [];
for (const x of X) rows.push([{ T: 'User', i: x[0], p: x[1], s: x[2] }, { T: 'Text', p: x[3] }, { T: 'Text', p: x[4], c: 'text/secondary' }, { T: 'Text', p: x[5], c: 'text/secondary' }, { T: 'Text', p: x[6], c: 'text/tertiary' }, CR(await T(x[7], 'Number/S', 'text/primary'), await T('USDT', 'Caption', 'text/tertiary')), { T: 'Status', st: x[8][0], p: x[8][1] }, { T: 'Actions' }]);
await TABLE(c, 'Exclusions', [{ k: 'user', l: 'Player', w: 'FILL' }, { k: 'type', l: 'Type', w: 184 }, { k: 'start', l: 'Started (UTC)', w: 116 }, { k: 'end', l: 'Ends (UTC)', w: 132 }, { k: 'source', l: 'Source', w: 128 }, { k: 'bal', l: 'Balance', w: 120, r: 1 }, { k: 'status', l: 'Status', w: 172 }, { k: 'act', l: '', w: 44 }], rows, { density: 'Comfortable', sel: [0], hideL: ['source', 'start'], head: await TH('Breaks', { meta: 'Register sync 27 Nov 2026, 06:00 UTC · 0 errors' }), foot: await PAGER('Numbered', '1–6 of 2,734', 6, 456) });
const br = CARD('Breach attempt — @pixelfox', { stroke: 'border/danger', gap: 12 });
await CHEAD(br, 'Blocked re-registration · @pixelfox', { icon: 'shield-alert', ic: 'status/danger' });
await WT(br, '26 Nov 2026, 22:10 UTC — a new sign-up used the same passport number (•••• 7731) and device fingerprint as an excluded player. KYC blocked it: no account was created and no deposit was accepted.', 'Body/S', 'text/secondary', 460);
await NOTE(br, 'heart', 'info', 'Do not contact the player about marketing or bonuses. If the player contacts support, offer the help resources and record the contact.', { w: 420 });
const bb = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); add(bb, await BTN('Secondary', 'Record support contact', { size: 'S', lead: 'chat' }), await BTN('Ghost', 'View blocked sign-up', { size: 'S', trail: 'arrow-right' })); add(br, bb);
const rq = CARD('Reinstatement — @maple.q', { gap: 12 });
await CHEAD(rq, 'Reinstatement request · @maple.q', { icon: 'rotate-ccw' });
await STEPS(rq, [['done', 'Exclusion period ended', '20 Nov 2026 · 1 year'], ['done', 'Player asked to return', '27 Nov 2026, 09:15 UTC · in-app form'], ['now', '24-hour cool-down', 'Until 28 Nov 2026, 09:15 UTC — cannot be shortened'], ['next', 'RG check-in call', 'With the RG team before any play'], ['next', 'Limits set before first deposit', 'Deposit, loss and session limits are mandatory']]);
add(rq, await BTN('Primary', 'Schedule RG check-in', { size: 'S', lead: 'calendar', state: 'Disabled' }));
await WT(rq, 'Available after the cool-down ends. Reinstatement never happens automatically or early.', 'Caption', 'text/tertiary', 400);
await ROW(c, [br, rq], { gap: 24 });
return await DONE(f);
