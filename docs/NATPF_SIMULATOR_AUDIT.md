# NATPF Simulator — audit completo e piano di intervento

Data: 15 ottobre 2026  
Branch di audit: `feature/natpf-simulator-gameplay-audit`  
Base tecnica esaminata: `claude/lucid-cannon-us9l0g` (v0.8)  
Stato: audit statico e prima implementazione phone-only/gameplay completati nel branch. I test unitari Node passano in GitHub Actions; E2E browser e prove su dispositivi reali non sono ancora stati eseguiti.

## 1. Decisioni di prodotto

- Nome pubblico del gioco: **NATPF Simulator**.
- Il controller di gioco è esclusivamente lo smartphone, collegato via QR code e browser HTTPS.
- Mouse e tastiera non sono modalità alternative per giocare. Restano utilizzabili per navigazione, nome, avvio, copia link e gestione della pagina.
- Il personaggio si muove automaticamente per mantenere il focus su timing, lettura della palla e qualità del gesto.
- La prima modalità competitiva da validare è 1 contro 1 contro CPU; la partita tra amici resta subordinata a stabilità, latenza e test cross-network.
- Palla corta, lob e slice sono presenti come prototipi euristici; le soglie vanno validate sui telefoni reali prima di considerarli feature stabili.

## 2. Sintesi esecutiva

La base tecnica è più avanzata di un semplice prototipo: include fisica e regole separate dal rendering, partita arcade, CPU, collegamento del telefono, calibrazione, sincronizzazione temporale, modalità tra amici e test automatici/E2E. I rischi principali non sono l'assenza di infrastruttura, ma l'esperienza reale del colpo e l'affidabilità delle interazioni.

Priorità:
1. rendere NATPF Simulator phone-only senza lasciare scorciatoie mouse/tastiera;
2. verificare input, calibrazione, timing e riconoscimento dei gesti su iPhone e Android reali;
3. separare qualità del contatto, direzione, potenza e scelta del colpo;
4. rendere palla corta, lob e slice leggibili e riconoscibili senza gesti troppo simili;
5. migliorare CPU e movimento per trasformare gli angoli in pressione tattica;
6. misurare durata dei rally, precisione, errori e skill gap;
7. chiudere gli aspetti di sicurezza, telemetria privacy-preserving, deploy e autorizzazioni di marchi/asset.

## 3. Architettura e componenti

### Gioco e pagina
- `site/tennis/index.html`: UI di gioco, onboarding, controller selection, lobby, HUD, pausa e fine partita.
- `site/tennis/racchetta.html`: UI mobile per pairing, sensori, calibrazione e feedback.
- `site/js/tennis/main.js`: orchestration delle schermate, match loop, eventi, input, pairing e multiplayer.
- `site/js/tennis/controls.js`: accetta solo swing e lancio normalizzati dal collegamento smartphone; non registra eventi di gioco da mouse o tastiera.
- `site/js/tennis/link.js`, `pairing.js`, `session.js`, `net.js`: collegamento, inviti, sessione e sincronizzazione.
- `site/js/tennis/swing-detect.js`, `calibration.js`: riconoscimento e calibrazione del movimento.
- `site/js/match/arcade.js`: timing, impatto, scelta del colpo del giocatore, movimento automatico, CPU.
- `site/js/match/ai.js`, `physics.js`, `core.js`, `rules.js`: bersagli, traiettorie, partita e regole.
- `tools/test/tennis.test.mjs`, `tools/test/match.test.mjs`: test deterministici di logica.
- `tools/e2e/phone-cal.mjs`, `phone-failures.mjs`, `invite.mjs`: E2E simulati per pairing, sensori e partita tra amici.

### Rischio architetturale
L'astrazione è stata semplificata nel branch: gli input mouse/tastiera non vengono più registrati dal modulo di gioco, la scelta del controller è stata rimossa e i test E2E coprono il rifiuto degli input desktop. Restano da verificare le regressioni in browser e nella partita tra amici.

## 4. Rilievi P0 — blocchi prima del rilascio

### P0.1 — Controller non coerente con il prodotto ✅ implementazione nel branch
**Rilievo sulla base v0.8:** l'interfaccia esponeva una modalità mouse/tastiera, i controlli ascoltavano input desktop e i guasti del sensore proponevano un fallback incompatibile con il prodotto.

**Implementato nel branch:** la UI non presenta più la scelta mouse/tastiera; i controlli di gioco accettano solo eventi dal telefono; un sensore non disponibile lascia il gioco in attesa, con istruzioni per riprovare. I pulsanti e i click desktop restano utilizzabili per navigare la UI, non per colpire o muovere il giocatore.

### P0.2 — Validazione fisica non ancora dimostrata
La documentazione del progetto dichiara test con sensori simulati e lascia come attività la prova su telefoni reali. Il test unitario in CI verifica la logica deterministica, non il comportamento del sensore fisico.

**Intervento:** test su almeno iPhone/Safari e Android/Chrome, HTTPS, permessi negati/riabilitati, cambio orientamento, tab in background, schermo bloccato, disconnessione e riconnessione. Verificare che il telefono resti impugnabile in sicurezza: evitare gesti che richiedono di lanciare il dispositivo o rotazioni innaturali.

### P0.3 — Timing e direzione sono accoppiati ✅ separati nel branch
**Rilievo sulla base v0.8:** `arcadeShot()` derivava l'angolo dall'errore temporale e combinava la mira del mouse. Ora la direzione calibrata del gesto determina un bersaglio a sinistra, centro o destra; il timing modifica qualità, rischio e ritmo, non la direzione.

**Intervento:** distinguere:
- timing → qualità del contatto, precisione e velocità;
- asse/direzione del gesto calibrato → angolo desiderato;
- intensità dello swing → potenza;
- gesto speciale riconosciuto → famiglia di colpo;
- posizione e altezza d'impatto → difficoltà e rischio.

La direzione del telefono deve essere relativa e calibrata, non presentata come misurazione assoluta del bersaglio nello spazio.

### P0.4 — Errori non sempre interpretabili
Il codice introduce dispersione tramite errore e casualità; la CPU ha probabilità di errore e pressione dipendente dalla lunghezza del rally. Questo può accorciare gli scambi, ma rischia di far sembrare casuali sia gli errori umani sia quelli della CPU.

**Intervento:** determinismo per gli stessi input nel modello di colpo umano; variabilità controllata solo dove serve. Un colpo difficile deve richiedere più precisione, non fallire senza una causa comprensibile.

## 5. P1 — Gameplay e skill gap

### P1.1 — Colpi base
Modellare un colpo come combinazione esplicita di:
- timing;
- direzione del gesto;
- intensità;
- altezza del punto d'impatto;
- bersaglio desiderato;
- stato di equilibrio/posizione stimabile dal gioco.

Il modello non deve usare la stessa variabile per rappresentare più dimensioni del gesto.

### P1.2 — Colpi speciali

La prima implementazione è presente nel branch, ma resta sperimentale fino a test su iPhone e Android. Le soglie sono euristiche del rilevatore, non ancora validate su hardware reale:

1. **Palla corta (drop shot)** — prototipo implementato: gesto breve (fino a 180 ms) e a potenza contenuta, con componente verticale quasi neutra; bersaglio corto e ritmo ridotto. È una euristica: misurare falsi positivi prima di renderla definitiva, perché la durata dello swing può variare fra dispositivi e giocatori.
2. **Lob** — prototipo implementato usando il componente ascendente del gesto; traiettoria più alta, tempo di volo maggiore e bersaglio profondo. Va verificata la distinzione da un drive con accelerometro diverso.
3. **Slice / colpo tagliato** — prototipo implementato con componente discendente, ritmo minore e traiettoria più bassa. Non applica ancora uno spin laterale realistico: non presentarlo come simulazione biomeccanica completa.
4. **Smash** — mantenere il riconoscimento contestuale già presente: palla alta e in posizione attaccabile. Evitare di classificare come smash qualsiasi swing sopra una soglia d'altezza senza considerare la posizione rispetto alla rete.

Per ogni colpo servono: indicatore/feedback sul telefono, feedback sul campo, parametri di traiettoria, rischio di errore, test di classificazione e alternativa accessibile per chi non riesce a eseguire il gesto.

### P1.3 — Angoli e pressione
- **Implementato:** gli angoli dipendono dal gesto calibrato (sinistra/centro/destra), indipendentemente dal timing.
- **Implementato in forma iniziale:** il rischio aumenta con l'angolo richiesto. Il bilanciamento della precisione e la relazione con il punto d'atterraggio vanno misurati.
- Il buon timing aumenta la precisione e la velocità utile.
- Un incrociato efficace sposta l'avversario; una risposta in allungo è più corta o meno precisa.
- Il giocatore può chiudere il punto attaccando una palla corta.
- Evitare un limite artificiale di colpi per rally.

### P1.4 — CPU tattica
La funzione `cpuShot()` varia mira, ritmo, profondità e famiglia di colpo. La CPU può usare drive, lob contro chi sale a rete, palla corta contro chi resta profondo e slice; i livelli più alti variano più spesso. Negli scambi prolungati tende maggiormente a cercare l'attacco invece di aggiungere errori casuali per forzare il punto. Il bilanciamento resta da misurare.

- **Facile:** reazione più lenta, maggiore tolleranza, lascia spazio.
- **Normale:** recupera il centro e punisce palle corte/deboli.
- **Esperto:** recupero e lettura migliori, contrattacco su palle comode, ma vulnerabile agli angoli e alle variazioni.

La CPU non deve anticipare il bersaglio prima del contatto. Il movimento deve seguire una traiettoria intercettabile e rispettare un tempo di reazione.

## 6. P1 — UX, accessibilità e feedback

- Ridurre il percorso al minimo: nome, livello, QR, attivazione sensori, calibrazione, partita.
- Non richiedere l'installazione di un'app.
- Calibrazione obbligatoria al primo avvio e ripetibile dalla pausa; conservare il profilo solo se la posizione di presa resta coerente.
- Stato di connessione sempre visibile, con istruzioni specifiche per errore.
- Durante il rally mostrare un feedback principale per volta: «Perfetto», «In ritardo», «Palla corta», «Lob», ecc.
- Sul telefono, feedback breve e leggibile senza costringere a guardare lo schermo durante lo swing.
- Evitare che i controlli per pausa o riconnessione interrompano silenziosamente una partita.
- Nessun fallback a mouse/tastiera quando il telefono non funziona: recupero guidato e spiegazione.

## 7. P1 — Multiplayer, rete e sincronizzazione

La modalità tra amici usa una sessione PeerJS/WebRTC con l'host che simula la partita e il guest che invia input. Va trattata come una seconda fase rispetto al gioco CPU.

Verifiche:
- due smartphone, non due controller diversi;
- host e guest con browser/device diversi;
- Wi-Fi domestico, rete mobile, NAT restrittivi, riconnessione;
- latenza e perdita di pacchetti;
- nessun input duplicato o accettato fuori dalla finestra del colpo;
- pausa, abbandono, rivincita e uscita da sessione;
- nessun blocco indefinito se il signaling server è irraggiungibile.

Prima di uso pubblico, valutare un signaling server controllato dal progetto; non esporre token di pairing riutilizzabili e mantenere token brevi, casuali e monouso.

## 8. P1 — Sicurezza, privacy e release

- Il gioco usa nome locale e pairing via URL/QR: verificare che i segreti del pairing vengano rimossi dall'URL dopo la lettura e non finiscano in log o analytics.
- Testare scadenza e riuso del token, origin non valido, payload input fuori range e messaggi WebRTC inattesi.
- Nessun account necessario per il prototipo; prima di introdurre account/classifiche, definire retention, consenso e gestione dei minori.
- Il repository contiene marchi e asset relativi a Nitto ATP Finals, FITP e all'arena. Verificare autorizzazioni prima di ogni pubblicazione pubblica o uso promozionale.
- Verificare HTTPS, noindex e accesso limitato: noindex non è controllo di accesso.
- Confermare la destinazione di deploy e il branch collegato alla produzione prima di unire modifiche.

## 9. Test plan

### Automatici (Node)
Eseguire:
```bash
node --test tools/test/*.test.mjs
```

Aggiungere test per:
- classificazione univoca di drive, drop, lob, slice e smash;
- colpo corto che atterra legalmente nel campo e resta raggiungibile;
- lob che supera l'avversario e non viene classificato come drive;
- slice con velocità/rimbalzo previsti;
- timing perfetto più preciso del timing errato, a parità di gesto;
- angolo stretto più rischioso del centro, a parità di qualità;
- nessun input mouse/tastiera che produca movimento o swing;
- servizi, let, fault, punteggio e fine match dopo le modifiche.

### E2E browser
- **Aggiornati nel branch:** `phone-only.mjs` verifica che mouse/tastiera non generino swing o movimento; `phone-cal.mjs` copre calibrazione/partita; `phone-failures.mjs` verifica il recupero senza controller alternativo.
- `cpu-mouse.mjs` è stato rimosso come test di gameplay.
- Da eseguire: E2E browser completi e `invite.mjs` con controller smartphone su host e guest.
- Verificare assenza di errori JavaScript e regressioni nelle schermate.

### Hardware reale
- iPhone Safari e Android Chrome;
- almeno 5 sessioni per dispositivo con calibrazione nuova;
- 10 rally per livello CPU e per famiglia di colpo;
- test con mani/dimensioni del telefono diverse, senza pretendere precisione assoluta dai sensori.

## 10. Metriche di accettazione

Raccogliere una baseline prima del bilanciamento. Non fissare target assoluti senza misurazione iniziale.

- mediana e 90° percentile di colpi per punto e durata del rally;
- percentuale di swing riconosciuti e falsi positivi;
- percentuale di timing perfetti/buoni/mancati;
- errore medio tra angolo richiesto e punto d'atterraggio;
- tasso di successo e riconoscibilità dei colpi speciali;
- risposte deboli della CPU dopo essere stata spostata;
- errori non forzati percepiti come casuali;
- win rate di principianti e giocatori esperti contro ogni livello;
- disconnessioni, latenza e input persi in multiplayer.

## 11. Ordine d'esecuzione raccomandato

1. **Completato nel branch:** rebranding visibile e phone-only enforcement.
2. **Completato:** aggiunti controlli unitari per timing/direzione/colpi e un workflow Node CI; test unitari superati.
3. Da eseguire: baseline su telefono reale e correzione del rilevatore/timing.
4. **Implementato e testato unitariamente:** timing separato da direzione; angoli a sinistra/centro/destra.
5. **Prototipi implementati:** palla corta, lob e slice; serve validazione hardware e tuning.
6. **Configurato:** livello CPU Esperto; serve bilanciamento e test moderati.
7. Da eseguire: multiplayer con due telefoni su reti differenti.
8. Da eseguire: test moderato con 5–10 persone e tuning in base ai dati.
9. Da eseguire: revisione asset/marchi, sicurezza e deploy prima della distribuzione.

## 12. Limiti dell'audit

Audit statico completato e test unitari Node superati in GitHub Actions (workflow `NATPF Simulator tests`, commit `c1546c00981ffec7b823fdde7d77d58c7b861c11`). I test E2E browser non risultano eseguiti in questa verifica; il funzionamento e le soglie dei gesti su iPhone/Android reali restano da validare.
