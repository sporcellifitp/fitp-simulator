# Adatta le GIF delle mascotte (fondo bianco pieno) alla card di fine partita: fondo trasparente, bordo morbido,
# ombra sotto i piedi resa come ombra scura semitrasparente. Esce WebP animato (alfa a 8 bit), stesse misure,
# stessi fotogrammi e stessa durata. B58, 16/11/2026 (docs/b58/mascotte-fine-partita.md). Serve Pillow con numpy.
# Uso: python3 -I docs/b58/fondo-trasparente.py <cartella_gif> <cartella_uscita> [qualita, di base 88]
# Le GIF di partenza sono nel commit 9d48127 (natpf-tennis/public/media/mascotte/*.gif).
import sys, os, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
Q = int(sys.argv[3]) if len(sys.argv) > 3 else 88
os.makedirs(OUT, exist_ok=True)

def region_from_border(cand):
    """pixel candidati collegati al bordo (riempimento dal bordo sulla maschera)"""
    h, w = cand.shape
    m = Image.fromarray(np.where(cand, 255, 0).astype(np.uint8)).convert('L').copy()
    for x in range(w):
        for y in (0, h - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    for y in range(h):
        for x in (0, w - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    return np.asarray(m) == 128

def pockets(mask, min_area):
    """componenti della maschera con almeno min_area pixel"""
    m = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8)).convert('L').copy()
    keep = np.zeros(mask.shape, bool)
    while True:
        ys, xs = np.nonzero(np.asarray(m) == 255)
        if not len(ys): break
        ImageDraw.floodfill(m, (int(xs[0]), int(ys[0])), 100)
        c = np.asarray(m) == 100
        if c.sum() >= min_area: keep |= c
        m.paste(50, mask=Image.fromarray((c * 255).astype(np.uint8)).convert('L'))
    return keep

def yellow_pockets(mask, a, min_area):
    """Lob: sacche chiare circondate dal giallo del peluche (tra braccia alzate e testa); gli occhi (dentro gli
    occhiali scuri) e la scritta (sulla visiera blu) non hanno il giallo intorno e restano"""
    yellow = (a[..., 0] >= 180) & (a[..., 1] >= 140) & (a[..., 2] <= 120)
    m = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8)).convert('L').copy()
    keep = np.zeros(mask.shape, bool)
    while True:
        ys, xs = np.nonzero(np.asarray(m) == 255)
        if not len(ys): break
        ImageDraw.floodfill(m, (int(xs[0]), int(ys[0])), 100)
        c = np.asarray(m) == 100
        if c.sum() >= min_area:
            around = dilate(c, 2) & ~c & ~mask
            if around.sum() and yellow[around].mean() >= 0.6: keep |= c
        m.paste(50, mask=Image.fromarray((c * 255).astype(np.uint8)).convert('L'))
    return keep

def dilate(mask, r):
    im = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8)).convert('L').filter(ImageFilter.MaxFilter(2 * r + 1))
    return np.asarray(im) > 0

def frame_rgba(rgb, white_pockets_from=0.72):
    a = rgb.astype(np.float32)
    h, w, _ = a.shape
    mn, mx = a.min(axis=2), a.max(axis=2)
    chroma = mx - mn
    # fondo: bianco quasi puro collegato al bordo
    white = (mn >= 244) & (chroma <= 12)
    # ombra: grigi chiari poco saturi nella fascia bassa, collegati al fondo
    rows = np.arange(h)[:, None] * np.ones((1, w))
    shadow_cand = (chroma <= 20) & (mn >= 120) & (rows >= 0.80 * h)
    # colore esatto del fondo (il più frequente): il riempimento dal bordo passa solo da lì e dall'ombra, così non
    # entra nelle parti bianche del peluche (fascia e polsini di Drop) che toccano il fondo
    cols, cnt = np.unique(rgb.reshape(-1, 3), axis=0, return_counts=True)
    bgcol = cols[np.argmax(cnt)].astype(np.float32)
    exact_all = np.abs(a - bgcol).max(axis=2) <= 1
    # cornice di 3 px dell'immagine: alcune GIF hanno una riga chiara sul bordo, non del colore esatto
    edge = np.zeros((h, w), bool); edge[:3, :] = edge[-3:, :] = True; edge[:, :3] = edge[:, -3:] = True
    exact_all |= edge & (mn >= 200) & (chroma <= 20)
    bg = region_from_border(exact_all | shadow_cand)
    # sacche di fondo chiuse (tra le gambe, sotto le braccia): componenti del colore esatto del fondo, non piccole
    exact = exact_all & ~bg
    bg |= pockets(exact & (rows >= 0.45 * h), 8) | pockets(exact, 40)
    # tra i piedi: anche bianchi non esatti (sfumati verso l'ombra), solo nella fascia dei piedi
    # (Lob: da meta figura in giu, sotto occhi e scritta; Drop: solo i piedi, sopra ci sono fascia e polsini bianchi)
    light = (mn >= 228) & (chroma <= 16)
    bg |= pockets(light & ~bg & (rows >= white_pockets_from * h), 8)
    if white_pockets_from < 0.5:
        bg |= yellow_pockets(light & ~bg, a, 8)
        # zone chiare retinate (la GIF mescola punti bianchi e gialli dove c'era il fondo, tra testa e braccia alzate):
        # densita dei punti chiari su 7x7; le zone dense con il giallo intorno diventano fondo
        dens = np.asarray(Image.fromarray((light & ~bg).astype(np.uint8) * 255).convert('L').filter(ImageFilter.BoxBlur(3))) / 255.0
        bg |= yellow_pockets((dens >= 0.30) & ~bg, a, 12) & ((dens >= 0.45) | light)
        # punti chiari rimasti vicino al fondo (entro 6 px) e lontani da visiera blu e occhiali scuri: fondo
        blue_dark = ((a[..., 2] > a[..., 0] + 40) | (mx < 90))
        bg |= light & ~bg & dilate(bg, 6) & ~dilate(blue_dark, 3)
    # anello di bordo (2 px dal fondo): miscele colore + bianco e aloni chiari della GIF
    ring = (dilate(bg, 2) & ~bg & (chroma > 22)) | (dilate(bg, 3) & ~bg & (mn >= 215) & (chroma <= 22))
    # «colore ad alfa» dal bianco (come in GIMP): alfa = scarto massimo dal bianco
    alpha_c2a = np.clip((255 - mn) / 255.0, 0, 1)
    alpha = np.ones((h, w), np.float32)
    alpha[bg] = alpha_c2a[bg]
    alpha[ring] = alpha_c2a[ring]
    # fondo quasi bianco: trasparente del tutto (niente velo)
    alpha[bg & white & (mn >= 250)] = 0
    # velo quasi invisibile (alfa sotto 20/255) sul fondo e sul bordo: via del tutto. In 4 GIF di Lob il fondo non era
    # bianco pieno (248-249) e restava un velo sul 60 % dell'immagine, visibile come riquadro sul fondo della card
    alpha[(bg | ring) & (alpha < 20 / 255)] = 0
    a_safe = np.maximum(alpha, 1e-3)[..., None]
    col = np.clip((a - 255 * (1 - alpha[..., None])) / a_safe, 0, 255)
    keep = ~(bg | ring)
    col[keep] = a[keep]
    out = np.dstack([col, alpha * 255]).round().astype(np.uint8)
    return out

for f in sorted(glob.glob(os.path.join(SRC, '*.gif'))):
    im = Image.open(f)
    frames, durs = [], []
    i = 0
    while True:
        try: im.seek(i)
        except EOFError: break
        wp = 0.45 if os.path.basename(f).startswith('lob-') else 0.72
        frames.append(Image.fromarray(frame_rgba(np.asarray(im.convert('RGB')), wp)))
        durs.append(im.info.get('duration', 160)); i += 1
    name = os.path.splitext(os.path.basename(f))[0] + '.webp'
    dst = os.path.join(OUT, name)
    frames[0].save(dst, save_all=True, append_images=frames[1:], duration=durs, loop=0, quality=Q, alpha_quality=100, method=6, lossless=False)
    print(name, len(frames), sum(durs), os.path.getsize(dst))
