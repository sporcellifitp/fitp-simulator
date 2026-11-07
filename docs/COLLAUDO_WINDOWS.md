# COLLAUDO_WINDOWS · punti da controllare sul programma Windows (per l'utente)

Richieste: 04/11/2026 «una versione portatile e una versione installabile, entrambe tramite eseguibili; vai avanti su
Windows, il resto lo provo io, segnati i punti che devo controllare»; **07/11/2026** «La versione windows (installer)
deve essere un unico installer che poi deve potersi aggiornare direttamente dal gioco» (niente più portatile né zip
LAN; aggiornamenti da Cloudflare R2). Questo file è la lista dei controlli. Spunta le caselle (`[x]`) o scrivi accanto
cosa non va; se qualcosa non va, manda anche il registro `%LOCALAPPDATA%\NATPF\log\programma.log` (dal programma: tasto
**Alt** → Aiuto → Cartella dei dati).

Codice: `natpf-desktop/` (Electron 45.2.2), procedura di costruzione in `natpf-desktop/LEGGIMI.md`, bucket degli
aggiornamenti: `docs/GUIDA_AGGIORNAMENTI_R2.md`.

## 0. Il file

| File | Cosa fa | Dimensione | sha256 |
|---|---|---|---|
| `NATPF-Simulator-Setup-<versione>.exe` | installa la prima volta e aggiorna sopra (Programmi, collegamenti, firewall, disinstallazione) | ~125 MB | in `SHA256SUMS.txt` accanto al file (Artifacts di GitHub) o in `latest.json` sul bucket |

- **Un solo eseguibile** (dal 07/11). Il portatile non c'è più: se l'hai usato, puoi cancellare
  `%LOCALAPPDATA%\NATPF\portatile` e la regola del firewall «NATPF Simulator portatile» (non servono più).
- Stesso gioco della versione browser; il server dei telefoni è quello che era nello zip LAN, dentro il programma.
- Richiede Windows 10 o 11 a 64 bit. Su Windows più vecchi o a 32 bit si ferma con un messaggio.
- Server e certificati: HTTPS 8443 per gioco e telefoni, pagina del certificato 8081, avvio guidato 8080 (solo sul PC).
  Dati in `%LOCALAPPDATA%\NATPF` (certificati in `certs`, impostazioni e profilo del gioco in `programma`, registri in
  `log`, aggiornamenti scaricati in `aggiornamenti`).
- **Uno alla volta**: se il programma è già aperto, aprirlo di nuovo porta in primo piano la finestra già aperta.

## 1. Scaricare e aprire

Da **GitHub** (un unico zip): Actions → «NATPF eseguibili Windows» → ultima esecuzione → Artifacts →
`NATPF-Simulator-Windows-<versione>`; dentro l'installer, il suo sha256 (`SHA256SUMS.txt`), `latest.json` e questa
lista. Oppure, quando il bucket è pronto (guida R2): `<indirizzo pubblico>/windows/NATPF-Simulator-Setup.exe` (sempre
l'ultima versione).

Se serve, dai messaggi **a pezzi** (`.001`, `.002`, `.003`, al massimo 45 MB ciascuno) con `UNISCI I PEZZI.cmd`: metti
tutti i pezzi e quel file nella stessa cartella e fai doppio clic. Deve scrivere «… pronto e verificato».

Senza firma del codice (decisione del 04/11) Windows avvisa alla prima apertura del file scaricato.

- [ ] SmartScreen «Windows ha protetto il PC»: **Ulteriori informazioni → Esegui comunque** apre il file.
- [ ] L'antivirus (Defender o altro del PC noleggiato) non mette il file in quarantena. Se lo fa, scrivimi il nome
      della minaccia segnalata.
- [ ] Le proprietà del file (tasto destro → Proprietà → Dettagli) mostrano «NATPF Simulator», versione file
      `AAAA.MMGG.n.0` e versione prodotto `AAAA-MM-GG.n` della versione scaricata; l'icona è la pallina su fondo blu.

## 2. Installazione (`NATPF-Simulator-Setup-…exe`)

- [ ] Chiede il permesso di amministratore (UAC, «Autore sconosciuto»): è normale, serve per Programmi e firewall.
- [ ] Prima installazione: pagine in italiano con la grafica NATPF: benvenuto → cartella
      (`C:\Program Files\NATPF Simulator`) → installazione → fine.
- [ ] Alla fine «Avvia NATPF Simulator» apre il gioco (non come amministratore: la finestra si comporta come le altre).
- [ ] Collegamento «NATPF Simulator» con l'icona della pallina sul desktop e nel menu Start.
- [ ] Al primo avvio **non** compare l'avviso del firewall di Windows né la domanda «Apri la rete ai telefoni»
      (la regola l'ha già creata l'installazione).
- [ ] Regola del firewall: Sicurezza di Windows → Firewall → Impostazioni avanzate → Regole connessioni in entrata →
      **NATPF Simulator** (Consenti, profilo Tutti, indirizzo remoto Subnet locale, programma
      `C:\Program Files\NATPF Simulator\NATPF Simulator.exe`). In alternativa, da un prompt:
      `netsh advfirewall firewall show rule name="NATPF Simulator" verbose`.
- [ ] Impostazioni → App → App installate: «NATPF Simulator» con la versione installata e «Disinstalla».
- [ ] **Aggiornamento a mano** (setup di una versione più nuova, con il gioco già installato): **non** chiede di
      disinstallare né la cartella (benvenuto → installazione → fine); se il gioco è aperto chiede di chiuderlo.
      Dopo: in «App installate» c'è la versione nuova; monitor scelto, schermo intero, impostazioni del gioco e
      telefoni (certificato) come prima.
- [ ] Disinstallazione: toglie collegamenti, cartella in Programmi e regola del firewall; lascia
      `%LOCALAPPDATA%\NATPF` (certificati: i telefoni restano a posto se reinstalli).
- [ ] Installazione silenziosa (facoltativa, per chi prepara i PC): `NATPF-Simulator-Setup-<versione>.exe /S`.

## 2b. Aggiornamento dal gioco (07/11)

Serve il bucket R2 pronto (`docs/GUIDA_AGGIORNAMENTI_R2.md`) e un installer che conosca il suo indirizzo: la **prima**
versione con l'indirizzo si installa a mano (§2); per provare l'aggiornamento serve poi una versione ancora più nuova
pubblicata sul bucket (dimmelo e la pubblico).
- [ ] Con internet, qualche secondo dopo l'avvio il gioco dice che c'è una versione nuova (numero e novità). Niente si
      scarica da solo.
- [ ] **Scarica**: avanzamento nel gioco e sulla barra delle applicazioni (icona verde); si può continuare a giocare.
      ~125 MB: con una rete lenta qualche minuto. Il file va in `%LOCALAPPDATA%\NATPF\aggiornamenti`.
- [ ] Download interrotto (staccare la rete a metà, poi riattaccarla e premere di nuovo): riprende da dove era.
- [ ] **Installa**: Windows chiede il permesso (Controllo dell'account utente, «Vuoi consentire a questa app di
      apportare modifiche?», programma «NATPF-Simulator-Setup-…») → **Sì** → il gioco si chiude, nessuna finestra
      dell'installazione, e **entro un minuto il gioco si riapre da solo**, aggiornato (Alt → Aiuto → Versione).
- [ ] Il gioco riaperto **non** è come amministratore (si comporta come prima; trascinare un file sulla finestra o la
      webcam funzionano come prima).
- [ ] Dopo l'aggiornamento restano: monitor scelto e schermo intero, impostazioni e record del gioco, telefoni già
      collegati (certificato), regola del firewall (nessun avviso del firewall).
- [ ] Al permesso di Windows rispondi **No**: il gioco resta aperto, dice che serve il permesso, e «Installa» si può
      ripremere più tardi.
- [ ] (Facoltativo) Aggiornamento che non riesce: se l'installazione si ferma (disco pieno, file bloccati), compare
      «Aggiornamento di NATPF Simulator non riuscito» con il percorso dell'installer scaricato: aprendolo a mano si
      riprova; impostazioni e certificati restano. Annota il messaggio se succede.
- [ ] Se il PC usa un account **standard** e al permesso di Windows si scrive la password di **un altro account
      amministratore**: il gioco potrebbe riaprirsi con quell'altro account (certificati e impostazioni diversi, i
      telefoni devono fidarsi di nuovo). In quel caso chiudilo e riaprilo dal collegamento sul desktop; annotalo.
- [ ] Rete con antivirus che «controlla HTTPS» o rete aziendale con proxy: il controllo può dire «Collegamento
      sicuro … non riuscito» o server non raggiungibile; il gioco funziona. Annotalo (si aggiorna con l'installer a
      mano).
- [ ] Senza internet (rete dello stand senza uscita): il gioco parte e funziona come sempre; negli aggiornamenti dice
      che il server non è raggiungibile. Nessuna attesa, nessun blocco.
- [ ] Alt → Aiuto → **Cerca aggiornamenti…**: stesso percorso con le finestre di Windows («Hai già l'ultima versione»
      quando è aggiornato).
- [ ] Il giorno dopo l'aggiornamento la cartella `%LOCALAPPDATA%\NATPF\aggiornamenti` è vuota (installer già usato
      cancellato all'avvio).

## 4. Gioco sul PC

- [ ] Si apre a **schermo intero sul monitor più grande che non è il principale**: con il ledwall collegato come
      monitor esteso deve andare sul ledwall. Senza ledwall: sul monitor del PC.
- [ ] **Nessuna cornice all'avvio** (B8): la finestra compare già a schermo intero, senza barra del titolo né bordi,
      nemmeno per un attimo.
- [ ] **Ctrl+Maiusc+M** sposta il gioco sul monitor successivo senza mostrare cornici; con un solo monitor non fa
      niente; alla riapertura torna sull'ultimo scelto.
- [ ] **F11** esce ed entra dallo schermo intero, anche sulla schermata «Premi un tasto»; la scelta resta alla
      riapertura. Anche il tasto **F** del gioco e il pulsante «Schermo intero» in alto nel menu fanno lo stesso.
- [ ] A schermo intero il tasto **Alt** da solo **non** fa comparire il menu sopra il gioco (B8). In finestra (dopo F11)
      Alt mostra il menu (NATPF, Schermo, Rete, Aiuto).
- [ ] **Esc** a schermo intero resta «indietro» nei menu e «pausa» in campo: non fa uscire dallo schermo intero.
- [ ] Ledwall acceso dopo il programma: il gioco ci va da solo se è il monitor scelto l'ultima volta (B8), altrimenti
      compare in Alt → Schermo. Ledwall scollegato con il gioco sopra: il gioco torna sul monitor principale, e ci
      ritorna quando il ledwall si ricollega.
- [ ] Cambio di risoluzione o di scala del monitor del gioco (Impostazioni di Windows → Schermo) con il gioco aperto:
      il gioco resta a schermo intero e riempie di nuovo tutto il monitor.
- [ ] Clic sul monitor principale con il gioco sul ledwall: la barra delle applicazioni del ledwall non deve coprire il
      gioco (se la copre: Impostazioni → Personalizzazione → Barra delle applicazioni → «Mostra la barra delle
      applicazioni su tutti gli schermi» spento, e scrivimelo).
- [ ] Audio: musica e voce dell'intro partono senza cliccare.
- [ ] Lo schermo non si spegne e il PC non va in sospensione con il gioco aperto (lasciarlo fermo 15–20 minuti).
- [ ] **Alt → Aiuto → Scheda grafica in uso…**: alla voce WebGL deve esserci «Hardware accelerated». Se c'è
      «Software only» il PC noleggiato non usa la scheda grafica: il gioco parte lo stesso ma sarà lento. Scrivimi
      cosa c'è in «GPU0» e se una partita è fluida.
- [ ] Webcam (modalità webcam): la camera si apre senza chiedere permessi. Se resta nera: Impostazioni di Windows →
      Privacy → Fotocamera → «Consenti alle app desktop di accedere alla fotocamera» attivo.
- [ ] Alt → NATPF → Esci (o Ctrl+Q) chiude tutto; riaprendo il gioco riparte senza errori di porta occupata.

## 4b. Adattamento al monitor e calibrazione dello schermo (tutte le versioni, B8)

- [ ] Sul ledwall (qualsiasi proporzione: 16:9, 4:3, quadrato 2×2, 3:2) in partita si vede **tutto il campo**: righe
      laterali del doppio, fondo campo vicino, rete e i due giocatori. Su schermi stretti la camera è un po' più alta
      e più lontana che sul 16:9: dimmi se ti piace.
- [ ] **Opzioni → Schermo → «Calibra lo schermo…»**: compaiono frecce agli angoli, segni sui bordi, un cerchio e una
      griglia. Con le frecce della tastiera (Tab o i pulsanti per scegliere il bordo: Tutti, Sopra, Destra, Sotto,
      Sinistra; Maiusc per passi grandi) si regolano i bordi finché le frecce toccano i bordi visibili del ledwall;
      1–6 o i pulsanti cambiano il formato (Intero, 16:9, 16:10, 4:3, 3:2, 1:1); **Invio** salva, **Esc** annulla,
      **R** ripristina.
- [ ] Il **cerchio** deve sembrare rotondo sul ledwall: se è schiacciato, il processore LED stira l'immagine
      (scrivimelo con le misure del ledwall).
- [ ] Processore LED che prende solo un angolo dell'uscita del PC: con i bordi della calibrazione (fino al 90% per
      lato) il gioco sta tutto in quell'angolo; la scelta resta alla riapertura.
- [ ] Con «Intero» e bordi a zero il gioco riempie tutto il monitor, **senza bande nere** ai lati.

## 5. Telefoni

- [ ] Telefoni dello staff sulla rete dello stand. Prima volta su quel PC: **Alt → Rete → Indirizzi e certificato
      per i telefoni…** mostra `http://<indirizzo del PC>:8081`; dal telefono si apre la pagina e si installa il
      certificato (istruzioni nella pagina, iPhone e Android).
- [ ] Il QR del gioco apre la pagina della racchetta in HTTPS senza avvisi di sicurezza sul telefono.
- [ ] Un telefono: calibrazione, tutorial («Tutto chiaro, ho capito»), allenamento, una partita contro la CPU.
- [ ] Due telefoni, stesso schermo: i due tutorial e le due calibrazioni nelle due metà, poi la partita.
- [ ] La connessione resta stabile per tutta una partita (nessun «telefono scollegato»).
- [ ] PC noleggiato diverso da quello di prova: i certificati sono del PC, quindi i telefoni vanno rifatti. Per
      evitarlo (da provare): copiare la cartella `%LOCALAPPDATA%\NATPF\certs` dal PC di prova a quello noleggiato
      **prima** del primo avvio; il programma tiene la stessa autorità e rifà solo il certificato per i nuovi
      indirizzi.

## 5b. Versione browser (Cloudflare, B8)

Lo zip LAN non si consegna più dal 07/11 (è lo stesso gioco e lo stesso server del programma Windows).
- [ ] Versione browser (Cloudflare): il **primo tasto o clic** sulla schermata
      «Premi un tasto per iniziare» porta il gioco a schermo intero; un **Esc breve** resta «indietro», tenuto
      premuto esce (Edge e Chrome). F entra ed esce. «Opzioni → Schermo → All'avvio: Finestra» lo spegne.
- [ ] Versione Cloudflare: lo zip pesa meno di 25 MB (`natpf-simulator-cloudflare-20261105-1.zip`, 22.517.792 B) e la
      webcam si carica come prima (Edge, Chrome).

## 6. Se qualcosa non va

- «Il gioco non è partito. La porta 8443 è già in uso»: è aperto un vecchio zip LAN («AVVIA NATPF LAN») o un altro
  programma sulla 8443. Chiuderlo e riaprire.
- Aggiornamento dal gioco che non parte o non riapre il gioco: aprire il gioco dal collegamento sul desktop e
  mandarmi il registro (righe «aggiornamenti»). In alternativa installare a mano l'ultimo setup (§2): aggiorna sopra.
- Telefoni che non si collegano: Alt → Rete → Apri la rete ai telefoni; controllare la regola del firewall (punto 2) e che non ci siano regole di **blocco** per «NATPF Simulator» nelle regole in entrata; che PC e telefoni siano
  sulla stessa rete; che la rete dello stand non isoli i dispositivi tra loro (isolamento dei client Wi-Fi). Un
  antivirus con un suo firewall (non Defender) ignora le regole di Windows: va aperto lì.
- Schermo nero o gioco a scatti: punto «Scheda grafica in uso» del §4.
- Registro: `%LOCALAPPDATA%\NATPF\log\programma.log`. Strumenti per sviluppatori: Ctrl+Maiusc+I.

## 7. Cosa è stato verificato qui (Linux) e cosa no

Verificato prima della consegna:
- costruzione da Linux: electron-builder per Electron Windows x64, NSIS 3.0.4.1 per l'installer (dal 07/11 uno solo);
- contenuto dell'eseguibile (elenco dei file compressi), icona e informazioni di versione nell'eseguibile;
- il programma avviato con Electron per Linux (stesso codice, schermo virtuale): server LAN, certificato accettato
  solo per i propri indirizzi, gioco a schermo intero con la schermata iniziale;
- prove delle funzioni del processo principale (monitor, certificato, firewall, impostazioni, versione);
- B8: prova automatica con Electron per Linux in uno schermo virtuale (finestra già a schermo intero, Alt che non
  mostra il menu, F11, Esc al gioco, ponte `window.natpfDesktop`, cambio di monitor simulato), prove nel browser dello
  schermo intero, della calibrazione e dell'inquadratura a 16:9, 4:3, 1:1 e in verticale;
- 07/11 aggiornamenti: prove dell'aggiornatore con un server finto (versioni, manifesto, sha256 e dimensione sbagliati,
  redirect verso altri siti, download interrotto e ripreso, permesso rifiutato), prova con Electron per Linux (stato
  spento senza indirizzo, controllo all'avvio senza download, scarica → pronto, installazione simulata), script NSIS
  compilato con `/AGGIORNA`, passo di pubblicazione su R2 con un aws finto.

**Non verificato** (serve Windows): tutto quello che è in questo file. In particolare SmartScreen e antivirus,
installazione e disinstallazione, regole del firewall, avvio senza permessi dalla pagina finale, ledwall, webcam,
scheda grafica del PC noleggiato, telefoni veri; per gli aggiornamenti: il permesso di Windows, l'installazione
silenziosa con `/AGGIORNA`, la riapertura del gioco senza permessi, i dati conservati, il primo caricamento vero sul
bucket R2 (servono i segreti dell'utente).
