const STATE = '__STATE__'; const PEND = STATE === 'Pending increase';
const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const sec = section('USR-RG1..RG7 Responsible gaming', 60000, 0);
const NAME = '[USR-RG2] Deposit Limits / 1440 / ' + (PEND ? 'Pending increase — 24 h cool-down' : 'Default');
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellD(NAME, 'Deposit limits', { title: 'Deposit limits', sub: 'Cap how much you can deposit each day, week or month. Lower it any time and it applies at once; a higher limit waits 24 hours.' });
const C = S.C; const MW = 672; const RW = 440;
const { m, rail } = cols(C, RW);
if (PEND) {
  const pb = AL('HORIZONTAL', { name: 'Pending increase notice', gap: 16, p: 20, fill: tk('status/pending-tint'), stroke: tk('status/pending', 'border/default'), r: 14 }); add(m, [pb, 'FILL']);
  pb.appendChild(await iconTile('hourglass', 'status/pending', 40, 'surface/default'));
  const tx = AL('VERTICAL', { name: 'Text', gap: 4 }); add(pb, [tx, 'FILL']);
  add(tx, [await T('Your increase to 7,500.00 USDT / week is in its 24-hour cool-down', 'Body/M Strong', 'text/primary', { w: 420 }), 'FILL']);
  add(tx, [await T('It starts on 28 Nov 2026, 16:42 UTC. Until then your limit stays 5,000.00 USDT / week. Changed your mind? Cancel and nothing changes.', 'Body/S', 'text/secondary', { w: 420 }), 'FILL']);
  const ac = AL('HORIZONTAL', { name: 'Actions', gap: 8, align: 'CENTER' }); tx.appendChild(ac); ac.appendChild(await DEMO('S')); ac.appendChild(await chip('clock', 'Starts in 24 h', 'pending'));
  pb.appendChild(await BTN('Secondary', 'Cancel increase', { size: 'S', lead: 'undo' }));
}
const ls = await I('23:21988', { Type: 'Deposit', State: PEND ? 'Pending increase' : 'Default' }); add(m, [ls, 'FILL']); ls.name = 'RG/Limit Setter — Deposit';
// this week's deposits
const wk = card('Card — Deposits this week', { gap: 0, p: 24 }); add(m, [wk, 'FILL']);
const wh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [0, 0, 16, 0] }); add(wk, [wh, 'FILL']);
const wht = AL('VERTICAL', { name: 'Title', gap: 2 }); add(wh, [wht, 'FILL']); wht.appendChild(await T('Deposits counted this week', 'Heading/H5', 'text/primary')); wht.appendChild(await T('Mon 23 Nov 00:00 UTC – Sun 29 Nov 23:59 UTC', 'Body/S', 'text/tertiary'));
wh.appendChild(await DEMO('S'));
async function depRow(id, chain, when, statusIcon, statusLabel, tone, amt) {
  const r = AL('HORIZONTAL', { name: 'Deposit — ' + id, gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { t: 1 });
  const ct = AL('HORIZONTAL', { name: 'Chain', w: 36, h: 36, fill: 'surface/raised', r: 10, align: 'CENTER', justify: 'CENTER' }); ct.appendChild(await CHAIN(chain, 20)); r.appendChild(ct);
  const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); tx.appendChild(await T(id + ' · ' + chain, 'Mono/S', 'text/primary')); tx.appendChild(await T(when, 'Caption', 'text/tertiary'));
  r.appendChild(await chip(statusIcon, statusLabel, tone)); const a = await T(amt, 'Number/S', 'text/primary'); r.appendChild(a); r.appendChild(await DEMO('XS'));
  return r;
}
add(wk, [await depRow('DP-77380', 'BNB Chain', 'Tue 24 Nov 2026, 10:18 UTC', 'check-circle', 'Credited', 'success', '2,500.00 USDT'), 'FILL']);
add(wk, [await depRow('DP-77412', 'Ethereum', 'Fri 27 Nov 2026, 16:31 UTC · 7 / 12 confirmations', 'clock', 'Confirming', 'info', '1,000.00 USDT'), 'FILL']);
const tot = AL('HORIZONTAL', { name: 'Total', gap: 12, align: 'CENTER', p: [16, 0, 0, 0] }); strokeSides(tot, 'border/default', { t: 1 }); add(wk, [tot, 'FILL']);
add(tot, [await T('Counted toward your limit', 'Body/S Strong', 'text/secondary'), 'FILL']); tot.appendChild(await T('3,500.00 of 5,000.00 USDT', 'Number/S', 'text/primary')); tot.appendChild(await DEMO('XS'));
add(wk, [await T('1,500.00 USDT left this week. Pending deposits count from the moment the transfer is detected on-chain.', 'Caption', 'text/tertiary', { w: MW - 48 }), 'FILL']);
// history
const hi = card('Card — Limit history', { gap: 0, p: 24 }); add(m, [hi, 'FILL']);
const hh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [0, 0, 16, 0] }); add(hi, [hh, 'FILL']); add(hh, [await T('Limit history', 'Heading/H5', 'text/primary'), 'FILL']); hh.appendChild(await DEMO('S'));
async function histRow(when, what, change, icon, label, tone) {
  const r = AL('HORIZONTAL', { name: 'History — ' + when, gap: 16, align: 'CENTER', p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { t: 1 });
  const w = AL('VERTICAL', { name: 'When', gap: 2, w: 200 }); r.appendChild(w); w.appendChild(await T(when, 'Body/S', 'text/secondary'));
  const d = AL('VERTICAL', { name: 'What', gap: 2 }); add(r, [d, 'FILL']); d.appendChild(await T(what, 'Body/S Strong', 'text/primary')); d.appendChild(await T(change, 'Mono/S', 'text/tertiary'));
  r.appendChild(await chip(icon, label, tone)); return r;
}
if (PEND) add(hi, [await histRow('27 Nov 2026, 16:42 UTC', 'Weekly limit increase requested', '5,000.00 → 7,500.00 USDT', 'hourglass', 'Starts 28 Nov, 16:42 UTC', 'pending'), 'FILL']);
add(hi, [await histRow('02 Nov 2026, 09:12 UTC', 'Weekly limit lowered', '8,000.00 → 5,000.00 USDT', 'check-circle', 'Applied immediately', 'success'), 'FILL']);
add(hi, [await histRow('14 Oct 2026, 18:05 UTC', 'Weekly limit set', '— → 8,000.00 USDT', 'check-circle', 'Applied immediately', 'success'), 'FILL']);
// rail
const how = card('Card — How deposit limits work', { gap: 16, p: 24 }); add(rail, [how, 'FILL']);
how.appendChild(await T('How deposit limits work', 'Heading/H5', 'text/primary'));
const BW = RW - 48;
add(how, [await bullet('trending-down', 'Lower it: applies immediately', 'The new, lower limit counts deposits already made this week.', BW), 'FILL']);
add(how, [await bullet('hourglass', 'Raise or remove it: waits 24 hours', 'You can cancel during the cool-down. We email you when it starts and when it ends.', BW, 'status/pending'), 'FILL']);
add(how, [await bullet('layers', 'Every network counts', 'BNB Chain, Polygon, Arbitrum, Ethereum and Solana deposits are added together.', BW), 'FILL']);
add(how, [await bullet('lock', 'Over-limit transfers are held, not played', 'Blockchain transfers cannot be stopped once sent. Any amount above your limit is held and can only be withdrawn.', BW, 'icon/muted'), 'FILL']);
const help = await I('24:14743'); add(rail, [help, 'FILL']);
await footD(C);
if (PEND) { const d = byName(sec, '[USR-RG2] Deposit Limits / 1440 / Default'); await placeD(S.f, sec, 1680, d ? d.y + d.height + 160 : nextY(sec)); } else await placeD(S.f, sec, 1680, 160);
await S.f.screenshot({ scale: 0.5 });
return { section: sec.id, frame: S.f.id, name: NAME, h: Math.round(S.f.height), ls: ls.findAllWithCriteria({ types: ['TEXT'] }).map(t => t.characters.slice(0, 50)).slice(0, 30) };
