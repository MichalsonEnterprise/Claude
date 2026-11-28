// ===== WAL-17 Step 8 Pending — content builder (st: Processing | Queued | Manual review; M: 0 desktop, 1 mobile) =====
async function flow17(fc, st, M) {
  const proc = st === 'Processing', q = st === 'Queued', rev = st === 'Manual review';
  await stHead(fc, proc ? await B('Processing') : q ? await B('Pending', 'Queued') : await B('Under review'), { M });
  await fhead(fc, proc ? 'Sending your withdrawal' : q ? 'In the queue — next batch at 18:50 UTC' : 'Under review — usually under 4 h', proc ? 'It\'s being broadcast to Arbitrum One right now. Most withdrawals arrive within 5 minutes — you can leave this page.' : q ? 'Arbitrum One withdrawals go out in batches every 10 minutes to keep network fees low. Yours is #4 of 9 in the 18:50 UTC batch.' : 'We\'ll send it as soon as the review is done. You don\'t need to do anything — we\'ll notify you here and by email.', M);
  await bigAmt(fc, 'YOU RECEIVE', '1,499.92 USDT', 'to ' + AD + ' on Arbitrum One · network fee 0.08 USDT · platform fee 0.00 USDT', { M });
  await tiles(fc, proc ? [['Requested', '18:44 UTC'], ['Estimated arrival', 'by 18:52 UTC'], ['Confirmations', '0 / 20']] : q ? [['Requested', '18:44 UTC'], ['Next batch', '18:50 UTC'], ['Estimated arrival', 'by 18:58 UTC']] : [['Requested', '18:44 UTC'], ['Decision expected', 'by 22:44 UTC', 'text/warning'], ['Reference', 'WD-20931']], M);
  if (rev) add(fc, [await alertBox('warning', 'Why: routine AML screening for new destinations — usually under 4 h', 'This is your first withdrawal to ' + AD + '. A compliance analyst checks the destination before anything is sent. You won\'t be asked for documents unless something is unclear — and we\'d tell you here first.', { icon: 'shield-alert' }), 'FILL']);
  const items = [{ s: 'done', t: 'Withdrawal requested', d: '27 Nov 2026, 18:44 UTC · confirmed with email code + authenticator' }];
  if (rev) { items.push({ s: 'done', t: 'Automatic checks', d: '5 of 6 passed at 18:43 UTC · destination routed to manual review' }); items.push({ s: 'review', t: 'Manual AML review', d: 'Started 18:44 UTC · decision expected by 22:44 UTC' }); }
  else items.push({ s: 'done', t: 'Security & risk checks', d: 'All 6 passed at 18:43 UTC' });
  if (q) items.push({ s: 'current', t: 'Waiting for the 18:50 UTC batch', d: '#4 of 9 · you can cancel until 18:50 UTC' });
  items.push(proc ? { s: 'current', t: 'Sending to Arbitrum One', d: 'Broadcasting now — usually under 5 minutes' } : { s: 'todo', t: 'Sent to Arbitrum One', d: 'Transaction hash appears here' });
  items.push({ s: 'todo', t: 'Confirmed on-chain', d: '20 confirmations · about 2 minutes on Arbitrum One' });
  items.push({ s: 'todo', t: 'Completed', d: 'Receipt emailed to n•••@example.com — look for AURORA-27' });
  await tl(fc, 'Withdrawal progress', items, M);
  add(fc, [await alertBox('info', proc ? 'It can\'t be cancelled now' : '1,500.00 USDT is held in Locked until it\'s sent', proc ? 'It\'s already being broadcast. The 1,500.00 USDT stays in Locked until the transaction confirms, then it\'s released.' : 'You can cancel until it\'s sent — the full 1,500.00 USDT goes straight back to Available. Locked shows 1,850.00 USDT: this withdrawal plus your 35 entries in round #1,248.', { icon: 'lock' }), 'FILL']);
  if (proc) return { alt: [['Ghost', 'View in history', 'history']], next: 'Back to wallet', trail: null, note: 'Updates live — no need to refresh' };
  return { alt: [['Secondary', 'Cancel withdrawal', 'x'], ['Ghost', 'View in history', 'history']], next: 'Back to wallet', trail: null, note: rev ? 'We\'ll notify you when it\'s approved' : null };
}
// ===== END WAL-17 builder =====
