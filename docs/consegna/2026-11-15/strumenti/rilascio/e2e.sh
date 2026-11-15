#!/bin/bash
S=/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad
OUT=$S/v1403b; LOG=$OUT/e2e.log; R=/home/user/foro-italico-world
export CHROMIUM_PATH=/opt/pw-browsers/chromium
cd $R/tools/e2e
p=4160
for t in "$@"; do
  echo "$(date -u +%T) inizio $t (load $(cut -d' ' -f1 /proc/loadavg))" >> $LOG
  if [ $t = natpf-telecomando ]; then flock $S/telecomando.lock env GAME_PORT=$p PEER_PORT=$((p+1)) OUT=$OUT/e2e/$t timeout 1500 node $t.mjs > $OUT/e2e/$t.txt 2>&1; rc=$?
  else GAME_PORT=$p PEER_PORT=$((p+1)) OUT=$OUT/e2e/$t timeout 1500 node $t.mjs > $OUT/e2e/$t.txt 2>&1; rc=$?; fi
  echo "$(date -u +%T) fine $t EXIT $rc · $(grep -o '[0-9]*/[0-9]* verifiche superate' $OUT/e2e/$t.txt | tail -1)" >> $LOG
  p=$((p+2))
done
echo "$(date -u +%T) GRUPPO FINITO: $*" >> $LOG
