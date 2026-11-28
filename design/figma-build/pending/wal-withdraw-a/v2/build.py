import re, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
H = open('../../../helpers.js').read()
C = open('_common.js').read()
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
  'd03': ['_desk.js', 'd03.js'], 'd04': ['_desk.js', 'd04.js'], 'd05': ['_desk.js', 'd05.js'], 't': ['_desk.js', 't.js'],
  'm1': ['_mob.js', 'm1.js'], 'm2': ['_mob.js', 'm2.js'], 'm3': ['_mob.js', 'm3.js'],
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
    s = H + '\n// ===== WAL-WA common (pruned) =====\n' + body + '\n' + rest
    open('out/' + name + '.js', 'w').write(s)
    print(name, len(s))
