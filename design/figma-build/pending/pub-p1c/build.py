# Assemble use_figma scripts: helpers.js (verbatim) + lib-d.js|lib-m.js + art.js + <name>.body.js -> out/<name>.js
import os, glob, subprocess
here = os.path.dirname(os.path.abspath(__file__))
helpers = open(os.path.join(here, '..', '..', 'helpers.js')).read()
art = open(os.path.join(here, 'art.js')).read()
for b in sorted(glob.glob(os.path.join(here, '*.body.js'))):
    name = os.path.basename(b).replace('.body.js', '')
    lib = open(os.path.join(here, 'lib-d.js' if name.startswith('d') else 'lib-m.js')).read()
    code = helpers + '\n' + lib + '\n' + art + '\n' + open(b).read()
    out = os.path.join(here, 'out', name + '.js')
    open(out, 'w').write(code)
    chk = subprocess.run(['node', os.path.join(here, 'mock.cjs'), out], capture_output=True, text=True)
    print(name, len(code), (chk.stdout + chk.stderr).strip()[:300])
