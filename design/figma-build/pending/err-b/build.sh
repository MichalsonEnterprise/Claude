#!/bin/bash
# Assemble use_figma scripts: helpers.js + lib.js (+ mlib.js for mobile) + body
cd "$(dirname "$0")"
H=../../helpers.js
for f in b04 b05 b06 b07; do [ -f $f.js ] && cat $H lib.js $f.js > out/$f.js; done
for f in m1 m2 m3; do [ -f $f.js ] && cat $H lib-m.js mlib.js $f.js > out/$f.js; done
wc -c out/*.js
