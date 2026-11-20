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
| 16/11 | Conto alla rovescia «Allenati un po'!» prima degli scambi di prova (B59) | FIERA (vale anche online: stesso gioco) | fatto, 17.1 (`docs/b59/conto-allenati.md`) |
| 17/11 | Velocità dei colpi nel registro dello stand, per ritarare il trofeo Razzo (B60) | FIERA (il registro è solo nell'installer) | fatto, 17.1 (`docs/b60/kmh-dei-colpi.md`) |
| 17/11 | Mascotte: una Drop e una Lob (Drop sul Player 1, Lob sul Player 2), animate e non ferme (B61) | FIERA | fatto, 17.2 (`docs/b61/collaudo-17-11.md`) |
| 17/11 | Stesso schermo: anello a terra anche per il Player 2, TORINO dritto nelle due metà (B61) | FIERA (vale anche online: stesso gioco) | fatto, 17.2 |
| 17/11 | Dritto e rovescio «invertiti a volte» (B61) | FIERA | non riprodotto; misura nuova nel registro (`pl`), serve il registro del 17/11 |
| 17/11 | Salvaschermo: partita dimostrativa dopo 1 min senza nessuno (B62) | FIERA (online spento di base) | fatto, 17.3 (`docs/b62/salvaschermo.md`) |
| 17/11 | Analisi delle ridondanze (fascia, mano, nome, impostazioni doppie) | ENTRAMBE | analisi fatta (`docs/analisi/ridondanze-2026-11-17.md`); decisione dell'utente: sì a «Fascia una volta sola», «Livello CPU senza doppioni», «Impostazioni doppie»; no alla mano in due posti; fatto (B64, `docs/b64/ridondanze.md`) |
| 17/11 | Mascotte con i modelli 3D di Lob e Drop invece delle GIF | FIERA | decisione dell'utente: «3D con animazioni nuove» (3 di vittoria, 3 di sconfitta), anteprima prima di pubblicare (B63: anteprima consegnata, interruttore spento, aspetta l'approvazione) |
| 17/11 | Classifica di oggi a fine partita: top 5 e posizione di chi ha giocato, poi sparisce (B65) | FIERA | fatto, 17.4 (`docs/b65/classifica-fine.md`); decisioni: nello stesso schermo solo chi vince, dopo la card per 8 s |
| 18/11 | Registro dello stand: più dati su qualità dei sensori, calibrazione, prestazioni e precisione dei gesti, rete e stato del telefono dall'app, telefono bloccato; niente percorso del visitatore né salute del PC (B66) | FIERA (il registro è solo nell'installer; app Android 1.0.4) | fatto, 18.1 (`docs/b66/registro-sensori.md`); il Worker del registro va ricaricato |
| 18/11 | Mascotte 3D: impugnatura, pose «Sei-sette» e «Aura», sconfitta visibilmente triste (B67); poi «Le mascotte ok, integra queste e butta dentro altre animazioni simili alle esultanze e balletti» (B69) | FIERA, accese anche nel web con «Lob & Drop» (solo codice, niente asset) | fatto, 18.2 (`docs/b69/balletti-mascotte.md`): accese di base dove in campo ci sono Lob e Drop; con i Classici GIF (Windows) o ritratti (web) come prima |
| 18/11 | «Batte per primo» meno a lungo sopra il campo (B68) | FIERA (codice comune: vale anche nel web) | fatto, 18.2 |
| 19/11 | Registri del 18 e 19/11: «fixiamo subito i punti più importanti come: calibrazione giocando (importantissima), dritto e rovescio, sensori» (B71) | FIERA (app Android 1.0.5; registro formato 4 solo nell'installer) | fatto, 19.1 (`docs/b71/unione.md`, `docs/b71/revisione.md`); il Worker del registro va ricaricato (formato 4) |
| 19/11 | Casella «Al servizio» che lampeggia + alone pulsante dopo 3 s attorno all'area di chi deve servire, in singolo e nello stesso schermo (B72) | FIERA (codice comune: vale anche nel web) | fatto, 19.1 (`docs/b72/servizio.md`) |
| 19/11 | «Avversario» al posto di «CPU»: molti non sanno cosa significa CPU (B72) | FIERA (vale anche nel web) | fatto, 19.1 (`docs/b72/avversario.md`) |
| 19/11 | Selettore della lingua IT/EN dall'app del telefono, anche per uno solo dei due giocatori nello stesso schermo (B72) | FIERA (vale anche nel web) | fatto, 19.1 (`docs/b72/lingua.md`): menu, staff e toast restano in italiano |
| 16/11 | Direzione dei colpi (B36.1) | FIERA (interruttore dello staff, «Classica» di base) | 20/11 l'utente: «vai avanti»: tappa B36.1 «Nuova» interna in corso (B73, `docs/b73/`); misure nuove sui registri del 18–19/11 |
| 20/11 | Mascotte della card: passi veri con i piedi, avanti, indietro, destra, sinistra (B73, ripresa della B58.1: «falli») | FIERA (mascotte solo nel programma Windows) | in corso (B73) |
| 20/11 | Prove nel browser rotte da prima e misura della saturazione dell'accelerazione (B73, «tecnico») | ENTRAMBE (prove e analisi) | in corso (B73) |

## 4. Domande per l'utente (prima di separare il codice)

1. «FITP Simulator» online è lo zip Cloudflare di oggi con un altro marchio, o un prodotto diverso (altro repository,
   altro indirizzo, altre funzioni)?
2. Online vanno spente tutte le funzioni dello stand (§1, righe «Stand»)? Il telefono bloccato in partita (B51) online sì o no?
3. Il marchio: cosa cambia esattamente (nome, logo, colori, voce, testi), e chi fornisce i file?
4. Le richieste di oggi in poi: confermi «di base FIERA» salvo indicazione?

### 4.1 Risposte dell'utente (18/11/2026)

Parole dell'utente: «le mascotte nella versione web non servono, lasciamole solo nel programma Windows della fiera. Lob e
Drop a fine fiera non ci saranno più, quindi a fine fiera tornerà un prodotto online o comunque un installer Windows senza
Lob e Drop, e si tornerà ai Classici. FITP Simulator diventa una sorta di white label, brandizzabile a seconda degli
eventi da usare, e FITP Simulator tornerà sul campo esports FITP».

- **Subito (B70, versione 2026-11-18.3):** mascotte 3D che ballano nella card **solo nel programma Windows** della fiera
  (nel web spente salvo `?mascotte3d=1`).
- **Lob e Drop sono del solo evento** (fiera di Torino): finito l'evento, il prodotto (online o installer Windows) torna ai
  personaggi **Classici**, senza Lob e Drop né il marchio dell'evento.
- **FITP Simulator = prodotto white label**: marchio, personaggi/mascotte e testi dell'evento si cambiano per ogni evento
  (pacchetto di marchio); di base i Classici e il marchio FITP. FITP Simulator torna sul **campo esports della FITP**.
- Da chiarire quando si farà la separazione: cosa contiene esattamente un «pacchetto di marchio» (nome, logo, colori,
  mascotte, sfondi dell'arena, testi, voce) e chi fornisce i file; funzioni dello stand online sì/no (domanda 2 sopra).
