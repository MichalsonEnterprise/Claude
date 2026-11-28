import re, os
H = open('../../helpers.js').read()
C = open('_common.js').read()
# split common into top-level chunks
chunks = []; cur = []
for line in C.split('\n'):
    if re.match(r'^(async function|function|const|// =====)', line) and cur:
        chunks.append('\n'.join(cur)); cur = []
    cur.append(line)
if cur: chunks.append('\n'.join(cur))
def name_of(ch):
    m = re.match(r'^(?:async function|function)\s+(\w+)|^const\s+(\w+)', ch)
    return (m.group(1) or m.group(2)) if m else None
targets = {
  'd15': ['_desk.js', 'b15.js', 'd15.js'], 'd16': ['_desk.js', 'b16.js', 'd16.js'], 'd17': ['_desk.js', 'b17.js', 'd17.js'],
  'd1819': ['_desk.js', 'b1819.js', 'd1819.js'], 't': ['_desk.js', 'tab.js'],
  'm1': ['_mob.js', 'b15.js', 'b16.js', 'm1.js'], 'm2': ['_mob.js', 'b17.js', 'b1819.js', 'm2.js'], 'm3': ['_mob.js', 'b1819.js', 'm3.js'],
}
for name, parts in targets.items():
    if not all(os.path.exists(p) for p in parts): continue
    rest = '\n'.join(open(p).read() for p in parts)
    keep = set(); changed = True
    while changed:
        changed = False
        pool = rest + '\n'.join(ch for ch in chunks if name_of(ch) in keep)
        for ch in chunks:
            n = name_of(ch)
            if n and n not in keep and re.search(r'\b' + n + r'\b', pool): keep.add(n); changed = True
    body = '\n'.join(ch for ch in chunks if name_of(ch) in keep)
    s = H + '\n// ===== WAL-WB common (pruned) =====\n' + body + '\n' + rest
    open('out/' + name + '.js', 'w').write(s)
    print(name, len(s))
