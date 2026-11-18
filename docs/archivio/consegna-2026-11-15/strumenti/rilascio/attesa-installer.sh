#!/bin/bash
# attesa-installer.sh <versione> <cartella>: aspetta che l'installer di <versione> sia su R2 e lo verifica dal link fisso
V=$1; D=${2:-.}; B=https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev/windows; mkdir -p "$D"
for i in $(seq 1 120); do
  curl -sS -m 30 "$B/latest.json?v=$(date +%s)" -o "$D/latest.json" 2>/dev/null
  if grep -q "\"build\": \"$V\"" "$D/latest.json" 2>/dev/null; then break; fi
  sleep 30
done
grep -q "\"build\": \"$V\"" "$D/latest.json" || { echo "TEMPO SCADUTO: latest.json non dice $V"; exit 1; }
SHA=$(python3 -c "import json,sys;print(json.load(open('$D/latest.json'))['sha256'])"); SIZE=$(python3 -c "import json;print(json.load(open('$D/latest.json'))['size'])")
echo "latest.json: $V, $SIZE B, sha256 $SHA"
for i in $(seq 1 40); do
  curl -sS -m 600 "$B/NATPF-Simulator-Setup.exe?v=$(date +%s)" -o "$D/setup.exe" 2>/dev/null
  GOT=$(sha256sum "$D/setup.exe" | cut -c1-64); N=$(stat -c %s "$D/setup.exe")
  if [ "$GOT" = "$SHA" ]; then echo "VERIFICATO: link fisso = $V, $N B, sha256 $GOT"; rm -f "$D/setup.exe"; exit 0; fi
  echo "link fisso non ancora aggiornato ($N B, $GOT)"; sleep 30
done
echo "TEMPO SCADUTO: il link fisso non dà l'installer $V"; exit 1
