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

## In corso
- Ottimizzazioni in background (nohup, log in scratchpad `b17B3/r1a`, `r1b`): dritto e rovescio, due strategie (a: partenza
  girata con `--armd=25`; b: `--noinit`, dalla soluzione del passo C stringendo il vincolo).

## Prossima azione
Prendere le soluzioni migliori di dritto e rovescio (letture 48/48, angolo ≤ 20°, forma), poi tagliati, piatto, volée,
incrociato, lungolinea con il dritto e il rovescio nuovi nella calibrazione (`--with`), poi verificare pallonetto, palla corta,
schiacciata e servizio con la calibrazione nuova; `--emit`, test, fogli.

## Come riprendere
Dalla cartella `natpf-tennis`: `node --import ./test/register.mjs scripts/video/ottimizza.mjs --card=<id> --out=DIR
--with=DIR_SOLUZIONI --from=DIR_SOLUZIONI/<id>.json --impact=20 [--armd=25 | --noinit] [--mirror] --evals=1500 --seed=N`
(nohup, un processo per cartella). Soluzioni del passo C in `natpf-tennis/scripts/video/soluzioni/`.
