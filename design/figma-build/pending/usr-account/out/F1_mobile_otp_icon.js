// Page 10: hide the leftover timer icon of Input/OTP inside the 2FA disable bottom sheet (155:87455) and screenshot the earlier run's 390 frames.
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('155:87455'); const hid = [];
const sh = f && f.children.find(c => c.name.startsWith('Bottom sheet'));
if (sh) { const otp = sh.findAll(n => n.type === 'INSTANCE' && n.width > 300 && n.height > 100 && n.findAll(x => x.type === 'TEXT').length >= 2)[0];
  if (otp) for (const n of otp.findAll(x => /clock|timer|resend|hourglass/i.test(x.name))) { if (n.visible) { n.visible = false; hid.push(n.name + ' ' + Math.round(n.width) + 'x' + Math.round(n.height)); } } }
for (const id of ['155:87455', '34:484196', '34:495793', '36:510785', '36:537760']) { const n = await figma.getNodeByIdAsync(id); if (n) await n.screenshot({ scale: 0.5 }); }
return { hid };
