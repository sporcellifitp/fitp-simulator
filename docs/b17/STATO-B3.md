# B17.1 · passo B3 (rovescio a una mano, schermo/dorso verso la palla all'impatto) · stato dei lavori

> File di ripresa del passo B3. Richieste dell'utente del 09/11 notte (sulle anteprime VC-*): confermate le eccezioni di palla
> corta e schiacciata (partenza da `REST_COLPI_RACCHETTA`) e la scheda «Presa» («Pollice in alto lungo il bordo, schermo verso
> l'interno»). Nuove: (1) «Per il rovescio, a una mano»; (2) «con il dritto la pallina venga colpita con il display in maniera
> frontale»; (3) «il rovescio invece stesso movimento ma con l'altro lato». Il riconoscimento NON si tocca.

## Fatto
- Giro 1 (commit «passo B3: rovescio a una mano…»): `GESTURES.backhand` senza `twoHanded`, con `balance` (solo disegno):
  la mano libera non va più sul telefono (≥ 28 cm in tutto il ciclo), dal contatto alla fine si apre dietro e di lato
  (`FREE_BALANCE`, riferimento del busto (−0,42; 0,18; 0,30) m), nella carica resta di lato (`FREE_PREP`). Test
  `natpf-gesture-anim` «rovescio a una mano». Testo della camera del rovescio aggiornato.
- `natpf_gesture_pose.js`: `IMPACT_FACE` (+1 schermo: dritto, piatto, incrociato, lungolinea, tagliato, volée; −1 dorso:
  rovescio, tagliato di rovescio), `IMPACT_MAX` = 20°, `faceAngleOf`, `impactFaceAngle` (mancino = specchio: stesso angolo).
- `ottimizza.mjs`: `--impact=20` (penalità oltre 17°), partenza girata `impactInit` salvata in `opts.init`, `--armd`,
  `--mirror` (scarto dallo specchio del dritto), `--noinit` (prosegue dalla soluzione di prima stringendo il vincolo).

## Angoli all'impatto PRIMA del passo B3 (coreografie del passo C, destro = mancino)
| Scheda | Faccia | Angolo dalla rete |
|---|---|---|
| Dritto | schermo | 83,5° (schermo verso sinistra, cima in avanti: telefono di taglio verso la palla) |
| Incrociato / lungolinea | schermo | 88,3° / 73,8° |
| Piatto | schermo | 158,8° (era il DORSO a 21°) |
| Volée | schermo | 163,9° (dorso a 16°) |
| Tagliato di dritto | schermo | 55,4° |
| Rovescio | dorso | 102,6° |
| Tagliato di rovescio | dorso | 37,8° |

## In corso (giro 2, ottimizzazioni in background, log in scratchpad `b17B3/r*`)
- Dritto e rovescio vanno ottimizzati INSIEME: ognuno entra nella calibrazione «con l'animazione» dell'altro (con il dritto
  nuovo il rovescio di prima era letto in due colpi e viceversa, 28–32 letture sbagliate su 48). Coppia coerente trovata
  (`b17B3/w2`): dritto 17,0° (schermo), rovescio 8,7° (dorso), 48/48 ciascuno e l'altro letto giusto (`--also`).
- Tagliato di dritto 17,0°, tagliato di rovescio 5,9° (48/48). Palla corta riottimizzata (la calibrazione nuova la leggeva
  top spin): 48/48. Pallonetto, schiacciata e servizio: 48/48 senza cambiare niente.
- Piatto e volée: con la cima del telefono girata dall'altra parte (soluzione più vicina della partenza) erano letti dal lato
  del rovescio; ripartiti dal dritto nuovo (`--initFrom=forehand --like`). Volée 60/60 a 17° ma con la forma del dritto
  (impatto 43 cm più alto della volée di oggi): in corso. Piatto: letto «piatto» ma dal lato del rovescio, in corso.
- Incrociato e lungolinea: con la calibrazione del braccio simulato la mira NON si legge (centro della mira 90° lontano: lo
  scarto è 92,7°, oltre gli 80° credibili di `AIM.maxDev`, mira 0); con la calibrazione con l'animazione sì (24/24, incrociato
  a 21,1°). In corso la misura (quanti dritti servono prima perché la mira valga con la calibrazione del braccio).
- Nuove opzioni di `ottimizza.mjs`: `--also`, `--tipLike`, `--initFrom --like [--acc]`, `--aimwide`, `--cals=pose`,
  `--camdir`; limiti articolari e faccia all'impatto senza tetto nel costo.

## Prossima azione
Chiudere piatto, volée, incrociato, lungolinea; tabella delle letture semi 1–23; `--emit` nel codice (lo script
`b17r/apply.sh DIR`), test (forma, fisica del dritto, faccia all'impatto, semi), fogli O/VC, documenti.

## Come riprendere
Dalla cartella `natpf-tennis`: `node --import ./test/register.mjs scripts/video/ottimizza.mjs --card=<id> --out=DIR
--with=DIR_SOLUZIONI --from=DIR_SOLUZIONI/<id>.json --impact=20 [--armd=25 | --noinit] [--mirror] --evals=1500 --seed=N`
(nohup, un processo per cartella). Soluzioni del passo C in `natpf-tennis/scripts/video/soluzioni/`.
