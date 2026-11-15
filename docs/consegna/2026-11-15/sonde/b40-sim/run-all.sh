#!/bin/bash
# B40 (analisi): tutte le partite simulate per le soglie dei trofei. Uscita in sim/out/*.jsonl, tempi in sim/out/run.log
B=/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b40
cd $B/wt/natpf-tennis
run(){ # profilo livello game seme partite
  nice -n 10 node --import ./test/register.mjs $B/sim/trofei-sim.mjs --profile=$1 --level=$2 --games=$3 --seed=$4 --matches=$5 >> $B/sim/out/g$3-$1-$2.jsonl 2>> $B/sim/out/run.log
}
echo "inizio $(date -u +%H:%M:%S) carico $(cut -d' ' -f1-3 /proc/loadavg)" >> $B/sim/out/run.log
for seed in 7 31; do
  for c in "bambino bambini" "bambino casual" "bambino evento" "principiante bambini" "principiante casual" "principiante evento" \
           "umano casual" "umano evento" "umano pro" "amatore casual" "amatore evento" "medioTel evento" "medioTel pro" \
           "tennista evento" "tennista pro" "tennista leggenda" "umano leggenda" "principiante pro"; do
    run $c 1 $seed 200
  done
done
for c in "bambino bambini" "principiante evento" "umano evento" "tennista pro"; do run $c 2 11 200; done
echo "fine $(date -u +%H:%M:%S) carico $(cut -d' ' -f1-3 /proc/loadavg)" >> $B/sim/out/run.log
