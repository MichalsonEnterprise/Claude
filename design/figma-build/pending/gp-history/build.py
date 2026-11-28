# Assemble batched use_figma scripts for agent gp-history (GP-08..11/13 + GP mobile C).
# Usage: python3 build.py  -> writes out/<batch>.js (helpers.js verbatim + lib [+ mlib] + bodies wrapped in blocks)
import json, os, re
D = os.path.dirname(os.path.abspath(__file__))
H = open(os.path.join(D, '..', '..', 'helpers.js')).read()
L = open(os.path.join(D, 'lib.js')).read(); M = open(os.path.join(D, 'mlib.js')).read()
V = json.load(open(os.path.join(D, 'vals.json')))
BATCHES = {
  'd1-gp08-default-filters': ['b01', 'b02'],
  'd2-gp09-cancelled-settled': ['b03', 'b09'],
  'd3-gp10-gp11': ['b04', 'b05'],
  'd4-gp13-closed-cancelled-vrf': ['b06', 'b07', 'b08'],
  'm1-gp08-default-filters': ['m01', 'm02'],
  'm2-gp09-gp10': ['m03', 'm04'],
  'm3-gp11-gp13closed': ['m05', 'm06'],
  'm4-gp13-cancelled-vrf': ['m07', 'm08'],
}
for name, parts in BATCHES.items():
    mobile = name.startswith('m')
    head = H + '\n' + L + '\n' + (M + '\n' if mobile else '')
    out = []
    for i, p in enumerate(parts):
        b = open(os.path.join(D, p + '.js')).read()
        for k, v in V.items(): b = b.replace(k, v)
        lines = b.strip().split('\n')
        assert lines[0].startswith('const page') and lines[1].startswith('const sec'), p
        if i == 0:
            out += lines[:2] + ['const R = [];', "for (const n of figma.currentPage.children.filter(n => n.type !== 'SECTION' && /^(Popover — Filter rounds|Modal — Round closed|Bottom sheet — )/.test(n.name))) n.remove(); // orphans from an earlier failed run"]
            if name.startswith('d1'):
                out.append("const G2 = await (async () => { try { const g = await figma.getNodeByIdAsync('32:97641'); return g.findAll(x => x.type === 'TEXT' && /^Round #1,24[67]$/.test(x.characters)).map(h => { let p = h.parent; for (let i = 0; i < 3 && p.parent; i++) { if (p.findAll(x => x.type === 'TEXT').length >= 6) break; p = p.parent; } return p.findAll(x => x.type === 'TEXT').slice(0, 12).map(t => t.characters.slice(0, 40)).join(' | '); }); } catch (e) { return String(e).slice(0, 80); } })();")
        body = lines[2:]
        assert body[-1].startswith('return {'), p
        body[-1] = 'R.push(' + body[-1][len('return '):].rstrip(';') + ');'
        out += ['try { // ---- ' + p] + body + ["} catch (e) { R.push({ part: '" + p + "', err: String(e && e.message || e).slice(0, 240) }); }"]
    out.append("return { sec: sec.id, R, MISS: MISS.slice(0, 40)" + (", G2" if name.startswith('d1') else "") + " };")
    s = head + '\n'.join(out) + '\n'
    assert len(s) < 50000, (name, len(s))
    open(os.path.join(D, 'out', name + '.js'), 'w').write(s)
    print(name, len(s))
