{ const pg = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(pg); const sec = pg.children.find(n => n.type === 'SECTION' && n.name === 'AUTH — Mobile B'); const fixed = [];
for (const f of sec.children.filter(n => n.type === 'FRAME' && /^AUTH-(0[789]|10) /.test(n.name))) { const db = f.children[0]; if (db && db.type === 'INSTANCE') { const cp = db.componentProperties; const key = Object.keys(cp).find(k => k.split('#')[0] === 'Message'); if (key && cp[key].value !== 'DEMO DATA — illustrative values only') { db.setProperties({ [key]: 'DEMO DATA — illustrative values only' }); fixed.push(f.id); } } }
const lk = sec.children.find(n => n.name === 'AUTH-08 2FA Challenge — Login / 390 / Locked'); let otpFix = 0;
if (lk) { for (const t of lk.findAll(n => n.type === 'TEXT' && /Too many attempts/i.test(n.characters))) { await ST(t, 'Locked after 5 incorrect codes · unlocks 16:59 UTC'); otpFix++; } }
const wd = sec.children.find(n => n.name === 'AUTH-08 2FA Challenge — Withdrawal / 390 / Default');
fitSection(sec);
OUT.push({ demobarFixed: fixed, otpFix, lockedTexts: lk ? lk.findAll(n => n.type === 'TEXT' && /unlocks|Try again/i.test(n.characters)).map(n => n.characters) : null, wd: wd ? wd.id : null }); }
