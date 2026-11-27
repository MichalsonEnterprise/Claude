#!/usr/bin/env python3
"""Assemble ready-to-run use_figma scripts: helpers.js (verbatim) + _lib.js + <screen>.js -> out/<screen>.js
Also syntax-checks each script with node (wrapped in an async function) and reports size (< 50,000 chars)."""
import os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
helpers = open(os.path.join(here, '..', '..', 'helpers.js')).read()
lib = open(os.path.join(here, '_lib.js')).read()
mlib_path = os.path.join(here, '_mlib.js')
out = os.path.join(here, 'out'); os.makedirs(out, exist_ok=True)
names = sys.argv[1:] or sorted(f[:-3] for f in os.listdir(here) if f.endswith('.js') and not f.startswith('_'))
for n in names:
    body = open(os.path.join(here, n + '.js')).read()
    extra = open(mlib_path).read() + '\n' if (n.startswith('m-') or n.startswith('t-')) and os.path.exists(mlib_path) else ''
    code = helpers + '\n' + lib + '\n' + extra + body
    p = os.path.join(out, n + '.js'); open(p, 'w').write(code)
    chk = os.path.join(out, '.check.mjs'); open(chk, 'w').write('async function __x(){\n' + code + '\n}\n')
    r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
    print(f"{n}: {len(code)} chars {'OK' if r.returncode == 0 else 'SYNTAX ERROR'}")
    if r.returncode: print(r.stderr[:1500])
