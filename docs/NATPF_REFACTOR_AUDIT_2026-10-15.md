# NATPF Simulator: audit e piano di refactoring incrementale

Data: 15 ottobre 2026. Base verificata: `a73299c01392d4beb415fb501557d61a96518587`, branch `feature/natpf-simulator-gameplay-audit`, PR #1 ancora in bozza. Branch dell'audit: `refactor/natpf-audit-20261015`.

## Stato iniziale dell’audit

Audit statico e diagnostica numerica completati sul percorso della modalità `/tennis/`. Nessuna modifica applicata al gameplay, nessun merge o deploy. Il refactoring verrà implementato per blocchi, con verifica dell'utente tra un blocco e il successivo, come richiesto. Non dichiarare il prodotto perfettamente funzionante sulla sola base dei test automatici.

Sono stati letti input, calibrazione, rilevamento swing, pairing, sessioni multiplayer, serializzazione/interpolazione, game loop, motore arcade, motore condiviso, fisica, IA, regole, scena, modello procedurale, camera, indicatore, pagine HTML, test e workflow di packaging. Non è un penetration test, un benchmark su hardware reale o una verifica visiva di una partita. Il mondo esplorabile e il padel sono dipendenze condivise da preservare, non oggetto di un redesign in questo intervento.

## Baseline eseguita

- `node --test tools/test/*.test.mjs`: **42/42 superati** con Node 24.19.0.
- Controllo sintattico con Node di tutti i 22 moduli in `site/js/tennis/` e `site/js/match/`: superato.
- `node tools/audit/contact-baseline.mjs green`: 81 scenari sintetici (3 frame rate × 3 posizioni X × 3 posizioni Z × 3 velocità). In 42 scenari il cue verde viene raggiunto prima della fine del punto; tutti e 42 danno `perfetto` con consegna dell'input dopo 60 ms.
- `node tools/audit/contact-baseline.mjs reach`: stessa griglia, swing al primo frame in cui distanza e quota soddisfano il criterio geometrico dell'indicatore, senza attendere il criterio temporale. 42 scenari raggiungono la condizione; 18 danno `anticipo`, 24 `perfetto`. Un caso restituisce -158,3 ms a distanza di 1,42 m. I 39 scenari senza attivazione non sono successi né fallimenti della sincronizzazione.
- Prova del tiro senza errore casuale: da `(0.7, 1.2, 11)` al bersaglio `(-3, -10)`, tempo richiesto 1,1 s e clearance 0,32 m; `aimShot` seguito da `stepBall` a 240 Hz produce primo rimbalzo `(-2.8803, -9.3207)`: scarto 0,690 m. Bersaglio corto `(-3, -2.1)`, tempo 1,4 s: rimbalzo `(-2.8486, -1.5641)`, scarto 0,557 m.

Questi numeri descrivono casi sintetici, non frequenze di errore dei giocatori. La prova sul verde NON riproduce un errore in anticipo quando il cue è verde. La prova geometrica riproduce invece la differenza fra «palla già raggiungibile» e «istante ideale accettato». Non attribuire automaticamente ogni errore segnalato dall'utente a una sola causa.

## Risultati per modulo

### 1. Mira e direzione — P1, con dipendenza dalla fisica dei bersagli

**Evidenza:** `arcadeShot()` in `site/js/match/arcade.js` usa `aimX = -gestureDir * .72`. Il campo `facing` e la rotazione Three.js del corpo non determinano il bersaglio. La causa ipotizzata nella segnalazione non è quindi confermata per gli scambi. Tuttavia `link.js` e il ricevitore host in `main.js` conservano soltanto `dir = -1, 0, +1`; `controls.js` forza `aim: null`. `swing-detect.js` calcola anche la proiezione continua `along`, che `racchetta.js` non trasmette. La mira si riduce a tre bersagli laterali fissi, circa ±2,423 m o centro, indipendentemente dalla finezza del gesto.

**Servizio:** `updateToss()` inoltra potenza, timing e `aim`, ma non `dir`. `serveShot()` ricava la mira dal timing e da rumore casuale quando `aim` è nullo. Il servizio non rispetta lo stesso controllo direzionale degli scambi.

**Intervento:** introdurre un contratto di input normalizzato con mira continua locale, potenza, tipo, timestamp e confidenza; conservarlo lungo telefono → host locale → ospite → host partita. Separare intenzione, qualità d'esecuzione e animazione. Conversione da coordinate locali a mondo una sola volta, basata sul lato del campo, mai sulla rotazione del busto. Unificare il comportamento del servizio, vincolandone il bersaglio al riquadro diagonale.

`along` è una proiezione dell'asse di velocità angolare, NON una misura assoluta del piatto corde. Non descriverla come precisione millimetrica dell'orientamento. Per una mira esplicita sul telefono si può aggiungere una zona touch, lasciando lo swing ai sensori; la scelta UX va fatta senza reintrodurre il controllo desktop.

### 2. Timing, collisione e rete — P0

**Errore certo nelle unità del multiplayer:** `stepGuest()` invia `M.seenAt(...)`, in secondi di partita. Il callback `H.on('input')` in `main.js` limita `s.at` fra `performance.now() - 1000` e `performance.now() + 1000`, valori in millisecondi dall'apertura della pagina. Infine `stepCore()` sottrae `core.t`, in secondi. Esempio: browser aperto da 60.000 ms, evento a 12 s di partita → l'host lo trasforma in 59.000, rendendolo enormemente futuro. Il problema non richiede una modifica dell'architettura WebRTC: va corretto l'adattatore temporale.

**Doppio criterio del contatto:** `predictContact()` cerca un futuro punto comodo raggiungibile, ricalcolato ogni 60 ms. `contact()` decide invece il contatto quando la palla attraversa il piano 40 cm davanti al giocatore, con portata laterale 2 m e quota 0,1–3,1 m. `sweet-spot.js` usa distanza radiale 0,3–1,55 m, altre quote e il tempo previsto. Il colore non è una funzione della stessa valutazione usata per giudicare lo swing.

**Storia incompleta:** `record()` registra solo la palla. Nell'interpolazione dell'attraversamento, palla precedente e corrente sono confrontate con la posizione corrente del giocatore. Durante gli spostamenti questo può alterare l'istante stimato. `resolve()` giudica il tempo storico ma usa giocatore corrente e riporta la palla indietro fino a 160 ms; l'ospite disegna con ritardo di 100 ms e la grace può arrivare a 500 ms. Le tolleranze non descrivono una sola politica temporale.

**Intervento:** estrarre `contact.js` e `input-time.js`; definire origine temporale e unità per ogni messaggio. Una stessa valutazione deve alimentare cue, contatto e feedback. Conservare la posizione del giocatore nella storia necessaria al giudizio. Definire in modo esplicito che cosa succede oltre il budget di latenza; non mascherare il problema aumentando tutte le finestre. Verificare dopo pause, ripresa, frame persi, due origini di orologio diverse e due client specchiati.

### 3. Camera — P1

`viewpoint.js` mantiene la camera a y=3,3 m e il target a y=2,1 m, z=±10. Dal fondo la differenza verticale è solo 1,2 m su circa 29 m di profondità: vista quasi orizzontale. `scene.js` imposta FOV 52° o 64° sotto aspect 1,1. La prospettiva del secondo giocatore è già invertita correttamente; non serve ruotare nuovamente il mondo.

**Intervento:** preset rialzato, target più basso e posizione stabile che mostri entrambi i fondocampo; adattare distanza/aspect insieme al FOV, evitando di limitarsi a un grandangolo verticale. Usare proiezioni dei vertici del campo per verificare l'inquadratura, più screenshot delle traiettorie. I valori finali vanno scelti nel browser, non dedotti da un test sul solo segno di camera.z.

### 4. Skill gap e fisica — P1 dopo timing e mira

`arcadeShot()` premia già il timing con ritmo ed errore minore, ma non usa lo stato di movimento/allungo per la qualità del tiro umano. Un giocatore sbilanciato ma entro la portata può ottenere lo stesso colpo di uno in equilibrio. `controls.read()` produce movimento nullo e corsa automatica: attualmente il giocatore NON può scegliere il posizionamento preventivo. Non attribuirgli un premio di abilità per una scelta compiuta automaticamente.

`movePlayers()` cambia direzione istantaneamente, senza accelerazione/frenata; la CPU ha alcune penalità di pressione, ma il modello di recupero è limitato. Gli errori gaussiani in `makeShot()` possono prevalere sul controllo percepito. `aimShot()` risolve un volo balistico senza drag, mentre `stepBall()` applica drag orizzontale: il bersaglio nominale non coincide con il rimbalzo anche quando la dispersione è nulla. Il solutore può inoltre allungare il tempo di volo per superare la rete, attenuando il vantaggio di potenza.

**Intervento:** mantenere l'integratore e correggere il calcolo del tiro con il medesimo modello; separare mira desiderata, bersaglio eseguito e dispersione. Introdurre qualità da timing e equilibrio, con effetti ripetibili prima del rumore residuo. Aggiungere una scelta semplice di recupero sul telefono se si vuole davvero skill di posizionamento; altrimenti dichiarare la corsa assistita e misurare lo skill su gesto e tattica. Per slice/lob/drop, attualmente cambia soprattutto la traiettoria; non esiste spin fisico della palla: non presentare lo slice come simulazione dello spin.

### 5. Portrait, calibrazione e UX — P1

L'architettura attuale è schermo principale sul computer + telefono controller. `main.js` intercetta gli smartphone e li indirizza al flusso mobile; `racchetta.html` è una pagina separata. L’utente ha chiarito che il portrait riguarda il controller: il campo resta sul computer.

La gravità verifica l'impugnatura durante la calibrazione, ma il controllo si può saltare e non c'è gestione continuativa dell'orientamento. Non sono presenti un blocco portrait o un fallback UI quando il lock non è supportato. Il controller usa height:100% e overflow:hidden; non basta una viewport mobile per garantire assenza di clipping. La HUD principale ha dimensioni minime e posizioni fisse che possono sovrapporsi su schermi stretti.

Il detector emette anche apertura e ritorno; è il motore a scegliere il candidato vicino al tempo previsto. L'euristica della palla corta usa durata fino all'emissione al picco, non durata dell'intero movimento. Uno swing breve e debole può quindi diventare una smorzata senza intenzione tattica. La calibrazione raccoglie due direzioni ma non prove etichettate di drop/lob/slice; la sensibilità attuale non dimostra l'assenza di falsi positivi. `feed()` limita artificialmente dt a 60 ms: dopo buchi lunghi nei campioni occorre una politica di reset, non integrare come se il flusso fosse continuo.

**Intervento:** calibrazione con qualità dei campioni, riposo/riarmo, soglie robuste per entrambe le direzioni e verifica di deriva; orientamento portrait richiesto quando disponibile, altrimenti messaggio «Ruota il telefono» e sospensione degli input fino al recupero. Non sospendere uno swing normale solo perché il telefono si inclina durante il gesto: distinguere orientamento dell'interfaccia e posa dinamica del sensore. Priorità a colpi speciali intenzionali e riconoscibili; possibilità di selezione touch prima dello swing se i sensori non li separano in modo affidabile.

Il lock dipende dal browser e dalle sue precondizioni; non è garantibile su ogni browser tramite JavaScript. Riferimento primario: https://www.w3.org/TR/screen-orientation/ .

### 6. Modello e animazioni — P1

La racchetta è già figlia del gomito dominante e la geometria è stata corretta nell'ultimo commit. Mancano però un vincolo mano/manico e un obiettivo spaziale per il piatto corde. `pose()` sceglie angoli predefiniti in base a tipo e lato; non riceve la direzione reale del tiro né il punto di contatto. `scene.js` orienta il personaggio verso la palla corrente anche dopo il colpo. L'effetto percepito come direzione vincolata al corpo può quindi essere aggravato dall'animazione, senza che il corpo comandi la fisica.

La scena colloca l'impatto a 0,12/0,30 = 0,40 dell'animazione; le curve del personaggio trattano 0,43 come impatto (differenza di 9 ms). Il punto fisico viene risolto prima che il rendering dimostri che le corde attraversino la palla. Gli snapshot trasportano tipo/lato/tempo ma non il vettore del tiro, il punto di contatto o il flag hit.

**Intervento:** introdurre un evento di contatto comune con tempo, punto, lato e vettore effettivo d'uscita; animazione di apertura → contatto → accompagnamento → recupero. Preservare la gerarchia, aggiungere un pivot mano/polso e risolvere spalla/gomito verso il punto di contatto entro limiti anatomici. I colpi speciali mantengono curve distinte. Se il modello procedurale resta troppo limitato, valutare un rig GLTF solo dopo prova visiva, senza sostituire l'asset prima di verificarne necessità e licenza.

## Rete, sicurezza, performance e distribuzione

- QR: il fix sintattico è presente. Gate con token monouso, chiave di ripresa e scadenza; non risulta da questo audit che il precedente errore sintattico sia ricomparso. La nuova connessione fisica non è stata testata qui.
- Trasporto: PeerJS pubblico e configurazione che non dichiara un TURN proprio. Non promettere connettività universale su reti mobili/restrittive; prima misurare gli esiti ICE e i timeout. Preservare trasporto e autorità dell'host.
- Validazione: ricevitore host accetta timestamp con `typeof number` senza escludere NaN/Infinity, code senza limite complessivo e movimento/auto modificabili dal pacchetto. Separare validazione da logica UI e accettare solo il contratto del controller previsto. Le chiavi di pairing non devono entrare in log diagnostici.
- Sessione: correggere i residui `mouse` nei metadati solo nel percorso tennis, senza eliminare i controlli di altri modi di gioco. Le code input e i timestamp devono essere invalidati a pausa, nuova partita e riconnessione.
- Rendering: `setPlayers()` rimuove i gruppi ma non dispone geometrie/materiali; flash e segni rimossi non vengono smaltiti completamente. La creazione di materiali/geometrie ripetuta può accumulare risorse GPU durante sessioni lunghe. Confermare con contatori risorse e una prova ripetuta.
- CPU: le previsioni producono numerosi campioni con allocazioni; l'IA e il giocatore calcolano traiettorie simili. Profilare prima di introdurre caching, preservando indipendenza dei pronostici.
- Asset: Three.js viene caricato da CDN, i font da Google; lo ZIP non è autonomo offline. Non cambiare hosting o dipendenze durante il blocco gameplay senza necessità.
- CI: il workflow ascolta solo push sul vecchio branch e PR verso main, mentre PR #1 ha un altro branch base. Il nuovo branch deve essere incluso nei trigger prima di affidarsi alla CI. `phone-only.mjs` verifica avvio, attributi del modello e rifiuto input desktop; non un collegamento completo e una partita reale. Gli script phone-cal/phone-failures/invite/invite-timing esistono, ma non sono eseguiti da quel workflow.
- Packaging: rilasciare solo artefatti del commit verificato, con index alla radice, JS e asset coerenti, hash/versione mostrabile e test della pagina controller. Non trattare noindex come controllo di accesso. Nessuna migrazione del nome del progetto Cloudflare è necessaria per modificare il nome visibile del gioco.

## Confini del refactoring e ordine dei blocchi

I moduli proposti non sostituiscono il motore di fisica né il modello host-authoritative. Il mondo mantiene coordinate assolute. I nuovi campi di rete devono essere opzionali oppure gestiti da una versione esplicita compatibile; nessuna inversione di coordinate fatta due volte.

| Blocco | File iniziali | Risultato verificabile |
| --- | --- | --- |
| 1 — contatto e tempo, priorità P0 | `tennis/main.js`, `tennis/net.js`, `match/arcade.js`, `tennis/sweet-spot.js`, `tennis/scene.js`; nuovi `tennis/input-time.js` e `match/contact.js` | Evento valutato nella giusta base temporale; stesso contatto per cue e motore; nessun anticipo sistematico nell'area visiva concordata, host e guest |
| 2 — mira | `tennis/swing-detect.js`, `racchetta.js`, `link.js`, `controls.js`, `main.js`, `match/arcade.js`; nuovo `match/shot-intent.js` | Mira continua e ripetibile, indipendente dal corpo; servizio direzionabile; stesso sinistra/destra nella prospettiva di entrambi |
| 3 — POV | `tennis/viewpoint.js`, `scene.js` | Campo e avversario leggibili a 16:9 e nelle viewport richieste, identico orientamento locale P1/P2 |
| 4 — qualità del tiro e tattica | `match/arcade.js`, `ai.js`, `physics.js`, `core.js`; nuovo `match/shot-quality.js` | Timing/equilibrio/tattica premiano in modo misurabile; bersaglio nominale coerente con volo simulato; gli angoli creano occasioni di chiusura |
| 5 — portrait e sensori | `tennis/racchetta.js`, `calibration.js`, `swing-detect.js`, `racchetta.html`, eventuale HUD `index.html` | Flusso portrait chiaro, nessun clipping nelle viewport verificate, distinzione gesti misurata su dispositivi fisici |
| 6 — personaggio | `tennis/character.js`, `scene.js`, `net.js`, evento in `match/arcade.js` | Mano solidale al manico, corde al punto di contatto, accompagnamento coerente col vettore reale per tutti i colpi e i due lati |

Il blocco timing precede la mira perché il bug delle unità impedisce di giudicare correttamente qualsiasi modifica sul secondo giocatore. Ogni blocco include i test necessari e un pacchetto provabile; si attende poi la conferma di funzionamento dell'utente prima di modificare il successivo.

## Criteri di accettazione

1. Test di input completo: telefono normalizzato → link → controls → conversione guest → ricevitore host → risoluzione; timestamp in secondi/millisecondi verificati anche dopo 60 s, pausa e nuova partita. Dati non finiti rifiutati.
2. Timing: scenari a 30/60/120 Hz, jitter e ritardi controllati; cue verde e giudizio condividono lo stesso istante e la stessa geometria. Un frame mostrato all'ospite deve essere giudicato nel tempo corrispondente, senza doppia compensazione.
3. Mira: stessa intenzione e stesso stato fisico con rotazioni del modello differenti producono stesso bersaglio. Monotonia sinistra-centro-destra e inversione locale P2 corrette. Input analogico conservato lungo tutta la rete.
4. Fisica: primo rimbalzo del tiro senza dispersione vicino al bersaglio entro una tolleranza dichiarata prima del test; net clearance, drop, lob, servizio, falli e doppio rimbalzo verificati con l'integratore reale.
5. Skill: confronti con seed uguali fra qualità di esecuzione, tattica e posizioni differenti; distribuzioni di colpi per punto e risposte difensive. I risultati sintetici non sostituiscono la prova principianti/esperti.
6. Sensori: tracce reali anonimizzate per iPhone/Safari e Android/Chrome, gesti normali e speciali, apertura/ritorno, camminata, tremolio, rotazione, ripresa; matrice di confusione e falsi positivi, senza promettere lo zero assoluto.
7. Visuale: screenshot/video dritto-rovescio, cinque colpi, entrambi i lati; errore spaziale e temporale delle corde rispetto alla palla misurato, oltre alla valutazione di naturalezza.
8. Rilascio: regressioni Node, sintassi completa, E2E pertinenti e manifest del pacchetto. Esiti fisici lasciati esplicitamente in attesa finché l'utente non li prova.

## Chiarimento di prodotto ricevuto

Confermato dall’utente: campo sul computer e telefono come racchetta; il portrait riguarda il controller. Per il POV il riferimento è Nintendo Switch Sports Tennis, con visuale rialzata e profonda. Il posizionamento preventivo richiederà una scelta effettiva sul telefono, oppure resterà dichiaratamente automatico.

Implementazione e verifica del primo blocco: [checkpoint del 16 ottobre](NATPF_TIMING_BLOCK1_2026-10-16.md). Gli altri blocchi attendono la conferma di funzionamento del precedente.
