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

## Giro 2 (FATTO, commit «coreografie con lo schermo verso la rete nel codice»)
Coreografie nel codice (`CHOREO_VIDEO`, `AIM_TURN_VIDEO` da `scripts/video/soluzioni/`, `--emit`); faccia all'impatto (destro =
mancino): dritto 17,0°, rovescio (dorso) 8,7°, tagliato 17,0°, tagliato di rovescio (dorso) 5,9°, piatto 17,0°, volée 17,0°,
lungolinea 12,1°, **incrociato 21,1°** (minimo trovato con la mira letta: limite dichiarato). Letture semi 1–23: 3 174/3 174
fuori dai limiti dichiarati. **Limite dichiarato**: con la calibrazione del braccio simulato (telefono tenuto come nella posa
di partenza, schermo di lato) la mira di incrociato e lungolinea non si legge (0/138 ciascuno) e il piatto è letto top spin
(15/138): con lo schermo verso la rete i due centri della mira distano 83,6° (> 80° credibili) e le finestre del piatto
(± 0,12 dalla salita abituale 0,30 e −0,02) non si toccano. Con la calibrazione con l'animazione (quella del tutorial) 138/138.
Dettagli e misure: `docs/b17/ottimizzazione.md` §9. Test: gioco 988/988 (nuovi: faccia all'impatto, rovescio a una mano,
semi 1–23 in tre file), sito 200/200, build ok.

## Giro 3 (FATTO): fogli, prove nel browser, documenti
- Fogli `docs/b17/img/O-*` e `VC-*` di dritto, rovescio e tagliati rifatti con il **primo piano dalla palla** all'impatto e la
  faccia scritta; guardati (dritto: vetro blu verso la palla; rovescio: dorso scuro). Confronto `PREFIX=O` 24/24, `VC` 20/20.
- Camere: piatto e volée con la camera del dritto, incrociato az 35° el −17,5°, volée che segue come il dritto; il braccio libero
  del rovescio a una mano non allarga il quadro. `natpf-gesti-fotogrammi` 31/31 con tre limiti dichiarati (27 % a 1600×1000 per
  rovescio, dritto, lungolinea), `natpf-modale-gesti` 18/18, `natpf-tutorial-phone` 52/52.
- `docs/b17/ottimizzazione.md` §9 (angoli prima/dopo, scarti dal video, letture, limiti con le misure).

## Prossima azione
Passo B3 chiuso. Da chiedere all'utente (con i fogli O/VC): dritto che colpisce all'altezza della testa (12 cm sopra il video),
volée e piatto diventati dritti alti (la volée non è più un gesto corto), incrociato a 21°; se accettare che con una calibrazione
fatta tenendo lo schermo di lato la mira e il piatto non si leggano (nel gioco la calibrazione si fa con il dritto del tutorial).

## Come riprendere
Dalla cartella `natpf-tennis`: `node --import ./test/register.mjs scripts/video/ottimizza.mjs --card=<id> --out=DIR
--with=DIR_SOLUZIONI --from=DIR_SOLUZIONI/<id>.json --impact=20 [--armd=25 | --noinit] [--mirror] --evals=1500 --seed=N`
(nohup, un processo per cartella). Soluzioni del passo C in `natpf-tennis/scripts/video/soluzioni/`.
