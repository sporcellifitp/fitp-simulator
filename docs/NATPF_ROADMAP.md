# NATPF Simulator · roadmap

Ultimo aggiornamento: 19 ottobre 2026 (branch `feature/natpf-tennis-v2`). Raccoglie in un posto solo lo stato del
gioco di tennis (1v1, telefono come racchetta, webcam, LAN e Cloudflare). I dettagli tecnici restano nei documenti
collegati: [NATPF_TENNIS_MVP.md](NATPF_TENNIS_MVP.md) (storia e architettura),
[NATPF_GESTI_E_LATENZA.md](NATPF_GESTI_E_LATENZA.md) (telefono, gesti, latenza, registrazioni),
[NATPF_EVENTI_E_BACKLOG.md](NATPF_EVENTI_E_BACKLOG.md) (modalità per eventi, registrazione e CMS).

Legenda delle verifiche: **provato** = eseguito e controllato in questo ambiente (test automatici, browser senza
schermo, rianalisi delle registrazioni vere); **solo implementato** = scritto e coerente con i test, ma non provato
con hardware vero (telefono in mano, webcam con una persona, Wi-Fi di un evento).

## 1. Fatto in questo giro

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

1. **Prova con persone vere della nuova lettura dei colpi** (pallonetto, palla corta, tagliato) e degli esercizi
   del riscaldamento; una registrazione con una sequenza dichiarata (es. 5 dritti, 5 rovesci, 3 pallonetti, 3 palle
   corte) per tarare soglie e segno del nuovo segnale. Il segno «palmo nel dritto, dorso nel rovescio» viene dalla
   fisica della presa e va confermato.
2. **Direzione (mira)**: tarare con la stessa registrazione dichiarata; oggi la mira è ricentrata sui propri colpi e
   nei gesti molto ampi decide il tempo del colpo.
3. **Modalità per eventi** ([NATPF_EVENTI_E_BACKLOG.md](NATPF_EVENTI_E_BACKLOG.md) §3): chiosco (ritorno al menu
   dopo 30 s senza nessuno), Radar del servizio, classifica del giorno, pannello dell'addetto.
4. **Registrazione dei visitatori e CMS del modulo** (stesso documento, §4): Cloudflare Pages Functions + D1.
5. **1v1 su sito statico (Cloudflare)**: oggi la sfida tra due computer usa il relay del server LAN; su Cloudflare
   serve la sessione WebRTC di NATPF.
6. **Player 2 nel 1v1**: mano (mancino), lettura dei colpi e mira dal piatto arrivano ancora con i campi del motore
   base.
7. **Torino** sul campo: la scritta resta quella ricavata dalle foto (non c'è un file ufficiale).
8. Opzione B 2v2: solo su richiesta.

## 4. Verifiche non possibili in questo ambiente

- Telefoni veri (Android/Chrome, iPhone/Safari): sensori, vibrazioni, nuova lettura dei colpi, esercizi speciali.
- Collegamento completo del telefono simulato nel test LAN (`npm run test:e2e-lan`): nel contenitore di prova la
  connessione WebRTC verso l'indirizzo di rete non si chiude. Superate 7 verifiche su 8: server LAN in HTTPS, gioco
  offline, QR con l'indirizzo di rete e la pagina del telefono, trasporto LAN diretto, nessuna richiesta esterna,
  nessun errore nelle pagine. La catena gesto → colpo è provata dai test con il telefono simulato (LAN e internet).
- Webcam con una persona vera.
- Wi-Fi di un evento, secondo computer reale per il 1v1.
- Resa dei loghi su una scheda video vera (anisotropia, mipmap) e su schermi grandi.
- Audio dell'intro e del menu (il browser di prova non ha uscita audio).
