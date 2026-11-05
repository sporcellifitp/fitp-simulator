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
  (±3 ms). L'animazione di oggi sbaglia pallonetto, schiacciata e servizio (specifica §5).
- Mano procedurale (`hand.js`, SDF → surface nets) e telefono (`phone.js`): scritti e provati in node (prima prova:
  braccio troppo lungo, 145k vertici, 5,4 s di generazione: da ridurre).
- (in corso, ripresa dopo l'interruzione del limite d'uso) `rig.js` (IK a due ossa con il gomito scelto per tenere il
  polso neutro, torsione distribuita sull'avambraccio), `mesh.js` (pelle con pesi, AO), `main.js` + `index.html`.
