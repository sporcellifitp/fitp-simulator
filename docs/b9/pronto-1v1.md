# B9 · Compito B — stato «pronto» nel 1v1: cosa è fatto

> 06/11/2026, agente Claude, ramo del worktree `wf_e8b0b59b-1e4-2`. Consegna in `docs/b9/compiti.md` (Compito B),
> analisi in `docs/b9/analisi-pronto-1v1.md`. Qui solo quello che serve a chi unisce il ramo: file, protocollo del
> telefono, differenze dall'analisi, prove, cosa non è verificato.

## Stesso schermo («Collega i due telefoni»)

- `natpf-tennis/src/natpf/natpf_ready.js` (nuovo, funzioni pure + disegno idempotente): quattro stati
  `off · prep · ready · ko` («In attesa», «Si prepara», «Pronto», «Problema» o la parola precisa: «Scollegato»), sempre
  con colore, icona e parola; conto alla rovescia (`createCountdown`, 3 s) che scatta una volta, si annulla e riparte.
- `natpf_split_ui.js`: ogni metà è la scheda del giocatore con il nome scritto; stato «Guarda il tutorial» quando il
  tutorial della metà è aperto (prima «Attiva i sensori» con i sensori già attivi); barra dell'avvio sempre in vista
  (chi manca e perché); con tutti e due pronti e il tutorial chiuso, conto di 3 s grande sul computer e annunciato sui
  telefoni, poi si gioca senza toccare il PC; telefono che cade durante il conto → conto annullato con il motivo nella
  barra e sui telefoni; «Aspetta» o Esc lo fermano, poi «Gioca» nella barra.
- `natpf_lobby.js`: niente più salto muto a «Partita» dopo 0,7 s (`autoAdvance` falso per `split`); nella pagina
  «Partita» le schede dal vivo al posto del «VS» e «Gioca» grigio e spento se un telefono non è pronto.
- CSS in `natpf-ui.css` (`cqw/cqh`, `@container natpf`): bordo verde su tutti i lati da pronti (prima il bordo
  superiore restava giallo o rosa), «Impostazioni partita ›» neutro nella pagina dei telefoni.

### Protocollo del telefono (una riga in `site/js/tennis/racchetta.js`)

Il computer manda ai due telefoni il messaggio già esistente `ev` con un `k` nuovo:

| Messaggio | Quando | Sul telefono |
|---|---|---|
| `{ t: 'ev', k: 'count', n: 3 \| 2 \| 1 }` | a ogni secondo del conto | avviso «Si gioca tra» con il numero, vibrazione breve |
| `{ t: 'ev', k: 'count', n: 0 }` | a zero, si gioca | «Si gioca!», vibrazione più lunga |
| `{ t: 'ev', k: 'count', stop: 1, txt }` | conto annullato o fermato | «Aspetta» con il motivo (2,4 s), poi la schermata di prima |

È solo un avviso sopra la schermata (`flash`), non cambia gli stati del telefono: si integra con la macchina a stati del
Compito A senza conflitti. Le pagine del telefono di prima ignorano `k: 'count'` (nessun ramo per `k` sconosciuti):
compatibile nei due versi. **Differenza dall'analisi**: niente messaggio `duo` (nome, «chi sei», stato dell'altro) sul
telefono, per toccare il meno possibile la pagina del telefono mentre un altro agente la estende; si può aggiungere dopo.

## Sfida un amico (due computer, percorso sospeso: correzione minima)

- `natpf_versus.js`: `hostInfo` (racchetta dell'host: telefono calibrato, webcam accesa, subito con mouse e tastiera),
  `readyEcho` (conferma: «invio…» → «visto» quando il relay rimanda `p2Ready`, «non arriva» dopo 3 s), `guestBoard` e
  `hostBoard` (schede), `guestLine` con stato `ready` (riga verde, diversa da «collegato»).
- `natpf_versus_ui.js`, Player 2: «Sono pronto» giallo **senza ✓** → al clic **verde pieno «Pronto ✓»**
  (`aria-pressed`); un secondo clic non toglie più il pronto (avviso «per tornare indietro premi «Annulla»»); pulsante
  «Annulla» a parte, con l'avviso «Non sei più pronto»; due schede «Player 1» e «Player 2 · tu» con la conferma
  «Player 1 lo vede ✓»; piede del pannello fisso in basso (a 1280×720 i pulsanti si vedevano a metà).
- Host: due schede nella barra dell'invito («tu» con la racchetta, Player 2 in attesa · si prepara · pronto); «Gioca»
  **grigio neutro** finché non si può (classe `is-wait`, al posto del giallo spento), giallo «Gioca ›» quando si può.
- `game_engine.js`: lo snapshot della lobby porta anche `host` (`hostInfo()`), il P2 lo legge in `versusGuest.host`.
  Un host di una versione di prima non lo manda: la scheda del Player 1 dice «Si prepara · prepara la partita».
- `hud_ui.js`: «Bea pronto ✓» sotto il «VS» al posto dell'emoji.
- Non fatto (analisi §4.2, facoltativo o fuori dalla correzione minima): conto alla rovescia tra due computer; pronto
  che decade da solo se in lobby il telefono del P2 si scollega (in partita c'è già la pausa); pillola «pronti al
  servizio!» quando il P2 è solo collegato.

## Prove

- Unità: `natpf-ready.test.mjs` (6), `natpf-split.test.mjs` (5 nuovi: niente salto, conto → partita, telefono che cade,
  tutorial nella scheda, conto che riparte dopo la partita), `natpf-versus-ready.test.mjs` (6 nuovi: funzioni pure,
  pannello del P2 con clic, secondo clic, «Annulla», conferma e «non arriva», scheda dell'host dallo snapshot, host con
  «Gioca» grigio e snapshot con `host`); aggiornati `natpf-versus`, `natpf-versus-webcam` (secondo clic), `natpf-flows`.
- Browser (Chromium con WebGL software, telefoni simulati con `devicemotion` sintetici):
  - `tools/e2e/natpf-split-ready.mjs`: stesso schermo con due telefoni, tutorial, calibrazioni, conto 3-2-1 sul
    computer e sui telefoni, partita senza toccare il PC, Esc, telefono chiuso durante il conto, pagina «Partita»;
    schermate a 1280×720, 1920×1080 e nell'area di un ledwall 720×720. La calibrazione simulata ripete il gesto perso
    (sotto carico un gesto sintetico poteva non arrivare).
  - `tools/e2e/natpf-1v1-p2p.mjs` (sfida senza server, WebRTC): passo 4 esteso con il colore calcolato del pulsante,
    «Annulla», secondo clic, schede, «Gioca» grigio/giallo; schermate a 1280×720, 1920×1080 e ledwall.

## Non verificato

- Telefoni veri, due computer veri, una rete vera: solo simulazioni sulla stessa macchina.
- Vibrazione del telefono al conto (nel browser di prova non c'è).
- Sfida tra due computer con il relay del server (LAN): provata solo senza server (WebRTC); il relay del server
  rimanda `p2Ready` allo stesso modo (`scripts/match-relay.mjs`), coperto dai test di unità del relay.
