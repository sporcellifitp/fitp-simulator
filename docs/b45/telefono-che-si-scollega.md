# Telefono che si scollega in fiera (B45) · analisi, misure e piano

Richiesta dell'utente (14/11/2026): «C'è un altro problema: siccome c'è molta gente in fiera a volte il telefono si
disconnette da solo, forse per problema di wifi. Il tema è capire quando si scollega perché lo fa (succede a schermo
acceso).»

Analisi in sola lettura sul ramo `natpf-simulator` a `23ddae3` (versione 2026-11-14.1; il codice è uguale a `51b3d31`,
che aggiunge solo documenti): nessun file del repository è stato cambiato. Le prove di laboratorio sono in
`scratchpad/b45/prove/` (§3). Riferimenti nella forma `file:riga`; i percorsi brevi sono `site/js/tennis/…`,
`natpf-tennis/src/natpf/…`, `natpf-desktop/src/…`, `tools/lan/…`. Con l'unione dei rami `int-b38-b39` e
`b46-lato-sicuro` (versione 14.2) alcune righe si spostano (`main.mjs` cambia molto con la B39, `link.js` di 1–4 righe,
`racchetta.js` con la B46): ritrovarle con le funzioni citate.

---

## 0. In breve (per l'utente)

- Nel programma Windows il telefono parla con il computer **solo attraverso la Wi-Fi dello stand**: niente internet,
  niente server esterni, niente TURN di Cloudflare (quelli servono solo alla versione web, §1.7).
- Il gioco considera il telefono «scollegato» quando per **5 secondi** non passa nessun messaggio, in una delle due
  direzioni: lo decidono sia il computer sia il telefono. Il browser, da solo, se ne accorgerebbe molto più tardi. In
  partita c'è anche un «Ricollega» automatico: dopo **circa 3 s** senza movimento il gioco chiede al telefono di rifare
  il collegamento, e il telefono lo fa appena la rete torna (§1.6).
- Prove fatte qui con una rete finta (§3, collegamento senza il gioco intorno): buchi di rete fino a 3,5 s, il 20–40% dei
  pacchetti persi per 30 s e una rete «a singhiozzo» (1–2 s sì, 1 s no) per 30 s **non** fanno cadere niente. Un buco di
  **5 s o più** fa **sempre** cadere il collegamento, che poi torna da solo 0,5–1,7 s dopo la fine del buco. Lo stesso se
  il computer o il telefono restano bloccati per 6 s.
- Quindi una caduta a schermo acceso vuol dire: **per almeno 5 secondi (in partita già 3) telefono e computer non si sono
  sentiti**. Le cause più probabili, in ordine: (1) la Wi-Fi del telefono che si interrompe tra la folla (segnale
  debole, 2,4 GHz affollata, telefono che si riaggancia al router o viene spostato tra 2,4 e 5 GHz); (2) il telefono che
  lascia la Wi-Fi dello stand (dati mobili, un'altra rete conosciuta); (3) la Wi-Fi dello stand che cade per tutti
  (router, canale, radar sui 5 GHz); (4) il computer o la pagina del telefono che si bloccano. Meno probabili: isolamento
  dei client, indirizzo IP che cambia. Non c'entrano il TURN né il server PeerJS.
- Oggi il registro dice solo «caduto» e «ricollegato dopo N s»: **non dice perché**. Proposta B45: far raccontare la
  caduta a tutti e due (computer e telefono), mostrarla nel pannello dello stand («Telefono 1: 3 cadute oggi · di solito:
  Wi-Fi persa per qualche secondo») e scriverla nel registro **con i campi che ci sono già** (niente Worker da ricaricare).
- Da fare subito allo stand, senza cambiare il programma (§6): router dedicato vicino e in alto, solo 5 GHz su un canale
  fisso tra 36 e 48, computer collegato al router con il cavo, telefoni dello stand senza dati mobili e con l'app
  «fissata».
- Correzione sicura da decidere dopo le prime misure (§5): chiudere il collegamento dopo 10–12 s di silenzio invece di 5,
  chiedere «Ricollega» solo quando il telefono risponde ancora, e lasciare la pausa del gioco com'è. In laboratorio, con
  12 s, buchi di 5, 7 e 10 s non fanno più cadere niente e il collegamento torna regolare entro 0,1–0,3 s dalla fine del
  buco (§3.2).

---

## 1. Com'è fatto il collegamento telefono–computer

### 1.1 Il programma Windows (natpf-desktop)
- Electron avvia il server LAN nello stesso processo (`main.mjs:111-128`; certificato fatto all'avvio con gli indirizzi
  di quel momento `:116`; server `:121`) e apre il gioco da `https://localhost:8443/?lan=1` (`main.mjs:518`): la
  segnalazione del computer passa dal loopback del PC, **non** dalla Wi-Fi.
- Chromium senza rallentamenti in secondo piano e con gli indirizzi LAN veri nei candidati WebRTC, niente mDNS
  (`main.mjs:27-35`); finestra con `backgroundThrottling: false` (`:434`); schermo e PC tenuti svegli
  (`powerSaveBlocker.start('prevent-display-sleep')`, `:486`). Pagina del gioco chiusa di colpo → riga «crash» e ricarica
  (`:517`).
- Firewall: una regola per l'eseguibile, tutti i protocolli, **solo dalla sottorete locale** (`desktop-core.mjs:205-208`).
  Un telefono in un'altra sottorete (rete della fiera con più sottoreti) viene bloccato.

### 1.2 Server e segnalazione (tools/lan)
- `tools/lan/server.mjs`: HTTPS sulla 8443 per il gioco e la pagina del telefono; WebSocket `/lan-signal` (`:39`) che
  porta offerte e candidati tra telefono e computer; ping ogni 10 s, chi non risponde viene chiuso al giro dopo
  (`:43-46`); al massimo 120 messaggi al secondo per socket (`:54`); id già registrato → `id-unavailable` (`:56`).
- `tools/lan/launcher.mjs:25-30`: ogni 2 s rilegge gli indirizzi del PC, ma il server si riavvia solo se cambiano i file
  del certificato. Il certificato copre gli indirizzi dell'avvio (`certificato.mjs:53-77`): se l'IP del PC cambia a
  programma aperto, il nuovo indirizzo non è coperto finché non si riavvia il programma.
- Indirizzo nel QR: il primo indirizzo di rete coperto dal certificato (`natpf_lan.js:10-19`), con la **Wi-Fi davanti al
  cavo** (`server.mjs:12-16`, `rankAddresses`). Con il PC collegato a due reti, il QR può mandare i telefoni sulla rete
  sbagliata.
- Il telefono dello stand tiene posto e chiave nella memoria della pagina (`localStorage`), che è legata all'indirizzo
  `https://IP:8443`: se cambia l'IP del PC la pagina non si apre più e il posto salvato non si vede (lo dice già
  `docs/b41/progetto-modalita-fiera.md` §2.6: serve un IP fisso).

### 1.3 Il trasporto (`site/js/tennis/lan-transport.js`)
- Telefono e computer usano `LanPeer`: un WebSocket verso `/lan-signal` (`:50-71`). Il telefono prende un id nuovo e
  casuale a ogni tentativo (`phone-<uuid>`, `:49`); il computer usa l'id della sessione o, per i telefoni dello stand,
  l'indirizzo fisso `racchetta-stand-…`.
- `LanConnection`: RTCPeerConnection **senza STUN né TURN** (`iceServers: []`, `:11`): passa solo la strada diretta nella
  rete locale. Due canali (`:18`): `control`, ordinato e affidabile (messaggi del gioco, battito, una copia dei colpi), e
  `motion`, non ordinato e senza ritrasmissioni (sensori binari a 40 Hz, orientamento del piatto, copie veloci del colpo).
- Si chiude da sola solo se la connessione WebRTC diventa `failed` o `closed` (`:13`), non su `disconnected`. `send`
  butta **in silenzio** un messaggio se il canale ha già 64 KB in coda (`:43`); il canale veloce rifiuta oltre 16 KB
  (`:44`), i sensori oltre 2 KB (`:45`).

### 1.4 Il computer (`site/js/tennis/link.js`)
- Stati (`L.state`): off → starting → waiting → connected → lost; `retry`/`error` per l'indirizzo fisso occupato
  (`:149`, `:177`, `:183`, `:202`, `:366`).
- **Battito e controllo di vita**: ogni secondo il computer manda `dp` (l'ora, per l'orologio: `:200`) e controlla da
  quanto non riceve niente: **oltre 5 s chiude e passa a «lost»** (`:202`). `lastSeen` si aggiorna solo con i messaggi
  del canale di controllo (`:311`), non con i sensori (`motion`, `:359`) né con il percorso veloce (`fast`, `:361`).
- Chiusura dall'altra parte o della connessione WebRTC → «lost» (`:362-367`).
- Il telefono che si ricollega con la sua chiave mentre il computer lo crede ancora collegato **sostituisce** il
  collegamento vecchio senza passare da «lost» (`:253-259`, `joins` +1): per il registro (`registro_registratore.js:519-520`)
  quel giro **non esiste**. È raro: con «Ricollega» il telefono chiude prima il collegamento vecchio e il computer lo vede
  (prova §3: «lost» e di nuovo «connected» in meno di 0,1 s, quindi nel registro «caduto» + «ricollegato» come una caduta
  vera); resta invisibile solo se quella chiusura si perde nella rete e il telefono rientra prima del controllo del
  computer.
- Strada (getStats) all'apertura e ogni 10 s (`:262`, `ice-route.js:180-199`). Orologio: si tiene il viaggio più breve
  degli ultimi 12 scambi e si scartano quelli oltre 2 s (`pairing.js:76-88`); è questo `rtt` che finisce nel registro: con
  la rete lenta **resta basso**.
- Telefono dello stand: ingresso con la prova HMAC (andata e ritorno di `proof`, `:272-308`); indirizzo fisso ancora
  occupato → nuovo tentativo ogni 3 s (`:182-186`, `stand-pairing.js:37`).
- Il segnale del telefono di ogni secondo (`st`) porta visibilità della pagina (`vis`, `hiddenAt`), blocco dello schermo
  (`wk`), età dei sensori (`sa`) e batteria (`bt`, `bc`) (`:336`): il computer le ha già, ma non le scrive alla caduta.

### 1.5 Il telefono (`site/js/tennis/racchetta.js`)
- `connect()` (`:199-256`): a ogni tentativo un Peer nuovo (`:226`); a segnalazione aperta chiede il canale e manda
  `hello` con la chiave di ripresa o, per lo stand, il numero per la prova HMAC (`:236-237`). Un tentativo in LAN dura al
  massimo 12 s (`:213-218`, `LINK_TIMES.phoneMs`, `link.js:55`), poi «Connessione persa» con il motivo (`netWhy`,
  `link.js:59-67`: computer non raggiunto, strada diretta bloccata, computer che non risponde).
- **Battito**: ogni secondo `ping` e `st` (`:469-476`); se dal computer non arriva niente da **oltre 5 s** chiude e chiama
  `lost()` (`:474`). `lastRx` si aggiorna con ogni messaggio del canale di controllo (`:270`); `rtt` del telefono è una
  media mobile dei `pong` (`:295`).
- `lost()` (`:345-358`): chiude, mostra il motivo solo se il tentativo non era mai arrivato in fondo, e riprova dopo
  1, 2, … fino a 6 s; la racchetta normale 10 volte, il telefono dello stand per sempre (`:357`). Riprova subito su
  `online` e `pageshow` (`:442-443`) e al ritorno in primo piano (`:721-729`).
- Errori della sola segnalazione con il canale aperto: non chiudono niente (`:245`, `:265`); segnalazione persa con il
  canale aperto → si riallaccia dopo 1,5 s (`:251-254`).
- Schermo acceso: blocco dello schermo ripreso a ogni tocco e al ritorno (`phone-keep.js:13-49`, `racchetta.js:695-704`);
  pagina nascosta → `st` subito con `vis: 0` (`:698`); pagina chiusa → chiude il canale (`:716`).
- Traffico in partita: sensori binari a 40 Hz (`:514-517`), orientamento del piatto a ogni campione sul canale veloce,
  che **con il canale veloce pieno passa su quello affidabile** (`:533`), colpo in 4 copie (`:615`).

### 1.6 Il gioco
- `natpf_phone_watch.js`: la partita va in pausa dopo 0,3 s di problema (`WATCH.graceMs`, `:16`) e riparte con il conto
  alla rovescia; motivi «scollegato», «pagina nascosta», «sensori fermi» (`:31-44`). Se però il movimento non arriva ma
  il segnale del telefono è di meno di 2,5 s fa, il gioco pensa al solo canale veloce bloccato e **non** si ferma
  (`degraded: 'canale'`, `:37-40`): in un buio totale la pausa arriva quindi dopo 1,8–2,8 s.
- **«Ricollega» automatico** (`createResync`, `:56-71`; `natpf_ui.js:596`, `natpf_split_ui.js:641`): con il movimento
  fermo da 2,5 s il gioco chiede al telefono di rifare il collegamento. In un buio totale la richiesta parte a ~2,9 s
  (prova con le funzioni pure, §3 tab. 4), resta in coda nel canale e il telefono la esegue **appena la rete torna**:
  in partita basta quindi un buco di circa 3 s, non di 5, per vedere «Collegamento…» / «Telefono 1 · mi ricollego…» sul
  telefono e una caduta (con ritorno quasi immediato) nel registro.
- Pannello dello stand: «Telefono 1 scollegato: si ricollega da solo, se no chiama lo staff» (`natpf_fiera.js:47-57`); sul
  telefono dello stand «Telefono 1 · mi ricollego…» (`phone-screen.js:153-160`).
- Il telecomando dello staff ha lo stesso schema ma è più tollerante: ping ogni 2 s, perso dopo **8 s**
  (`remote-pairing.js:38-40`).

### 1.7 TURN e versione web
Il TURN di Cloudflare (`natpf-turn`, `docs/GUIDA_TURN_CLOUDFLARE.md`) e il server PeerJS pubblico servono solo alla
versione web (Cloudflare) e alla sfida tra due computer: con `?lan=1` le credenziali non si chiedono (`ice-route.js:27-33`)
e `LanConnection` non ha server ICE. **Nel programma Windows non entrano mai.** Se allo stand si usasse la versione web,
il collegamento passerebbe da internet e dalla rete della fiera (captive portal, UDP bloccato, banda condivisa): è un
altro problema, non trattato qui.

### 1.8 Cosa si registra oggi delle cadute
- **Registro dello stand**: riga «tel» a ogni cambio (`registro_registratore.js:517-537`): «caduto» (o «scollegato»)
  quando il computer lascia «connected», poi «ricollegato» con `dopoS`, `strada`, `rtt`, `so`, `browser`, `inPartita`.
  Nella riga di fine partita `tel: { cadute, riprese, rtt, rttMax }` (`:347`, somme al secondo `:576`). Riassunto: cadute
  per ora, tempo per tornare, partite con almeno una caduta (`riassunto.mjs:263`, `:414-418`).
- **Diagnostica** (Maiusc+D, pesante, non per tutto il giorno): `tel.link` ogni secondo con rtt, messaggi al secondo e
  buco più lungo per tipo (`diag_recorder.js:531`), `tel.stato` a ogni cambio (`:404`), `tel2.link` (`:457`),
  prestazioni del computer: fotogrammi, compiti lunghi (`:522`), `tel.strada`.
- **Manca**: il perché (silenzio, chiusura dall'altra parte, WebRTC fallito, «Ricollega» chiesto dal gioco), chi se ne
  accorge per primo, cosa vedeva il telefono (rete, visibilità, tentativi falliti e perché), il computer fermo vicino alla
  caduta, le cadute «sostituite» (riparate dal telefono prima che il computer le veda), i cambi di indirizzo del PC. E
  l'`rtt` del registro è il migliore degli ultimi 12 scambi: non mostra la rete lenta. Il «Ricollega» automatico si scrive
  solo nella diagnostica (`tel.ricollega`, `natpf_ui.js:597`, `natpf_split_ui.js:641`), non nel registro.

---

## 2. Cause possibili di una caduta a schermo acceso

Tutte passano dalla stessa porta: **5 s senza messaggi** su uno dei due lati (`link.js:202`, `racchetta.js:474`) o, in
partita, **~3 s senza movimento** con il «Ricollega» automatico (§1.6). Le prove (§3) dicono che sotto queste soglie il
collegamento si ripara da solo e che il browser non segnala niente prima: la domanda vera è **che cosa ha prodotto un
silenzio di 3–5 s o più**.

| # | Causa | Probabilità per questa architettura |
|---|---|---|
| A | Buco nella Wi-Fi del singolo telefono ≥ 5 s | **alta** |
| B | Il telefono lascia la Wi-Fi dello stand (dati mobili, altra rete) | **media** (alta per i telefoni dei visitatori) |
| C | Wi-Fi dello stand che si ferma per tutti (router, canale, radar) | **media** (dipende dal router) |
| D | Computer fermo ≥ 5 s, o computer in Wi-Fi | **media-bassa** |
| E | Pagina del telefono ferma o in secondo piano a schermo acceso | **media-bassa** |
| F | Controllo di vita di 5 s e «Ricollega» a ~3 s troppo severi (moltiplicano A–E) | **alta come moltiplicatore** |
| G | Isolamento dei client nel punto d'accesso | bassa (con la fiera: media) |
| H | Indirizzo IP che cambia (PC o telefono) | bassa |
| I | Consenso ICE di WebRTC (regola: 30 s; nelle prove «failed» a ~15 s) | bassa |
| J | Segnalazione persa | bassa |
| K | TURN su internet tagliato dalla rete della fiera | **non applicabile** al programma Windows |
| L | Risparmio energetico del telefono a schermo acceso | bassa-media |
| M | Il PC che sospende la scheda di rete | bassa |

### A · Buco nella Wi-Fi del singolo telefono (alta)
- **Meccanismo**: il telefono, tenuto in mano e mosso tra tante persone (i corpi assorbono i 2,4 e i 5 GHz), perde il
  router per qualche secondo: segnale debole, 2,4 GHz affollata (decine di reti e centinaia di telefoni, Bluetooth),
  telefono che si riaggancia o viene spostato tra 2,4 e 5 GHz dal router («band steering»), router che butta fuori i
  telefoni con il segnale basso. Se il buco supera 5 s scatta il controllo di vita, in partita già da ~3 s il «Ricollega»
  automatico; sotto non succede niente.
- **Evidenza**: `link.js:202`, `racchetta.js:474`, `natpf_phone_watch.js:56-71`; prove §3: buio 5/7/12 s → caduta;
  perdite e singhiozzi fino a 2 s senza caduta; buio di 3 s in partita → «Ricollega» (tab. 4). Nell'architettura non
  c'è altro che possa interrompersi da solo a collegamento aperto (niente internet, niente segnalazione in uso).
- **Misura che la distingue**: il telefono dice «niente dal computer da 5 s, pagina visibile, rete `wifi`, pagina non
  ferma» e il computer «silenzio di 5 s, anche il movimento muto»; l'altro telefono resta collegato; il ritorno è breve
  (1–5 s). Se prima della caduta l'rtt e i ping senza risposta crescono → rete congestionata; se no → interruzione
  netta (riaggancio, router che butta fuori).

### B · Il telefono lascia la Wi-Fi dello stand (media; alta per i visitatori)
- **Meccanismo**: Android «Passa ai dati mobili», «Wi-Fi adattivo», «Smart network switch», iPhone «Assistenza Wi-Fi»;
  router senza internet (Android lo segna «connesso senza internet» e può far passare il traffico dai dati mobili); il
  telefono si attacca a un'altra rete conosciuta o a un altro access point della fiera in un'altra sottorete. La pagina è
  su `https://IP-del-PC:8443`: dalla rete mobile quell'indirizzo non si raggiunge.
- **Evidenza**: indirizzo privato del PC nel QR (`natpf_lan.js:10-19`); `netWhy` con «segnale non raggiunto»
  (`link.js:61`) quando il tentativo non arriva al PC.
- **Misura**: sul telefono `navigator.connection.type` passa a `cellular` (Chrome Android) o arriva `offline`/`change`;
  i tentativi di ricollegamento falliscono al primo passo (`signal: false`, il WebSocket verso il PC non si apre) a
  schermo acceso; il computer, quando il telefono torna, vede un indirizzo diverso (`ipCambiato`). Lungo tempo di ritorno.

### C · La Wi-Fi dello stand si ferma per tutti (media)
- **Meccanismo**: router che cambia canale da solo, canale DFS sui 5 GHz (52–144) con un radar rilevato: il router deve
  lasciare il canale e ascoltare per almeno un minuto; router surriscaldato o che si riavvia; troppi dispositivi
  agganciati (rete aperta o con password nota ai visitatori).
- **Misura**: **i due telefoni cadono insieme** (entro 2–3 s); ritorno lungo (30–60 s e oltre con il DFS); il PC sul cavo
  non vede niente, il PC in Wi-Fi perde la sua rete (riga nuova in `programma.log`).

### D · Il computer si ferma, o il computer in Wi-Fi (media-bassa)
- **Meccanismo**: la pagina del gioco bloccata per ≥ 5 s (caricamenti, grafica software sul ledwall, Windows occupato)
  non manda `dp` né `pong` e non legge i messaggi: il telefono chiude a 5 s e il computer, appena riparte, chiude anche
  lui (prova §3: computer fermo 6 s → caduta su tutti e due i lati; 4,5 s no). Un PC in Wi-Fi raddoppia il passaggio in
  aria (telefono → router → PC) e aggiunge i suoi buchi (scansioni di Windows, risparmio energetico a batteria).
- **Evidenza**: `link.js:192-205` (battito nel thread della pagina); nota della B41 in `docs/PROJECT_MEMORY.md`: «un
  fotogramma intero ridisegnato … ferma la pagina per secondi; oltre 5 s i telefoni cadono».
- **Misura**: ritardo del controllo di ogni secondo del computer (oggi non misurato: proposto `maxMs`), fotogrammi lunghi
  della partita nel registro (`fps`, `maxMs`, `lunghi`), i due telefoni che cadono insieme con il motivo «silenzio» dato
  dal computer subito dopo il blocco.

### E · Pagina del telefono ferma o in secondo piano a schermo acceso (media-bassa)
- **Meccanismo**: il visitatore tocca per sbaglio il bordo (gesto «Home» o «Indietro» di Android, tendina delle
  notifiche), arriva una chiamata o una finestra di sistema («Wi-Fi senza internet»), la pagina si chiude; risparmio
  energetico aggressivo di alcuni marchi.
- **Evidenza**: `racchetta.js:698` (visibilità mandata subito), `:716` (pagina chiusa → canale chiuso).
- **Misura**: il computer ha già `vis`/`hiddenAt` del telefono prima della caduta (`link.js:336`): basta scriverlo; con
  la pagina chiusa la caduta arriva come «chiuso dal telefono» subito, non come silenzio; il telefono misura il ritardo
  del proprio controllo di ogni secondo (pagina ferma).

### F · Controllo di vita e «Ricollega» troppo severi (alta come moltiplicatore)
- **Meccanismo**: 5 s su tutti e due i lati, guardando solo il canale affidabile; in partita, in più, il «Ricollega»
  automatico chiesto dopo ~2,9 s di buio totale ed eseguito appena la rete torna (`natpf_phone_watch.js:56-71`,
  `natpf_ui.js:596`): pensato per il solo canale veloce bloccato, scatta anche quando tace tutto. Il browser da solo, in
  laboratorio, non ha segnalato niente (nessun cambio di stato ICE) per buchi fino a 5 s: ogni caduta di oggi la decide il
  gioco. Con il 40% di pacchetti persi il canale affidabile è rimasto muto fino a 1,4 s mentre i sensori arrivavano ogni
  0,1 s: il controllo guarda la strada più lenta.
- **Misura**: distribuzione dei silenzi alla caduta (computer e telefono), quante cadute sono «Ricollega» chiesti dal
  gioco (motivo `ricollega`) e tempi di ritorno: se quasi tutte hanno buchi di 3–10 s e tornano in pochi secondi, soglie
  più larghe le avrebbero evitate (§3.2).

### G · Isolamento dei client (bassa; media con la rete della fiera)
- Con l'isolamento attivo il telefono non raggiunge mai il PC: il problema si vede subito, non a intermittenza. Diventa
  intermittente solo sulla rete della fiera con più access point o più sottoreti (il telefono si sposta su un access
  point dove i client sono isolati, o fuori dalla sottorete ammessa dal firewall, `desktop-core.mjs:208`).
- **Misura**: dopo la caduta i tentativi falliscono sempre allo stesso passo: segnalazione sì ma strada diretta no
  (`ice` fallito: passa il TCP, non l'UDP) oppure segnalazione no.

### H · Indirizzo IP che cambia (bassa)
- PC: se cambia a programma aperto cadono **tutti** i telefoni e non tornano (pagina e posto salvato legati
  all'indirizzo, certificato fatto all'avvio). Telefono: un indirizzo nuovo (cambio di access point o di sottorete)
  uccide il collegamento; il telefono si ricollega da solo se il PC resta raggiungibile.
- **Misura**: `programma.log` con i cambi di indirizzo del PC (da aggiungere); per il telefono, il computer confronta in
  memoria l'indirizzo della connessione nuova con quella di prima e scrive solo «cambiato sì/no» (niente indirizzi nel
  registro).

### I · Consenso ICE di WebRTC (bassa)
- Il browser rinnova il consenso della strada ogni pochi secondi; la regola (RFC 7675) lo fa scadere dopo 30 s senza
  risposta. Il Chromium delle prove ha segnato «disconnected» dopo 5–7,5 s di buio e «failed» dopo circa 15 s (tab. 3);
  `LanConnection` chiude solo su `failed` (`lan-transport.js:13`). Arriva quindi sempre prima il controllo dei 5 s del
  gioco: il consenso ICE non è la causa delle cadute di oggi.
- **Misura**: stato ICE e di connessione scritti alla caduta su tutti e due i lati.

### J · Segnalazione persa (bassa)
- A canale aperto la segnalazione non serve: il telefono ignora i suoi errori (`racchetta.js:245`) e la riallaccia
  (`:251-254`); la segnalazione del computer passa dal loopback. Conta solo per **tornare**: senza WebSocket verso il PC il
  telefono non si ricollega (`signal: false`).
- **Misura**: esito di ogni tentativo di ricollegamento (segnalazione sì/no, strada diretta sì/no).

### K · TURN su internet tagliato dalla rete della fiera (non applicabile)
- Nel programma Windows il TURN non c'è (§1.7). Vale solo se allo stand si usa la versione web.

### L · Risparmio energetico del telefono a schermo acceso (bassa-media)
- Il blocco dello schermo tiene acceso lo schermo, non la Wi-Fi al massimo: risparmio energetico del sistema, batteria
  bassa, risparmio della Wi-Fi di alcuni marchi aumentano i ritardi. Da solo difficilmente fa 5 s di silenzio con la
  pagina in primo piano e il telefono che manda 100 messaggi al secondo.
- **Misura**: batteria e carica, stato del blocco dello schermo, ritardo del controllo di ogni secondo sul telefono.

### M · Il PC che sospende la scheda di rete (bassa)
- Il programma tiene sveglio il PC (`main.mjs:486`); resta il risparmio energetico della Wi-Fi del PC a batteria e degli
  adattatori USB. Con il PC sul cavo è escluso.
- **Misura**: righe nuove in `programma.log` (indirizzi, alimentazione, segnale della Wi-Fi del PC).

### Le più probabili, per questa architettura
1. **A**, moltiplicata da **F**: tutto il collegamento passa dalla radio di un telefono mosso in mezzo alla folla, e il
   gioco trasforma in caduta ogni buco di 5 s (in partita di ~3 s). Nient'altro della catena può interrompersi da solo a
   collegamento aperto: niente internet, niente TURN, segnalazione non usata.
2. **B** per i telefoni con la SIM e i dati mobili accesi, soprattutto se il router dello stand non ha internet.
3. **C** se i due telefoni cadono insieme; **D** se cadono insieme subito dopo un blocco del gioco.
4. **E** se la pagina era nascosta (il computer lo sa già, va solo scritto).

---

## 3. Prove fatte qui (laboratorio)

### 3.1 Come
- Rete finta e chiusa: namespace di rete isolato (`unshare -n`) con un'interfaccia TAP finta e regole `iptables` valide
  solo lì (nessun effetto sulle prove degli altri agenti). Script: `scratchpad/b45/prove/exp.mjs` (prove),
  `analizza.mjs` (tabella), `rete.py` (rete finta), `resync.mjs` (regole del gioco da sole); risultati grezzi
  `base.json`, `patch.json`, `lungo.json`, `ricollega.json`; istruzioni in `prove/LEGGIMI.md`.
- Computer = una pagina con `createPhoneLink()` di `link.js`, come `tools/e2e/lan-browser.mjs`; telefono = la vera
  `racchetta.html?lan=1`, sensori finti a 60 Hz e profilo salvato (sensori attivi: binari a 40 Hz e piatto a ogni
  campione), segnalazione dal vero server `tools/lan/server.mjs`. Chromium 1243 senza finestra, tutti e due i lati.
- Disturbi: **buio** (tutto l'UDP più la segnalazione TCP del solo telefono) per N secondi; **perdita** casuale dei
  pacchetti UDP per 30 s; **singhiozzo** (buio 1 s / rete 1 s, buio 2 s / rete 1 s) per 30 s; **computer fermo** e
  **telefono fermo** (ciclo sul thread della pagina).
- Misure ogni 50 ms: stato sui due lati, età dell'ultimo messaggio di controllo (`ping`, `st`, `dq`) e di movimento
  (`bin`, `fo`) sul computer, cambi di stato ICE e chiusure dei canali.
- Macchina carica (load 5–9 su 4 processori per gli altri agenti): i tempi hanno qualche centinaio di ms di rumore.

### 3.2 Risultati

**Tabella 1 · Il collegamento di oggi** (5 s su tutti e due i lati; `base.json`). «Cade» = il computer lascia
«connected» e il telefono «on»; tempi dall'inizio del disturbo. «Regolare» = computer collegato, telefono «on», messaggi
di controllo e di movimento freschi.

| Disturbo | Cade? (computer / telefono) | Silenzio massimo del controllo | Regolare dopo la fine |
|---|---|---|---|
| nessuno, 8 s | no | 0,7 s | — |
| buio 2 s | no | 2,2 s | subito (< 0,1 s) |
| buio 3,5 s | no | 3,8 s | subito |
| buio 5 s | **sì** (5,0 s / 5,7 s) | 6,7 s | 1,7 s, ricollegato |
| buio 7 s | **sì** (5,9 s / 5,6 s) | 7,7 s | 0,5 s, ricollegato |
| buio 12 s | **sì** (5,5 s / 5,2 s) | 13,8 s | 1,3 s, ricollegato |
| 20% dei pacchetti persi per 30 s | no | 0,7 s (movimento 0,1 s) | — |
| 40% dei pacchetti persi per 30 s | no | 1,4 s (movimento 0,1 s) | — |
| singhiozzo 1 s buio / 1 s rete, 30 s | no | 1,7 s (movimento 1,1 s) | — |
| singhiozzo 2 s buio / 1 s rete, 30 s | no | 2,6 s (movimento 2,0 s) | — |
| computer fermo 3 s e 4,5 s | no | — | subito |
| computer fermo 6 s | **sì** (6,0 s, appena ripartito / 5,4 s) | — | 0,5 s, ricollegato |
| telefono fermo 4,5 s | no | 4,7 s | subito |
| telefono fermo 6 s | **sì** (5,6 s / 6,0 s, appena ripartito) | 7,5 s | 1,1 s, ricollegato |

- In tutte le cadute i canali li ha chiusi il gioco (5,0–6,0 s) **prima** di qualunque cambio di stato ICE: il browser non
  aveva ancora segnalato niente.
- Con un lato fermo, quel lato dichiara la caduta **appena riparte** (6,0 s): il suo controllo di ogni secondo gira
  prima che legga i messaggi rimasti in coda. È un falso allarme sopra un silenzio vero.

**Tabella 2 · Variante di prova** (copia modificata della pagina, **non** nel repository: chiusura dopo 12 s su tutti e
due i lati, i pacchetti dei sensori contano come segno di vita, il computer manda il battito anche sul canale veloce;
`patch.json`).

| Disturbo | Cade? | Regolare dopo la fine | Stato ICE visto dal browser |
|---|---|---|---|
| buio 5 s | no | subito | «disconnected» a 5,3 s, subito «connected» |
| buio 7 s | no | subito | «disconnected» e «connected» a 7,6 s |
| buio 10 s | no | subito | «disconnected» a 5,1 s, «connected» a 10,0 s |
| buio 20 s | sì (12,2 s / 12,7 s) | 0,8 s, ricollegato | «disconnected» a 7,4 s |
| 40% persi per 30 s | no | — | — |
| singhiozzo 2 s / 1 s, 30 s | no | — | — |
| computer fermo 6 s | no | subito | — |
| telefono fermo 6 s | no | subito | — |

**Tabella 3 · Il browser da solo** (`lungo.json`: controllo del gioco portato a 60 s). Buio di 40 s: ICE «disconnected»
a 5,4 s, connessione «failed» a **15,4 s** su tutti e due i lati, canali chiusi da `LanConnection` (`lan-transport.js:13`),
ricollegati 1,8 s dopo la fine del buio.

**Tabella 4 · Pausa e «Ricollega» in partita** (solo le regole pure del gioco, `natpf_phone_watch.js`, con un buio
totale; `resync.mjs`). «Segnale» = età dell'ultimo `st` del telefono quando comincia il buio (arriva ogni secondo).

| Buio | Segnale 0 ms | Segnale 500 ms | Segnale 1000 ms |
|---|---|---|---|
| 1,5 s | niente | niente | niente |
| 2 s | niente | niente | pausa a 1,8 s |
| 2,5 s | niente | pausa a 2,3 s | pausa a 1,8 s |
| 3 s e oltre | pausa a 2,8 s, «Ricollega» a 2,9 s | pausa a 2,3 s, «Ricollega» a 2,9 s | pausa a 1,8 s, «Ricollega» a 2,9 s |

- Il «Ricollega» chiesto durante il buio resta in coda nel canale e il telefono lo esegue quando la rete torna. Prova nel
  browser (rete finta, `ricollega.json`): con «Ricollega» il computer passa a «lost» e torna «connected» in meno di 0,1 s,
  quindi nel registro è una caduta con ritorno quasi immediato. Il gioco intero nel browser con un buio di 3–4 s in
  partita non è stato provato (la catena è letta nel codice: `link.relink` → `cmd 'relink'` → `racchetta.js:584` →
  `connect()`).

### 3.3 Cosa vuol dire
- Oggi ogni caduta la decide il gioco: il controllo dei 5 s e, in partita, il «Ricollega» a ~2,9 s. Il browser di queste
  prove segna la strada «disconnected» solo dopo 5–7,5 s e la dà per morta dopo circa 15 s.
- Perdite di pacchetti e reti a singhiozzo sono tollerate: il problema non è «la Wi-Fi perde pacchetti» ma «la Wi-Fi (o
  una delle due pagine) si ferma per 5 s o più» (in partita già 3 s).
- Il canale affidabile allunga i buchi solo di qualche decimo di secondo, non di secondi: con il buio a intermittenza il
  suo silenzio è il buio più il ritmo normale dei messaggi (a rete calma l'ultimo messaggio di controllo ha al massimo
  0,7 s); con il 40% di pacchetti persi arriva a 1,4 s contro 0,1 s dei sensori (ritrasmissioni). In laboratorio
  l'effetto «strada lenta» è piccolo; su una Wi-Fi vera con Android non è misurato.
- Dopo un buco di 5 s o più il ricollegamento in laboratorio è rapido (0,5–1,8 s dalla fine: dipende da quando il
  tentativo in corso ritenta). Su una Wi-Fi vera si aggiungono il riaggancio al router e, per il telefono dello stand, la
  prova HMAC: non misurato.
- La variante non toccava il «Ricollega» del gioco (la pagina di prova non è il gioco intero): per avere lo stesso
  risultato in partita va cambiato anche quello (§5, punto 2).
- Con 12 s i buchi di 5–10 s e i blocchi di 6 s non fanno più cadere niente e il gioco è regolare appena finisce il
  disturbo: meno cadute, niente da rifare, il pannello non mostra «scollegato». Il prezzo: un telefono perso davvero si
  vede perso circa 7 s più tardi (la partita è già in pausa dopo 0,3 s).
- Dove le prove non sono la realtà: tutto dentro un computer, senza radio, senza Android né iPhone, buio netto e perdita
  casuale; i tempi reali saranno più lunghi.

---

## 4. Piano di misura

Principio: misurare **sui due lati, nel momento della caduta**, con poco costo, sempre acceso (registro dello stand),
senza indirizzi né nomi, e restando compatibili con telefoni e computer di prima.

### 4.1 Sul computer (`link.js`): il diario delle cadute
- **Dove**: nei punti in cui il collegamento finisce: silenzio (`:202`), chiusura (`:362-367`), sostituzione
  (`:255-259`), e le chiusure volute dello staff (`forget`, `standConfirm`: motivo `staff`). Un evento nuovo
  `emit('drop', …)` raccolto da `natpf_phone_racket.js` (`:605-618`) come gli altri.
- **Cosa**:
  - `motivo`: `silenzio` (5 s senza messaggi), `chiuso` (canale chiuso dall'altra parte con la connessione ancora buona),
    `webrtc` (connessione `failed`/`closed`: si legge `c.pc.connectionState` nella chiusura), `sostituito` (lo stesso
    telefono è rientrato prima che il computer vedesse la caduta), `ricollega` (ricollegamento chiesto dal gioco,
    `natpf_ui.js:596`), `staff`;
  - età dell'ultimo messaggio di controllo e dell'ultimo pacchetto di movimento (ms): movimento vivo e controllo muto →
    canale affidabile in ritardo; tutti e due muti → rete o telefono fermo;
  - rtt degli ultimi 10 s dai `dq` (ultimo, mediano, massimo; **non** il migliore dei 12 di `pairing.js:79-85`) e quanti
    `dp` sono rimasti senza risposta;
  - ritardo massimo del proprio controllo di ogni secondo negli ultimi 10 s: oltre ~2,5 s il computer era fermo;
  - stato ICE e della connessione, `bufferedAmount` dei due canali;
  - l'ultimo stato del telefono già noto (`link.js:336`): pagina visibile o da quanto nascosta, blocco dello schermo,
    batteria e carica, età dei sensori, età dell'ultimo `st`;
  - posto (Telefono 1/2, dello stand o no), partita in corso, e se l'altro telefono è caduto entro 3 s;
  - al ritorno: tempo fino al nuovo collegamento, stesso telefono (chiave), indirizzo del telefono cambiato sì/no
    (confronto **in memoria** del candidato remoto di getStats: l'indirizzo non si scrive mai).

### 4.2 Sul telefono (`racchetta.js`): il diario delle cadute
- **Dove**: `lost(why)` (`:345`) con il motivo dato da chi la chiama: `silenzio` (`:474`), `chiuso` (`:240`), `errore`
  (`:241`), `segnale` (`:249`, con `e.type`), `segnale-perso` (`:253`), `tentativo` (tempo scaduto, `:212-218`), `prova`
  (prova HMAC non riuscita, `:390`), `pagina` (pagina chiusa, `:716`).
- **Cosa**: età dell'ultimo messaggio dal computer; rtt (media dei `pong`, `:295`) e massimo degli ultimi 10 s; ping
  senza risposta; stato ICE e della connessione (`conn.pc` in LAN, `conn.peerConnection` via internet) e
  `bufferedAmount`; `navigator.connection.type`/`effectiveType` (solo Chrome su Android) e `navigator.onLine`, con gli
  ultimi eventi `online`/`offline`/`change` (ms prima della caduta); `document.hidden`, schermo intero, blocco dello
  schermo, batteria e carica; ritardo massimo del proprio controllo di ogni secondo negli ultimi 10 s; età dell'ultimo
  campione dei sensori.
- Poi **ogni tentativo** di ricollegamento: esito (`netInfo`: segnalazione sì/no, stato ICE), durata; alla fine il tempo
  dalla caduta al `welcome`.
- **Vincolo dei test**: il pezzo di `racchetta.js` tra `async function connect(){` e `// messaggi che valgono solo se
  arrivano subito` gira nella sandbox di `phone-reconnect` e `stand-phone` (`docs/PROJECT_MEMORY.md`, B41): lì dentro solo
  variabili che la sandbox ha. Il diario va dopo quel commento; dentro si chiama una funzione che la sandbox fornisce vuota.

### 4.3 Il telefono racconta la sua parte dopo essersi ricollegato
- Subito dopo il `welcome` il telefono manda `{ t: 'cad', v: 1, l: [ … ] }` con le cadute non ancora confermate (al
  massimo 5 per messaggio, tenute le ultime 10). Ogni voce porta la sua **età in ms** al momento dell'invio al posto
  dell'ora: nessun orologio da allineare (il computer fa «adesso − età»).
- Il computer risponde `{ t: 'cadOk', n }` e il telefono le toglie. Il telefono le tiene in `sessionStorage` (racchetta
  normale) o `localStorage` (telefono dello stand): sopravvivono anche a una pagina ricaricata.
- Compatibilità: un computer vecchio ignora `cad` (lo switch di `link.js:328-357` non ha quel caso); un telefono vecchio
  non lo manda e il computer scrive solo la sua parte.
- Il computer unisce le due parti (stesso posto, caduta del telefono entro ±10 s da quella vista dal computer) e decide
  **chi se n'è accorto prima** (`fonte`).

### 4.4 Dove lo vede lo staff
- Pannello dello stand (F9), nel foglio «Telefoni dello stand» della B41.4 (fino ad allora una riga per posto sotto il
  registro; nelle aree strette solo i numeri):
  > Telefono 1 · pronto ✓ · 3 cadute oggi · ultima alle 15:42, tornato in 4 s · di solito: Wi-Fi persa per qualche secondo
- Quando una causa si ripete, un consiglio: «2 volte su 3 il telefono era passato ai dati mobili: spegnili» · «I due
  telefoni cadono insieme: controlla il router (canale, posizione)» · «Il computer si era fermato 6 s» · «Il telefono era
  uscito dalla pagina del gioco».
- Una funzione pura (per esempio `causaCaduta(d)` in un modulo nuovo, provata da sola) sceglie la frase in quest'ordine:
  pagina nascosta o chiusa → computer fermo (≥ 2,5 s) → telefono fermo (≥ 2,5 s) → telefono fuori dalla Wi-Fi (rete
  mobile, offline, cambio di rete) → tutti e due i telefoni insieme → controllo in ritardo con il movimento vivo → «Wi-Fi
  persa per qualche secondo». Per il ritorno: tentativi falliti al primo passo → «il telefono non raggiungeva il
  computer»; segnalazione sì e strada diretta no → «la rete blocca il collegamento diretto».
- I conti della giornata stanno nella memoria del gioco e nel registro; il pannello non va mai sul ledwall pubblico.

### 4.5 Nel registro dello stand (formato delle righe 2, **senza ricaricare il Worker**)
- Riga `tel` alla caduta (`stato: 'caduto'`, esiste già): in più `motivo` (computer), `ms` (età dell'ultimo messaggio di
  controllo), `rtt` e `rttMax` (ultimi 10 s), `perse` (`dp` senza risposta), `maxMs` (computer fermo), `volte` (cadute
  del posto oggi), `stand` (true per il telefono dello stand) e la mappa `perche` con soli numeri: `movimentoMs`,
  `nascosta` (0/1), `nascostaMs`, `schermo` (−1/0/1), `batteria`, `carica` (0/1), `sensoriMs`, `segnaleMs`,
  `altroTelefono` (0/1).
- Riga `tel` al ritorno (`stato: 'ricollegato'`, esiste già con `dopoS`, `strada`, `rtt`, `so`, `browser`): in più
  `causa` (motivo del telefono), `fonte` (`computer` · `telefono` · `insieme`), `tipo` (rete del telefono: `wifi`,
  `cellular`, `none`, `?`), `prove`, `fallite`, e `perche` con `telSilenzioMs`, `telRttMax`, `telPingPersi`,
  `telFermoMs`, `offline` (0/1), `cambioRete` (0/1), `ipCambiato` (0/1), `ice` (codice 0–5 dello stato).
- Riga `partita.fine`: `tel.perche` = conti per causa della partita (per esempio `{ 'Wi-Fi': 2, 'dati mobili': 1 }`).
- Tutti questi nomi sono già in `CAMPI` (`registro_formato.js:49-62`: `chi`, `stato`, `motivo`, `causa`, `fonte`, `ms`,
  `rtt`, `rttMax`, `perse`, `maxMs`, `volte`, `stand`, `tipo`, `prove`, `fallite`, `dopoS`, `strada`, `so`, `browser`,
  `inPartita`) o sono voci della mappa `perche` (`MAPPE`, `:68`: voci libere, valori solo numeri): il Worker di oggi li
  accetta così come sono (`pulisci`, `:227-251`). Niente indirizzi né identificativi: «indirizzo cambiato» è solo 0/1.
- Campi propri (`vis`, `ice`, `rete`…) solo se servisse leggerli meglio: formato 3, tutti insieme in fondo a `CAMPI`, le
  due copie uguali (test) e Worker da ricaricare una volta, come per il B36.0. **Per la prima misura non serve.**
- Riassunto (`scripts/registro/riassunto.mjs`): sezione «Perché cadono i telefoni»: cadute per posto e per causa, chi se
  ne accorge prima, tempi di ritorno, cadute insieme dei due telefoni, cadute vicine a fotogrammi lunghi del computer.

### 4.6 Nella diagnostica (Maiusc+D)
- Eventi `tel.caduta`, `tel2.caduta`, `tel.ricollegato` con tutti i campi grezzi (anche stati ICE, conteggi per canale,
  tentativi del telefono); in `tel.link` di ogni secondo (`diag_recorder.js:531`) l'età separata dell'ultimo messaggio di
  controllo e di movimento e il ritardo del controllo di ogni secondo.

### 4.7 Nel programma Windows (`programma.log`)
- Cambi degli indirizzi del PC (la stessa lettura che `launcher.mjs:25-30` fa già ogni 2 s), eventi di `powerMonitor`
  (sospensione, ripresa, passaggio a batteria) e, con il PC in Wi-Fi, ogni 30 s segnale, canale e «access point cambiato
  sì/no» (da `netsh wlan show interfaces`, senza nomi di rete). Nel registro solo «indirizzo del PC cambiato» (sì/no).

---

## 5. Miglioramenti sicuri del collegamento

In ordine di sicurezza; ognuno da solo, con i suoi test e con la prova della rete finta prima/dopo (§3).

1. **Niente falso allarme del lato rimasto fermo.** Se il controllo di ogni secondo arriva con più di ~2,5 s di ritardo
   (era fermo il lato stesso), per quel giro non si giudica: prima si leggono i messaggi in coda (`link.js:202`,
   `racchetta.js:474`). *Motivo*: in laboratorio il lato fermo dichiarava la caduta appena ripartito (tab. 1, 6,0 s).
   *Rischio*: basso; una caduta vera si vede un secondo dopo.
2. **«Ricollega» automatico solo se il telefono risponde.** `createResync` (`natpf_phone_watch.js:56-71`) chiede il
   ricollegamento solo con il segnale del telefono recente (`beatAt` entro `WATCH.beatMs`), cioè quando è davvero
   bloccato il solo canale veloce, il caso per cui era nato (diagnostica del 29/10). Con tutto muto decidono il controllo
   di vita e la pausa. *Motivo*: oggi in partita un buio di ~3 s fa già rifare il collegamento quando la rete torna
   (tab. 4). *Rischio*: basso; il caso «canale veloce bloccato» resta coperto. Test: `natpf_phone_watch` con il segnale
   vecchio e con quello recente.
3. **Ogni dato vale come segno di vita.** Il computer aggiorna `lastSeen` anche con i sensori (`motion`, `link.js:359`)
   e con il percorso veloce (`fast`, `:361`; via internet `acceptFast`, `:208`) e manda il suo battito anche sul canale
   veloce; il telefono lo conta (`c.on('fast')` in `connect()`). *Motivo*: con la rete che perde pacchetti il canale
   affidabile resta muto più a lungo (40% persi: 1,4 s contro 0,1 s dei sensori). *Rischio*: basso; un canale di
   controllo bloccato con i sensori vivi non chiude più il collegamento, quindi va segnalato a parte (i comandi del gioco
   non arriverebbero: diagnostica e pausa).
4. **Chiudere più tardi, mettere in pausa come oggi.** Chiusura dopo 10–12 s di silenzio invece di 5, su tutti e due i
   lati (`link.js:202`, `racchetta.js:474`); la pausa resta com'è (`natpf_phone_watch.js`: 0,3 s per pagina nascosta o
   collegamento perso, 1,8–2,8 s in un buio totale). *Motivo*: con 12 s i buchi di 5–10 s e i blocchi di 6 s non fanno
   più cadere niente e il collegamento torna subito (tab. 2), mentre con 5 s cadevano e si ricollegavano (tab. 1); il
   browser stesso aspetta ~15 s (tab. 3); il telecomando dello staff usa già 8 s (`remote-pairing.js:40`). Senza il punto 2
   in partita non serve. *Rischio*: medio-basso: un telefono perso davvero diventa «scollegato» 5–7 s più tardi (partita
   già in pausa); un telefono spento di colpo tiene il posto 12 s invece di 5; i testi del pannello e del telefono vanno
   riletti.
5. **Ricollegamento più rapido in LAN.** Su `online`, su `navigator.connection` `change` e su errore della segnalazione
   si riparte subito con un tentativo nuovo, senza aspettare quello appeso (oggi fino a 12 s: `racchetta.js:213-218`); in
   LAN il tentativo scende a 6–8 s. *Motivo*: dopo un buco lungo il tentativo in corso aspetta i ritentativi del TCP (in
   laboratorio 0,5–1,8 s, nella realtà anche di più). *Rischio*: basso-medio: su una Wi-Fi molto lenta un tentativo
   troppo corto si interrompe da solo; mai sotto i 6 s.
6. **Orientamento del piatto senza ripiego sul canale affidabile.** `fo` (e i campioni `rs` della diagnostica) quando il
   canale veloce c'è ma è pieno si buttano invece di passare su quello affidabile (`racchetta.js:524`, `:533`). *Motivo*:
   arrivati tardi non servono e allungano la coda ordinata proprio quando la rete soffre. *Rischio*: basso (la racchetta
   a schermo resta ferma un attimo, come già succede); il ripiego resta dove il canale veloce non c'è.
7. **Contare quello che si butta.** `LanConnection.send` oltre 64 KB (`lan-transport.js:43`) butta in silenzio anche
   ping e stato: contarli e mostrarli nella diagnostica. *Rischio*: nullo.
8. **rtt che mostra la rete lenta.** Nel registro e nel pannello mediano e massimo degli ultimi 10 s invece del migliore
   dei 12 (l'orologio dei colpi, `pairing.js:79-85`, resta com'è). *Rischio*: nullo (solo misura).
9. **Avvisi sulla rete del PC.** Nel pannello e in `programma.log`: «Il computer è su due reti: i telefoni potrebbero
   non trovarlo» (`server.mjs:12-16` mette la Wi-Fi davanti al cavo) e «Indirizzo del computer cambiato: riavvia il
   programma» (certificato e pagina dei telefoni legati all'indirizzo). *Rischio*: nullo (solo testi).
10. **Più avanti, solo con le misure in mano**: rifare la strada WebRTC senza buttare il collegamento quando il browser
    dice «disconnected» (ICE restart: tocca la segnalazione); meno pacchetti piccoli dal telefono (sensori e piatto nello
    stesso pacchetto a 30–40 Hz) per pesare meno sulla 2,4 GHz. *Rischio*: medio: toccano il percorso dei colpi.

---

## 6. Rete dello stand: consigli pratici

In parole semplici, per la prossima giornata (non serve cambiare il programma):

- **Un router (o access point) solo per lo stand**, non la Wi-Fi della fiera: quella ha migliaia di persone, spesso isola
  i dispositivi tra loro o chiede di accedere da una pagina.
- **Vicino ai giocatori e in alto** (2–3 m, sopra le teste, su un'asta o sul traliccio), in vista dei telefoni: i corpi
  delle persone fermano il segnale. Non dietro al ledwall, non dentro mobili di metallo, non per terra, lontano dagli
  alimentatori del ledwall.
- **Computer collegato al router con il cavo** e Wi-Fi del computer spenta: con due reti il QR può indicare quella
  sbagliata, e il computer in Wi-Fi raddoppia il traffico in aria.
- **Solo 5 GHz** per la rete dello stand, con un nome suo (spegnete «smart connect»/«band steering», che sposta i telefoni
  tra 2,4 e 5 GHz).
- **Canale fisso 36, 40, 44 o 48**: niente canale «automatico» (cambia durante il giorno e stacca tutti) e niente canali
  da 52 a 144 (se il router sente un radar deve lasciare il canale e restare zitto almeno un minuto). Larghezza 20 o 40
  MHz, non 80 o 160.
- Se serve la 2,4 GHz: canale fisso 1, 6 o 11 (il meno usato), 20 MHz.
- Prima dell'apertura e nell'ora di punta guardate i canali con un'app di analisi Wi-Fi su un telefono dello stand e
  scegliete il più libero; dove si gioca il segnale dev'essere pieno (migliore di −65 dBm).
- **Password** (WPA2 o WPA3) solo per i dispositivi dello stand; **niente isolamento dei client**, niente «rete ospiti»,
  niente pagina di accesso.
- **Indirizzo fisso per il computer** (prenotazione DHCP nel router) e permessi DHCP lunghi: se l'indirizzo cambia, i
  telefoni dello stand non trovano più la pagina e vanno riabbinati.
- **Telefoni dello stand**: dati mobili spenti (o senza SIM); «passa ai dati mobili», «Wi-Fi adattivo», «Assistenza
  Wi-Fi» spenti; altre reti Wi-Fi salvate dimenticate; se il router non ha internet, alla domanda «Questa rete non ha
  accesso a internet» rispondete «Rimani connesso»; Bluetooth e risparmio energetico spenti; telefoni carichi o in carica;
  «Non disturbare» (niente chiamate né notifiche a tutto schermo); **app fissata** («Fissa app» su Android, «Accesso
  guidato» su iPhone) sulla pagina del gioco, così un tocco sul bordo non fa uscire dalla pagina.
- **Computer** alla corrente (non a batteria), risparmio energetico della scheda di rete spento, niente altri programmi
  pesanti aperti.
- **Un router di riserva** configurato uguale (stesso nome, password e indirizzi) per cambiarlo in un minuto.
- **Provate con la gente intorno**, con i telefoni in mano come in partita, non appoggiati sul tavolo.

---

## 7. Piano del blocco B45

Passi piccoli, ognuno con test verdi, commit, documenti (Checkpoint, `WORK_PROGRESS.md`) e, se cambia il contenuto dei
pacchetti, versione nuova con zip e installer come da regole. I passi B45.1–B45.5 **misurano soltanto**: il gioco si
comporta come oggi.

- **B45.0 · analisi (fatto)**: questo documento. Da mandare subito all'utente i consigli del §6, che servono già alla
  prossima giornata, e la domanda a scelta: «correzione dei 12 s subito, oppure prima una giornata di misure?».
- **B45.1 · diario delle cadute sul computer** (`link.js`, `natpf_phone_racket.js`): motivo, età dei messaggi di
  controllo e di movimento, rtt degli ultimi 10 s e `dp` senza risposta, ritardo del proprio controllo, stato ICE,
  ultimo stato del telefono, caduta «sostituita» e «ricollega» resi visibili; evento `drop`. *Prove*: test node con
  collegamenti finti (come `tools/test/phone-reconnect.test.mjs`); rete finta di §3: buio 7 s → motivo «silenzio» con il
  movimento muto, computer fermo 6 s → ritardo ≥ 5 s, 40% persi → nessuna caduta. *Chiuso quando*: per ogni caduta delle
  prove c'è un oggetto con tutti i campi e nessun indirizzo.
- **B45.2 · diario del telefono e racconto** (`racchetta.js`, `link.js`): `lost(why)`, rete e visibilità, ritardo del
  proprio controllo, tentativi; messaggio `cad`/`cadOk`; memoria della pagina (sessione o, per lo stand, locale). Vincolo
  della sandbox dei test (§4.2). *Prove*: `phone-reconnect`, `stand-phone`, test nuovo del racconto (telefono vecchio con
  computer nuovo e viceversa), prova nel browser con la rete finta (il computer riceve la parte del telefono dopo un buio
  di 7 s). *Chiuso quando*: il computer ha le due parti e sceglie `fonte`.
- **B45.3 · registro e riassunto** (`registro_registratore.js`, `scripts/registro/riassunto.mjs`): righe `tel` con i
  campi già esistenti e la mappa `perche` (§4.5), `partita.fine.tel.perche`, sezione «Perché cadono i telefoni». *Prove*:
  `controllaRiga` sulle righe nuove (niente indirizzi, niente campi fuori da `CAMPI`), il Worker di oggi le accetta
  intere (`scripts/registro/worker-locale.mjs`), `natpf-registro` nel browser. *Chiuso quando*: una giornata finta
  (`scripts/registro/finto.mjs` con cadute) dà la sezione nuova del riassunto.
- **B45.4 · pannello dello stand** (funzione pura `causaCaduta` in un modulo nuovo, `natpf_kiosk.js` o il foglio della
  B41.4): riga per posto e consiglio. *Prove*: test della funzione (tutte le cause e l'ordine), pannello alle 5 misure
  (1920×1080, 1280×720, 1024×600, 720×720, 1920×540) con le schermate guardate. *Chiuso quando*: la riga si legge intera e
  non esce mai sul ledwall pubblico.
- **B45.5 · programma Windows** (`natpf-desktop/src/main.mjs`, funzioni pure in `desktop-core.mjs`): righe di rete in
  `programma.log`, avviso «computer su due reti» e «indirizzo cambiato». *Prove*: test di `natpf-desktop`; su Windows vero
  non provabile qui (da dire).
- **B45.6 · versione e giornata di misura**: versione nuova, zip e installer; l'utente gioca una giornata in fiera con il
  registro acceso e i consigli del §6; si legge la sezione nuova del riassunto e si decide con le domande a scelta quali
  correzioni fare.
- **B45.7 · correzioni**, una alla volta (§5, nell'ordine 1 → 6, poi 7–9): falso allarme del lato fermo; «Ricollega»
  solo con il telefono che risponde; ogni dato come segno di vita; chiusura a 10–12 s; ricollegamento rapido; `fo` senza
  ripiego. *Prove*: `phone-reconnect`,
  `stand-phone`, `natpf-phone-blackout`, `natpf-fiera-telefoni`, `natpf-training-reconnect`, `lan-browser`, e le tabelle
  di §3 rifatte sul codice vero (non sulla copia di prova), più una prova nuova con il gioco intero in partita e un buio di
  3–4 s. *Chiuso quando*: con la rete finta un buio di 7 s e un blocco di 6 s non fanno più cadere niente (anche in
  partita) e un buio di 20 s cade e torna da solo.

Se l'utente vuole subito meno cadute (prima della giornata di misura), i punti 1–4 del §5 si possono fare per primi: sono
piccoli e la prova di laboratorio c'è già; in quel caso B45.1 resta comunque da fare per capire il perché.

---

## 8. Cosa non è stato verificato

- Nessuna rete vera di una fiera, nessun router vero, nessun telefono vero: le prove sono in una rete finta dentro un
  solo computer (loopback e un'interfaccia TAP), senza radio, senza Android né iPhone. I due lati erano Chromium 1243
  senza finestra; il programma Windows è Electron/Chromium su Windows e i telefoni sono Chrome su Android o Safari.
- Il buio delle prove è netto (tutto o niente) e la perdita è casuale; la Wi-Fi vera ha ritardi che crescono, ritrasmissioni
  della radio, riagganci al router con DHCP: i tempi di ritorno veri saranno più lunghi di 0,5–1,8 s.
- Non verificato cosa fanno davvero Android con il router senza internet e i dati mobili accesi, iPhone con «Assistenza
  Wi-Fi», i gesti sul bordo durante il colpo, il risparmio energetico dei singoli marchi: descritto da come funzionano i
  sistemi, da confermare con le misure di B45.2.
- I tempi del browser («disconnected» a 5–7,5 s, «failed» a ~15 s) sono di questo Chromium su Linux: Chrome su Android e
  Safari non sono misurati. Non misurati neanche il silenzio di un router dopo un radar (canali DFS) né le scansioni Wi-Fi
  di Windows.
- La variante a 12 s è una copia modificata solo per la prova (`scratchpad/b45/prove/variante/`), non è nel repository e
  non è passata dai test del progetto.
- La macchina delle prove era carica (altri agenti al lavoro, load 5–9): qualche centinaio di ms di rumore nei tempi.
- Le cause B, C, E, G, H restano ipotesi finché il registro con le misure di B45.1–B45.3 non dice quale si ripete; la
  probabilità data a ciascuna è un giudizio sull'architettura, non una misura.
- Non letti i registri veri dello stand dell'utente (né `programma.log`): con quelli si potrebbe già vedere se le cadute
  sono dei due telefoni insieme e quanto durano (`dopoS`).
