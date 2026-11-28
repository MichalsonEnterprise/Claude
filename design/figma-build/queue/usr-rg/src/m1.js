const NAME = '[USR-RG1] Responsible Gaming Hub / 390 / Default';
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellM(NAME, 'Overview', { sub: 'Lowering a limit applies at once. Raising one waits 24 hours.' });
const C = S.C; const W = 358;
const td = card('Card — Today', { gap: 12, p: 16 }); add(C, [td, 'FILL']);
const tdh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(td, [tdh, 'FILL']); tdh.appendChild(await IC('timer', 16, 'icon/brand')); add(tdh, [await T('This session 00:42:18', 'Label/M', 'text/primary'), 'FILL']); tdh.appendChild(await DEMO('XS'));
const tv = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); add(td, [tv, 'FILL']); add(tv, [await T('Net today', 'Body/S', 'text/secondary'), 'FILL']); tv.appendChild(await T('−24.60 USDT', 'Number/S', 'text/danger'));
add(td, [meter(W - 32, 0.123), 'FILL']); add(td, [await T('Daily loss limit 24.60 of 200.00 USDT used', 'Caption', 'text/tertiary'), 'FILL']);
C.appendChild(await secHead('Your limits', 'Daily limits reset at 00:00 UTC.', W));
const lst = AL('VERTICAL', { name: 'Limits list', fill: 'surface/default', stroke: 'border/subtle', r: 14, p: [4, 16, 4, 16] }); add(C, [lst, 'FILL']);
async function lrow(icon, t, v, st, last) { const r = AL('HORIZONTAL', { name: 'Row — ' + t, gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); if (!last) strokeSides(r, 'border/subtle', { b: 1 }); r.appendChild(await iconTile(icon, 'icon/brand', 36)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); tx.appendChild(await T(t, 'Body/S Strong', 'text/primary')); const vr = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'CENTER' }); tx.appendChild(vr); vr.appendChild(await T(v, 'Caption', 'text/secondary')); vr.appendChild(await DEMO('XS')); if (st) r.appendChild(st); r.appendChild(await IC('chevron-right', 20, 'icon/muted')); return r; }
add(lst, [await lrow('deposit', 'Deposit limit', '5,000.00 USDT / week · 3,500.00 used', await chip('clock', 'Pending', 'pending')), 'FILL']);
add(lst, [await lrow('ticket', 'Participation limit', '500.00 / day · 351.75 used'), 'FILL']);
add(lst, [await lrow('trending-down', 'Loss limit', '200.00 / day · −24.60 today'), 'FILL']);
add(lst, [await lrow('timer', 'Time limit', '2 h / day · 1 h 12 min today'), 'FILL']);
add(lst, [await lrow('bell', 'Reality checks', 'Every 60 min · next 17:00 UTC', null, true), 'FILL']);
add(C, [await noteBox('hourglass', 'Deposit limit increase to 7,500.00 starts 28 Nov 2026, 16:42 UTC. Cancel any time before then.', 'pending', W), 'FILL']);
C.appendChild(await secHead('Need a pause?', 'Withdrawals stay open during both.', W));
async function pc(icon, t, b, tags, btn) { const c = card('Card — ' + t, { gap: 12, p: 16 }); const h = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']); h.appendChild(await iconTile(icon, 'icon/default', 40)); add(h, [await T(t, 'Heading/H5', 'text/primary'), 'FILL']); add(c, [await T(b, 'Body/S', 'text/secondary', { w: W - 32 }), 'FILL']); const tg = AL('HORIZONTAL', { name: 'Options', gap: 8, wrap: true, cgap: 8 }); add(c, [tg, 'FILL']); for (const x of tags) tg.appendChild(await tag(x)); const bb = await BTN('Secondary', btn, { size: 'L' }); add(c, [bb, 'FILL']); return c; }
add(C, [await pc('pause-circle', 'Take a short break', 'Pause games, Global Pool entries and deposits.', ['24 hours', '7 days', '30 days'], 'Choose a break'), 'FILL']);
add(C, [await pc('ban', 'Self-exclusion', 'Close access for a long period. Balance stays withdrawable, marketing stops.', ['6 months', '1 year', '5 years', 'Permanent'], 'Learn about self-exclusion'), 'FILL']);
const help = await I('24:14743'); add(C, [help, 'FILL']);
await licM(C);
await endM(S);
await placeM(S.f, sec, 120, 160);
await S.f.screenshot({ scale: 0.5 });
return { section: sec.id, frame: S.f.id, name: NAME, h: Math.round(S.f.height), helpW: Math.round(help.width) };
