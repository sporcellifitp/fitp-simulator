# B30 · Registro dello stand

Richiesta del 12/11: «prevedi una raccolta di log continuativi (solo gameplay) per quando aprirò lo stand alla gente, in
modo tale che la possibilità di far giocare migliaia di persone possa solo stabilizzare e rafforzare il prodotto».

## A cosa serve

Finora tutte le tarature del gioco (tempi dei colpi, livelli della CPU, aiuto al più giovane nello stesso schermo,
colpo super, servizio) vengono da giocatori **simulati**. Allo stand giocheranno migliaia di persone vere: il registro
annota come vanno davvero le partite, così chi sviluppa può correggere quello che non va (colpi che arrivano sempre in
ritardo, servizi che vanno sempre in rete, calibrazioni che falliscono, partite abbandonate sempre allo stesso punto,
errori del programma) con i numeri veri.

## È sempre acceso (e come si spegne)

- Il registro è **acceso da solo**, in tutte le versioni (programma Windows e pagina web). Lo staff non deve fare niente.
- Si spegne dal **pannello dello stand** (**Ctrl+Maiusc+K**): voce **«Registro di gioco: Sì · No»**. La scelta resta
  salvata su quel computer finché non la si cambia di nuovo.
- Sotto la voce c'è lo stato in parole semplici, per esempio:
  «Oggi 37 partite registrate · ultimo invio riuscito alle 15:42 · niente in coda.»
  Se l'indirizzo dello spazio non è nel pacchetto o la rete manca, lo dice («indirizzo dello spazio non configurato…»,
  «invio non riuscito: rete assente…; si riprova da solo»).
- **Invia adesso**: manda subito quello che è in coda (di solito non serve: parte da solo ogni 45 secondi circa e a
  fine partita).
- **Scarica la coda**: uno zip con quello che **non è ancora partito** (`natpf-registro-coda-AAAAMMGG-HHMM.zip`). È solo
  una riserva, per esempio se lo stand è rimasto tutto il giorno senza rete e il PC va restituito.
- La **modalità diagnostica** di prima (video, sensori, avvio e fermata a mano) resta com'era e non c'entra: il
  registro è un'altra cosa, molto più leggera.

## Che cosa registra (solo gioco)

| Cosa | Che cosa c'è |
|---|---|
| **Partita** | ora di inizio e di fine, versione del gioco, modo (contro la CPU, stesso schermo, due computer), «Chi gioca» e livello, formato e game, personaggi, opzioni dello stand accese (chiosco, formato fiera, mira, scambio che si scalda, lancio automatico, campo aperto), controller (telefono, webcam, mouse), mano, se il segnale del momento giusto era acceso, **nome inserito: sì/no** (mai il nome), esito, durata, se è stata abbandonata e come (menu, chiosco, partita nuova) |
| **Punto** | chi batte, chi vince, colpi dello scambio, durata, come è finito (vincente, errore in rete, fuori, doppio fallo, palla non raggiunta, lancio a vuoto…), punteggio |
| **Colpo** di chi gioca | gesto riconosciuto (e quello voluto, se diverso), errore di tempo in millisecondi e voto (Perfetto, Anticipo, Ritardo…), forza, direzione, esito (dentro, rete, fuori, debole), colpo super riuscito o perché no, volée, lato; contro la CPU anche la **palla che arrivava** (velocità in km/h, altezza; il tipo di colpo della CPU solo al livello Leggenda). Dal B36.0 anche **la direzione del telefono**: piatto letto dalla cima, scarto della cima in gradi, tempo in unità della finestra, **dove la palla rimbalza davvero** e se lì è fuori, la zona chiesta da Precision (dettagli: `docs/b36/misure-b36-0.md`) |
| **Gesti scartati** | quanti e perché (conteggi per partita) e i colpi «a vuoto» |
| **Servizio** | tipo, qualità, tempo, velocità, voto; lanci, lanci a vuoto, lancio e battuta automatici |
| **Tutorial** | quanto dura, quante schede viste, come si chiude (finito, saltato, chiosco; nello stesso schermo «finito» solo con tutte le schede viste) |
| **Calibrazione** | con i gesti: durata, gesti provati e falliti per passo e perché, ripartenze; **giocando** (scambi di prova del B28): palle, dritti e rovesci imparati, livello, «Salta ›», lasciata a metà. Il profilo automatico che il gioco fa da solo a ogni collegamento del telefono non è una calibrazione e non si scrive |
| **Visita** | da quando qualcuno lascia il menu a quando ci si torna: se ha giocato, e se no **dove ha lasciato** (menu, tutorial, calibrazione) |
| **Collegamento** | telefono collegato, caduto, ricollegato (dopo quanto), tipo di strada (rete locale o relay), latenza stimata; telefono **a grandi linee** (Android 14 / iPhone, versione del browser) |
| **Livello Evento** | il valore dell'adattamento a inizio partita, a ogni punto e a fine partita |
| **Prestazioni** | fotogrammi al secondo medi e del secondo peggiore, fotogramma più lungo, fotogrammi lenti; schermo (larghezza e altezza), se c'è una scheda grafica vera e quale; quanto è costato il registro stesso |
| **Errori** | errori JavaScript e promesse rifiutate: messaggio, nome del file e riga (lo stesso errore si conta, non si ripete); pagina ricaricata; chiusura improvvisa la volta prima; crash della pagina nel programma Windows |

Ogni partita ha un **numero progressivo** e ogni giornata un **codice casuale** di 8 lettere (cambia ogni giorno, non
dice niente del computer). Basta questo per mettere in ordine le righe.

**B36.0 (14/11/2026): campi della direzione dei colpi.** Nove campi nuovi tutti insieme (`pf`, `dv`, `tu`, `rx`, `rz`,
`fu`, `nr`, `zp` nella riga «colpo»; `dir` nelle righe «partita» e «minigioco»), formato delle righe 2 (campo `v` della riga
«avvio»). Il Worker va ricaricato **una volta** perché li salvi: un Worker non ricaricato accetta lo stesso le righe e
toglie solo i campi nuovi (il riassunto lo dice: «campi della direzione assenti»). Cosa vuol dire ogni campo, come si
ricarica il Worker e la prova a Precision: `docs/b36/misure-b36-0.md`. Solo numeri di gioco: niente di chi gioca.

## Che cosa NON registra

- **Mai il nome** scritto da chi gioca: solo «nome inserito: sì/no». I testi liberi sono pochi (il messaggio e il file
  di un errore del programma, le voci dei conti dei gesti scartati): lì il gioco copre con «[nome]» **tutti i nomi
  scritti nella giornata** (anche quelli di prima di «Nuovo giocatore» o del ritorno del chiosco, tenuti solo in memoria
  e mai su disco), anche **una parola sola** di un nome e cognome, anche **senza accenti** o con le maiuscole diverse;
  e copre con «[testo]» **ogni testo tra virgolette** di un messaggio d'errore (lì il programma mette le chiavi, e una
  chiave della classifica è un nome). Resta un limite onesto: un nome scritto in un'altra giornata o su un altro
  computer non è conosciuto, ma può comparire in un errore solo tra virgolette (coperto) o dentro una parola.
- **Niente video, niente audio, niente immagini della webcam, niente campioni grezzi dei sensori** del telefono.
- **Niente indirizzi di rete** (IP), niente e-mail, niente identificativi stabili del telefono o del computer (al più
  «Android 14 · Chrome 126»).
- Tre difese, tutte provate dai test: il gioco scrive solo campi scelti a mano; ogni riga passa da un filtro che tiene
  **solo i campi previsti** e toglie quelli vietati; il Worker di Cloudflare rifà lo stesso controllo prima di scrivere.
  Un test (`natpf-tennis/test/natpf-registro.test.mjs`) fallisce se in una riga finisce un nome o un campo vietato; la
  prova nel browser (`tools/e2e/natpf-registro.mjs`) gioca con i nomi «Mario Rossi», «Giulia Bianchi», «Luca Verdi» e
  controlla che non compaiano da nessuna parte nello spazio.

## Dove finiscono i dati

Il PC dello stand non è vostro, quindi il registro **esce da solo** dal PC:

1. il gioco tiene le righe in memoria e ogni 45 secondi circa (e a fine partita) ne fa un **blocco**;
2. il blocco va in una **coda sul disco** (programma Windows: cartella `registro` accanto a `programma.log`, cioè
   `%LOCALAPPDATA%\NATPF\log\registro`; pagina web: lo spazio del browser);
3. dalla coda parte verso il **vostro spazio Cloudflare** (Worker `natpf-registro` → bucket R2 **privato**
   `natpf-registro`, guida: `docs/GUIDA_REGISTRO_CLOUDFLARE.md`);
4. quando Cloudflare conferma, il blocco **si cancella dal PC**. Sul PC resta solo quello che non è ancora partito, con un
   tetto di 200 MB (oltre si scartano i blocchi più vecchi, solo dopo aver scritto quello nuovo: non succede mai in una
   giornata normale).

Nello spazio le righe stanno **compresse** in `registro/<giorno>/<codice della giornata>/<parte>.jsonl.gz`. Ogni blocco
ha un identificativo: se arriva due volte (rete che cade a metà invio) si scrive una volta sola.

## Come si scaricano e come si mandano a chi sviluppa

- Aprite l'indirizzo del Worker `natpf-registro` nel browser, scrivete la **vostra chiave** e premete **Mostra i
  giorni**: vedete lo spazio occupato, i giorni registrati, e per ognuno **Scarica** e **Cancella**; sotto, **Scarica
  tutti i giorni in un file**.
- I file `registro-AAAA-MM-GG.jsonl.gz` si mandano **così come sono** a chi sviluppa (sono piccoli: pochi MB anche per
  giornate piene). Chi sviluppa li legge con `node natpf-tennis/scripts/registro/riassunto.mjs <cartella o file>`, che
  fa un rapporto (Markdown e una pagina da aprire con un doppio clic) con le misure per tarare il gioco.
- Senza la chiave nessuno può leggere, elencare o cancellare niente, e il Worker **non cancella mai niente da solo**.
  Il gioco può solo aggiungere righe. Attenzione però: l'indirizzo del Worker sta nel pacchetto web, che è pubblico;
  chi lo conosce può mandare righe finte e **riempire lo spazio** (al più 200 MB al giorno, solo per i giorni da una
  settimana fa a domani). Allora il Worker smette di accettare righe, quelle dello stand restano in coda sui PC e la
  pagina del Worker scrive «Spazio PIENO»: scaricate quello che vi serve e cancellate i giorni con righe finte. Non può
  né leggere né cancellare i vostri giorni.

## Quanto spazio occupa

Misure (prova nel browser `tools/e2e/natpf-registro.mjs`, partite vere del gioco, e registri finti verosimili di
`scripts/registro/finto.mjs`):

| Partita (prova nel browser del 12/11) | Righe in chiaro | Nello spazio (compresso) |
|---|---|---|
| contro la CPU, 1 game, 6 punti, circa 90 s | 2,6 kB | 1,1–1,3 kB (con la riga di avvio della giornata) |
| stesso schermo, 1 game, 7 punti | 2,7 kB | 0,75 kB |
| registri finti: 1.000 partite verosimili (2–4 minuti, circa 47 righe a partita) | 6,3 kB a partita | 1,6 kB a partita |

Le partite vere allo stand saranno più lunghe di quelle della prova: per le stime si usano **2,5 kB a partita**
nello spazio (con margine).

| Partite al giorno | Spazio al giorno | Giorni in 2 GB (tetto di base) | Giorni in 10 GB |
|---|---|---|---|
| 1.000 | circa 2,5 MB | circa 800 | circa 4.000 |
| 5.000 | circa 12,5 MB | circa 160 | circa 800 |

(stima prudente con 2,5 kB a partita nello spazio). Il tetto del registro su Cloudflare è **2 GB** (si cambia con la
variabile `MAX_TOTALE_MB` del Worker): quando è pieno il Worker **non accetta altre righe** (restano in coda sui PC e
ripartono da sole appena c'è posto) e **non cancella niente da solo**: siete voi a cancellare, con la chiave, i giorni
già scaricati. Lo spazio occupato si vede solo con la vostra chiave, nella pagina del Worker, che avvisa quando è quasi
pieno.

## Quanto pesa sul gioco

Il registro non guarda la palla a ogni fotogramma e non legge i sensori: scrive una riga per punto, per colpo, per
servizio, e a ogni fotogramma di partita aggiorna solo tre numeri (per le prestazioni). Le righe si spediscono a parte,
senza mai fermare il ciclo di gioco. Il registro misura da solo quanto tempo usa e lo scrive a fine partita
(`costoMs`).

Misure (12/11, Chromium senza scheda grafica, computer carico), con gli agganci che scattano davvero in una partita:

- lavoro del registro per partita, in tutto: **2–3 ms** nella partita contro la CPU della prova nel browser (85–92 s),
  **10,3 ms** nella partita di 111 s con il telefono simulato giocata dal revisore: sempre meno di **0,1 ms per secondo
  di gioco**, cioè circa **0,0005–0,0016 ms per fotogramma** su 16,7 ms disponibili a 60 fotogrammi al secondo;
- una riga (filtro dei campi e testo) costa circa **0,005 ms** (misurata su 2.000 righe nella prova nel browser);
- il lavoro più lungo in una volta sola: meno di **2 ms** (controllo della prova), di solito 0,2 ms;
- l'invio dei blocchi avviene a parte (rete del browser), mai dentro il ciclo di gioco.

Non c'è una misura «fotogrammi con e senza registro» che valga qualcosa: la differenza (millesimi di millisecondo) è
molto più piccola del rumore del disegno. La misura che prima stava qui (un passo della fisica a partita finita,
acceso e spento) non provava niente, perché a partita finita gli agganci non scattano: è stata tolta (revisione).
Il revisore ha visto i fotogrammi al secondo di fine partita funzionare nel browser (medi 59,8, secondo peggiore 54,5,
6.623 fotogrammi, a disegno spento).

## Senza rete, senza indirizzo, senza spazio

- **Rete assente**: le righe restano in coda sul PC e si riprova da sole (dopo 30 secondi, poi sempre più di rado, al
  più ogni 10 minuti); tornata la rete partono **in ordine e senza doppioni**. Il pannello lo dice.
- **Indirizzo del Worker non nel pacchetto**: il registro resta solo in coda sul PC e il pannello dice «indirizzo dello
  spazio non configurato». «Scarica la coda» dà lo zip.
- **Coda non scrivibile** (disco pieno, spazio del browser finito): i blocchi restano **in memoria** (fino a 8 MB) e
  partono lo stesso appena c'è rete; si perdono solo se si chiude il gioco prima (il pannello dice «la coda è solo in
  memoria»). Oltre gli 8 MB le righe si perdono e si contano (la riga «nota» lo dice). Il gioco va avanti uguale.
- **Spazio Cloudflare pieno** o **orologio del PC sbagliato** (giorno fuori dalla finestra di una settimana): i blocchi
  restano in coda sul PC e il pannello lo dice («spazio Cloudflare pieno», «giorno non accettato (orologio del
  computer?)»).
- **In ogni caso** il gioco funziona identico: mai un errore a schermo, mai un'attesa.

## Cosa non è provato

- **Cloudflare vero**: il Worker è provato con uno spazio R2 finto in memoria (test) e dietro un piccolo server locale
  (prova nel browser). La creazione del bucket, il collegamento e la chiave nella dashboard non sono stati fatti da noi.
- **PC dello stand vero** e **programma Windows installato**: la coda su disco del programma è provata con i test del
  programma (`natpf-desktop/test/registro.test.mjs`), non su Windows.
- **Telefono vero**: nella prova nel browser si gioca con mouse e tastiera e con il servizio vero del gioco; le righe
  del telefono (collegamento, strada, latenza) sono provate con un telefono finto nei test.
- **Le prestazioni** sono misurate in un Chromium senza scheda grafica: i tempi del disegno non valgono per un PC vero,
  ma il costo del registro (che non disegna niente) sì.
- **Due finestre del gioco aperte insieme nello stesso browser** (non succede con il programma Windows, che ha una
  finestra sola): condividono il codice della giornata e contano le partite ognuna per conto suo, quindi due partite
  diverse possono avere lo stesso numero. Non corretto: allo stand si usa il programma Windows.

## Per chi sviluppa

- Gioco: `natpf-tennis/src/natpf/natpf_registro.js` (collegamento e pannello), `src/natpf/registro/` (formato e
  riservatezza, registratore, coda, invio). Worker: `natpf-tennis/cloudflare/registro-worker.js`. Programma Windows:
  `natpf-desktop/src/registro.mjs` e il canale `window.natpfDesktop.registro` (`src/preload.cjs`, `src/main.mjs`).
- Pacchetti: `node natpf-tennis/scripts/pacchetto-cloudflare.mjs --turn-url=… --registro-url=https://natpf-registro.<…>.workers.dev/`
  (scrive `natpf/registro.json`); programma Windows: `natpf-desktop/registro.json` o `NATPF_REGISTRO_URL` alla costruzione.
- Strumenti: `scripts/registro/finto.mjs` (registri finti), `riassunto.mjs` (rapporto), `scarica.mjs` (scarico con la
  chiave da variabile d'ambiente), `worker-locale.mjs` (Worker con spazio finto per le prove).
- Prove: `npm test` (tra gli altri `test/natpf-registro.test.mjs`, `registro-worker.test.mjs`,
  `registro-riassunto.test.mjs`, `natpf-registro-pacchetto.test.mjs`), `natpf-desktop`: `npm test`, nel browser
  `CHROMIUM_PATH=… node tools/e2e/natpf-registro.mjs`.

## Revisione (12/11 sera)

Un revisore indipendente ha provato il lavoro (attacchi al Worker, nomi nel browser vero, file tronchi, 500 partite
simulate, mezzanotte, pannello a più misure). Cosa ha trovato e cosa è stato fatto:

**Bloccanti, tutti corretti e con un test:**

1. **Chi non aveva la chiave poteva far cancellare i giorni veri.** Oltre il tetto il Worker cancellava da solo i giorni
   più vecchi, e chi conosce l'indirizzo (è nel pacchetto web) poteva riempire lo spazio con righe finte di giorni
   scelti da lui. Ora le scritture senza chiave non fanno **mai** cancellare niente: oltre il tetto il Worker risponde
   «spazio pieno» (507), i blocchi restano in coda sui PC e la pagina del Worker avvisa; si cancella solo con la chiave.
   La finestra dei giorni accettati senza chiave è stretta: **da 7 giorni fa a domani** (fuori: 409, il blocco resta
   in coda e il pannello dice «orologio del computer?»). Test: `registro-worker.test.mjs`, «scritture estranee senza
   chiave oltre il tetto lasciano intatti i giorni già scritti» (56 richieste con origine finta su 14 giorni: i blocchi
   veri restano identici, nessuna cancellazione).
2. **Un nome poteva finire nei messaggi d'errore** (il nome di prima di «Nuovo giocatore», una parola sola di un nome e
   cognome). Ora il gioco tiene in memoria tutti i nomi della giornata e li copre a parola intera, anche a pezzi e
   senza accenti; i testi tra virgolette dei messaggi d'errore diventano «[testo]». Test: «i nomi di tutta la giornata,
   anche a pezzi o senza accenti, non finiscono negli errori».
3. **Un testo enorme poteva fermare il gioco** (l'espressione delle e-mail costava in modo quadratico: 40.000 caratteri
   = 1 s). Ora ogni testo si taglia prima delle espressioni (1 MB: meno di 1 ms), nel gioco, nell'ascolto degli errori
   e nel Worker; lo strumento di riassunto salta le righe giganti (una riga di 30 MB: contata come illeggibile, il
   resto letto in pochi secondi). Test in `natpf-registro.test.mjs`, `registro-worker.test.mjs`,
   `registro-riassunto.test.mjs`.

**Minori corretti:** nomi coperti solo nei testi liberi e a parola intera (un soprannome «Ace» o «Ste» non cambia più
«ace» o «stesso-schermo»); «voluto» solo se il gesto è davvero diverso (prima in tutti i colpi per una maiuscola);
calibrazione automatica senza riga; tutorial dello stesso schermo «finito» solo con tutte le schede viste; partita a
cavallo della mezzanotte tutta nella sua giornata, poi riga «avvio» del giorno nuovo, errori ricontati ogni giorno;
blocco non letto per un attimo che resta in coda (si toglie solo alla terza volta); coda del programma Windows che
scarta i blocchi vecchi solo dopo aver scritto il nuovo; blocchi rifiutati e con il giorno non accettato detti nel
pannello; pannello con misure in cqh e testo corto nelle aree strette (720 × 720 senza scorrere con l'errore della rete
assente); corpo delle richieste al Worker letto a pezzi con il tetto; nuovo campo «in» del colpo (palla della CPU che
arrivava); nome della scheda grafica con le parentesi annidate; frasi di questo documento corrette (coda non
scrivibile, costo misurato davvero).

**Non corretti:** due finestre del gioco aperte insieme nello stesso browser (vedi «Cosa non è provato»); il pulsante
«Registro di gioco» ha ancora uno stile un po' diverso dagli altri del pannello; il tempo di calcolo del Worker su
Cloudflare vero non è misurato (in node: 3–5 ms per un blocco tipico o pieno, sotto i 10 ms del piano gratuito); lo
strumento di riassunto non usa ancora il campo «in».

**Verifiche dopo le correzioni (12/11 notte):** `npm test` 1.336 test, 1.335 superati, 0 falliti, 1 saltato; `npm run
build` riuscito; `npm run audit:legend` «Tutti i criteri rispettati»; test del sito 226/226; programma Windows 42/42;
prove nel browser `natpf-registro` 39/39 (partita contro la CPU 2,6 kB di righe, 1,1–1,3 kB nello spazio; stesso
schermo 2,7 kB, 0,75 kB; costo 0,0005 ms per fotogramma, una riga 0,005–0,006 ms), `natpf-menu` 45/45,
`natpf-diag-session` lunga con i video 24/24 e corta 23/23 (la modalità diagnostica funziona come prima con il
registro acceso).
