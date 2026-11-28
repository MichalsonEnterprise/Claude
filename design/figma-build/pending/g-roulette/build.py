#!/usr/bin/env python3
"""g-roulette (RL-01..RL-09) — assemble ready-to-run use_figma scripts.
out/<name>.js = helpers.js (verbatim) + used kit functions + bodies/_head_<d|m>.js + body + 'return OUT;'
Checks: node --check + mock dry run; warns >= 50,000 chars.  Usage: python3 build.py [prefix ...]"""
import os, sys, subprocess, re
D = os.path.dirname(os.path.abspath(__file__))
HELPERS = open('/home/user/Claude/design/figma-build/helpers.js').read()
def src(p): return open(os.path.join(D, 'src', p)).read()
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
    return '// ===== ROULETTE KIT (subset, agent g-roulette) =====\n' + '\n'.join(defs[n] for n in order if n in need) + '\n// ===== END ROULETTE KIT =====\n'
def squeeze(t): return '\n'.join(l.strip() for l in t.split('\n') if l.strip() and not l.strip().startswith('//'))
K = ['kit-base.js', 'kit-felt.js']; KP = K + ['kit-pages.js']; KM = KP + ['kit-m.js']
PLAN = {
  '01_d_rl01_master':     (K, '_head_d.js', ['d01.js']),
  '02_d_rl02_rl03':       (K, '_head_d.js', ['d02.js']),
  '03_d_rl04_rl05':       (K, '_head_d.js', ['d03.js']),
  '04_d_rl09_a':          (K, '_head_d.js', ['d04.js']),
  '05_d_rl09_b':          (K, '_head_d.js', ['d05.js']),
  '06_d_rl06_history':    (KP, '_head_d.js', ['d06.js']),
  '07_d_rl07_rules':      (KP, '_head_d.js', ['d07.js']),
  '08_d_rl08_pf':         (KP, '_head_d.js', ['d08.js']),
  '09_t_rl01_768':        (K, '_head_d.js', ['d09.js']),
  '10_m_rl01_rl02_rl03':  (KM, '_head_m.js', ['m01.js']),
  '11_m_rl04_rl05':       (KM, '_head_m.js', ['m02.js']),
  '12_m_rl06_rl07_rl08':  (KM, '_head_m.js', ['m03.js']),
  '13_m_rl09':            (KM, '_head_m.js', ['m04.js']),
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
    print(name, len(full), 'syntax OK' if r.returncode == 0 else 'SYNTAX ERROR\n' + r.stderr[:800], '| mock:', (m.stdout or m.stderr).strip()[:500])
    if len(full) >= 50000: print('  !! OVER 50k')
if os.path.exists(os.path.join(D, 'out', '_chk.js')): os.remove(os.path.join(D, 'out', '_chk.js'))
