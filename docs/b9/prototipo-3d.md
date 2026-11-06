# B9 · Prototipo 1 — direzione «3D realistico» (braccio, mano e telefono)

> Stato: **bozza in corso** (05/11/2026). HEAD di partenza `e7cd44d`. Nessun file del gioco modificato.
> Prototipo: `natpf-tennis/prototipi/b9-3d/index.html` + `main.js` (servito da vite in sviluppo, fuori dalla build).
> Fotogrammi: `docs/b9/img/p3d-*.png`. File temporanei: scratchpad `b9/p3d/`.

## Piano
1. Mano, avambraccio e braccio procedurali (SDF → mesh liscia, pelle con ossa) attorno al telefono nella presa nel palmo.
2. Telefono fedele (162 × 79 × 8,6 mm), schermo «Pronto» acceso, cornice metallica, riflessi da RoomEnvironment.
3. Moto del telefono da `natpf_gesture_motion.js` (`strokePose`, `GRIP_POSE`), tempi secondo `docs/b9/specifica-gesti.md`.
4. Luci a tre punti, ombre morbide, camera didattica per gesto, scia a nastro della cima.
5. Fotogrammi con Chromium (swiftshader), almeno 3 iterazioni di correzione.

## Avanzamento
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
     ora girati); 39,8k vertici, 62k triangoli, 2,1 s di costruzione in node.
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
  In corso: composizione dei fotogrammi finali in `docs/b9/img/p3d-*.png`, rapporto finale.

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
