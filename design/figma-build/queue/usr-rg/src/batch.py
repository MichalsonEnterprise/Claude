import subprocess
H = open('/home/user/Claude/design/figma-build/helpers.js').read()
if not H.endswith('\n'): H += '\n'
KD = open(__import__('os').path.join(__import__('os').path.dirname(__file__),'kit.js')).read(); KC = open('kit_core.js').read(); KM = open('kitm.js').read()
DESK_HEAD = "const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);\nconst sec = section('USR-RG1..RG7 Responsible gaming', 60000, 0);\n"
MOB_HEAD = open('m_head.js').read()
def body(fn):
    out = []
    for l in open(fn).read().split('\n'):
        if l.startswith("const page = figma.root") or l.startswith("const sec = section(") or l.startswith("const STEP = __STEP__;"): continue
        l = l.replace("const STATE = '__STATE__';", "")
        out.append(l)
    return '\n'.join(out)
def build(outname, mobile, parts, calls):
    src = H + (KC + KM if mobile else KD) + (MOB_HEAD if mobile else DESK_HEAD)
    for (nm, fn, param) in parts: src += "async function %s(%s) {\n%s\n}\n" % (nm, param or '', body(fn))
    src += "const results = [];\n" + ''.join("results.push(await %s);\n" % c for c in calls) + "return { section: sec.id, results };\n"
    open(outname, 'w').write(src)
    print(subprocess.run(['node', 'check.js', outname], capture_output=True, text=True).stdout.strip())
src = H + KD + DESK_HEAD + body('rg1_body.js') + '\n' + open('disc_block.js').read()
open('B_A_rg1.js','w').write(src); print(subprocess.run(['node', 'check.js', 'B_A_rg1.js'], capture_output=True, text=True).stdout.strip())
build('B_B_rg2.js', False, [('b2','rg2.js','STATE')], ["b2('Default')", "b2('Pending increase')"])
build('B_C_rg3_4.js', False, [('b3','rg3.js',None), ('b4','rg4.js',None)], ["b3()", "b4()"])
build('B_D_rg5.js', False, [('b5','rg5.js',None), ('b5p','rg5p.js',None)], ["b5()", "b5p()"])
build('B_E_rg6.js', False, [('b6','rg6.js','STATE')], ["b6('Default')", "b6('Confirm')", "b6('Active')"])
build('B_F_rg7.js', False, [('b7','rg7.js','STEP')], ["b7(1)", "b7(2)", "b7(3)", "b7(4)"])
build('B_G_m1_2.js', True, [('m1','m1.js',None), ('m2','m2.js','STATE')], ["m1()", "m2('Default')", "m2('Pending increase')"])
build('B_H_m3_4_5.js', True, [('m3','m3.js',None), ('m4','m4.js',None), ('m5','m5.js',None)], ["m3()", "m4()", "m5()"])
build('B_I_m5p_6.js', True, [('m5p','m5p.js',None), ('m6','m6.js','STATE')], ["m5p()", "m6('Default')", "m6('Confirm')", "m6('Active')"])
build('B_J_m7.js', True, [('m7','m7.js','STEP')], ["m7(1)", "m7(2)", "m7(3)", "m7(4)"])
