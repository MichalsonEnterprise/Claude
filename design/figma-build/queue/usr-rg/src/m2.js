const STATE = '__STATE__'; const PEND = STATE === 'Pending increase';
const NAME = '[USR-RG2] Deposit Limits / 390 / ' + (PEND ? 'Pending increase — 24 h cool-down' : 'Default');
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellM(NAME, 'Deposit limits', { title: 'Deposit limits', sub: 'Lower it and it applies at once. A higher limit waits 24 hours.' });
const C = S.C; const W = 358;
if (PEND) { const pb = card('Pending increase notice', { gap: 12, p: 16, fill: 'status/pending-tint', stroke: 'status/pending' }); add(C, [pb, 'FILL']); const h = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(pb, [h, 'FILL']); h.appendChild(await IC('hourglass', 20, 'status/pending')); add(h, [await T('Increase to 7,500.00 / week pending', 'Body/S Strong', 'text/primary'), 'FILL']); h.appendChild(await DEMO('XS')); add(pb, [await T('Starts 28 Nov 2026, 16:42 UTC. Until then your limit stays 5,000.00 USDT / week.', 'Body/S', 'text/secondary', { w: W - 32 }), 'FILL']); const cb = await BTN('Secondary', 'Cancel increase', { size: 'L', lead: 'undo' }); add(pb, [cb, 'FILL']); }
const ls = await I('23:21988', { Type: 'Deposit', State: PEND ? 'Pending increase' : 'Default' }); add(C, [ls, 'FILL']); ls.name = 'RG/Limit Setter — Deposit';
const wk = card('Card — Deposits this week', { gap: 0, p: 16 }); add(C, [wk, 'FILL']);
const wh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(wk, [wh, 'FILL']); add(wh, [await T('Counted this week', 'Heading/H5', 'text/primary'), 'FILL']); wh.appendChild(await DEMO('S'));
async function dr(id, chain, meta, ic, lab, tone, amt) { const r = AL('VERTICAL', { name: 'Deposit — ' + id, gap: 8, p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); const a = AL('HORIZONTAL', { name: 'Top', gap: 8, align: 'CENTER' }); add(r, [a, 'FILL']); a.appendChild(await CHAIN(chain, 20)); add(a, [await T(id + ' · ' + chain, 'Mono/S', 'text/primary'), 'FILL']); a.appendChild(await T(amt, 'Number/S', 'text/primary')); const b = AL('HORIZONTAL', { name: 'Bottom', gap: 8, align: 'CENTER' }); add(r, [b, 'FILL']); add(b, [await T(meta, 'Caption', 'text/tertiary'), 'FILL']); b.appendChild(await chip(ic, lab, tone)); return r; }
add(wk, [await dr('DP-77380', 'BNB Chain', 'Tue 24 Nov, 10:18 UTC', 'check-circle', 'Credited', 'success', '2,500.00'), 'FILL']);
add(wk, [await dr('DP-77412', 'Ethereum', 'Today 16:31 UTC · 7/12', 'clock', 'Confirming', 'info', '1,000.00'), 'FILL']);
add(wk, [await kv('Used of 5,000.00 USDT', '3,500.00 · 1,500.00 left', { divider: false }), 'FILL']);
const how = card('Card — How it works', { gap: 12, p: 16 }); add(C, [how, 'FILL']); how.appendChild(await T('How deposit limits work', 'Heading/H5', 'text/primary'));
add(how, [await bullet('trending-down', 'Lower: applies immediately', null, W - 32), 'FILL']);
add(how, [await bullet('hourglass', 'Raise or remove: waits 24 hours, cancel any time', null, W - 32, 'status/pending'), 'FILL']);
add(how, [await bullet('layers', 'All five networks are added together', null, W - 32), 'FILL']);
add(how, [await bullet('lock', 'Transfers over the limit are held for withdrawal only', null, W - 32, 'icon/muted'), 'FILL']);
const help = await I('24:14743'); add(C, [help, 'FILL']);
await licM(C); await endM(S);
if (PEND) { const d = byName(sec, '[USR-RG2] Deposit Limits / 390 / Default'); await placeM(S.f, sec, 630, d ? d.y + d.height + 160 : nextY(sec)); } else await placeM(S.f, sec, 630, 160);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height), lsW: Math.round(ls.width) };
