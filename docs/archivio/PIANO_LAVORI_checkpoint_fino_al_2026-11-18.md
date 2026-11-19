# Checkpoint di docs/PIANO_LAVORI.md fino al 18/11/2026 (archivio, solo consultazione)

Tutti i checkpoint del §1 di `docs/PIANO_LAVORI.md` dal 07/11 al 18/11/2026 13:30 UTC, spostati il 18/11/2026 (commit
`e289bf8`) senza modifiche: nel file vivo resta solo l'ultimo checkpoint. Quelli fino al 07/11 sono in
`docs/archivio/PIANO_checkpoint_fino_al_2026-11-07.md`. Contengono anche decisioni dell'utente di quei giorni: le
durature sono riportate in `docs/PROJECT_MEMORY.md`.

---

**Checkpoint del 18/11/2026, 13:30 UTC (versione 2026-11-18.2: B67+B69 mascotte 3D approvate e accese di base con
«Lob & Drop», sei balletti di vittoria e due sconfitte nuove; B68 «Batte per primo» più breve).**
`docs/b69/balletti-mascotte.md`. Gioco 1843/1843, sito 289/289, LAN 13/13, desktop 56/56, build; nel browser
fine-partita-ritratti 28/28, mascotte-3d-anteprima 27/27, fine-partita 68/68, classifica-fine 11/11, b20 52/52,
fiera-telefoni 66/66, lob-drop 136/137 (piedi in corsa, come prima). Pacchetti verificati: installer dal link fisso
`93251e5c…26c3` (131.398.459 B), zip `2b876777…3475` (23.979.096 B) provato estratto; tre workflow verdi. **Prossima
azione esatta:** aspettare l'utente (collaudo delle mascotte che ballano sul ledwall e sul PC dello stand; installare
l'app 1.0.4 sui telefoni).

**Checkpoint del 18/11/2026, 11:30 UTC (versione 2026-11-18.1: B66 registro con sensori, calibrazione, prestazioni,
precisione dei gesti, rete e blocco del telefono; app NATPF Racchetta 1.0.4).** `docs/b66/registro-sensori.md`. Gioco
1826/1826, sito 289/289, LAN 13/13, desktop 56/56, build; app con l'SDK 34 nel contenitore (test 9/9, lint, classi verde);
nel browser registro-sensori 23/23, registro 39/39, phone-blackout 11/11, training-flow 21/21, fiera-telefoni 66/66,
fine-partita 68/68, telefono-bloccato 12/12, nome-telefono 23/23. Pacchetti verificati: installer dal link fisso `2a79bc0f…8abbe`
(131.385.673 B), zip `f24a6212…58d4b` (23.969.237 B) provato estratto, APK 1.0.4 `cdcacbd0…68a5` su R2. **Prossima azione
esatta:** aspettare l'utente: **ricaricare il Worker del registro** (formato 3, `docs/b66/registro-sensori.md` §5), installare l'app 1.0.4 sui
telefoni dello stand, registro della prossima giornata. B67 (mascotte) in un'altra worktree, non toccato.

**Checkpoint del 17/11/2026, 18:30 UTC (versione 2026-11-17.4 pubblicata: installer `d442fa8d…7aed`, zip `8e2559f1…5422`).** B65 classifica di oggi a fine partita,
B64 ridondanze tolte, B63 mascotte 3D presenti ma spente (aspettano l'approvazione dell'anteprima). Gioco 1820/1820, sito
282/282, LAN 13/13, desktop 56/56, build; nel browser classifica-fine 11/11, chi-gioca 55/55, b47-fiera 20/20, b20 52/52,
schermo 41/41, salvaschermo 21/21, ritratti 24/24, fine-partita 68/68, lob-drop 136/137 (il controllo dei piedi fallisce
uguale sulla 17.3). **Prossima azione esatta:** dopo il push, installer della 17.4 da R2 (sha256) e zip provato estratto;
poi aspettare l'utente: approvazione delle mascotte 3D, registro del 17/11.

**Checkpoint del 17/11/2026, 14:00 UTC (versione 2026-11-17.3 pubblicata e verificata: installer `a6cbc2ba…fa21`, zip `7540d176…6ee5`).** B62 salvaschermo (`docs/b62/salvaschermo.md`):
dopo 1 min senza nessuno al menu la partita dimostrativa a schermo intero, si chiude con mouse, tasto, tocco o telefono;
voce «Salvaschermo» nel pannello dello stand. Analisi delle ridondanze (`docs/analisi/ridondanze-2026-11-17.md`): proposte
da approvare. Gioco 1808/1808, sito 282/282, LAN 13/13, desktop 56/56, build; nel browser salvaschermo 21/21, stesso
schermo b25 57/57 e b20 52/52, stand-layout 8/8, solo-mouse 42/42, pannello-partita 25/25. **Prossima azione esatta:**
dopo il push, workflow Windows (installer della 17.3 da R2, sha256) e zip provato estratto; poi le mascotte 3D native
(anteprima con i ritratti 3D del B40.6, decisione dell'utente) e le risposte sulle proposte delle ridondanze.

**Checkpoint del 17/11/2026, 09:30 UTC (versione 2026-11-17.2 pubblicata e verificata).** B61, collaudo dell'utente sul
ledwall (`docs/b61/collaudo-17-11.md`): mascotte Drop sul Player 1 e Lob sul Player 2, sempre animate con la figura che
salta e fa passi; nello stesso schermo anello a terra anche per il Player 2 e TORINO dritto nelle due metà; campo `pl` nel
registro per misurare dritto e rovescio dalla parte opposta alla palla (non riprodotto). Gioco 1800/1800, sito 282/282,
LAN 13/13, desktop 56/56, build; nel browser fine-partita 68/68, stesso-schermo-b25 57/57. Pacchetti: installer
`f3788fa9…ca2d` da R2, zip `a0fc630f…f89a` provato estratto. **Prossima azione esatta:** aspettare l'utente (registro del 17/11 per dritto e rovescio; Worker: l'utente dice di averlo ricaricato il 17/11 mattina, da confermare con il campo `pl` nelle righe «colpo» del prossimo scarico).

**Checkpoint del 17/11/2026, 05:00 UTC (versione 2026-11-17.1).** B59 conto «Allenati un po'!» prima degli scambi di
prova; B60 km/h dei colpi nel registro (trofeo Razzo); correzioni: rivincita «tra 11 s», blocco del telefono che copriva
«Riattiva i sensori» e il velo, «Nuovo giocatore» con i gesti che saltava la calibrazione (B54.2). Prove nel browser
rimesse in riga (12 script). Pacchetti della 17.1 verificati (installer `d1b842cd…c69b`, zip `290c94ba…4861`). **Prossima azione esatta:** solo cose
dell'utente (messaggio per il prossimo agente in `docs/TRACCIA_PASSI.md`): registro
della prossima giornata per anticipo, trofei, Razzo e direzione; Worker da ricaricare; risposte sui due prodotti; collaudi
con telefoni veri, ledwall e Windows).

**Checkpoint del 17/11/2026, 01:30 UTC (B59 fatto, non ancora in versione).** Conto alla rovescia «Allenati un po'!»
prima degli scambi di prova (`docs/b59/conto-allenati.md`). Gioco 1789/1789, sito 280/280, build. Mascotte: restano come
sono (decisione dell'utente). **Prossima azione esatta:** esiti delle prove nel browser degli scambi di prova (elenco
nella traccia), poi versione 2026-11-17.1 e pacchetti.

**Checkpoint del 17/11/2026, 00:20 UTC (versione 2026-11-16.11: mascotte senza velo).** Le 20 animazioni rifatte con
`docs/b58/fondo-trasparente.py` corretto (velo quasi invisibile sul fondo di 4 animazioni di Lob tolto; figure identiche;
136–181 KB, 3,18 MB). Gioco 1784/1784, sito 280/280, LAN 13/13, desktop 56/56, build; `natpf-fine-partita` 66/66. Mandate
all'utente le animazioni di confronto (GIF consegnata, GIF nella card, ora) e due registrazioni del gioco vero.
Pacchetti della 16.11 verificati (installer `cef5bf74…4dee`, zip `ac266634…2585`). **Prossima azione esatta:** la
risposta dell'utente sui passi delle mascotte (B58.1, §5); poi B59 (conto alla rovescia «Allenati un po'!»).

**Checkpoint del 16/11/2026, 23:55 UTC (versione 2026-11-16.10 pubblicata e verificata).** Installer dal link fisso =
`latest.json` (131.858.384 B, sha256 `1e644c2f…6743`), tre workflow verdi; zip `8a42a2d8…b997` provato estratto. Trovato
dopo: velo quasi invisibile sul fondo di 4 animazioni di Lob (riquadro sul fondo della card): animazioni rifatte senza
velo (script `docs/b58/fondo-trasparente.py` corretto), non ancora nel repository. **Prossima azione esatta:** risposta
dell'utente sull'anteprima dei passi delle mascotte (B58.1, §5); poi versione 2026-11-16.11 con le animazioni senza velo
(e i passi, se approvati); poi B59 (conto alla rovescia «Allenati un po'!»), in coda.

**Checkpoint del 16/11/2026, 23:40 UTC (versione 2026-11-16.10: mascotte nella card).** Richiesta dell'utente dopo la
16.9 (già su R2): Lob e Drop nella finestra del personaggio della card, al posto del personaggio, non accanto al titolo.
Una per card con il suo esito, mai una della partita prima. Gioco, sito, LAN, desktop, build verdi (numeri nella traccia);
`natpf-fine-partita` 66/66. **Prossima azione esatta:** pacchetti della 16.10 (installer da `latest.json`, zip); poi
rimisurare anticipo, trofei e direzione con il registro della prossima giornata (scarico dell'utente).

**Checkpoint del 16/11/2026, 23:00 UTC (versione 2026-11-16.9: B58 Lob e Drop a fine partita, solo fiera).** Le 20
animazioni consegnate dall'utente (PR #4, unita in un solo commit: le GIF di partenza restano solo nel branch
`feature/natpf-mascotte-fine-partita-2`) adattate con il fondo trasparente (WebP) e mostrate accanto al titolo della
schermata finale, una a caso per esito, mai la stessa due volte di fila; solo nel programma Windows, lo zip Cloudflare
non le porta (`FIERA_ONLY`). `docs/b58/mascotte-fine-partita.md`. Gioco 1783/1783, sito 280/280, build;
`natpf-fine-partita` 66/66. **Prossima azione esatta:** pacchetti della 16.9 (installer da `latest.json`, zip); poi
come prima: rimisurare anticipo, trofei e direzione con il registro della prossima giornata (scarico dell'utente).

**Checkpoint del 16/11/2026, 21:30 UTC (versione 2026-11-16.8: B56 anticipo in fiera, B57 chi vince sopra).** B56: in
modalità fiera il gesto del telefono vale come fatto 100 ms più tardi (`docs/b36/misure-torino.md` §5). B57: a fine
partita nello stesso schermo chi vince sopra e in evidenza (`docs/b57/`). Gioco 1771/1771, sito 280/280, LAN 13/13, desktop
56/56, build; `natpf-fine-partita` 56/56. Pacchetti della 16.8 verificati (installer
`8f3d17f0…`, zip `4444b769…`). **Prossima azione esatta:** rimisurare anticipo, trofei e direzione con il registro della
prossima giornata (scarico dell'utente); B36.1 ferma (decisione dell'utente: prima l'anticipo).

**Checkpoint del 16/11/2026, 20:30 UTC (versione 2026-11-16.7: trofei sui dati di Torino).** Registro vero letto: 587
partite; trofei ritarati (`docs/b36/misure-torino.md`). B36.1 ferma per la regola del piano (cima troppo imprecisa): decide
l'utente. Pacchetti della 16.7 verificati (installer
`cc1002e9…`, zip `0f225660…`). **Prossima azione esatta:** la decisione dell'utente sulla direzione e sull'anticipo
sistematico dei colpi; le risposte del §4 di `docs/PRODOTTI_FIERA_E_ONLINE.md`.

**Checkpoint del 16/11/2026, 19:30 UTC (B55, versione 2026-11-16.6).** «Torna alla versione di prima» nelle Opzioni
(programma Windows): `docs/b55/versione-di-prima.md`. Test verdi (gioco 1767, sito 280, LAN 13, desktop 56, build).
Pacchetti della 16.6 verificati
(installer `abe181fd…`, `windows/versioni.json` su R2, zip `876bbf6f…`). Worker del registro corretto (503 dello scarico,
colonna «Partite»): da ricaricare a cura dell'utente. **Prossima azione esatta:** con i giorni di Torino scaricati: partite,
B36.1, soglie dei trofei; con le risposte del §4 di `docs/PRODOTTI_FIERA_E_ONLINE.md`: separazione dei due prodotti.

**Checkpoint del 16/11/2026, 17:30 UTC (versione 2026-11-16.5).** B54.2 (niente nome sulla tastiera del PC con «Nuovo
giocatore») pubblicata e verificata (installer `6021deb3…`, zip `6dbb088f…`). Bozza dei due prodotti (fiera e online) in
`docs/PRODOTTI_FIERA_E_ONLINE.md`, regola in CLAUDE.md. Worker del registro già alla versione giusta (formato 2).
**Prossima azione esatta:** con i giorni di Torino scaricati dall'utente: conto delle partite, B36.1 e soglie dei trofei sui
dati veri; con le risposte del §4 della bozza: separazione dei due prodotti.

**Checkpoint del 16/11/2026, 16:00 UTC (B53.4 servizio, versione 2026-11-16.4: B53 finito).** 16.3 pubblicata e
verificata (installer `61f14209…`, zip `6b728776…`). Servizio «come nel video»: impatto, finale e saltello; attesa e lancio
identici. Test verdi (gioco 1764, sito 280, LAN 13, desktop 51, build). Pacchetti della 16.4 pubblicati e
verificati (installer `95bce704…`, zip `0122f717…` provato estratto e consegnato). **Prossima azione esatta:** nessun lavoro
senza l'utente; aspettare il collaudo allo stand e B36.1, proporre le idee scritte in fondo a `docs/TRACCIA_PASSI.md`
(«messaggio per il prossimo agente»).

**Checkpoint del 16/11/2026, 15:10 UTC (B53.5, versione 2026-11-16.3).** 16.2 pubblicata e verificata (installer =
`latest.json` `f0e95275…`, zip `768829c0…`). B53.5: la voce delle Opzioni si chiama «Movimenti come nel video». Test
verdi. **Prossima azione esatta:** pacchetti della 16.3 (zip provato estratto, installer dal link fisso), poi **B53.4
servizio** (pose solo dentro e dopo lo swing del servizio: piegamento all'inizio, spinta in alto e avanti, piccolo salto
in campo, atterraggio; racchetta del motore intatta nella zona dell'impatto; aggiornare i test del B23 che danno il
servizio per immutato; fogli con `COLPO=servizio`). Restano dell'utente: Worker del registro e prova a Precision (B36.1),
collaudo allo stand; sui telefoni con la pagina di prima della 16.2 una volta «Riapri l'ultimo collegamento».

**Checkpoint del 16/11/2026, 14:30 UTC (B54.1, versione 2026-11-16.2).** Telefoni dello stand con la pagina di prima
(foto dell'utente: niente nome): il PC manda la sua versione e la pagina di un'altra versione si ricarica da sola fuori
dalla partita. Test verdi (gioco 1762, sito 280, LAN 13, desktop 51, build, `natpf-nome-telefono` 23/23). **Prossima
azione esatta:** pacchetti della 16.2 (zip Cloudflare provato estratto, installer dal link fisso = `latest.json`),
consegna; dire all'utente il «Riapri l'ultimo collegamento» una volta per i telefoni già aperti; poi B53.4 servizio e
B53.5 voce delle Opzioni. Restano dell'utente: Worker del registro e prova a Precision (B36.1), collaudo allo stand.

**Checkpoint del 16/11/2026, 13:30 UTC (B54 nome dal telefono, versione 2026-11-16.1).** Il visitatore scrive il suo nome
sul telefono prima di «Sono pronto» (`docs/b54/nome-dal-telefono.md`). Gioco 1761/1761, sito 280/280, LAN 13/13, desktop
51/51, build; prove nel browser `natpf-nome-telefono` 20/20, `natpf-fiera-telefoni` 66/66, `natpf-flusso-tocchi` (fiera
20/20, fiera-due 13/13, singolo 5/5, stesso 6/6), `natpf-telefono-bloccato` 12/12. Pacchetti della 16.1 pubblicati e
verificati (installer dal link fisso = `latest.json`, sha256 `d9ee30a7…`; zip Cloudflare `6be7b8d3…` provato estratto e
consegnato). **Prossima azione esatta:** B53.4 servizio e B53.5 voce delle Opzioni «Movimenti come nel video» (aspettano il
via dell'utente dopo il riepilogo del 16/11).
Restano dell'utente: Worker del registro e prova a Precision (B36.1), collaudo allo stand con telefono e ledwall, prova del
nome sui telefoni veri.

**Checkpoint del 16/11/2026 (B53.3, volée, 2026-11-15.3).** L'utente ha riaperto il lavoro sul gioco e spostato l'app Android
in secondo piano dopo la sua prova della 1.0.2. Sul branch `natpf-simulator` è stata applicata la patch della volée alla base
`f6502d7`: dritto e rovescio a rete hanno una preparazione corta, passo in avanti e finale breve. Test del gioco 1752/1752,
sito 275/275, desktop 51/51, LAN 13/13 e build. Zip Cloudflare verificato con versione e integrità. **Prossima azione
esatta:** B53.4, animazione del servizio con controllo della posizione della racchetta all'impatto, poi B53.5, voce
«Movimenti come nel video». Il collaudo con telefono e ledwall dello stand resta da fare. Restano aperti anche Worker del
registro e prova a Precision (B36.1).

Checkpoint precedente (16/11, 07:40 UTC, B53.2 schiacciata, versione 2026-11-15.2): rovescio (15.1) e schiacciata (15.2)
fatti; gioco 1749/1749, sito 275/275, desktop 51/51, LAN 13/13, build; `natpf-dritto-video` con i soli 4 rossi della 14.9.


- **Il punto esatto in cui si è arrivati e i prossimi passi stanno in `docs/TRACCIA_PASSI.md`** (file breve, aggiornato a
  ogni passo): leggerlo per primo.

- Aggiornato: 13/11/2026 · agente: Claude · branch `natpf-simulator` (**versione 2026-11-13.7**: registro dello stand collegato al Worker dell'utente `natpf-registro` nell'installer Windows; prima 2026-11-13.1–13.6: B23 dritto dal video, tappa 2 gruppo 2, B29–B34 e revisione finale, vedi `docs/TRACCIA_PASSI.md`; in corso B35a e B35b, collaudo dell'utente del 13/11; **fase successiva in roadmap: B36 direzionalità dei colpi a campo aperto**, solo analisi e piano finché B35 non è chiuso). Storia delle versioni del 12/11: 12.5 B28, 12.4 Lob & Drop e livelli, 12.3 B27, 12.2 B25, 12.1 B26. Repository: `sporcellifitp/fitp-simulator`.
- **Per riprendere leggere `docs/PASSAGGIO_CONSEGNE.md`** (lavoro dal 05/11, punti aperti §3, controlli §4) e, per i
  gesti del tutorial, `docs/b13/gesti-nuovi.md`. Checkpoint precedente (storia dal 04/11):
  `docs/archivio/PIANO_checkpoint_fino_al_2026-11-07.md`.
- **B13 fatto (08/11, richiesta «sistema la prova gesture-calibration. In parallelo, rivedi ancora i gesti del
  tutorial, il dritto non mi sembra tale e ci sono troppi colpi che non simulano la fisica del movimento del braccio
  con il telefono in mano»):**
  - (a) `tools/e2e/gesture-calibration.mjs` stabile (`9f9ca9e`…`67845e6`): la prova fermava il gioco con la pausa di
    rete, e un gesto fatto più di 0,8 s dopo l'ultimo fotogramma registrato viene scartato apposta
    (`input-time.js`); sui runner lenti succedeva. Ora fermo immagine all'apice del lancio senza pausa; `CPU_THROTTLE`
    per simulare un runner lento (prima 0/5 con CPU ×4, ora 12/12). Analisi `docs/b13/gesture-calibration-ci.md`.
  - (b) Gesti del tutorial sulla catena fisica spalla-gomito-polso (`e82f35b`): braccio intero dalla spalla con busto,
    testa e manica; dritto, piatto, incrociato, rovescio, servizio, schiacciata, volée e pallonetto rifatti; nuovo test
    `natpf-gesture-physics` (12). Riconoscimento non toccato. **Limite rimasto**: all'impatto la mano del dritto va in
    diagonale avanti-sinistra (57° dalla rete, prima 77°): con la presa nel palmo e i limiti del riconoscimento non può
    andare dritta verso la rete con il palmo davanti (`docs/b13/gesti-nuovi.md` §0).
  - Versione **2026-11-08.1** (novità per chi aggiorna dal gioco).
- Test: gioco 887/887, sito 195/195, LAN 12/12, programma Windows 28/28, build ok; nel browser vedi
  `docs/WORK_PROGRESS.md` B13.
- Non verificato: Windows (installazione, aggiornamento dal gioco 07.4 → 07.5 → 08.1), telefoni veri, ledwall, GPU vera,
  persone vere sull'animazione nuova; l'utente non ha ancora visto i fogli dei gesti nuovi.
- **Decisioni chieste all'utente** (B13): tenere la sagoma del busto; aggiungere una racchetta fantasma o il braccio
  libero in servizio e schiacciata; camera alta da dietro (stile TV) per i colpi da fondo.
- GitHub: le tre esecuzioni del push sono verdi («NATPF Simulator tests» con `gesture-calibration` al primo tentativo);
  installer **2026-11-08.1 pubblicato su R2** (sha256 `4000b1b7…60753204`). Zip Cloudflare sha256 `34889962…cf5a3cf0`.
- **B14 (08/11, seguito del B13):** il «vincolo del riconoscimento» del dritto è smentito (33° dalla rete senza
  toccarlo, verificato); camere più basse per il dritto e i colpi da fondo integrate: versione **2026-11-08.2**
  (`04a702d`), tutte le prove verdi, tre esecuzioni di GitHub verdi, installer pubblicato su R2 (sha256 `18559a51…bc5049a8`),
  zip Cloudflare sha256 `cf51aa20…b10fd4f6`. La revisione a occhi nuovi ha trovato il problema vero del dritto:
  l'orientamento del telefono (racchetta verso la rete in carica, palmo verso chi gioca all'impatto). Dettaglio in
  `docs/WORK_PROGRESS.md` B14.
- **B14.2 fatto, versione 2026-11-08.3:** disegno più pulito (persona da dietro con la testa leggibile, fantasmi di sola
  mano e telefono, palla sempre visibile all'impatto), schiacciata che finisce in basso, palla corta, tagliato e pallonetto
  inquadrati meglio, prova nuova alle velocità intermedie. **Il dritto non è cambiato**: la versione con la racchetta
  portata indietro e il palmo verso la rete (quella da manuale) è bloccata da tre cose misurate: (1) il riconoscimento
  vero (`site/js/tennis/gesture-intent.js:64`: con la calibrazione veloce una carica che gira il telefono a più di
  ~150 °/s è letta come un colpo speciale, quindi i 120–150° della racchetta portata indietro chiedono una carica lenta
  e una scheda di ~4 s; con la presa a martello la fine della carica è letta rovescio); (2) le regole del disegno (nessuna
  camera fa vedere quella carica senza il telefono di taglio); (3) l'ampiezza 85±3° del B9. Le versioni intermedie
  sbagliavano a velocità che i test non campionavano. Dettaglio: `docs/b14/dritto-orientamento.md`.
- Test: gioco 894/894, sito 195/195, LAN 12/12, programma Windows 28/28, build ok, sette prove nel browser verdi; letture
  identiche alla base. Dettaglio in `docs/WORK_PROGRESS.md` B14.
- **Decisioni chieste all'utente:** (a) se vuole il dritto da manuale bisogna toccare il riconoscimento (soglia dei colpi
  speciali nella calibrazione veloce) e provarlo con telefoni veri, accettare una scheda del dritto più lunga e ammorbidire
  le regole del disegno; (b) racchetta fantasma (prototipo spento: oggi mostrerebbe la racchetta verso la rete); (c) sagoma
  del busto e camere.
- GitHub: tre esecuzioni verdi su `ddd4428`; installer **2026-11-08.3 pubblicato su R2** (sha256 `d5ead1f7…27fb2f79`);
  zip Cloudflare sha256 `2bc87923…5084487f`.
- **Richiesta nuova (08/11): B15.** «Fai un nuovo audit per migliorare la sensibilità del dispositivo e la precisione dei
  colpi rispetto ai gesti eseguiti. I colpi non sono ancora da campo aperto, anzi, tutti gli scambi vanno quasi sempre
  nella stessa direzione con stessa velocità e angolazione. Assicurati che per i giocatori mancini sia tutto uguale. Per
  quanto riguarda la UX UI, rivedi l'intero flusso dall'accesso al gioco fino alla partita. Semplifica eventuali
  ridondanze, testi lunghi, rendi tutto semplice e di facile lettura e comprensione.»
- **B15 fatto, versione 2026-11-08.4** (richiesta dell'08/11 su colpi, mancini e flusso; poi «Quando hanno finito integra
  tutto e fai la versione nuova»): tre rami con verifiche indipendenti a ogni giro, uniti in `b15-int`. Colpi: la palla
  segue il gesto (velocità +29 %, profondità +17 %, direzione +12 % nella distribuzione di una persona vera; mira piena a
  17°; centro della mira quello di prima). Mancini: specchio esatto in tutta la catena, calibrazione prima del dritto,
  corpo e racchetta, servizio, 1v1. Flusso: testi brevi, una scelta per pagina, telefono con un pulsante. Dettaglio in
  `docs/WORK_PROGRESS.md` B15 e `docs/b15/`.
- Test: gioco 927/927, sito 197/197, LAN 12/12, programma Windows 28/28, build ok, prove nel browser verdi (vedi
  WORK_PROGRESS B15 · Integrazione; il costo del disegno sopra 4 ms è della macchina, uguale sulla base).
- **Decisioni chieste all'utente:** `docs/PASSAGGIO_CONSEGNE.md` §3.13 (Leggenda più dura o colpi forti meno tesi; tutorial
  corto prima della partita; riscaldamento facoltativo; mira più sensibile; unire le due pagine della scelta). Restano
  quelle sul dritto (§3.4).
- GitHub: tre esecuzioni verdi su `d888fb3` (`timing-browser` verde alla ripetizione, instabilità nota); installer
  **2026-11-08.4 pubblicato su R2** (sha256 `95485927…e3dfa15164`); zip Cloudflare sha256 `e5e67f5e…cce5c70de`.
- **Decisioni dell'utente (08/11 sera)** sulle domande del B15 (§3.13 del passaggio di consegne): (a) Leggenda più dura:
  «Sì»; (b) tutorial corto prima della partita (5 schede, le altre in Allenamento e in «Rivedi i gesti»): «Ok» (cambia la
  regola B9 «tutte le schede viste prima di "Tutto chiaro"»); (c) riscaldamento facoltativo: «Ok»; (d) mira più sensibile:
  «Ok ma come lo misuro?». Poi la richiesta del **B16**: «Vai avanti con l'audit e dimmi cos'altro c'è da migliorare e cosa
  non va, soprattutto a livello gameplay.»
- **B16 fatto e pubblicato, versione 2026-11-08.5** (`84838f6` su `origin natpf-simulator`, avanzamento lineare da
  `6dae07a`; integrato nel ramo locale `b16-int`). Base `origin/natpf-simulator` `6dae07a`
  (con due commit di soli documenti del **B17** di un'altra sessione, vedi sotto); unioni `70c85b3` (Leggenda), `90a8eb7`
  (tutorial corto e riscaldamento facoltativo), `bb46a6f` (mira); versione e documenti nel commit di questo checkpoint.
  - (a) **Leggenda più dura**: forza dalla CPU (primo passo, pressione dal 20° colpo, chiusura misurata, controllo dei colpi
    forti, un po' più di incrociato stretto); `audit:legend` 69/69 e ultimo passo del job del gioco su GitHub; torneo
    ridotto in `npm test`; prova nel browser `natpf-leggenda`.
  - (b)+(c) **Tutorial corto e riscaldamento facoltativo**: 5 schede prima della partita (presa, posizione di partenza,
    dritto, rovescio, servizio), le altre nell'Allenamento e in «Rivedi i gesti»; dopo la calibrazione la pagina «Partita»
    con «Gioca» e «Riscaldati prima»; tocchi fino alla prima palla singolo 20 → 13, stesso schermo 31 → 19, sfida 25 → 18.
  - (d) **Mira**: l'addetto la sceglie nel pannello dello stand (alta 17° · media 20° · bassa 23°); la diagnostica misura
    per partita lato delle palle, palle angolate e piatto mediano; comando `lato-palle.mjs`; `docs/GUIDA_MISURA_MIRA.md`.
  - **Audit del gameplay**: `docs/b16/rapporto-gameplay.md` (misurato sulla 2026-11-08.4; 25 difetti, 11 miglioramenti,
    piano in tre tappe). Le 4 decisioni che chiede sono in `docs/PASSAGGIO_CONSEGNE.md` §3 punto 14.
  - **Rifinitura 1** dopo le revisioni dell'integrazione (commit successivo a `bfeb069`, sempre su `b16-int`, non
    `84838f6`): la nota di tre righe sotto i pulsanti del pannello dello stand portava «Chiudi» fuori vista a 1024 × 600 e
    a metà a 1366 × 657; tolta, la spiegazione della mira ora è nell'avviso dopo il clic e nel `title` del pulsante;
    `natpf-menu` controlla il pannello con «Chiudi» in vista a tre misure (28/28; 26/28 sulla versione di prima). Corretti
    anche testi e documenti segnalati (README del gioco, guida della mira, §4 del passaggio di consegne, riga superata del
    B15 qui). I non bloccanti lasciati sono elencati in `docs/WORK_PROGRESS.md` «B16 · Integrazione», rifinitura 1.
- Test: gioco 957/957, sito 197/197, LAN 12/12, programma Windows 28/28 (non rifatto nella rifinitura: nessun file
  toccato), build ok, `audit:legend` 69/69; nel browser tutte le prove dei file toccati verdi (elenco e numeri in
  `docs/WORK_PROGRESS.md` «B16 · Integrazione»; nella rifinitura `natpf-menu` 28/28 e `natpf-mira-lato` 23/23). Zip
  Cloudflare 2026-11-08.5 **rifatto** dopo la rifinitura in `scratchpad/b16/pacchetti/`
  (`natpf-simulator-cloudflare-20261108-5.zip`, 22.578.885 B, sha256 `8cec771b…2285c983a`, provato estratto; sostituisce
  quello di `bfeb069`, sha256 `89ed0cb1…8ab73d71`, mai consegnato); l'installer lo costruisce GitHub dopo il push.
- Non verificato: telefoni veri, persone vere, webcam vera, Windows (installer 08.5 e aggiornamento dal gioco 08.4 → 08.5),
  ledwall, GPU vera.
- GitHub: tre esecuzioni verdi su `84838f6` al primo tentativo («NATPF Simulator tests», «NATPF motore base MVP» con il
  passo `audit:legend` in fondo, «NATPF eseguibili Windows»); installer **2026-11-08.5 pubblicato su R2**
  (`NATPF-Simulator-Setup-2026-11-08.5.exe`, 124.585.994 B, sha256 `65534743…edceca5e4a3`); zip Cloudflare consegnato
  all'utente (sha256 `8cec771b…2285c983a`). Prima del push: `git fetch` (origin fermo a `6dae07a`), gioco 957/957 e sito
  197/197 rifatti nel checkout principale.
- **B17 di un'altra sessione, in parallelo** (`docs/b17/analisi-e-piano.md`: gesti del tutorial dal video, X per uscire
  dal tutorial, punteggio in alto a sinistra, colpi sotto rete). Sovrapposizioni: difetto 2 dell'audit (colpo fallito a
  Leggenda) ↔ B17.4 (stessa regola `failQ` → `weak` in `natpf_stroke_outcome.js`); difetto 4 (fine partita nello stesso
  schermo, banner) ↔ B17.3 (tabellone, `natpf_scoreboard.js`); tutorial corto ↔ B17.2 (X per uscire). File che tutte e due
  le sessioni toccano o toccheranno: `natpf_tutorial.js`, `natpf_split_ui.js`, `index.html`, `natpf_stroke_intent.js`,
  `natpf_phone_racket.js`, e questi documenti: chi integra dopo fa `git fetch` e unisce (merge), rifà le prove.
- **Decisione dell'utente del 12/11 (23:10 UTC) sulla roadmap**: consegnare B29, B30 (e integrare B28.1 dell'altro agente), poi senza fermarsi B23 + tappa 2 gruppo 2, poi tappa 3 punti 1, 2, 3 del rapporto B16 (gioco a rete/schiacciata/palla corta della CPU/tagliato utile; movimento con accelerazione e colpi in corsa; fine partita con dati veri e classifica delle partite) come B31, B32, B33. Dettaglio in `docs/TRACCIA_PASSI.md`.
- **Prossima azione esatta:** attendere le decisioni dell'utente sulle **4 domande dell'audit** (passaggio di consegne §3
  punto 14): 1. partire con la tappa 1; 2. formato in fiera: punto decisivo sul 40-40 e servizio alternato; 3. pulsante
  «Nuovo giocatore» che azzera nome, calibrazione e tutorial senza scollegare il telefono, record per giorno; 4. tappa 2
  con il livello «Evento» adattivo (adulto medio al 60–70 % dei punti) e un livello per bambini. Prima di cominciare una
  tappa: `git fetch origin natpf-simulator` e coordinarsi con il B17 dell'altra sessione (sovrapposizioni qui sopra);
  il B17 deve partire dalla 2026-11-08.5 (`84838f6`).
- **B17 (08/11 sera, richiesta con video e due diagnostiche; agente Claude in parallelo al B16):** analisi in
  `docs/b17/analisi-e-piano.md`. Uniti su `natpf-simulator` sopra il B16 (`b6e09f2`, `466830a`, `d254944`; conflitti con
  il tutorial corto risolti tenendo tutte e due le cose): **B17.2** X in alto a destra del tutorial (accesa dopo tutte le
  schede, fa come «Tutto chiaro»); **B17.3** tabellone in alto a sinistra sulla schermata di riferimento dell'utente
  (`docs/b17/punteggio-riferimento.md`, `docs/b17/punteggio.md`); **B17.4** colpi sotto rete guidati dal gesto
  (`docs/b17/rete.md`). Test sul codice unito: gioco 970/970, sito 200/200, LAN 12/12, build ok; prove nel browser in
  corso. In corso anche: revisioni di tabellone e rete sul codice unito, Invio/Spazio sulla X (workflow
  `natpf-b17-chiusura`). **B17.1** (gesti del tutorial dal video dell'utente): piano in `docs/b17/analisi-e-piano.md` §1.4,
  in attesa dell'ok dell'utente.
- **B17.2–B17.4 fatti, versione 2026-11-09.1** (`a778b0f`): revisioni sul codice unito corrette (bordo laterale a rete,
  rifinitura del tabellone, Invio/Spazio sulla X), 12 prove nel browser verdi, installer su R2 (sha256 `9cd1bf14…a3295a15`)
  e zip Cloudflare (`460f25cd…eacc1cf0`) consegnati. Dettaglio in `docs/WORK_PROGRESS.md` B17.
- **B17.1 avviato (09/11, l'utente ha approvato il piano «procedi con il piano dei gesti dal video»):** workflow
  `natpf-b17-1-gesti-dal-video` in tre passi con revisione (A dati dal video con MediaPipe → `docs/b17/gesti-video.json`;
  B posa dai dati e presa «upright»; C disegno specchiato frontale e fogli video/animazione `docs/b17/img/VC-*`). Il
  video resta in `scratchpad/b17-riferimenti/gesti-video.mp4` (fuori dal repository). Se la sessione si interrompe: i
  commit sono nel worktree `.claude/worktrees/wf_bb380d57-57a-1` (ramo `worktree-wf_bb380d57-57a-1`, copia in
  `docs/b17/wip/ramo-B17-1-passo-A.patch`: strumenti `natpf-tennis/scripts/video/*`); ripartire dal passo non finito
  leggendo `docs/b17/STATO-*.md` nel worktree. Presa: dalle **foto dell'utente del 09/11** (`docs/b17/presa-foto.md`:
  telefono orizzontale lungo l'avambraccio, cima in avanti, schermo verso lo schermo di gioco), non dal video.
- **B17.1, decisioni dell'utente (09/11 sera)** dopo i passi A (video misurato) e B (presa «racchetta» verificata;
  coreografie dal video NON lette dal riconoscimento: `docs/b17/posa-dal-video.md` §3): (1) **«Ottimizza senza di me»**
  (scelta B del §4: tenere la forma del video e cercare polso e tempi con il rilevatore nel costo, come nel B13; il gesto può
  allontanarsi un poco dal video: misurarlo e dirlo); (2) posizione di partenza e presa **«come la mia impugnatura del
  video»** (non la lettura delle due foto: orientamento del telefono e braccio di partenza come misurati nel video,
  `gesti-video.json`, presa nei colpi). In lavorazione nel worktree `wf_bb380d57-57a-1`, poi passo C (disegno e confronto).
- **B17.1, conferme e richieste dell'utente (09/11 notte)** sulle anteprime VC-*: confermate le due eccezioni (palla corta e
  schiacciata partono dal telefono davanti al petto) e la terza indicazione della scheda «Presa» («Pollice in alto lungo il
  bordo, schermo verso l'interno»). Nuove richieste: **rovescio a una mano** (non a due); **dritto: la palla si colpisce con
  il display frontale** (all'impatto lo schermo guarda la palla/la rete); **rovescio: stesso movimento ma con l'altro lato**
  (all'impatto il dorso del telefono guarda la palla). In lavorazione nel worktree `wf_bb380d57-57a-1`.
- **B17.1 fatto, versione 2026-11-10.1** (unione `6a35cc0`, versione `b55453b`): dati del video misurati con MediaPipe
  (`docs/b17/gesti-video.json`), presa e partenza «come la mia impugnatura del video», coreografie ottimizzate con il
  rilevatore vero nel costo (`natpf-tennis/scripts/video/ottimizza.mjs`), **rovescio a una mano** a specchio, **schermo
  del telefono verso la palla nel dritto e dorso nel rovescio** (angolo ≤ 20° all'impatto, `IMPACT_FACE`), disegno frontale
  a specchio con **primo piano** dell'impatto, fogli `docs/b17/img/{V,O,VC}-*`. Riconoscimento non toccato. Limiti dichiarati
  (`docs/b17/ottimizzazione.md`, `gesti-dal-video.md` §8): pallonetto e palla corta colpiscono col dorso (da decidere con
  l'utente), fine del servizio a petto, a 448×280/200×200 la telecamera segue solo il braccio, letture con la calibrazione
  del braccio simulato per piatto/incrociato/lungolinea (`test/gesture-semi.mjs` DECLARED). Prove: gioco 991/991, sito 200/200,
  programma Windows 28/28, build ok, 12 prove nel browser verdi. **Installer pubblicato su R2** (124.627.238 B, sha256
  `f6ceb80b…2161b30`, verificato dal link fisso) e zip Cloudflare (22.615.793 B, `3b81e05f…eae337`, provato estratto).
  La prima pubblicazione era fallita per la **quota degli artifact di GitHub piena** (124 MB a versione, 30 giorni): il
  workflow ora tiene la copia di riserva con `continue-on-error` e 2 giorni (`d27f8e6`).
- **B18 · Decisioni dell'utente sul B16 (10/11):** (1) tappa 1 del rapporto «sì»; (2) formato in fiera «ok, dimmi come
  attivarlo in caso» → **opzione spenta di default**, si accende dal pannello dello stand (e si spiega come); (3) «Nuovo
  giocatore» «sì»; (4) tappa 2 con livello «Evento» adattivo e livello per bambini «sì, ma dimmi sempre come attivarli»
  (ogni livello/opzione nuova va detta all'utente con il percorso per accenderla). Ordine: **B18.1 = tappa 1** (rami in
  worktree con revisore: R1 fine partita/«Nuovo giocatore»/rating finto, R2 motore piccolo D6/D7/D12/D13/D16/D9-soglia, R3
  scritte/istruzioni del servizio/Precision e Combo/misure in diagnostica, R4 formato fiera come opzione), unione, versione;
  poi **B18.2 = tappa 2** una cosa alla volta con le prove simulate (personaggi fermi + servizio, CPU che sbaglia per la
  pressione, Leggenda stessa regola, palla corta che può sbagliare, poi livelli Evento e Bambini, segnale del momento giusto).
  Se la sessione si interrompe: i rami sono nelle worktree `.claude/worktrees/wf_*` più recenti (`git worktree list`).
- **B18.1 fatto, versione 2026-11-10.2** (tappa 1 del rapporto B16; dettaglio in `docs/WORK_PROGRESS.md` B18.1 e
  `docs/b18/`): fine partita per chiunque vinca, «Nuovo giocatore», motore piccolo (stanchezza, risposta, servizio, tagliato,
  latenza, difesa a Pro), scritte dell'esito e istruzioni del servizio, Precision e Combo per principianti, misure in
  diagnostica, **formato in fiera come opzione spenta** (pannello dello stand → «Formato in fiera»). Gioco 1075+, sito 201,
  LAN 12, Windows 28, build, `audit:legend` 69/69, 20 prove nel browser.
- **Repository trasferito e rinominato (10/11 pomeriggio):** ora è **`sporcellifitp/fitp-simulator`** (prima
  `sergio4/foro-italico-world`). Push della 2026-11-10.2 fatto (`9e9ac3a`); i segreti R2 sono passati con il trasferimento:
  la corsa 22 di «NATPF eseguibili Windows» ha pubblicato l'installer **2026-11-10.2** su R2 (124.649.916 B, sha256
  `a546aae4…2505c8f`, verificato dal link fisso). Zip Cloudflare 2026-11-10.2: 22.626.641 B, sha256 `8459a7e0…3d41aa`.
- **Fatto l'11/11, versione 2026-11-11.1:** tappa 2 gruppo 1 (B18.2: D11 servizio e personaggi fermi; D1+D9 CPU che
  sbaglia per la pressione, Pro lasciato com'è per decisione dell'utente), audit B19 (`docs/b19/audit-1v1-utenti.md`) e
  B20 stesso schermo (tappa A, sorteggio, formato in fiera a tre valori di base «Solo stesso schermo», scambio che si
  scalda come opzione, rivincita dai telefoni), ognuno con revisore indipendente. Dettaglio in `docs/WORK_PROGRESS.md`
  e `docs/PROJECT_MEMORY.md`. Domande dell'audit B19 senza risposta (4, 9–16): resta tutto com'è. Da confermare con
  l'utente: compensazione del servizio a Casual (`docs/b18/t2-1-servizio.md`).
- **B21–B24 · richieste dell'utente dell'11/11 (prossimi lavori, nell'ordine; l'utente vuole risposte sintetiche):**
  - **B21 video nel gioco.** Generati con Higgsfield/Seedance da fotogrammi veri del gioco (86 crediti su 120 di tetto;
    senza audio): trailer 10 s 720p (approvato «va bene così», **senza titolo**) da usare come video d'avvio **con
    ripiego sul video attuale** (`public/media/intro.mp4`) se non si carica; due clip «come si gioca» da 8 s da usare
    **sfocate** come sfondo del tutorial (le dimostrazioni dei gesti restano l'animazione 3D: regola del 28/10). I file
    stanno nello scratchpad `video/` e nella libreria Higgsfield dell'utente (job trailer `76affc9c-…54c3b7eb8559`, clip
    `a2e35211-…1904e015087b` e `6ca34199-…3420caef6bfc`). **Peso:** lo zip Cloudflare ha 25 MB di limite (margine ~2,4 MB):
    le clip sfocate (0,2–0,3 MB) entrano nello zip; il trailer (9 MB) va su **R2** (bucket già usato per l'installer,
    cartella `media/`, caricato dal workflow) e il gioco web lo prende da lì con ripiego; nell'installer Windows può stare
    dentro (lì non c'è il limite).
  - **B22 scia luminosa della palla** nel gameplay come nel trailer, un po' meno luminosa, con una voce nelle Opzioni per
    spegnerla (spenta = com'è oggi). Dire all'utente dove si spegne.
  - **B23 prova «movenze dal video» sul solo dritto**: clip in primo piano del personaggio, pose misurate con gli strumenti
    di `natpf-tennis/scripts/video/`, animazione del gioco riscritta su quelle pose tenendo impatto e tempo legati alla
    palla vera, confronto fianco a fianco. Se all'utente non piace si toglie; se piace si estende agli altri colpi.
  - **B24 Lob & Drop** (mascotte Nitto ATP Finals, foto in `docs/riferimenti/lob-drop-2026-11-11.webp`: Drop blu con
    fascia bianca, Lob giallo con visiera blu e occhiali) come due personaggi giocabili/in campo.
- **B25 · punti aperti chiusi dall'utente (11/11 pomeriggio, con domande a scelta):**
  - Servizio a Casual contro la CPU: compensazione **confermata** (`SERVE_WEIGHT.casual`).
  - **«Chi gioca: Bambino · Ragazzo · Adulto» al posto del livello** quando si crea la partita contro la CPU (idea
    dell'utente: il gioco non riconosce un bambino): Bambino → livello Bambini, Ragazzo → Casual, Adulto → livello Evento
    (adattivo); Pro e Leggenda in «Altre impostazioni». Si fa con i livelli Evento e Bambini (tappa 2 gruppo 3). Nello
    stesso schermo niente fasce né aiuti (decisione del 10/11).
  - **Bambino contro adulto nello stesso schermo (riaperto dall'utente l'11/11 sera: «un bambino dovrebbe essere
    facilitato in qualche modo»; sostituisce il «no» del 10/11 agli aiuti):** ogni giocatore sceglie la sua fascia
    (Bambino · Ragazzo · Adulto); se le fasce sono diverse il più giovane riceve un aiuto. Da preparare e misurare con il
    banco dei due umani (`scripts/audit/b19/`): tolleranza più larga sul tempo del colpo («Facile», +60 ms bastano solo tra
    livelli vicini) e/o vantaggio di punti (bambino contro adulto: 7% → 16% con 15-0, 37% con 30-0, 66% con 40-0) e/o forza
    relativa; obiettivo: bambino contro adulto vicino al 35–45% delle partite. Mostrare all'utente i numeri e far scegliere.
  - **Lancio automatico** dopo 30 s se chi batte resta fermo: sì, **opzione** del pannello dello stand, spenta di base.
  - **Campo aperto tra due persone** (la palla precisa e angolata fa punto contro chi rimanda solo al centro): sì,
    **prepararlo e misurarlo come opzione** del pannello dello stand, spenta di base.
  - **Colpo super tra due persone**: forza misurata sul colpo abituale di ciascuno, **solo per il super** (i colpi
    normali restano come oggi).
  - **Preparazione del colpo: nel 1v1 tra persone non conta.**
  - Punto decisivo del formato in fiera: «come nel tennis: batte chi serve» = batte chi è di turno nella rotazione (è il
    comportamento di oggi: niente da cambiare). Barra «Energia» nello stesso schermo: resta. Webcam per due: l'utente non
    la usa, non si tocca. Sfida tra due computer: resta ferma. Telefono agitato: lo prova prima l'utente con un telefono vero.
- **Prossima azione esatta:** B21 (video nel gioco con ripiego e R2) e B22 (scia luminosa con opzione), poi B23 (prova
  delle movenze sul dritto) e B24 (Lob & Drop). Dopo: tappa 2 gruppi 2 e 3 (`docs/b16/rapporto-gameplay.md` §4: Leggenda
  stessa regola D2, palla corta che può sbagliare D8, livelli Evento e Bambini D3 da spiegare all'utente, segnale del
  momento giusto e colpo super spiegato). Collaudo dell'utente sempre aperto (telefoni veri, Windows, ledwall).

**Checkpoint del 18/11/2026 (pulizia sicura del repository, nessuna versione nuova).** Versione pubblicata: **2026-11-18.3**
(`e9409c5`, B70 mascotte 3D che ballano solo nel programma Windows): installer dal link fisso 131.385.957 B, sha256
`6e9ad5e4…63a1`; zip Cloudflare 23.979.122 B, sha256 `d95b66f5…68dc`, provato estratto; app Android 1.0.4 su R2. Pulizia
(solo documenti e file non usati, approvata dall'utente): tolti `undefined/`, `docs/b9/wip/`, `docs/b17/wip/`,
`docs/consegna/2026-11-15/` (testo del passaggio e script di rilascio conservati in `docs/archivio/consegna-2026-11-15/`),
`docs/SESSION_HANDOFF.md`; in `docs/archivio/` cinque documenti senza riferimenti e i diari della radice (`MEMORY.md`,
`SESSION_HANDOFF.md`, `WORKLOG.md`); accorciati `docs/TRACCIA_PASSI.md`, `docs/WORK_PROGRESS.md` e questo §1 (parti vecchie in
archivio, integrali); indice nuovo `docs/LEGGIMI.md`. Prove: gioco 1844/1844, sito 289/289, LAN 13/13, desktop 56/56, build (dettagli
in `docs/WORK_PROGRESS.md`, voce «Pulizia sicura»). Pacchetti invariati (quelli della 18.3). **Prossima azione esatta:**
aspettare l'utente: collaudo della 18.3 allo stand (mascotte che ballano sul ledwall e sul PC, app 1.0.4 sui telefoni),
registro della prossima giornata, risposte per la separazione FIERA / ONLINE, requisiti di HW1; parti della pulizia
ancora da confermare (vecchio sito, immagini di analisi, rami remoti, artifact delle Actions).
