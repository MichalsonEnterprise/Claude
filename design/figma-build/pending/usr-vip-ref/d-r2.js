const NAME = '[USR-R2] Referrals — Statistics / 1440 / Default';
const { f, content } = await DESK(NAME, 7920, 160, { active: 'Affiliates', area: 'Referrals', page: 'Statistics', title: 'Referral statistics',
  sub: 'How your link performs, from click to active player. Showing the last 30 days: 29 Oct – 27 Nov 2026.',
  actions: async () => { const seg = await I('20:6978', { Segments: '3' }); const s = seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment')); ['7 days', '30 days', '90 days'].forEach((l, i) => { if (s[i]) { setP(s[i], { Label: l }); s[i].setProperties({ State: i === 1 ? 'Active' : 'Default' }); } }); return [seg, await BTN('Secondary', 'Export CSV', { lead: 'download' })]; }, tabs: RTABS('Statistics') });
const k = ROW({ name: 'KPIs', gap: 16, align: 'MIN' }); add(content, [k, 'FILL']);
for (const [l, v, u, o] of [['Link clicks', '612', null, { icon: 'external-link', cap: '+12.4% vs the previous 30 days' }], ['Sign-ups', '9', null, { icon: 'user-check', cap: '1.47% of clicks · +2 vs the previous 30 days' }], ['Verified', '6', null, { icon: 'shield-check', cap: '67% of sign-ups completed KYC' }], ['Earned', '58.80', 'USDT', { icon: 'coins', ic: 'icon/brand', cap: '+31.0% vs the previous 30 days · 3.90 pending' }]]) add(k, [await KPI(l, v, u, o), 'FILL_BOTH']);
const fu = CARD({ name: 'Funnel — click to player', gap: 16 }); add(content, [fu, 'FILL']);
const fh = ROW({ gap: 8 }); add(fh, await T('From click to player', 'Heading/H4')); add(fh, await DEMO('S')); add(fu, fh);
const fr = ROW({ name: 'Funnel steps', gap: 12 }); add(fu, [fr, 'FILL']);
const FS = [['STEP 1', '612', 'Link clicks', 'Unique devices, 24 h window'], ['STEP 2', '9', 'Sign-ups', '1.5% of clicks'], ['STEP 3', '6', 'KYC verified', '67% of sign-ups'], ['STEP 4', '5', 'First qualifying entry', '83% of verified']];
for (const [i, [s1, v, l, c]] of FS.entries()) { const t = CARD({ name: 'Step — ' + l, gap: 6, p: 16, fill: i === 3 ? 'surface/selected' : 'surface/raised', stroke: i === 3 ? 'border/brand' : 'border/subtle' }); add(t, await T(s1, 'Overline', 'text/tertiary')); add(t, await T(v, 'Number/L', 'text/primary')); add(t, await T(l, 'Body/S Strong')); add(t, await T(c, 'Caption', i ? 'text/brand' : 'text/tertiary')); add(fr, [t, 'FILL']); if (i < 3) add(fr, await IC('chevron-right', 20, 'icon/muted')); }
const cols = ROW({ name: 'Two columns', gap: 16, align: 'MIN' }); add(content, [cols, 'FILL']);
const ec = CARD({ name: 'Earnings per day', gap: 12 }); add(cols, [ec, 'FILL']);
const eh = ROW({ gap: 8 }); add(eh, await T('Earnings per day', 'Heading/H4')); add(eh, await DEMO('S')); add(eh, [ROW({}), 'FILL']); add(eh, await AMT('58.80', { s: 'Number/M' })); add(ec, [eh, 'FILL']);
const D = [1.90, 2.10, 2.30, 1.20, 1.25, 1.30, 1.32, 1.38, 1.40, 1.45, 1.48, 1.52, 1.55, 1.58, 1.60, 1.62, 1.65, 1.68, 1.70, 1.72, 1.75, 1.78, 1.80, 2.34, 3.76, 4.02, 0.00, 3.65, 4.10, 3.90];
const LB = D.map((_, i) => ({ 0: '29 Oct', 4: '2 Nov', 9: '7', 14: '12', 19: '17', 24: '22', 29: '27' })[i] || '');
add(ec, await CHART(D, LB, { w: 696, h: 180, gap: 4, max: 5, grid: [1, 2, 3, 4, 5], fmt: v => v.toFixed(2), last: true, name: 'daily commission' }));
const nt = ROW({ gap: 24 }); add(nt, await CHK('24 Nov: round #1,245 was cancelled — fees refunded, so no commission', 'warn', 320, 'Caption')); add(nt, await CHK('27 Nov: 3.90 USDT pending until the 20:00 UTC draw (lighter bar)', 'clock', 300, 'Caption')); add(ec, nt);
const side = COL({ name: 'Side column', gap: 16, w: 376 }); add(cols, side);
const cc = CARD({ name: 'Clicks by channel', gap: 0, p: 0, clip: true }); add(side, [cc, 'FILL']);
const chh = ROW({ gap: 8, p: [16, 16, 12, 16] }); add(chh, await T('Clicks by channel', 'Heading/H5')); add(chh, await DEMO('S')); add(cc, chh);
const ct = COL({ name: 'Table', gap: 0 }); add(cc, [ct, 'FILL']);
await HEADROW(ct, [['Channel', 'FILL'], ['Clicks', 76, true], ['Sign-ups', 84, true], ['Conv.', 72, true]]);
const CH = [['Copied link', 'copy', '268', '4', '1.5%'], ['Telegram', 'chat', '196', '3', '1.5%'], ['X', 'external-link', '112', '1', '0.9%'], ['Email', 'mail', '36', '1', '2.8%'], ['Total', null, '612', '9', '1.5%']];
for (const [i, [c, ic, a, b, d]] of CH.entries()) { const lc = ROW({ gap: 8 }); if (ic) add(lc, await IC(ic, 16, 'icon/muted')); add(lc, await T(c, ic ? 'Body/S' : 'Body/S Strong')); await addRow(ct, [CELL('FILL', [lc], { py: 10 }), CELL(76, [await TX(a, 'Number/S')], { right: true, py: 10 }), CELL(84, [await TX(b, 'Number/S')], { right: true, py: 10 }), CELL(72, [await TX(d, 'Number/S', 'text/secondary')], { right: true, py: 10 })], { name: 'Row — ' + c, last: i === 4, fill: ic ? null : 'bg/secondary' }); }
const ap = CARD({ name: 'Active players', gap: 10 }); add(side, [ap, 'FILL']);
const aph = ROW({ gap: 8 }); add(aph, await T('Active players', 'Heading/H5')); add(aph, await DEMO('S')); add(ap, aph);
add(ap, await AMT('19 of 31', { s: 'Number/M', u: 'verified players' })); add(ap, BAR(328, 19 / 31, 'brand/primary', 8));
add(ap, await T('Active = made at least one qualifying Global Pool entry in the last 30 days.', 'Caption', 'text/tertiary', { w: 328 }));
const dn = CARD({ name: 'How stats are counted', gap: 10, fill: 'bg/secondary' }); add(side, [dn, 'FILL']);
for (const s of ['Stats refresh every 15 minutes', 'Repeat clicks from one device within 24 h count once', 'Sign-ups from restricted countries are blocked and never counted']) add(dn, [await CHK(s, 'info', 300, 'Caption'), 'FILL']);
await FOOT(content, 'Statistics are DEMO values. You only see aggregate numbers — never personal data about the players you invite.');
FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
