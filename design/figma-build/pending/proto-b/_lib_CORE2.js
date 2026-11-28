function backOf(f) { if (f.back) return f.back; const m = MAINS(); const i = m.findIndex(x => x.k === f.k); if (i > 0) return m[i - 1].k; if (i === 0) return null; const inl = FLOW.links.find(l => l.to === f.k && !l.loop); return inl ? inl.from : null; }
function wrapOf(sub, f) { return sub.children.find(n => n.type === 'FRAME' && n.name.startsWith(PRE(f))); }
