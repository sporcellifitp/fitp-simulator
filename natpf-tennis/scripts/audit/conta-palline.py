# Verifica dell'intro (docs/PIANO_LAVORI.md, B2): quante palline gialle ci sono in ogni fotogramma di un video.
#   python3 -I natpf-tennis/scripts/audit/conta-palline.py <video.mp4> [larghezza=640]
# Estrae i fotogrammi con ffmpeg (ridotti a <larghezza>), cerca le componenti connesse di pixel giallo-verdi (palla da
# tennis) e stampa i fotogrammi con almeno una pallina e quanti ne hanno due o più. Uscita 1 se un fotogramma ne ha 2+.
import os, subprocess, sys, tempfile
from PIL import Image

def is_ball(r, g, b): return r > 140 and g > 160 and b < 120 and g - b > 80 and abs(r - g) < 90

def comps(path, min_px=3):
    im = Image.open(path).convert('RGB'); W, H = im.size; px = im.load()
    seen = bytearray(W*H); out = []
    for y in range(H):
        for x in range(W):
            i = y*W + x
            if seen[i] or not is_ball(*px[x, y]): continue
            st = [(x, y)]; seen[i] = 1; n = sx = sy = 0
            while st:
                cx, cy = st.pop(); n += 1; sx += cx; sy += cy
                for nx, ny in ((cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)):
                    j = ny*W + nx
                    if 0 <= nx < W and 0 <= ny < H and not seen[j] and is_ball(*px[nx, ny]): seen[j] = 1; st.append((nx, ny))
            if n >= min_px: out.append((n, sx//n, sy//n))
    # pezzi della stessa pallina (riflesso, sfocatura di movimento) a meno di 12 px: una pallina sola
    merged = []
    for c in sorted(out, reverse=True):
        if all(abs(c[1] - m[1]) > 12 or abs(c[2] - m[2]) > 12 for m in merged): merged.append(c)
    return merged

def main():
    video = sys.argv[1]; width = int(sys.argv[2]) if len(sys.argv) > 2 else 640
    fps = float(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', video]).decode().strip().split('/')[0])
    with tempfile.TemporaryDirectory() as d:
        subprocess.check_call(['ffmpeg', '-v', 'error', '-i', video, '-vf', f'scale={width}:-2', os.path.join(d, 'f_%04d.png')])
        names = sorted(n for n in os.listdir(d) if n.endswith('.png'))
        many = 0
        for k, name in enumerate(names):
            c = comps(os.path.join(d, name))
            if c: print(f'{k/fps:5.2f}s palline={len(c)} ' + ' '.join(f'[{n}px@{x},{y}]' for n, x, y in c))
            if len(c) >= 2: many += 1
        print(f'fotogrammi: {len(names)} · con 2+ palline: {many}')
        sys.exit(1 if many else 0)

if __name__ == '__main__': main()
