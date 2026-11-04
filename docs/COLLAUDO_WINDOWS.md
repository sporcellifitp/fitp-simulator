# COLLAUDO_WINDOWS · punti da controllare sugli eseguibili Windows (per l'utente)

Richiesta del 04/11/2026: «una versione portatile e una versione installabile, entrambe tramite eseguibili; vai avanti
su Windows, il resto lo provo io, segnati i punti che devo controllare». Questo file è la lista dei controlli. Spunta
le caselle (`[x]`) o scrivi accanto cosa non va; se qualcosa non va, manda anche il registro
`%LOCALAPPDATA%\NATPF\log\programma.log` (dal programma: tasto **Alt** → Aiuto → Cartella dei dati).

Codice: `natpf-desktop/` (Electron 45.2.2), procedura di costruzione in `natpf-desktop/LEGGIMI.md`.

## 0. I due file

| File | Cosa fa | Dimensione | sha256 |
|---|---|---|---|
| `NATPF-Simulator-Setup-2026-11-04.5.exe` | installazione in Programmi, collegamenti, firewall, disinstallazione | 124.880.055 B | bdfb46b7a456e55b7d9b5e51906f59971552990fdf744f598041417c4dcd7d62 |
| `NATPF-Simulator-Portatile-2026-11-04.5.exe` | un solo file, nessuna installazione, nessun permesso per avviarlo | 124.872.264 B | 369702017923532838c0b9b437dfb4d2190dedfb3c5090b3640bbd2d2c5ae7cb |

- Stesso gioco della versione browser e dello zip LAN `2026-11-04.5` (non cambia niente nel gioco).
- Richiede Windows 10 o 11 a 64 bit. Su Windows più vecchi o a 32 bit si ferma con un messaggio.
- Server e certificati sono gli stessi dello zip LAN di Codex: HTTPS 8443 per gioco e telefoni, pagina del
  certificato 8081, avvio guidato 8080 (solo sul PC). Dati in `%LOCALAPPDATA%\NATPF` (certificati in `certs`,
  impostazioni e profilo del gioco in `programma`, registri in `log`).
- **Uno alla volta**: zip LAN, portatile e installato usano le stesse porte. Se uno è aperto, il secondo dice «La
  porta 8443 è già in uso» (zip LAN) oppure porta in primo piano la finestra già aperta (portatile/installato).

## 1. Scaricare e aprire (tutti e due)

Senza firma del codice (decisione del 04/11) Windows avvisa alla prima apertura di ciascun file.

- [ ] SmartScreen «Windows ha protetto il PC»: **Ulteriori informazioni → Esegui comunque** apre il file.
- [ ] L'antivirus (Defender o altro del PC noleggiato) non mette il file in quarantena. Se lo fa, scrivimi il nome
      della minaccia segnalata.
- [ ] Le proprietà del file (tasto destro → Proprietà → Dettagli) mostrano «NATPF Simulator», versione file
      2026.1104.5.0 e versione prodotto 2026-11-04.5; l'icona è la pallina su fondo blu.

## 2. Versione installabile (`NATPF-Simulator-Setup-…exe`)

- [ ] Chiede il permesso di amministratore (UAC, «Autore sconosciuto»): è normale, serve per Programmi e firewall.
- [ ] Pagine in italiano con la grafica NATPF: benvenuto → cartella (`C:\Program Files\NATPF Simulator`) →
      installazione → fine.
- [ ] Alla fine «Avvia NATPF Simulator» apre il gioco (non come amministratore: la finestra si comporta come le altre).
- [ ] Collegamento «NATPF Simulator» con l'icona della pallina sul desktop e nel menu Start.
- [ ] Al primo avvio **non** compare l'avviso del firewall di Windows né la domanda «Apri la rete ai telefoni»
      (la regola l'ha già creata l'installazione).
- [ ] Regola del firewall: Sicurezza di Windows → Firewall → Impostazioni avanzate → Regole connessioni in entrata →
      **NATPF Simulator** (Consenti, profilo Tutti, indirizzo remoto Subnet locale, programma
      `C:\Program Files\NATPF Simulator\NATPF Simulator.exe`). In alternativa, da un prompt:
      `netsh advfirewall firewall show rule name="NATPF Simulator" verbose`.
- [ ] Impostazioni → App → App installate: «NATPF Simulator», versione 2026-11-04.5, con «Disinstalla».
- [ ] Aggiornamento: rilanciare il setup con il gioco aperto → chiede di chiuderlo, lo chiude e installa sopra.
- [ ] Disinstallazione: toglie collegamenti, cartella in Programmi e regola del firewall; lascia
      `%LOCALAPPDATA%\NATPF` (certificati: i telefoni restano a posto se reinstalli).
- [ ] Installazione silenziosa (facoltativa, per chi prepara i PC): `NATPF-Simulator-Setup-2026-11-04.5.exe /S`.

## 3. Versione portatile (`NATPF-Simulator-Portatile-…exe`)

- [ ] Funziona da qualunque cartella o chiavetta USB, senza installazione e senza permessi per avviarlo.
- [ ] Primo avvio di questa versione: finestrella «Primo avvio di questa versione» con la barra (da qualche secondo a
      circa un minuto: estrae ~330 MB in `%LOCALAPPDATA%\NATPF\portatile\2026-11-04.5`), poi si apre il gioco.
- [ ] Prima di aprire il gioco (schermata «Avvio del gioco…») chiede «I telefoni devono poter raggiungere questo
      computer» → **Apri la rete ai telefoni** → permesso di amministratore (UAC) → nessun altro messaggio, e
      **nessun** avviso «Windows Defender Firewall ha bloccato alcune funzionalità». Regola creata: **NATPF Simulator
      portatile** (programma in `%LOCALAPPDATA%\NATPF\portatile\2026-11-04.5`).
- [ ] Avvii successivi: il gioco si apre in pochi secondi, senza finestrella e senza domande sul firewall.
- [ ] Con una versione nuova del portatile: estrae di nuovo una volta, chiede di nuovo il firewall una volta (il
      percorso cambia), e cancella la cartella della versione precedente.
- [ ] Se rispondi «Più tardi»: il gioco funziona sul PC; Windows può mostrare il suo avviso del firewall (lì
      «Consenti accesso» chiede l'amministratore; «Annulla» crea regole di blocco). In tutti e due i casi
      **Alt → Rete → Apri la rete ai telefoni (firewall)…** deve sistemare tutto: toglie le regole legate al
      programma, blocchi compresi, e crea quella giusta. Da provare apposta una volta con «Annulla».

## 4. Gioco sul PC (tutti e due)

- [ ] Si apre a **schermo intero sul monitor più grande che non è il principale**: con il ledwall collegato come
      monitor esteso deve andare sul ledwall. Senza ledwall: sul monitor del PC.
- [ ] **Ctrl+Maiusc+M** sposta il gioco sul monitor successivo; alla riapertura torna sull'ultimo scelto.
- [ ] **F11** esce ed entra dallo schermo intero; la scelta resta alla riapertura.
- [ ] Tasto **Alt** mostra il menu (NATPF, Schermo, Rete, Aiuto). Da controllare anche a schermo intero; se a schermo
      intero non compare, prima F11 poi Alt.
- [ ] Ledwall acceso dopo il programma: compare in Alt → Schermo. Ledwall scollegato con il gioco sopra: il gioco
      torna sul monitor principale.
- [ ] Audio: musica e voce dell'intro partono senza cliccare.
- [ ] Lo schermo non si spegne e il PC non va in sospensione con il gioco aperto (lasciarlo fermo 15–20 minuti).
- [ ] **Alt → Aiuto → Scheda grafica in uso…**: alla voce WebGL deve esserci «Hardware accelerated». Se c'è
      «Software only» il PC noleggiato non usa la scheda grafica: il gioco parte lo stesso ma sarà lento. Scrivimi
      cosa c'è in «GPU0» e se una partita è fluida.
- [ ] Webcam (modalità webcam): la camera si apre senza chiedere permessi. Se resta nera: Impostazioni di Windows →
      Privacy → Fotocamera → «Consenti alle app desktop di accedere alla fotocamera» attivo.
- [ ] Alt → NATPF → Esci (o Ctrl+Q) chiude tutto; riaprendo il gioco riparte senza errori di porta occupata.

## 5. Telefoni (tutti e due)

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

## 6. Se qualcosa non va

- «Il gioco non è partito. La porta 8443 è già in uso»: è aperto lo zip LAN («AVVIA NATPF LAN») o un altro
  programma sulla 8443. Chiuderlo e riaprire.
- Telefoni che non si collegano: Alt → Rete → Apri la rete ai telefoni; controllare la regola del firewall (punto 2
  o 3) e che non ci siano regole di **blocco** per «NATPF Simulator» nelle regole in entrata; che PC e telefoni siano
  sulla stessa rete; che la rete dello stand non isoli i dispositivi tra loro (isolamento dei client Wi-Fi). Un
  antivirus con un suo firewall (non Defender) ignora le regole di Windows: va aperto lì.
- Schermo nero o gioco a scatti: punto «Scheda grafica in uso» del §4.
- Registro: `%LOCALAPPDATA%\NATPF\log\programma.log`. Strumenti per sviluppatori: Ctrl+Maiusc+I.

## 7. Cosa è stato verificato qui (Linux) e cosa no

Verificato prima della consegna:
- costruzione da Linux: electron-builder per Electron Windows x64, NSIS 3.0.4.1 per installazione e portatile;
- contenuto dei due eseguibili (elenco dei file compressi), icona e informazioni di versione nell'eseguibile;
- il programma avviato con Electron per Linux (stesso codice, schermo virtuale): server LAN, certificato accettato
  solo per i propri indirizzi, gioco a schermo intero con la schermata iniziale;
- prove delle funzioni del processo principale (monitor, certificato, firewall, impostazioni, versione).

**Non verificato** (serve Windows): tutto quello che è in questo file. In particolare SmartScreen e antivirus,
installazione e disinstallazione, regole del firewall, avvio senza permessi dalla pagina finale, ledwall, webcam,
scheda grafica del PC noleggiato, telefoni veri.
