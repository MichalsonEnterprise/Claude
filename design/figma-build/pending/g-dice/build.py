#!/usr/bin/env python3
"""g-dice (DI-01..DI-07 + GM-01) — assemble ready-to-run use_figma scripts.
out/<name>.js = helpers.js (verbatim) + src/kit-*.js + src/bodies/_head_<d|m>.js + bodies + 'return OUT;'
Checks: node --check + dry run against mock.cjs; warns when a script is >= 50,000 chars.
Usage: python3 build.py            (builds every script in PLAN)
       python3 build.py 01 03      (builds only those)
"""
import os, sys, subprocess
D = os.path.dirname(os.path.abspath(__file__))
HELPERS = open('/home/user/Claude/design/figma-build/helpers.js').read()
def src(p): return open(os.path.join(D, 'src', p)).read()
import re
def parse_kit(text):
    defs, order, cur = {}, [], None
    for line in text.split('\n'):
        if not line.strip() or line.lstrip().startswith('//'): continue
        m = re.match(r'(?:async )?function (\w+)|const (\w+)\s*=', line)
        if m and not line.startswith(' '):
            cur = m.group(1) or m.group(2); defs[cur] = line.strip(); order.append(cur)
        else:
            defs[cur] += '\n' + line.strip()
    return defs, order
def subset(kits, body):
    defs, order = {}, []
    for k in kits:
        d, o = parse_kit(src(k)); defs.update(d); order += o
    words = lambda t: set(re.findall(r'\b([A-Za-z_]\w*)\b', t))
    need, frontier = set(), words(body) & set(defs)
    while frontier:
        n = frontier.pop()
        if n in need: continue
        need.add(n); frontier |= (words(defs[n]) & set(defs)) - need
    return '// ===== DICE KIT (subset, agent g-dice) =====\n' + '\n'.join(defs[n] for n in order if n in need) + '\n// ===== END DICE KIT =====\n'
def squeeze(t): return '\n'.join(l.strip() for l in t.split('\n') if l.strip() and not l.strip().startswith('//'))
# name: (kits, head, bodies)
PLAN = {
  '01_d_di01_master':        (['kit-base.js', 'kit-play.js'], '_head_d.js', ['d01.js']),
  '02_d_di02_states':        (['kit-base.js', 'kit-play.js'], '_head_d.js', ['d02.js']),
  '03_d_di03_di04':          (['kit-base.js', 'kit-play.js'], '_head_d.js', ['d03.js']),
  '04_d_di05_history':       (['kit-base.js', 'kit-play.js', 'kit-pages.js'], '_head_d.js', ['d04.js']),
  '05_d_di06_pf':            (['kit-base.js', 'kit-play.js', 'kit-pages.js'], '_head_d.js', ['d05.js']),
  '06_d_di07_a':             (['kit-base.js', 'kit-play.js'], '_head_d.js', ['d06.js']),
  '07_d_di07_b':             (['kit-base.js', 'kit-play.js'], '_head_d.js', ['d07.js']),
  '08_d_gm01_overlays':      (['kit-base.js', 'kit-play.js'], '_head_d.js', ['d08a.js']),
  '08b_d_gm01_spec':         (['kit-base.js', 'kit-play.js'], '_head_d.js', ['d08b.js']),
  '09_t_di01_768':           (['kit-base.js', 'kit-play.js'], '_head_d.js', ['d09.js']),
  '10_m_di01_di02_di03':     (['kit-base.js', 'kit-play.js', 'kit-pages.js', 'kit-m.js'], '_head_m.js', ['m01.js']),
  '11_m_di04_gm01':          (['kit-base.js', 'kit-play.js', 'kit-pages.js', 'kit-m.js'], '_head_m.js', ['m02.js']),
  '12_m_di05_di06':          (['kit-base.js', 'kit-play.js', 'kit-pages.js', 'kit-m.js'], '_head_m.js', ['m03.js']),
  '13_m_di07':               (['kit-base.js', 'kit-play.js', 'kit-pages.js', 'kit-m.js'], '_head_m.js', ['m04.js']),
}
only = sys.argv[1:]
for name, (kits, head, bodies) in PLAN.items():
    if only and not any(name.startswith(o) for o in only): continue
    missing = [b for b in bodies if not os.path.exists(os.path.join(D, 'src', 'bodies', b))] + [k for k in kits if not os.path.exists(os.path.join(D, 'src', k))]
    if missing: print(name, 'SKIP (missing', missing, ')'); continue
    body = squeeze(src('bodies/' + head) + '\n' + '\n'.join(src('bodies/' + b) for b in bodies)) + '\nreturn OUT;\n'
    full = HELPERS.rstrip('\n') + '\n' + subset(kits, body) + body
    out = os.path.join(D, 'out', name + '.js'); open(out, 'w').write(full)
    chk = os.path.join(D, 'out', '_chk.js'); open(chk, 'w').write('async function __x(){\n' + full + '\n}')
    r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
    m = subprocess.run(['node', os.path.join(D, 'mock.cjs'), out], capture_output=True, text=True)
    print(name, len(full), 'syntax OK' if r.returncode == 0 else 'SYNTAX ERROR\n' + r.stderr[:800], '| mock:', (m.stdout or m.stderr).strip()[:400])
    if len(full) >= 50000: print('  !! OVER 50k')
if os.path.exists(os.path.join(D, 'out', '_chk.js')): os.remove(os.path.join(D, 'out', '_chk.js'))
