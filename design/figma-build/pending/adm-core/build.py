#!/usr/bin/env python3
"""Assemble ready-to-run use_figma scripts: helpers.js (verbatim, current) + _lib.js + <name>.js -> out/<name>.js,
syntax-check each with node (wrapped in an async function) and report size (must be < 50,000 chars)."""
import os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
helpers = open(os.path.join(here, '..', '..', 'helpers.js')).read()
lib = open(os.path.join(here, '_lib.js')).read()
out = os.path.join(here, 'out'); os.makedirs(out, exist_ok=True)
names = sys.argv[1:] or sorted(f[:-3] for f in os.listdir(here) if f.endswith('.js') and not f.startswith('_'))
for n in names:
    body = open(os.path.join(here, n + '.js')).read()
    import re as _re
    body = _re.sub(r'^//#include (\S+)\s*$', lambda m: open(os.path.join(here, m.group(1))).read(), body, flags=_re.M)
    code = helpers + '\n' + lib + '\n' + body
    p = os.path.join(out, n + '.js'); open(p, 'w').write(code)
    chk = os.path.join(out, '.check.mjs'); open(chk, 'w').write('async function __x(){\n' + code + '\n}\n')
    r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
    print(f"{n}: {len(code)} chars {'OK' if r.returncode == 0 else 'SYNTAX ERROR'}")
    if r.returncode: print(r.stderr[:1500])
