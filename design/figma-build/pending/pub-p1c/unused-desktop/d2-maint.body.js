// ===== d2: [PUB-26] Maintenance / 1440 / Scheduled — in progress (Guest, focused page) =====
const NM = '[PUB-26] Maintenance / 1440 / Scheduled window — in progress, withdrawals available';
const shots = [];
async function bullet(ic, col, title, body) { const r = AL('HORIZONTAL', { name: 'Item — ' + title, gap: 12, p: [10, 0, 10, 0] }); add(r, await IC(ic, 20, col)); const t = AL('VERTICAL', { gap: 2 }); add(t, [await T(title, 'Body/M Strong', 'text/primary', { w: 300 }), 'FILL']); if (body) add(t, [await T(body, 'Body/S', 'text/secondary', { w: 300 }), 'FILL']); add(r, [t, 'FILL']); return r; }
async function col3(title, chip, items) { const c = box('Column — ' + title, { gap: 4, p: 24 }); const h = AL('VERTICAL', { gap: 8, p: [0, 0, 8, 0] }); add(h, chip, await T(title, 'Heading/H4', 'text/primary')); add(c, [h, 'FILL']); for (const it of items) add(c, [await bullet(...it), 'FILL']); return c; }
if (need(NM)) {
  const f = await screen(NM, 1440, {}); sec.appendChild(f); f.x = 3240; f.y = 160; OUT.created[NM] = f.id;
  add(f, [await DEMOBAR(), 'FILL']);
  // slim focused top bar (navigation to paused areas removed during maintenance)
  const bar = AL('HORIZONTAL', { name: 'Top bar — maintenance mode', fill: 'bg/secondary', p: [12, 100, 12, 100], gap: 16, align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 }); add(f, [bar, 'FILL']);
  const logo = await I('4:797'); logo.name = 'Brand/Logo'; add(bar, logo, await statusChip('work', 'Scheduled maintenance', 'wrench'));
  const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(bar, [sp, 'FILL']);
  add(bar, await BTN('Ghost', 'Status page', { size: 'S', lead: 'activity', trail: 'external-link' }), await BTN('Ghost', 'Support', { size: 'S', lead: 'chat' }), await BTN('Secondary', 'Sign in', { size: 'S', lead: 'log-in' }));
  const C = AL('VERTICAL', { name: 'Content', p: [40, 100, 64, 100], gap: 40 }); add(f, [C, 'FILL']);
  const { hero: H, copy } = await hero(C, 'Hero — maintenance in progress', { cw: 580, bx: 860 });
  const ov = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(ov, await statusChip('work', 'In progress · updated 02:12 UTC', 'wrench'), await T('SCHEDULED MAINTENANCE', 'Overline', 'text/brand')); add(copy, ov);
  add(copy, [await T('We’re upgrading the tables', 'Heading/H1', 'text/primary', { w: 580 }), 'FILL']);
  add(copy, [await T('Games are paused from 02:00 to 02:30 UTC on Tue 1 Dec 2026 while we move our game servers. Withdrawals remain available the whole time — sign in and withdraw as usual.', 'Body/L', 'text/secondary', { w: 580 }), 'FILL']);
  const win = AL('VERTICAL', { name: 'Maintenance window', fill: 'surface/raised', r: 14, p: 20, gap: 14 }); stroke(win, 'border/default');
  const wr = AL('HORIZONTAL', { name: 'Window times', gap: 24 });
  for (const [k, v] of [['Started', '02:00 UTC'], ['Expected back', '02:30 UTC'], ['Your time (Lisbon)', '02:00–02:30 WET']]) { const c = AL('VERTICAL', { gap: 4 }); add(c, await T(k, 'Caption', 'text/tertiary'), await T(v, 'Number/S', 'text/primary')); add(wr, [c, 'FILL']); }
  add(win, [wr, 'FILL']);
  const track = AL('HORIZONTAL', { name: 'Progress — 12 of 30 min', fill: 'surface/default', r: 9999, h: 8, clip: true }); add(track, rect(216, 8, 'brand/primary', 9999, 'Elapsed 40%')); add(win, [track, 'FILL']);
  const wc = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(wc, [await T('Back in about 18 min (12 of 30 min done). If it runs late we post the new time here and on the status page.', 'Caption', 'text/secondary', { w: 480 }), 'FILL'], await DEMO('XS')); add(win, [wc, 'FILL']);
  add(copy, [win, 'FILL']);
  const acts = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(acts, await BTN('Primary', 'Sign in to withdraw', { size: 'L', lead: 'withdraw' }), await BTN('Secondary', 'Status page', { size: 'L', lead: 'activity', trail: 'external-link' }), await BTN('Ghost', 'Contact support', { size: 'L', lead: 'chat' })); add(copy, acts);
  // objects: ticket stub + wrench + nut, cropped by the banner edge
  const tk = await ticket(); abs(H, tk, 700, 150, 8);
  const wrn = artWrench(); abs(H, wrn, 1060, -30, -32);
  const nut = artNut(); abs(H, nut, 1000, Math.round(H.height) - 120, 12);
  // what works / paused / your money
  const r3 = AL('HORIZONTAL', { name: 'Impact', gap: 16 }); add(C, [r3, 'FILL']);
  const a1 = await col3('Available now', await statusChip('ok', 'Operational'), [
    ['withdraw', 'icon/brand', 'Withdrawals on all 5 networks', 'Normal limits, fees and security checks. WD requests are processed as usual.'],
    ['log-in', 'icon/brand', 'Sign-in, account & security', 'Change limits, 2FA and whitelisted addresses.'],
    ['heart', 'icon/brand', 'Responsible gaming tools', 'Limits, cooling-off and self-exclusion work as normal.'],
    ['chat', 'icon/brand', 'Live support', '24/7 chat and support@globalpool.example.']]);
  const a2 = await col3('Paused until 02:30 UTC', await statusChip('pause', 'Maintenance'), [
    ['games', 'icon/muted', 'Originals & table games', 'New bets are paused. Rounds open at 02:00 UTC were settled first.'],
    ['deposit', 'icon/muted', 'Deposit crediting', 'Deposits are still detected on-chain and credited automatically after 02:30 UTC — don’t send twice.'],
    ['gift', 'icon/muted', 'Promotion deadlines', 'Daily-reward streaks and mission deadlines inside the window are extended by 30 min.']]);
  const a3 = await col3('Your balance & Global Pool', await statusChip('info', 'Unchanged'), [
    ['shield-check', 'icon/brand', 'Balances don’t move', 'Nothing is debited, locked or expired by the maintenance.'],
    ['pool', 'icon/gold', 'No round is affected', 'Round #1,252 opens 1 Dec 2026, 08:00 UTC as scheduled; the last draw settled 30 Nov, 20:02 UTC.'],
    ['history', 'icon/brand', 'Game history is complete', 'Every settled bet keeps its seeds and result for verification.']]);
  for (const c of [a1, a2, a3]) { add(r3, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; }
  // updates + service status
  const r2 = AL('HORIZONTAL', { name: 'Updates & status', gap: 16 }); add(C, [r2, 'FILL']);
  const up = box('Live updates', { gap: 0, p: 24 }); const uh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 12, 0] }); add(uh, [await T('Live updates', 'Heading/H4', 'text/primary'), 'FILL'], await DEMO('M')); add(up, [uh, 'FILL']);
  const ups = [['02:12 UTC', 'info', 'Game servers 3 of 5 migrated — on schedule for 02:30 UTC.'], ['02:00 UTC', 'work', 'Maintenance started. New bets paused after open rounds settled; withdrawals online.'], ['01:45 UTC', 'info', 'In-app reminder: games pause in 15 minutes.'], ['26 Nov 2026, 10:00 UTC', 'info', 'Announced 5 days ahead by email and in-app (notice AN-88).']];
  for (let i = 0; i < ups.length; i++) { const [tm, k, msg] = ups[i]; const r = AL('HORIZONTAL', { name: 'Update — ' + tm, gap: 16, p: [12, 0, 12, 0] }); if (i < ups.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); const tl = AL('VERTICAL', { gap: 6, w: 190 }); add(tl, await T(tm, 'Mono/S', 'text/tertiary'), await statusChip(k, k === 'work' ? 'Started' : 'Update', k === 'work' ? 'wrench' : 'info')); add(r, tl, [await T(msg, 'Body/M', 'text/primary', { w: 400 }), 'FILL']); add(up, [r, 'FILL']); }
  const ss = box('Service status', { gap: 0, p: 24, w: 480 }); const sh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 12, 0] }); add(sh, [await T('Service status', 'Heading/H4', 'text/primary'), 'FILL'], await linkRow('status.globalpool.example', 'external-link')); add(ss, [sh, 'FILL']);
  const svc = [['Withdrawals', 'ok', 'Operational'], ['Sign-in & account', 'ok', 'Operational'], ['Deposits', 'warn', 'Credited after 02:30'], ['Originals & table games', 'pause', 'Maintenance'], ['Global Pool', 'info', 'Next round 08:00 UTC'], ['Live support', 'ok', 'Operational']];
  for (let i = 0; i < svc.length; i++) { const [n, k, l] = svc[i]; const r = AL('HORIZONTAL', { name: 'Service — ' + n, gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(n, 'Body/M', 'text/primary', { w: 200 }), 'FILL'], await statusChip(k, l)); add(ss, [r, 'FILL']); }
  const nets = AL('HORIZONTAL', { name: 'Networks — withdrawals', gap: 8, p: [14, 0, 0, 0], wrap: true, cgap: 8, align: 'CENTER' });
  for (const ch of ['BNB Chain', 'Polygon', 'Arbitrum', 'Ethereum', 'Solana']) { const np = await I('9:377', { Chain: ch, Status: 'Operational' }, { 'Show status label': false, 'Show chevron': false }); add(nets, np); }
  add(ss, [nets, 'FILL']);
  add(r2, [up, 'FILL'], ss); up.layoutSizingVertical = 'FILL'; ss.layoutSizingVertical = 'FILL';
  const lic = AL('HORIZONTAL', { name: 'Licence & 18+', gap: 16, align: 'CENTER' }); add(lic, [await I('6:158', { Variant: 'Inline' }), 'FILL'], await I('6:159')); add(C, [lic, 'FILL']);
  const ft = AL('HORIZONTAL', { name: 'Footer — compact (maintenance mode)', fill: 'bg/secondary', p: [24, 100, 24, 100], gap: 24, align: 'CENTER' }); strokeSides(ft, 'border/subtle', { t: 1 });
  add(ft, [await T('© 2026 GLOBAL POOL · Available only in permitted jurisdictions · Play responsibly', 'Caption', 'text/tertiary', { w: 520 }), 'FILL']);
  for (const l of ['Terms', 'Privacy', 'Responsible gaming', 'Restricted countries']) add(ft, await T(l, 'Label/S', 'text/secondary'));
  add(ft, await I('6:159')); add(f, [ft, 'FILL']);
  audit(f); shots.push(f);
}
fitSection(sec);
for (const f of shots) await f.screenshot({ scale: 0.5 });
return OUT;
