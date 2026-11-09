# B17.1 · passo B2 (presa e partenza dal video, coreografie ottimizzate con il rilevatore nel costo) · stato dei lavori

> File di ripresa del passo B2. Decisioni dell'utente del 09/11 sera: (1) «ottimizza senza di me» = scelta B di
> `docs/b17/posa-dal-video.md` §4; (2) presa e partenza «come la mia impugnatura del video» = misurate nel video
> (`gesti-video.json`: presa nei colpi, posa ferma 9,4–9,7 s). Risultati, misure e limiti in **`docs/b17/ottimizzazione.md`**.

## Fatto (09/11 sera)
- Presa «racchetta» = presa misurata nei colpi del video (`PHONE_IN_HAND_VIDEO`; alternativa delle foto `PHONE_IN_HAND_FOTO`),
  partenza `REST_VIDEO` = media della posa ferma del video, scheda «Presa» dal primo piano del video (`REST_RACCHETTA`;
  alternativa `REST_RACCHETTA_FOTO`), indicazioni della «Posizione» aggiornate.
- Ottimizzatore `natpf-tennis/scripts/video/ottimizza.mjs` (uso nell'intestazione; `--emit` scrive `CHOREO_VIDEO`).
- Tutte le schede della racchetta su `CHOREO_VIDEO` (`VIDEO_CARDS` = tutte tranne «Presa»): 144/144 letture giuste (12 schede ×
  2 calibrazioni × 2 mani × 3 velocità). `CHOREO_VIDEO_GREZZA` resta come riferimento e rollback (non letta: test).
- Camere `CAMERAS_VIDEO` rifatte (ricerca su griglia); fogli `docs/b17/img/O-*.webp` rifatti e guardati.
- Test aggiornati (pose, anim, physics, camera, mancini); gioco 980/980, sito 200/200, build ok.

## Limiti dichiarati (dettagli in ottimizzazione.md)
- Palla corta e schiacciata partono da `REST_COLPI_RACCHETTA`, non dalla posa del video.
- Fine del tagliato di dritto 26 cm più alta del video; rovescio a due mani: impatto 12 cm, fine 20 cm; servizio: battuta 12,5 cm
  più bassa (1,65 m). Parte veloce del dritto 0,32 s (limite alto della ricerca).
- Scheda «Presa»: con la presa misurata e lo schermo verso lo schermo di gioco il pollice disegnato sta sotto (foto e primo piano:
  sopra). Da chiarire con l'utente.
- Prova dei fotogrammi del B9 (`tools/e2e/natpf-gesti-fotogrammi.mjs`) rossa per inquadrature (dritto/incrociato/lungolinea al
  27 % contro 28 % a 1600×1000, freccia fuori a 448×280, palla fuori 117 ms a 200×200, etichette sul telefono nel tagliato e nella schiacciata).
- Test dello specchio (mancini): due scarti piccoli ammessi e misurati (salita 0,02 palla corta/schiacciata, mira 0,086 incrociato).

## Prossima azione
1. Inquadrature del set video nella prova dei fotogrammi (risolutore della camera che segue: dritto, incrociato, lungolinea;
   etichette dei fantasmi nel tagliato e nella schiacciata), poi `natpf-gesti-fotogrammi.mjs` verde.
2. Chiedere all'utente: pollice nella scheda «Presa», fine del tagliato, partenza di palla corta e schiacciata.

## Come riprendere l'ottimizzazione
Dalla cartella `natpf-tennis`: `node --import ./test/register.mjs scripts/video/ottimizza.mjs --card=<id> --out=DIR --with=DIR_FINALI
[--from=DIR/<id>.json] [--mono] [--rest=colpi] --evals=1500 --seed=N` in background con `nohup` (un processo per cartella di
uscita: due processi sulla stessa cartella si sovrascrivono). Le soluzioni usate sono quelle scritte in `CHOREO_VIDEO`;
`--emit=DIR` le rigenera da una cartella di soluzioni.

## Correzioni dopo la revisione del passo B2 (09/11 notte, IN CORSO)
Bloccanti della revisione e stato:
1. **Un solo seme del rumore** (144/144 valeva solo per il seme 7): `ottimizza.mjs` legge ora i semi 7, 1, 5, 10 (`--seeds`),
   margine della mira |w| ≥ 0,5 (`AIM_MARGIN`), `--capPrep` (carica del tagliato sotto 95 °/s). Rifatti: tagliato di dritto,
   rovescio, incrociato, piatto, tagliato di rovescio (cartelle in scratchpad `b17r/sl1`, `bh1`, `cr1`, `fl1`, `sb1`). Test nuovo
   in `natpf-gesture-pose`: semi 2, 3, 11 (mai visti dall'ottimizzatore).
2. **Script che non rifaceva il dritto**: `TIMES.stroke.acc` a [0,18; 0,32], `--report` senza `--from` valuta
   `CHOREO_VIDEO[card]`, `--presa` esiste (risolve `REST_RACCHETTA`), ritorno delle schede di oggi da 0,5 s (la volée ha 0,628),
   soluzioni nel repository (`natpf-tennis/scripts/video/soluzioni/`, con le opzioni) e test «le soluzioni salvate rifanno
   CHOREO_VIDEO».
3. **Tagliato senza discesa lunga**: proseguimento lento dopo la frenata (`slow`, `F2` nella coreografia, `SLOW_V` in
   `natpf_gesture_pose.js`), `--slow --descent=0.2,0.08` (fine ≤ carica − 20 cm e ≤ impatto − 8 cm).
4. **Rovescio con una mano**: `GESTURES.backhand.twoHanded` (solo disegno), mano libera sul telefono dalla carica alla fine
   (test in `natpf-gesture-anim`); fine più alta con `--slow --f2d=25`; braccio libero a riposo lungo il fianco (`FREE_REST`).
5. **Scheda «Presa» con il pollice sotto**: `REST_RACCHETTA` = presa misurata nella posa delle foto (gomito al fianco,
   telefono lungo l'avambraccio, cima in avanti e 20° in su, pollice in alto, dita sotto; schermo verso l'interno), il primo
   piano resta come `REST_RACCHETTA_PRIMO_PIANO`; terza indicazione «Pollice in alto lungo il bordo, schermo verso l'interno».

Come riprendere: `sh <scratchpad>/b17r/apply.sh <cartella con le 12 soluzioni>` scrive `CHOREO_VIDEO`/`AIM_TURN_VIDEO` e
`scripts/video/soluzioni/`; poi `npm test`, sito, build, fogli `PREFIX=O` e documenti (`ottimizzazione.md`).

## Non verificato
- Niente telefono vero; presa del video a bassa confidenza (errore d'asse 37,7°); flusso del tutorial nel browser non provato.
