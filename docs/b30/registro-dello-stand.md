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
| **Colpo** di chi gioca | gesto riconosciuto (e quello voluto, se diverso), errore di tempo in millisecondi e voto (Perfetto, Anticipo, Ritardo…), forza, direzione, esito (dentro, rete, fuori, debole), colpo super riuscito o perché no, volée, lato |
| **Gesti scartati** | quanti e perché (conteggi per partita) e i colpi «a vuoto» |
| **Servizio** | tipo, qualità, tempo, velocità, voto; lanci, lanci a vuoto, lancio e battuta automatici |
| **Tutorial** | quanto dura, quante schede viste, come si chiude (finito, saltato, chiosco) |
| **Calibrazione** | con i gesti: durata, gesti provati e falliti per passo e perché, ripartenze; **giocando** (scambi di prova del B28): palle, dritti e rovesci imparati, livello, «Salta ›», lasciata a metà |
| **Visita** | da quando qualcuno lascia il menu a quando ci si torna: se ha giocato, e se no **dove ha lasciato** (menu, tutorial, calibrazione) |
| **Collegamento** | telefono collegato, caduto, ricollegato (dopo quanto), tipo di strada (rete locale o relay), latenza stimata; telefono **a grandi linee** (Android 14 / iPhone, versione del browser) |
| **Livello Evento** | il valore dell'adattamento a inizio partita, a ogni punto e a fine partita |
| **Prestazioni** | fotogrammi al secondo medi e del secondo peggiore, fotogramma più lungo, fotogrammi lenti; schermo (larghezza e altezza), se c'è una scheda grafica vera e quale; quanto è costato il registro stesso |
| **Errori** | errori JavaScript e promesse rifiutate: messaggio, nome del file e riga (lo stesso errore si conta, non si ripete); pagina ricaricata; chiusura improvvisa la volta prima; crash della pagina nel programma Windows |

Ogni partita ha un **numero progressivo** e ogni giornata un **codice casuale** di 8 lettere (cambia ogni giorno, non
dice niente del computer). Basta questo per mettere in ordine le righe.

## Che cosa NON registra

- **Mai il nome** scritto da chi gioca: solo «nome inserito: sì/no». Se un nome finisce per sbaglio in un testo (per
  esempio in un messaggio di errore) diventa «[nome]».
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
   tetto di 200 MB (oltre si scartano i blocchi più vecchi: non succede mai in una giornata normale).

Nello spazio le righe stanno **compresse** in `registro/<giorno>/<codice della giornata>/<parte>.jsonl.gz`. Ogni blocco
ha un identificativo: se arriva due volte (rete che cade a metà invio) si scrive una volta sola.

## Come si scaricano e come si mandano a chi sviluppa

- Aprite l'indirizzo del Worker `natpf-registro` nel browser, scrivete la **vostra chiave** e premete **Mostra i
  giorni**: vedete lo spazio occupato, i giorni registrati, e per ognuno **Scarica** e **Cancella**; sotto, **Scarica
  tutti i giorni in un file**.
- I file `registro-AAAA-MM-GG.jsonl.gz` si mandano **così come sono** a chi sviluppa (sono piccoli: pochi MB anche per
  giornate piene). Chi sviluppa li legge con `node natpf-tennis/scripts/registro/riassunto.mjs <cartella o file>`, che
  fa un rapporto (Markdown e una pagina da aprire con un doppio clic) con le misure per tarare il gioco.
- Senza la chiave nessuno può leggere, elencare o cancellare niente; il gioco può solo aggiungere righe.

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
variabile `MAX_TOTALE_MB` del Worker): quando si supera, il Worker **cancella da solo i giorni più vecchi**, mai il
giorno in corso. Lo spazio occupato e i giorni cancellati si vedono solo con la vostra chiave, nella pagina del Worker.

## Quanto pesa sul gioco

Il registro non guarda la palla a ogni fotogramma e non legge i sensori: scrive una riga per punto, per colpo, per
servizio, e a ogni fotogramma di partita aggiorna solo tre numeri (per le prestazioni). Le righe si spediscono a parte,
senza mai fermare il ciclo di gioco. Il registro misura da solo quanto tempo usa e lo scrive a fine partita
(`costoMs`).

Misure della prova nel browser (12/11, Chromium senza scheda grafica, computer carico):

- lavoro del registro per partita, in tutto: **1–9 ms** in partite da 30–90 secondi, cioè meno di **0,1 ms per secondo
  di gioco** (a 60 fotogrammi al secondo: meno di 0,002 ms per fotogramma, su 16,7 ms disponibili);
- il lavoro più lungo in una volta sola: **0,2 ms**;
- un passo del gioco dura uguale con il registro acceso e spento (**0,0024–0,0027 ms** in tutti e due i casi);
- l'invio dei blocchi avviene a parte (rete del browser), mai dentro il ciclo di gioco.

Nessun effetto misurabile sui fotogrammi al secondo.

## Senza rete, senza indirizzo, senza spazio

- **Rete assente**: le righe restano in coda sul PC e si riprova da sole (dopo 30 secondi, poi sempre più di rado, al
  più ogni 10 minuti); tornata la rete partono **in ordine e senza doppioni**. Il pannello lo dice.
- **Indirizzo del Worker non nel pacchetto**: il registro resta solo in coda sul PC e il pannello dice «indirizzo dello
  spazio non configurato». «Scarica la coda» dà lo zip.
- **Coda non scrivibile** (disco pieno, spazio del browser finito): le righe si perdono e si contano (la riga «nota» lo
  dice), il gioco va avanti uguale.
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
