const FIX = {};
try { // ---- decision #29: short DEMO bar message on 390 frames built earlier
  for (const id of FIXIDS) { const g = await figma.getNodeByIdAsync(id); const db = g && g.children[0]; if (db && db.type === 'INSTANCE') { setP(db, { Message: 'DEMO DATA — illustrative values only' }, 'demobar'); FIX[id] = 'ok'; } else FIX[id] = 'no bar'; }
} catch (e) { FIX.err = String(e && e.message || e).slice(0, 200); }
