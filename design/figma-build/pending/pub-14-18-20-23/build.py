import os
d=os.path.dirname(os.path.abspath(__file__))
h=open(os.path.join(d,'../../helpers.js')).read()
pre=open(os.path.join(d,'prelude-m.js')).read()
for b in ['m1-faq.js','m2-rg.js','m3-restricted.js','m4-cookie.js']:
    s=h+'\n'+pre+'\n'+open(os.path.join(d,b)).read()
    open(os.path.join(d,'out',b),'w').write(s)
    print(b,len(s))
