const STATE = '__STATE__';
const LBL = { Default: 'Default — choose a break', Confirm: 'Confirm — bottom sheet, 7 days', Active: 'Active — ends 4 Dec 2026, 16:42 UTC' };
const NAME = '[USR-RG6] Cooling-Off Period / 390 / ' + LBL[STATE];
const old = byName(sec, NAME); if (old) old.remove();
const ACT = STATE === 'Active';
let bn = null;
if (ACT) { bn = AL('VERTICAL', { name: 'Banner — break active', gap: 8, p: [12, 16, 12, 16], fill: tk('status/info-tint') }); strokeSides(bn, tk('status/info', 'border/default'), { b: 1 }); const h = AL('HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); bn.appendChild(h); h.layoutSizingHorizontal = 'HUG'; h.appendChild(await IC('pause-circle', 20, 'status/info')); h.appendChild(await T('Break on until 4 Dec 2026, 16:42 UTC', 'Body/S Strong', 'text/primary')); h.appendChild(await DEMO('XS')); bn.appendChild(await T('Games, entries and deposits paused. Withdrawals stay open.', 'Caption', 'text/secondary', { w: 358 })); }
const S = await shellM(NAME, 'Cooling-off', { title: 'Cooling-off period', sub: 'Step away for 24 hours, 7 days or 30 days. Withdrawals stay open.', banner: bn, noDeposit: ACT });
const C = S.C; const W = 358;
const cc = await I('24:14742', { State: STATE === 'Default' ? 'Default' : STATE === 'Confirm' ? 'Selected' : 'Active' }); add(C, [cc, 'FILL']); cc.name = 'RG/Cooling-Off Card';
if (ACT) { const wd = card('Card — Your balance', { gap: 12, p: 16 }); add(C, [wd, 'FILL']); wd.appendChild(await T('Available to withdraw', 'Body/S', 'text/secondary')); const wv = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); wd.appendChild(wv); wv.appendChild(await T('9,215.30 USDT', 'Number/L', 'balance/available')); wv.appendChild(await DEMO('S')); const b = await BTN('Primary', 'Withdraw funds', { size: 'L', lead: 'withdraw' }); add(wd, [b, 'FILL']); }
const du = card('Card — During', { gap: 12, p: 16 }); add(C, [du, 'FILL']); du.appendChild(await T(ACT ? 'While your break is on' : 'During your break', 'Heading/H5', 'text/primary'));
add(du, [await bullet('pause-circle', 'Paused', 'Games, Global Pool entries, deposits and all promotions.', W - 32, 'status/warning'), 'FILL']);
add(du, [await bullet('check-circle', 'Still available', 'Withdrawals, history and support.', W - 32, 'status/success'), 'FILL']);
add(du, [await bullet('ticket', 'Entries you hold', '35 entries in round #1,248 stay in the draw (closes 20:00 UTC).', W - 32, 'icon/gold'), 'FILL']);
const help = await I('24:14743'); add(C, [help, 'FILL']);
await licM(C); await endM(S);
const xs = { Default: 0, Confirm: 1, Active: 2 }[STATE];
await placeM(S.f, sec, 2670 + xs * 510, 160);
if (STATE === 'Confirm') {
  await sheetM(S.f, 'Start a 7-day break?', 'Once it starts, it cannot be shortened or cancelled.', async (sh) => {
    const st = AL('VERTICAL', { name: 'Summary', gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised', r: 14 }); add(sh, [st, 'FILL']);
    add(st, [await kv('Starts', 'Now · 16:42 UTC'), 'FILL']); add(st, [await kv('Ends', '4 Dec 2026, 16:42 UTC'), 'FILL']); add(st, [await kv('Still open', 'Withdrawals, history', { demo: false, divider: false }), 'FILL']);
    add(sh, [await noteBox('mail', 'We will email you when it starts and ends.', 'info', 358), 'FILL']);
    add(sh, [await BTN('Primary', 'Start 7-day break', { size: 'L' }), 'FILL']); add(sh, [await BTN('Secondary', 'Go back', { size: 'L' }), 'FILL']);
  });
}
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height), ccW: Math.round(cc.width) };
