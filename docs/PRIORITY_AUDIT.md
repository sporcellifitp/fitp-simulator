# Audit tecnico e priorità — Foro Italico World

Data: 15 ottobre 2026  
Branch: `analysis/priorities-audit`  
Ambito: revisione statica di `README.md`, `ROADMAP.md`, `index.html` e configurazione visibile del repository. Non è stata eseguita una sessione di gioco su dispositivi reali.

## Sintesi

Il progetto è un prototipo browser giocabile e coerente con l'obiettivo esplorativo: mondo 3D procedurale, esplorazione desktop/mobile e minigioco di servizio, senza build né backend. La priorità non è aggiungere subito molti contenuti: è rendere affidabile la base geografica e verificare l'esperienza reale su dispositivi, prima di espandere il gioco.

## Priorità raccomandate

### P0 — Validare il prototipo su dispositivi reali
- Provare avvio, caricamento Three.js da CDN, movimento, collisioni, joystick, rotazione camera, minigioco e ritorno all'esplorazione su Android e iPhone; verificare almeno un desktop.
- Misurare tempo al primo ingresso giocabile, frame rate percepito, memoria/riscaldamento e comportamento dopo cambio scheda o rotazione del telefono.
- Registrare i problemi con dispositivo/browser, passi per riprodurli e gravità.
- Motivazione: il README dichiara dipendenza dalla rete/CDN e la roadmap segnala che i test su telefoni non sono ancora stati eseguiti.

### P0 — Ricostruire e verificare la planimetria
- Stabilire una fonte di riferimento unica: dati OpenStreetMap e mappa ufficiale IBI, con attribuzione/licenza ODbL dove applicabile.
- Separare i dati geografici (coordinate, dimensioni, nomi e categorie degli impianti) dal rendering Three.js, evitando di mantenere la mappa come coordinate sparse nel codice.
- Verificare orientamento, distanze, ingressi, percorsi e posizione relativa dei campi con una checklist visuale.
- Motivazione: la roadmap stessa identifica la planimetria indicativa come problema principale. Aggiungere nuovi minigiochi prima di correggerla moltiplicherebbe il lavoro da rifare.

### P1 — Introdurre un controllo minimo di qualità
- Aggiungere una checklist di smoke test ripetibile: avvio, esplorazione, collisioni, interazione POI, 10 servizi, punteggio/record, uscita e riavvio.
- Correggere il possibile falso messaggio di nuovo record: in `endGame()` il confronto usa `G.score >= best` dopo aver calcolato `best = Math.max(getBest(), G.score)`; un punteggio pari al record può quindi essere etichettato come nuovo record.
- Verificare la gestione degli errori quando Three.js/CDN non è raggiungibile e mostrare un messaggio chiaro all'utente.
- Motivazione: attualmente il repository non espone test automatici o una pipeline di verifica visibile; il gioco è concentrato in un singolo file HTML.

### P1 — Rendere il codice più facile da evolvere
- Dopo la stabilizzazione geografica, suddividere gradualmente `index.html` in moduli: scena/rendering, mappa e asset, movimento/collisioni, POI/UI, minigiochi e persistenza.
- Mantenere il prototipo senza build finché è utile, ma aggiungere almeno controlli automatici di sintassi e una checklist manuale documentata.
- Evitare una riscrittura architetturale completa prima di avere misure di performance e un secondo minigioco definito.

### P1 — Definire per chi e per cosa si gioca
Prima di introdurre login, classifiche e premi, decidere:
- target principale (bambini/famiglie o community eSports 16+);
- metrica del pilota (es. sessioni completate, ritorno, partecipazione agli eventi o acquisizione myFITP);
- ruolo di sponsor e premi;
- requisiti di tutela dei minori e dati raccolti.
Queste decisioni sono già elencate come aperte nella roadmap e influenzano UX, analytics e integrazioni.

### P2 — Aggiungere il padel come vertical slice
- Ricostruire prima un campo con proporzioni 10 × 20 m, pareti di vetro e rete metallica.
- Implementare un solo minigioco breve (la roadmap propone «Il vetro») e provarlo con utenti prima di aggiungere altri minigiochi.
- Solo dopo la validazione, espandere la collezione di attività e premi.

### P2 — Preparare una preview condivisibile
- Attivare Cloudflare Pages o una soluzione approvata FITP, con accesso limitato come indicato nella roadmap.
- Verificare prima dominio, autorizzazioni e materiali utilizzabili: il README e la roadmap segnalano che nomi, marchi e immagini del Foro/torneo richiedono autorizzazioni per un uso pubblico.
- Documentare dipendenze esterne, attribuzioni e procedura di pubblicazione.

## Rischi tecnici da tenere sotto controllo

- **Dipendenze esterne runtime:** Three.js e font vengono caricati da CDN; la disponibilità della rete è parte del funzionamento. Valutare fallback o hosting controllato per la preview FITP.
- **Prestazioni mobile:** ombre, antialiasing, texture generate via canvas e numerose istanze 3D possono avere costi variabili sui dispositivi meno potenti; misurare prima di ottimizzare alla cieca.
- **Manutenibilità:** logica, UI, scena, mappa e minigioco sono concentrati in `index.html`; l'aggiunta di modalità aumenta il rischio di regressioni.
- **Accuratezza e diritti:** la mappa è dichiaratamente indicativa; dati geografici, nomi, marchi e immagini devono essere verificati e attribuiti/autorizzati.
- **Qualità del punteggio:** il messaggio di nuovo record può essere errato quando si eguaglia il record precedente.

## Piano operativo suggerito

1. Eseguire smoke test desktop e mobile e aprire un elenco di bug riproducibili.
2. Completare una prima planimetria verificata e isolare i dati della mappa dal rendering.
3. Correggere il messaggio del record e introdurre controlli minimi ripetibili.
4. Fare una prova con 5–10 utenti del target scelto, raccogliendo osservazioni su orientamento, controlli e motivazione a rigiocare.
5. Solo allora realizzare il primo campo/minigioco di padel.

## Limiti dell'audit

È una revisione statica del codice e della documentazione accessibili su GitHub. Non sono stati eseguiti test runtime, benchmark, controlli di accessibilità completi, scansioni di sicurezza o verifiche dei permessi/licenze dei materiali esterni.
