import os, subprocess
S='/home/user/Claude/design/figma-build/queue/usr-rg/src/'
O='/tmp/claude-0/-home-user-Claude/9871ef23-c9a5-595d-9e67-3ed608c9a6bf/scratchpad/rg/'
H=open('/home/user/Claude/design/figma-build/helpers.js').read()
if not H.endswith('\n'): H+='\n'
KD=open(S+'kit.js').read(); KC=open(S+'kit_core.js').read(); KM=open(S+'kitm.js').read()
DESK_HEAD="const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);\nconst sec = section('USR-RG1..RG7 Responsible gaming', 60000, 0);\n"
MOB_HEAD=open(S+'m_head.js').read()
def body(fn, extra=''):
    out=[]
    for l in open(S+fn).read().split('\n'):
        if l.startswith("const page = figma.root") or l.startswith("const sec = section(") or l.startswith("const STEP = __STEP__;"): continue
        l=l.replace("const STATE = '__STATE__';","")
        out.append(l)
    return '\n'.join(out)+extra
R1="\nreturn { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };"
def build(outname, mobile, parts, calls):
    src=H+(KC+KM if mobile else KD)+(MOB_HEAD if mobile else DESK_HEAD)
    for (nm,fn,param,extra) in parts: src+="async function %s(%s) {\n%s\n}\n"%(nm,param or '',body(fn,extra))
    src+="const results = [];\n"+''.join("results.push(await %s);\n"%c for c in calls)+"return { section: sec.id, results };\n"
    open(O+outname,'w').write(src)
    print(subprocess.run(['node',S+'check.js',O+outname],capture_output=True,text=True).stdout.strip())
build('X1_rg1_rg2.js',False,[('b1','rg1_body.js',None,R1),('b2','rg2.js','STATE','')],["b1()","b2('Default')","b2('Pending increase')"])
build('X2_rg3_4_5.js',False,[('b3','rg3.js',None,''),('b4','rg4.js',None,''),('b5','rg5.js',None,''),('b5p','rg5p.js',None,'')],["b3()","b4()","b5()","b5p()"])
build('X3_rg6.js',False,[('b6','rg6.js','STATE','')],["b6('Default')","b6('Confirm')","b6('Active')"])
build('X4_rg7.js',False,[('b7','rg7.js','STEP','')],["b7(1)","b7(2)","b7(3)","b7(4)"])
build('X5_m1_5.js',True,[('m1','m1.js',None,''),('m2','m2.js','STATE',''),('m3','m3.js',None,''),('m4','m4.js',None,''),('m5','m5.js',None,''),('m5p','m5p.js',None,'')],["m1()","m2('Default')","m2('Pending increase')","m3()","m4()","m5()","m5p()"])
build('X6_m6_7.js',True,[('m6','m6.js','STATE',''),('m7','m7.js','STEP','')],["m6('Default')","m6('Confirm')","m6('Active')","m7(1)","m7(2)","m7(3)","m7(4)"])
