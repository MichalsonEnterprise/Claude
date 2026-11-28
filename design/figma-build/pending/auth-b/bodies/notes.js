{ const page = figma.root.children.find(p => p.name === '04 — Authentication'); await figma.setCurrentPageAsync(page);
const sec = section('AUTH-07/08/09/10 2FA & wallet connect', 12000, 0);
if (!sec.children.find(c => c.name.startsWith('Notes —'))) {
  const n = COL('Notes — AUTH-07…10', [], { gap: 8, p: [24, 32, 24, 32], fill: 'surface/default', r: 14, w: 10800 }); sec.appendChild(n); n.x = 120; n.y = 120;
  add(n, await P('AUTH-07…10 · Two-step sign-in (2FA) and wallet connection for @nova.k (DEMO)', 'Heading/H4', 'text/primary'));
  add(n, await P('Pattern: dialogs over the dimmed casino lobby (Shell/Sidebar + Shell/Topbar + scrim), same as AUTH-01…04. Columns left → right: AUTH-07 enrollment steps (Scan → Confirm → Backup codes), AUTH-08 login challenge (Default · Wrong code · Locked), AUTH-08 withdrawal challenge with Modal/2FA over withdraw step 7 (Default · Wrong code · Locked), AUTH-09 Modal/Connect Wallet (List · WalletConnect QR · Connecting · Rejected · Wrong network · Success), AUTH-10 sign-message verification (Request · Success · Rejected · Expired nonce). Mobile 390 frames: page 10, section “AUTH — Mobile B”. Codes, keys, QR codes, addresses, nonces and signatures are illustrative DEMO values. Art uses concrete objects only (phone with authenticator app, wallet-extension pop-up) — no glows, rings or particles.', 'Body/S', 'text/secondary'));
}
OUT.push({ section: sec.id }); }
