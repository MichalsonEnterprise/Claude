#!/usr/bin/env python3
"""AUTH-05/06/18..21 Recovery & restrictions (agent auth-d) — assemble ready-to-run use_figma scripts.
out/<name>.js = helpers.js (verbatim) + the kit.js functions the body references + bodies/<parts>.js
kit.js = kit-base.js (subset of pending/auth-b/kit.js, ROW/COL/FORM patched to hug height) + kit-d.js (auth-d additions).
Checks: node --check and a dry run against mock.cjs (validates token / text-style / effect names and FILL/HUG/ABSOLUTE use).
Usage: python3 build.py <outname>:<body1>,<body2> ...   (see RUN-ORDER.json)
Scripts are idempotent per frame name: FRAME() SKIPS a frame whose name already exists in the section
(set o.rebuild=true in the body to replace it in place) and ends each frame with a screenshot.
"""
import re, sys, os, subprocess
D = os.path.dirname(os.path.abspath(__file__))
open(os.path.join(D, 'kit.js'), 'w').write(open(os.path.join(D, 'kit-base.js')).read() + open(os.path.join(D, 'kit-d.js')).read())
helpers = open('/home/user/Claude/design/figma-build/helpers.js').read()
kit_lines = [l for l in open(os.path.join(D, 'kit.js')).read().split('\n') if l.strip() and not l.startswith('//')]
defs = {}; order = []
for l in kit_lines:
    m = re.match(r'(?:async )?function (\w+)|const (\w+)\s*=', l)
    if not m: raise SystemExit('bad kit line: ' + l[:60])
    name = m.group(1) or m.group(2); defs[name] = l; order.append(name)
def refs(text): return set(w for w in re.findall(r'\b([A-Z][A-Z0-9_]*)\b', text) if w in defs)
def assemble(body):
    need = set(); frontier = refs(body)
    while frontier:
        n = frontier.pop()
        if n in need: continue
        need.add(n); frontier |= refs(defs[n]) - need
    kit = '\n'.join(defs[n] for n in order if n in need)
    return helpers.rstrip('\n') + '\n// ===== AUTH-D KIT (subset) =====\n' + kit + '\n// ===== END AUTH-D KIT =====\n' + body
for arg in sys.argv[1:]:
    name, parts = arg.split(':') if ':' in arg else (arg, arg)
    body = 'const OUT = [];\n' + '\n'.join(open(os.path.join(D, 'bodies', x + '.js')).read() for x in parts.split(',')) + '\nreturn OUT;'
    full = assemble(body)
    out = os.path.join(D, 'out', name + '.js'); open(out, 'w').write(full)
    chk = os.path.join(D, 'out', '_chk.js'); open(chk, 'w').write('async function __x(){\n' + full + '\n}')
    r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
    m = subprocess.run(['node', os.path.join(D, 'mock.cjs'), out], capture_output=True, text=True)
    print(name, len(full), 'OK' if r.returncode == 0 else 'SYNTAX ERROR\n' + r.stderr[:800], '| mock:', (m.stdout or m.stderr).strip()[:400])
    if len(full) >= 50000: print('  !! OVER 50k')
