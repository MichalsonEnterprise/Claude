async function mainHeader(main) {
  let h = main.children.find(n => n.name === 'Header — PRO-06..10');
  if (h) return h;
  h = AL('VERTICAL', { name: 'Header — PRO-06..10', gap: 20, p: 56, fill: 'surface/default', stroke: 'border/subtle', r: 20, w: 3000 });
  const ov = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(ov, await T('11 — PROTOTYPES · P1 FLOWS', 'Overline', 'text/brand'), await DEMO('M'));
  add(h, ov, await T('PRO-06..10 — Games, KYC and admin prototypes', 'Display/M', 'text/primary'));
  add(h, await T('Five clickable flows built from clones of the verified source screens (pages 03, 04, 05, 08, 09). Each flow has its own section: a flow map card (steps, branch conditions, rules it proves), the cloned frames left → right with numbered headers, mint arrows for the happy path, amber arrows for error branches and sky arrows for alternate outcomes. Every frame carries a prototype bar (not product UI) with Simulate chips for branches plus Back and Restart, so no frame is a dead end. Start any flow from Present ▶ → Flows.', 'Body/L', 'text/secondary', { w: 2880 }));
  const row = AL('HORIZONTAL', { gap: 24, wrap: true, cgap: 12 });
  for (const t of ['PRO-06 Games Lobby → Game → Result', 'PRO-07 Profile → KYC', 'PRO-08 Admin → User Management', 'PRO-09 Admin → Finance', 'PRO-10 Admin → Pool Monitoring']) { const c = AL('HORIZONTAL', { gap: 8, p: [8, 16, 8, 16], fill: 'surface/raised', stroke: 'border/default', r: 9999, align: 'CENTER' }); add(c, await IC('play', 16, 'icon/brand'), await T(t, 'Label/M', 'text/primary')); add(row, c); }
  add(h, row);
  add(h, await T('Source of truth = the original frames. These are clones for prototyping: after a source changes, re-run pending/proto-b scripts (they rebuild the clones idempotently by name).', 'Caption', 'text/tertiary', { w: 2880 }));
  main.appendChild(h); h.x = 120; h.y = 120; return h;
}
