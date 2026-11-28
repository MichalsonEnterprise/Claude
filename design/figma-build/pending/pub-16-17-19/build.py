# Assemble use_figma scripts for slice pub-legal (PUB-16/17/19): helpers.js verbatim + lib + shots + (tpl | frames) + data + main
import os, json, sys
D = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(D, p)).read()
H = open(os.path.join(D, '..', '..', 'helpers.js')).read()
TPL = rd('tpl_id.txt').strip() if os.path.exists(os.path.join(D, 'tpl_id.txt')) else '__TPL__'
def data(keys): return '\n'.join(rd('data/%s.js' % k) for k in keys)
B = {'t1-template': H + rd('lib.js') + rd('shots.js') + rd('tpl.js') + data(['terms']) + rd('main-t1.js')}
GROUPS = {'terms': ['terms'], 'privacy': ['privacy'], 'aml': ['aml'], 'privacy-aml': ['privacy', 'aml']}
for g, keys in GROUPS.items():
    if os.path.exists(os.path.join(D, 'frames.js')):
        L = ', '.join('D_' + k for k in keys)
        B['d-' + g] = H + rd('lib.js') + rd('shots.js') + rd('frames.js').replace('__TPL__', TPL) + data(keys) + rd('main-d.js').replace('__KEY__', L)
        B['m-' + g] = H + rd('lib.js') + rd('shots.js') + rd('frames.js').replace('__TPL__', TPL) + data(keys) + rd('main-m.js').replace('__KEY__', L)
if os.path.exists(os.path.join(D, 'main-mx.js')):
    B['mx-terms'] = H + rd('lib.js') + rd('shots.js') + rd('frames.js').replace('__TPL__', TPL) + data(['terms']) + rd('main-mx.js').replace('__KEY__', 'D_terms')
for k, s in B.items():
    assert len(s) < 50000, (k, len(s))
    open(os.path.join(D, 'out', k + '.js'), 'w').write(s)
    print(k, len(s))
