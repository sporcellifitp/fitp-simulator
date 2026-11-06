# B9 · Ramo C: animazione dei gesti illustrata 2,5D (Canvas 2D)

> Stato: **completo per l'unione** (06/11/2026, worktree `wf_b232ca46-ca8-1`, branch `worktree-wf_b232ca46-ca8-1`, base
> `b86baac` più `natpf-simulator` unito). Brief: `docs/b9/giudizio-animazione.md` §5. Posa: `docs/b9/posa-gesti.md`.
> Fogli di controllo: `docs/b9/img/C-anim-*.webp`. Modale vera: `docs/b9/img/C-modale-*.webp`.

## 1. Cosa è cambiato

| File | Cosa |
|---|---|
| `natpf-tennis/src/natpf/natpf_gesture_demo.js` | Riscritto in **Canvas 2D** (niente three.js né WebGL). Stessa API: `available`, `canvas`, `mount`, `setSize`, `play(id, { hand, speed })`, `start`, `stop`, `hitTime`, `cycle`, `pose(t)`, `dispose`, `getGestureDemo(key)`; in più `show(t)` (fotogramma fermo per le prove). La posa si legge **solo** da `gesturePose` (`demo.pose(t)` è `gesturePose(id, t, { hand, grip })`); il disegno non aggiunge moto. Importabile in Node: senza `getContext('2d')` `available` è falso |
| `natpf_gesture_pose.js` | Solo dati del disegno, nessun moto: camere per scheda riviste (telefono mai di taglio nelle pose chiave), velocità della palla in uscita a metà (`BALL_OUT`, resta nel quadro qualche fotogramma); palla del servizio appoggiata sul vetro e staccata al picco del lancio (niente compenetrazione, lancio di ~0,45 m in 0,69 s). Riconoscimento invariato: tutti i test di fedeltà verdi |
| `natpf_split_ui.js`, `natpf_tutorial.js`, `natpf_training.js` | Niente più «animazione a una sola metà» (`demoOwner`/`canDemo` tolti): ogni metà dello stesso schermo ha la sua istanza (`getGestureDemo('p1'/'p2')`), la modale `'main'`, il riquadro «Guarda e ripeti» dell'Allenamento `'coach'` |
| `natpf-ui.css` | Velo della modale pieno `rgba(4, 8, 24, .72)` senza `backdrop-filter`; **con un tutorial aperto nessuna sfocatura dal vivo sotto** (`:root:has(.natpf-tutorial:not(.hidden))`: il menu dello stesso schermo e i pannelli dell'allenatore hanno `backdrop-filter`, che ogni fotogramma dell'animazione costringeva a rifare) |
| `test/natpf-gesture-anim.test.mjs` (nuovo), `test/natpf-gesture-pose.test.mjs`, `test/natpf-split.test.mjs` | Fedeltà del disegno (§3), posa più stretta, niente `demoOwner` |
| `tools/e2e/natpf-gesti-fotogrammi.mjs`, `tools/e2e/natpf-modale-gesti.mjs` (nuovi) | Fogli dei momenti chiave con le misure della lista; modale vera, fotogrammi al secondo, schermate |

### Disegno (brief §5.2–5.5)
- Solo **avambraccio, mano e telefono**. Mano della presa nel palmo (`HAND` della posa: dita sul bordo, pollice lungo il
  bordo opposto) e a martello (rollback `GRIP_STYLE = 'martello'`). Pelle a 4 toni caldi (`#b8714f`, `#e9a77f`,
  `#f6c9a6`, `#ffe6d2`), luce di contorno fredda dal lato in ombra, unghie solo se il dorso del dito guarda la camera,
  contorno caldo `#2a1812` all'80% spesso lo 0,3% della larghezza (min 1 px); ombra morbida del telefono sulla pelle.
- Avambraccio color pelle che **sfuma** dal 42% all'80% della sua lunghezza (mai gomito, omero o spalla: nella posa sono
  solo indicativi, `posa-gesti.md`); quando punta verso la camera (fine del servizio e della schiacciata) sfuma in tondo
  attorno al polsino invece di finire con un disco. Polsino bianco con la riga blu.
- Telefono 162 × 79 × 8,6 mm, cornice metallica a gradiente, vetro con due riflessi, schermata «Pronto» della pagina
  vera **mai specchiata** (il mancino è lo specchio della camera, la scritta resta dritta), dorso con le fotocamere.
- Fondo: gradiente radiale più chiaro al centro, alone del piano e tratto della linea di fondo in prospettiva, ombra
  morbida della mano sul piano (con la camera ferma il piano è disegnato una volta e copiato).
- Strati didattici: freccia tratteggiata del verso che cresce nella carica; scia della cima negli ultimi 0,3 s con
  larghezza e luce proporzionali alla velocità e testa sfumata; **fantasmi solo a contorno** (1 Carica, 2 Impatto,
  3 Fine; servizio Lancio, Braccio in alto, Impatto) che si spengono mentre il telefono passa per quella posa, con
  l'etichetta numerata **vicino al proprio fantasma** e fuori dalla sagoma viva (telefono, palmo, dita, avambraccio);
  lampo all'impatto (anello e 6 raggi, 0,16 s); palla con cuciture: al contatto tocca la cima del telefono e, se è
  dietro il telefono (contatto sulla faccia lontana dalla camera), **si vede in trasparenza** a metà opacità con il
  contorno tratteggiato; fase scritta grande in basso a sinistra con **«Impatto» giallo per ±30 ms** dal contatto;
  banda della velocità di rotazione con «Picco = impatto · N °/s» (mai sopra la testina: se non entra si accorcia) e,
  per piatto e palla corta, il confronto con il dritto. Testi `max(12 px, 2,6% dell'altezza)`.
- Tempi (brief §5.4): primo ciclo a **tempo reale**, poi ×0,5 «Rallentato» e tempo reale alternati (`speed: 'auto'`).
- **Compatta** sotto i 320 px di larghezza (esercizi 200×200, lezione 300×300): niente banda, etichette, fantasmi, lampo
  e piano; solo mano, telefono, scia, freccia e palla.
- Prestazioni: si disegna solo quando il canvas si vede (`offsetParent`, scheda del browser visibile); a modale chiusa
  il ciclo si ferma; densità ≤ 2 e ridotta oltre 2,4 milioni di pixel (4K); parti ferme (fondo, piano, banda, fantasmi)
  disegnate una volta per scheda e misura e copiate.

### Difetti del prototipo corretti (giudizio §0 e §2.3)
| Difetto | Ora |
|---|---|
| Servizio debole, avambraccio di punta a macchia scura | camera di profilo e un poco da dietro che segue la mano (media pesata ±0,24 s); telefono di faccia nel «Braccio in alto» (≥ 25°); avambraccio color pelle che sfuma |
| Telefono di taglio | camere riviste: in tutte le pose chiave schermo o dorso ≥ 25° dalla linea di vista (misurato, §4) |
| «Accompagna» all'istante del contatto | fase dalla posa: «Impatto» per ±30 ms dal contatto (test) |
| Fantasmi pieni «a guanto» | solo contorno al 38%, etichette numerate vicino al fantasma |
| Manica blu scura su sfondo blu | avambraccio color pelle; contrasto pelle (base) / centro del fondo 4,4:1 |
| Testi da 8–9 px | ≥ 12 px CSS a ogni misura; «Velocità di rotazione del telefono» solo se c'è posto |
| 5 schede mancanti | tutte le 11 più incrociato e lungolinea |
| Palla nascosta dal telefono all'impatto (nuovo, visto nei fogli di questo ramo) | in trasparenza con il contorno tratteggiato |

## 2. Misure

### Prestazioni (Chrome for Testing 153 senza GPU, opzioni predefinite: Canvas 2D su CPU, WebGL del gioco in SwiftShader)
| Misura | Valore | Obiettivo |
|---|---|---|
| Registrazione del disegno a 640×400, densità 1 (media su tutte le schede, `natpf-gesti-fotogrammi`) | **2,28 ms** (peggiore 10,2) | ≤ 4 ms ✓ |
| Con la rasterizzazione su CPU (getImageData dopo ogni fotogramma), densità 1 | **3,58 ms** (peggiore 16,9) | ≤ 4 ms ✓ |
| Densità 2: registrazione / con la rasterizzazione | 4,46 ms / 8,01 ms | ≤ 8 ms (metà fotogramma) ✓; solo misura |
| Modale sopra l'arena ferma, 1280×720 (canvas 506×316) | **60,1 fps**, disegno 1,7 ms | ≥ 55 ✓ |
| Modale sopra l'arena ferma, 1920×1080 (canvas 723×452) | **60,3 fps**, disegno 2,9 ms | ≥ 55 ✓ |
| Stesso schermo 1280×720, due animazioni insieme (421×263 ciascuna, P2 mancino) | **60,1 fps** | ≥ 50 ✓ |
| Modale «Rivedi i gesti» sopra il campo che gioca (Allenamento con il mouse) | 2,5 fps con la modale, 2,4 senza a 1280×720; 1,9 / 2,0 a 1920×1080 | vedi sotto |
| Prima della regola CSS: modale sopra il menu sfocato | 27 fps (un `div` che cambia colore nello stesso posto: 29 fps; senza la sfocatura del menu: 59) | — |

**Il campo 3D del gioco senza GPU va da solo a 2–2,5 fps** (WebGL in software, SwiftShader): con l'arena che gioca
dietro nessuna animazione può arrivare a 55 fps in questo contenitore. La prova verifica che l'animazione **non tolga
nulla** (entro il 15%) al campo da solo, e misura i 60 fps dove dietro l'arena è ferma (menu, stesso schermo, pausa).
Proposta da decidere (non fatta: cambia il gioco, non l'animazione): con la modale del tutorial aperta il campo, coperto
dal velo al 72%, potrebbe ridisegnarsi solo ogni tanto (come la pausa, `PAUSE_DRAW`), liberando il PC dell'evento
durante il tutorial; oggi `natpf_ui._syncPause` non conta la modale del tutorial.

### Peso (build di produzione, `vite build`, confronto con `natpf-simulator` 689c9e7)
- JavaScript principale: 1 520 455 → 1 560 406 byte (**+39,9 KB**), compresso gzip −9: 457 167 → 472 850 (**+15,7 KB**).
  Comprende `natpf_gesture_pose.js`, che prima non entrava nel gioco. CSS +29 byte compressi. Nessun asset.
- Obiettivo ≤ 40 KB compressi in più ✓.

### Controllo visivo (`tools/e2e/natpf-gesti-fotogrammi.mjs`, 31/31; fogli guardati)
Momenti chiave di tutte le schede (Carica, Colpo, Impatto, Fine, Ritorno; servizio Carica, Lancio, Fine del lancio,
Braccio in alto, Impatto, Fine; presa: le due viste e il giro), destro e mancino per le misure, a 640×400, 448×280,
200×200 e 1600×1000. Fogli: `C-anim-<misura>-1-colpi` (dritto, rovescio, piatto, tagliato), `-2-colpi` (pallonetto,
palla corta, schiacciata, volée), `-3-servizio-presa` (servizio, presa, posizione, incrociato, lungolinea),
`-4-mancino-martello` (dritto, servizio e presa del mancino; presa e dritto a martello). 64–142 KB ciascuno.

| Voce della lista (§5.6.2) | Misura |
|---|---|
| Avambraccio e mano sempre uniti | sì in tutti i fogli (polsino sull'attacco); avambraccio verso la camera ora sfuma in tondo |
| Polso ≤ 35° | 32,7° (palmo), 13,8° (martello), fisso: «polso fermo» |
| Dita sul vetro ≤ 8 mm | 4,8 mm (`fingersOverGlass`, palmo) |
| Nessun fantasma sopra il telefono vivo | i fantasmi si disegnano sotto la figura e si spengono quando il telefono passa per la loro posa |
| Telefono mai di taglio nelle pose chiave (≥ 25°) | sì per tutte le schede, destro e mancino, alle 4 misure (presa nel palmo). **Non** con la presa a martello (rollback): nel dritto a martello alla Carica il telefono è di taglio (display di lato per costruzione) |
| Palla ≤ 1 raggio dalla cima al contatto | sì per tutte |
| «Impatto» scritto in quell'istante | sì per tutte |
| Mano+telefono ≥ 28% dell'altezza all'impatto | minimo 53% (640×400), 54% (448×280), 48% (200×200), 52% (1600×1000) |
| A 448×280 telefono lungo ≥ 60 px all'impatto | minimo 61 px (pallonetto); 87 px a 640×400, 219 px a 1600×1000 |
| Etichette dentro lo stadio e fuori dal soggetto | sì: nessuna etichetta con più del 10% sopra telefono o palmo vivi (misurato sulla sagoma vera) |
| Testi ≥ 12 px | sì (12 px a 448×280, 26 px a 1600×1000) |
| Contrasto pelle/sfondo ≥ 3:1 | base 4,4:1 sul punto più chiaro del fondo (6,9:1 sul tono medio); il tono d'ombra 2,3:1 sul centro, sempre con il contorno scuro |
| Il colpo resta nel quadro (cima e palla fuori ≤ 100 ms, freccia ≤ 10%) | sì; massimo 100 ms (palla in arrivo del piatto e dell'incrociato), cima e freccia mai fuori |

## 3. Fedeltà (test automatici)
- `natpf-gesture-anim.test.mjs` (7 test): API e import in Node; velocità «auto»; **la posa disegnata è quella del
  test** (`demo.pose(t)` = `gesturePose` su 50 istanti per scheda, destro e mancino, palmo e martello); ogni scheda e la
  mira, destro e mancino, palmo e martello, calibrazione con l'animazione e con il braccio simulato, imitazione 0,8× /
  1× / 1,25×: un messaggio per ciclo (servizio due), colpo e lato attesi, picco letto = contatto disegnato ± 40 ms;
  continuità e ciclo chiuso; presa e posizione senza messaggi; nel disegno telefono mai di taglio, palla alla cima e
  «Impatto»; mano e avambraccio = scheletro `gestureRig`.
- `natpf-gesture-pose.test.mjs`: picco letto entro **¼ di campione** dal contatto (protegge la correzione del mezzo
  campione dell'adattatore); piatto a 50° fissato (12 casi, ≤ 10 top spin). Limite del raggio: `posa-gesti.md`.
- Tutti: gioco **820/820**, sito **195/195**.

## 4. Prove nel browser
- `natpf-modale-gesti` **15/15** (modale a 1280×720 e 1920×1080, velo senza `backdrop-filter`, fps, modale chiusa =
  animazione ferma, stesso schermo con due animazioni, pagina del telefono 390×844 aperta e non toccata).
- `natpf-gesti-fotogrammi` **31/31**.
- Prove del gioco richieste: vedi il rapporto della consegna (numeri dell'ultima esecuzione).

Schermate guardate: `C-modale-1280x720` (dritto all'impatto, «Rivedi i gesti» sopra l'Allenamento), `-servizio`,
`C-modale-1920x1080` e `-servizio`, `C-modale-stesso-schermo-1280x720` (Giulia dritto, Marco mancino servizio),
`C-modale-telefono-390x844`.

## 5. Non verificato
- **Nessuna GPU vera** (PC dell'evento, Windows, Android, ledwall): le misure sono senza GPU (Canvas 2D su CPU, WebGL in
  software). Su un PC con GPU il Canvas 2D è accelerato: atteso più veloce, non misurato.
- **Nessuna persona** ha guardato le animazioni né ripetuto i gesti (controllo 6 del brief, da fare con l'utente).
- Movimento giudicato da fotogrammi fermi e dai profili dei test, non da un video guardato.
- Presa a martello (rollback): disegnata e fedele nei test, ma le camere sono tarate per la presa nel palmo (telefono di
  taglio nel dritto a martello alla Carica).
- Le misure dei tempi sono state prese con un altro agente al lavoro sulla stessa macchina (carico 1–5 su 4 core).
