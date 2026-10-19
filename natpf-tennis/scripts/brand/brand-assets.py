#!/usr/bin/env python3
# Loghi ufficiali (vettoriali) → PNG ad alta risoluzione per l'interfaccia e grafiche dell'arena 3D.
#   python3 scripts/brand/brand-assets.py CARTELLA_DEI_SORGENTI
# Sorgenti attesi nella cartella (nomi che contengono): «Nitto-ATP-Finals-eSeries-White.eps», «…-Navy.eps»,
# «…-Full-Colour.eps», «eSports-logo-NEG-rgb.pdf», «eSports-logo-POS-rgb.pdf». Servono ghostscript (gs) e pdftocairo.
# Scrive site/assets/brand/*.png (loghi ritagliati con trasparenza) e site/assets/arena/*.png (supporti dell'arena,
# con le proporzioni dei pannelli 3D di site/js/tennis/arena.js: il logo non si deforma).
import glob, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
BRAND, ARENA = os.path.join(ROOT, 'site/assets/brand'), os.path.join(ROOT, 'site/assets/arena')
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'

def src(key):
    hit = [f for f in glob.glob(os.path.join(SRC, '*')) if key.lower() in os.path.basename(f).lower()]
    if not hit: sys.exit(f'manca il sorgente «{key}» in {SRC}')
    return hit[0]

def render(path, dpi):
    out = os.path.join(tempfile.mkdtemp(), 'r.png')
    if path.lower().endswith('.pdf'):
        subprocess.run(['pdftocairo', '-png', '-r', str(dpi), '-transp', '-singlefile', path, out[:-4]], check=True)
    else:
        subprocess.run(['gs', '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=pngalpha', f'-r{dpi}', f'-sOutputFile={out}', path], check=True)
    return Image.open(out).convert('RGBA')

def crop(im, pad=0, min_row=0):
    a = np.array(im)[:, :, 3]; a[:min_row] = 0
    rows, cols = np.where(a.max(1) > 8)[0], np.where(a.max(0) > 8)[0]
    return im.crop((max(0, cols.min() - pad), max(0, rows.min() - pad), cols.max() + 1 + pad, rows.max() + 1 + pad))

def split_rows(im):
    # righe vuote tra marchio e «eSERIES»: restituisce (marchio, eSERIES)
    a = np.array(im)[:, :, 3]; empty = [r for r in range(im.height) if a[r].max() <= 8]
    gap = [r for r in empty if 0 < r < im.height - 1]
    top_end = gap[0]; bottom_start = gap[-1] + 1
    return crop(im.crop((0, 0, im.width, top_end))), crop(im.crop((0, bottom_start, im.width, im.height)))

def fit(im, w, h):
    k = min(w/im.width, h/im.height)
    return im.resize((max(1, round(im.width*k)), max(1, round(im.height*k))), Image.LANCZOS)

def save(im, path, rgb=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    (im.convert('RGB') if rgb else im).save(path, optimize=True)
    print(os.path.relpath(path, ROOT), im.size)

# ---------- loghi ----------
white, navy = crop(render(src('eSeries-White'), 200)), crop(render(src('eSeries-Navy'), 200))
colour = crop(render(src('Full-Colour'), 120), min_row=200)        # il file a colori ha un segno isolato in alto
neg, pos = crop(render(src('logo-NEG'), 600)), crop(render(src('logo-POS'), 600))
white_mark, _ = split_rows(white)
for name, im, w in [('nitto-atp-finals-eseries-white', white, 2400), ('nitto-atp-finals-eseries-navy', navy, 2400),
                    ('nitto-atp-finals-eseries-colour', colour, 2400), ('nitto-atp-finals-white', white_mark, 2400),
                    ('esports-fitp-neg', neg, 1400), ('esports-fitp-pos', pos, 1400)]:
    save(fit(im, w, 10000), os.path.join(BRAND, name + '.png'))

# ---------- supporti dell'arena ----------
NAVY_TOP, NAVY_BOTTOM = (16, 38, 140), (6, 18, 92)

def gradient(w, h, top, bottom, alpha=255):
    t = np.linspace(0, 1, h)[:, None]
    arr = np.zeros((h, w, 4), np.uint8)
    for i in range(3): arr[:, :, i] = (top[i]*(1 - t) + bottom[i]*t).astype(np.uint8)
    arr[:, :, 3] = alpha
    return Image.fromarray(arr, 'RGBA')

def place(bg, logo, cx, cy, w, h):
    l = fit(logo, w, h); bg.alpha_composite(l, (round(cx - l.width/2), round(cy - l.height/2))); return bg

def stripes(im, color=(40, 200, 255), n=3):
    # strisce diagonali azzurre sui lati, come i pannelli LED dell'arena
    d = ImageDraw.Draw(im, 'RGBA'); W, H = im.size
    for side in (0, 1):
        for i in range(n):
            x0 = (i*W*.025 + W*.01) if side == 0 else (W - W*.01 - i*W*.025)
            dx = H*.35*(1 if side == 0 else -1)
            d.polygon([(x0, 0), (x0 + W*.012*(1 if side == 0 else -1), 0), (x0 + W*.012*(1 if side == 0 else -1) + dx, H), (x0 + dx, H)], fill=color + (150 - i*35,))
    return im

def led_glow(im):
    # leggera luminosità centrale (schermo LED)
    W, H = im.size; g = Image.new('L', (W, H), 0); ImageDraw.Draw(g).ellipse((W*.15, -H*.4, W*.85, H*1.2), fill=70)
    g = g.filter(ImageFilter.GaussianBlur(H*.3)); light = Image.new('RGBA', (W, H), (90, 160, 255, 0)); light.putalpha(g)
    im.alpha_composite(light); return im

def serif(size, bold=False):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSerif%s.ttf' % ('-Bold' if bold else ''), '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, size)
    return ImageFont.load_default()

A = lambda n: os.path.join(ARENA, n)
# tabelloni laterali 7,6 × 1 m
im = gradient(2048, 270, NAVY_TOP, NAVY_BOTTOM); save(place(im, white, 1024, 135, 1700, 200), A('nitto-atp-finals.png'), rgb=True)
# tabellone di fondo 13,2 × 1 m: ESPORTS · Nitto ATP FINALS eSERIES · ESPORTS
im = gradient(4096, 310, NAVY_TOP, NAVY_BOTTOM)
place(im, white, 2048, 155, 2000, 228); place(im, neg, 560, 155, 700, 290); place(im, neg, 4096 - 560, 155, 700, 290)
save(im, A('tabellone-fondo.png'), rgb=True)
# loghi ESPORTS sui tabelloni laterali 2 × 1 m
im = gradient(1024, 512, NAVY_TOP, NAVY_BOTTOM); save(place(im, neg, 512, 256, 940, 470), A('esports.png'), rgb=True)
# logo ESPORTS sopra il maxischermo 2 × 0,52 m (trasparente)
save(place(Image.new('RGBA', (1024, 266), (0, 0, 0, 0)), neg, 512, 133, 1000, 262), A('esports-piccolo.png'))
# fascia LED tra gli anelli e sotto il cubo (si ripete in orizzontale)
im = led_glow(gradient(2048, 202, (20, 60, 210), (8, 26, 120))); save(place(im, white, 1024, 101, 1300, 150), A('fascia-led.png'), rgb=True)
# pannelli LED 2,05 × 1,07 m e facce del cubo 7 × 3,7 m
im = stripes(led_glow(gradient(1024, 536, (24, 70, 225), (8, 24, 120)))); save(place(im, white, 512, 268, 760, 300), A('pannello-led.png'), rgb=True)
# maxischermo 5,8 × 3,39 m: fascia nera con il marchio, sotto «It all adds up to THIS»
W, H = 1600, 935
im = stripes(led_glow(gradient(W, H, (20, 56, 200), (6, 18, 96))))
ImageDraw.Draw(im).rectangle((0, 0, W, int(H*.19)), fill=(0, 0, 0, 255))
place(im, white_mark, W/2, H*.095, W*.62, H*.13)
place(im, white, W/2, H*.3, W*.28, H*.09)
d = ImageDraw.Draw(im)
for text, y, f in [('It all adds up to', H*.47, serif(int(H*.085))), ('THIS', H*.71, serif(int(H*.29)))]:
    b = d.textbbox((0, 0), text, font=f); d.text(((W - (b[2] - b[0]))/2 - b[0], y - (b[3] - b[1])/2 - b[1]), text, font=f, fill=(236, 240, 255, 255))
save(im, A('maxischermo.png'), rgb=True)
# stendardi 3,4 × 5,8 m
W, H = 600, 1024
im = led_glow(gradient(W, H, (18, 50, 190), (6, 16, 88)))
place(im, white, W/2, H*.14, W*.82, H*.14)
d = ImageDraw.Draw(im)
for text, y, f in [('It all adds up to', H*.42, serif(int(H*.045))), ('THIS', H*.53, serif(int(H*.13)))]:
    b = d.textbbox((0, 0), text, font=f); d.text(((W - (b[2] - b[0]))/2 - b[0], y - (b[3] - b[1])/2 - b[1]), text, font=f, fill=(236, 240, 255, 255))
place(im, neg, W/2, H*.8, W*.75, H*.24)
save(im, A('stendardo.png'), rgb=True)
# logo sulla rete (trasparente, proporzioni del logo: il piano 3D le segue)
save(place(Image.new('RGBA', (2048, 330), (0, 0, 0, 0)), white, 1024, 165, 2000, 318), A('rete-logo.png'))
