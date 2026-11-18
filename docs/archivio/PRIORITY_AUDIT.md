# Audit tecnico e priorità — Foro Italico World

Data: 15 ottobre 2026  
Branch di riferimento analizzato: `claude/lucid-cannon-us9l0g`  
Branch di lavoro per questo audit: `analysis/priorities-audit-v2`

## Correzione dell'ambito

La prima analisi era stata eseguita sul branch `main`, che contiene un prototipo v0.1 con esplorazione del Foro e sfida al servizio. Non rappresenta lo stato più avanzato del progetto. Il branch `claude/lucid-cannon-us9l0g` contiene un progetto molto più esteso (README v0.8) e la modalità centrale per questa richiesta: **Racchetta**, tennis arcade 1v1 con smartphone usato come racchetta.

## Stato rilevato nel branch di sviluppo

Dalla documentazione e dai file letti risultano presenti:
- Pagina desktop dedicata `site/tennis/` e pagina telefono `site/tennis/racchetta.html`.
- Associazione telefono-computer tramite QR, sessione di pairing e rilevamento dei sensori.
- Calibrazione guidata con controllo dell'impugnatura, sei swing, profilo personale e conferma prima di giocare.
- Rilevatore di swing separato (`site/js/tennis/swing-detect.js`) e motore arcade (`site/js/match/arcade.js`) che giudica il colpo rispetto al momento in cui arriva la palla.
- Partita contro CPU, input da mouse/tastiera e partita tra amici via link, con WebRTC/PeerJS (`session.js`, `net.js`).
- Test automatici Node per i moduli di gioco e prove browser Playwright documentate in `tools/e2e/`.

La documentazione v0.8 dichiara che il progetto ha superato una precedente versione 1v1 dopo una prova utente, con interventi specifici su ritardo dei colpi, swing laterali e potenza incoerente. Questo è un segnale importante: non si tratta di partire da zero, ma di verificare che il percorso end-to-end sia affidabile.

**Limite dell'audit:** ho letto i documenti e parti dei moduli e degli script di test; non ho eseguito i test, l'app in browser né prove con telefoni reali. I risultati descritti nei documenti sono quindi riportati come dichiarazioni del repository, non come verifiche indipendenti svolte in questa sessione.

## Priorità raccomandate

### P0 — Proteggere e chiarire la linea di sviluppo
- `main` è ancora indicato nel README come v0.1, mentre il branch di sviluppo descrive v0.8 con una struttura e funzionalità molto più avanzate.
- Prima di qualsiasi intervento funzionale, stabilire se il branch `claude/lucid-cannon-us9l0g` è la linea di sviluppo attiva e quale strategia si userà per portare il lavoro in `main`.
- Non fare merge né deploy automatici in questa fase. L'audit corrente è su un branch separato.

### P0 — Eseguire e registrare la prova end-to-end del telefono come racchetta
- Eseguire `tools/e2e/phone-cal.mjs`: QR, pairing, permessi sensori, calibrazione, partita, feedback del colpo, ricalibrazione e riconnessione.
- Eseguire `tools/e2e/phone-failures.mjs`: sensori assenti, permesso negato, swing troppo piccoli, disconnessione e server di segnalazione non raggiungibile.
- Provare su almeno un iPhone Safari e un Android Chrome reali, via HTTPS. La simulazione Playwright non sostituisce il giroscopio e i permessi reali.
- Registrare browser/dispositivo, passaggi, risultato, latenza percepita e video o screenshot dei difetti riproducibili.

### P0 — Validare la qualità percepita del colpo
- Verificare con utenti che apertura, swing e ritorno del braccio non generino colpi fantasma.
- Controllare direzione e potenza sia per dritto sia per rovescio, con movimenti laterali e diversi stili di impugnatura.
- Misurare il ritardo tra swing fisico e feedback a schermo; controllare che il colpo sia giudicato sul tempo della palla e non solo sul picco del sensore.
- La calibrazione deve fallire in modo comprensibile se i movimenti sono insufficienti e non deve avviare una partita con un profilo non confermato.

### P1 — Verificare il gioco completo contro CPU
- Eseguire `tools/e2e/cpu-mouse.mjs` e la prova con telefono.
- Verificare servizio, scambi, punteggio, fine partita, rivincita, pausa e ricalibrazione.
- Verificare i livelli Facile e Normale: la CPU deve tenere scambi credibili ma non infiniti, senza errori casuali frustranti.
- Confrontare l'esperienza con l'obiettivo dichiarato: telecamera alle spalle, movimenti e ritmo ispirati al gioco di riferimento con il controller di movimento, senza usarne gli asset.

### P1 — Verificare multiplayer tra amici e resilienza
- Eseguire `tools/e2e/invite.mjs`: invito, join, QR sul computer del secondo giocatore, partita reale, esclusione del terzo utente, riconnessione e fine partita.
- Effettuare una prova su due reti diverse, ad esempio Wi-Fi e rete mobile. La documentazione segnala che questa verifica reale è ancora da fare.
- Testare disconnessione dell'host/ospite, latenza, riapertura del link e disponibilità del servizio PeerJS.
- Per uso pubblico o con minori, rivalutare esposizione dell'indirizzo IP in connessioni WebRTC dirette e dipendenza dal servizio pubblico di segnalazione.

### P1 — Performance e compatibilità
- Misurare FPS, tempi di caricamento e memoria su dispositivi medi, anche con arena completa.
- Verificare comportamento in background, rotazione del telefono, blocco schermo e perdita/ripristino dei permessi.
- Verificare i fallback a mouse e tastiera in caso di sensori non disponibili.
- Rendere chiaro che la modalità telefono richiede HTTPS e un browser con sensori di movimento supportati.

### P2 — Rifiniture dopo la validazione
- Usare un breve test moderato con 5–10 utenti per verificare che QR, impugnatura, calibrazione e primo scambio siano comprensibili senza assistenza.
- Correggere solo i punti osservati e misurati; evitare nuove modalità o feature prima di avere una baseline affidabile.
- Preparare una preview condivisibile e una checklist di rilascio; autorizzazioni e uso di marchi/immagini restano da verificare prima di un lancio pubblico.

## Sequenza operativa proposta

1. Confermare il branch di sviluppo come base e tenere separato `main`.
2. Eseguire i test automatici Node e le prove browser Playwright documentate.
3. Provare la modalità telefono su iPhone e Android reali via HTTPS.
4. Risolvere i bug P0 e ripetere gli stessi test come regressione.
5. Verificare partita tra amici su reti diverse e documentare i limiti.
6. Solo dopo, decidere quando e come integrare il branch di sviluppo in `main`.

## File di riferimento esaminati

- `README.md` (v0.8, branch di sviluppo)
- `docs/v0.8-racchetta.md`
- `docs/v0.7-tennis-racchetta.md` (storico della versione precedente)
- `docs/v0.6-multiplayer.md`
- `site/tennis/index.html`
- `site/tennis/racchetta.html`
- `site/js/tennis/swing-detect.js`
- `site/js/tennis/calibration.js`
- `site/js/tennis/session.js`
- `site/js/tennis/net.js`
- `site/js/match/arcade.js`
- `tools/e2e/README.md` e script E2E associati
