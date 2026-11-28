# Assemble use_figma scripts: helpers.js (verbatim) + mlib.js + <name>.body.js -> out/<name>.js
import os, glob, subprocess, json
here = os.path.dirname(os.path.abspath(__file__))
helpers = open(os.path.join(here, '..', '..', 'helpers.js')).read()
mlib = open(os.path.join(here, 'mlib.js')).read()
os.makedirs(os.path.join(here, 'out'), exist_ok=True)
for b in sorted(glob.glob(os.path.join(here, '*.body.js'))):
    name = os.path.basename(b).replace('.body.js', '')
    pre = '' if name.startswith('d') else mlib  # desktop fix scripts (d*) bring their own prelude
    code = helpers + '\n' + pre + '\n' + open(b).read()
    out = os.path.join(here, 'out', name + '.js')
    open(out, 'w').write(code)
    chk = subprocess.run(['node', '-e', 'const fs=require("fs");const AF=Object.getPrototypeOf(async function(){}).constructor;new AF(fs.readFileSync(process.argv[1],"utf8"));', out], capture_output=True, text=True)
    print(name, len(code), 'OK' if chk.returncode == 0 else 'SYNTAX ERROR ' + chk.stderr[-400:])
