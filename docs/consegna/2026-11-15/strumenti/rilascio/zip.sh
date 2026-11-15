#!/bin/bash
# zip Cloudflare della versione $1, provato estratto (porta 4205)
V=$1; S=/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad; D=$S/v${V//[-.]/}; D=$S/rilascio-$V
rm -rf $D; mkdir -p $D/zip $D/estratto
cd /home/user/foro-italico-world/natpf-tennis && node scripts/pacchetto-cloudflare.mjs --out=$D/cf --zip=$D/zip/natpf-simulator-cloudflare-$V.zip --turn-url=https://natpf-turn.s-porcelli.workers.dev/ 2>&1 | tail -4
ls $D/cf/natpf/registro.json 2>/dev/null && echo "ATTENZIONE: registro.json nel pacchetto"
cd $D/estratto && unzip -q $D/zip/natpf-simulator-cloudflare-$V.zip
(python3 -m http.server 4205 --bind 127.0.0.1 > $D/http.log 2>&1 &); sleep 1
echo "versione servita: $(curl -sS http://127.0.0.1:4205/natpf/js/tennis/version.js | grep -o "20[0-9-]*\.[0-9]*" | head -1)"
sed 's/127.0.0.1:3218/127.0.0.1:4205/' $S/cf14-browser.mjs > $D/cf-browser.mjs
cd $D && timeout 300 node cf-browser.mjs $D/shots 2>&1 | tail -14 | cut -c1-220
pkill -f "http.server 4205"
ls -l $D/zip/; sha256sum $D/zip/*.zip
