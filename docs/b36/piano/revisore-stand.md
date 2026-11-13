# B36 · Revisione contraria della bozza · lente «stand, tappe e misurabilità»

**Cosa ho letto.** `piano/bozza.md`; le cinque letture, i tre piani e il video 1 in `docs/b36/analisi/`;
`docs/RIPRESA_AGENTE.md` (§0, §3, §4), `docs/PROJECT_MEMORY.md` (decisioni B16, B27, del 12 e del 13/11),
`docs/TRACCIA_PASSI.md` (ultime sezioni); i documenti di B37 e B42 dai loro rami; `docs/b35/precisione-telefono.md`,
`docs/b39/controllo-solo-mouse/LISTA-UNICA-E-PROPOSTA-B39.md`, `docs/b41/progetto-modalita-fiera.md`,
`docs/coda/B28.1-profilo-per-attivita.md`; nel codice della 13.9 pannello dello stand (`index.html`), registro
(`registro_registratore.js`, `registro_formato.js`, `scripts/registro/riassunto.mjs`), prova guidata (`diag_protocol.js`,
`natpf_diag.js`, `diag_direction.js`), Precision (`natpf_arcade.js`, `natpf_events.js`), allenamento (`natpf_training.js`),
classifica (`natpf_match_stats.js`), ritmo (`natpf_stroke_outcome.js`). Ho letto anche le revisioni «gioco» e «tecnica» per
non ripeterle: le cito dove la mia lente arriva allo stesso punto da un'altra parte.

**Cosa ho eseguito** (sola lettura, `nice -n 10`, niente browser, ognuno sotto i 2 s). Cartella
`docs/b36/piano/revisore-stand/`:
- `tappa1-cosa-vede.mjs` → `tappa1-cosa-vede.txt`: rimbalzo vero con «Classica» (regola vera) e con la B36.1 **così come
  è descritta** (stessa funzione `core` di `piano-prove/tappa1-aria.mjs`: tempo 0,3, spinta 0, neutro al centro, curva fino a
  1,6, bordi, aiuto e aria di oggi);
- `prova-due-minuti.mjs` → `prova-due-minuti.txt`: gli stessi gesti con il prototipo completo della bozza;
- `protocollo-a.mjs` → `protocollo-a.txt`: i gesti «in conflitto» della prova di due minuti, con «Classica», la B36.1
  descritta e la B36.1 ridotta (curva di oggi) che propongo;
- `ritmo-prova.mjs` → `ritmo-prova.txt`: il ritmo vero (`createRhythm`) con il tempo tenuto uguale e alternato;
- `statistica.mjs` → `statistica.txt`: quanto si può decidere con il numero di colpi di una prova vera.

**Segni.** [V] verificato nel codice (file:riga) o eseguito · [P] prototipo della bozza · [D] deduzione · [R-gioco],
[R-tecnica] rilievo delle altre due revisioni.

---

## In breve

La bozza è ricca e onesta su cosa non sa. Ma come **piano da eseguire allo stand** ha sei difetti.

1. **La misura che decide tutto arriva per ultima e non può decidere.** La prova con il telefono vero è nella B36.8,
   chiede all'utente una cosa che nei documenti non risulta mai fatta (prova guidata con la tastiera, zip da mandare) e
   con 28 palle «dirette» non distingue il 65% dal 48% o dall'83%. Il registro dello stand, che misura da solo ogni
   partita, entra anche lui solo alla B36.8.
2. **La «prima tappa che si vede» non si vede.** Con la B36.1 descritta, a tempo il rimbalzo cambia di 0,1–0,6 m; il
   dritto incrociato con la cima a 10–15° esce anzi 0,2–0,3 m **meno** largo. L'utente gioca a tempo e ha appena detto
   «direi bene con la precisione»: proverebbe e direbbe «non cambia niente» o «peggio».
3. **Otto versioni in cui «Nuova» cambia significato**, con l'equilibrio solo alla settima.
4. **Nessun obiettivo misurato allo stand**: scoperta in due minuti, durata della partita, classifica del giorno. Il piano
   «prima il gioco» li aveva (E1–E5); la bozza li ha persi.
5. **Undici decisioni**: sei sono tecniche, già prese o senza effetto allo stand.
6. **Mancano lavoro e rischio per tappa**, le tappe sono molto diverse tra loro e il posto nel pannello dello stand non c'è
   più quando B36 arriva (B39 e B41 lo occupano).

Proposta (ultima parte): una tappa **B36.0 «misurare prima»** senza cambi al gioco (registro, Precision come strumento,
giocatori simulati), **tre traguardi da provare** al posto di otto, ognuno con una **prova di due minuti scritta**, e
**cinque domande** all'utente.

---

## Rilievi, dal più grave

### S1 · BLOCCANTE · La prova vera arriva per ultima, dipende da una cosa che l'utente non ha mai fatto e non può decidere le sue soglie

**Problema.**
- La bozza mette tutto quello che si sa solo dalle persone (rumore della cima, errore del seme, mira fantasma) nella B36.8,
  dopo sette tappe di codice. Lì chiede «errore del centro ≤ 4°» e «giusti con il gesto insegnato ≥ 65%», senza dire con
  quanti colpi.
- La strada prevista è la prova guidata della diagnostica. Allo stand c'è solo il mouse: la prova parte solo dal menu
  principale, e lì la diagnostica si apre solo con Maiusc+D. Poi serve scaricare uno zip e mandarlo.
- Nei documenti non risulta che l'utente l'abbia mai fatto. La richiesta di una prova di due minuti con un telefono vero è
  ancora aperta nella traccia; della sessione di 5 minuti chiesta da B35a non c'è traccia.
- Anche fatta, una sessione non basta per le soglie della bozza (vedi le prove).
- Il registro dello stand misura già ogni partita senza che nessuno faccia niente, ma la bozza ci aggiunge i campi della
  direzione solo nella B36.8: i dati veri arriverebbero quando i numeri sono già scelti.

**Prove.**
- Bozza `:449-457` (B36.8), `:455` (soglie 4° e 65%), `:528-529` (decisione 8: 10–15 minuti, tastiera), `:497-498`.
- `docs/TRACCIA_PASSI.md:504`: «[ ] Dall'utente: prova di due minuti con un telefono vero agitato senza guardare (poi si
  decide la regola)», ancora aperta. `docs/b35/precisione-telefono.md` §1 (sessione di 5 minuti: Maiusc+D, zip da
  mandare); `lettura-b35a.md` §3 d: «Nessuna sessione vera esiste ancora».
- [V] `src/natpf/diag/diag_protocol.js:15-24`: la prova guidata ha 8 + 8 + 6 + 6 = **28 palle con una direzione voluta** e
  10 + 10 colpi normali. `natpf_diag.js:119`: parte solo dal menu principale. B39 (`LISTA-UNICA…:105-110`): «Né il menu né
  il pannello hanno «Diagnostica»».
- [V] `statistica.txt` (intervallo al 95%):
  - «giusti» al 65% su 28 palle: **±17,7 punti**; su 56: ±12,5; su 100: ±9,3;
  - mediana del piatto (errore del seme) con rumore ±12° e 10 colpi normali: **±4,8°** di errore standard; per ±1,5°
    servono circa **100 colpi normali per lato**.
- [V] Registro oggi (`registro_registratore.js:343-356`): `ms`, `d` (mira totale), `x`, `z` (bersaglio). Niente piatto,
  niente tempo in unità della finestra: dalle partite vere non si separa la cima dal tempo. I colpi dei minigiochi ci sono
  già (`amb: 'minigioco'`, `:331`), ma senza la zona chiesta.
- [V] Precision (`natpf_arcade.js:103-114`): dieci zone fisse (fondo al centro, i due angoli di fondo, metà campo ai lati,
  le due righe di fondo, corte). Ogni palla ha un **bersaglio noto**; si avvia con il mouse e dà il punteggio a schermo.

**Proposta.** Una tappa **B36.0 «misurare prima»**, senza cambi al gioco, prima di ogni regola:
1. registro: `pf` (piatto), `dv` (scarto in gradi), `tu` (tempo in unità della finestra), `bx` (rimbalzo vero), `bz`
   (zona di Precision chiesta, solo nei minigiochi) nella riga «colpo»; `dir` (modello) nella riga «partita». **Tutti
   insieme**, nelle due copie, così l'utente ricarica il Worker **una volta sola** (l'ha già fatto una volta, quando ha
   creato il Worker il 13/11);
2. `riassunto.mjs`: una sezione «Direzione», per modello e per livello, come «Scambi lunghi» di B42;
3. giocatori simulati con `aimDev` e `aimFull` (è anche il B1 di [R-tecnica] e l'R2 di [R-gioco]).

Da quel momento ogni partita e ogni Precision giocata allo stand, anche con «Classica», misura: quanto gira davvero la cima
(anche oltre 45° e 60°), se le persone mirano con la cima o con il tempo, voluto → ottenuto (Precision), partite «storte»
(seme). Le soglie si scrivono con il numero di colpi: per esempio la decisione 1 e la sensibilità con **almeno 100 palle di
Precision di almeno 3 persone**. La prova guidata resta facoltativa, non è più il cancello.

### S2 · BLOCCANTE · La B36.1 «prima tappa che si vede» a tempo non si vede, e stringe l'incrociato più comune

**Problema.**
- La bozza promette: «girando la cima la palla va più larga; il tempo la sposta poco; niente colpi che si annullano».
- Con la regola della B36.1 così come è scritta (bordi, aiuto e aria di oggi), per chi colpisce a tempo il rimbalzo cambia
  pochissimo. Il dritto incrociato con la cima a 10–15° (il colpo da fondo più frequente [D]) cade **più vicino al centro**
  di oggi: sparisce la spinta naturale verso l'incrociato e resta l'aria che toglie il 14%.
- La differenza si vede solo quando tempo e cima vanno in versi opposti, o con il solo tempo.
- Anche la prova deve stare attenta: se si ripete lo stesso errore di tempo, il ritmo lo toglie dal quinto colpo, sia con
  «Classica» sia con «Nuova».

**Prove** [V `tappa1-cosa-vede.txt`; dritto del destro dal centro, 18 m/s, Adulto ed Esperta uguali; rimbalzo vero,
x in metri, − = incrociato].

| Gesto | Classica | B36.1 descritta |
|---|---|---|
| cima −10°, a tempo | −1,68 | −1,47 (più al centro) |
| cima −15°, a tempo | −2,87 | −2,59 (più al centro) |
| cima +15°, a tempo | 2,54 | 2,79 |
| cima ±20–25°, a tempo | ±2,95–3,17 | ±3,26–3,54 |
| cima −15° e un attimo dopo (−39 ms) | −1,03 | −2,12 |
| cima +15° e un attimo prima (+80 ms) | 1,24 | 2,32 |
| cima dritta e un attimo prima | −1,51 | −0,37 |

- `ritmo-prova.txt`: con il tempo tenuto a +0,5, quello che conta per la direzione scende a +0,10 dal quinto colpo
  (`natpf_stroke_outcome.js:244`, `keep 8, min 4, gain 0,8`); con il tempo alternato no.
- Bozza `:359` («prima tappa che si vede»), `:377`. Traccia, 13/11 15:00 UTC: «direi bene con la precisione».

**Proposta.**
1. Non chiamare «da provare» la B36.1: è un passo interno.
2. Riscrivere «L'utente vede» con i numeri veri: «a tempo cambia poco; cambia quando il tempo va contro la cima».
3. Il primo traguardo che l'utente prova deve contenere **almeno una cosa che si vede a tempo**: la fascia sicura con
   l'aria corretta (B36.4) o il campo intero (B36.5). Vedi il piano rivisto.
4. La prova di due minuti si costruisce sul tempo **in conflitto e alternato** (protocollo più sotto).

### S3 · IMPORTANTE · Otto versioni da provare, e «Nuova» cambia significato a ogni giro

**Problema.**
- Ogni tappa esce come versione nuova con «come si attiva». C'è però **un solo** interruttore per tutta la modalità, quindi
  «Nuova» di una versione e «Nuova» di tre versioni dopo sono giochi diversi con lo stesso nome. Il parere dell'utente su
  una versione non si confronta con quello sulla successiva.
- Nel frattempo la Leggenda con «Nuova» cambia difficoltà (avviso della B36.1) e l'equilibrio arriva solo alla B36.7.
- L'accensione «tutti i livelli insieme» (decisione 9) lega i livelli dei visitatori ai criteri più stretti, che sono
  quelli della Leggenda. I visitatori però non scelgono mai Pro o Leggenda: stanno in «Altre impostazioni».

**Prove.**
- Bozza `:349-351` (versione nuova a ogni tappa), `:352` (un interruttore per tutta la modalità), `:378-379`, `:530-532`.
- `natpf_who.js:5, :13-15`: «Chi gioca» = Bambino, Ragazzo, Adulto; Pro e Leggenda solo in «Altre impostazioni».
- Bozza `:316-318`: Leggenda contro «tennista» 92,2% con B42 (criterio ≥ 85%); errori della CPU contro «amatore» 2,1%
  (criterio ≥ 2%).
- Regole dell'utente: a ogni versione zip, installer e «come si attiva» (richiesta di ripresa, punto 5; `RIPRESA §0.6`).

**Proposta.**
- **Tre traguardi da provare** (A «la cima comanda», B «tutto il campo», C «accensione»). Le tappe in mezzo escono come le
  regole chiedono, ma la nota dice: «Direzione dei colpi: Nuova, in lavorazione, non da provare».
- Il pulsante dice il traguardo: «Nuova · A», «Nuova · B».
- In fiera resta «Classica» fino al traguardo C; le giornate di prova con «Nuova» si fanno solo se l'utente dice sì
  (decisione 5 riscritta).
- Accensione di base **per gruppi**: prima Bambino, Ragazzo e Adulto, appena passano i loro criteri; Pro e Leggenda
  quando passa `audit:legend`.

### S4 · IMPORTANTE · Nessun obiettivo misurato allo stand: scoperta, durata della partita, classifica

**Problema.**
- La bozza misura tutto al banco. Non ha un solo obiettivo sulle partite vere. Il piano «prima il gioco» ne aveva cinque,
  dal registro:
  - E1, la cima conta;
  - E2, palle oltre 2,5 m;
  - E3, fuori con il tempo nella finestra;
  - E4, la direzione si scopre nei primi 10 colpi;
  - E5, partite sbilanciate.
- Mancano anche due cose che allo stand contano:
  - **la durata della partita** (quanti visitatori l'ora). La bozza stessa prevede meno fuori ai livelli dei visitatori
    (Bambini 4,2 → 1,7% [P], `:272`): più palle in gioco, scambi e partite più lunghe;
  - **la classifica del giorno**. Il punteggio pesa i livelli con valori tarati sul giocatore simulato «umano», che con la
    bozza non vede «Nuova». E se lo staff cambia regola a metà giornata, la classifica di quel giorno mescola due regole.

**Prove.**
- `piano-prima-il-gioco.md` §1.1 (E1–E5). Nella bozza «registro» compare solo in `:450-452`; «classifica» e «durata» non
  compaiono [V grep].
- `docs/b42/scambi-lunghi.md` §3.2: il banco B42 stampa già i secondi per punto e la durata della partita (per esempio
  Evento contro «umano»: 19,4 s a punto, 253,5 s a partita).
- `natpf_match_stats.js:26-30`: `LEVEL_WEIGHT` tarato perché il simulato «umano» prenda lo stesso punteggio a ogni livello;
  `rally-balance.mjs:59-64`: il colpo simulato non porta `aimDev`.
- In fiera la partita è di un game (`progetto-modalita-fiera.md` §5); la classifica del giorno vale (decisione del 13/11).

**Proposta.** Aggiungere al §5.5 e ai traguardi:
- E1–E5 dal registro, per modello e livello;
- secondi per punto e durata della partita a Bambino, Ragazzo e Adulto entro ±10% da «Classica» (banco B42, dopo B36.0);
- una regola per lo staff: cambiare la direzione solo tra un giorno e l'altro, oppure «Classifica: Azzera oggi» quando la si
  cambia;
- `LEVEL_WEIGHT` rimisurato al traguardo C.

### S5 · IMPORTANTE · Undici decisioni: troppe, tecniche, alcune già prese

**Problema.** Su undici domande, sei non vanno chieste all'utente:
- **D4 (17° o 20°)**: sulla sensibilità l'utente ha già risposto «ok ma come lo misuro?». Non vuole scegliere i gradi:
  vuole una misura;
- **D10 (rinforzare la CPU)**: è già deciso («Pro resta com'è», 11/11; la difficoltà viene dalla CPU, B16 a);
- **D11 (webcam, mouse, tastiera)**: allo stand si gioca con il telefono; non cambia niente per l'utente;
- **D5 (riferimenti fermi) e D6 (scambi di prova)**: si decidono con le misure (S1, S9);
- **D9**: è un dettaglio di come si accende (S3).

Le domande che restano usano numeri che l'utente non sente (decisione 1: «0,3 · 0,5 · 1»). Ne mancano due che toccano lo
stand: quando partire con le misure (B36.0) e come provare in fiera (classifica).

**Prove.** Bozza `:502-536`; `docs/PROJECT_MEMORY.md:675` («ok ma come lo misuro?»), `:761` («Pro resta com'è»),
`:196-198` (B16 a); `RIPRESA §4` (stand solo ledwall, telefoni).

**Proposta.** Cinque domande più una sul calendario, riscritte più sotto. Le altre diventano «scelte tecniche fatte con le
misure», scritte nel documento con il numero che le decide.

### S6 · IMPORTANTE · Criteri su un campione solo

**Problema.**
- «Serie di 14 colpi uguali ≥ 13/14», «mediana degli ultimi 5 entro 0,5 m dai primi 5», «errore del centro ≤ 4°» e
  «≥ 65%» sono misurati su una serie o su una sessione.
- Il banco stampa **una** serie per riga. Con 14 colpi la soglia è quasi a caso: con una riuscita vera del 93% a colpo,
  una serie passa 13/14 solo 3 volte su 4; con il 90%, poco più di una volta su due.
- Il progetto ha già una regola per questo: il centro si giudica per partita e con il rumore.

**Prove.**
- [V] `statistica.txt`: probabilità di fare almeno 13 su 14 = 74% (93%), 58% (90%), 85% (95%).
- `piano-prove/direzione-1-2.txt` (una serie per voluto e gesto).
- Bozza `:335`, `:398-399`, `:455`.
- `docs/PROJECT_MEMORY.md:640` (centro giudicato per partita, con il rumore), `:607` (8 semi = ±3 punti).

**Proposta.** Ogni criterio dice numero di colpi o di semi e margine:
- serie: quota su almeno 20 serie con semi diversi, con il limite basso dell'intervallo sopra la soglia;
- centro fermo: `colpi.mjs --mode=partite` (24 partite da 80 colpi, con il rumore);
- persone vere: dal registro, con il numero di colpi scritto accanto al risultato.

### S7 · IMPORTANTE · Il posto nel pannello dello stand non c'è più quando B36 arriva

**Problema.**
- La bozza mette «Direzione dei colpi» nella riga in basso del pannello, guardando il file di oggi.
- Quando B36 parte, prima sono passati B39 e B41:
  - B39 mette «Diagnostica» proprio in quella riga, e a 1024×600 c'è posto per **un solo** pulsante in più;
  - B41 aggiunge «Modalità fiera» e sposta tre voci in un sotto-foglio.
- La bozza non dice nemmeno tre cose che allo stand contano:
  - che l'opzione non si azzera con il chiosco né con «Nuovo giocatore» (come la mira);
  - che vale dalla partita dopo;
  - come la si raggiunge con il solo mouse.

**Prove.**
- [V] `index.html:231-243` (13 voci in griglia), `:260-262` (riga in basso: Telecomando, Schermo del gioco nel programma
  Windows, Nuovo giocatore, Chiudi).
- `docs/PROJECT_MEMORY.md:817`: voci nuove nella riga in basso; «Chiudi» in vista a 1024×600, 1366×657 e 1024×1024.
- `LISTA-UNICA-E-PROPOSTA-B39.md:114`, `:353-356`; `progetto-modalita-fiera.md` §5. Bozza `:356`.

**Proposta.**
- Decidere il posto dopo B39 e B41: per esempio «Mira del telefono» diventa un foglio «Telefono ›» con mira e direzione,
  oppure una voce nel menu del tasto destro dello staff (B39). Prova `natpf-menu` alle tre misure.
- Opzione letta all'inizio della partita, non toccata dal chiosco né da «Nuovo giocatore», scritta nel registro per
  partita.

### S8 · IMPORTANTE · Lavoro, rischio e ordine mancano; le tappe sono molto diverse; alcune parti si possono togliere

**Problema.**
- La bozza non stima lavoro e rischio. Le tappe vanno da due file (B36.3) a otto file più la pagina del telefono e quattro
  prove nel browser su tre misure di schermo (B36.6).
- L'equilibrio (B36.7) sta tutto alla fine: per sei versioni «Nuova» non è equilibrata.
- Due coppie di tappe toccano file diversi e possono andare in parallelo (B36.2 con B36.3, B36.6 con B36.7). La bozza non
  lo dice.
- I test si riallineano tutti alla B36.8: è un «grande salto» finale ([R-tecnica] I9).

**Prove** [V grep]: 34 file di test usano l'esito del colpo; 19 banchi si appoggiano a `rally-balance`; 52 prove nel browser
`natpf-*`. Per paragone, B35a (stesse parti del codice) è stato 7 commit, un banco nuovo, 10 test e 7 prove nel browser
(traccia). Elenchi dei file della bozza `:363-367`, `:383-384`, `:396`, `:406-408`, `:420`, `:431-432`, `:442-443`.

**Lavoro e rischio per tappa** (S = meno di un blocco; M = un blocco come B35a; L = più di un blocco).

| Tappa | Lavoro | Rischio | Si vede allo stand? | Senza persone? | Nota |
|---|---|---|---|---|---|
| B36.1 | M: modulo nuovo, 6 file, 2 test, 2 banchi, voce del pannello | medio: scogliera a 60° nuova ([R-tecnica] B3), Leggenda | poco (S2) | sì, ma i banchi dell'equilibrio sono ciechi | da ridurre |
| B36.2 | S–M | medio-alto: `groundOnly` toglie schiacciata e partenza ritardata, la smorzata della Leggenda resta ([R-tecnica] I4) | sì, subito | sì | opzione solo per la volée |
| B36.3 | S: 2 file | alto: in fiera un seme sbagliato dura tutta la partita (S9) | no | solo per partita, con il rumore | dopo B41 parte 1 e B28.1 |
| B36.4 | M–L | alto: l'aria corretta cambia ogni rimbalzo | sì: palle più larghe, righe | sì | primo vero «si vede» |
| B36.5 | M | medio: soglie dell'angolo corto ([R-tecnica] I5) | sì | sì | |
| B36.6 | L: 8 file, pagina del telefono, 4 prove nel browser × 3 schermi | basso per il gioco, medio per i testi (B43) | sì | in parte (schermate) | da tagliare a metà |
| B36.7 | L: 4 banchi, CPU, 40 semi | alto: margini da 0,1 a 1,6 punti | no | sì, dopo B36.0 | da spalmare su ogni traguardo |
| B36.8 | M più il tempo dell'utente | alto: dipende da S1 | — | no | soglie non decidibili |
| B36.9 | M: pagina del telefono | medio | no | in parte | telefoni dello stand (S10) |

**Proposta.**
- Tabella come questa nel piano.
- Ordine: B36.0 → B36.1 ridotta → (B36.2 ∥ B36.3) → traguardo A → B36.4 → B36.5 → (B36.6 ridotta ∥ B36.7) → traguardo B →
  traguardo C.
- Equilibrio misurato a ogni traguardo, almeno per i livelli dei visitatori.
- Test parametrizzati sulle due regole dalla B36.1, così l'accensione cambia solo il valore di base.
- **Da togliere o rimandare**, perché costano e allo stand rendono poco:
  - la parola della zona **sul telefono**: chi gioca guarda il ledwall, e dopo B41 i telefoni dello stand restano con la
    pagina vecchia;
  - Precision e Combo «a zone»: i minigiochi seguono già la regola attiva. Lasciati come sono, Precision diventa lo
    strumento di prova (S1);
  - il «fantasma» della mira: in fiera il visitatore non fa l'allenamento completo;
  - gli esercizi nuovi della prova guidata;
  - il ritocco di velocità e altezza dal tempo, se non c'è un criterio che dica che si vede ([R-gioco] R4);
  - i vincenti per zona a fine partita: spettano a B40.

### S9 · IMPORTANTE · Riferimento fermo: in fiera un seme sbagliato dura tutta la partita

**Problema.**
- In fiera ogni visitatore fa quattro palle di prova. Il seme del centro nasce da uno o due colpi normali per lato, spesso
  i più nervosi.
- Con la B36.3 il centro resta entro ±4° dal seme e si muove solo con i colpi quasi dritti. In un game da due minuti nessuno
  ricalibra: servirebbe che lo staff veda il problema, apra la pausa con il mouse e scelga «Telefono: Ricalibra»
  (`index.html:924`), che rifà gli scambi di prova.
- La bozza stessa dice che 8° di errore portano i colpi giusti dal 90% al 63%: il visitatore sfortunato gioca tutta la
  partita con la direzione storta.
- Il criterio «un riferimento sbagliato di 26–40° si corregge come oggi» non vale con il meccanismo descritto
  ([R-tecnica] I1).

**Prove.** Bozza `:390-400`, `:148-150`. `lettura-telefono.md` §3 «Calibrazione» (4–6 palle, 2 colpi normali per lato);
`RIPRESA §4` (scambi di prova per ogni visitatore; «Ricalibra» a partita in corsa resta com'è); `index.html:924`
(«Ricalibra» nella pausa); `docs/coda/B28.1-profilo-per-attivita.md` (stessi file, non ancora unito).

**Proposta.**
- Ri-semina automatica nei primi 6–8 colpi della partita, se la mediana dei colpi normali è lontana dal seme.
- Criterio per partita con il rumore: partite «storte» non più di «Classica».
- La B36.3 dopo B41 parte 1 e B28.1, che toccano gli stessi file.

### S10 · MINORE · Pagina del telefono e telefoni dello stand

**Problema.** La B36.6 (parola sul telefono) e la B36.9 (segnali nuovi) cambiano la pagina del telefono. Con B41 i telefoni
dello stand restano collegati per giorni: la pagina nuova arriva solo quando qualcuno la ricarica e tocca di nuovo «Attiva
i sensori».

**Prove.** Bozza `:432`, `:459-462`; `progetto-modalita-fiera.md:50`.

**Proposta.** Togliere la parola sul telefono (S8). Per la B36.9: scrivere come lo staff aggiorna i telefoni dello stand e
dove vede la versione della loro pagina.

### S11 · MINORE · «Nessuna scritta nuova in partita», ma il nome della zona c'è

**Problema.** La decisione 7 dice «nessuna scritta nuova in partita», ma aggiunge il nome della zona a ogni rimbalzo, anche
sul telefono. Dopo la richiesta B43 («troppi testi che non si leggono») va detto chiaro: è una parola in più nella scritta
che c'è già.

**Prove.** Bozza `:525-527`, `:242`, `:427-428`; richiesta B43 in `RIPRESA §3`.

**Proposta.** Scriverlo così e farlo vedere all'utente al traguardo B, con le schermate nell'area del ledwall.

### S12 · MINORE · Che cosa si usa in fiera, e per quanto resta «Classica»

**Problema.** La data della fiera non è nei documenti. La bozza non dice che cosa va in fiera se B36 non è finito. Dopo
l'accensione «Classica» resta solo «per almeno una versione»: se qualcosa va storto durante la fiera, lo staff deve poter
tornare indietro con un clic.

**Prove.** Bozza `:454`; nessuna data della fiera in `docs/` [V grep].

**Proposta.** «In fiera: Classica fino al traguardo C. Dopo l'accensione, Classica resta nel pannello almeno fino alla
fiera successiva.»

---

## Che cosa si verifica senza persone, che cosa no, e la prova di due minuti

| Cosa | Senza persone (test, banchi, browser) | L'utente in 2 minuti | Solo con persone vere |
|---|---|---|---|
| La cima comanda, stesso gesto stesso lato | banco B35a esteso, serie come quote (S6) | sì, protocollo A | rumore vero della cima: registro e Precision (S1) |
| Nessun fuori con il gesto pulito | test e banco per livello | no (i fuori rari non si vedono) | E3 dal registro |
| Angoli e righe raggiungibili | banco delle zone, copertura | sì, Precision (protocollo B) | E2 dal registro |
| Niente salti | test 0–90°, 10 ms, profondità | no | — |
| Equilibrio dei livelli | audit con i simulati, dopo B36.0 | no (una persona sola) | registro, giornate A/B |
| Durata della partita | banco B42 | no | `durS` nel registro |
| Si scopre in 2 minuti | no | no (l'utente conosce già la regola) | E4 dal registro e 5–10 visitatori osservati |
| Bambini | banco «bambino» (è un'ipotesi) | no | registro a «Bambino» per modello |
| Seme degli scambi di prova | banco per partita con il rumore | no | partite «storte» nel registro |
| Testi leggibili sul ledwall | schermate nell'area del ledwall | sì: guardarle | capiti? osservazione |
| Pannello col solo mouse, programma Windows | `natpf-menu`, test del programma | sì | — |

**Protocollo A (traguardo «la cima comanda»), solo mouse e telefono, 2 minuti.**
1. Tasto destro (dopo B39) → «Pannello dello stand» → «Direzione dei colpi: Nuova · A» → «Chiudi».
2. Partita contro la CPU, «Adulto». Sei dritti, **alternando**: cima girata decisa verso il centro (più del solito) e colpo
   un attimo tardi; cima girata decisa verso l'esterno e colpo un attimo prima. Atteso con «Nuova»: almeno 5 su 6 nella
   **metà esterna**, cioè più vicino alla riga laterale che al centro (2,6–2,8 m dal centro con la B36.1 ridotta, 3,1–3,5 m
   con quella descritta). Con «Classica» gli stessi colpi cadono a 1,5–1,7 m dal centro, nella metà interna
   [V `protocollo-a.txt`]. Con la cima girata poco (15°) la differenza c'è ma è al limite (1,0–1,2 m contro 2,1–2,3 m):
   per questo la prova chiede un giro deciso.
3. Quattro dritti con la cima dritta, alternando prima e dopo: con «Nuova» entro circa mezzo metro dal centro (0,4–0,6 m);
   con «Classica» a 1,5–1,7 m.
4. In tutto il game nessuna volée e nessuna palla corta, né tue né della CPU.
5. Risposta: «sì/no» ai punti 2–4 e una frase sulla sensazione.

Si alterna perché il ritmo toglie un errore di tempo ripetuto dal quinto colpo (`ritmo-prova.txt`). I valori attesi si
misurano al banco (motore e telefono simulato) prima di mandarli all'utente.

**Protocollo B (traguardo «tutto il campo»), 2 minuti.**
1. «Minigiochi» → «Precision» con «Nuova · B»: 10 palle, segnare punteggio e «zone su 10». Poi una volta con «Classica».
2. In partita: tre dritti girando molto più del solito, la palla cade vicino alla riga e resta dentro; un dritto molto in
   ritardo, «Fuori · in ritardo» quando la palla tocca terra.
3. Risposta: i due punteggi di Precision e «sì/no».

Una partita di Precision ha 10 palle: è una prova di sensazione e di guasti, non una misura. La misura è il registro.

**Traguardo C: niente prova di 2 minuti.** Decidono i numeri del banco e il registro (giornate con una regola sola). La
domanda all'utente è una: «Nuova di base per Bambino, Ragazzo e Adulto: sì o no?».

---

## Piano rivisto (solo struttura; i contenuti di gioco restano quelli della bozza e delle altre revisioni)

| Passo | Contenuto | Interruttore | Criterio | Lavoro / rischio | Per l'utente |
|---|---|---|---|---|---|
| **B36.0 Misurare prima** | campi del registro (S1), sezione «Direzione» del riassunto, giocatori simulati con `aimDev`, banco esteso (serie come quote, 3 posizioni, rumore in ms) | gioco invariato; modulo con tutte le righe spente | impronte e `audit:legend` identici; test del Worker; con «Nuova» forzata nei banchi almeno un colpo con la regola nuova | M / basso | ricaricare il Worker una volta |
| **B36.1 ridotta** | tempo 0,3, spinta 0, neutro al centro; curva di oggi (nessuna scogliera nuova); testi per modello | «Nuova» in lavorazione | criterio 1; solo tempo ≤ ±1,2 m; «Classica» identica | M / medio | niente |
| **B36.2 ∥ B36.3** | solo la volée spenta; niente palle corte e salite della CPU, Leggenda compresa; centro fermo con ri-semina | come sopra | 0 volée e 0 palle corte in 200 punti; partite «storte» non più di «Classica» | S–M + S / medio-alto | niente |
| **Traguardo A** | — | «Nuova · A» | criteri sopra; durata della partita ±10% ai livelli dei visitatori | — | protocollo A |
| **B36.4 → B36.5** | fascia sicura e riga, aria corretta, deriva, causa; incrociato profondo, angolo corto continuo | in lavorazione | criteri 2, 4 (0–90°), 5, 6; Precision simulata con «Nuova» non sotto «Classica» | L / alto | niente |
| **B36.6 ridotta ∥ B36.7** | testi e dimostrazioni per modello (regola del CLAUDE.md), nome della zona nella scritta che c'è; CPU e aiuti solo se un criterio cade | come sopra | fedeltà; schermate nell'area del ledwall; `audit:legend` a 40 semi; b25; Evento k < 0,95 | M + L / medio-alto | niente |
| **Traguardo B** | — | «Nuova · B» | criteri del banco sopra; dal registro, Precision dell'utente e dello staff (voluto → ottenuto) | — | protocollo B |
| **Traguardo C** | giornate A/B con il registro (se l'utente dice sì); `LEVEL_WEIGHT`; accensione per gruppi | «Nuova» di base per i visitatori | E1–E5 non peggio di «Classica»; durata ±10% | M / alto | una domanda |

B36.0 non cambia il gioco: se l'utente approva il piano, può partire subito dopo B43, accanto a un altro blocco (al massimo
due insieme). Così il registro raccoglie dati veri mentre si fanno B41, B38 e B39. Attenzione: B41 parte 1 tocca anche il
registro, quindi l'ordine tra i due va fissato.

---

## Decisioni per l'utente, riscritte (la risposta consigliata è la prima)

1. **Chi decide la direzione.** «Nella modalità nuova la palla va dove giri la cima del telefono. Il momento del colpo la
   sposta al massimo di un metro (oggi fino a tre metri e mezzo). Se colpisci a tempo cambia poco; se colpisci un po'
   prima o dopo, la palla va comunque dove giri la cima.» **Sì** · No, il momento del colpo conta come oggi.
2. **Palle corte e volée.** «Nella modalità nuova niente palle corte e niente volée, né tue né della CPU. Allenamento e
   minigiochi restano come sono.» **Sì, come hai chiesto** · Restano.
3. **Righe.** «Un colpo pulito diretto sulla riga resta dentro a tutti i livelli. Esce solo se colpisci in ritardo o in
   corsa, e la scritta dice perché quando la palla tocca terra.» **Sì** · A Leggenda esce anche da fermo se giri troppo.
4. **Che cosa vedi.** «Quando la palla cade, una parola in più nella scritta che c'è già («Lungolinea», «Angolo»).
   Nessun mirino in partita.» **Sì** · No.
5. **Come proviamo.** «Una prova di due minuti a ogni traguardo (tre in tutto). In fiera resta «Classica» finché non dici
   sì. Se vuoi, una giornata con «Nuova» e una con «Classica»: il registro le confronta, e la classifica di ogni giorno
   resta con una regola sola.» **Sì** · Solo la prova di due minuti.
6. **Calendario.** «Il primo passo (solo misure, il gioco non cambia) può partire subito dopo B43. Ti chiede una cosa
   sola: ricaricare una volta il Worker del registro.» **Sì** · Dopo tutta la coda.

**Scelte tecniche** (non si chiedono; si scrivono nel documento con il numero che le decide): sensibilità (resta 17°, si
rivede con il registro), centro fermo (solo se per partita non è peggio), scambi di prova (restano quattro palle, si
propone di più solo se il registro mostra partite storte), accensione per gruppi, CPU (decisioni B16 a e 11/11), webcam,
mouse e tastiera con la regola di oggi. La questione «Leggenda e salita a rete» non va chiesta dentro B36: con «Nuova» e il
gioco da fondo la salita non c'è a nessun livello. Resta da chiarire, fuori da B36, quale dei documenti in disaccordo è
giusto (bozza, rischio 11).

---

## Cosa la bozza fa bene (controllato)

- Interruttore con «Classica» identica bit per bit e «Classica» di base fino alla prova: è il paracadute giusto per uno
  stand.
- Dice da sola che la prova guidata chiede una tastiera (`:497-498`) e che la riga «colpo» del registro non segna i fuori
  di lato (`:452-453`) [V `registro_registratore.js:352`].
- Nessun campo nuovo nei messaggi della sfida tra due computer.
- Il §10 elenca con onestà quello che non è provato.

## Non verificato

- I numeri «B36.1 descritta» e «bozza» vengono dal prototipo della bozza: una palla, niente motore, niente telefono
  simulato, niente centro che impara. Il rimbalzo vero è stimato con 0,86 dello spostamento.
- Le stime statistiche usano formule semplici (binomiale, errore della mediana per un rumore normale).
- Non ho lanciato banchi del motore, `audit:legend`, prove nel browser; niente telefono vero, ledwall o programma Windows.
- Che Precision basti come strumento: serve un campo nuovo (`bz`), non provato. Anche il conto di quante palle ci vogliono
  dipende dal rumore vero, che non si conosce.
- Il posto del pulsante dipende da come B39 e B41 chiuderanno il pannello.
- La data della fiera non la conosco.
- Il documento di B37 è cambiato mentre lavoravo (lo sta chiudendo un altro agente). Quello che cito di B37 (verdetto
  all'atterraggio, causa nella scritta) non dipende dalle sue verifiche finali.
