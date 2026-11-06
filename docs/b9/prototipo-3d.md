# B9 · Prototipo 1 — direzione «3D realistico» (avambraccio, mano e telefono)

> Stato: **completo** (06/11/2026, dopo tre agenti e due interruzioni per il limite d'uso). Nessun file del gioco
> modificato. Prototipo: `natpf-tennis/prototipi/b9-3d/` (fuori dalla build, servito da vite in sviluppo).
> Fotogrammi: `docs/b9/img/p3d-1…6-*.png` (pannelli 640×400, la misura della modale a 1920×1080).
> Come si apre: `cd natpf-tennis && npm run dev`, poi `http://127.0.0.1:3000/prototipi/b9-3d/index.html?g=forehand`
> (`g` = grip, ready, forehand, backhand, serve, lob, drop, flat, slice, smash; `mano=sinistra`; `lento=0.5`;
> `vista=dietro|treQuarti|lato`; `pulito` toglie l'interfaccia; `qualita=bassa`; `t=<s>` fotogramma fisso).
> Fotogrammi e misure ripetibili: `node natpf-tennis/prototipi/b9-3d/fotogrammi.mjs` (istruzioni in testa al file).

## In sintesi
- Si vedono **solo mano, polso e avambraccio** con il telefono nella presa nel palmo; l'avambraccio sfuma verso il
  gomito. Niente corpo: il braccio intero (provato all'iterazione 1) metteva l'omero vicino alla camera come una macchia
  e obbligava a giustificare gomito e spalla. Campo in terra rossa con nebbia, cielo scuro, luce da studio.
- **Tutti i gesti richiesti e qualcuno in più**: presa (ferma, la camera gira piano dagli occhi di chi gioca a tre quarti
  in 9 s), posizione di partenza, dritto, rovescio, servizio, pallonetto, palla corta, piatto, tagliato, schiacciata;
  destro e mancino (specchio esatto, testi con destra/sinistra scambiati); tempo reale o rallentato.
- **Fedele al riconoscimento**: il moto del telefono è una funzione pura (`motion.js`) letta dal telefono simulato
  (adattatore «posa → sensori» di `docs/b9/specifica-gesti.md` §6): ogni colpo dà un solo colpo giusto, destro e
  mancino, con la calibrazione del braccio simulato e con quella fatta dai gesti dell'animazione (rifatto il 06/11
  dopo le modifiche: «tutto riconosciuto»; picchi letti: dritto 668 °/s, rovescio 647, pallonetto 496, palla corta 381,
  piatto 1007, tagliato 568, schiacciata 653); servizio: 2 messaggi, battuta 0,690 s dopo il lancio (05/11, `motion.js`
  non è più cambiato); il picco letto cade sul contatto disegnato (±3 ms).
- **Didattica**: curva della velocità del telefono con il segno «palla» e il punto che scorre, fase scritta in grande
  (Preparazione, Accelera, Impatto in giallo, Accompagna, Ritorno; nel servizio Lancio, Carica, Colpisci), scia della
  cima del telefono più larga e luminosa dove va più veloce, «fantasmi» (solo contorno) del telefono nelle pose chiave,
  palla che arriva e riparte, testo breve per ogni colpo.
- **Costo**: in WebGL software (SwiftShader, l'unico disponibile qui) 200 ms per fotogramma a 640×400 (5 fps), 100 ms
  con `qualita=bassa`: **non fluido senza scheda grafica**. Su GPU non misurato (stima sotto). Peso del codice 93 KB
  (34 KB compressi), nessun asset; costruzione della mano 1,0 s in un worker all'avvio.

## Tecniche
- **Mano procedurale** (`hand.js`): funzione distanza con segno (SDF) di falangi a coni arrotondati, palmo, eminenze
  tenar e ipotenar, pollice opposto, unghie, polso e avambraccio a sezione ellittica, fusi con un'unione morbida (le
  dita si uniscono al palmo una per una, tra loro unione netta: niente membrane). Le dita si chiudono da sole attorno al
  telefono (ogni articolazione si piega finché la falange tocca il bordo, con 0,6 mm di carne schiacciata), come nella
  foto della presa dell'utente (`docs/riferimenti/presa-palmo-utente-2026-11-04.webp`). Superficie estratta con le
  surface nets su griglia sparsa da 2,6 mm, vertici proiettati sulla superficie con Newton, normali dal gradiente:
  21,4k vertici, 33,5k triangoli.
- **Pelle** (`mesh.js`, in `worker.js`): colori sui vertici (palmo più chiaro, nocche e polpastrelli più rosati,
  unghie), occlusione ambientale calcolata dalla stessa SDF (anche l'ombra di contatto del telefono, attenuata), pesi
  di 6 ossa. Materiale `MeshPhysicalMaterial` con sheen caldo, clearcoat minimo e una diffusione «avvolgente» più ampia
  nel rosso (finto scattering sotto la pelle, iniettato nello shader).
- **Scheletro** (`rig.js`): la mano è solidale con il telefono; il polso devia al massimo di 24° verso la spalla e il
  resto lo assorbe la spalla (invisibile); prono-supinazione distribuita su 4 ossa dell'avambraccio (niente
  «caramella» al polso); pelle legata con il polso a 15° (piega massima ±12°), fusione mano/avambraccio su 5 cm.
- **Avambraccio che sfuma** senza mostrare l'interno: passata di sola profondità della parte che sfuma prima della
  parte opaca, poi la parte sfumata a colori (solo la superficie più vicina).
- **Telefono** (`phone.js`): 162 × 79 × 8,6 mm, corpo estruso con smusso, cornice metallica, vetro con lo schermo
  «Pronto» della pagina vera (Ricalibra, Ricollega, Scollega) disegnato su canvas ed emissivo, dorso con isola delle
  fotocamere.
- **Luce e scena** (`main.js`): chiave calda da destra e dall'alto con ombra PCF morbida 2048², controluce freddo da
  dietro, riempimento emisferico, ambiente `RoomEnvironment` (PMREM); le luci seguono l'orientamento della camera come
  in uno studio. ACES, sRGB. Campo con texture procedurale, linee, nebbia fino all'orizzonte, cielo a gradiente.
- **Camera**: per i colpi a terra inquadratura fissa calcolata proiettando tutto il ciclo (cima, base e angoli del
  telefono, polso, palla attorno al contatto) nella finestra utile sopra la curva della velocità; per servizio,
  schiacciata e pallonetto una camera che segue la mano (media mobile pesata ±0,24 s, niente scatti); leggera deriva
  dell'angolo (±3°, 11 s) dal vivo.
- **Scia**: nastro rivolto alla camera sugli ultimi 0,55 s della cima, spostato indietro di 20 cm in profondità (il
  telefono e la mano la coprono invece di esserne coperti), testa sfumata negli ultimi 20 ms.

## Peso
| File | Ruolo | Byte | gzip |
|---|---|---|---|
| `main.js` | scena, luci, camera, scia, fantasmi, palla, interfaccia, misure | 34 406 | 12 974 |
| `hand.js` | SDF della mano e del telefono, surface nets, Newton, occlusione | 22 791 | 8 551 |
| `motion.js` | moto del telefono (puro, verificato con il telefono simulato) | 12 247 | 4 673 |
| `phone.js` | modello del telefono e schermo «Pronto» | 7 125 | 2 690 |
| `rig.js` | scheletro, IK del polso, torsione | 6 856 | 2 946 |
| `mesh.js` + `worker.js` | pelle: colori, occlusione, pesi (nel worker) | 6 510 | 3 026 |
| `index.html` | pagina di prova (pulsanti, titolo, curva della velocità) | 3 064 | 1 259 |
| `fotogrammi.mjs` | solo per le prove: fotogrammi e misure con Chromium | 3 320 | 1 664 |

Totale della pagina ~93 KB (~34 KB compressi in un file solo), nessun asset scaricato (texture del campo, della
palla e dello schermo disegnate su canvas). Dipendenze: three.js 0.160 già nel progetto e `RoomEnvironment` dei suoi
esempi. Per confronto l'animazione attuale `natpf_gesture_demo.js` pesa 21 KB. In memoria: mesh della pelle ~1,5 MB
di attributi, mappa d'ombra 2048² (1024² con `qualita=bassa`), ambiente PMREM.

## Limiti e rischi (da pesare nel giudizio)
1. **Disegno software**: 4–5 fps a 640×400 (10 con `qualita=bassa`). Su una scheda grafica integrata la scena
   (~48k triangoli, 20–25 chiamate, un'ombra) dovrebbe stare ampiamente sotto i 16 ms, ma **qui non c'è una GPU: non
   misurato**. Se il PC dell'evento non ha accelerazione (Chromium con SwiftShader) serve un ripiego: rilevare il
   renderer software o fps bassi e mostrare un ciclo pre-disegnato dalla stessa scena (fotogrammi di questo prototipo,
   non clip generate: da confermare con l'utente, che il 28/10 ha rifiutato le clip video generate) oppure il
   prototipo illustrato.
2. **Avvio**: 1,0 s per costruire la mano nel worker (qui; su un PC normale meno). Si può fare una volta e tenerla
   per tutte le schede, oppure salvare la mesh già pronta (~1,5 MB non compressi: meglio procedurale).
3. **Avambraccio di punta**: quando punta verso la camera (lancio del servizio) si dissolve e resta la mano con un
   tratto di polso; di lato la sfumatura è pulita. Gomito e spalla non si vedono mai (scelta).
4. **Dita ferme**: la presa non cambia durante i colpi (giusto: il telefono si tiene fermo), le dita sono lisce e un
   po' tubolari; a 1920×1080 in primo piano si notano le nocche arrotondate e l'assenza di pori e pieghe fini. Resa
   «realistica stilizzata», non fotografica.
5. **Inquadratura dei colpi a terra**: la camera fissa mostra tutto l'arco, quindi nella modale (640×400) la mano del
   dritto occupa circa un quinto dell'altezza; una camera che segue a metà (centro tra arco e mano) la
   ingrandirebbe. All'impatto del dritto, vista da dietro, la scia è coperta dalla mano (effetto dello spostamento in
   profondità).
6. **Integrazione**: la modale deve ospitare un secondo contesto WebGL accanto al gioco (nello stesso schermo due
   modali: due renderer o uno condiviso con viewport separate); l'API di `getGestureDemo` (mount/setSize/play) va
   rispettata; la pagina di prova ha interfaccia propria (titolo, curva, pulsanti) da rifare nei componenti della
   modale. `motion.js` importa `natpf_gesture_motion.js`, quindi resta allineato ai parametri del riconoscimento.
7. **Non verificato**: GPU vera, Edge su Windows, telefoni, ledwall, altri browser; solo Chromium headless con
   SwiftShader in questo contenitore.

## Fotogrammi (`docs/b9/img/`)
- `p3d-1-presa.png` — presa dagli occhi di chi gioca e a tre quarti (fine della rotazione).
- `p3d-2-dritto-sequenza.png` — dritto: preparazione, impatto, accompagnamento (vista da dietro).
- `p3d-3-servizio-sequenza.png` — servizio: lancio (la palla sale), carica, impatto con la palla in cima.
- `p3d-4-rovescio-pallonetto-corta.png` — rovescio all'impatto, pallonetto nell'accompagnamento, palla corta in arrivo.
- `p3d-5-mancino-schiacciata-tagliato.png` — rovescio mancino, schiacciata, tagliato.
- `p3d-6-dettaglio-1920.png` — dettaglio a 1920×1080 della presa (dita attorno al bordo, pollice lungo l'altro bordo).

## Costo misurato (06/11, Chromium headless, WebGL software SwiftShader, questo contenitore)
40 fotogrammi consecutivi dopo 6 di riscaldamento, sincronizzati con la lettura di un pixel; «posa» = calcolo di ossa,
scia (96 pose), fantasmi e camera in JS; «disegno» = render three.js fino al pixel letto.

| Risoluzione | Dritto | Servizio | Presa | Posa (JS) |
|---|---|---|---|---|
| 640×400 (modale a 1920×1080) | 200 ms (5,0 fps) | 220 ms (4,5 fps) | 234 ms (4,3 fps) | 0,4–0,5 ms |
| 1280×720 | 449 ms (2,2 fps) | 490 ms (2,0 fps) | 576 ms (1,7 fps) | 0,5–0,8 ms |
| 1920×1080 | 824 ms (1,2 fps) | 761 ms (1,3 fps) | 858 ms (1,2 fps) | 0,5–0,7 ms |

Scena: 20–25 chiamate di disegno, ~48k triangoli (pelle 21,4k vertici / 33,5k triangoli, disegnata in 4 passate:
ombra, profondità della sfumatura, opaca, sfumata). In software il costo è ~100 ms fissi (ombra 2048², pelle con le
ossa) + ~375 ms per megapixel (materiale fisico della pelle con sheen e clearcoat, ombre PCF morbide, MSAA).
Costruzione della pelle (una volta, nel worker): ~1,0 s (superficie 0,45 s, normali 0,35 s, occlusione 0,1 s).

Con `qualita=bassa` (niente MSAA, ombra 1024² non morbida, niente sheen/clearcoat, densità di pixel 1): 640×400
100–107 ms (9,3–9,9 fps), 1280×720 276–297 ms (3,4–3,6 fps), 1920×1080 519–631 ms (1,6–1,9 fps). Anche così il disegno
software non regge un'animazione fluida: su un PC senza accelerazione grafica serve un ripiego (vedi «Limiti»).

## Registro delle iterazioni (fotogrammi guardati a ogni passo)
- Moto (`prototipi/b9-3d/motion.js`, funzione pura `gesturePose`): **verificato con il telefono simulato** (adattatore
  «posa → sensori» della specifica §6, script `scratchpad/b9/p3d/verifica*.mjs`): dritto, rovescio, pallonetto, palla
  corta, piatto, tagliato, schiacciata → un colpo giusto ciascuno, destro e mancino, calibrazione con il braccio simulato
  e con i gesti dell'animazione; servizio → 2 messaggi, battuta 0,690 s dopo il lancio; picco letto = contatto disegnato
  (±3 ms). Rifatta dopo la traslazione costante `STAGE.offset` (−0,30; +0,08; +0,10 m): **tutto riconosciuto**, come
  atteso (una traslazione non cambia né rotazioni né accelerazioni).
- Ripresa dopo l'interruzione (05/11 sera): `rig.js` (avambraccio che prolunga la mano, polso quasi neutro, torsione
  distribuita), `mesh.js` + `worker.js` (pelle con pesi, costruita in un worker), `main.js` + `index.html` (scena).
- Iterazioni sui fotogrammi (Chromium + SwiftShader, `scratchpad/b9/p3d/shots.mjs`):
  1. braccio intero sfumato alla spalla → l'omero vicino alla camera è una «macchia»; pelle pallida e plastica; floor
     troppo presente; fantasmi del telefono come lastre bianche.
  2. solo mano + avambraccio (sfuma verso il gomito), pelle più calda con diffusione avvolgente nel rosso, nebbia e
     vignetta, ottica più lunga (22°) → molto meglio; restano «graffi» scuri nella parte che sfuma.
  3. fantasmi solo come contorno (fresnel), inquadratura stretta calcolata proiettando la traiettoria; taglio della SDF
     al gomito provato e tolto (creava triangoli ripiegati).
  4. passo di Newton limitato (mezza cella), riflesso del vetro ridotto (lo schermo «Pronto» restava bianco).
  5. causa vera dei graffi trovata contando i triangoli invertiti (523, di cui 504 nella parte che sfuma): superfici
     dell'omero piegate nella piega del gomito. Tolto l'omero dalla SDF → 19 invertiti (tutti nelle pieghe delle dita,
     ora girati); 39,8k vertici, 62k triangoli, 2,1 s di costruzione in node (griglia di prova più fine; nella
     versione finale celle da 2,6 mm: 21,4k vertici, 33,5k triangoli, 1,0 s).
  6–9. iterazioni non descritte dall'agente interrotto (fotogrammi in `scratchpad/b9/p3d/it6…it9`).
- Fatti prima dell'interruzione: pavimento ampio con nebbia (orizzonte senza spigolo), camera che segue la mano in
  servizio e schiacciata (vista `segui`, media mobile ±0,24 s), vista bassa da dietro per pallonetto, palla corta, tagliato.
- **Ripresa 06/11 (terzo agente):** fotogrammi rifatti da `scratchpad/b9/b9-3d/` (vite su una porta propria). Difetti
  visti nei fotogrammi del 05/11 sera da correggere: (a) la scia passa davanti allo schermo del telefono all'impatto;
  (b) i fantasmi delle pose sembrano lastre di vetro grandi (soprattutto vicino alla camera nel servizio); (c) banda
  scura in alto nella vista del servizio; (d) pallonetto: mano piccola nel quadro; (e) avambraccio corto che sembra un
  moncherino nella palla corta. Iterazioni della ripresa (fotogrammi in `scratchpad/b9/b9-3d/it10…`):
  10. riferimento: in più, guardando l'avambraccio di punta (servizio, lancio) si vede un **tubo vuoto** con il buco
      (l'avambraccio è tagliato dove sfuma e le facce interne non si disegnano).
  11. scia spostata indietro in profondità di 12 cm lungo il raggio della camera (stessa posizione sullo schermo): il
      telefono e la mano la coprono, non passa più davanti allo schermo; fantasmi più tenui (0,26) e nascosti con la
      camera che segue; «tappo» con le facce interne disegnate come superficie convessa → il buco resta (il raggio
      attraversa tutto il braccio).
  12. tappo esteso a tutta la parte opaca → niente buco, ma l'estremità sembra un bulbo di vetro con anelli.
  13. **soluzione adottata**: passata di sola profondità della parte che sfuma *prima* della parte opaca, poi la parte
      sfumata a colori (solo la superficie più vicina). Di lato: sfumatura pulita; di punta: l'avambraccio si dissolve
      verso la camera (si vede lo sfondo, niente interno). Restava una cresta sul dorso del polso.
  14. cresta del polso: nei colpi la deviazione del polso è quasi sempre 24° (massimo), nella posa di legame 6°. Pelle
      legata con il polso a 15° (piega massima ±12° invece di 18°) e fusione mano/avambraccio su 5 cm invece di 3,6 →
      polso liscio.
  15. riga netta tra campo e cielo nel servizio: la nebbia del campo esce già nello spazio d'uscita, il cielo passava
      dal tone mapping (più scuro). Cielo senza tone mapping → orizzonte continuo. Camera del servizio più laterale
      (0,95; 0,30; 0,55) perché l'avambraccio sia meno di punta durante il lancio.
  16. tutti i gesti a 960×540: presa con il titolo sopra il telefono e rotazione che arriva di taglio (il telefono
      diventa un bastoncino); rovescio in preparazione tagliato dal bordo; pallonetto piccolo e sotto la curva della
      velocità; all'impatto il fantasma della posa d'impatto coincide con il telefono e lo sbianca.
  17. inquadratura nella finestra utile (orizzontale ±0,86; verticale da −0,62 a +0,90, sopra la curva della velocità)
      con gli angoli del telefono tra i punti; presa: rotazione fino a tre quarti e soggetto spostato a destra;
      fantasmi con opacità propria che si spengono quando il telefono passa per quella posa (±0,16 s).
  18. un riquadro chiaro sulle dita all'impatto del dritto e del piatto: la testa della scia vista quasi di punta.
      Testa della scia sfumata negli ultimi 20 ms e spostamento in profondità portato a 20 cm → pulito.
  19. misure (sotto, «Costo»): la modalità `misura=N` non finiva mai (l'azzeramento dopo il riscaldamento si ripeteva
      ogni 6 fotogrammi) e `gl.finish()` in Chromium non aspetta la GPU (1,6 ms a ogni risoluzione): corretti
      (riscaldamento una volta, sincronizzazione con la lettura di un pixel). Verifica dei gesti rifatta dopo le
      modifiche: «tutto riconosciuto» (moto invariato).
  20. modalità `qualita=bassa` (misure sotto). Dettaglio a 1920×1080 della presa: dita aperte a ventaglio (nella foto
      della presa stanno unite) e macchie scure sui polpastrelli (ombra di contatto del telefono a piena forza).
  21. ventaglio delle dita dimezzato (3,5°; 0,5°; −2,5°; −7°) e ombra di contatto del telefono «assottigliata» di 1,5 mm;
      riflesso del vetro ridotto (dagli occhi di chi gioca lo schermo diventava lilla).
  22. tagliato: la palla in arrivo usciva dal bordo alto → tra i punti dell'inquadratura anche la palla 50 ms prima e
      40 ms dopo il contatto (con 120 ms prima il quadro si allargava troppo); pallonetto con la camera che segue da
      dietro e in basso (`seguiBasso`): la mano non è più piccola in fondo al quadro e la salita si legge dalla scia.
  23. prova dal vivo a 640×400 (animazione libera, clic su gesti, mancino, rallentato, viste): nessun errore; la barra
      dei pulsanti andava a capo sopra il titolo (ora una riga scorrevole) e per il mancino la presa tornava sotto il
      titolo (spostamento del soggetto non specchiato): corretti. Fotogrammi finali composti in `docs/b9/img/p3d-*.png`.
