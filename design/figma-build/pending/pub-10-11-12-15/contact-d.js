const NAME = '[PUB-15] Contact / 1440 / Default — empty form';
const S = await shell(NAME, 4800, 120, 'Support'); const C = S.content;
const top = AL('VERTICAL', { name: 'Page top', gap: 16 }); add(C, [top, 'FILL']);
const bc = await I('14:1145', { Levels: '2' }); txt(bc, 'Crumb 1', 'Home'); txt(bc, 'Current page', 'Contact'); add(top, bc);
const ph = AL('HORIZONTAL', { name: 'Page header', gap: 24, align: 'MAX' }); add(top, [ph, 'FILL']);
const pl = AL('VERTICAL', { gap: 8 }); add(pl, await T('Contact support', 'Heading/H1', 'text/primary'), [await T('Real people, around the clock. Tell us what happened and we’ll get back to you — most emails get a first reply in about 2 hours.', 'Body/L', 'text/secondary', { w: 680 }), 'FILL']); add(ph, [pl, 'FILL']);
const stt = AL('HORIZONTAL', { name: 'System status', fill: 'surface/default', stroke: 'border/subtle', r: 9999, p: [8, 16, 8, 12], gap: 8, align: 'CENTER' }); add(stt, await IC('alert-triangle', 16, 'text/warning'), await T('Ethereum deposits slower than usual · all else operational', 'Label/M', 'text/primary'), await T('Status page', 'Label/M', 'text/brand'), await IC('external-link', 14, 'icon/brand')); add(ph, stt);
const cols = AL('HORIZONTAL', { name: 'Form + channels', gap: 24 }); add(C, [cols, 'FILL']);
const form = AL('VERTICAL', { name: 'Contact form', fill: 'surface/default', stroke: 'border/subtle', r: 20, p: 32, gap: 24 }); add(cols, [form, 'FILL']);
const fh = AL('HORIZONTAL', { name: 'Form header', gap: 12, align: 'CENTER' }); add(fh, [await T('Send us a message', 'Heading/H4', 'text/primary', { name: 'Form title' }), 'FILL'], await T('* required', 'Caption', 'text/tertiary')); add(form, [fh, 'FILL']);
const an = AL('HORIZONTAL', { name: 'Anti-phishing notice', fill: 'status/info-tint', r: 10, p: [12, 16, 12, 16], gap: 10 }); add(an, await IC('shield', 18, 'text/info'), [await T('We will never ask for your password, 2FA codes, seed phrase or private keys. Every email from us shows your anti-phishing code.', 'Body/S', 'text/primary', { w: 560 }), 'FILL']); add(form, [an, 'FILL']);
const fields = AL('VERTICAL', { name: 'Fields', gap: 20 }); add(form, [fields, 'FILL']);
const topic = await I('13:565', { State: 'Default' }, { Label: 'Topic *', Value: 'Choose a topic', 'Show helper': true, 'Show leading icon': true, 'Leading icon': ICONS['list'] }); topic.name = 'Field — Topic'; txt(topic, 'Helper text', 'Account & security, deposits, withdrawals, Global Pool, games, responsible gaming or something else.');
const tv = topic.findOne(n => n.name === 'Value' && n.type === 'TEXT'); if (tv) tv.fills = [paint('text/tertiary')];
add(fields, [topic, 'FILL']);
async function inp(name, label, value, o = {}) { const p = { Label: label, 'Show leading icon': !!o.icon, 'Show trailing icon': false, 'Show helper': !!o.helper }; if (o.icon) p['Leading icon'] = ICONS[o.icon]; const i = await I('13:762', { State: o.state || 'Default', Size: 'M' }, p); i.name = 'Field — ' + name; txt(i, 'Value text', value); if (o.helper) txt(i, 'Helper text', o.helper); const v = i.findOne(n => n.name === 'Value text'); if (v) v.fills = [paint(o.ph ? 'text/tertiary' : 'text/primary')]; return i; }
const r1 = AL('HORIZONTAL', { name: 'Row — name & email', gap: 16 }); add(r1, [await inp('Name', 'Name', 'How should we address you?', { icon: 'user', ph: true, helper: 'Optional — first name is fine.' }), 'FILL'], [await inp('Email', 'Email *', 'name@example.com', { icon: 'mail', ph: true, helper: 'We reply here. Signed in? Use your account email.' }), 'FILL']); add(fields, [r1, 'FILL']);
const r2 = AL('HORIZONTAL', { name: 'Row — account & reference', gap: 16 }); add(r2, [await inp('Account ID', 'Account ID (optional)', 'GP-•••••', { icon: 'id-card', ph: true, helper: 'Find it under Account → Profile.' }), 'FILL'], [await inp('Reference', 'Reference (optional)', 'e.g. WD-20931 or round #1,248', { icon: 'hash', ph: true, helper: 'A transaction, withdrawal or round ID speeds things up.' }), 'FILL']); add(fields, [r2, 'FILL']);
const msg = await I('16:3858', { State: 'Default' }, { Label: 'Message *', 'Show counter': true }); msg.name = 'Field — Message'; txt(msg, 'Value text', 'Describe what happened, when it happened and what you expected to see.'); const mv = msg.findOne(n => n.name === 'Value text'); if (mv) mv.fills = [paint('text/tertiary')]; txt(msg, 'Counter', '0 / 2,000');
add(fields, [msg, 'FILL']);
const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Email me a copy of this message', 'Show description': false }); cb.name = 'Field — Copy to email'; add(fields, cb);
const pn = AL('HORIZONTAL', { name: 'Privacy note', gap: 8, align: 'CENTER' }); add(pn, await IC('lock', 14, 'icon/muted'), await T('We use these details only to answer your request. Read our Privacy Policy.', 'Caption', 'text/tertiary')); add(form, pn);
const fa = AL('HORIZONTAL', { name: 'Form actions', gap: 16, align: 'CENTER' }); strokeSides(fa, 'border/subtle', { t: 1 }); pad(fa, 24, 0, 0, 0);
const send = await BTN('Primary', 'Send message', { size: 'L', lead: 'mail' }); send.name = 'Button — Send'; add(fa, send);
const fcap = AL('HORIZONTAL', { name: 'Action note', gap: 6, align: 'CENTER' }); add(fcap, await IC('clock', 14, 'icon/muted'), await T('Typical first reply by email: about 2 h', 'Caption', 'text/tertiary', { name: 'Action note text' }), await DEMO('XS')); add(fa, fcap); add(form, [fa, 'FILL']);
// ---- side column ----
const side = AL('VERTICAL', { name: 'Channels & help', gap: 16, w: 440 }); add(cols, side);
const ch = box('Other ways to reach us', { gap: 0, p: 24 }); add(side, [ch, 'FILL']);
const chh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(chh, [await T('Other ways to reach us', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('XS')); add(ch, [chh, 'FILL']);
for (const [ic, t, d, b] of [['chat', 'Live chat', '24/7 · median wait under 2 min', 'Start chat'], ['mail', 'Email', 'support@globalpool.example · reply within 24 h', null], ['shield-alert', 'Security reports', 'security@globalpool.example · acknowledged within 24 h', null], ['scale', 'Complaints & disputes', 'Formal complaint with a written decision within 14 days', null]]) {
  const r = AL('HORIZONTAL', { name: 'Channel — ' + t, gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 });
  const ib = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 18, 'icon/brand'));
  const tx = AL('VERTICAL', { gap: 2 }); add(tx, await T(t, 'Body/M Strong', 'text/primary'), [await T(d, 'Body/S', 'text/secondary', { w: 260 }), 'FILL']);
  add(r, ib, [tx, 'FILL']); if (b) add(r, await BTN('Secondary', b, { size: 'S' })); add(ch, [r, 'FILL']); }
add(ch, await T('Email addresses are placeholders for this design.', 'Caption', 'text/tertiary'));
const rt = box('Response times', { gap: 0, p: 24 }); add(side, [rt, 'FILL']);
const rth = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(rth, [await T('Response times', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('S')); add(rt, [rth, 'FILL']);
for (const [k, v] of [['Live chat', 'under 2 min'], ['Email (median 2 h 10 min)', 'within 24 h'], ['Withdrawal questions', 'within 4 h'], ['Security reports', 'within 24 h'], ['Restrictions & appeals', 'within 72 h']]) { const r = AL('HORIZONTAL', { gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(v, 'Label/M', 'text/primary')); add(rt, [r, 'FILL']); }
add(rt, await T('Last 30 days, measured to the first reply from a person.', 'Caption', 'text/tertiary'));
const rgh = await I('24:14743'); rgh.name = 'RG/Help Resources'; add(side, [rgh, 'FILL']);
// ---- before you write ----
add(C, [await head('BEFORE YOU WRITE', 'You might get an answer faster here', null), 'FILL']);
const ql = AL('HORIZONTAL', { name: 'Quick links', gap: 16 }); add(C, [ql, 'FILL']);
for (const [ic, t, d, l] of [['withdraw', 'Track a withdrawal', 'Live status for every withdrawal, including AML review and network confirmations.', 'Open tracker'], ['help-circle', 'Browse the FAQ', 'Fees, withdrawals, fairness, KYC and restricted regions in plain language.', 'Go to FAQ'], ['sliders', 'Change your limits', 'Lower a limit instantly or take a break — no need to contact us.', 'Responsible gaming']]) {
  const c = await I('23:16859', { State: 'Default' }, { Title: t, Body: d, Link: l, 'Show link': true, Icon: ICONS[ic] }); c.name = 'Card/Feature — ' + t; tint(c.findOne(n => n.name === 'Icon') || c.findOne(n => n.type === 'INSTANCE' && n.componentPropertyReferences && n.componentPropertyReferences.mainComponent), 'icon/brand'); add(ql, [c, 'FILL_BOTH']); }
await licence(C);
S.f.primaryAxisSizingMode = 'AUTO'; fitSection(sec);
await cols.screenshot({ scale: 0.6 });
return { frame: S.f.id, content: C.id, form: form.id, h: S.f.height };
