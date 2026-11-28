# Assemble batched use_figma scripts for agent usr-vip-ref (USR-V1..V4 + USR-R1..R5, desktop + mobile).
# Usage: python3 build.py -> out/<batch>.js = ../../helpers.js (verbatim) + lib.js + dlib.js|mlib.js + bodies (each in try/catch block)
import os
D = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(D, n)).read()
H = rd('../../helpers.js'); L = rd('lib.js'); DL = rd('dlib.js'); ML = rd('mlib.js')
HEAD = {
 'd': "const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);\nconst sec = section('USR-V1..V4 VIP & USR-R1..R5 Referrals', 48000, 0);\nconst R = [];\n",
 'm': "const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);\nconst sec = section('USR — Mobile E', 119000, 0);\nconst R = [];\n",
}
BATCHES = {
 'd1-v1-v2': ['d-v1', 'd-v2'],
 'd2-v3-default-claimed': ['d-v3', 'd-v3b'],
 'd3-v4-r1': ['d-v4', 'd-r1'],
 'd4-r2-r3': ['d-r2', 'd-r3'],
 'd5-r4-r5': ['d-r4', 'd-r5'],
 'd6-r5-modal-locked': ['d-r5m', 'd-r5l'],
 'm1-v1-v2-v3': ['m-v1', 'm-v2', 'm-v3'],
 'm2-v4-r1-r2': ['m-v4', 'm-r1', 'm-r2'],
 'm3-r3-r4': ['m-r3', 'm-r4'],
 'm4-r5-sheet': ['m-r5', 'm-r5s'],
}
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
for name, parts in BATCHES.items():
    k = name[0]
    s = H + '\n' + L + '\n' + (DL if k == 'd' else ML) + '\n' + HEAD[k]
    for p in parts:
        s += "try { // ---- " + p + "\n" + rd(p + '.js').strip() + "\n} catch (e) { R.push({ body: '" + p + "', err: (String(e && e.message || e) + ' | ' + String(e && e.stack || '')).slice(0, 500) }); }\n"
    s += "return { sec: sec.id, R, MISS: MISS.slice(0, 60) };\n"
    assert len(s) < 50000, (name, len(s))
    open(os.path.join(D, 'out', name + '.js'), 'w').write(s)
    print(name, len(s))
