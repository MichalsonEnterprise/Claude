#!/usr/bin/env python3
"""Assemble use_figma scripts for slice usr-account: helpers.js + kits + builders + calls. Output: out/<name>.js (each < 50,000 chars)."""
import os, subprocess, sys
B = os.path.dirname(os.path.abspath(__file__)); S = B + '/src/'; O = B + '/out/'
H = open('/home/user/Claude/design/figma-build/helpers.js').read()
if not H.endswith('\n'): H += '\n'
KC = open(S + 'kit_core.js').read(); KD = open(S + 'kit_d.js').read()
KM = open(S + 'kit_m.js').read() if os.path.exists(S + 'kit_m.js') else ''
DESK = "const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);\nconst sec = section('USR-A1..A10 Account & security', 24000, 0);\n"
MOB = "const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);\nconst sec = section('USR — Mobile C', 105000, 0);\nconst existing = sec.children.map(c => c.name + ' | ' + c.id + ' | ' + Math.round(c.width) + 'x' + Math.round(c.height));\n"
def build(name, mobile, files, calls):
    src = H + KC + (KM if mobile else KD) + (MOB if mobile else DESK)
    for f in files: src += open(S + f).read() + '\n'
    src += "const results = [];\n" + ''.join("results.push(await %s);\n" % c for c in calls)
    src += "return { section: sec.id, results, log: LOG" + (", existing" if mobile else "") + " };\n"
    open(O + name, 'w').write(src)
    chk = O + '.chk.js'; open(chk, 'w').write('async function __main(figma){\n' + src + '\n}\n')
    r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
    os.remove(chk)
    print('%-22s %6d chars  %s' % (name, len(src), 'OK' if r.returncode == 0 and len(src) < 50000 else 'FAIL ' + r.stderr[:400]))
if __name__ == '__main__':
    open(O + 'P0_probe.js', 'w').write(open(S + 'probe.js').read())
    build('D1_a1.js', False, ['d_a1.js'], ["a1('Edit')", "a1('Saved')"])
    build('D2_a2_a3.js', False, ['d_a2.js', 'd_a3.js'], ["a2()", "a3('Enabled')"])
    build('D3_a3_states.js', False, ['d_a3.js'], ["a3('Off')", "a3('Disable')", "a3('Reset')"])
    build('D4_a4_kyc.js', False, ['d_a4.js'], ["a4('Not started')", "a4('Pending')", "a4('Approved')", "a4('Rejected')", "a4('Expired')"])
    build('D5_a5_a6.js', False, ['d_a5.js', 'd_a6.js'], ["a5()", "a6()"])
    build('D6_a7_a8.js', False, ['d_a7.js', 'd_a8.js'], ["a7('Default')", "a7('Revoke')", "a8('Default')", "a8('End all')"])
    build('D7_a9_a10.js', False, ['d_a9.js', 'd_a10.js'], ["a9()", "a10()"])
    if KM:
        # earlier run already built mobile A1 Edit, A2, A3 Manage (On) + Enable (page 10, 'USR — Mobile C' 34:484195)
        build('M1_a7_a8.js', True, ['m_a7.js', 'm_a8.js'], ["ma7('Default')", "ma7('Revoke')", "ma8('Default')", "ma8('End all')"])
        build('M2_a3d_a4_a5.js', True, ['m_a3.js', 'm_a4.js', 'm_a5.js'], ["ma3d()", "ma4('Approved')", "ma4('Rejected')", "ma5()"])
        build('M3_a6_a9_a10.js', True, ['m_a6.js', 'm_a9.js', 'm_a10.js'], ["ma6()", "ma9()", "ma10()"])
