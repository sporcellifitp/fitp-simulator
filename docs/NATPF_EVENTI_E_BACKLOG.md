# NATPF Simulator · analisi dei flussi, gameplay, modalità per eventi e backlog

Documento di lavoro dopo la prova dello zip `c0854d9`. Le parti 1 e 2 sono già nel nuovo zip, le parti 3 e 4 sono
proposte e backlog da approvare.

## 1. Flussi rivisti dall'inizio alla fine (visitatore che non sa nulla)

Scenario di riferimento: stand in fiera o evento pubblico, schermo grande, coda di persone, un addetto non sempre
presente, ogni visitatore vede il gioco per la prima volta e ha 2–4 minuti.

### Cosa non andava

| # | Problema trovato | Causa | Correzione |
|---|---|---|---|
| 1 | La partita dietro il menu «partiva da sola» | Dietro il menu gira una dimostrazione; qualsiasi gesto riconosciuto (webcam accesa nella preparazione, telefono già pronto, tastiera) la trasformava in una partita vera | Con il menu aperto nessun colpo arriva al motore, da nessuna racchetta. Etichetta «Dimostrazione · nessuna partita in corso» |
| 2 | Allenamento non saltabile | «Salta» compariva solo dopo aver completato l'allenamento | «Salta il riscaldamento» è sempre visibile in campo. Con il telefono non ancora calibrato si passa alla **modalità semplice** (dritto e rovescio li sceglie il gioco) |
| 3 | Calibrazione e allenamento separati | La calibrazione era un pannello sopra il menu, l'allenamento una tappa dopo | Sono una cosa sola: la calibrazione si fa **in campo**. Ogni gesto chiesto dal telefono è una palla vera: la palla rallenta, si ferma davanti alla racchetta e riparte quando il gesto è riconosciuto. Poi la calibrazione si conferma da sola e arrivano le palle vere |
| 4 | Telefono in orizzontale scomodo | — | Tolto: si gioca solo in verticale (anche sulla pagina del telefono la scelta non c'è più) |
| 5 | Istruzioni come tre schede che sembrano tappe | Le schede erano la prima tappa del menu | Guida «Come si gioca» in una finestra unica: sei righe sempre visibili, ognuna con una **clip del gioco vero** animata e due frasi («Tu» / «In campo»), per smartphone, webcam o mouse |
| 6 | Tappe in alto cliccabili ma bloccate, «Avanti» spento senza spiegazione | Menu a tappe da sbloccare | Barra di avanzamento non cliccabile, una pagina alla volta con **un pulsante grande**, «Indietro» sempre visibile |
| 7 | Il QR stava in un pannello separato da aprire | «Collega e calibra» apriva un pannello | QR direttamente nella pagina «Collega», con tre passi che si spuntano da soli: inquadra il QR → tocca «Attiva i sensori» → impugna in verticale. Appena i sensori sono attivi si entra in campo **da soli** |
| 8 | Chi ritornava ripartiva dalla partita | Pensato per un solo giocatore a casa | Ogni visitatore riparte dal benvenuto; durata predefinita 1 game |

### Il percorso nuovo

1. **Benvenuto**: «Il tuo telefono è la racchetta», pulsante grande «Gioca», secondario «Come si gioca».
2. **Con cosa giochi?** Smartphone o webcam: toccare la tessera porta già avanti. Mano destra o sinistra.
3. **Collega**: QR grande e tre passi che si spuntano; link «Non hai il telefono? Usa la webcam». Con la webcam:
   anteprima e «mano vista».
4. **Riscaldamento in campo** (saltabile in ogni momento):
   - telefono fermo in verticale per un attimo;
   - quattro palle, dritto e rovescio alternati: la palla si ferma e un grande gesto animato mostra cosa fare;
     «Un po' più deciso» / «Dall'altra parte» se il gesto non va; dopo due calibrazioni fallite si propone la modalità
     semplice;
   - palle vere: dritto 2, rovescio 2, servizio 1, angoli 3 (con il tempo del colpo).
5. **Partita**: CPU facile, CPU esperta o sfida un amico; durata; visuale; «Gioca». C'è anche «Rifai il riscaldamento».

Casi limite verificati: menu riaperto con il telefono già collegato (non rientra in campo da solo), «Indietro» dalla
partita torna al collegamento, «Come si gioca» aperto in partita mette in pausa e non propone il riscaldamento.

## 2. Gameplay: colpi diversi e skill gap

### Perché la palla andava quasi sempre nello stesso punto
Con il telefono in verticale la direzione dipendeva quasi solo dal verso del gesto (dritto/rovescio): un dritto
finiva sempre a circa 1,3 m dal centro. Inoltre l'istante vero del colpo misurato dal telefono non veniva usato, e la
forza era relativa alla propria calibrazione: il colpo più forte di un bambino valeva quanto quello di un tennista.

### Il modello nuovo (telefono in verticale)
- **Tempo vero del colpo** = istante del picco sul telefono (con gli orologi allineati), non l'arrivo del messaggio.
- **Direzione come nel tennis vero**: un attimo prima dello sweet spot → incrociato, un attimo dopo → lungolinea.
  La finestra è più larga contro la CPU facile (0,2 s) e più stretta contro quella esperta (0,15 s).
- **Polso**: la rotazione del manico all'impatto, rispetto al proprio dritto della calibrazione, apre o chiude l'angolo.
- **Forza**: metà dal gesto rispetto alla propria calibrazione, metà dalla velocità vera del telefono (°/s).
- **Profondità** dalla forza: un gesto lento resta a metà campo e la CPU attacca; uno veloce va in fondo ma rischia.
- **Colpi speciali** rispetto al proprio dritto: dal basso verso l'alto lob, dall'alto verso il basso tagliato, tagliato
  e lento palla corta.
- **CPU**: gli errori crescono con la pericolosità del colpo (forza e profondità), non più con la sola durata dello
  scambio; sulle palle corte e lente la CPU attacca.

### Risultati della simulazione
Ottenuti con la simulazione del motore (`npm run audit:rally`), 450 punti per profilo. Sono un banco di prova
deterministico, non misure su persone reali.

| Profilo | CPU facile: punti vinti | CPU esperta: punti vinti | Distanza media dal centro |
|---|---|---|---|
| Tennista (tempo preciso, polso, gesto veloce) | 97% | 91% | 3,0 m |
| Amatore | 90% | 71% | 2,2 m |
| Bambino (tempo a caso, gesto lento) | 65% | 38% | 1,6 m |

Da verificare con telefoni veri: la soglia del polso, la velocità tipica (°/s) di un dritto da tennista e quanto
«prima» e «dopo» vengono naturali.

## 3. Modalità per fiere ed eventi (proposte)

Tutte riusano il riscaldamento (lanciapalle, niente avversario) e durano 45–90 secondi. Così la coda scorre e c'è una
classifica da mostrare.

| Modalità | Come funziona | Perché funziona in fiera | Sforzo |
|---|---|---|---|
| **Radar del servizio** | 3 servizi, conta il più veloce in km/h (il motore li misura già e li mostra sui tabelloni dell'arena) | Semplicissima da capire, competitiva, «battere il record del giorno» | Basso |
| **Bersagli 60"** | Zone luminose sul campo (angoli, lungolinea, palla corta); ogni bersaglio colpito vale punti, i bersagli cambiano | Premia la precisione (il nuovo skill gap), spettacolare da guardare | Medio |
| **Scambio infinito** | Il lanciapalle accelera; quanti colpi di fila dentro il campo | Facile per tutti, chi è bravo dura di più | Basso |
| **Sfida il campione** | Tie-break a 3 punti contro la CPU esperta | Momento «evento» con il pubblico che fa il tifo | Basso |
| **Duello di stand** | Due telefoni, due visitatori, 1v1 da 1 game sullo stesso schermo diviso o su due postazioni | Coinvolge amici e coppie | Medio (c'è già il 1v1 su due computer) |
| **Precisione a turni** | Il presentatore chiama «incrociato!» / «lungolinea!»; vince chi esegue di più | Animazione dal palco | Medio |

Funzioni di contorno per l'evento:
- modalità **chiosco**: dopo 30 s senza nessuno si torna al benvenuto e il telefono si scollega da solo;
- **classifica del giorno** a schermo intero tra una partita e l'altra (nickname, punteggio, ora);
- **pannello dell'addetto** nascosto (tasto o combinazione): azzera classifica, scollega il telefono, cambia
  modalità, volume;
- **telefoni dello stand** (per chi non vuole usare il proprio): QR fisso stampato e telefono legato con un laccetto;
- fine partita con **QR per ricevere il risultato** (si collega alla registrazione, sotto).

## 4. Backlog: registrazione dei visitatori e CMS del modulo

Da fare per la produzione. Non è nello zip di oggi.

### Assunzioni (grande evento pubblico)
- 5.000–30.000 visitatori al giorno, 1–6 postazioni; picchi di coda di 20–40 persone.
- Molti visitatori senza tempo né voglia di scrivere sul PC: il modulo si compila **sul proprio telefono**, nello
  stesso passaggio del QR (prima della calibrazione), con un'alternativa sul PC (tastiera a schermo).
- Minorenni presenti: per chi ha meno di 14 anni niente raccolta dati (in Italia serve il consenso di chi ne ha la
  responsabilità genitoriale); si gioca come ospite.
- Rete dello stand instabile: i dati restano in coda sul dispositivo e si inviano quando la rete torna.
- Più eventi nell'anno, ognuno con testi, campi e informative diversi.

### Modulo per chi gioca
- Campi predefiniti: nome, cognome, nickname (mostrato in classifica), email.
- Casella **privacy** obbligatoria con collegamento all'informativa.
- Casella **comunicazioni marketing** facoltativa e **non preselezionata**, separata dalla privacy.
- Facoltativi configurabili: età/fascia d'età, città, squadra o circolo, newsletter di un partner.
- «Gioca come ospite» sempre possibile (nickname casuale, nessun dato salvato).
- Conferma email (doppio opt-in) per il consenso marketing; registro di ogni consenso: testo esatto, versione
  dell'informativa, data e ora, evento, postazione.
- Nickname filtrato (parole offensive) prima di comparire in classifica.

### CMS del modulo (per l'organizzatore)
- Elenco eventi; per ogni evento: titolo, date, logo, colori, testi del benvenuto.
- **Editor del modulo**: aggiungere, togliere e riordinare campi (testo, email, numero, scelta, data); obbligatorio
  sì/no; etichetta, aiuto, validazione.
- **Editor delle caselle** (consensi): aggiungere o togliere caselle, obbligatoria sì/no, testo con **collegamenti**
  (editor di testo semplice con link: es. «Ho letto l'[informativa](https://…)»), versione del testo.
- Anteprima telefono/PC prima di pubblicare; versioni con data (si sa sempre quale testo ha visto ogni persona).
- Esportazione CSV dei partecipanti e dei consensi per evento, filtri, cancellazione su richiesta (diritto all'oblio).
- Ruoli: amministratore, organizzatore dell'evento, addetto allo stand (solo classifica e postazioni).

### Proposta tecnica (compatibile con Cloudflare, dove gira già il gioco)
- Configurazione del modulo come **JSON versionato** servito dal CMS; il gioco disegna il modulo da quel JSON.
- **Cloudflare Pages Functions + D1** (database) per iscrizioni, consensi e classifiche; **Turnstile** contro i robot;
  accesso al CMS protetto con **Cloudflare Access**.
- Dati in UE, conservazione limitata (es. 24 mesi per il marketing, poi cancellazione), informativa e registro dei
  trattamenti a cura del titolare.

### Ordine suggerito
1. Modalità chiosco + Radar del servizio + classifica del giorno (rende subito lo stand «da evento").
2. Modulo sul telefono con privacy, marketing e ospite; salvataggio in D1.
3. CMS del modulo con editor di campi, caselle e link; esportazione.
4. Bersagli 60" e Sfida il campione.
