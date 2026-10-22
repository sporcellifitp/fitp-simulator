# Webcam come racchetta: riconoscimento dei colpi (21/10/2026)

Codice: `natpf-tennis/src/natpf/webcam_strokes.js` (riconoscimento), `natpf-tennis/src/motion_controls.js` (camera,
mano, flusso ottico, eventi al gioco), `natpf_hand.js` (lancio di palla). Banco di prova sintetico:
`natpf-tennis/test/webcam-sim.mjs`, `scripts/audit/webcam-sweep.mjs`, test in `test/natpf-webcam-classifier.test.mjs`.

## Cosa non andava

Misure sul banco sintetico (colpi 3D con inferenza ad almeno 15 fotogrammi al secondo):
- lato giusto solo nel 30% (destri) e 27% (mancini) dei colpi completi;
- nei colpi a rimbalzo più eventi per colpo nel 62% dei casi e un evento già nella preparazione nel 41%;
- pallonetti falsi nell'11% dei colpi a rimbalzo e fino al 75% degli swing inclinati;
- il lancio di palla nello scambio diventava un pallonetto (16 su 16);
- un passante vicino alla camera generava colpi falsi (fino a 15 al minuto);
- la mano seguita era la prima della lista: una mano che entrava nell'inquadratura la prendeva e la teneva.

## Cosa cambia

- **Unità**: posizioni divise per la taglia della mano, stessa scala sui due assi: le soglie valgono uguali da vicino e
  da lontano.
- **Un evento per colpo**: un «viaggio» parte dal punto in cui la mano era ferma; preparazione, abbassamento della
  mano, finale e ritorno non generano eventi.
- **Colpo anticipato**: l'evento parte durante l'avanzamento, prima dell'impatto, con lato e tipo provvisori, così il
  gioco tiene lo swing e lo gioca nel punto giusto (come il telefono). Scatta quando:
  1. la mano torna verso la camera dopo la preparazione (la sua taglia cresce di almeno 0,08 in ln dal minimo del
     viaggio, a 0,7/s o più, dopo una preparazione che l'aveva allontanata di almeno 0,08). Con la camera di fronte è
     la prima cosa che si vede prima dell'impatto; il lato viene dal verso della preparazione;
  2. oppure il moto di lato è chiaramente veloce (≥ 1,1 unità/s negli ultimi 28 ms), purché la mano non si stia
     allontanando dalla camera (preparazione) o tornando a riposo (ritorno).
- **Conferma a fine gesto**: il resto del gesto si riclassifica quando la mano rallenta, ma va solo alla diagnostica
  (`onTrack`, `kind: 'confirm'`), mai al gioco: arriva 0,4–1,2 s dopo l'impatto, quando lo swing è già stato giocato.
  La diagnostica misura quanto spesso coincide con il colpo anticipato (`webcam.conferme`: coerenza, non precisione).
- **Pallonetto** solo con una salita ripida dal punto più basso dopo la preparazione e la mano che finisce alta;
  **schiacciata** solo se la mano scende partendo da sopra la spalla.
- **Lancio di palla** solo quando il gioco lo accetta (titolo o proprio servizio, anche per il Player 2); nello scambio
  lo stesso gesto non diventa un pallonetto.
- **Tempi** dall'istante di cattura del fotogramma (richiamo della camera); senza, dall'invio al modello.
- **Mano da seguire** scelta per continuità (posizione prevista, taglia, lateralità di chi gioca). La lateralità è
  quella dell'impostazione unica del gioco (`NatpfHand`, la stessa del telefono).
- **Flusso ottico** di riserva solo senza mano da più di 0,22 s, e solo intorno all'ultima mano vista o nella zona
  centrale; col solo flusso un movimento da fermo lungo più di 0,6 s non è uno swing (passanti).
- **Diagnostica**: `motion_controls.onTrack` dà ogni fotogramma elaborato, ogni colpo, la conferma, la mano persa e
  ritrovata; il registratore li scrive come `webcam.frame` e `webcam.evento`.

## Un solo soggetto (22/10/2026)

Con un'altra persona nell'inquadratura (dietro, o accanto alla stessa distanza) il gioco poteva passare a lei:
- la continuità durava 0,5 s con un raggio che cresceva di 2,5 larghezze al secondo (serve per il mosso negli swing
  veloci): bastavano pochi fotogrammi senza la mano di chi gioca perché si prendesse quella dell'altra persona, e il
  salto era un colpo;
- dopo 0,5 s si sceglieva da capo tra le mani in vista.

Ora (`pickHand`, `trackOthers` in `webcam_strokes.js`):
- le altre mani viste insieme a quella di chi gioca si ricordano e si seguono per vicinanza; ognuna «reclama» la mano
  trovata più vicina a lei che a dove dovrebbe essere quella di chi gioca, che non viene presa;
- mentre la mano di chi gioca è persa, un'altra mano si aggiorna solo con una mano più vicina a lei che all'ultima
  posizione di chi gioca (altrimenti la mano di chi gioca, persa vicino all'altra, ne prendeva il posto nell'elenco);
- per 5 s (`HAND_KEEP`) dopo l'ultima volta che la si è vista si riprende solo una mano della taglia di chi gioca
  (rapporto 0,7–1,43), anche altrove; poi si sceglie di nuovo (al chiosco arriva un'altra persona).

Banco (`runTwoPeople`, sezione «Un solo soggetto» di `webcam-sweep.mjs`): chi gioca fa un dritto e un rovescio,
l'altra persona fa un gesto ampio nella sua zona, la mano di chi gioca si perde per 0,3 s, 1,1 s o durante il ritorno
dopo il dritto. Dritto e rovescio giusti e nessun colpo in più: **72/72**, prima 28/72 (con la mano persa dallo 0 al
50%). Gli altri criteri del banco sono rimasti identici.

Limiti:
- **All'inizio** vince la mano che impugna, poi la più grande (la più vicina), poi la più centrale: chi gioca deve
  essere la persona più vicina alla camera. Se è più vicina un'altra persona, il gioco segue lei.
- Due mani della stessa taglia che si sovrappongono nell'immagine (il colpo di chi gioca che finisce sulla mano
  dell'altra persona, e lei che si muove lungo il ritorno di chi gioca) possono scambiarsi.
- **Tremolio dei punti della mano**: fino a 0,008 larghezze (5 px su 640) nessun colpo falso e i colpi restano, con i
  colpi a 2,2 s di distanza; a 0,01 un colpo in più ogni 12 prove. Con i colpi a 1,8 s di distanza la mano non sembra
  mai ferma, il ritorno dopo il colpo dura fino al massimo (`recMax`, 1,6 s) e il colpo dopo si perde (3 prove su 12 a
  0,006, uguale a prima). Misurare la quiete sulla media di più campioni lo risolveva, ma rompeva la «folla» (0/18):
  da rifare.

## Risultati (banco sintetico)

| Criterio (soglia) | Prima (726b5e3) | Colpo a fine gesto | Colpo anticipato (finale) |
|---|---|---|---|
| Swing secchi: lato giusto, destro / mancino (≥ 95%) | 95 / 92% | 100 / 100% | 100 / 100% |
| Swing secchi: pallonetti a pendenza 0,3 / 0,5 / 0,8 (≤ 5%) | 21 / 59 / 75% | 0 / 0 / 0% | 0 / 0 / 0% |
| Swing secchi: un solo evento (≥ 98%) | 99% | 100% | 100% |
| Swing secchi: evento − impatto p50 / p90 (≤ 0 / ≤ 60 ms) | +43 / +108 ms | +92 / +550 ms | **+43 / +508 ms, non rispettato** |
| Colpi completi: lato giusto, destro / mancino (≥ 95%) | 30 / 27% | 97 / 98% | 99 / 99% |
| Pallonetti nei colpi a rimbalzo (≤ 5%) | 11% | 0% | 0% |
| Un solo evento per colpo (≥ 98%) | 33% | 100% | 100% |
| Nessun evento nella preparazione (≥ 95%) | 58% | 100% | 100% |
| Colpi a rimbalzo: evento − impatto p50 / p90 | −23 / +191 ms | +163 / +259 ms | −40 / +27 ms |
| Pallonetto voluto (≥ 90%) | 39% | 95% | **13%, non rispettato** |
| Schiacciata (≥ 80%) | 11% | 97% | 100% |
| Folla: nessun colpo falso, mano tenuta | 0/18 | 18/18 | 18/18 |
| Un solo soggetto (dal 22/10): colpi di chi gioca giusti, nessuno in più | – | – | 72/72 (prima del 22/10: 28/72) |
| Lancio al servizio riconosciuto | 16/16 | 16/16 | 16/16 |
| Lancio nello scambio diventato pallonetto | 16/16 | 0/16 | 0/16 |
| Tipo giusto nei colpi a rimbalzo (informativo) | 35% | 71% | 63% |

**Nel motore vero** (partita senza grafica, palla della CPU, colpo della webcam all'istante misurato; 48 colpi a
rimbalzo):

| | Prima | Colpo a fine gesto | Colpo anticipato |
|---|---|---|---|
| evento − impatto p10 / p50 / p90 | −237 / −74 / +169 ms | +109 / +152 / +285 ms | −131 / −53 / +13 ms |
| casual: tempo del colpo | PERFECT 21, EARLY 10, VERY LATE 14, a vuoto 2 | VERY LATE 45, LATE 3 | PERFECT 46, LATE 2 |
| pro: tempo del colpo | PERFECT 11, EARLY 12, VERY LATE 12, a vuoto 12 | VERY LATE 37, a vuoto 9, LATE 2 | PERFECT 29, EARLY 17, LATE 2 |

Il riconoscimento a fine gesto era preciso ma arrivava 0,1–0,3 s dopo l'impatto: il gioco giudicava «molto in
ritardo» o a vuoto quasi ogni colpo (con la palla a 15–25 m/s, 2,6–4,4 m oltre chi gioca). Per questo non è stato
integrato da solo: prima il colpo anticipato.

## Limiti noti

- **Pallonetto voluto**: 13% (prima 39%). Con la camera di fronte la salita ripida arriva dopo l'impatto: la
  riconosce la conferma (70%), troppo tardi per il gioco. Anche top spin e tagliato scendono (63% contro 71%).
- **Swing piccoli o lenti**: il 28% degli swing secchi non raggiunge la soglia di velocità e si decide quando la mano
  si ferma, circa 0,5 s dopo: nel gioco risultano in ritardo. Una soglia più bassa dava un evento nella preparazione
  nel 17–22% dei rovesci completi.
- **Mira**: il colpo anticipato visto da una camera di fronte ha una direzione laterale quasi nulla: la mira è meno
  informativa di prima.
- A pro escono molti EARLY (24% nel simulatore); a 10 fotogrammi elaborati al secondo l'evento resta in ritardo
  (+209 ms di mediana).
- Il test unitario del pallonetto è stato ammorbidito («lato ≥ 95% e conferma ≥ 60%»); il banco completo tiene il
  criterio originale (≥ 90%) e lo segna non rispettato.
- Tutto è sintetico: non è stato provato con una webcam e una persona vere (nel browser di prova, senza scheda video,
  il modello delle mani gira a circa 1 fotogramma al secondo).

## Come ripetere le prove

Dalla cartella `natpf-tennis`:

```
npm test                                                             # compresi i test della webcam
node --import ./test/register.mjs --test test/natpf-webcam-classifier.test.mjs
node --import ./test/register.mjs scripts/audit/webcam-sweep.mjs     # banco completo (~10 min, RAPIDO=1 ~3 min); codice 1 se un criterio manca
```

Confronto con una versione precedente: `--prima=src/<motion_controls di prima>.js` (in `src/`, ha import relativi) e
`--riconoscimento=<webcam_strokes di prima>.js`.

## Da provare con una webcam e una persona vere

Con la modalità diagnostica (video della webcam, prova guidata):
- quante volte la mano si perde per il mosso negli swing veloci (`webcam.evento` lost/found);
- taglia della mano da 1 a 3 m e segnale di avvicinamento alla camera (scorcio, rotazione della mano, punti che
  saltano), con il portatile e con la camera sopra il televisore;
- se il modello chiama davvero «Left» la mano destra di chi gioca, e se un mancino è seguito bene;
- se l'istante di cattura arriva davvero dalla camera, e quanto vale il riconoscimento (`inferMs`);
- top spin e tagliato con la camera sopra il televisore; pallonetti voluti; servizio vero (lancio e colpo dall'alto);
- seconda persona nell'inquadratura (dietro e accanto) e mano libera vicino a quella con la racchetta: il gioco deve
  restare su chi gioca anche quando la sua mano si perde (`webcam.evento` lost/found con il motivo «ritrovata»);
- gioco col solo flusso ottico (modello delle mani che non si carica);
- quanto spesso il colpo anticipato coincide con la conferma (`webcam.conferme` nelle metriche; nel simulatore 59%) e,
  nella prova guidata, lato e tipo rispetto al colpo richiesto.
