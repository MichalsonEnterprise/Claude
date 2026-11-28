import sys, os
D = os.path.dirname(os.path.abspath(__file__))
helpers = open('/home/user/Claude/design/figma-build/helpers.js').read()
lib = open(os.path.join(D, 'lib.js')).read()
tail = """
const sc = Math.min(0.1, 1800 / Math.max(fs.width, fs.height));
await fs.screenshot({ scale: sc });
await tb.screenshot({ scale: 0.5 });
if (firstBox) await firstBox.screenshot({ scale: 1 });
return out;
"""
def build(spec, outname, page='11 — Prototypes', parent='PRO-01..05 Prototypes (P0)', px=0, py=0):
    s = open(os.path.join(D, spec)).read()
    l = lib.replace('__PAGE_NAME__', repr(page)).replace('__PARENT_NAME__', repr(parent)).replace('__PARENT_X__', str(px)).replace('__PARENT_Y__', str(py))
    code = helpers + '\n' + s + '\n' + l + '\n' + tail
    open(os.path.join(D, outname), 'w').write(code)
    print(outname, len(code))
if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) >= 2 and a[0].startswith('m'):
        build(a[0], a[1], '10 — Mobile Experience', 'PRO — Mobile', 245000, 0)
    else:
        build(a[0], a[1])
