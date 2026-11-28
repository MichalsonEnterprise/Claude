const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const NAME = '[ADM-C5] Restricted Countries / 1440 / Default';
const { f, c } = await SHELL(NAME, POS('C-1440', 'C5'), 'C', 4, 'KO', 'Search country or ISO code…');
await HEAD(c, ['Admin', 'Compliance', 'Restricted countries'], 'Restricted countries', 'Where GLOBAL POOL may be offered. Players in a restricted region can always sign in, see balances and withdraw — they cannot play, enter rounds or deposit. The list below is DEMO; the production list is owned by Legal and follows each licence.', { badges: [await DEMO('M')], actions: [await BTN('Secondary', 'Preview player message', { size: 'S', lead: 'eye' }), await BTN('Primary', 'Propose change', { size: 'S', lead: 'plus' })] });
await ROW(c, [await KPI('Flat', 'Permitted jurisdictions', '41', 'countries', '0 this month', 'Licence coverage per Legal register LEG-2026-11 (DEMO)', 'vs October'), await KPI('Flat', 'Restricted jurisdictions', '28', 'countries', '+1 pending', 'Brazil · Global Pool only, from 1 Jan 2027 (CH-0042)', 'awaiting approval'), await KPI('Flat', 'Players in restricted regions', '1,318', 'players', '412 with balance', 'Withdraw-only access · no play, entries or deposits', 'today')], { spark: 1 });
await TABS(c, [['All', '69'], ['Restricted', '28'], ['Permitted', '41'], ['Pending changes', '1']], 'All');
async function cap(on, lab) { return C(await IC(on === 1 ? 'check-circle' : on === 2 ? 'clock' : 'ban', 16, on === 1 ? 'status/success' : on === 2 ? 'status/warning' : 'status/danger'), await T(lab || (on === 1 ? 'Allowed' : on === 2 ? 'Changing' : 'Blocked'), 'Body/S', on === 1 ? 'text/secondary' : on === 2 ? 'text/warning' : 'text/danger')); }
const K = [
  ['United States', 'US', ['Restricted', 'Restricted'], 0, 0, 0, '412', '1 Mar 2025', 'LEG-014'],
  ['United Kingdom', 'GB', ['Restricted', 'Restricted'], 0, 0, 0, '286', '1 Mar 2025', 'LEG-009'],
  ['France', 'FR', ['Restricted', 'Restricted'], 0, 0, 0, '163', '1 Mar 2025', 'LEG-011'],
  ['Australia', 'AU', ['Restricted', 'Restricted'], 0, 0, 0, '141', '12 Jun 2025', 'LEG-019'],
  ['Netherlands', 'NL', ['Restricted', 'Restricted'], 0, 0, 0, '98', '1 Mar 2025', 'LEG-012'],
  ['Brazil', 'BR', ['Pending', 'Change pending'], 2, 1, 1, '6,430', '1 Jan 2027', 'CH-0042'],
  ['Germany', 'DE', ['Approved', 'Permitted'], 1, 1, 1, '14,206', '1 Mar 2025', 'LIC-DE-01'],
  ['Portugal', 'PT', ['Approved', 'Permitted'], 1, 1, 1, '9,812', '1 Mar 2025', 'LIC-PT-01'],
  ['Canada', 'CA', ['Approved', 'Permitted'], 1, 1, 1, '5,102', '4 Aug 2025', 'LIC-CA-02'],
  ['Japan', 'JP', ['Approved', 'Permitted'], 1, 1, 1, '3,915', '4 Aug 2025', 'LIC-JP-01']];
const rows = [];
for (const k of K) rows.push([C(await IC('globe', 16, 'icon/muted'), await T(k[0], 'Body/S Strong', 'text/primary'), await T(k[1], 'Mono/S', 'text/tertiary')), { T: 'Status', st: k[2][0], p: k[2][1] }, await cap(k[3], k[3] === 2 ? 'Pool from 1 Jan' : null), await cap(k[4]), await cap(k[5]), await cap(1, 'Always'), C(await T(k[6], 'Body/S Strong', 'text/primary')), { T: 'Text', p: k[7], c: 'text/secondary' }, { T: 'Text', p: k[8], mono: 1, c: 'text/tertiary' }]);
await TABLE(c, 'Jurisdictions', [{ k: 'country', l: 'Country', w: 'FILL' }, { k: 'status', l: 'Status', w: 148 }, { k: 'play', l: 'Play & entries', w: 136 }, { k: 'signup', l: 'Sign-up', w: 104 }, { k: 'deposit', l: 'Deposits', w: 104 }, { k: 'wd', l: 'Withdrawals', w: 112 }, { k: 'users', l: 'Players', w: 88, r: 1 }, { k: 'since', l: 'Effective', w: 112 }, { k: 'ref', l: 'Legal ref', w: 108 }], rows, { sel: [5], hideL: ['since', 'ref', 'signup'], head: await TH('Jurisdictions', { meta: 'Showing 10 of 69 · sorted by status' }), foot: await PAGER('Numbered', '1–10 of 69', 10, 7) });
// pending change + detection
const pc = CARD('Pending change CH-0042', { stroke: 'border/brand', gap: 12 });
await CHEAD(pc, 'CH-0042 · Restrict Brazil — Global Pool only', { icon: 'flag', badges: [await ST('Pending', 'Awaiting 2nd approver')] });
await KV(pc, 'Effective', '1 Jan 2027, 00:00 UTC'); await KV(pc, 'Requested by', 'P. Novak (Compliance) · 25 Nov 2026'); await KV(pc, 'Reason', 'New national rules for prize-pool products (DEMO)'); await KV(pc, 'Players affected', '6,430 · casino games stay available');
await NOTE(pc, 'info', 'info', 'Players are notified 7 days before (25 Dec 2026). Entries still open at 00:00 UTC on 1 Jan are refunded under the round rules — no manual payouts.', { w: 420 });
const ap = AL('HORIZONTAL', { name: 'Approvals', gap: 8, align: 'CENTER' }); add(ap, await ST('Approved', 'Compliance · P. Novak'), await ST('Pending', 'Legal or Super Admin')); add(pc, ap);
const br = AL('HORIZONTAL', { name: 'Actions', gap: 8, align: 'CENTER' }); add(br, await BTN('Primary', 'Approve as second approver', { size: 'S', state: 'Disabled', lead: 'user-check' }), await BTN('Ghost', 'View request', { size: 'S', trail: 'arrow-right' })); add(pc, br);
await WT(pc, 'You can’t approve: same role as the requester (Compliance). Legal or a Super Admin must approve.', 'Caption', 'text/tertiary', 400);
const dt = CARD('How a region is determined', { gap: 10 });
await CHEAD(dt, 'How a player’s region is determined', { icon: 'map-pin', demo: false });
for (const [ic, t1, t2] of [['id-card', 'KYC residence address', 'Authoritative once verified · re-checked at every KYC level'], ['globe', 'IP geolocation every session', 'Mismatch with residence opens a review, never a silent change'], ['shield-alert', 'Anonymising proxy detected', 'Session is treated as restricted: withdraw-only until a normal connection is used']]) { const r = AL('HORIZONTAL', { name: t1, gap: 12, p: [10, 12, 10, 12], fill: 'surface/raised', r: 10 }); add(r, await IC(ic, 18, 'icon/muted')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); await WT(tx, t1, 'Body/S Strong', 'text/primary', 300); await WT(tx, t2, 'Caption', 'text/tertiary', 300); add(r, [tx, 'FILL']); add(dt, [r, 'FILL']); }
await ROW(c, [pc, dt], { gap: 24 });
const pm = CARD('Player message preview', { gap: 12 }); add(c, [pm, 'FILL']);
await CHEAD(pm, 'What restricted players see', { icon: 'eye', demo: false, right: [await T('Shown on every gambling surface · not dismissible', 'Caption', 'text/tertiary')] });
const ban = await I('30:17116', { Type: 'Regional restriction', Layout: 'Inline' }); add(pm, ban);
return await DONE(f);
