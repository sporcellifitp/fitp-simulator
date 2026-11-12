#!/usr/bin/env python3
# B29 · Alleggerisce i modelli 3D di Lob e di Drop per il gioco. Strumento di sviluppo: NON fa parte del gioco e non
# aggiunge dipendenze al gioco. Vuole Python 3 con numpy e Pillow (con il WebP).
#
#   python3 natpf-tennis/scripts/mascotte-modelli.py --sorgente CARTELLA [--uscita natpf-tennis/public/media]
#           [--lato 1024] [--formato webp|jpeg] [--qualita 80] [--fogli CARTELLA]
#
# CARTELLA contiene drop.glb e lob.glb come sono usciti dal generatore (circa 3 MB l'uno: una mesh con pelle di circa
# 8.200 triangoli, una texture JPEG 2048 × 2048 di 2,2 MB, 24 ossa, una clip di 0,03 s che non serve).
# Scrive mascotte-drop.glb e mascotte-lob.glb, che il gioco carica solo con «Personaggi: Lob & Drop»
# (src/natpf/natpf_mascot_models.js). Cosa fa:
#   · texture ridotta a --lato punti e salvata in WebP (estensione EXT_texture_webp: la decodifica il browser);
#   · via le tangenti (il gioco non usa mappe di rilievo) e via la clip;
#   · attributi compatti con KHR_mesh_quantization, che three.js legge senza decodificatori: posizioni a 16 bit,
#     normali a 8 bit, coordinate della texture a 16 bit, ossa e pesi a 8 bit (24 byte per vertice invece di 64);
#     la scala delle posizioni è messa nelle matrici inverse delle ossa, come vuole lo standard per le mesh con pelle;
#   · vertici uguali uniti, triangoli vuoti tolti;
#   · scheletro in metri (la scala 0,01 dell'armatura è riportata nelle ossa), stessi 24 nomi;
#   · SOLO per Drop: nella texture il marchio sul petto era scritto «Nittto», con tre t. Qui si corregge in «Nitto»
#     (vedi correggi_nitto). Con --fogli si salva il foglio con il prima e il dopo (nitto-prima-dopo.webp).
# Niente Draco né meshopt: chiederebbero un decodificatore nel gioco.
import argparse, io, json, os, struct, sys
import numpy as np
from PIL import Image

NOMI = ('drop', 'lob')
OSSA = ('Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'head_end', 'headfront',
        'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
        'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase')
TIPI = {5120: 'i1', 5121: 'u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}
NUM = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def leggi_glb(percorso):
    b = open(percorso, 'rb').read()
    magic, _, lung = struct.unpack('<III', b[:12])
    if magic != 0x46546C67: raise SystemExit(f'{percorso}: non è un GLB')
    pos, pezzi = 12, []
    while pos < lung:
        n, tipo = struct.unpack('<II', b[pos:pos + 8]); pezzi.append(b[pos + 8:pos + 8 + n]); pos += 8 + n
    return json.loads(pezzi[0]), pezzi[1]


def accessore(j, dati, i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
    n = NUM[a['type']]; t = np.dtype(TIPI[a['componentType']])
    inizio = v.get('byteOffset', 0) + a.get('byteOffset', 0); passo = v.get('byteStride') or t.itemsize*n
    if passo == t.itemsize*n:
        out = np.frombuffer(dati, t, a['count']*n, inizio).reshape(a['count'], n)
    else:
        out = np.stack([np.frombuffer(dati, t, n, inizio + k*passo) for k in range(a['count'])])
    return out.copy()


def immagine(j, dati):
    v = j['bufferViews'][j['images'][0]['bufferView']]
    return Image.open(io.BytesIO(dati[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])).convert('RGB')


# ---------------------------------------------------------------------------------------------------------------
# Disegno di triangoli da un'immagine a un'altra (serve a correggere il marchio): per ogni triangolo, i punti di
# arrivo (dst, in punti dell'immagine di arrivo) prendono il colore dai punti di partenza (src).
def campiona(img, x, y):
    h, w = img.shape[:2]
    x = np.clip(x, 0, w - 1.001); y = np.clip(y, 0, h - 1.001)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
    return (img[y0, x0]*(1 - fx)*(1 - fy) + img[y0, x0 + 1]*fx*(1 - fy) + img[y0 + 1, x0]*(1 - fx)*fy + img[y0 + 1, x0 + 1]*fx*fy)


def disegna(arrivo, dst, src, partenza, z=None, zbuf=None, bordo=0.0, filtro=None):
    h, w = arrivo.shape[:2]
    for t in range(len(dst)):
        (x0, y0), (x1, y1), (x2, y2) = dst[t]
        area = (x1 - x0)*(y2 - y0) - (x2 - x0)*(y1 - y0)
        if abs(area) < 1e-9: continue
        xa, xb = int(max(0, np.floor(min(x0, x1, x2) - bordo))), int(min(w - 1, np.ceil(max(x0, x1, x2) + bordo)))
        ya, yb = int(max(0, np.floor(min(y0, y1, y2) - bordo))), int(min(h - 1, np.ceil(max(y0, y1, y2) + bordo)))
        if xb < xa or yb < ya: continue
        gx, gy = np.meshgrid(np.arange(xa, xb + 1), np.arange(ya, yb + 1))
        px = gx.ravel() + 0.5; py = gy.ravel() + 0.5
        b1 = ((px - x0)*(y2 - y0) - (x2 - x0)*(py - y0))/area
        b2 = ((x1 - x0)*(py - y0) - (px - x0)*(y1 - y0))/area
        b0 = 1 - b1 - b2
        # bordo: quanti punti fuori dal triangolo si disegnano lo stesso (per non lasciare righe tra i pezzi)
        lato = max(1e-6, np.sqrt(abs(area)))
        e = bordo/lato
        dentro = (b0 >= -e) & (b1 >= -e) & (b2 >= -e)
        if not dentro.any(): continue
        b0, b1, b2 = b0[dentro], b1[dentro], b2[dentro]; ix = gx.ravel()[dentro]; iy = gy.ravel()[dentro]
        sx = b0*src[t, 0, 0] + b1*src[t, 1, 0] + b2*src[t, 2, 0]
        sy = b0*src[t, 0, 1] + b1*src[t, 1, 1] + b2*src[t, 2, 1]
        if zbuf is not None:
            zz = b0*z[t, 0] + b1*z[t, 1] + b2*z[t, 2]
            davanti = zz > zbuf[iy, ix]
            ix, iy, sx, sy, zz = ix[davanti], iy[davanti], sx[davanti], sy[davanti], zz[davanti]
            zbuf[iy, ix] = zz
        if filtro is not None:
            tieni = campiona(filtro, sx - 0.5, sy - 0.5)[:, 0] > 0.5
            ix, iy, sx, sy = ix[tieni], iy[tieni], sx[tieni], sy[tieni]
        if len(ix): arrivo[iy, ix] = campiona(partenza, sx - 0.5, sy - 0.5)


# Marchio sul petto di Drop: «Nittto» → «Nitto». La texture è fatta di tanti pezzetti sparsi, quindi non si può
# ritoccare come un'immagine normale. Si fa in tre passi:
#   1. si disegna il petto visto da davanti (proiezione piatta dei triangoli che guardano avanti);
#   2. in quella vista si toglie la terza «t»: la parte della scritta a destra del taglio (la «o») scorre a sinistra
#      di una lettera, lungo l'inclinazione del corsivo, e il vuoto si riempie con il blu del petto;
#   3. si riporta nella texture solo la zona ritoccata.
# Le misure del taglio sono in metri sul modello (alto 1 m) e sono state prese guardando la vista da davanti.
NITTO = dict(
    riquadro=(-0.17, 0.16, 0.40, 0.62),      # x0, x1, y0, y1 del petto da disegnare (metri)
    punti_al_metro=3000,
    parola=(0.5015, 0.5355),                 # y sotto e sopra della parola «Nittto»
    taglio=(0.0240, 0.0443),                 # x (alla base della parola) dove comincia e finisce la terza «t»
    fine=0.0857,                             # x (alla base) dove finisce la zona che scorre (oltre la «o», sul blu)
    sfuma=0.0083,                            # ultimi metri della zona: si torna piano al disegno di prima
    pendenza=0.2,                            # corsivo: di quanto x cresce per ogni metro di y
)


def correggi_nitto(tex, pos, uv, idx, par=NITTO):
    x0, x1, y0, y1 = par['riquadro']; k = par['punti_al_metro']
    W, H = int(round((x1 - x0)*k)), int(round((y1 - y0)*k))
    T = np.asarray(tex, dtype=np.float32); th, tw = T.shape[:2]
    tri = idx.reshape(-1, 3)
    p = pos[tri]                                           # n, 3, 3
    n = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0]); n /= np.maximum(1e-12, np.linalg.norm(n, axis=1))[:, None]
    c = p.mean(axis=1)
    scelti = (n[:, 2] > 0.15) & (c[:, 0] > x0 - 0.02) & (c[:, 0] < x1 + 0.02) & (c[:, 1] > y0 - 0.02) & (c[:, 1] < y1 + 0.02) & (c[:, 2] > 0)
    p = p[scelti]; t_uv = uv[tri][scelti]
    vista = np.stack([(p[:, :, 0] - x0)*k, (y1 - p[:, :, 1])*k], axis=2)        # punti della vista da davanti
    atl = np.stack([t_uv[:, :, 0]*tw, t_uv[:, :, 1]*th], axis=2)                 # punti della texture
    davanti = np.zeros((H, W, 3), np.float32); davanti[:] = T.reshape(-1, 3).mean(axis=0)
    zbuf = np.full((H, W), -1e9, np.float32)
    disegna(davanti, vista, atl, T, z=p[:, :, 2], zbuf=zbuf, bordo=0.6)
    prima = davanti.copy()
    # il taglio: per ogni riga della parola, i punti tra «taglio[0]» e «fine» prendono il colore da una lettera più a
    # destra (oltre la «o» c'è il blu del petto: scorre anche quello); negli ultimi punti si sfuma nel disegno di prima
    ya, yb = par['parola']; ta, tb = par['taglio']; larghezza = (tb - ta)*k; sfuma = par['sfuma']*k
    maschera = np.zeros((H, W, 1), np.float32)
    xs = np.arange(W)
    for r in range(int((y1 - yb)*k), int((y1 - ya)*k) + 1):
        y = y1 - (r + 0.5)/k; sposta = (y - ya)*par['pendenza']*k
        a = (ta - x0)*k + sposta; f = (par['fine'] - x0)*k + sposta
        dentro = (xs + 0.5 >= a) & (xs + 0.5 < f)
        da = xs[dentro] + larghezza
        nuovo = campiona(prima, da, np.full(len(da), float(r)))
        t = np.clip((xs[dentro] + 0.5 - (f - sfuma))/sfuma, 0, 1)[:, None]
        davanti[r, dentro] = nuovo*(1 - t) + prima[r, dentro]*t
        maschera[r, dentro] = 1
    # nella texture torna solo la zona ritoccata (con un filo di margine)
    larga = np.zeros_like(maschera)
    m = maschera[:, :, 0]
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            larga[:, :, 0] = np.maximum(larga[:, :, 0], np.roll(np.roll(m, dy, axis=0), dx, axis=1))
    out = T.copy()
    disegna(out, atl, vista, davanti, bordo=1.2, filtro=larga)
    dopo = np.zeros((H, W, 3), np.float32); dopo[:] = prima.reshape(-1, 3).mean(axis=0)
    zbuf[:] = -1e9
    disegna(dopo, vista, atl, out, z=p[:, :, 2], zbuf=zbuf, bordo=0.6)
    img = lambda a: Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8))
    return img(out), img(prima), img(dopo)


# Foglio «prima e dopo» del marchio sul petto di Drop (vista da davanti, come esce da correggi_nitto)
def foglio_nitto(prima, dopo):
    from PIL import ImageDraw, ImageFont
    taglio = (200, 215, 860, 560)                           # la zona del marchio nella vista da davanti
    a, b = prima.crop(taglio), dopo.crop(taglio)
    w, h = a.size; bordo, testa = 10, 34
    foglio = Image.new('RGB', (2*w + 3*bordo, h + testa + 2*bordo), (16, 19, 28))
    penna = ImageDraw.Draw(foglio)
    try: font = ImageFont.load_default(20)
    except TypeError: font = ImageFont.load_default()
    for k, (img, testo) in enumerate(((a, 'Prima: la texture del generatore, con tre t'), (b, 'Dopo: corretta, come sui peluche'))):
        x = bordo + k*(w + bordo)
        penna.text((x + 2, bordo + 4), testo, fill=(223, 230, 245), font=font)
        foglio.paste(img, (x, bordo + testa))
    return foglio


# ---------------------------------------------------------------------------------------------------------------
def pesi_a_8_bit(w):
    w = np.maximum(w, 0); w = w/np.maximum(1e-12, w.sum(axis=1))[:, None]
    q = np.floor(w*255 + 0.5).astype(np.int32)
    q[np.arange(len(q)), np.argmax(q, axis=1)] += 255 - q.sum(axis=1)     # la somma fa sempre 255
    return np.clip(q, 0, 255).astype(np.uint8)


# Pesi delle gambe. Il generatore ha messo lo scheletro di una persona dentro un peluche con le gambe cortissime: il
# «ginocchio» (osso …Leg) cade dove la gamba esce dal corpo, la «coscia» (…UpLeg) resta dentro la pancia, e gamba e
# piede sono legati un po' al ginocchio, un po' alla coscia e un po' a caviglia e punta. Così il piede non seguirebbe
# mai del tutto un osso solo e non starebbe fermo sul campo. Qui, per ogni lato: sotto l'attacco della gamba tutto il
# peso delle quattro ossa della gamba va all'osso …Leg (gamba e piede diventano un pezzo solo, che il gioco muove
# intorno all'attacco); sopra resta alla coscia, che il gioco lascia ferma con il bacino; in mezzo si sfuma.
# Gli altri pesi (testa, busto, braccia, mani) restano quelli del generatore.
def ritocca_gambe(pos, ossa, pesi, nomi, dove):
    n = len(pos); pieno = np.zeros((n, len(nomi)))
    for c in range(4): np.add.at(pieno, (np.arange(n), ossa[:, c]), pesi[:, c])
    for lato in ('Left', 'Right'):
        k = [nomi.index(lato + x) for x in ('UpLeg', 'Leg', 'Foot', 'ToeBase')]
        attacco = dove[lato + 'Leg'][1]                         # altezza dell'attacco della gamba
        tot = pieno[:, k].sum(axis=1)
        t = np.clip((pos[:, 1] - 0.55*attacco)/(1.05*attacco - 0.55*attacco), 0, 1); f = t*t*(3 - 2*t)
        pieno[:, k] = 0
        pieno[:, k[0]] = tot*f; pieno[:, k[1]] = tot*(1 - f)
    ordine = np.argsort(-pieno, axis=1)[:, :4]
    w = np.take_along_axis(pieno, ordine, axis=1)
    w = w/np.maximum(1e-12, w.sum(axis=1))[:, None]
    return ordine.astype(np.uint8), w


def matrice(nodo):
    if 'matrix' in nodo: return np.array(nodo['matrix'], np.float64).reshape(4, 4).T
    t = nodo.get('translation', [0, 0, 0]); x, y, z, w = nodo.get('rotation', [0, 0, 0, 1]); s = nodo.get('scale', [1, 1, 1])
    r = np.array([[1 - 2*(y*y + z*z), 2*(x*y - z*w), 2*(x*z + y*w)], [2*(x*y + z*w), 1 - 2*(x*x + z*z), 2*(y*z - x*w)], [2*(x*z - y*w), 2*(y*z + x*w), 1 - 2*(x*x + y*y)]])
    m = np.eye(4); m[:3, :3] = r*np.array(s); m[:3, 3] = t
    return m


def arrotonda(v, cifre=6):
    return [0.0 if abs(x) < 10**-cifre else round(float(x), cifre) for x in v]


def alleggerisci(nome, sorgente, lato, formato, qualita, fogli=None):
    j, dati = leggi_glb(sorgente)
    prim = j['meshes'][0]['primitives'][0]; A = prim['attributes']
    pos = accessore(j, dati, A['POSITION']).astype(np.float64); nor = accessore(j, dati, A['NORMAL']).astype(np.float64)
    uv = accessore(j, dati, A['TEXCOORD_0']).astype(np.float64)
    ossa = accessore(j, dati, A['JOINTS_0']).astype(np.uint8); pesi = accessore(j, dati, A['WEIGHTS_0']).astype(np.float64)
    idx = accessore(j, dati, prim['indices']).astype(np.int64).ravel()
    skin = j['skins'][0]; ibm = accessore(j, dati, skin['inverseBindMatrices']).astype(np.float64).reshape(-1, 4, 4).transpose(0, 2, 1)
    nomi_ossa = [j['nodes'][i]['name'] for i in skin['joints']]
    if sorted(nomi_ossa) != sorted(OSSA): raise SystemExit(f'{nome}: ossa inattese {nomi_ossa}')
    if uv.min() < 0 or uv.max() > 1: raise SystemExit(f'{nome}: coordinate della texture fuori da 0..1')

    tex = immagine(j, dati)
    if nome == 'drop':
        tex, prima, dopo = correggi_nitto(tex, pos, uv, idx)
        if fogli:
            os.makedirs(fogli, exist_ok=True)
            foglio_nitto(prima, dopo).save(os.path.join(fogli, 'nitto-prima-dopo.webp'), 'WEBP', quality=88, method=6)
    if tex.size != (lato, lato): tex = tex.resize((lato, lato), Image.LANCZOS)
    buf = io.BytesIO()
    if formato == 'webp': tex.save(buf, 'WEBP', quality=qualita, method=6)
    else: tex.save(buf, 'JPEG', quality=qualita, optimize=True, progressive=True, subsampling=0)
    img = buf.getvalue()

    # posizioni a 16 bit: p = q/32767 * mezzo + centro (la matrice D finisce nelle inverse delle ossa)
    lo, hi = pos.min(axis=0), pos.max(axis=0); centro = (lo + hi)/2; mezzo = np.maximum((hi - lo)/2, 1e-9)
    qp = np.round((pos - centro)/mezzo*32767).astype(np.int16)
    nor = nor/np.maximum(1e-12, np.linalg.norm(nor, axis=1))[:, None]
    qn = np.round(nor*127).astype(np.int8)
    qt = np.round(uv*65535).astype(np.uint16)
    # scheletro in metri: la scala dell'armatura (0,01) va nelle traslazioni delle ossa e nelle matrici inverse
    radice = next(i for i, n in enumerate(j['nodes']) if n.get('name') == 'Armature')
    scala = j['nodes'][radice].get('scale', [1, 1, 1])
    if abs(scala[0] - scala[1]) > 1e-9 or abs(scala[0] - scala[2]) > 1e-9: raise SystemExit(f'{nome}: scala dell\'armatura non uniforme')
    s = scala[0]
    mondo = {}
    def visita(i, genitore):
        n = j['nodes'][i]; m = matrice(n)
        if i != radice: m[:3, 3] *= s
        else: m = np.eye(4)
        mondo[i] = genitore @ m
        for c in n.get('children', []): visita(c, mondo[i])
    visita(radice, np.eye(4))
    dove = {n: mondo[skin['joints'][k]][:3, 3] for k, n in enumerate(nomi_ossa)}
    ossa, pesi = ritocca_gambe(pos, ossa, pesi, nomi_ossa, dove)
    # forma della testa nel sistema dell'osso Head (per natpf_mascot_rig.js: la racchetta non la deve attraversare)
    kt = nomi_ossa.index('Head'); della_testa = ((ossa == kt)*pesi).sum(axis=1) > 0.9
    loc = (np.linalg.inv(mondo[skin['joints'][kt]]) @ np.concatenate([pos[della_testa], np.ones((della_testa.sum(), 1))], axis=1).T).T[:, :3]
    a1, a2 = np.percentile(loc, 1.5, axis=0), np.percentile(loc, 98.5, axis=0)
    testa = dict(centro=arrotonda((a1 + a2)/2, 3), semiassi=arrotonda((a2 - a1)/2, 3), minimo=arrotonda(loc.min(axis=0), 3), massimo=arrotonda(loc.max(axis=0), 3))
    qw = pesi_a_8_bit(pesi)
    ossa = np.where(qw > 0, ossa, 0).astype(np.uint8)
    # un vertice = 24 byte: posizione (6 + 2), normale (3 + 1), texture (4), ossa (4), pesi (4)
    V = np.zeros(len(pos), dtype=[('p', '<i2', 3), ('p_', '<i2'), ('n', 'i1', 3), ('n_', 'i1'), ('t', '<u2', 2), ('j', 'u1', 4), ('w', 'u1', 4)])
    V['p'], V['n'], V['t'], V['j'], V['w'] = qp, qn, qt, ossa, qw
    grezzi = V.view([('tutto', 'V24')])['tutto']
    unici, primo, inverso = np.unique(grezzi, return_index=True, return_inverse=True)
    ordine = np.argsort(primo); rango = np.empty(len(ordine), np.int64); rango[ordine] = np.arange(len(ordine))
    V = V[primo[ordine]]; idx = rango[inverso.ravel()][idx]
    tri = idx.reshape(-1, 3)
    tri = tri[(tri[:, 0] != tri[:, 1]) & (tri[:, 1] != tri[:, 2]) & (tri[:, 0] != tri[:, 2])]
    if len(V) > 65535: raise SystemExit(f'{nome}: troppi vertici per indici a 16 bit')
    indici = tri.astype('<u2').tobytes()

    D = np.eye(4); D[:3, :3] = np.diag(mezzo); D[:3, 3] = centro
    S = np.diag([s, s, s, 1.0])
    ibm2 = np.stack([S @ m @ D for m in ibm])
    # controllo: con le ossa a riposo ogni vertice deve tornare dov'era
    skinM = np.stack([mondo[b] @ ibm2[k] for k, b in enumerate(skin['joints'])])
    qh = np.concatenate([V['p'].astype(np.float64)/32767, np.ones((len(V), 1))], axis=1)
    w = V['w'].astype(np.float64)/255
    rip = sum(np.einsum('nij,nj->ni', skinM[V['j'][:, c]], qh)*w[:, c:c + 1] for c in range(4))[:, :3]
    atteso = V['p'].astype(np.float64)/32767*mezzo + centro
    errore = float(np.abs(rip - atteso).max())
    if errore > 2e-4: raise SystemExit(f'{nome}: pelle non coerente dopo la conversione ({errore:.6f} m)')

    # nodi: armatura, mesh, 24 ossa (stessi nomi, stessa gerarchia)
    vecchi = [radice] + [c for c in j['nodes'][radice]['children']]
    ordine_nodi = []
    def raccogli(i):
        ordine_nodi.append(i)
        for c in j['nodes'][i].get('children', []): raccogli(c)
    raccogli(radice)
    nuovo = {v: k for k, v in enumerate(ordine_nodi)}
    nodi = []
    for i in ordine_nodi:
        n = j['nodes'][i]; o = {'name': n.get('name', f'nodo{i}')}
        if i == radice: pass
        elif 'mesh' in n: o['mesh'] = 0; o['skin'] = 0
        else:
            o['translation'] = arrotonda(np.array(n.get('translation', [0, 0, 0]))*s)
            o['rotation'] = arrotonda(n.get('rotation', [0, 0, 0, 1]))
            sc = n.get('scale', [1, 1, 1])
            if max(abs(x - 1) for x in sc) > 1e-5: o['scale'] = arrotonda(sc)
        if n.get('children'): o['children'] = [nuovo[c] for c in n['children']]
        nodi.append(o)
    _ = vecchi

    def allinea(b, riempi=b'\0'): return b + riempi*((4 - len(b) % 4) % 4)
    vertici = V.tobytes(); ibmB = ibm2.transpose(0, 2, 1).astype('<f4').tobytes()
    parti = [allinea(vertici), allinea(indici), allinea(ibmB), allinea(img)]
    inizi = np.cumsum([0] + [len(x) for x in parti])
    nV = len(V)
    estensioni = ['KHR_mesh_quantization'] + (['EXT_texture_webp'] if formato == 'webp' else [])
    texture = {'sampler': 0, 'extensions': {'EXT_texture_webp': {'source': 0}}} if formato == 'webp' else {'sampler': 0, 'source': 0}
    out = {
        'asset': {'version': '2.0', 'generator': 'NATPF mascotte-modelli.py'},
        'extensionsUsed': estensioni, 'extensionsRequired': estensioni,
        'scene': 0, 'scenes': [{'name': 'Mascotte', 'nodes': [0]}], 'nodes': nodi,
        'meshes': [{'name': nome, 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2, 'JOINTS_0': 3, 'WEIGHTS_0': 4}, 'indices': 5, 'material': 0}]}],
        'materials': [{'name': f'mascotte-{nome}', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 0.9}, 'doubleSided': True}],
        'textures': [texture], 'images': [{'bufferView': 3, 'mimeType': 'image/webp' if formato == 'webp' else 'image/jpeg'}],
        'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
        'skins': [{'name': 'Armatura', 'inverseBindMatrices': 6, 'joints': [nuovo[b] for b in skin['joints']], 'skeleton': nuovo[skin['joints'][nomi_ossa.index('Hips')]]}],
        'accessors': [
            {'bufferView': 0, 'byteOffset': 0, 'componentType': 5122, 'normalized': True, 'count': nV, 'type': 'VEC3',
             'min': [int(x) for x in V['p'].min(axis=0)], 'max': [int(x) for x in V['p'].max(axis=0)]},
            {'bufferView': 0, 'byteOffset': 8, 'componentType': 5120, 'normalized': True, 'count': nV, 'type': 'VEC3'},
            {'bufferView': 0, 'byteOffset': 12, 'componentType': 5123, 'normalized': True, 'count': nV, 'type': 'VEC2'},
            {'bufferView': 0, 'byteOffset': 16, 'componentType': 5121, 'count': nV, 'type': 'VEC4'},
            {'bufferView': 0, 'byteOffset': 20, 'componentType': 5121, 'normalized': True, 'count': nV, 'type': 'VEC4'},
            {'bufferView': 1, 'componentType': 5123, 'count': len(tri)*3, 'type': 'SCALAR'},
            {'bufferView': 2, 'componentType': 5126, 'count': len(ibm2), 'type': 'MAT4'},
        ],
        'bufferViews': [
            {'buffer': 0, 'byteOffset': int(inizi[0]), 'byteLength': len(vertici), 'byteStride': 24, 'target': 34962},
            {'buffer': 0, 'byteOffset': int(inizi[1]), 'byteLength': len(indici), 'target': 34963},
            {'buffer': 0, 'byteOffset': int(inizi[2]), 'byteLength': len(ibmB)},
            {'buffer': 0, 'byteOffset': int(inizi[3]), 'byteLength': len(img)},
        ],
        'buffers': [{'byteLength': int(inizi[-1])}],
    }
    testo = allinea(json.dumps(out, separators=(',', ':')).encode('utf-8'), b' ')
    corpo = b''.join(parti)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(testo) + 8 + len(corpo)) + struct.pack('<II', len(testo), 0x4E4F534A) + testo + struct.pack('<II', len(corpo), 0x004E4942) + corpo
    return glb, dict(nome=nome, vertici=nV, vertici_prima=len(pos), triangoli=len(tri), geometria=len(vertici) + len(indici), texture=len(img), byte=len(glb), prima=os.path.getsize(sorgente), errore_pelle_m=errore, testa=testa)


def main():
    qui = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description='Alleggerisce i modelli 3D di Lob e di Drop (B29)')
    ap.add_argument('--sorgente', required=True, help='cartella con drop.glb e lob.glb del generatore')
    ap.add_argument('--uscita', default=os.path.join(qui, '..', 'public', 'media'))
    ap.add_argument('--lato', type=int, default=1024)
    ap.add_argument('--formato', choices=('webp', 'jpeg'), default='webp')
    ap.add_argument('--qualita', type=int, default=80)
    ap.add_argument('--fogli', help='cartella dove salvare il foglio con il prima e il dopo del marchio di Drop')
    ap.add_argument('--solo', choices=NOMI)
    a = ap.parse_args()
    os.makedirs(a.uscita, exist_ok=True)
    for nome in NOMI:
        if a.solo and a.solo != nome: continue
        glb, info = alleggerisci(nome, os.path.join(a.sorgente, f'{nome}.glb'), a.lato, a.formato, a.qualita, a.fogli)
        dove = os.path.join(a.uscita, f'mascotte-{nome}.glb')
        open(dove, 'wb').write(glb)
        print(json.dumps(info), '→', os.path.normpath(dove))


if __name__ == '__main__':
    main()
