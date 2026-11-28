#!/usr/bin/env python3
"""Combine several adm-bc screen bodies into ONE use_figma script (fewer MCP calls).
usage: python3 combine.py <outname> body1 body2 ...
- helpers.js pasted verbatim at the top (conventions §1)
- _lib.js (+ _mlib.js when a t-/m- body is included) tree-shaken to the chunks the bodies reference
- page switch + section lookup hoisted once (all bodies must target the same page)
- each body wrapped in its own block; its final `return X;` becomes `__R.push(X);`
- page 09: section shifted to x=72000 if still at 70000 (ADM-P section overlaps 70000..71720)
Writes out/<outname>.js and syntax-checks it with node."""
import os, re, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
helpers = open(os.path.join(here, '..', '..', 'helpers.js')).read()
full = '--full' in sys.argv
args = [a for a in sys.argv[1:] if a != '--full']
outname, bodies = args[0], args[1:]
need_m = any(b.startswith(('m-', 't-')) for b in bodies)
lib = open(os.path.join(here, '_lib.js')).read()
if need_m: lib += '\n' + open(os.path.join(here, '_mlib.js')).read()

START = re.compile(r'^(const |let |function |async function )')
chunks = []  # [names, text]
for line in lib.split('\n'):
    if line.startswith('//'): continue
    if START.match(line):
        m = re.match(r'^(?:async\s+)?function\s+(\w+)', line) or re.match(r'^(?:const|let)\s+(\w+)', line)
        names = [m.group(1)] if m else []
        chunks.append([names, line])
    elif chunks:
        chunks[-1][1] += '\n' + line
    elif line.strip():
        raise SystemExit('lib starts with non-declaration: ' + line[:80])

PAGE_RE = re.compile(r'^const PG = .*$', re.M)
SEC_RE = re.compile(r'^const sec = .*$', re.M)
page_line = sec_line = None
blocks = []
for b in bodies:
    src = open(os.path.join(here, b + '.js')).read()
    pl, sl = PAGE_RE.search(src), SEC_RE.search(src)
    if not pl and not sl:  # raw snippet (fix / verification block): inserted as its own block, no return handling
        blocks.append('// ---- snippet: ' + b + ' ----\n{\n' + src.rstrip() + '\n}'); continue
    if not pl or not sl: raise SystemExit(b + ': no PG/sec line')
    if page_line is None: page_line, sec_line = pl.group(0), sl.group(0)
    elif pl.group(0) != page_line: raise SystemExit(b + ': different page')
    src = PAGE_RE.sub('', src); src = SEC_RE.sub('', src)
    src = re.sub(r'^// ADM-P section.*\n', '', src, flags=re.M)
    src = re.sub(r'^if \(Math\.round\(sec\.x\) === 70000\).*\n', '', src, flags=re.M)
    src = re.sub(r'^for \(const (\w+) of made\) await \1\.screenshot\(.*\n', '', src, flags=re.M)  # clone shots: verified separately (5-image cap per call)
    lines = src.rstrip().split('\n')
    ri = [i for i, l in enumerate(lines) if l.startswith('return ')]
    if len(ri) != 1 or ri[0] != len(lines) - 1: raise SystemExit(b + ': expected exactly one final top-level return')
    last = lines[-1][len('return '):].rstrip()
    if last.endswith(';'): last = last[:-1]
    lines[-1] = '__R.push(' + last + ');'
    nm = re.search(r"^const NAME = '([^']+)';", '\n'.join(lines), re.M)
    if nm:  # idempotent: build only if the frame is missing
        blocks.append('// ---- body: ' + b + ' ----\nif (!sec.children.find(n => n.name === ' + repr(nm.group(1)) + ')) {\n' + '\n'.join(lines) + '\n} else __R.push({ skipped: ' + repr(nm.group(1)) + ' });')
    else:
        blocks.append('// ---- body: ' + b + ' ----\n{\n' + '\n'.join(lines) + '\n}')

body_text = '\n'.join(blocks)
kept = set(); text = body_text
changed = True
while changed:
    changed = False
    for i, (names, ctext) in enumerate(chunks):
        if i in kept or not names: continue
        if any(re.search(r'(?<![\w.])' + re.escape(n) + r'\b', text) for n in names):
            kept.add(i); text += '\n' + ctext; changed = True
if full: kept = set(range(len(chunks)))
lib_out = '\n'.join(chunks[i][1] for i in range(len(chunks)) if i in kept)
print('dropped:', [chunks[i][0][0] for i in range(len(chunks)) if i not in kept and chunks[i][0]])

shift = ''
if 'ADM-B1..B8' in sec_line:
    shift = 'if (Math.round(sec.x) === 70000) sec.x = 72000; // ADM-P section (56000, w 15720) overlaps 70000..71720\n'
code = (helpers + '\n// ===== ADM-BC LIB (tree-shaken) =====\n' + lib_out + '\n// ===== END LIB =====\n'
        + page_line + '\n' + sec_line + '\n' + shift + 'const __R = [];\n' + body_text + '\nreturn __R;\n')
os.makedirs(os.path.join(here, 'out'), exist_ok=True)
p = os.path.join(here, 'out', outname + '.js'); open(p, 'w').write(code)
chk = os.path.join(here, 'out', '.check.mjs'); open(chk, 'w').write('async function __x(){\n' + code + '\n}\n')
r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
print(f"{outname}: {len(code)} chars, lib chunks {len(kept)}/{sum(1 for c in chunks if c[0])} {'OK' if r.returncode == 0 else 'SYNTAX ERROR'}")
if r.returncode: print(r.stderr[:1500])
