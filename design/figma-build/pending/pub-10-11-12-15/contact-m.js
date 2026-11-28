const S = await mshell('[PUB-15] Contact / 390 / Default — empty form', 1650, 120); const C = S.C;
const hd = AL('VERTICAL', { name: 'Page header', gap: 12 }); add(C, [hd, 'FILL']);
add(hd, await T('Contact support', 'Heading/H2', 'text/primary'), [await T('Real people, around the clock. Most emails get a first reply in about 2 hours.', 'Body/M', 'text/secondary', { w: 358 }), 'FILL']);
const stt = AL('HORIZONTAL', { name: 'System status', fill: 'surface/default', stroke: 'border/subtle', r: 9999, p: [8, 14, 8, 10], gap: 8, align: 'CENTER' }); add(stt, await IC('check-circle', 16, 'text/success'), await T('All systems operational', 'Label/M', 'text/primary'), await IC('external-link', 14, 'icon/brand')); add(hd, stt);
const chat = box('Live chat', { gap: 12, p: 16 }); add(C, [chat, 'FILL']);
const chh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const ci = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(ci, await IC('chat', 20, 'icon/brand')); const ct = AL('VERTICAL', { gap: 2 }); add(ct, await T('Live chat · 24/7', 'Body/M Strong', 'text/primary'), await T('Median wait under 2 min', 'Body/S', 'text/secondary')); add(chh, ci, [ct, 'FILL'], await DEMO('XS')); add(chat, [chh, 'FILL']);
add(chat, [await BTN('Secondary', 'Start live chat', { size: 'L', lead: 'chat' }), 'FILL']);
const form = AL('VERTICAL', { name: 'Contact form', fill: 'surface/default', stroke: 'border/subtle', r: 20, p: 16, gap: 20 }); add(C, [form, 'FILL']);
const fh = AL('HORIZONTAL', { name: 'Form header', gap: 12, align: 'CENTER' }); add(fh, [await T('Or send us a message', 'Heading/H5', 'text/primary', { name: 'Form title' }), 'FILL'], await T('* required', 'Caption', 'text/tertiary')); add(form, [fh, 'FILL']);
const an = AL('HORIZONTAL', { name: 'Anti-phishing notice', fill: 'status/info-tint', r: 10, p: 12, gap: 10 }); add(an, await IC('shield', 18, 'text/info'), [await T('We never ask for passwords, 2FA codes, seed phrases or private keys. Our emails show your anti-phishing code.', 'Caption', 'text/primary', { w: 280 }), 'FILL']); add(form, [an, 'FILL']);
const fields = AL('VERTICAL', { name: 'Fields', gap: 16 }); add(form, [fields, 'FILL']);
const topic = await I('13:565', { State: 'Default' }, { Label: 'Topic *', Value: 'Choose a topic', 'Show helper': false, 'Show leading icon': true, 'Leading icon': ICONS['list'] }); topic.name = 'Field — Topic'; const tv = topic.findOne(n => n.name === 'Value' && n.type === 'TEXT'); if (tv) tv.fills = [paint('text/tertiary')]; add(fields, [topic, 'FILL']);
async function inp(name, label, value, o = {}) { const p = { Label: label, 'Show leading icon': !!o.icon, 'Show trailing icon': false, 'Show helper': !!o.helper }; if (o.icon) p['Leading icon'] = ICONS[o.icon]; const i = await I('13:762', { State: 'Default', Size: 'L' }, p); i.name = 'Field — ' + name; txt(i, 'Value text', value); if (o.helper) txt(i, 'Helper text', o.helper); const v = i.findOne(n => n.name === 'Value text'); if (v) v.fills = [paint('text/tertiary')]; return i; }
add(fields, [await inp('Name', 'Name', 'How should we address you?', { icon: 'user' }), 'FILL'], [await inp('Email', 'Email *', 'name@example.com', { icon: 'mail', helper: 'We reply to this address.' }), 'FILL'], [await inp('Account ID', 'Account ID (optional)', 'GP-•••••', { icon: 'id-card' }), 'FILL'], [await inp('Reference', 'Reference (optional)', 'e.g. WD-20931 or round #1,248', { icon: 'hash' }), 'FILL']);
const msg = await I('16:3858', { State: 'Default' }, { Label: 'Message *', 'Show counter': true }); msg.name = 'Field — Message'; txt(msg, 'Value text', 'Describe what happened, when, and what you expected.'); const mv = msg.findOne(n => n.name === 'Value text'); if (mv) mv.fills = [paint('text/tertiary')]; txt(msg, 'Counter', '0 / 2,000'); add(fields, [msg, 'FILL']);
const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Email me a copy of this message', 'Show description': false }); cb.name = 'Field — Copy to email'; add(fields, cb);
const pn = AL('HORIZONTAL', { name: 'Privacy note', gap: 8, align: 'CENTER' }); add(pn, await IC('lock', 14, 'icon/muted'), [await T('Used only to answer your request. Privacy Policy.', 'Caption', 'text/tertiary', { w: 280 }), 'FILL']); add(form, [pn, 'FILL']);
add(C, [await mhead('OTHER CHANNELS', 'Response times', null, await DEMO('S')), 'FILL']);
add(C, [await rowsList('Response times', [['Email · support@globalpool.example', 'within 24 h'], ['Withdrawal questions', 'within 4 h'], ['Security · security@globalpool.example', 'within 24 h'], ['Restrictions & appeals', 'within 72 h'], ['Complaints & disputes', 'decision in 14 days']], { vw: 130 }), 'FILL']);
add(C, [await T('Email addresses are placeholders for this design. Times: last 30 days, to first reply from a person.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
const rg = box('Need help with gambling?', { gap: 10, p: 16 }); add(C, [rg, 'FILL']);
const rgh = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); const rgi = AL('HORIZONTAL', { fill: 'status/info-tint', r: 10, p: 8 }); add(rgi, await IC('heart', 18, 'text/info')); add(rgh, rgi, [await T('Need help with gambling?', 'Heading/H5', 'text/primary'), 'FILL'], await I('6:159')); add(rg, [rgh, 'FILL']);
add(rg, [await T('Free, confidential support: Gambling Therapy, Gamblers Anonymous, GamCare. You can also set limits or take a break yourself — instantly.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
const rga = AL('HORIZONTAL', { gap: 8 }); add(rga, [await BTN('Secondary', 'Help organisations', { size: 'M' }), 'FILL'], [await BTN('Ghost', 'Set limits', { size: 'M' }), 'FILL']); add(rg, [rga, 'FILL']);
await mlic(C);
const stk = await sticky('Send message', 'Typical first reply by email: about 2 h', 'mail'); await mfinish(S, stk);
const out = { default: S.f.id };
// ---------- states (clones) ----------
const base = S.f; const Fd = (k, n) => k.findOne(x => x.name === 'Field — ' + n);
function val(inst, v, color = 'text/primary', layer = 'Value text') { const t = inst.findOne(n => n.name === layer && n.type === 'TEXT'); if (t) { t.characters = v; t.fills = [paint(color)]; } }
function mk(state, y) { const name = '[PUB-15] Contact / 390 / ' + state; { const old = sec.children.find(n => n.name === name); if (old) old.remove(); } const k = base.clone(); sec.appendChild(k); k.name = name; k.x = base.x; k.y = y; return k; }
const k1 = mk('Validation error', base.y + base.height + 160); out.validation = k1.id;
{ const tp = Fd(k1, 'Topic'); tp.setProperties({ State: 'Error' }); const nm = Fd(k1, 'Name'); nm.setProperties({ State: 'Filled' }); val(nm, 'Nova K.');
  const em = Fd(k1, 'Email'); em.setProperties({ State: 'Error' }); val(em, 'nova.k@example'); txt(em, 'Helper text', 'Enter a full email address, e.g. name@example.com');
  const ms = Fd(k1, 'Message'); ms.setProperties({ State: 'Error' }); val(ms, 'It’s stuck'); txt(ms, 'Helper text', 'Add a little more detail — at least 20 characters (10 / 20).'); txt(ms, 'Counter', '10 / 2,000');
  const f1 = k1.findOne(n => n.name === 'Contact form'); const a1 = f1.findOne(n => n.name === 'Anti-phishing notice');
  const es = AL('HORIZONTAL', { name: 'Error summary', fill: 'status/danger-tint', stroke: 'border/danger', r: 10, p: 12, gap: 10 }); add(es, await IC('alert-circle', 18, 'text/danger')); const et = AL('VERTICAL', { gap: 2 }); add(et, await T('3 fields need your attention', 'Body/S Strong', 'text/primary'), [await T('Topic · Email · Message. Nothing you typed has been lost.', 'Caption', 'text/secondary', { w: 260 }), 'FILL']); add(es, [et, 'FILL']);
  f1.insertChild(f1.children.indexOf(a1) + 1, es); es.layoutSizingHorizontal = 'FILL'; }
const k2 = mk('Sent — success', k1.y + k1.height + 160); out.sent = k2.id;
{ const f2 = k2.findOne(n => n.name === 'Contact form');
  for (const nm of ['Anti-phishing notice', 'Fields', 'Privacy note', '* required']) { const n = f2.findOne(x => x.name === nm); if (n) n.visible = false; }
  f2.findOne(n => n.name === 'Form title').characters = 'Message sent';
  const sp = AL('VERTICAL', { name: 'Success panel', gap: 16 });
  const ic = AL('HORIZONTAL', { fill: 'status/success-tint', r: 9999, p: 12 }); add(ic, await IC('check-circle', 28, 'text/success'));
  add(sp, ic, [await T('Thanks, Nova — we’ve got your message', 'Heading/H4', 'text/primary', { w: 326 }), 'FILL'], [await T('A person will reply by email. We sent a copy to n•••@example.com — check our reply shows your anti-phishing code.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const kv = AL('VERTICAL', { name: 'Ticket summary', fill: 'surface/raised', r: 14, p: 14, gap: 0 }); add(sp, [kv, 'FILL']);
  const kh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); const st = await BADGE('Pending', 'S'); const stt2 = st.findOne(n => n.type === 'TEXT'); if (stt2) stt2.characters = 'Open'; add(kh, [await T('Ticket CS-58214', 'Mono/S', 'text/primary'), 'FILL'], st, await DEMO('XS')); add(kv, [kh, 'FILL']);
  for (const [k, v] of [['Topic', 'Withdrawals'], ['Reference', 'WD-20931'], ['Sent', '27 Nov 2026, 16:42 UTC'], ['Reply expected', 'by 28 Nov 2026, 16:42 UTC']]) { const r = AL('HORIZONTAL', { gap: 12, p: [8, 0, 8, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, [await T(k, 'Caption', 'text/tertiary'), 'FILL'], await T(v, 'Body/S Strong', 'text/primary')); add(kv, [r, 'FILL']); }
  add(sp, [await BTN('Secondary', 'Send another message', { size: 'L' }), 'FILL']);
  f2.appendChild(sp); sp.layoutSizingHorizontal = 'FILL';
  const sb = k2.findOne(n => n.name === 'Button — Sticky CTA'); setProp(sb, 'Label', 'Track withdrawal WD-20931'); setProp(sb, 'Leading icon', ICONS['withdraw']);
  k2.findOne(n => n.name === 'Sticky note').characters = 'Reply expected within 24 h · median 2 h 10 min'; }
fitSection(sec);
await k1.findOne(n => n.name === 'Contact form').screenshot({ scale: 0.6 });
await k2.findOne(n => n.name === 'Contact form').screenshot({ scale: 0.6 });
return out;
