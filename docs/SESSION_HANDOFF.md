# SESSION_HANDOFF · ultimo stato verificato

Aggiornato: 31/10/2026 · branch `natpf-simulator`.

## Ultimissimo (31/10): richiesta in 5 punti, diagnostiche 142317/142438, audit; pacchetti 2026-10-28.18

Fatto e unito (dettagli e misure in `docs/WORK_PROGRESS.md`, «Ultimo giro e audit finale»): webcam 1–4 m e webcam per
due, guida a schede, Radar e Survival nascosti (`HIDDEN_MODES` in `natpf_arcade.js`), webcam del P2 invitato con il
flusso del P1, LAN ottimizzata, correzioni dalle diagnostiche (gesti, equità del P2, motore) con le decisioni
dell'utente. Gioco 673/673, sito 182/182, LAN 5/5; e2e sui pacchetti estratti 27/27, 14/14, 7/7. TURN di Cloudflare
funzionante (Worker `natpf-turn` dell'utente), il .18 ha `/natpf/turn.json`. Push fatto.
Da provare dal vivo: telefono del P2 senza VPN su un'altra rete (`tel.strada` «relay (tls, TURN nostro)»?), webcam a
1–4 m e per due, guida su telefono, LAN su Windows; prossima diagnostica anche sul computer del P2 (C20).
Decisioni aperte: anticipo sistematico (C13); compensazione della latenza del P2 dopo misure su internet.
Prossima azione: leggere le diagnostiche della prova dell'utente con il .18.


## Ultimissimo (30/10, sera): colpi del P2, palla del P2, TURN di Cloudflare; pacchetto Cloudflare 2026-10-28.17

Decisioni dell'utente e lavoro fatto: `docs/WORK_PROGRESS.md` («Colpi del P2, palla del P2, TURN di Cloudflare»);
regole in `docs/PROJECT_MEMORY.md`. Commit da `dd2c96b` a `1bb570e` più documenti e versione .17. Gioco 566/566, sito
178/178, `tools/e2e/natpf-1v1-p2p.mjs` 27/27. Pacchetto Cloudflare `natpf-simulator-cloudflare-20261028-17.zip`
(estratto: e2e 27/27; sha256 `464fafc5…e367070e`, con `/natpf/turn.json` → `https://natpf-turn.s-porcelli.workers.dev/`), nella cartella
temporanea della sessione; nessun pacchetto LAN .17.
Da fare dall'utente: creare la chiave TURN e il Worker `natpf-turn` seguendo `docs/GUIDA_TURN_CLOUDFLARE.md`, caricare
il .17, provare il telefono del P2 senza VPN con la diagnostica accesa.
Prossima azione: leggere la diagnostica della prova (`tel.strada`/`tel2.strada`: «relay (tls, TURN nostro)»?;
`sfida.colpo`/`sfida.colpo_vecchio`: età dei colpi del P2 e quanti scartati; `sfida.vista`: età degli snapshot e
correzioni) e con quei numeri decidere compensazione della latenza e finestra del tempo del P2.

## Ultimissimo (30/10): blocco tra primo e secondo game nella sfida Cloudflare; pacchetto Cloudflare 2026-10-28.16

Segnalazione: rapporto esterno su `2734cd8` (.15) con screenshot: «Sfida un amico» sulla versione Cloudflare, il P2 resta
su «Collegamento con Player 1 perso» dopo il primo game. **Causa trovata e riprodotta**: PeerJS (json) scarta in
silenzio i messaggi ≥16300 byte e lo stato mandato al P2 cresceva di ~1,4 KB per colpo del suo telefono: dopo ~10 colpi
il P2 non riceveva più niente, l'host lo vedeva collegato e aspettava il suo servizio. Dettagli, misure e cosa non è
fatto in `docs/WORK_PROGRESS.md` («Sfida tra due computer (Cloudflare)…»); regole in `docs/PROJECT_MEMORY.md`.
Commit `69f1563` (stato compatto e a pezzi, una lettura alla volta, pausa per tutti e due quando il P2 non può giocare,
«Riconnetti», id di ripresa, canale fino a 30 s), il commit del punteggio salvato dall'host, più documenti e versione
.16. Gioco 534/534, sito 164/164, `tools/e2e/natpf-1v1-p2p.mjs` 27/27 (22/27 sulla `2734cd8`, che si blocca come nello
screenshot). Pacchetto Cloudflare `natpf-simulator-cloudflare-20261028-16.zip` (sha256 `9aaeb5ee…99be6b1aa`), solo nella
cartella temporanea della sessione, e LAN `natpf-simulator-lan-windows-20261028-16.zip` (sha256 `b054396e…2df1b138`).
Push autorizzato dall'utente il 30/10 e fatto.
Da provare dal vivo: la sfida Cloudflare tra due computer su reti diverse con due telefoni, almeno due game; spegnere
lo schermo del telefono del P2 a metà scambio (pausa per tutti e due, punto rigiocato); «Riconnetti».
Prossima azione: l'utente pubblica il .16 su Cloudflare e riprova la partita al meglio di 3 con il P2; poi decidere se
fare il TURN nostro su TLS 443 (serve una chiave Cloudflare Realtime e una funzione lato server).

## Prima (29/10, notte): telefono che non si collega con la versione Cloudflare; pacchetti 2026-10-28.15

Segnalazione: con la versione Cloudflare il telefono del P2 (Pixel) restava su «Connessione persa». Il computer chiudeva i
collegamenti lenti (passati da un server di inoltro) prima che il canale si aprisse; corretto con tempi, strade di rete in
più (STUN Cloudflare, TURN anche in TCP) e il motivo sul telefono. Dettagli in `docs/WORK_PROGRESS.md`. Pacchetti .15 provati estratti: Cloudflare (`21ea32b6…2cc7c6251`), LAN (`977d85b6…fdd1800f2`). Sito 164/164,
gioco 525/525. Push fatto fino a `d504be3`; i commit dopo sono locali (push solo con autorizzazione).
Da provare: il telefono dell'amico sulla sua rete; se non va ancora, leggere il motivo sul telefono e valutare un TURN
nostro (Cloudflare Realtime TURN, serve un Worker con chiave).

## Prima (29/10, notte tarda): stesso schermo con una webcam per due; pacchetti 2026-10-28.14

Richiesta: schermo condiviso con una sola webcam per due giocatori, campo visivo al massimo. Fatto nel commit `98f1f7b`
(dettagli e verifiche in `docs/WORK_PROGRESS.md`, «Stesso schermo con una webcam per due»): `webcam_duo.js` (due corsie,
P1 a sinistra e P2 a destra), camera al formato più largo fino a 1920×1080 con almeno 24 fps quando possibile, pagina
«Collega» con «Due telefoni / Una webcam per due». Gioco 525/525, sito 160/160. Pacchetti .14 provati estratti: LAN (`19cf8443…01a255489`) e Cloudflare (`719debd6…fe7ab3be0`).
Push non fatto (solo con autorizzazione esplicita).
Da provare con la webcam vera: frequenza e carico con 4 mani, due giocatori a 2–3 m.
Prossima azione: l'utente prova lo stesso schermo con la webcam per due (diagnostica accesa: `webcam.frame` con `chosen`
p1/p2, `webcam.evento`, `webcam.camera` «per due»).

## Prima (29/10, notte): diagnostica 191023 (iPhone), chi batte, colpo super ed energia; pacchetti 2026-10-28.13

Stesso schermo con Android (P1) e iPhone (P2). Fatto, con test (dettagli in `docs/WORK_PROGRESS.md`, «Diagnostica
20261029-191023»): `8e6cfcb` iPhone con dritto e rovescio invertiti → accelerazione dei sensori riportata al segno di
Android (`site/js/tennis/motion-sign.js`), registro completo del P2; `caf0ddf` «Batte per primo» nel menu, barra della
potenza con il colpo super in oro, palla super con l'alone, energia sempre in vista. Gioco 516/516, sito 160/160.
Pacchetti .13 provati estratti: LAN (`5ffdf48b…ad24377f71c`) e Cloudflare (`94699280…e619c3cfe76`). Push non fatto.
Non riprodotto: «personaggio dell'iPhone che si muoveva sempre» (da chiarire con l'utente).
Da provare su un iPhone vero: calibrazione e lati dei colpi; se il segno fosse già quello di Android, 4 tocchi sullo
schermo lo correggono (registro: `tel2.dispositivo` accSign).
Prossima azione: l'utente riprova lo stesso schermo con l'iPhone (ricalibrando) e la diagnostica; dire cosa intende con il
personaggio che si muove.

## Prima (29/10, sera): diagnostica 145416, webcam, impugnatura a martello, «Sfida il campione» tolto; pacchetti 2026-10-28.12

Richieste: (1) webcam che non traccia bene (distanza, interruzioni, servizio, recupero) sul Lenovo E14; (2) impugnatura
a martello come posizione neutra di tutto il controllo col telefono; (3) togliere «Sfida il campione»; (4) audit e
verifica. Dettagli, cause, misure e cosa resta da provare in `docs/WORK_PROGRESS.md` («Diagnostica 20261029-145416»).
Commit: `dad3699` (minigioco tolto), `2610a16` (martello: testa della racchetta virtuale sempre la cima, tutorial,
figura, 3D, foto), `cd6b949` e `409bf44` (webcam: buco nel colpo attraversato con la mano, flusso ottico solo a mano
uscita o non tornata e da immagine nuova, distanza in proporzione alla mano, una sola mano agganciata, modello e camera
che si riprendono da soli, strumenti `webcam-probe`/`webcam-argon-replay`), più il commit dei pacchetti.
Gioco 505/505, sito 160/160, build ok; motore di gioco non toccato (banco Leggenda non rifatto). Pacchetti
2026-10-28.12 provati estratti: LAN (`22a1adf4…b4e3742901`, anche la webcam con un video come camera finta) e
Cloudflare (`78f08437…bf38274258`). Push non fatto (solo con autorizzazione esplicita).
Da provare sui dispositivi (non verificabile qui): webcam dell'E14 in piedi a 2–3 m, servizio a braccio alzato, colpi
ampi, carico; telefono con la presa a martello (calibrazione e tutti i colpi, destro e mancino).
Prossima azione: l'utente prova il .12 con la diagnostica accesa — webcam: `webcam.frame` (fonte, «mano non tornata»,
«mano uscita dal bordo», «mano diversa da quella seguita»), `webcam.ritmo`, metriche `recupero`; telefono: `tel.colpo`
con la presa a martello. Se a più di 3 m la mano non si vede: valutare Pose al posto di Hands (vedi PROJECT_MEMORY).

## Prima (29/10, pomeriggio): diagnostica 131307, presa nel palmo, pacchetti 2026-10-28.11

Richiesta: palla sempre al centro, presa di riferimento nuova (foto: base nel palmo, cima in avanti, schermo in alto),
schiacciata e pallonetto che non riescono, colpi a rete in rete. Analisi su registro, video webcam e gioco, sensori di
quattro sessioni rigiocati; cause e interventi in `docs/WORK_PROGRESS.md` («Diagnostica 20261029-131307»). Commit
`d1e9dec` (gioco: direzione del piatto dalla rotazione attorno alla verticale, piatto a peso pieno, colpo normale
imparato giocando, pallonetto relativo e più alto, schiacciata da 1,5 m a 46 m/s, palla corta al colmo, chiusure sopra la
rete, tempo sulla strada della palla, CPU Leggenda che impara dai vincenti), `dac4d4b` (tutorial: figura, testi, 3D,
foto `presa-palmo.webp`), più il commit dei pacchetti. Gioco 496/496, sito 160/160; banco Leggenda con gli stessi 2 KO
di prima. Consegnati LAN (`88fd306f…a0a04f24aa`) e Cloudflare (`6f7cc554…202841b40c`) 2026-10-28.11.
Push non fatto (solo con autorizzazione esplicita).
Prossima azione: l'utente prova il .11 con la presa nel palmo e la diagnostica accesa (meglio con il file
`telefono-sensori.jsonl`, che per la 131307 non è arrivato): cadute di lato (`racchetta` x), pallonetti e tagliati
(`tel.colpo` tipo e «abituale»), schiacciate (`voluto smash`), chiusure (`racchetta` attacco). Se la direzione è ancora
poco controllabile: prova guidata dei colpi per misurare quanto il piatto segue l'intenzione.

## Ultimissimo (29/10, primo pomeriggio): richieste dopo il .9 e diagnostica 104712; pacchetti 2026-10-28.10

Richieste: (1) angolazione più sensibile, (2) telefono inclinato in avanti nel palmo, (3) colpi super potenti nel
contesto giusto, (4) stanchezza dopo tanta corsa laterale; poi la diagnostica 104712 (stesso schermo: «il player 2 si è
disconnesso da solo», con il telefono su «Pronto») e l'analisi degli scambi. Fatto, con test, nei commit `e0f9bfb`
(pausa del P2 con punto rigiocato, «Ricollega il telefono» e ricollegamento automatico, schiacciata del P2 dal gesto,
palle profonde non più sul rimbalzo), `bc72092` (centro della mira che si corregge sui colpi veri, curva 3–23°, presa
inclinata 60–75° provata), `d94217d` (colpo super potente, stanchezza). Dettagli e misure in `docs/WORK_PROGRESS.md`.
Consegnati LAN (`8afee2b2…e1368fb537`) e Cloudflare (`f1e8f9f0…ec616dfa5f`) 2026-10-28.10. Gioco 486/486, sito 160/160.
Push non fatto (solo con autorizzazione esplicita).
Prossima azione: l'utente prova il .10 (anche sullo stesso schermo) con la diagnostica accesa; con il registro:
mire nei due versi (`tel.colpo` mira/scarto), colpi super (`racchetta.super`/`superNo`), pause e ricollegamenti del P2
(`tel.pausa`, `tel.ricollega`, `tel2.link`). Se il P2 si ferma ancora, dal `tel2.link` si vede quale flusso manca.

## Prima (29/10, tarda mattina): stesso schermo, calibrazione, schiacciata; pacchetti 2026-10-28.9

Dalle diagnostiche 101056, 101209 (e 090144): sullo stesso schermo la calibrazione rifatta in partita ora si conferma
da sola (`5a7f04e`), la calibrazione avviata dal telefono parte con 1,5 s di attesa e 0,6 s di quiete prima del primo
gesto (`5a7f04e`), la schiacciata va a 38 m/s con gli effetti del colpo potente e si prepara dai pallonetti oltre 3,0 m
(`e9bab41`). Palle in rete e pallonetti: non nei registri (dettagli in `docs/WORK_PROGRESS.md`, «Diagnostiche del 29/10
mattina»); servono una diagnostica con «Segna» sul telefono al momento, o la «Prova guidata dei colpi».
Consegnati LAN (`f78648ff…b424a57a`) e Cloudflare (`5389ad4e…cd696566`) 2026-10-28.9. Gioco 469/469, sito 158/158.
Push non fatto (solo con autorizzazione esplicita).
Prossima azione: l'utente riprova lo stesso schermo (schermo spento → Ricalibra → Pronto), la schiacciata, e manda una
diagnostica con «Segna» quando un colpo va in rete o un pallonetto non esce.

## Ultimo (29/10): webcam dello zip argon-tennis, pacchetti 2026-10-28.8

L'utente ha chiesto la webcam presa esclusivamente dallo zip argon-tennis (motore base). Fatto nel commit `ffb83a8`:
riconoscimento (mano di MediaPipe con le opzioni dello zip, scia, flusso ottico) e gioco del colpo (servizio, colpo
assistito fino a 0,48 s) come nello zip; dettagli e limiti in `docs/WORK_PROGRESS.md` («Webcam come nello zip
argon-tennis»), decisione in `docs/PROJECT_MEMORY.md`. Consegnati LAN (`a743f3c2…60d94ad4`) e Cloudflare
(`b15a7339…7c55b5f`) 2026-10-28.8. Gioco 467/467, sito 157/157. Push non fatto (solo con autorizzazione).
Prossima azione: l'utente prova la webcam del pacchetto .8 su Windows; se il gioco rallenta (modello delle mani a
complessità 1 nella pagina, come nello zip) chiedergli se alleggerire il modello prima di cambiare qualcosa.

## Ultimissimo (29/10, mattina): corsa a rete a vuoto corretta, pacchetti 2026-10-28.7

Diagnostica `20261029-090144-aimd` (1v1 sullo stesso schermo): chi gioca correva a rete a vuoto e perdeva il punto
quando il Player 2 colpiva da dietro la sua riga di fondo (la traiettoria prevista finiva subito oltre 14,5 m). Corretto
nel piano comune a tutte le modalità in singolo (commit `87c8075`), test `test/natpf-corsa-a-rete.test.mjs`, dettagli
in `docs/WORK_PROGRESS.md` («Corsa a rete a vuoto»). Consegnati **LAN** (`89a73703…98e8f7c`) e **Cloudflare**
(`4fd67368…48c6735f`) 2026-10-28.7, provati estratti. Gioco 460/460, sito 157/157.
Push non fatto (solo con autorizzazione esplicita): `git log origin/natpf-simulator..` per l'elenco.
Prossima azione: l'utente riprova il 1v1 sullo stesso schermo con il pacchetto .7; poi la webcam (vedi sotto).
Telefono Xiaomi 15T Pro che non raggiunge il server LAN (lo S24 Ultra sì): indicazioni date (stessa rete, dati mobili e
assistente Wi-Fi spenti, permesso di Chrome per la rete locale); in attesa del codice d'errore se non si risolve.

## Ultimo giro (29/10) — leggere per primo

Webcam rifatta (richiesta: «webcam tutta da rifare»): i colpi vengono dal **movimento nell'immagine**
(`src/natpf/webcam_motion.js`), solo con la palla in arrivo o al proprio servizio (`natpf_impact.webcamGate`), lato
dalla palla, istante stimato 94 ms dopo l'attraversamento della soglia; in partita non girano più i modelli delle mani
e del corpo (erano il «browser che lagga»). Misure sui video veri, limiti e test in `docs/WORK_PROGRESS.md` («Webcam
rifatta»); decisione in `docs/PROJECT_MEMORY.md`. Il dato «36 su 36» della prova di fattibilità era gonfiato: corretto.
Pacchetto **LAN 2026-10-28.6** (SHA256 `f5b40b69…a6822b`) consegnato all'utente, provato estratto in https con una
webcam finta (video vero) e nella prova generale.

Commit locali non pubblicati (push solo con autorizzazione esplicita): `b167fff`, `21ea7b8`, `796e2b8`, `d454b76`,
`4f3d751`, `a686300`, `3b093bb`, `2b255f9`, `21810a5` (webcam dal movimento), `53d657d` (documenti), più il commit del
pacchetto .6 (`git log origin/natpf-simulator..`). Gioco 456/456, sito 157/157.

Prossima azione esatta:
1. L'utente prova il pacchetto 2026-10-28.6 su Windows con la webcam vera: pannello («Fai un colpo…» → «Colpo visto»),
   una partita, il registro della diagnostica (eventi `webcam.evento` con «movimento N× la soglia», `racchetta` con il
   tempo). Con la sua diagnostica: misurare lo scarto tra lo swing e l'impatto e, se serve, regolare `MOTION.lead` e
   `GATE.ahead`.
2. Se l'utente autorizza: `git push -u origin natpf-simulator`.
3. Aperti di prima (pallonetto alzando il braccio, direzione con la prova guidata, banco Leggenda: 3 KO già presenti).

## Webcam ferma su «Cerco la mano…» — corretta (28/10 sera)

Sul pacchetto 2026-10-28.4 l'utente ha mandato uno screenshot: webcam accesa, mano in vista, «Cerco la mano…». Causa
vera (riprodotta con una webcam finta in Chromium): dal commit `e4af4ce` i modelli MediaPipe partivano in un worker, dove
non si inizializzano mai (`importScripts` dei file `.tflite`). Commit `b167fff`: modelli nella pagina (worker solo con
`?webcamWorker=1`). Pacchetto **LAN 2026-10-28.5** (SHA256 `3a8ca621…4b4693`) consegnato; dettagli in
`docs/WORK_PROGRESS.md`. Commit `b167fff` e versione .5 **non pubblicati**: push solo se l'utente lo autorizza di nuovo.
Prossima azione: prova del pacchetto 2026-10-28.5 su Windows con la webcam vera (mano, polso e avambraccio) e il telefono.

## Analisi della sessione del 28/10 sera e correzioni

L'utente ha mandato una diagnostica (Leggenda, telefono) e un video OBS con sei problemi: webcam che non rileva,
schiacciata a rete, palla corta, pallonetto, schiacciata sulle palle alte, direzione «sempre centrale». Analisi completa
e interventi in `docs/WORK_PROGRESS.md` («Analisi della sessione del 28/10 sera»). Commit locali, non pubblicati:
`bfcc6e9` (webcam: il motivo quando non si apre, mano/polso/avambraccio), `ec380d4` (telefono: verso con asse di
calibrazione orizzontale, soglia nel verso atteso, rientro dopo un colpo debole), `8f1435e` (schiacciata a rete) e
l'aggiornamento dei documenti. Test: gioco 440/440, sito 157/157; banco Leggenda invariato (3 KO già presenti).
Non provati con telefono e webcam veri. I pacchetti 2026-10-28.3 non li contengono; il LAN 2026-10-28.4 sì.

Aperti, da decidere con l'utente:
1. Pallonetto alzando il braccio: il gesto si vede dopo il picco di rotazione; proposta: esercizio «Pallonetto» del
   riscaldamento (prototipo personale) e misura del braccio che sale dopo il picco quando lo swing arriva in anticipo.
2. Direzione: 10 scarti del piatto su 21 oltre 45° (non contano) e anticipo medio +0,34 unità che porta incrociato.
   Proposta: prova guidata (Diagnostica → «Prova guidata dei colpi», chiede incrociati e lungolinea) per misurare
   quale segnale segue l'intenzione, poi decidere i pesi.
3. Banco Leggenda: 3 criteri KO già presenti prima di queste modifiche (CPU contro «tennista» e «preciso»).
4. Fatto su richiesta: pacchetto **LAN 2026-10-28.4** con queste correzioni (SHA256 `f4eb5394…b0c6`, dettagli in
   `docs/WORK_PROGRESS.md`), senza gli elementi dello zip dell'altro agente (l'utente non li vuole); nessun pacchetto
   Cloudflare .4. Push autorizzato e fatto su `origin/natpf-simulator`.
5. Prossima azione: prova del pacchetto LAN 2026-10-28.4 su Windows con il telefono (rovescio con presa dritta, colpi
   morbidi nel verso della palla, schiacciata a rete) e con la webcam senza OBS; poi prova guidata per la direzione.

## Pacchetti 2026-10-28.3 (28/10 sera)

Consegnati all'utente (non nel repository: zip nella cartella temporanea della sessione): Cloudflare
`natpf-simulator-cloudflare-20261028-3.zip` (SHA256 `14d19029…abc60`) e LAN Windows
`natpf-simulator-lan-windows-20261028-3.zip` (SHA256 `87d9efe2…fb910`); misure, contenuto e prove in
`docs/WORK_PROGRESS.md` («Pacchetti 2026-10-28.3»). Contengono voce inglese cartoon, tutorial con foto e 3D, split
screen e schermo per ledwall, più la correzione della stanza in rete creata per sbaglio con «Stesso schermo».
Commit locali non pubblicati: da `265e687` all'ultimo (`git log origin/natpf-simulator..`); push solo se l'utente lo
autorizza.

Prossima azione esatta:
1. Se l'utente autorizza: `git push -u origin natpf-simulator`.
2. Prova dal vivo del pacchetto LAN su Windows con due smartphone («Stesso schermo») e, se c'è, su un ledwall
   (Opzioni → Schermo, o `?area=x,y,w,h`).
3. Caricare lo zip Cloudflare su Pages e provarlo dal telefono (sul sito statico il 1v1 tra due computer usa la rete p2p).

## Split screen «Stesso schermo» e ledwall (28/10 sera)

Commit locali (non pubblicati finché l'utente non autorizza il push): `265e687` voce inglese e via le clip,
`5e93a5f` S1 secondo telefono, `88c607a` S2 due viste nel motore, `cae8a54` S3 menu, `44c2a73` S4 schermo/ledwall
(+ questo aggiornamento dei documenti, vedere `git log -1`).
- Menu → Gioca → «Stesso schermo» → «Collega i due telefoni» (due QR, calibrazione guidata sui telefoni, o «Gioca senza
  calibrare») → Partita → schermo diviso: P1 a sinistra, P2 a destra, etichette con l'esito dei colpi; telefono del
  P2 che cade → pausa e ripresa. Codice: `natpf_split.js`, `natpf_split_ui.js`, `startSplit/endSplit` nel motore.
- Opzioni → Schermo: Intero / Ledwall 2×2 / Ledwall 3×2; `?area=x,y,larghezza,altezza` per il processore LED.
  CSS con `@container natpf` e `cqw/cqh` (regola in `CLAUDE.md`).
- Verificato: gioco 435/435, sito 152/152, build; browser (senza telefoni veri) a 1280×720, 900×900, 1200×800, area
  720×720 e 768×512. **Non verificato**: due telefoni veri insieme, ledwall vero, fluidità su un PC con GPU.
- Prova dal vivo da fare con due smartphone sullo stesso PC (rete con https: `npm run dev:https` o pacchetto LAN
  2026-10-28.3, sopra).

## Stato finale (28/10/2026, sera) — voce e tutorial

Branch `natpf-simulator`; ultimo commit pubblicato su GitHub `2533180` (pacchetto LAN 2026-10-28.2). Dopo, solo in
locale finché l'utente non autorizza il push: **revisione voce e tutorial** (vedere `git log -1`).

Cosa c'è nel gioco adesso:
- Intro: video dell'arena (Higgsfield Cinema Studio, senza scritte né marchi), titolo «NATPF Simulator» in HTML,
  partner in una riga piccola in basso. Menu con «NATPF Simulator» come titolo principale, partner in secondo piano.
- Tutorial: lezione con **foto reali** (presa di lato con «Così no», presa vista dallo schermo, posizione di partenza);
  gli esercizi mostrano i gesti con l'**animazione 3D** verificata con il rilevatore (`natpf_gesture_demo.js`).
  Le clip video generate dei colpi sono state **tolte** su richiesta dell'utente (la persona sembrava tenere un
  telecomando, pose non coerenti con il tennis e con i testi). Non riproporle senza una richiesta esplicita.
- Voce: **solo inglese**, una sola voce cartoon (preset Higgsfield «Pixie», ElevenLabs v4) per arbitro, annunci dei
  minigiochi e versi del giocatore; 47 clip in `public/voce/`, trascritte con Vosk inglese. Le clip italiane maschili
  sono state tolte. Senza clip: sintesi inglese del browser. I testi dell'interfaccia restano in italiano.
- Pacchetto LAN 2026-10-28.2 (sotto) **non** contiene ancora questa revisione: il prossimo pacchetto sarà 2026-10-28.3.

Verifiche dell'ultima revisione: gioco 421/421, sito 152/152, build riuscita; nel browser 47 clip caricate, annunci
in inglese («Thirty fifteen», «Deuce»), esercizi con l'animazione 3D, nessun errore in console.
Non verificato: ascolto umano della nuova voce (timbro «cartoon» giudicato solo da descrizione e altezza 220–350 Hz),
telefono reale, Windows.

Crediti Higgsfield: 125,5 per foto/clip/intro + 10,81 per le 47 voci inglesi = 136,3 (saldo 728,12). Le spese
«Voice Element» (2 × 40) ed «Eleven v4» (≈ 48) tra le 15:10 e le 15:30 non sono di questa sessione: probabilmente le voci
personalizzate dell'account («flavio», «ANDRE-1», «Roger»); da confermare con l'utente.

## Prossima azione esatta

1. Se l'utente autorizza: `git push -u origin natpf-simulator`.
2. Far ascoltare la nuova voce e guardare la lezione (menu → Allenamento, Opzioni → volume voce fa sentire «Perfect!»).
   Per cambiare voce: rigenerare le 47 frasi (testi e nomi in `src/natpf/natpf_voice.js`, procedura in
   `docs/PROJECT_MEMORY.md` §Decisioni, voce) — costo ≈ 11 crediti.
3. Nuovo pacchetto LAN 2026-10-28.3 con questa revisione (procedura in `docs/WORK_PROGRESS.md`, «Pacchetto LAN
   2026-10-28.2»: versione in `site/js/tennis/version.js` e `site/tennis/build.json`, `npm run build`,
   `node natpf-tennis/lan/pacchetto.mjs --out=… --node=node-v22.22.0-win-x64.zip`, zip, prova sullo zip estratto).
4. Prova fisica con S24 Ultra e PC Windows (sotto, consegna 2026-10-28.1).

## Pacchetto LAN 2026-10-28.2 (sessione Claude, 28/10, pomeriggio)

`natpf-simulator-lan-windows-20261028-2.zip` · 61.518.360 byte · 290 file. SHA256:
`8d2e5f9d386577259a5175be4bfe85217008724828f471b3ba412e1316a08928`. Codice: commit `2533180`.
Contiene la consegna LAN 2026-10-28.1 + redesign, foto, clip dei colpi (poi tolte nel codice), intro video, voci
italiane (poi sostituite). Node.js 22.22.0 win-x64 verificato con SHASUMS256; nessun certificato né chiave privata.
Correzione: `.mp4` servito come `video/mp4` (prima octet-stream con `nosniff`).
Prova sullo zip estratto (Linux): certificato, HTTPS con la CA del pacchetto, gioco, intro video, pagina del telefono,
versione, MediaPipe offline, nessun errore. Non provato su Windows.

Due linee di lavoro unite con un merge il 28/10 (nessuna riscrittura di storia): consegna LAN 2026-10-28.1 della
sessione di sergio4 (`e4af4ce`, `2401fc9`, `641fa02`, sotto invariata) e redesign della sessione Claude (`636a5e2`…).

## Consegna LAN 2026-10-28.1 (sessione di sergio4)

Versione LAN Windows **2026-10-28.1**, codice **2401fc9481dbe2ced0c19990c36a4b950b709f0f**.
Questo commit aggiorna soltanto i documenti di consegna. Il checkpoint precedente è e4af4ce.

Correzioni: riconnessione del telefono isolata dagli eventi vecchi; webcam Hands/Pose in worker con lifecycle e modello leggero; riconoscimento della palla corta morbida e filtro preparazione; risposte raggiunte in tempo alle palle corte CPU a Leggenda senza errore obbligato. Dettagli in `WORK_PROGRESS.md` e `PROJECT_MEMORY.md`.

- 400/400 test gioco (`cd natpf-tennis && npm test`), 152/152 root (`node --test tools/test/*.test.mjs`).
- Build di produzione riuscita, worker incluso, 21 asset MediaPipe offline.
- Quattro regressioni telefono e quattro regressioni palla corta/Leggenda falliscono sulla base 59ce56c e passano dopo le correzioni.
- ZIP estratto verificato: HTTPS con CA attendibile, 76 file build confrontati SHA256, pagina telefono e versione, stanza/snapshot/colpo P2, segnalazione WSS, certificato pubblico e chiave privata non esposta.

### Pacchetto consegnato

`natpf-simulator-lan-windows-20261028-1.zip` · 60.343.718 byte · 219 file.
SHA256: `0787d151aa5fa974b0daef76b7aef3292c0228a43d4e8201425e520a7121c1e2`.
[Download salvato](https://chatgpt.com/library?file_id=libfile_be85b026256c81919cddad1a9ef17bc7&account_id=personal).
Node.js 22.22.0 Windows x64 incluso, identico al pacchetto precedente. Nessun certificato o chiave privata incluso.

### Prova fisica della 2026-10-28.1 (vale anche per i pacchetti successivi)

Prova fisica sul PC Lenovo E14 e S24 Ultra: chiudere vecchio server, estrarre ZIP in cartella nuova, aprire `AVVIA NATPF LAN.cmd`, seguire configurazione del certificato e nuovo QR. Controllare versione 2026-10-28.1.
1. Chiudere e riaprire più volte il browser del telefono; attendere Pronto senza loop.
2. Attivare webcam e provare anche spegnimento/riaccensione rapidi; valutare fluidità e continuità del polso.
3. Gesti morbidi dall'alto in basso, alternati a dritti normali; verificare palle corte senza falsi positivi.
4. A Leggenda rispondere alle palle corte CPU con vari colpi, in tempo e fuori tempo.
In caso di problema, raccogliere registro diagnostico e ripartire da questo commit. Non ricreare main, non sovrascrivere il lavoro di Claude. Redesign T1–T6 conservato in `WORK_PROGRESS.md`, non svolto in questa richiesta.

### Limiti dichiarati

Telefono e webcam reali non provati. Chromium Playwright non scaricabile in questo ambiente (archivio vuoto/troncato): nessun test browser completato. L'ambiente di Claude che aveva Chromium funzionante era diverso. I test webcam sono simulazioni e prove del protocollo/lifecycle worker, non misure delle prestazioni hardware.
La copia temporanea iniziale è stata rimossa da manutenzione automatica; le correzioni sono state ricostruite e ora sono pubblicate su GitHub. Per la continuità usare il repository e questi documenti.
