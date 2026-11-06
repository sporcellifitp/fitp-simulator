# B9 · Ramo C, base — posa dei gesti del tutorial e verifica di fedeltà

> Stato: **fatto** (06/11/2026) nel worktree del ramo C, base `6e8d39f`. Primo passo del brief di produzione
> (`docs/b9/giudizio-animazione.md` §5.7, passo 1). Il disegno (`natpf_gesture_demo.js`) e il riconoscimento **non** sono
> cambiati: il modulo nuovo non è ancora usato dal gioco (la build non cambia).

File:

- `natpf-tennis/src/natpf/natpf_gesture_pose.js` — posa dei gesti, **modulo puro** (niente DOM, three.js o canvas;
  importa solo `natpf_gesture_motion.js`), la stessa funzione per il disegno e per la verifica.
- `natpf-tennis/test/pose-sensors.mjs` — adattatore «posa → sensori» (specifica §6, Appendice B) e la posa
  dell'animazione di prima (`legacyPoseSource`, la composizione di `natpf_gesture_demo.pose()` senza three.js).
- `natpf-tennis/test/natpf-gesture-pose.test.mjs` — 14 test di fedeltà e di tempi.

## API (riferimenti come `natpf_gesture_motion.js`)

Campo: x a destra, y in alto, −z verso lo schermo del computer; posizioni in metri dal centro dei piedi; giocatore
destro, il mancino è lo **specchio esatto** (posizioni x → −x, quaternioni (x, −y, −z, w)). Telefono: y = cima,
+z = normale dello schermo, +x = bordo destro. Quaternioni `[x, y, z, w]` dal telefono al campo. Tempi in secondi a
**tempo reale** (la modale può rallentare la riproduzione, i dati no); il ciclo si ripete (`t` qualsiasi).

| Funzione / dato | Cosa dà |
|---|---|
| `gesturePose(id, t, { hand, grip, rig })` | `{ pos, q, phase, label, u, speed, contact, cycle, trunk, t, hand }`: centro del telefono, orientamento, fase e testo da scrivere («Pronto», «Carica», «Colpo», «Impatto» ±30 ms, «Accompagna», «Ritorno»; servizio «Lancio», «Braccio in alto», «Battuta»), avanzamento nella fase, velocità di rotazione del telefono (°/s), istante del contatto e durata del ciclo, rotazione del busto (rad, solo disegno); `rig: true` aggiunge lo scheletro |
| `gesturePlan(id, { grip })` | piano del gesto: `T` (tappe: `hold`, `load`, `swing`, `inv`, `contact`, `end`, `back`, `home`, `total`; servizio anche `tossPeak`, `tossEnd`, `linkStart`, `linkEnd`, `hitStart`), `phases`, `keys` (momenti chiave per i fantasmi: Carica/Impatto/Fine; Lancio/Braccio in alto/Impatto), `contact`, `total`, `peak`, `travel` (ampiezza), `prepAmp`, `ball`, `ballHigh`, `expect`, `kind` (`stroke`, `serve`, `still`) |
| `gestureRig(pose, { hand })` | spalla, gomito, polso, versori di avambraccio e braccio, `elbowDeg`, eminenze del palmo, 4 dita (nocca, interfalangee, polpastrello, con i raggi), pollice, punti del telefono (cima, base, normale dello schermo, bordo destro) |
| `gestureBall(id, t, { hand })` / `gestureContactPoint(id)` | palla nel campo (o `null` fuori scena): incontra la faccia del telefono vicino alla cima **nell'istante del contatto**; servizio: lasciata alla fine del lancio, colmo all'istante della battuta |
| `speedCurve(id)` / `gestureSpeed(id, t)` | curva della velocità per la banda «Picco = impatto» |
| `CAMERAS`, `cameraFor(id, { hand })` | camera per scheda del brief §5.3 (direzione soggetto → camera, distanza, camera che segue nel servizio e nella schiacciata, due viste e giro di camera nella presa) |
| `TIMING`, `SERVE_TIMING`, `STILL_TIMING`, `PHASES`, `PHONE`, `BALL_R`, `HAND`, `HAND_LOCAL`, `ARM`, `FOREARM_PROFILE`, `BAND`, `CUFF` | tempi per colpo, misure del telefono (162 × 79 × 8,6 mm), della palla e della mano (dal prototipo illustrato) |
| `CARD_IDS`, `EXERCISE_IDS`, `POSE_IDS` | le 11 schede nell'ordine di `TUTORIAL_CARDS` e gli esercizi della mira (`cross`, `line`) |

`grip`: `'palmo'` (predefinita, `GRIP_STYLE`), `'martello'` (rollback), `{ lean, tilt }` (presa nel palmo con la cima
`lean`° verso l'interno e `tilt`° in avanti, come `arm-sim.photoGrip`) o `{ euler }`. Serve a verificare chi imita con una
presa diversa; il disegno usa la predefinita.

## Come è costruita (dai prototipi verificati)

- Da `natpf_gesture_motion.js` si prendono **solo** i parametri verificati di ogni colpo (`GESTURES`: asse, verso, picco,
  durata della parte veloce, vettore spalla → mano all'impatto, polso, mira; `GRIP_POSE`): i moti di prima restano lì e
  li usano ancora `natpf_gesture_demo.js` e il test `natpf-gesture-demo` (nessuna modifica: il file è coerente così).
- Parte veloce con la legge cicloidale `picco·sin²(πu)`: accelerazione nel 50% della durata, **picco = contatto**.
- Preparazione con il profilo `12u²(1−u)` (parte da ferma, arriva decelerando) e picco limitato per colpo; la parte
  veloce comincia un poco prima della fine della carica nei colpi verticali (nessun fermo tra carica e colpo).
- **Difetti corretti** (specifica §5): (a) **servizio continuo**: preparazione, lancio, raccordo in cui la mano sale sopra
  la testa con il telefono che ruota appena (≤ 47 °/s), battuta sovrapposta di 0,08 s al raccordo, con il picco **0,69 s
  dopo il picco del lancio, nel colmo della palla**; niente salto della mano; (b) preparazione di **pallonetto** (82 °/s)
  e **schiacciata** (75 °/s) sotto la soglia del gesto verticale lento (101 °/s); (c) **volée** con 12° di preparazione.
- Fermo in fine colpo 0,10–0,20 s, ritorno a minimo jerk con un piccolo superamento e assestamento che parte 0,20–0,32 s
  dopo l'impatto; ciclo chiuso; presa e posizione di partenza **ferme** (nella presa gira la camera, non la mano), respiro
  di 3 mm.
- Raggio spalla → telefono 0,64 × quello dei moti del gioco (gomito piegato, telefono a ~0,46 m dalla spalla), come il
  prototipo illustrato giudicato.

## Verifiche (`natpf-gesture-pose.test.mjs`, 14 test, ~4,5 s)

Adattatore: a 60 Hz la posa disegnata diventa velocità di rotazione (da `q(k+1)·q(k)⁻¹`) e accelerazione della mano
(differenza seconda delle posizioni) per il telefono simulato completo (`test/phone-sim.mjs`: rilevatore vero
`site/js/tennis/swing-detect.js`, filtro d'orientamento, forma del colpo, calibrazione rapida vera, poi
`natpf_phone_racket`/`natpf_stroke_intent`/`natpf_gestures`). Il campione `k` porta la rotazione dell'intervallo
`[k, k+1]`: il suo istante nel gesto è il centro dell'intervallo (corretto il mezzo campione, prima −8,3 ms).

| Verifica | Esito |
|---|---|
| Le 11 schede e i 2 esercizi, destro e mancino, calibrazione con il dritto e il rovescio **dell'animazione** e con il braccio simulato, presa **palmo** e **martello** (104 letture) | esattamente il colpo mostrato e il lato giusto; servizio = lancio + battuta; mira giusta; presa e posizione nessun messaggio |
| Picco letto − contatto disegnato | **0 ms** (tolleranza 1 campione, 16,7 ms) in tutti i colpi, nel lancio e nella battuta; battuta 0,690 s dopo il lancio |
| Imitazione 0,8× e 1,25× (44 letture per velocità) | colpo mostrato, o cambio solo nel verso della velocità: dritto, rovescio, volée e mira a 1,25× → piatto (ammesso), tagliato a 0,8× → palla corta (ammesso); servizio 0,863 s e 0,552 s (= 0,69/velocità) |
| Prese di chi imita 20/35/50° verso l'interno × 25/40/55° in avanti (≈ 470 letture) | tutto giusto tranne il piatto a 50° (vedi Limiti; il test verifica che la causa sia quella) |
| Tempi del brief §5.4 | vedi tabella sotto |
| Continuità | \|ω\| ≤ 1100 °/s e \|Δpos\| ≤ 0,075 m per passo di 1/60 s (limiti 2000 e 0,15); ciclo chiuso a 0 mm / 0° |
| Mancino | specchio esatto di posa, velocità, fasi, palla, scheletro e camera |
| Fasi, momenti chiave, palla | fasi contigue da 0 al ciclo; «Impatto» nell'istante del contatto e non a ±40 ms; palla sul punto di contatto (faccia del telefono, a 0,72 della metà verso la cima, centro della palla a un raggio dal vetro) |
| Scheletro | avambraccio e mano rigidi con il telefono; dita sul vetro ≤ 8 mm |
| **Animazione di prima** (`legacyPoseSource`) | la stessa verifica **fallisce** dove dice la specifica §5, per destro e mancino e le due calibrazioni: servizio 3 gesti (un falso colpo al cambio di posa, 582 ms prima del colmo disegnato, poi la battuta dopo il colmo), pallonetto = palla corta di rovescio + pallonetto, schiacciata = top spin + schiacciata, volée = rovescio + dritto; dritto, rovescio, piatto, palla corta, tagliato e mira giusti. Con la posa di prima al posto della nuova il test principale dà 16 errori con la presa nel palmo (4 schede × 2 mani × 2 calibrazioni) |

Misure (destro, presa nel palmo; velocità di rotazione del telefono campionata a 600 Hz):

| Scheda | Ciclo (s) | Contatto (s) | Picco (°/s) | Ampiezza | Preparazione max (°/s) | Ritorno max (°/s) | Ritorno dopo l'impatto (s) | Fermo finale (s) |
|---|---|---|---|---|---|---|---|---|
| Dritto | 2,27 | 1,03 | 714 | 85° | 137 | 231 | 0,27 | 0,14 |
| Rovescio | 2,27 | 1,03 | 691 | 78° | 126 | 224 | 0,27 | 0,14 |
| Piatto | 2,41 | 1,01 | 1098 | 110° | 178 | 240 | 0,25 | 0,14 |
| Tagliato | 2,22 | 0,98 | 600 | 78° | 139 | 176 | 0,29 | 0,16 |
| Pallonetto | 2,52 | 1,255 | 520 | 78° | 82 (0,85 s) | 166 | 0,31 | 0,16 |
| Palla corta | 2,16 | 0,91 | 414 | 40° | 84 | 142 | 0,32 | 0,20 |
| Schiacciata | 2,65 | 1,37 | 700 | 84° | 75 (1,0 s) | 164 | 0,28 | 0,16 |
| Volée | 1,90 | 0,69 | 491 | 48° (prep. 12°) | 89 | 191 | 0,20 | 0,10 |
| Servizio | 3,78 | 2,20 | lancio 300, battuta 700 | 63° + 84° | 56, raccordo 47 | 109 | 0,28 | 0,16 |
| Incrociato / lungolinea | 2,32 | 1,03 | 714 | 85° | 89 / 201 | 240 / 157 | 0,27 | 0,14 |

I picchi sono quelli veri del telefono (braccio + polso): dritto 714 come la specifica §2.3, rovescio 691 e palla corta
414 sono appena sopra gli intervalli scritti nel brief (690 e 410): il test usa 700 e 420.

## Limiti e non verificato

- **Piatto con la cima a 50° verso l'interno** (presa di chi imita, non quella mostrata): il gioco legge il piatto come
  «il proprio dritto più veloce» (salita della testa entro ±0,12 da quella abituale, che conta al massimo fino a 0,30,
  `natpf_stroke_intent` `riseRefMax`). Con quella presa e il raggio del braccio disegnato il dritto sale di 0,36–0,75:
  oltre 0,42 il piatto resta top spin (con la calibrazione dell'animazione a 25° e 40° in avanti, con quella del braccio
  simulato anche a 55°). Il braccio simulato del test `natpf-gesture-demo` (raggio 0,72 m) non lo vede perché a raggio
  più lungo la salita è più bassa. È un limite del riconoscimento, non del disegno: da valutare con chi cura il
  riconoscimento (per esempio `riseRefMax` più alto solo per il piatto); qui è documentato e verificato nella causa.
- **Scheletro**: telefono, mano, dita, polso e avambraccio sono affidabili per il disegno (rigidi con il telefono:
  «polso fermo»; direzione dell'avambraccio del prototipo illustrato giudicato, che si disegna fino al gomito che sfuma
  fuori quadro, brief §5.2). Spalla, braccio superiore ed `elbowDeg` sono **indicativi**: il braccio superiore non è
  risolto con la cinematica inversa e la spalla disegnata si scosta da quella del modello fino a 0,43 m (dritto
  all'impatto; `shoulderShift`). Una prova di cinematica inversa con la spalla fissa (non adottata) chiedeva pieghe del
  polso di 80–150°: le posizioni della mano del moto e la presa nel palmo non sono compatibili con un braccio intero a
  spalla ferma. Se il disegno vorrà il braccio intero bisognerà rivedere insieme posizioni della mano, spalla e busto.
- Nessuna prova con un telefono vero né con persone: tutto con il telefono simulato (sensori ideali a 60 Hz).
- Non ancora fatto (passi successivi del brief §5.7): disegno Canvas 2D che usi `gesturePose` (e il test «la posa
  disegnata è la stessa del test»: `demo.pose(t)` = `gesturePose` su 50 istanti per scheda), modalità compatta, due
  istanze nello stesso schermo, fogli di controllo visivo, prestazioni. Quando il disegno nuovo sostituirà
  `natpf_gesture_demo.js`, `strokeTimeline`/`serveTimeline`/`tossBall` di `natpf_gesture_motion.js` resteranno solo per il
  test `natpf-gesture-demo` (moti di riferimento del braccio simulato) e si potranno togliere.

## Come rifare le misure

```sh
cd natpf-tennis
node --import ./test/register.mjs --test test/natpf-gesture-pose.test.mjs
```
