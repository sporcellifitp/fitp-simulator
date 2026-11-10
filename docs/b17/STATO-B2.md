# B17.1 · passo B2 (presa e partenza dal video, coreografie ottimizzate con il rilevatore nel costo) · stato dei lavori

> File di ripresa del passo B2. Decisioni dell'utente del 09/11 sera: (1) «ottimizza senza di me» = scelta B di
> `docs/b17/posa-dal-video.md` §4; (2) presa e partenza «come la mia impugnatura del video» = misurate nel video
> (`gesti-video.json`: presa nei colpi, posa ferma 9,4–9,7 s). Risultati, misure e limiti in **`docs/b17/ottimizzazione.md`**.

## Fatto (09/11 sera; primo giro, poi corretto: vedi sotto)
- Presa «racchetta» = presa misurata nei colpi del video (`PHONE_IN_HAND_VIDEO`; alternativa delle foto `PHONE_IN_HAND_FOTO`),
  partenza `REST_VIDEO` = media della posa ferma del video, indicazioni della «Posizione» aggiornate. Scheda «Presa»: nel primo
  giro dal primo piano del video (ora `REST_RACCHETTA_PRIMO_PIANO`), dopo la revisione nella posa delle foto (`REST_RACCHETTA`).
- Ottimizzatore `natpf-tennis/scripts/video/ottimizza.mjs` (uso nell'intestazione; `--emit` scrive `CHOREO_VIDEO`).
- Tutte le schede della racchetta su `CHOREO_VIDEO` (`VIDEO_CARDS` = tutte tranne «Presa»). Il «144/144» del primo giro valeva
  solo per il seme 7 del telefono simulato (1416/1440 sugli altri): corretto, vedi sotto. `CHOREO_VIDEO_GREZZA` resta come
  riferimento e rollback (non letta: test).

## Limiti dichiarati (dettagli in ottimizzazione.md §8)
- Palla corta e schiacciata partono da `REST_COLPI_RACCHETTA`, non dalla posa del video.
- Tagliato di dritto e rovescio: il tratto dopo l'impatto dura 0,94 e 0,66 s (video 0,23 e 0,20: proseguimento lento). Servizio:
  battuta 5,6 cm più bassa (1,64 m contro 1,70), fine davanti al petto (1,30 m contro 1,20). Parte veloce del dritto 0,32 s.
- Scheda «Presa»: terza indicazione cambiata («schermo verso l'interno»), da confermare; il primo piano del video non è
  riproducibile con la mano disegnata dalle foto.
- Polso spesso al bordo dei limiti (dv −29, fl 74, pro 1); flessione e deviazione insieme non controllate.
- Lato non controllato per tagliato, pallonetto, palla corta e schiacciata (tagliato di rovescio letto dal lato del dritto con la
  calibrazione dell'animazione).
- Prova dei fotogrammi del B9 rossa per inquadrature (25/31). Test dello specchio (mancini): tre scarti piccoli ammessi e
  misurati (salita 0,011–0,020 di palla corta, schiacciata e tagliato; mira 0,086 dell'incrociato).

## Come riprendere l'ottimizzazione
Dalla cartella `natpf-tennis`: `node --import ./test/register.mjs scripts/video/ottimizza.mjs --card=<id> --out=DIR
--with=scripts/video/soluzioni --from=scripts/video/soluzioni/<id>.json [--seeds=7,1,5,10] [--slow --descent=0.2,0.08
--capPrep=95] --evals=1500 --seed=N` in background con `nohup` (un processo per cartella di uscita). Le opzioni della soluzione
di partenza (`mono`, `slow`, `f2d`, `rest`, `via`) si riprendono da sole; `--descent` e `--capPrep` vanno ripetute. Poi copiare
la soluzione in una cartella con le altre 11 e `--emit=DIR` (o lo script `scratchpad b17r/apply.sh DIR`, che scrive anche
`scripts/video/soluzioni/`).

## Correzioni dopo la revisione del passo B2 (09/11 notte, FATTO)
Bloccanti della revisione, tutti corretti (dettagli e misure in `ottimizzazione.md` §0–§8):
1. **Un solo seme del rumore** (il 144/144 valeva solo per il seme 7; 1416/1440 sui semi 1–6 e 8–11): `ottimizza.mjs` legge i
   semi 7, 1, 5, 10, margine della mira |w| ≥ 0,5, `--capPrep`. Rifatti tagliato di dritto, rovescio, incrociato, piatto, volée,
   tagliato di rovescio. Racchetta **1584/1584 sui semi 1–11, 3312/3312 sui semi 1–23**; test con i semi 2, 3, 11.
2. **Script che non rifaceva il dritto**: parte veloce fino a 0,32 s, `--report` senza `--from` = `CHOREO_VIDEO`, `--presa`,
   ritorno da 0,5 s, soluzioni con le opzioni in `natpf-tennis/scripts/video/soluzioni/`, test «le soluzioni salvate rifanno
   CHOREO_VIDEO».
3. **Tagliato senza discesa lunga**: proseguimento lento F → F2 (`SLOW_V`), fine davanti all'anca sinistra: −22,9 cm dalla
   carica (video −26,6), −15,6 dopo l'impatto (video −11,4); il tratto dopo l'impatto dura 0,94 s (video 0,23). Camera frontale.
4. **Rovescio con una mano**: `twoHanded`, due mani dalla carica alla fine, fine a 1,53 m sopra la spalla destra (video 1,52).
5. **Scheda «Presa»**: presa misurata nella posa delle foto, pollice sopra e dita sotto; terza indicazione «Pollice in alto lungo
   il bordo, schermo verso l'interno» (da confermare con l'utente).

Verifiche: gioco 984/984, sito 200/200, build ok; `natpf-modale-gesti` 18/18, `natpf-tutorial-phone` 52/52, confronto `PREFIX=O`
24/24 (fogli O-* a tre colonne, guardati tagliato e rovescio), `natpf-gesti-fotogrammi` 25/31 (inquadratura, come prima).

## Prossima azione
1. Inquadrature nella prova dei fotogrammi (piatto 22–27 %, schiacciata telefono corto, freccia a 448×280, palla a 200×200).
2. Chiedere all'utente: terza indicazione della «Presa», tratto lento dopo l'impatto di tagliato e rovescio, palla corta e
   schiacciata dalla posa di oggi, indicazioni di incrociato e lungolinea («colpisci un attimo prima/dopo»).

## Non verificato
- Niente telefono vero; presa del video a bassa confidenza (errore d'asse 37,7°); flusso del tutorial nel browser non provato.
