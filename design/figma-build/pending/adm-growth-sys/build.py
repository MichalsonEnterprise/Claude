#!/usr/bin/env python3
"""Assemble use_figma scripts: helpers.js (verbatim) + _laptop.js + <name>.js -> out/<name>.js, node syntax check, size < 50k."""
import os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
helpers = open(os.path.join(here, '..', '..', 'helpers.js')).read()
out = os.path.join(here, 'out'); os.makedirs(out, exist_ok=True)
names = sys.argv[1:] or sorted(f[:-3] for f in os.listdir(here) if f.endswith('.js') and not f.startswith('_'))
for n in names:
    body = open(os.path.join(here, n + '.js')).read()
    libs = ['_laptop.js'] if n.startswith('l') else ['_tablet.js']
    code = helpers + '\n' + ''.join(open(os.path.join(here, l)).read() + '\n' for l in libs if os.path.exists(os.path.join(here, l))) + body
    p = os.path.join(out, n + '.js'); open(p, 'w').write(code)
    chk = os.path.join(out, '.check.mjs'); open(chk, 'w').write('async function __x(){\n' + code + '\n}\n')
    r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
    print(f"{n}: {len(code)} chars {'OK' if r.returncode == 0 else 'SYNTAX ERROR'}")
    if r.returncode: print(r.stderr[:1500])
