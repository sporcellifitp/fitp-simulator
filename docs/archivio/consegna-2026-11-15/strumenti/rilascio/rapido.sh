#!/bin/bash
# controllo rapido sul checkout principale: gioco, sito, desktop, LAN, build → $1 (file di uscita)
OUT=${1:-/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/rilascio/rapido.txt}
cd /home/user/foro-italico-world
{ echo "== inizio $(date -u +%H:%M:%S)"
  echo "== gioco"; (cd natpf-tennis && npm test 2>&1 | grep -E '^# (tests|pass|fail)|^not ok')
  echo "== sito"; node --test tools/test/*.test.mjs 2>&1 | grep -E '^# (tests|pass|fail)|^not ok'
  echo "== desktop"; (cd natpf-desktop && npm test 2>&1 | grep -E '^# (tests|pass|fail)|^not ok')
  echo "== lan"; (cd tools/lan && node --test test/*.test.mjs 2>&1 | grep -E '^# (tests|pass|fail)|^not ok')
  echo "== build"; (cd natpf-tennis && npm run build 2>&1 | tail -1)
  echo "== FINE $(date -u +%H:%M:%S)"; } > "$OUT" 2>&1
