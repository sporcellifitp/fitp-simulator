# NATPF Simulator · roadmap

Ultimo aggiornamento: 19 ottobre 2026, sera (branch `claude/friendly-fermat-dwv2w2`, da `feature/natpf-tennis-v2`). Raccoglie in un posto solo lo stato del
gioco di tennis (1v1, telefono come racchetta, webcam, LAN e Cloudflare). I dettagli tecnici restano nei documenti
collegati: [NATPF_TENNIS_MVP.md](NATPF_TENNIS_MVP.md) (storia e architettura),
[NATPF_GESTI_E_LATENZA.md](NATPF_GESTI_E_LATENZA.md) (telefono, gesti, latenza, registrazioni),
[NATPF_EVENTI_E_BACKLOG.md](NATPF_EVENTI_E_BACKLOG.md) (modalità per eventi, registrazione e CMS).

Legenda delle verifiche: **provato** = eseguito e controllato in questo ambiente (test automatici, browser senza
schermo, rianalisi delle registrazioni vere); **solo implementato** = scritto e coerente con i test, ma non provato
con hardware vero (telefono in mano, webcam con una persona, Wi-Fi di un evento).

## 1. Fatto in questo giro

### Richiesta in 6 punti del 19/10 (stato in [MEMORY.md](../MEMORY.md) §10)

| Punto | Causa trovata | Correzione | Verifica |
|---|---|---|---|
| 1 · Calibrazione del telefono | Tremolii presi per gesti; il rientro della mano al centro diventava il gesto successivo | Quiete prima di ogni gesto, posizione della mano lungo l'asse del colpo, rientro escluso | test con mano simulata **provati**; telefono vero **non provato** |
| 2 · Rovescio lungolinea letto come dritto | Il rovescio morbido veniva trattenuto come preparazione e il rientro diventava il dritto | Il gesto opposto è il colpo solo se veloce almeno l'80%; zona «palla diretta» 0,6 m | test con gesti simulati **provati**; telefono vero **non provato** |
| 3 · Varietà di traiettorie e angoli (anche P2 e CPU) | Ogni colpo passava la rete al minimo (1,25 m); la CPU sceglieva il colpo da un ciclo fisso; l'aria accorciava ogni colpo di ~2 m (le palle «in fondo» cadevano a metà campo) | Altezza sulla rete e top spin da colpo e forza, angolo stretto corto, rimbalzo con l'effetto, 8 schemi della CPU, correzione dell'aria sulla profondità | **provato** con `npm run audit:variety` e `audit:rally` (equilibrio entro pochi punti) e test nel motore; da vedere giocando |
| 4 · 1v1 tra due computer | Nessuna sessione: i colpi del P2 accendevano il 1v1 anche contro la CPU o nel menu; partita forzata a un game (il P2 non serviva mai); il computer del P2 decideva i punti da solo; «In attesa di Challenger» (nomi ignorati dal relay); host mai informato del P2 online (`touch=1`); host bloccato se il P2 esce; P2 orfano dopo un ricaricamento; il P2 non sbagliava mai | Sessione esplicita con l'host unico arbitro; lobby con codice, link e tre passi (stanza · P2 entrato · P2 pronto), «Gioca» solo con il P2 pronto; pausa con spiegazione se il P2 esce, ripresa automatica; pannello del P2 con «Sono pronto» ed «Esci»; stanza chiusa e link inesistente segnalati; durata a scelta; errori e palle alte del P2 come il P1 | **provato** con due sessioni del browser sul sito statico (WebRTC, 18/18) e con il server LAN; 9 test nuovi; due computer veri **non provati** |
| 5 · Grafica del campo | TORINO capovolta per una delle due camere, deformata (6,4 × 1,6 m) e lontana dalla riga | Scritte girate verso chi gioca su ogni computer, proporzioni del file, 2,1 m dietro la riga come nei riferimenti | **provato** con rendering dalle camere di gioco di P1 e P2 |
| 6 · MEMORY.md | — | Memoria di lavoro nella root, aggiornata a ogni attività | — |

### Secondo giro del 19/10 (foto e video della presa vera)

| Punto | Causa trovata | Correzione | Verifica |
|---|---|---|---|
| Pallonetti nei dritti normali | T (verso del piatto) dipende solo dall'asse di rotazione: la pronazione del polso a fine dritto lo porta a ±0,7 come un colpo verso l'alto; tre pallonetti di fila spostavano il riferimento personale | Pallonetto e tagliato veloce solo con la mano che si sposta davvero (accelerometro); mano che sale con decisione = pallonetto anche con il piatto al contrario; riferimenti solo dai colpi normali; palla corta invariata | **provato** con il simulatore della presa vera e nel browser dal QR; telefono vero no |
| Colpi spariti con l'impugnatura cambiata | verso del colpo solo dall'asse della calibrazione, nel riferimento del telefono | verso anche dalla rotazione attorno alla verticale | **provato** (simulatore) |
| Palla sempre nella stessa zona | mira solo dalla rotazione durante il colpo, rispetto alla mediana degli ultimi colpi: polso girato prima ignorato, mira annullata dopo 2–3 colpi | direzione assoluta del piatto all'impatto, centro che segue solo i colpi normali e la deriva, mira continua; tempo del colpo più incisivo | **provato** nel motore e nel browser; telefono vero no |
| Musica sempre uguale | un brano per schermata | 12 brani, gruppi a rotazione, cambio dopo tre giri in dissolvenza | **provato** (test); ascolto reale no |
| Menu | nessun blur; barra delle tappe tagliata; menu fuori schermo a 800 px; classifica e pannello del P2 disallineati | blur 5–6 px, barra compatta, menu compatto, larghezze allineate | **provato** con schermate a 4 risoluzioni |
| Sedia dell'arbitro | scaletta bianca generica, poi «A» a 7,4 m sul lato sinistro | grande «A» blu verso il campo, a destra a 10 m dal centro (3,6 m oltre il paletto), scaletta sul fianco, panchine a ±4 m, telecamere sul lato opposto | **provato** con rendering e test |

### Pallonetto e palla corta (le «palle alte» e le «palle corte»)

| Causa trovata | Correzione | Verifica |
|---|---|---|
| Il pallonetto del motore volava 1,32 s: saliva a 2,5 m e, senza compensare l'aria, cadeva a −7,3 m (metà campo). Non sembrava un pallonetto | Volo di 2 s con compensazione dell'aria: sale a ~6 m e cade in fondo (−10 m); non accelera con lo scambio | **provato**: simulazione con la fisica del motore (test) |
| La CPU non rispondeva mai sopra 2,05 m | Risponde al pallonetto fino a 3,1 m | solo implementato (partita vera da guardare) |
| Lo swing anticipato aspettava solo le palle sotto 2,35 m: sulle palle alte il colpo spariva | Attesa fino a 3,4 m, sopra 1,78 m schiacciata | **provato** nel giro precedente con le registrazioni (colpi senza esito) |
| Il verso verticale del colpo si leggeva dall'accelerometro durante il colpo, che con la presa a manico misura soprattutto la forza centripeta (rumoroso) | Nuovo segnale dal giroscopio e dall'orientamento: di quanto il piatto che colpisce sale o scende mentre ruota; i colpi normali stanno vicino a 0 | **provato** sulle 4 registrazioni vere: distribuzione plausibile (2–3 palle corte e 2–3 pallonetti su ~25 colpi) |
| La palla corta richiedeva anche l'apertura del piatto misurata, che sul campo non è affidabile | Palla corta = gesto dall'alto verso il basso e morbido | **provato** (test) |
| Soglie uguali per tutti, tarate alla cieca | Due esercizi nel riscaldamento («Pallonetto», «Palla corta») registrano i gesti di chi gioca e fissano soglie personali (azzerabili dalle Opzioni) | soglie **provate** (test); esercizi **solo implementati** |
| Il gioco non diceva quale colpo era uscito | Nome del colpo speciale nel messaggio dell'esito | **provato** (test) |

### Percorso di gioco da console

| Tappa | Cosa c'è | Verifica |
|---|---|---|
| Intro | ESPORTS FITP «presenta», Nitto ATP Finals, titolo con la palla, «Premi un tasto»; saltabile; breve se già vista nella sessione; `?intro=0` per le prove | **provato** nel browser (fotogrammi) |
| Menu principale | Gioca · Allenamento · Come si gioca · Opzioni, con frecce, Invio ed Esc | **provato** nel browser |
| Modalità | Contro la CPU · Sfida un amico, con caratteristiche e racchette richieste; decide gli avversari della pagina partita | **provato** nel browser |
| Racchetta e collegamento | Smartphone (QR), webcam o (prova) mouse e tastiera; si entra in campo da soli quando è pronto | **provato** con mouse e tastiera nel browser; QR con telefono simulato nel test LAN |
| Riscaldamento / allenamento | Campo d'allenamento (tribune vuote), calibrazione, dritto, rovescio, pallonetto, palla corta, servizio, angoli; dall'Allenamento si torna al menu con il risultato | **provato** il flusso con mouse e tastiera; con il telefono **solo implementato** |
| Partita | Livello CPU o invito dell'amico, durata, visuale; fascia di passaggio al campo | **provato** nel browser |
| Pausa e fine | Pausa (Esc), «Torna al menu»; schermata finale con «Gioca ancora» e «Menu», che riportano al menu principale con la dimostrazione | **provato** nel browser |

### Loghi e arena

- Arena ricomposta sulle immagini di riferimento: muro continuo attorno al fuori campo con i loghi stampati (lati
  lunghi: logo impilato e ESPORTS alternati; fondo: logo orizzontale e ESPORTS), pannelli LED negli angoli, bordo
  luminoso blu sul muro e sul parapetto delle tribune, varco con tre operatori TV sul lato opposto all'arbitro, sedia ad
  «A» con l'arbitro e le due panchine, raccattapalle sul fondo, cubo più grande e più basso, fari con alone, stendardi
  con la coppa, fuori campo più chiaro attorno al campo. Logo ufficiale Nitto ATP Finals al posto di eSeries
  (interfaccia e arena). **provato** con inquadrature fisse simili a quelle dei riferimenti; personaggi e pubblico
  restano stilizzati (blocchi), non le figure dettagliate delle immagini.

- Loghi ufficiali (vettoriali ESPORTS FITP e logo orizzontale Nitto ATP Finals; versione impilata composta con i
  blocchi del logo ufficiale) convertiti ad alta risoluzione con
  trasparenza (`site/assets/brand/`) e usati in intro, menu e passaggio al campo. **provato**
- Tutte le grafiche dei loghi nell'arena rigenerate dai file ufficiali con le proporzioni dei pannelli 3D
  (`natpf-tennis/scripts/brand/brand-assets.py`): tabelloni, pannelli LED, fascia, maxischermo, stendardi, rete. **provato** (inquadrature fisse)
- Rete: prima piano a doppia faccia (dall'altra metà campo la scritta era al contrario) e logo deformato; ora un
  piano per lato, proporzioni del file. **provato** dai due lati
- Anisotropia massima della scheda video sulle texture dei loghi (prima 8). **solo implementato** (dipende dalla
  scheda video; nel browser di prova la grafica è software)

## 2. Problemi risolti nei giri precedenti (ottobre 2026)

Telefono: latenza di riconoscimento 30–67 → 17–42 ms, mira ricentrata sui propri colpi, niente tagliati e pallonetti
non voluti, forza non più sempre al massimo, preparazioni lente che non diventano colpi, diagnostica con
registrazione (`Maiusc+D`). Campo d'allenamento con pannello di lato. Pacchetto LAN per Windows con Node portatile,
certificato e firewall. Dettagli in [NATPF_GESTI_E_LATENZA.md](NATPF_GESTI_E_LATENZA.md).

## 3. Aperto, in ordine di priorità

1. **Registrazione dichiarata con il telefono vero** (Maiusc+D → Registra): dritti normali, dritti girando il
   polso, pallonetti, palle corte, dritti mirati a destra e a sinistra; rianalisi con `replay-recording.mjs` per
   tarare `GESTURE.lobMove` e `AIM` (oggi tarati sul simulatore della presa vera).
1b. **Prova con persone vere della nuova lettura dei colpi** (pallonetto, palla corta, tagliato) e degli esercizi
   del riscaldamento; una registrazione con una sequenza dichiarata (es. 5 dritti, 5 rovesci, 3 pallonetti, 3 palle
   corte) per tarare soglie e segno del nuovo segnale. Il segno «palmo nel dritto, dorso nel rovescio» viene dalla
   fisica della presa e va confermato.
2. **Direzione (mira)**: tarare con la stessa registrazione dichiarata; oggi la mira è ricentrata sui propri colpi e
   nei gesti molto ampi decide il tempo del colpo.
3. **Modalità per eventi** ([NATPF_EVENTI_E_BACKLOG.md](NATPF_EVENTI_E_BACKLOG.md) §3): sfide (Radar, Bersagli 60",
   Scambio infinito, Sfida il campione), nickname, classifica del giorno, chiosco e pannello dell'addetto sono
   implementati (commit 45de50b); da provare a uno stand con il pubblico.
4. **Registrazione dei visitatori e CMS del modulo** (stesso documento, §4): Cloudflare Pages Functions + D1.
5. **1v1 con due persone vere** su due computer e su reti diverse (Wi-Fi di un evento, NAT): la prova a due
   sessioni usa giocatori automatici sullo stesso computer. Server TURN per le reti che bloccano WebRTC.
6. **Ritardo di rete del P2 nel 1v1**: si compensa solo il tempo nel relay e solo per il telefono; il tragitto
   P2 → host non è misurato.
7. **Torino** sul campo: la scritta resta quella ricavata dalle foto (non c'è un file ufficiale).
8. Opzione B 2v2: solo su richiesta.
9. Scambi lunghissimi tra due giocatori automatici perfetti nel 1v1 (84 colpi nella prova): con persone vere da
   osservare, nel 1v1 non c'è la CPU che sbaglia.

## 4. Verifiche non possibili in questo ambiente

- Telefoni veri (Android/Chrome, iPhone/Safari): sensori, vibrazioni, nuova lettura dei colpi, esercizi speciali.
- Collegamento completo del telefono simulato nel test LAN (`npm run test:e2e-lan`): nel contenitore di prova la
  connessione WebRTC verso l'indirizzo di rete non si chiude. Superate 7 verifiche su 8: server LAN in HTTPS, gioco
  offline, QR con l'indirizzo di rete e la pagina del telefono, trasporto LAN diretto, nessuna richiesta esterna,
  nessun errore nelle pagine. La catena gesto → colpo è provata dai test con il telefono simulato (LAN e internet).
- Webcam con una persona vera.
- Wi-Fi di un evento, secondo computer reale per il 1v1 (provato con due sessioni del browser sullo stesso computer).
- Resa dei loghi su una scheda video vera (anisotropia, mipmap) e su schermi grandi.
- Audio dell'intro e del menu (il browser di prova non ha uscita audio).
