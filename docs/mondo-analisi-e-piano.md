# Il mondo di Foro Italico World: analisi e piano (v0.4)

24 settembre 2026.

## 1. Analisi dell'implementazione attuale (v0.3)

### Struttura

- Un solo file, `site/index.html` (circa 1.500 righe): stile, interfaccia e un unico modulo JavaScript. Three.js 0.170 arriva da CDN, non c'è una fase di build.
- La planimetria arriva da `site/data/layout.json`, generato da OpenStreetMap con `tools/osm-import.mjs`. Se il file manca, il gioco usa uno schema interno.
- Test automatici solo per l'importatore (`tools/test`). Il gioco è stato provato a mano con script Playwright tenuti fuori dal repository.

### Come è costruito il mondo

- **Planimetria → geometrie.** Una serie di blocchi di codice, eseguiti in fila, crea terreno, fiume, percorsi, edifici, stadi (gradoni a scatole), campi, Marmi, Olimpico, fontana, obelisco, alberi, bandiere, statue e pubblico. Alla fine un passaggio fonde gli oggetti fermi per materiale (83 chiamate di disegno per fotogramma).
- **Collisioni** 2D: rettangoli orientati, ellissi, poligoni degli edifici, fiume con eccezione sui ponti. L'altezza del terreno (`groundH`) conosce solo Marmi e Pietrangeli.
- **Personaggio**: avatar a blocchi con gambe e braccia animate da una sinusoide. Movimento in piano, corsa, nessun salto e nessuna fisica verticale.
- **Telecamera** in terza persona, trascinamento per girarla e rotella per lo zoom.
- **Input**: tastiera, trascinamento del puntatore, joystick sul touch. I tasti sono letti direttamente dove servono, senza una mappa delle azioni.
- **Interazioni**: solo le schede dei luoghi (POI) con un pulsante «Gioca» su due campi e il menu «Vai a…».
- **Gameplay**: due minigiochi a tempo con un solo input ciascuno (servizio: due tocchi; vetro: un tocco). Nessuna partita vera.
- **Stato persistente**: solo il record di ogni minigioco, in `localStorage`.

### Cosa è riutilizzabile

| Parte | Stato | Uso nella v0.4 |
|---|---|---|
| Import OSM e planimetria in metri | Solido, testato | Invariato |
| Sistemi locali (`frame`), impianti ruotati | Solido | Base per campi, NPC, punti di interesse |
| Collisioni e `hits()` | Buono | Esteso al salto e agli NPC |
| Costruttori di stadi, campi, padel, Marmi | Buoni | Spostati in un modulo e riusati dalle partite |
| Fusione per materiale | Buono | Invariato; gli oggetti animati restano separati |
| Registro dei minigiochi | Buono ma chiuso | Diventa il registro delle modalità di gioco |
| POI, minimappa, teletrasporto | Buoni | Invariati, estesi agli NPC |

### Cosa è troppo semplice, statico o limitato

- Il mondo è **vuoto e fermo**: nessuno cammina, niente si muove a parte le nuvole, il pubblico è un blocco immobile.
- **Nessun personaggio** con cui parlare, nessun obiettivo oltre ai due minigiochi.
- **Gameplay a un tasto**: non si gioca davvero a tennis o a padel.
- **Nessun contenuto creato dagli utenti** e nessuna personalizzazione.
- **Pochi elementi reali** del torneo: mancano sedie arbitrali, tabelloni, maxischermi, chioschi, info point, raccattapalle.

### Vincoli tecnici

- **Un file unico non regge la crescita.** Ogni nuova funzione tocca lo stesso modulo e rischia di romperne altre. Va diviso in moduli ES nativi, sempre senza build, così si pubblica ancora la cartella `site/` e basta.
- **Input sparsi**: per le partite servono azioni astratte (muovi, salta, colpisci, pallonetto, interagisci) valide per tastiera, mouse e touch.
- **Nessun ciclo di sistemi**: tutto sta in un'unica funzione `frameLoop`. Serve un ciclo a cui NPC, partite e animazioni si registrano.
- **Prestazioni su telefono**: ogni avatar conta circa 25 oggetti da disegnare. Gli NPC devono avere avatar fusi (5 oggetti) e diventare inattivi quando sono lontani.
- **Logica di gioco non testabile**: fisica della palla, regole e punteggio vanno in moduli senza Three.js, provabili con `node --test`.

## 2. Cosa manca e cosa cambia

| Area | Esteso | Riprogettato |
|---|---|---|
| Codice | | Da file unico a moduli (`site/js/`), bus di eventi, ciclo con sistemi registrati |
| Input | | Mappa di azioni unica per tastiera, mouse e touch, con pulsanti contestuali sul telefono |
| Personaggio | Salto, gravità, animazioni per stato (fermo, cammina, corre, salta, colpisce, esulta) | Avatar con parti fuse (anche per gli NPC) |
| Interazioni | | Registro di oggetti interattivi con suggerimento «E» e azioni |
| NPC | Nuovi: personaggi con dialoghi e missioni, pubblico che passeggia | |
| Gameplay | Servizio e vetro restano | Nuovo motore partite: fisica, regole, punteggio, IA |
| Mondo | Oggetti reali del torneo, elementi animati, partite dal vivo tra NPC | |
| Progressi | Album di medaglie e traguardi | |
| UGC | Personaggio personalizzato, bacheca dei tifosi, sfide condivisibili con un codice | |

## 3. Piano per priorità

### P1: primo risultato funzionante (questa versione, v0.4)

1. **Architettura a moduli.** Nucleo (motore, input, eventi, archivio), mondo (planimetria, geometrie, collisioni, costruzione), entità (avatar, giocatore), sistemi (interazioni, NPC, dialoghi, missioni, POI), modalità di gioco, UGC.
2. **Giocatore completo.** Frecce o WASD, corsa, salto con gravità, animazioni per stato; comandi touch (joystick più pulsanti Salta e Azione).
3. **Partite vere di tennis e padel.**
   - Fisica della palla: gravità, rimbalzo diverso per terra rossa e padel, rete, pareti di vetro.
   - Regole: servizio nel quadrato giusto (due tentativi), un rimbalzo, fuori, rete, doppio tocco; nel padel la palla deve toccare prima il campo avversario, poi può giocare con i vetri.
   - Punteggio reale: 15-30-40, vantaggi, game, partita breve al meglio dei game impostati.
   - Il giocatore si muove, salta e colpisce: colpo normale, pallonetto, smash in salto. La direzione dipende dalle frecce al momento del colpo.
   - Avversari e compagno comandati dall'IA, che prevede la traiettoria e sbaglia in modo credibile secondo il livello.
   - Tennis singolare sul Centrale, padel in doppio (tu più un compagno) sul campo da padel.
4. **Mondo vivo.**
   - Partite tra NPC in corso sugli altri campi, che si possono guardare.
   - Pubblico che passeggia, raccattapalle, arbitro sul seggiolone.
   - Maxischermo con il punteggio della partita dal vivo, bandiere mosse dal vento, getti della fontana.
5. **Personaggi con cui interagire.**
   - Maestra di padel e giudice di sedia: spiegano le regole e ti fanno giocare.
   - Raccattapalle: propone la sfida a tempo delle palline.
   - Custode dei Marmi: propone la caccia alle medaglie tra le statue.
   - Guida alla Fontana: dà informazioni sui luoghi e ti porta a destinazione.
   - Chiosco e punto informazioni.
6. **Attività.** Raccattapalle (muoversi e raccogliere a tempo), caccia alle medaglie, partite, i due minigiochi esistenti.
7. **Progressi.** Album di medaglie e traguardi (prima vittoria, record, missioni completate), salvato nel browser.
8. **UGC, pensato per un pubblico anche minorenne.**
   - Editor del personaggio: colori, numero di maglia, nome generato da parole preimpostate, senza testo libero.
   - Bacheca dei tifosi con frasi e colori preimpostati.
   - Codici sfida: chi finisce un minigioco può condividere un link con la stessa sequenza e il punteggio da battere.
   - Tutto passa da un archivio sostituibile: oggi il browser, domani un server con moderazione.

### P2: dopo il primo risultato

- Multigiocatore e classifiche su server, con accesso myFITP (roadmap v1.0).
- UGC su server con moderazione prima della pubblicazione, segnalazioni e regole per i minori.
- Tennis in doppio, altri minigiochi dalla lista (Por tres, Volée a rete, Occhio di falco), modalità «Italy Major».
- Audio (palla, pubblico, arbitro), ciclo giorno e notte, calendario legato agli eventi reali.
- Accessibilità: tasti rimappabili, contrasto, sottotitoli degli NPC.
- Pubblico sugli spalti che reagisce ai punti, livelli di dettaglio per i telefoni meno potenti.

## 4. Scelte di contenuto da confermare

- Nomi e ruoli degli NPC sono inventati e generici, senza persone reali. Coerente con la regola «nessun atleta reale senza accordo».
- Le frasi della bacheca e i nomi generati sono elenchi chiusi, per non dover moderare testo libero finché il pubblico può includere minori.
- Chioschi, maxischermo e info point sono allestimenti stilizzati tipici di un torneo, non la disposizione reale del 2026.

## 5. Stato al termine della v0.4 (24 settembre 2026)

### Implementato e verificato

| Area | Cosa c'è | Dove |
|---|---|---|
| Architettura | 25 moduli ES in `site/js/` senza build: nucleo, mondo, entità, sistemi, contenuti, giochi, partite, UGC | `site/js/main.js` |
| Input | Azioni astratte per tastiera, mouse e touch; pulsanti contestuali sul telefono (Salta, Parla, Colpo, Pallonetto) | `core/input.js` |
| Giocatore | Cammino, corsa, salto con gravità, animazioni per stato (fermo, cammina, corre, salta, colpisce, esulta, saluta) | `entities/` |
| Partite | Tennis singolare e padel in doppio con fisica, regole, punteggio vero, IA su tre livelli, aiuto al movimento a Facile | `match/` |
| Mondo vivo | 7 campi con partite tra NPC, arbitri sul seggiolone, raccattapalle, maxischermo con il punteggio del Centrale, fontana, gabbiani, bandiere al vento | `match/exhibitions.js`, `world/props.js` |
| NPC | 8 personaggi con dialoghi e 30 spettatori che passeggiano e salutano | `systems/npcs.js`, `content/npcs.js` |
| Attività | Partite, sfida al servizio, vetro, raccattapalle, caccia alle medaglie, consegna della granita | `games/`, `content/npcs.js` |
| Progressi | Album con 12 medaglie, luoghi scoperti, missioni | `systems/progress.js` |
| UGC | Editor del giocatore, bacheca dei tifosi, codici sfida condivisibili | `ugc/` |

Verifiche: 16 test automatici su regole, fisica, partite complete tra IA e codici sfida (`node --test tools/test/*.test.mjs`), più 28 verifiche nel browser. Queste coprono movimento, salto, collisioni, dialoghi, quattro partite giocate da un bot (tennis e padel, livelli Facile e Normale), minigiochi, missioni, UGC, partite dal vivo, teletrasporto e versione telefono.

### Resta da fare

- Tutto il P2 del piano: multigiocatore, UGC su server con moderazione, accesso myFITP, audio, altri minigiochi, tennis in doppio.
- Bilanciamento con persone vere: il bot dei test colpisce sempre al momento giusto e vince facilmente; bisogna misurare la difficoltà con i 20-30 utenti della v0.6.
- Pubblico sugli spalti che reagisce ai punti (oggi è fermo) e livelli di dettaglio per i telefoni meno potenti.
- Prova su telefoni veri: finora solo simulazione nel browser.

## Seguito: v0.5

Fan Village, negozi, golf car, indicazioni e FITP Trophy Tour sono descritti in [v0.5-village.md](v0.5-village.md).
