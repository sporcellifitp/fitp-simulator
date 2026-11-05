# B9 · Prototipo 2 — direzione «motion design illustrato» (braccio, mano e telefono 2,5D)

> Stato: **bozza in corso** (05/11/2026). HEAD di partenza `e7cd44d`. Nessun file del gioco modificato.
> Prototipo: `natpf-tennis/prototipi/b9-motion/index.html` + `main.js` (servito da vite in sviluppo, fuori dalla build).
> Fotogrammi: `docs/b9/img/pmo-*.png`. File temporanei: scratchpad `b9/pmo/`.

## Piano
1. Moto fedele: il telefono ruota attorno agli assi, con i versi, i picchi e i tempi di `docs/b9/specifica-gesti.md`
   (§2, §3), posa calcolata in 3D (campo) e proiettata in 2,5D con una camera didattica per gesto.
2. Disegno vettoriale (Canvas 2D, ridisegnato a ogni fotogramma alla risoluzione dello schermo: nitido su ledwall):
   avambraccio, mano nella presa nel palmo, telefono con schermo «Pronto»; luci e ombre dipinte, contorni.
3. Didattica: scia della cima con dissolvenza, fantasmi delle pose chiave, freccia del verso, indicatore del picco
   di velocità sincronizzato con l'impatto, palla.
4. Fotogrammi con Chromium, almeno 3 iterazioni di correzione.

## Avanzamento
- Fatto: `prototipi/b9-motion/motion.js` (moto puro, `gesturePose(id, t, { hand })` come proposto in
  `specifica-gesti.md` §6) e `prototipi/b9-motion/verifica.mjs` (posa disegnata → telefono simulato completo).
  Esito: dritto, rovescio, pallonetto, palla corta riconosciuti con **un solo messaggio** e il lato giusto, picco
  8 ms prima del contatto disegnato (mezzo campione); servizio **2 messaggi a 0,690 s**; destro e mancino; calibrazione
  con il braccio simulato e con il dritto/rovescio dell'animazione; imitazione 0,8× uguale, 1,25× dritto e rovescio →
  piatto (verso giusto del cambiamento, §6.5). Presa: rotazione 0 °/s.
- (in corso) disegno vettoriale (`main.js`).
