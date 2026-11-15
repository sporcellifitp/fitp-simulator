#!/bin/bash
# versione.sh <vecchia> <nuova> "<novità>": quattro file di versione sul checkout principale
O=$1; N=$2; T=$3; cd /home/user/foro-italico-world
sed -i "s/NATPF_BUILD = '$O'/NATPF_BUILD = '$N'/" site/js/tennis/version.js
sed -i "s/\"version\": \"$O\"/\"version\": \"$N\"/" site/tennis/build.json
sed -i "1s/$O/$N/" natpf-tennis/lan/LEGGIMI.txt
printf '%s\n' "$N: $T" >> natpf-desktop/novita.txt
grep -n "$N" site/js/tennis/version.js site/tennis/build.json; head -1 natpf-tennis/lan/LEGGIMI.txt; tail -1 natpf-desktop/novita.txt | cut -c1-120
