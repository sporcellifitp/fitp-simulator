# Prodotti: versione per la FIERA e versione ONLINE · BOZZA da confermare con l'utente

Richiesta dell'utente del 16/11/2026: «buttare giù una struttura topologica delle funzionalità che fino ad oggi ti ho
chiesto per la fiera, di cui l'installer per la fiera, e quella che invece ha vita propria online, che non è NATPF
Simulator ma è FITP Simulator. Tu inizia a ricordarti di queste modifiche che ti chiedo per la versione in fiera.»

Oggi il codice è **uno solo** (branch `natpf-simulator`) e dà due pacchetti con lo stesso gioco: l'**installer Windows**
(stand) e lo **zip Cloudflare** (web). Questa bozza divide le funzionalità per prodotto; la separazione vera nel codice
(interruttori, marchi, due build) si fa dopo le risposte alle domande del §4.

**Regola da adesso** (CLAUDE.md): ogni richiesta dell'utente si segna con il prodotto a cui va. **Di base FIERA**
(«ricordati di queste modifiche per la versione in fiera»); ONLINE o ENTRAMBE solo se l'utente lo dice o è ovvio.
Registro delle richieste in §3.

## 1. Mappa delle funzionalità

| Area | Funzionalità (blocco) | FIERA (NATPF Simulator, installer) | ONLINE (FITP Simulator, web) |
|---|---|---|---|
| Gioco | partita contro la CPU, livelli, doppio (B49), stesso schermo (B20, B25), minigiochi e classifica del giorno, tutorial, calibrazione, servizio con scelte (B48), fine partita v2 (B40), «Movimenti come nel video» (B23, B53) | sì | sì |
| Telefono | telefono-racchetta con il QR, gesti, webcam | sì (in rete locale, server del PC) | sì (via internet, TURN) |
| Telefono | nome dal telefono prima di «Sono pronto» (B54) | sì | sì (stessa pagina) |
| Telefono | telefono bloccato in partita (B51) | sì | da decidere |
| Gioco | Lob e Drop a fine partita, personaggio della card, una animazione a caso per esito (B58) | sì (programma Windows) | no (lo zip non porta i file: col peso passava i 25 MB) |
| Stand | modalità fiera: pagina della fiera, «Prossimo giocatore», chiosco, solo mouse (B39, B41) | sì | no |
| Stand | telefoni dello stand abbinati una volta (B41) | sì | no |
| Stand | pannello dello stand, telecomando dello staff (B27), tastiera a schermo (B38) | sì | no |
| Stand | registro dello stand su Cloudflare (Worker `natpf-registro`, B36.0) | sì (solo installer) | no (oggi il web non ha l'indirizzo) |
| Stand | app Android «NATPF Racchetta» con «Fissa app» (B52) | sì | no (online: Chrome o Safari) |
| Stand | ledwall: area dello schermo, prova del ritardo (B50) | sì | no |
| Stand | aggiornamenti dal gioco (R2, `latest.json`), firewall, certificato del PC | sì | no |
| Online | sfida un amico tra due computer (P2P via internet) | sì (anche in rete locale) | sì |
| Online | pubblicazione su Cloudflare Pages, TURN `natpf-turn` | no | sì |
| Marchio | nome e loghi | NATPF Simulator | FITP Simulator (da fare) |

## 2. Pacchetti

- FIERA: `natpf-desktop` → installer Windows unico (workflow «NATPF eseguibili Windows», R2 `windows/…`), app Android
  (`natpf-android`, R2 `android/…`).
- ONLINE: `natpf-tennis/scripts/pacchetto-cloudflare.mjs` → zip per Cloudflare Pages (sotto 25 MB).

## 3. Registro delle richieste per prodotto (dal 16/11/2026)

| Data | Richiesta | Prodotto | Stato |
|---|---|---|---|
| 16/11 | Nome dal telefono prima di «Sono pronto» (B54) | FIERA (vale anche online) | fatto, 2026-11-16.1 |
| 16/11 | Telefoni che prendono da soli la pagina nuova (B54.1) | FIERA | fatto, 16.2 |
| 16/11 | «Movimenti come nel video» su tutti i colpi (B53) | ENTRAMBE | fatto, 16.3–16.4 |
| 16/11 | Niente nome sulla tastiera del PC con «Nuovo giocatore» (B54.2) | FIERA | fatto, 16.5 |
| 16/11 | «Torna alla versione di prima» nelle Opzioni (B55) | FIERA | fatto, 16.6 |
| 16/11 | Soglie dei trofei sui dati di Torino | ENTRAMBE | fatto, 16.7 |
| 16/11 | Correzione dell'anticipo dei colpi del telefono (B56) | FIERA (solo in modalità fiera) | fatto, 16.8 |
| 16/11 | Fine partita nello stesso schermo: chi vince sopra (B57) | FIERA | fatto, 16.8 |
| 16/11 | Lob e Drop a fine partita, una a caso per esito (B58) | FIERA (solo programma Windows; lo zip web non le porta) | fatto, 16.9 accanto al titolo; 16.10 nella card al posto del personaggio (richiesta dell'utente) (`docs/b58/mascotte-fine-partita.md`) |
| 16/11 | Mascotte della card: passi avanti, indietro, di lato (B58.1) e velo sul fondo | FIERA | velo corretto nella 16.11; passi non fatti: l'utente il 17/11 «ok con versione senza sfondo bianco» (restano come sono) |
| 16/11 | Conto alla rovescia «Allenati un po'!» prima degli scambi di prova (B59) | FIERA (vale anche online: stesso gioco) | fatto (`docs/b59/conto-allenati.md`), esce con la versione dopo la 16.11 |
| 17/11 | Velocità dei colpi nel registro dello stand, per ritarare il trofeo Razzo (B60) | FIERA (il registro è solo nell'installer) | fatto (`docs/b60/kmh-dei-colpi.md`), esce con la 2026-11-17.1 |
| 16/11 | Direzione dei colpi (B36.1) | da decidere | ferma: la cima è troppo imprecisa nei dati veri (`docs/b36/misure-torino.md`) |

## 4. Domande per l'utente (prima di separare il codice)

1. «FITP Simulator» online è lo zip Cloudflare di oggi con un altro marchio, o un prodotto diverso (altro repository,
   altro indirizzo, altre funzioni)?
2. Online vanno spente tutte le funzioni dello stand (§1, righe «Stand»)? Il telefono bloccato in partita (B51) online sì o no?
3. Il marchio: cosa cambia esattamente (nome, logo, colori, voce, testi), e chi fornisce i file?
4. Le richieste di oggi in poi: confermi «di base FIERA» salvo indicazione?
