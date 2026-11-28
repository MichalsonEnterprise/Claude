# Assemble use_figma scripts for agent pub-04: helpers.js verbatim + lib + (tpl | frames) + data + main
import os, json
D = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(D, p)).read()
H = open(os.path.join(D, '..', '..', 'helpers.js')).read()
TPL = rd('tpl_id.txt').strip() if os.path.exists(os.path.join(D, 'tpl_id.txt')) else '__TPL__'
def data(keys): return 'const GD = {};\n' + '\n'.join(rd('data/%s.js' % {'gp':'gp','roulette':'roulette','crash':'crash','dice':'dice','coin':'coin','bj':'bj'}[k]) for k in keys)
B = {
  't1-template': H + rd('lib.js') + rd('tpl.js') + data(['roulette']) + rd('main-t1.js'),
  'd1-gp-roulette-crash': H + rd('lib.js') + rd('frames.js').replace('__TPL__', TPL) + data(['gp','roulette','crash']) + rd('main-d.js').replace('__KEYS__', json.dumps(['gp','roulette','crash'])),
  'd2-dice-coin-bj': H + rd('lib.js') + rd('frames.js').replace('__TPL__', TPL) + data(['dice','coin','bj']) + rd('main-d.js').replace('__KEYS__', json.dumps(['dice','coin','bj'])),
  'm1-gp-roulette-crash': H + rd('lib.js') + rd('frames.js').replace('__TPL__', TPL) + data(['gp','roulette','crash']) + rd('main-m.js').replace('__KEYS__', json.dumps(['gp','roulette','crash'])),
  'm2-dice-coin-bj': H + rd('lib.js') + rd('frames.js').replace('__TPL__', TPL) + data(['dice','coin','bj']) + rd('main-m.js').replace('__KEYS__', json.dumps(['dice','coin','bj'])),
}
for k, s in B.items():
    assert len(s) < 50000, (k, len(s))
    open(os.path.join(D, 'out', k + '.js'), 'w').write(s)
    print(k, len(s))
