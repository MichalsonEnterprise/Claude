#!/usr/bin/env python3
"""AUTH-07..10 2FA & wallet connect (agent auth-b) — assemble ready-to-run use_figma scripts.
out/<name>.js = helpers.js (verbatim) + the kit.js functions the body references + bodies/<parts>.js
Checks: node --check and a dry run against mock.cjs (validates token / text-style / effect names and FILL/HUG/ABSOLUTE use).
Usage: python3 build.py <outname>:<body1>,<body2> ...
Remaining run order (Figma rate limit stopped the build after AUTH-07 desktop):
  c3 = fix_otp,d08_login          AUTH-07 Step 2 OTP fix + AUTH-08 Login Default/Wrong code/Locked (1440)
  k4 = d08_wd,v09a,d09            AUTH-08 Withdrawal Default/Wrong code/Locked + AUTH-09 List (1440)
  k5 = v09b,d09                   AUTH-09 WalletConnect QR/Connecting/Rejected/Wrong network/Success (1440)
  k6 = v10,d10                    AUTH-10 Request/Success/Rejected/Expired nonce (1440)
  k7 = m07,m08                    page 10 'AUTH - Mobile B': AUTH-07 x3 + AUTH-08 Login Default/Locked + Withdrawal (390)
  k8 = m09,m10                    page 10: AUTH-09 List/Wrong network/WalletConnect deep link + AUTH-10 Request/Expired nonce (390)
Scripts are idempotent per frame name (START() replaces a same-named frame in place) and end each frame with a screenshot.
"""
import re, sys, os, subprocess
D = os.path.dirname(os.path.abspath(__file__))
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
    return helpers.rstrip('\n') + '\n// ===== AUTH-B KIT (subset) =====\n' + kit + '\n// ===== END AUTH-B KIT =====\n' + body
for arg in sys.argv[1:]:
    name, parts = arg.split(':') if ':' in arg else (arg, arg)
    body = 'const OUT = [];\n' + '\n'.join(open(os.path.join(D, 'bodies', x + '.js')).read() for x in parts.split(',')) + '\nreturn OUT;'
    full = assemble(body)
    out = os.path.join(D, 'out', name + '.js'); open(out, 'w').write(full)
    chk = os.path.join(D, 'out', '_chk.js'); open(chk, 'w').write('async function __x(){\n' + full + '\n}')
    r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
    m = subprocess.run(['node', os.path.join(D, 'mock.cjs'), out], capture_output=True, text=True)
    print(name, len(full), 'OK' if r.returncode == 0 else 'SYNTAX ERROR\n' + r.stderr[:800], '| mock:', (m.stdout or m.stderr).strip()[:300])
    if len(full) >= 50000: print('  !! OVER 50k')
