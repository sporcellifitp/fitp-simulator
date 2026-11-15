#!/bin/bash
# mut.sh <file relativo a natpf-tennis> <python: vecchio> <python: nuovo> <test> [pattern]: applica, prova, ripristina
M=$(dirname $(readlink -f $0))/mut/natpf-tennis; F=$M/$1
cp $F $F.orig
python3 - "$F" "$2" "$3" <<'PY'
import sys
p, a, b = sys.argv[1:4]
s = open(p).read()
assert s.count(a) == 1, 'vecchio non trovato una volta: ' + a
open(p, 'w').write(s.replace(a, b))
PY
cd $M && node --import ./test/register.mjs --test ${5:+--test-name-pattern="$5"} $4 2>&1 | grep -E "^# (pass|fail)|^not ok|  error:" | head -12
mv $F.orig $F
