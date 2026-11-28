#!/usr/bin/env python3
"""AUTH-11..17 KYC (agent auth-c) — assemble ready-to-run use_figma scripts.
out/<name>.js = helpers.js (verbatim, read fresh) + (_mlib.js for m-* | _lib.js for d-*) + <name>.js
Each script builds 1-3 related states of one screen (duplicate-safe: frames whose name already exists in the
section are skipped), ends every frame with `await f.screenshot({scale:0.5})`, and returns the frame ids.
Checks: node --check (wrapped in an async function), size < 50,000 chars, and a dry run against _mock-run.cjs
(a minimal Plugin API mock that validates token/style names and FILL/HUG/ABSOLUTE usage).
Run order (desktop page 04 first, then mobile page 10):
  d-auth-11, d-auth-12, d-auth-13, d-auth-14, d-auth-15-16, d-auth-17, m-auth-11-12, m-auth-13, m-auth-14, m-auth-15-17
"""
import os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
helpers = open(os.path.join(here, '..', '..', 'helpers.js')).read()
out = os.path.join(here, 'out'); os.makedirs(out, exist_ok=True)
names = sys.argv[1:] or sorted(f[:-3] for f in os.listdir(here) if f.endswith('.js') and not f.startswith('_'))
for n in names:
    lib = open(os.path.join(here, '_mlib.js' if n.startswith('m-') else '_lib.js')).read()
    body = open(os.path.join(here, n + '.js')).read()
    code = helpers + '\n' + lib + '\n' + body
    p = os.path.join(out, n + '.js'); open(p, 'w').write(code)
    chk = os.path.join(out, '.check.mjs'); open(chk, 'w').write('async function __x(){\n' + code + '\n}\n')
    r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
    m = subprocess.run(['node', os.path.join(here, '_mock-run.cjs'), p], capture_output=True, text=True)
    status = 'OK' if r.returncode == 0 else 'SYNTAX ERROR'
    print(f"{n}: {len(code)} chars {status} · mock: {(m.stdout or m.stderr).strip()[:160]}")
    if len(code) >= 50000: print('  !! over 50k')
    if r.returncode: print(r.stderr[:1500])
