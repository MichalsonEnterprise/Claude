const base = sec.children.find(n => n.name === '[PUB-15] Contact / 1440 / Default — empty form'); if (!base) throw new Error('No base contact frame');
async function mk(state, prev) { const name = '[PUB-15] Contact / 1440 / ' + state; if (sec.children.find(n => n.name === name)) throw new Error('exists ' + name); const k = base.clone(); sec.appendChild(k); k.name = name; k.x = base.x; k.y = prev.y + prev.height + 160; return k; }
const Fd = (k, n) => k.findOne(x => x.name === 'Field — ' + n);
function val(inst, v, color = 'text/primary', layer = 'Value text') { const t = inst.findOne(n => n.name === layer && n.type === 'TEXT'); if (t) { t.characters = v; t.fills = [paint(color)]; } }
const MSG = 'My withdrawal WD-20931 (1,500.00 USDT to 0x7c4e…a21D on Arbitrum) has been under review for 3 hours. Is anything else needed from me?';
async function callout(name, tintVar, borderVar, ic, icCol, title, body, extra) { const c = AL('HORIZONTAL', { name, fill: tintVar, stroke: borderVar, r: 10, p: [14, 16, 14, 16], gap: 12 }); add(c, await IC(ic, 20, icCol)); const t = AL('VERTICAL', { gap: 4 }); add(t, await T(title, 'Body/M Strong', 'text/primary'), [await T(body, 'Body/S', 'text/secondary', { w: 560 }), 'FILL']); if (extra) add(t, extra); add(c, [t, 'FILL']); return c; }
function insertAfter(parent, ref, node) { parent.insertChild(parent.children.indexOf(ref) + 1, node); node.layoutSizingHorizontal = 'FILL'; }
const out = {};
// 1 — Validation error
const k1 = await mk('Validation error', base); out.validation = k1.id;
{ const tp = Fd(k1, 'Topic'); tp.setProperties({ State: 'Error' }); txt(tp, 'Helper text', 'Choose a topic so we can route your message to the right team.');
  const nm = Fd(k1, 'Name'); nm.setProperties({ State: 'Filled' }); val(nm, 'Nova K.');
  const em = Fd(k1, 'Email'); em.setProperties({ State: 'Error' }); val(em, 'nova.k@example'); txt(em, 'Helper text', 'Enter a full email address, e.g. name@example.com');
  const rf = Fd(k1, 'Reference'); rf.setProperties({ State: 'Filled' }); val(rf, 'WD-20931');
  const ms = Fd(k1, 'Message'); ms.setProperties({ State: 'Error' }); val(ms, 'It’s stuck'); txt(ms, 'Helper text', 'Add a little more detail — at least 20 characters (10 / 20).'); txt(ms, 'Counter', '10 / 2,000');
  const form = k1.findOne(n => n.name === 'Contact form'); const an = form.findOne(n => n.name === 'Anti-phishing notice');
  insertAfter(form, an, await callout('Error summary', 'status/danger-tint', 'border/danger', 'alert-circle', 'text/danger', '3 fields need your attention', 'Topic · Email · Message — fix them and press Send message again. Nothing you typed has been lost.')); }
// 2 — Sending
const k2 = await mk('Sending — loading', k1); out.sending = k2.id;
{ for (const [n, v] of [['Name', 'Nova K.'], ['Email', 'nova.k@example.com'], ['Account ID', 'GP-48213'], ['Reference', 'WD-20931']]) { const f = Fd(k2, n); f.setProperties({ State: 'Disabled' }); val(f, v, 'text/tertiary'); }
  const tp = Fd(k2, 'Topic'); tp.setProperties({ State: 'Disabled' }); val(tp, 'Withdrawals', 'text/tertiary', 'Value');
  const ms = Fd(k2, 'Message'); ms.setProperties({ State: 'Disabled' }); val(ms, MSG, 'text/tertiary'); txt(ms, 'Counter', '133 / 2,000');
  const cb = Fd(k2, 'Copy to email'); cb.setProperties({ State: 'Disabled' });
  const sb = k2.findOne(n => n.name === 'Button — Send'); sb.setProperties({ State: 'Loading' }); setProp(sb, 'Label', 'Sending…');
  const an = k2.findOne(n => n.name === 'Action note text'); an.characters = 'Sending securely — please keep this page open.'; }
// 3 — Sent
const k3 = await mk('Sent — success', k2); out.sent = k3.id;
{ const f3 = k3.findOne(n => n.name === 'Contact form');
  for (const nm of ['Anti-phishing notice', 'Fields', 'Privacy note', 'Form actions', '* required']) { const n = f3.findOne(x => x.name === nm); if (n) n.visible = false; }
  f3.findOne(n => n.name === 'Form title').characters = 'Message sent';
  const sp = AL('VERTICAL', { name: 'Success panel', gap: 20 });
  const ic = AL('HORIZONTAL', { fill: 'status/success-tint', r: 9999, p: 16 }); add(ic, await IC('check-circle', 32, 'text/success'));
  add(sp, ic, await T('Thanks, Nova — we’ve got your message', 'Heading/H3', 'text/primary'), [await T('Your ticket is open and a person will reply by email. We’ve sent a copy to n•••@example.com — check that our reply shows your anti-phishing code before you trust it.', 'Body/M', 'text/secondary', { w: 620 }), 'FILL']);
  const kv = AL('VERTICAL', { name: 'Ticket summary', fill: 'surface/raised', r: 14, p: 20, gap: 0 }); add(sp, [kv, 'FILL']);
  const kh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 10, 0] }); const st = await BADGE('Pending', 'S'); const stt = st.findOne(n => n.type === 'TEXT'); if (stt) stt.characters = 'Open'; add(kh, [await T('Ticket CS-58214', 'Mono/M', 'text/primary'), 'FILL'], st, await DEMO('XS')); add(kv, [kh, 'FILL']);
  for (const [k, v] of [['Topic', 'Withdrawals'], ['Reference', 'WD-20931'], ['Sent', '27 Nov 2026, 16:42 UTC'], ['First reply expected', 'by 28 Nov 2026, 16:42 UTC · median 2 h 10 min']]) { const r = AL('HORIZONTAL', { gap: 16, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await T(k, 'Body/S', 'text/tertiary', { w: 180 }), [await T(v, 'Body/S Strong', 'text/primary', { w: 400 }), 'FILL']); add(kv, [r, 'FILL']); }
  const ac = AL('HORIZONTAL', { name: 'Next steps', gap: 12, align: 'CENTER' }); add(ac, await BTN('Primary', 'Track withdrawal WD-20931', { size: 'L', lead: 'withdraw' }), await BTN('Secondary', 'Send another message', { size: 'L' }), await BTN('Ghost', 'Back to lobby', { size: 'L' })); add(sp, ac);
  f3.appendChild(sp); sp.layoutSizingHorizontal = 'FILL'; }
// 4 — Send failed
const k4 = await mk('Send failed — error', k3); out.failed = k4.id;
{ for (const [n, v] of [['Name', 'Nova K.'], ['Email', 'nova.k@example.com'], ['Account ID', 'GP-48213'], ['Reference', 'WD-20931']]) { const f = Fd(k4, n); f.setProperties({ State: 'Filled' }); val(f, v); }
  const tp = Fd(k4, 'Topic'); val(tp, 'Withdrawals', 'text/primary', 'Value');
  const ms = Fd(k4, 'Message'); val(ms, MSG); txt(ms, 'Counter', '133 / 2,000');
  const form = k4.findOne(n => n.name === 'Contact form'); const an = form.findOne(n => n.name === 'Anti-phishing notice');
  const ref = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ref, await T('Error ref ERR-CT-5F2A', 'Mono/S', 'text/secondary'), await DEMO('XS'), await BTN('Ghost', 'Copy reference', { size: 'S', lead: 'copy' }));
  const co = await callout('Send error', 'status/danger-tint', 'border/danger', 'wifi-off', 'text/danger', 'Your message wasn’t sent', 'We couldn’t reach our server — the request timed out after 30 seconds. Nothing is lost: everything you typed is still below. Try again, or use live chat if it keeps failing.', ref);
  form.insertChild(form.children.indexOf(an), co); co.layoutSizingHorizontal = 'FILL';
  const sb = k4.findOne(n => n.name === 'Button — Send'); setProp(sb, 'Label', 'Try again'); setProp(sb, 'Leading icon', ICONS['refresh']);
  k4.findOne(n => n.name === 'Action note text').characters = 'Still failing? Email support@globalpool.example (placeholder) and quote the error reference.'; }
{ let y = base.y + base.height + 160; for (const k of [k1, k2, k3, k4]) { k.y = y; y += k.height + 160; } }
fitSection(sec);
await k1.findOne(n => n.name === 'Contact form').screenshot({ scale: 0.5 });
await k3.findOne(n => n.name === 'Contact form').screenshot({ scale: 0.5 });
await k4.findOne(n => n.name === 'Contact form').screenshot({ scale: 0.5 });
return out;
