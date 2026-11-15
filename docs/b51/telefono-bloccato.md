# B51 · Telefono bloccato in partita

Richiesta urgente dell'utente del 15/11/2026 (12:30 UTC): «molte persone che giocano cliccano sul display, chiudono il
browser o comunque interagiscono col touchscreen… escono da Chrome e perdono la connessione al telefono. Ci sarebbe una
modalità dove se anche l'utente clicca sul display non appare nulla, come se fosse bloccata fino alla fine del match?»
Decisioni dell'utente: prima il blocco nella pagina (APK solo dopo, se servirà); allo stand solo Android con Chrome;
sblocco con un gesto dello staff sul telefono oppure dal PC, da solo a fine partita. Compito completo:
`docs/consegna/2026-11-15/PASSAGGIO_2026-11-15.md` §4.1.

Codice entrato con la versione **2026-11-14.6** (`d77f21c`), senza documento del blocco: questo file è stato scritto
nella ripresa del 15/11 (dopo la 14.8) leggendo il codice e rifacendo le prove.

## 1. Cosa fa

- **Quando**: durante gli scambi di prova, il conto alla rovescia e la partita (anche in pausa e con il collegamento
  debole), se la voce del pannello è accesa. Il PC lo chiede al telefono (`phoneTouchRequested`,
  `natpf_phone_racket.js:1222`, messaggio `tl`); il telefono conferma (`lk` nello stato), così il PC sa se è bloccato.
- **Sul telefono** (`site/js/tennis/phone-touch-lock.js`, `racchetta.js`): schermo scuro con «Telefono 1» o «Telefono 2»
  nel colore del giocatore e «Gioca!» (o «In pausa», «Ricollegamento…»), **nessun pulsante**. Tutti i tocchi fuori dallo
  strato sono fermati in cattura (`pointerdown`, `click`, menu del tocco lungo, selezione, trascinamento); il resto della
  pagina è `inert`; niente zoom né «tira giù per ricaricare» (`touch-action: none`, `overscroll-behavior: none`).
  **Indietro** è intrappolato con una voce di cronologia; la chiusura della pagina chiede conferma dove il browser lo
  permette. Schermo sempre acceso. I sensori continuano a inviare: il telefono resta la racchetta. Se serve il «tocca per
  colpire», il pulsante resta dentro lo strato.
- **Schermo intero e verticale** chiesti all'ultimo tocco vero prima della partita («Sono pronto»), perché il browser li
  concede solo con un gesto. Corretto qui il difetto `let screen` del piano B50 §1a (`racchetta.js`): la variabile della
  schermata ora si chiama `viewScreen` e il blocco dell'orientamento usa `window.screen` (prima non partiva mai).
- **Sblocco da solo** quando il gioco offre un tocco (fine partita, «Sono pronto», «Rivincita», calibrazione chiesta dal
  PC).
- **Sblocco dello staff**: sul telefono **due dita ferme per 3 secondi**, poi sollevarle e toccare «Sblocca» che compare
  in basso a destra per 6 secondi (difficile da fare per caso impugnando il telefono come una racchetta); dal PC
  «Sblocca Telefono 1/2» nel pannello dello stand, e «Sblocca il telefono» nella scheda del telefono in «Telefoni dello
  stand» (modalità fiera). Lo sblocco manuale vale per l'attività in corso: la successiva riblocca.

**Come si attiva con il mouse:** è già acceso. Tasto destro → pannello dello stand → «Blocco del telefono in partita:
Sì / No» (di base Sì, salvato). Guida dello stand §8.6, con i passi di «Fissa app» di Android.

## 2. Prove (ripresa del 15/11, codice della 14.8)

- `tools/test/phone-touch-lock.test.mjs`: 3 test (il blocco segue il gioco anche se la rete cade; Indietro riarma il
  blocco; lo sblocco locale vuole due dita ferme e un secondo tocco). Nella suite del sito: 275/275.
- `natpf-tennis/test/natpf-b51-blocco-telefono.test.mjs` nella suite del gioco: 1734/1734.
- Nel browser `tools/e2e/natpf-telefono-bloccato.mjs` (pagina vera del telefono, tocco e sensori emulati, Peer finto):
  **12/12** (orientamento verticale chiesto al tocco vero, dimensioni dello schermo nella diagnostica, blocco nel conto e
  in pausa, Salta e Scollega protetti, Indietro riassorbito, sensori che continuano, due dita e conferma, riblocco
  all'attività nuova, sblocco dal PC, comandi a fine partita, nessun errore). Si lancia con il sito servito sotto
  `/natpf/` (come nello zip Cloudflare):

```sh
mkdir -p /tmp/radice && ln -sfn "$PWD/site" /tmp/radice/natpf
CHROMIUM_PATH=/opt/pw-browsers/chromium NATPF_SITE_ROOT=/tmp/radice node tools/e2e/run-local.mjs natpf-telefono-bloccato.mjs
```

## 3. Cosa non è fatto

- Manifest della pagina della racchetta per aprirla dalla schermata Home senza barre (facoltativo nel compito): non fatto.

## 4. Cosa non è provato

- **Telefoni Android veri con Chrome**: il comportamento di Indietro, del gesto di sistema «Home», della chiusura della
  scheda e della conferma prima di lasciare la pagina dipende dal telefono. Il blocco nella pagina **non può** impedire di
  uscire da Chrome con i comandi di Android: per quello serve «Fissa app» (guida §8.6), non provato su un telefono vero.
- Il gesto delle due dita impugnando davvero il telefono come una racchetta (persone vere).
- Se dopo il B51 la gente esce ancora da Chrome, l'alternativa è un'app Android sottile (passaggio §4.7): decisione
  dell'utente.
