#!/usr/bin/env python3
# Loghi ufficiali (vettoriali) → PNG ad alta risoluzione per l'interfaccia e grafiche dell'arena 3D.
#   python3 scripts/brand/brand-assets.py CARTELLA_DEI_SORGENTI
# Sorgenti attesi nella cartella (nomi che contengono): «NittoATPFinals_Horizontal_OnDark_RGB.eps»,
# «NittoATPFinals_Horizontal_OnLight_RGB.eps» (pacchetto ufficiale del logo orizzontale, cartella Digital),
# «eSports-logo-NEG-rgb.pdf», «eSports-logo-POS-rgb.pdf». Servono ghostscript (gs) e pdftocairo.
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
    # righe vuote tra due righe di un logo: restituisce (riga sopra, riga sotto)
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
white, colour = crop(render(src('Horizontal_OnDark_RGB'), 600)), crop(render(src('Horizontal_OnLight_RGB'), 600))
neg, pos = crop(render(src('logo-NEG'), 600)), crop(render(src('logo-POS'), 600))

def parts(im):
    # il logo orizzontale si divide in tre blocchi separati da colonne vuote: «Nitto», «ATP», «FINALS»
    a = np.array(im)[:, :, 3]; cols = a.max(0) > 8
    gaps, run = [], None
    for x, c in enumerate(cols):
        if not c and run is None: run = x
        if c and run is not None: gaps.append((run, x)); run = None
    big = sorted(gaps, key=lambda g: g[1] - g[0], reverse=True)[:2]
    (a1, b1), (a2, b2) = sorted(big)
    return crop(im.crop((0, 0, a1, im.height))), crop(im.crop((b1, 0, a2, im.height))), crop(im.crop((b2, 0, im.width, im.height)))

def stacked(im):
    # versione impilata (come sui pannelli e sulla rete dell'arena): «Nitto» sopra, «ATP» grande, «FINALS» sotto a destra,
    # composta con i blocchi del logo ufficiale senza deformarli
    nitto, atp, finals = parts(im)
    W = atp.width; n = fit(nitto, W*.62, 10**6); f = fit(finals, W*.62, 10**6)
    gap = int(atp.height*.12); H = n.height + gap + atp.height + gap + f.height
    out = Image.new('RGBA', (W + int(W*.06), H), (0, 0, 0, 0))
    out.alpha_composite(n, (int(W*.30), 0)); out.alpha_composite(atp, (0, n.height + gap)); out.alpha_composite(f, (out.width - f.width, n.height + 2*gap + atp.height))
    return crop(out)

white_stack = stacked(white)
for name, im, w in [('nitto-atp-finals-white', white, 2400), ('nitto-atp-finals-colour', colour, 2400), ('nitto-atp-finals-stacked-white', white_stack, 1200),
                    ('esports-fitp-neg', neg, 1400), ('esports-fitp-pos', pos, 1400)]:
    save(fit(im, w, 10000), os.path.join(BRAND, name + '.png'))
for old in ['nitto-atp-finals-eseries-white', 'nitto-atp-finals-eseries-navy', 'nitto-atp-finals-eseries-colour']:
    if os.path.exists(os.path.join(BRAND, old + '.png')): os.remove(os.path.join(BRAND, old + '.png'))

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

def text_center(im, text, y, font, fill=(236, 240, 255, 255)):
    d = ImageDraw.Draw(im); b = d.textbbox((0, 0), text, font=font)
    d.text(((im.width - (b[2] - b[0]))/2 - b[0], y - (b[3] - b[1])/2 - b[1]), text, font=font, fill=fill)

def trophy(w, h):
    # coppa delle Finals stilizzata (argento): coppa, manici, stelo, base a due gradini
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    silver, shade, light = (214, 222, 236, 255), (150, 162, 186, 255), (250, 252, 255, 255)
    cx = w/2
    d.ellipse((cx - w*.34, h*.02, cx + w*.34, h*.14), fill=shade)                         # bocca
    d.polygon([(cx - w*.34, h*.08), (cx + w*.34, h*.08), (cx + w*.22, h*.42), (cx - w*.22, h*.42)], fill=silver)
    d.polygon([(cx - w*.10, h*.10), (cx - w*.02, h*.10), (cx - w*.08, h*.40), (cx - w*.14, h*.40)], fill=light)
    for s in (-1, 1):                                                                     # manici
        d.arc((cx + s*w*.26 - w*.16, h*.10, cx + s*w*.26 + w*.16, h*.36), 270 if s > 0 else 90, 90 if s > 0 else 270, fill=silver, width=max(3, int(w*.05)))
    d.polygon([(cx - w*.05, h*.42), (cx + w*.05, h*.42), (cx + w*.07, h*.66), (cx - w*.07, h*.66)], fill=shade)
    d.ellipse((cx - w*.16, h*.62, cx + w*.16, h*.70), fill=silver)
    d.rectangle((cx - w*.24, h*.70, cx + w*.24, h*.84), fill=(40, 46, 70, 255))            # base scura
    d.rectangle((cx - w*.30, h*.84, cx + w*.30, h*.96), fill=(30, 34, 56, 255))
    return im

A = lambda n: os.path.join(ARENA, n)
T = (0, 0, 0, 0)
# loghi stampati sul muro attorno al fuori campo (trasparenti: il muro blu sta sotto)
save(place(Image.new('RGBA', (2048, 210), T), white, 1024, 105, 2000, 196), A('nitto-atp-finals.png'))
save(place(Image.new('RGBA', (1024, 820), T), white_stack, 512, 410, 980, 784), A('logo-impilato.png'))
save(place(Image.new('RGBA', (1024, 530), T), neg, 512, 265, 1000, 516), A('esports.png'))
# logo ESPORTS sopra il maxischermo 2 × 0,52 m (trasparente)
save(place(Image.new('RGBA', (1024, 266), T), neg, 512, 133, 1000, 262), A('esports-piccolo.png'))
# fascia LED tra gli anelli e sotto il cubo (si ripete in orizzontale)
im = led_glow(gradient(2048, 202, (20, 60, 210), (8, 26, 120))); save(place(im, white, 1024, 101, 1500, 120), A('fascia-led.png'), rgb=True)
# pannelli LED negli angoli del muro (2,05 × 1,07 m) e facce del cubo (7 × 3,7 m): logo impilato
im = stripes(led_glow(gradient(1024, 536, (24, 70, 225), (8, 24, 120)))); save(place(im, white_stack, 512, 268, 520, 400), A('pannello-led.png'), rgb=True)
# maxischermo 5,8 × 3,39 m: fascia nera con il marchio, sotto «It all adds up to THIS»
W, H = 1600, 935
im = stripes(led_glow(gradient(W, H, (20, 56, 200), (6, 18, 96))))
ImageDraw.Draw(im).rectangle((0, 0, W, int(H*.19)), fill=(0, 0, 0, 255))
place(im, white, W/2, H*.095, W*.66, H*.12)
place(im, white_stack, W/2, H*.31, W*.10, H*.13)
text_center(im, 'It all adds up to', H*.5, serif(int(H*.08)))
text_center(im, 'THIS', H*.73, serif(int(H*.28)))
save(im, A('maxischermo.png'), rgb=True)
# stendardi 3,4 × 5,8 m: logo, motto e coppa
W, H = 600, 1024
im = stripes(led_glow(gradient(W, H, (18, 50, 190), (6, 16, 88))), n=2)
place(im, white_stack, W/2, H*.08, W*.28, H*.09)
text_center(im, 'It all adds up to', H*.18, serif(int(H*.04)))
text_center(im, 'THIS', H*.27, serif(int(H*.12)))
tr = trophy(int(W*.6), int(H*.52)); im.alpha_composite(tr, (int((W - tr.width)/2), int(H*.38)))
save(im, A('stendardo.png'), rgb=True)
# logo sulla rete vicino ai pali: impilato, come nei riferimenti (trasparente)
save(place(Image.new('RGBA', (1024, 820), T), white_stack, 512, 410, 1000, 800), A('rete-logo.png'))
