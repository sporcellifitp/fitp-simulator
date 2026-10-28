#!/bin/sh
# uso: compare.sh <vista> <immagine di riferimento 1..5> [parametri extra]
SP=/tmp/claude-0/-home-user/c8835c2a-4028-5f23-9a24-8576dbe16a3d/scratchpad
NODE_PATH=$(npm root -g) WAIT=400 node shot.mjs "http://localhost:8765/public/arena-preview.html?v=$1$3" $SP/r_$1.png 1000 562 >/dev/null
python3 -c "
from PIL import Image
a=Image.open('/tmp/claude-0/-home-user/c8835c2a-4028-5f23-9a24-8576dbe16a3d/images/$2.webp').convert('RGB').resize((1000,562))
b=Image.open('$SP/r_$1.png').convert('RGB')
o=Image.new('RGB',(1000,1124)); o.paste(a,(0,0)); o.paste(b,(0,562)); o.save('$SP/cmp_$1.png')"
