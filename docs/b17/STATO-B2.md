# B17.1 · passo B2 (presa e partenza dal video, coreografie ottimizzate con il rilevatore nel costo) · stato dei lavori

> File di ripresa del passo B2. Decisioni dell'utente del 09/11 sera: (1) «ottimizza senza di me» = scelta B di
> `docs/b17/posa-dal-video.md` §4; (2) presa e partenza «come la mia impugnatura del video» = misurate nel video
> (`gesti-video.json`: presa nei colpi, posa ferma 9,4–9,7 s). Risultati e misure in `docs/b17/ottimizzazione.md`.

## Come riprendere
1. Leggere questo file e `git log --oneline -5` nel worktree.
2. L'ottimizzatore è `natpf-tennis/scripts/video/ottimizza.mjs` (uso nell'intestazione). Lanci in background con `nohup`,
   uscite in `scratchpad/b17o/r<giro>/<scheda>.{json,log,out}` (fuori dal repository). Ogni `<scheda>.json` è il migliore
   trovato (si riprende con `--from=…json`); `--emit=DIR` stampa `CHOREO_VIDEO` e `AIM_TURN_VIDEO` da incollare.
3. Ordine: dritto → rovescio (con `--with` il dritto trovato: la calibrazione «con l'animazione» usa i due) → di nuovo il
   dritto con il rovescio nuovo → tagliati, servizio, incrociato e lungolinea con `--with` dritto e rovescio finali → schede di
   oggi (piatto, volée, pallonetto, palla corta, schiacciata) rilette con la calibrazione nuova (`--also`).

## Fatto
- (09/11 sera) Presa «racchetta» = presa MISURATA nei colpi del video (`PHONE_IN_HAND_VIDEO`, Euler (45°, 10°, 65°) sul modello
  «in piedi nel pugno», errore d'asse 37,7°); l'alternativa delle foto resta come `PHONE_IN_HAND_FOTO`. `REST_VIDEO` = media
  degli angoli misurati nella posa ferma 9,4–9,7 s (polso compreso). Scheda «Presa»: `REST_RACCHETTA` nuova (primo piano del
  video: schermo verso lo schermo di gioco, telefono di traverso davanti al petto); l'alternativa delle foto resta come
  `REST_RACCHETTA_FOTO`. `GRIP_POSE.racchetta.euler` aggiornato. `CHOREO_VIDEO_GREZZA` = le coreografie del video come
  costruite nel passo B/C (rollback e riferimento dei test).
- Ottimizzatore scritto e provato (≈ 80–200 ms per valutazione: 12 letture del telefono simulato più fisica e forma).

## In corso / prossima azione
- Giro 1 dell'ottimizzatore in background (dritto, rovescio, servizio, tagliati).

## Non verificato
- Niente telefono vero; la presa del video è una misura a bassa confidenza (errore d'asse 37,7°).
