import subprocess, os, sys
D = os.path.dirname(os.path.abspath(__file__))
H = open('/home/user/Claude/design/figma-build/helpers.js').read()
if not H.endswith('\n'): H += '\n'
K = open(os.path.join(D, 'kit.js')).read()
def build(out, parts):
    src = H + K
    if len(parts) == 1:
        src += open(os.path.join(D, parts[0])).read()
    else:
        res = []
        for i, p in enumerate(parts):
            body = open(os.path.join(D, p)).read()
            # strip final return + screenshot lines so several frames can share a call
            lines = [l for l in body.split('\n') if not l.startswith('return {') and not l.startswith('await S.f.screenshot')]
            src += 'async function part%d() {\n%s\nreturn { frame: S.f.id, name: S.f.name, h: Math.round(S.f.height) };\n}\n' % (i, '\n'.join(lines))
        src += 'const results = [];\n' + ''.join('results.push(await part%d());\n' % i for i in range(len(parts)))
        src += "for (const r of results) { const n = await figma.getNodeByIdAsync(r.frame); await n.screenshot({ scale: 0.5 }); }\nreturn { section: sec.id, results };\n"
    p = os.path.join(D, '..', 'out', out); open(p, 'w').write(src)
    chk = "const src=require('fs').readFileSync(process.argv[1],'utf8');try{new Function('figma','return (async()=>{'+src+'})');console.log(process.argv[1].split('/').pop(),src.length,'ok')}catch(e){console.log('ERR',e.message)}"
    print(subprocess.run(['node', '-e', chk, p], capture_output=True, text=True).stdout.strip())
if __name__ == '__main__':
    build('01_g1_mobile.js', ['m_g1.js'])
    if os.path.exists(os.path.join(D, 'm_g7d.js')): build('02_g7_mobile_default_empty.js', ['m_g7d.js', 'm_g7e.js'])
    if os.path.exists(os.path.join(D, 'm_g2f.js')): build('03_g2_filters_g6_export_mobile.js', ['m_g2f.js', 'm_g6x.js'])
