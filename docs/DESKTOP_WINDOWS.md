# NATPF Simulator su Windows · valutazione, architettura consigliata e piano (04/11/2026)

Documento vivo (blocco B6 di `docs/PIANO_LAVORI.md`): si aggiorna quando cambiano le decisioni o arrivano le misure.

Documento richiesto dall'utente il 04/11/2026 (punto 4): valutare una versione installabile su Windows, fare l'audit
dell'architettura (prestazioni, rendering, comunicazione, latenza, stabilità), capire cosa richiede davvero la rete,
come migliorare abbinamento e comunicazione telefono↔PC e come restare compatibili con la versione browser.
**Valutazione iniziale**: confronto tecnico, architettura consigliata, benefici attesi e piano.

Legenda delle affermazioni: **M** = misurato o verificato nel codice, con il riferimento; **S** = stima;
**D** = dedotto dal codice, non provato su Windows. In questo ambiente (Linux, WebGL software, nessun telefono vero,
WebRTC senza candidati ICE) gli fps non hanno valore: valgono i conteggi. Niente è stato provato su un PC Windows.

---

## 1. In breve

- **Non serve riscrivere niente.** Electron, Tauri o il browser disegnano con lo stesso motore (Chromium o WebView2,
  che è Chromium): il guscio da solo **non** migliora le prestazioni del 3D. Il collo di bottiglia non è la rete
  (consegna in LAN 2–15 ms, M dai documenti) ma il carico grafico fisso, la webcam sul thread del disegno, il ritardo
  dello schermo non tarato e la robustezza operativa su Windows.
- **Versione Windows consigliata: il pacchetto portatile attuale, rinforzato («A+»)** — Node portatile (firmato da
  OpenJS) + Edge già presente in Windows 10, aperto in modalità app o chiosco sul ledwall, certificati in una cartella
  stabile, regole del firewall complete. Niente installer, niente firma del codice, si copia la cartella sul PC
  noleggiato e si avvia.
- **Electron** resta la strada se dopo A+ restano problemi di firewall/WebRTC, di gestione dello schermo o di
  aggiornamenti. **Senza un certificato di firma** (risposta dell'utente) un'app Electron mostra l'avviso di
  SmartScreen su ogni PC noleggiato: per questo oggi non è la prima scelta. **Tauri, NW.js e Neutralino sono
  sconsigliati** (§6).
- **Prima del guscio, i miglioramenti web** che valgono anche per la versione browser: livelli di qualità grafica con
  scelta automatica (la GPU del PC noleggiato non è nota), taratura del ritardo dello schermo, eliminazione del
  traffico inutile, origine stabile del gioco sul PC.

## 2. Contesto d'uso (risposte dell'utente, 04/11)

| Tema | Risposta | Conseguenza |
|---|---|---|
| Telefoni | dello staff | il certificato della rete NATPF si installa una volta per telefono: accettabile |
| Rete allo stand | dedicata | LAN stabile; internet non dato per certo → la base resta **offline** |
| Ledwall | monitor esteso | serve aprire il gioco a schermo intero **sul secondo monitor** |
| Sistema | Windows 10 | Edge (Chromium) presente; WebView2 non garantito; niente Smart App Control (è di Windows 11) |
| GPU | ignota, PC noleggiato, probabilmente integrata | qualità grafica **automatica** in cima alle priorità |
| Firma del codice | nessuna | favorisce il pacchetto portatile; un installer non firmato mostra SmartScreen |
| Modalità | un solo PC: stesso schermo, allenamento, minigiochi, al massimo 1v1 contro la CPU | **niente 1v1 tra due PC né multiplayer**: la fase dei trasporti tra PC esce dal piano |

## 3. Architettura attuale (M, riferimenti nel codice)

- **Gioco** (`natpf-tennis/`): Vite 7 + three.js 0.160, senza framework UI. Build ~47 MB, di cui MediaPipe ~41 MB
  (hands e pose; WASM sia SIMD sia non SIMD, ~12 MB doppi). Bundle JS ~1,4 MB (420 KB gzip). 3D procedurale, niente
  GLB. `react`, `react-dom`, `@vitejs/plugin-react` sono in `package.json` ma nessun file li importa.
- **Pagina del telefono** (`site/tennis/racchetta.html` + `site/js/tennis/`): sensori, riconoscimento del colpo sul
  telefono, calibrazione; servita dallo stesso server sotto `/natpf/`.
- **Pacchetto LAN** (`natpf-tennis/lan/pacchetto.mjs`): `dist`, server Node (`lan/server.mjs`,
  `game-handler.mjs`, `scripts/match-relay.mjs`), `tools/lan` (launcher, segnalazione, certificato) con `ws` e
  `node-forge`, `node.exe` portatile, tre file `.cmd` (AVVIA NATPF LAN, SBLOCCA LA RETE, PREPARA I TELEFONI). Zip
  ~61 MB.
- **Server LAN**: HTTPS su 0.0.0.0:8443 (keep-alive 65 s), guida su http://127.0.0.1:8080/lan/, WebSocket
  `/lan-signal` per la segnalazione (controllo dell'origine, limiti di frequenza e dimensione, ping ogni 10 s), relay
  `/api` in memoria, file statici con ETag.
- **Certificati** (`tools/lan/certificato.mjs`): autorità locale di 10 anni **dentro la cartella del pacchetto**
  (`tools/lan/certs/ca`), senza `nameConstraints`; certificato del server di 800 giorni per gli IP LAN, localhost e il
  nome del PC; il PC si fida con `certutil -user -addstore Root`; il telefono installa il profilo dalla pagina HTTP
  sulla porta 8081.
- **Firewall** (`SBLOCCA LA RETE.cmd`): porte TCP 8443/8081 e `node.exe` dalla sottorete locale. Il WebRTC
  telefono↔PC termina nel **browser** (msedge.exe/chrome.exe), che **non ha regole** (dichiarato «da provare» nel
  file).
- **Origine del gioco sul PC**: `https://<IP LAN>:8443/?lan=1` (il launcher esclude il loopback). Le impostazioni del
  gioco in `localStorage` (record, schermo, chiosco, audio…) dipendono quindi dall'IP: **D** se l'IP cambia (DHCP,
  altra rete) sembrano sparite.
- **Trasporto telefono↔PC in LAN** (`site/js/tennis/lan-transport.js`): segnalazione sul WebSocket del server,
  dati su **WebRTC diretto** senza STUN/TURN; canale `control` ordinato e affidabile, canale `motion` senza ordine né
  ritrasmissioni. **D**: si scambiano solo candidati host, che Chromium maschera con mDNS; se mDNS è bloccato restano i
  candidati prflx, che il firewall di Windows può bloccare.
- **Flussi del telefono** (M): pacchetto binario dei sensori 52 B fino a 40 Hz; orientamento del piatto `fo` ~60 Hz;
  colpi `sw` in 3 copie sul canale veloce (subito, +8 ms, +24 ms) + 1 sul canale affidabile, istante del colpo = picco
  sul telefono riportato sull'orologio del PC; orologio in stile NTP (migliore dei 12 scambi più brevi); collegamento
  perso dopo 5 s di silenzio.
- **Abbinamento** (`pairing.js`): QR con l'id di sessione (130 bit) e un codice monouso che scade in 5 minuti, solo nel
  canale DTLS; chiave di ripresa nel `sessionStorage` del telefono; dopo 5 tentativi falliti il QR cambia.

## 4. Audit

### 4.1 Prestazioni e rendering
- **Carico grafico fisso** (M, build del 29/10, 1280×720): 417 draw call (306 + 111 della mappa d'ombra), **1,51
  milioni di triangoli** di cui 1,42 milioni di pubblico e sedili istanziati, 198 oggetti che proiettano ombre, MSAA 4×,
  pixel ratio fino a 2, ombre PCFSoft 2048. Qualità dell'arena fissa a 1, nessuna scelta di qualità. Nello stesso
  schermo la passata principale raddoppia (~2,9 milioni di triangoli). Su una grafica integrata e su un ledwall ad alta
  risoluzione è il primo rischio.
- **Webcam** (M): MediaPipe Hands (2 mani, modelComplexity 1) sul thread principale, 15–40 ms di blocco del disegno per
  inferenza; il worker delle soluzioni legacy non funziona (`importScripts` anche sul modello).
- **Menu e pausa** ridisegnano solo quando serve (M: 600 → 43 disegni in 10 s).
- **Schermo sempre acceso**: il PC non chiede `navigator.wakeLock` (D: in chiosco Windows può spegnere lo schermo).

### 4.2 Comunicazione e latenza
- Catena dal picco del gesto alla risposta (M dai documenti `NATPF_GESTI_E_LATENZA.md`): riconoscimento sul telefono
  17–42 ms, consegna in LAN 2–15 ms, motore < 2 ms, disegno 1–2 fotogrammi. **Il ritardo dello schermo** (TV o
  processore del ledwall, S 16–150 ms) **non è compensato**: c'è solo un valore manuale 0–200 ms nella diagnostica,
  fermo a 0. La rete non sposta il giudizio del tempo perché vale l'istante del picco sul telefono.
- **Traffico inutile su un PC solo** (M): a ogni colpo, colpo a vuoto o punto parte un `POST /api/racket/feedback` che
  nessun modulo legge. Senza stanza 1v1 il gioco legge anche `/api/match/state` ogni 0,5 s: è una scelta del 31/10 per
  tenere il P1 online nel relay (test `natpf-lan-letture.test.mjs`) e la stessa lettura porta i colpi del relay quando
  non c'è il telefono NATPF; va tolta solo dopo aver verificato che nessuno la usa. Nella versione Cloudflare (D) sono
  richieste verso internet.

### 4.3 Stabilità su Windows (tutto D: da provare su un PC Windows 10 reale)
- WebRTC bloccato dal firewall sulla rete Pubblica anche con l'HTTPS funzionante (nessuna regola per il browser).
- Autorità dentro la cartella del pacchetto: aggiornare lo zip in un'altra cartella crea un'autorità nuova → **tutti i
  telefoni da ripreparare**. `LEGGIMI` non dice di copiare `certs`.
- Origine legata all'IP: impostazioni perse se l'IP cambia.
- Il browser dell'utente può avere estensioni, traduzione automatica, altri profili, risparmio energetico.
- Console `.cmd` da tenere aperta; nessun avvio automatico; nessuna scelta del monitor (solo F11 e `?area=`).
- Pacchetto 2026-11-03.1: conteneva un file temporaneo duplicato di Node (da eliminare).

## 5. Cosa richiede la rete e cosa no

| Comunicazione | Rete necessaria? | Nota |
|---|---|---|
| Telefono ↔ PC: segnalazione (WSS) e WebRTC (sensori, colpi, orologio, messaggi) | **sì, LAN** | il cuore del gioco |
| Caricamento della pagina del telefono in HTTPS | **sì, LAN** | HTTPS indispensabile per i sensori senza internet |
| Installazione del certificato sul telefono | sì, LAN, **una volta per telefono** | telefoni dello staff |
| Gioco ↔ server sullo stesso PC (pagine, `/lan/status`) | solo loopback | può restare `localhost` |
| Letture `/api/match/state` senza stanza 1v1 | **no** sul PC solo | da spegnere dopo la verifica (§4.2) |
| `POST /api/racket/feedback` | **no** | nessuno lo legge: da togliere |
| Diagnostica (OPFS, worker, zip), voce, musica, font, MediaPipe | **no** | già locali (CDN solo di riserva per MediaPipe) |
| PeerJS pubblico, STUN, TURN, Worker del TURN | solo versione Cloudflare | spenti con `?lan=1` |
| Sfida tra due PC (relay, P2 su un altro PC) | — | **non serve agli eventi** (04/11): resta com'è, non si sviluppa |

## 6. Confronto delle alternative

| Opzione | Cosa è | Pro | Contro | Sforzo (S) |
|---|---|---|---|---|
| **A** · status quo | zip con Node portatile, gioco nel browser predefinito | già fatto e provato estratto; nessuna firma (node.exe firmato) | console, firewall senza browser, origine con l'IP, autorità persa negli aggiornamenti, niente chiosco né monitor | 0 |
| **A+** · zip rinforzato (**consigliata**) | stesso runtime; il launcher apre **Edge** `--app=https://localhost:8443/?lan=1` o `--kiosk` con un profilo dedicato e la finestra sul ledwall; certificati in `%LOCALAPPDATA%\NATPF`; regole del firewall anche per Edge | quasi tutti i benefici operativi senza runtime nuovo né firma; ne beneficia anche il browser; origine stabile | il percorso di msedge.exe cambia con gli aggiornamenti (regola da rifare o per percorso); alcune opzioni possono essere ignorate da Edge o da policy aziendali; resta una console | 3–5 giorni + 1–2 di prove su Windows |
| **B** · PWA | manifest + service worker su `https://localhost:8443`, «Installa app» da Edge | icona e finestra proprie, tutto web | non controlla firewall, GPU, posizione della finestra; service worker con 43 MB di MediaPipe da versionare con cura; resta il Node | 2–3 giorni sopra A+ |
| **C** · Electron | cartella `natpf-desktop/`: il processo main importa i moduli del server LAN esistenti; la finestra carica lo stesso `dist` | server riusato senza riscritture; Chromium fisso (lo stesso delle prove Playwright); controllo di GPU, mDNS, autoplay, risparmio energetico, monitor, chiosco, permesso della camera, avvio automatico; fiducia nel certificato per impronta | installer ~110–140 MB (S); aggiornamenti di Chromium a nostro carico; **senza firma: avviso SmartScreen su ogni PC noleggiato**; prestazioni WebGL uguali a Edge | MVP 6–10 giorni + 3–5 di prove |
| **D** · Tauri 2 | guscio Rust con WebView2 | eseguibile piccolo | server da riscrivere in Rust o Node come sidecar (+30 MB, vantaggio annullato); WebRTC in `msedgewebview2.exe` con percorso che cambia (firewall fragile); runtime che si aggiorna da solo e su Windows 10 non garantito; due linguaggi | 15–25 giorni (8–12 con sidecar) |
| **E** · NW.js | Chromium + Node nella pagina | simile a Electron | strumenti meno maturi, isolamento peggiore, nessun vantaggio su C | come C + strumenti a mano |
| **F** · Neutralino | binario minimo con WebView2 | leggerissimo | limiti di WebView2 come Tauri, ecosistema piccolo, Node a parte comunque | 10–15 giorni |

Perché non Tauri anche se è più leggero: il peso non è un vincolo su un PC dello stand (MediaPipe pesa già 43 MB),
mentre il server HTTPS/WSS con i certificati è il pezzo più delicato e oggi funziona in Node; e il WebRTC dentro
WebView2 rende il firewall più fragile, cioè proprio il punto debole attuale.

## 7. Architettura consigliata

- **Un solo codice web** (`natpf-tennis/dist` + `site/js/tennis`), stesse prove, tre distribuzioni: **Cloudflare**
  (invariata), **zip LAN A+** (versione Windows), **Electron** solo se si decide dopo la fase F2.
- **Zip A+**:
  - launcher Node che avvia il server e apre Edge in modalità app/chiosco su `https://localhost:8443/?lan=1`, profilo
    dedicato in `%LOCALAPPDATA%\NATPF\edge`, finestra sul monitor del ledwall (`--window-position`/`--window-size`,
    da verificare con Edge stabile su Windows 10); ripiego su Chrome se Edge manca;
  - l'IP LAN serve solo nel QR per il telefono; il PC usa `localhost` (origine stabile, impostazioni conservate);
  - certificati e autorità in `%LOCALAPPDATA%\NATPF\certs`, con `nameConstraints` sulle reti private e `localhost`
    (supporto su Android e iOS da verificare): un aggiornamento dello zip non obbliga a ripreparare i telefoni;
  - `SBLOCCA LA RETE` con le regole anche per il browser (UDP dalla sottorete locale) e la cartella temporanea del Node
    eliminata dal pacchetto;
  - nella pagina «Collega» un QR «Prima volta su questo telefono» per il certificato.
- **Funzioni solo desktop** (se un giorno c'è Electron): solo tramite `window.natpfDesktop?.…` facoltativo (preload con
  isolamento, nessuna API Node nel codice web). Nel browser i ripieghi sono la Window Management API (schermo intero sul
  monitor scelto) e `navigator.wakeLock`.

## 8. Benefici attesi

| Intervento | Beneficio | Base |
|---|---|---|
| Qualità grafica Alta/Media/Bassa/Auto (pubblico leggero, pixel ratio 1–1,25 su ledwall e 4K, ombre 1024 o solo sui personaggi, MSAA spento oltre 1440p) | 30–60% di GPU in meno su una grafica integrata; fotogrammi più regolari sul ledwall | S, da misurare in F0 |
| Taratura del ritardo dello schermo per monitor | giudizio del tempo corretto anche su TV/ledwall con processore (16–150 ms) | S |
| Feedback tolto e letture spente senza stanza (dopo la verifica di §4.2) | meno richieste e meno lavoro sul thread principale; zero traffico verso internet nella versione Cloudflare | M (richieste), S (guadagno) |
| Origine `localhost` | impostazioni e record conservati se cambia l'IP | D |
| Certificati in `%LOCALAPPDATA%` | aggiornamenti senza ripreparare i telefoni | D |
| Regole del firewall per il browser | telefono che si collega anche con la rete Pubblica | D, da provare |
| Edge in app/chiosco sul ledwall | avvio in un passo, niente estensioni o traduzione, schermo giusto | D |
| Togliere il WASM non SIMD e le dipendenze morte | zip ~12 MB più leggero, build più pulita | M |
| Webcam in un worker (facoltativo) | 15–40 ms di blocco in meno per inferenza | M (blocco), richiede il consenso dell'utente |

## 9. Piano di migrazione (a fasi, ogni fase con commit, prove e documenti)

- **F0 · Misure di base (1–2 giorni)** — su un PC Windows 10 con grafica integrata (l'E14 va bene come riferimento) e
  sul ledwall: fps p50/p95, fotogrammi oltre 50 ms, consegna dei colpi p50/p99, `tel.strada` (host o prflx), GPU usata,
  contro la CPU, in stesso schermo e con la webcam; ritardo dello schermo con un video a 240 fps. Serve l'utente sul
  posto: la diagnostica registra tutto. Fine: rapporto con i numeri in `docs/`.
- **F1 · Miglioramenti web (4–7 giorni, valgono anche per il browser)** — qualità grafica con Auto; letture e feedback
  spenti senza stanza; origine `localhost` con l'IP solo nel QR; QR del certificato nella UI; `wakeLock`; taratura del
  ritardo dello schermo; pulizia delle dipendenze. Fine: test nuovi (nessuna richiesta `/api` in 10 s contro la CPU,
  qualità applicata), prove nel browser invariate, sull'E14 p95 del fotogramma migliore almeno del 20% in qualità Media
  (soglia da confermare con F0), banchi di bilanciamento identici.
- **F2 · Zip A+ (3–5 giorni)** — certificati in `%LOCALAPPDATA%` con `nameConstraints`, Edge app/chiosco con profilo
  dedicato e posizione sul ledwall, regola del firewall per il browser, Node duplicato eliminato. Fine (su Windows 10,
  rete Pubblica e Privata): telefono collegato in meno di 5 s per 10 volte su 10; aggiornamento senza ripreparare i
  telefoni; impostazioni conservate dopo un cambio di IP.
- **Punto di decisione** — se dopo F2 restano problemi di firewall/WebRTC, di schermo o di aggiornamenti, si valuta F3;
  altrimenti A+ resta la versione Windows.
- **F3 · Electron (facoltativa, 6–10 giorni + prove)** — `natpf-desktop/` separata, server nello stesso processo,
  fiducia per impronta, scelta del monitor e chiosco, avvio automatico, blocco del risparmio energetico, permesso della
  camera, regole del firewall per un solo eseguibile. Versione **portatile** (zip, senza installer) per limitare il
  problema della firma; senza certificato l'avviso di SmartScreen resta alla prima apertura.
- **F4 · Firma e aggiornamenti** — solo se in futuro si acquista un certificato (oggi: no).
- **F5 · Webcam in un worker (facoltativa, 4–6 giorni)** — solo con il consenso dell'utente (cambia il runtime del
  modello scelto «come nello zip argon-tennis») e con riconoscimenti uguali o migliori sui video veri delle diagnostiche.
- **Uscito dal piano**: trasporti della sfida tra due PC in LAN (messaggi immediati al posto delle letture HTTP) —
  agli eventi non serve (04/11).

## 10. Compatibilità con la versione browser

- Stesso `dist` e stesse prove per tutte le distribuzioni; i pacchetti Cloudflare e LAN non cambiano formato.
- Nessuna API Node nel codice web; funzioni desktop solo opzionali e controllate prima dell'uso.
- Le fasi F1 e F2 migliorano anche il browser (qualità, traffico, origine, certificati).
- Gli script dei pacchetti restano separati; un eventuale `natpf-desktop/` non entra nella build di Vite.

## 11. Rischi e cose da verificare su Windows reale

- Edge stabile su Windows 10: opzioni `--app`, `--kiosk`, posizione della finestra, mDNS, autoplay (possono essere
  ignorate o bloccate da policy del PC noleggiato).
- Regole del firewall: richiedono i diritti di amministratore (non noti sul PC noleggiato); il percorso di msedge.exe
  cambia con gli aggiornamenti.
- `nameConstraints` dell'autorità: supporto su Android e iOS da verificare.
- File scaricati da internet: Windows marca lo zip («Mark of the Web»); `node.exe` è firmato, i `.cmd` possono chiedere
  conferma. Da provare con lo zip scaricato davvero.
- Stime di sforzo e di guadagno non misurate (±50%).


## 12. Primo blocco A+ implementato · 04/11/2026 · 2026-11-04.1

Autorizzazione successiva dell'utente: «Puoi svilupparlo?». Avvio portatile con Edge e ripiego Chrome,
profilo dedicato, localhost stabile, scelta monitor salvata, app a finestra o schermo intero. Il comando
`--kiosk` del launcher NATPF seleziona `--app` + `--start-fullscreen`: NON il chiosco InPrivate di Edge, che
perderebbe i dati alla chiusura (documentazione Microsoft: https://learn.microsoft.com/en-us/deployedge/microsoft-edge-configure-kiosk-mode).
Non è un blocco del sistema operativo; Alt+F4 rimane disponibile. Chiudere gioco e console prima di cambiare monitor.

Certificati in `%LOCALAPPDATA%/NATPF/certs`; migrazione atomica dalla vecchia `tools/lan/certs` se la destinazione
non esiste, verifica corrispondenza CA/chiave, nessuna sovrascrittura di autorità già configurate.
Per aggiornare da un altro ZIP, copiare la vecchia cartella certs nel nuovo pacchetto PRIMA del primo avvio.
I record del vecchio profilo browser sull'IP non vengono importati. L'autorità resta identica cambiando IP;
`nameConstraints` rinviati per non invalidare telefoni già preparati prima delle prove iOS/Android.

Firewall: HTTPS Node porte 8443/8081 e UDP del browser, solo LocalSubnet; elevazione UAC esplicita, regole estranee
preservate, eventuali blocchi preesistenti segnalati. Se il permesso è negato si può riprovare con SBLOCCA LA RETE.
La pagina certificato parte insieme al desktop. QR nella pagina Collega solo in LAN; wake lock opzionale nel gioco
anche Cloudflare, con recupero tornando in primo piano. Node nello ZIP una sola volta.

Prove automatiche: 675 gioco, 182 sito, 10 LAN; menu 22/22; build e pacchetti estratti verificati.
Restano da verificare su Windows reale: UAC, sintassi/effetto firewall PowerShell, monitor/DPI/Edge e telefoni reali.
F0 e restante F1 (qualità automatica, taratura latenza, traffico, dipendenze) non completati da questo blocco.

## 13. Eseguibili Windows con Electron (fase F3) · 04/11/2026 sera · B7

> **Dal 07/11/2026 (§15)** il portatile non c'è più: resta solo l'installer, che si aggiorna dal gioco. Le parti di
> questa sezione sul portatile (`build/portatile.nsi`, regola «NATPF Simulator portatile») valgono solo come storia.

Richiesta dell'utente: «una versione portatile e una versione installabile, entrambe tramite eseguibili; vai avanti
su Windows, il resto lo provo io». Codice in `natpf-desktop/` (procedura in `natpf-desktop/LEGGIMI.md`), punti di
collaudo per l'utente in `docs/COLLAUDO_WINDOWS.md`.

- **Electron 45.2.2** (electron-builder 26.18.0 per comporre Electron per Windows x64; resedit 3.1.0 per icona e
  versione). Il gioco non cambia: stessi file del pacchetto LAN (`natpf-tennis/lan/pacchetto.mjs`), senza Node
  (lo porta Electron) e senza certificati.
- **Processo principale** (`src/main.mjs`): importa i moduli del server LAN di Codex e li avvia nello stesso processo
  (`ensureCertificate`, `startNatpfLan` con `open:false`, `serveCa`): stessi certificati in `%LOCALAPPDATA%\NATPF\certs`
  dello zip A+, stesse porte (8443, 8081, 8080). Apre `https://localhost:8443/?lan=1`; si fida del certificato solo
  per localhost e gli indirizzi del PC sulle porte 8443/8081 e solo se è il PEM su disco (niente modifiche
  all'archivio dei certificati di Windows). Una sola istanza. Profilo del gioco in `%LOCALAPPDATA%\NATPF\programma`
  (uguale per portatile e installato), registro in `%LOCALAPPDATA%\NATPF\log\programma.log`.
- **Schermo**: monitor salvato, altrimenti il più grande non principale (il ledwall esteso), altrimenti il principale;
  schermo intero salvo scelta diversa (F11), Ctrl+Maiusc+M monitor successivo, menu nascosto (Alt) con l'elenco dei
  monitor; monitor tolto → principale. Schermo sempre acceso (`powerSaveBlocker`), autoplay senza tocco, niente
  rallentamenti in secondo piano, indirizzi LAN veri nel WebRTC (mDNS spento), GPU più potente se ce ne sono due,
  WebGL in software se Chromium blocca la scheda grafica (`enable-unsafe-swiftshader`), pagina «Scheda grafica in uso».
- **Firewall**: una regola per l'eseguibile (tutti i protocolli, solo `localsubnet`): copre HTTPS, pagina del
  certificato e WebRTC perché tutti i processi di Electron sono lo stesso `.exe`. L'installazione crea «NATPF
  Simulator» e la toglie alla disinstallazione; il portatile chiede alla prima apertura (UAC tramite PowerShell
  `Start-Process -Verb RunAs`) la regola «NATPF Simulator portatile», **prima** di avviare il server: con la regola
  presente Windows non mostra il suo avviso, dove «Annulla» creerebbe regole di blocco (che vincono su quelle che
  consentono). Creando la regola si tolgono anche tutte quelle legate all'eseguibile (`delete rule name=all
  program=…`), blocchi compresi.
- **Costruzione da Linux senza wine**: il target `nsis` di electron-builder costruisce la disinstallazione eseguendo
  l'installazione con wine. Qui electron-builder produce solo `dist/win-unpacked` (target `dir`); installazione e
  portatile sono script NSIS propri (`build/installatore.nsi`, `build/portatile.nsi`) compilati con il makensis
  per Linux che electron-builder scarica nella sua cache (NSIS 3.0.4.1). La disinstallazione la scrive
  l'installazione (`WriteUninstaller`).
- **Installazione**: per il computer (UAC), `C:\Program Files\NATPF Simulator`, collegamenti nel menu Start e sul
  desktop, voce in «App installate» (HKLM, vista a 64 bit), chiude il gioco se è aperto, aggiornamento sopra la
  versione precedente togliendo solo i file del programma (elenco generato), avvio finale senza permessi di
  amministratore (tramite Esplora risorse), `/S` per l'installazione silenziosa.
- **Portatile**: un solo `.exe`, senza permessi. Al primo avvio di una versione estrae in
  `%LOCALAPPDATA%\NATPF\portatile\<versione>` (barra di avanzamento) e scrive `.pronto`; poi si avvia subito.
  Cancella le versioni precedenti non aperte. Imposta `PORTABLE_EXECUTABLE_DIR` per il programma. Scelta diversa da
  electron-builder `portable` (che estrae in una cartella temporanea a ogni avvio): avvii successivi in pochi secondi.
- **Senza firma del codice**: SmartScreen alla prima apertura di ciascun `.exe` scaricato; i file estratti dal
  portatile e quelli installati non hanno il «Mark of the Web».
- **Verificato qui**: test delle funzioni pure e della coerenza degli script NSIS (`natpf-desktop/test`), costruzione,
  contenuto degli eseguibili, programma avviato con Electron per Linux in uno schermo virtuale (server, certificato,
  schermo intero, schermata iniziale del gioco). **Da verificare su Windows**: tutto `docs/COLLAUDO_WINDOWS.md`.

## 14. Schermo intero senza cornici in tutte le versioni e adattamento al monitor · 05/11/2026 · B8 · 2026-11-05.1

Richieste dell'utente: «Assicurati che ci sia in tutte le versioni modalità full screen senza cornici», «adatta il
fullscreen in base alla finestra/monitor in utilizzo o prevedi la calibrazione a full screen, come avviene per i
videogiochi», «la versione cloudflare deve sempre pesare leggermente meno di 25 MB». Dove questa sezione e le
precedenti (§6–§9: «Edge in app/chiosco», `--kiosk`) non coincidono, vale questa.

- **Programma Windows (Electron)**: la finestra nasce già a schermo intero (`fullscreen` nel costruttore, cornice
  normale di Windows, niente `kiosk` né `frame:false`, che su Windows salterebbero la gestione della barra delle
  applicazioni); a schermo intero la barra del menu non è «a scomparsa», quindi Alt da solo non la mostra sopra il gioco;
  scorciatoie lette in `before-input-event` (funzionano anche quando la pagina blocca i tasti: la schermata «Premi un
  tasto» lo fa); cambio di monitor a finestra trasparente solo se il monitor è davvero un altro; il monitor salvato resta
  quello voluto anche se all'avvio è spento (ledwall acceso dopo); cambi di risoluzione o scala riadattati. Ponte con la
  pagina `window.natpfDesktop` (preload con isolamento): il gioco usa lo schermo intero della finestra e mai quello di
  HTML, che in Electron consumerebbe il primo Esc. Dettagli: `natpf-desktop/LEGGIMI.md`.
- **Zip LAN con Edge/Chrome**: predefinito `--app` + `--start-fullscreen` con profilo dedicato (come F11 subito dopo
  l'avvio: niente bordi né barre; un Esc breve arriva al gioco, tenuto premuto esce), finestra di partenza a metà e al
  centro del monitor scelto così lo schermo intero va su quel monitor; **mai `--kiosk`** (in Edge è InPrivate e perde
  impostazioni e record). «Finestra» solo per prove, con `?fs=0` nell'indirizzo. Scelta salvata `schermo:
  'intero'|'finestra'` (il vecchio `kiosk:false` non conta: lo scriveva ogni avvio).
- **Gioco web (browser, Cloudflare, LAN)**: `natpf_screen.js` sa se è già senza cornici (`natpfDesktop`,
  `document.fullscreenElement`, `display-mode: fullscreen` di F11); schermo intero al primo tasto o clic vero (non Esc,
  non eventi del codice) se la preferenza «All'avvio» è «Schermo intero» (predefinita), spento con `?fs=0` e nelle
  prove automatiche (`navigator.webdriver`, salvo `?fs=1`); Keyboard Lock di Esc dopo l'ingresso (Edge e Chrome: Esc
  breve al gioco, tenuto esce); Esc ripetuto ignorato nei menu, nell'allenamento e nella guida; F entra ed esce;
  pulsante in alto nel menu, voce nella pausa e in Opzioni → Schermo; in F11 il messaggio «Premi F11 per uscire».
- **Calibrazione dello schermo** (`natpf_calibra.js`, Opzioni → Schermo → «Calibra lo schermo…»): formato (Intero,
  16:9, 16:10, 4:3, 3:2, 1:1), bordi visibili per lato fino al 90% con un'area minima di 480 × 360 px, frecce agli
  angoli, cerchio e griglia, numeri dello schermo; anteprima dal vivo, Invio salva, Esc annulla, R ripristina; salvata
  in `natpf-tennis.screen.cal` (`?area=` nell'indirizzo vince ancora su tutto).
- **Inquadratura** (`natpf_camera.js`, `thirdPersonFrame`/`frameMatchCamera`): da 16:9 in su la camera della partita è
  quella di sempre (45°, z 22,8); più stretto si tiene la larghezza del 16:9 sulla riga di fondo vicina: campo visivo
  fino a 58°, poi la camera si allontana (fino a 1,2 volte) ma mai oltre z 25,3 (davanti al maxischermo del proprio
  fondo: oltre sale), in verticale fino a 70° e 8° più in alto. Prima persona e split screen invariati.
- **Peso Cloudflare**: MediaPipe solo nella versione SIMD (Edge, Chrome ed Electron la usano; senza SIMD i due file
  non SIMD arrivano dal CDN fissato), solo i loghi usati dal gioco, zip deterministico con `--zip` che si ferma a
  25.000.000 byte (CI compresa).
- **Verificato qui**: prove di unità, prove nel browser (schermo, calibrazione, inquadratura, menu, allenamento, LAN),
  prova del programma con Electron per Linux in Xvfb. **Da verificare su Windows**: `docs/COLLAUDO_WINDOWS.md` §4, §4b,
  §5b.

## 15. Un solo installer che si aggiorna dal gioco · 07/11/2026

Richiesta dell'utente: «La versione LAN mi pare la stessa della versione windows. Sviluppa solo quella windows se è la
stessa. La versione windows (installer) deve essere un unico installer che poi deve potersi aggiornare direttamente dal
gioco». Risposte: aggiornamenti su **Cloudflare R2** (bucket pubblico sullo stesso account del gioco; il repository è
privato, quindi niente download da GitHub); si consegnano **solo l'installer Windows e lo zip Cloudflare** (niente più
zip LAN né portatile). Dove questa sezione e le precedenti non coincidono, vale questa.

- **LAN e Windows sono la stessa cosa**: il programma avvia nello stesso processo il server LAN dello zip (stessi
  certificati in `%LOCALAPPDATA%\NATPF`, stesse porte), con in più schermo intero senza cornici, firewall
  dall'installazione e ora gli aggiornamenti. Lo zip LAN non si fa più; `natpf-tennis/lan/` resta perché il programma
  lo usa (`scripts/prepara.mjs`).
- **Un solo eseguibile** `NATPF-Simulator-Setup-<versione>.exe` (`build/installatore.nsi`): prima installazione e
  aggiornamento sopra quella esistente (stessa cartella letta dal registro, pagina della cartella saltata, nessuna
  disinstallazione), `/S` silenziosa, `/AGGIORNA` per l'aggiornamento dal gioco (aspetta fino a 15 s che il programma
  si chiuda da solo, poi lo chiude; alla fine riapre il gioco tramite Esplora risorse, quindi senza i permessi di
  amministratore). Per il computer come prima (Programmi e firewall): ogni aggiornamento chiede il permesso di Windows
  (UAC). Non tocca `%LOCALAPPDATA%\NATPF` (impostazioni, profilo del gioco, certificati, registri).
- **Aggiornatore** (`natpf-desktop/src/aggiornamenti.mjs`, puro e provato con un server HTTP locale; collegato in
  `main.mjs`): indirizzo base da `aggiornamenti.json` del pacchetto (vuoto → `off`) o dalla variabile
  `NATPF_AGGIORNAMENTI_URL` alla costruzione (la variabile `NATPF_AGGIORNAMENTI_BASE` vale solo nelle prove, `npm
  start` o installazione simulata: nel programma costruito una variabile dell'utente non cambia l'indirizzo); manifesto `<base>/windows/latest.json` = `{ build, version, file, size,
  sha256, notes, published }`; controllo 8 s dopo l'apertura e su richiesta; confronto `AAAA-MM-GG.n`; download in
  `%LOCALAPPDATA%\NATPF\aggiornamenti` con avanzamento, ripresa `Range` o riavvio, controllo di dimensione e sha256,
  redirect solo verso la stessa origine (o host elencati); installer avviato con PowerShell `Start-Process -Verb RunAs
  /S /AGGIORNA`, poi il programma si chiude. Attivo solo nel programma installato. Mai download o installazione senza
  clic; offline → stato `error` con un testo chiaro e il gioco continua (eventi in LAN senza internet).
  Nessuna dipendenza nuova (http/https di Node; electron-updater non serve: l'installer è NSIS su misura costruito da
  Linux e il manifesto è nostro). Se la finestra del permesso di Windows resta aperta più di 10 minuti il gioco torna a
  «pronto» con un avviso; un «Sì» dato dopo chiude comunque il programma. Aggiornamento silenzioso non riuscito
  (disco pieno, file non scritti): l'installer si ferma e mostra un messaggio anche con `/S` (`.onInstFailed`), con il
  percorso dell'installer scaricato per riprovare a mano; se il programma c'è ancora, il gioco si riapre.
- **Ponte** `window.natpfDesktop.updates` (versione 2 del ponte): `state()`, `check()`, `download()`, `install()`,
  `onChange(cb)`; contratto in `natpf-desktop/src/preload.cjs` e `natpf-desktop/LEGGIMI.md`. Solo dalla finestra del
  gioco e dalle pagine del proprio server, come lo schermo intero. Nel browser (Cloudflare) `natpfDesktop` non c'è:
  l'interfaccia degli aggiornamenti non compare. In più, menu del programma: Alt → Aiuto → «Cerca aggiornamenti…».
- **Pubblicazione** (`.github/workflows/natpf-windows.yml`): dopo la costruzione `scripts/manifesto.mjs` scrive
  `latest.json`; con i segreti `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET` aws cli (API S3
  di R2, caricamento a più parti; wrangler `r2 object put` arriva a 315 MB per file secondo la documentazione: oggi
  basterebbe, ma senza margine e un oggetto alla volta) carica prima l'installer (dimensione ricontrollata sul bucket), poi il manifesto senza cache, poi la
  copia `NATPF-Simulator-Setup.exe` per la prima installazione; tiene gli ultimi 5 installer; si pubblica **solo una
  versione più nuova** di quella sul bucket: un installer già pubblicato non si riscrive mai (la costruzione non dà gli
  stessi byte e il nome con la versione ha la cache lunga `immutable`: la cache di Cloudflare darebbe i byte vecchi
  con lo sha256 nuovo); se l'installer della versione c'è già ma il manifesto no (esecuzione interrotta), il
  manifesto si rifà dai byte del bucket. I soli documenti in `natpf-desktop/` non fanno partire il workflow. Novità
  mostrate nel gioco da `natpf-desktop/novita.txt` (righe `AAAA-MM-GG.n: testo`), mai l'oggetto del commit; senza
  righe «Versione AAAA-MM-GG.n.». Senza segreti solo un avviso. L'Artifact di GitHub resta. Passi per l'utente:
  `docs/GUIDA_AGGIORNAMENTI_R2.md`.
- **Limiti noti**: integrità affidata a HTTPS e al token di scrittura (lo sha256 protegge da file rovinati, non da chi
  può scrivere sul bucket; possibile miglioramento: manifesto firmato con una chiave privata solo nei segreti). Il
  programma usa http/https di Node, che non legge il proxy di sistema di Windows (reti aziendali con proxy obbligatorio:
  controllo in errore, gioco intatto) né i certificati di Windows (antivirus o reti che ispezionano HTTPS con un
  certificato loro: «Collegamento sicuro … non riuscito»; il modulo `net` di Electron risolverebbe entrambi, non fatto).
  Tra il controllo dello sha256 e il «Sì» del permesso di Windows il file scaricato sta in una cartella dell'utente:
  un programma già in esecuzione con lo stesso utente potrebbe sostituirlo e farsi dare i permessi (Node non può
  bloccarlo in scrittura; rimedi: installer firmato o manifesto firmato). Se il permesso di Windows lo dà un altro
  account amministratore (utente standard che scrive la password di un altro), il gioco riaperto può partire con
  quell'account e i suoi dati (certificati nuovi). Le installazioni fatte prima di questa versione non conoscono l'indirizzo: la
  prima versione con l'indirizzo si installa a mano. Il portatile già usato lascia `%LOCALAPPDATA%\NATPF\portatile` e
  la regola del firewall «NATPF Simulator portatile»: si possono cancellare a mano.
- **Verificato qui**: test dell'aggiornatore (manifesto valido e non valido, versioni, sha256 e dimensione sbagliati,
  redirect esterno, interruzione e ripresa, permesso rifiutato), degli script NSIS e del workflow; passo di
  pubblicazione con un aws finto; prova con Electron per Linux in Xvfb con un server finto (off, available, download,
  ready, install simulata); compilazione dell'installer con makensis. **Da verificare su Windows**:
  `docs/COLLAUDO_WINDOWS.md` §2 e §2b (UAC, aggiornamento silenzioso, riapertura, dati conservati), e il primo giro
  vero su R2 con i segreti dell'utente.
