# Prove nel browser: NATPF Simulator

Avviare il sito statico in un terminale dalla root del repository:

```bash
python -m http.server 8765 -d site
```

Installare le dipendenze di test una volta:

```bash
cd tools/e2e
npm install
```

Eseguire dalla cartella `tools/e2e`:

- `node run-local.mjs phone-only.mjs timing-browser.mjs gesture-calibration.mjs` — avvia sito e signaling locali, verifica il timing CPU/P1/P2 nel browser, incluse pausa e ripresa. Input sensori normalizzati; non sostituisce la prova fisica.
- `node phone-only.mjs` — rebranding, pairing, rifiuto input mouse/tastiera e accettazione dello swing telefono.
- `node phone-cal.mjs` — pairing QR, calibrazione e partita con telefono simulato.
- `node phone-failures.mjs` — permessi/sensori, swing insufficienti, disconnessione e signaling.
- `node invite.mjs` — partita tra amici.

Le prove con `devicemotion` sintetico non sostituiscono le prove su iPhone Safari e Android Chrome reali. Prima di ogni release eseguire anche `node --test ../../tools/test/*.test.mjs` dalla root del repository e verificare [l'audit completo](../../docs/NATPF_SIMULATOR_AUDIT.md).


`gesture-calibration.mjs` verifica la nuova calibrazione compatta e la prova del colpo, il controllo touch, portrait e il vincolo della racchetta con eventi sintetici.


Arcade/LAN: `node run-local.mjs arcade-visuals.mjs` controlla camera, smash, scie e articolazione; `node lan-browser.mjs` avvia il proprio server LAN e verifica WebRTC diretto, dopo `npm ci --prefix ../lan`. I test si trovano nella matrice GitHub Actions insieme a timing e calibrazione.

NATPF motore base (`natpf-tennis/`):
- `node natpf-phone-upright.mjs` avvia da solo vite (porta 3108) e PeerJS (9108) e prova il telefono simulato con la presa del gioco (verticale): link del QR, calibrazione rapida, dritti con il polso che ruota (mai pallonetti), pallonetto con la mano che sale, piatto girato a destra/sinistra → palla a destra/sinistra. Prende il posto di `natpf-flat-grip.mjs` (presa orizzontale, non più offerta). Su Windows usa Chrome installato (`CHROMIUM_PATH`).
- `node natpf-1v1-p2p.mjs` (dopo la build di `natpf-tennis`): sfida un amico sul sito statico con due sessioni del browser e WebRTC. Prova:
  - l'invito già in vista nella pagina della racchetta;
  - il P2 che entra scrivendo il codice;
  - la riga di stato (in attesa → entrato → pronto) e «Sono pronto»;
  - la partita con il servizio di tutti e due, l'uscita e il rientro del P2 con il link;
  - la stanza chiusa, il link inesistente, l'avviso sul telefono;
  - la rete che blocca il collegamento diretto: candidati ICE riscritti su un indirizzo irraggiungibile, poi rete libera.

  `DIST=cartella` per provarla su uno zip estratto.
- `node natpf-gameplay-23-10.mjs` (3183, 9183): i difetti di gioco della sera del 23/10 nel gioco vero con il telefono simulato: risposta al servizio da fondo campo, messaggio di fine punto (chi vince, chi ha sbagliato), moviola dell'ultimo punto, palla corta ripresa a rete a Leggenda, «In rete» negli scambi lunghi.
- `node natpf-gesti-speciali.mjs` (3184, 9184): pallonetto e palla corta con il telefono mosso da un braccio fisico (presa di taglio, telefono dritto, gesti di polso): calibrazione, esercizi del lanciapalle che imparano il proprio gesto, partita con pallonetti, palle corte e dritti letti giusti.
- `node natpf-training-flow.mjs` (vite 3109, PeerJS 9109): «Allenamento» dal menu con il telefono simulato: gesto nel verso sbagliato, quattro gesti della calibrazione con la palla ferma dal lato del gesto chiesto, giocatore fermo, stesso gesto sui due schermi (con il ritardo del computer a ogni cambio), primo esercizio. `SHOTS=1` salva le schermate del computer.
- `node natpf-training-reconnect.mjs` (3111, 9111): pagina del telefono ricaricata a metà calibrazione → «Telefono scollegato» sul computer, sensori riattivati → calibrazione che riparte e finisce.
- `node natpf-phone-blackout.mjs` (3117, 9117): collegamento che cade e torna (messaggi fermati nelle pagine, canale aperto): il telefono se ne accorge da solo e si ricollega, la calibrazione si riallinea alla ripresa, durante gli esercizi pausa con il pannello del telefono e ripresa automatica.
- `node natpf-rally.mjs` (3151, 9151; `DIFF=pro`, `SHOTS=1` per i fotogrammi all'impatto e durante il recupero): scambio vero contro la CPU con il telefono simulato, il robot colpisce quando la palla arriva: almeno 6 colpi di fila, lato del colpo uguale al gesto, ritorno in fondo dopo ogni colpo (a rete solo dopo una palla corta presa vicino alla rete), cadute in punti diversi con mira e punto neutro del modello.
- `node natpf-latency.mjs` (3110, 9110): tempi dal picco del gesto alla risposta a schermo (rilevatore, rete, motore), un solo swing per gesto anche in anticipo, swing all'istante del colpo, etichetta del gesto.
- `node natpf-menu.mjs` (3116): menu principale a 1366 × 657, 1024 × 600 e 1280 × 720: voci visibili senza scorrere, frecce, descrizione, nessuna partita dimostrativa e nessun ridisegno con il menu fermo.
- `node natpf-diag-session.mjs` (3118, 9118; `SECONDS=150`, `VIDEOS=webcam,gioco|webcam|gioco|nessuno`, `PARTS=A` per la sola sessione lunga): modalità diagnostica con telefono simulato e webcam finta del browser. Prova tre cose:
  - una sessione lunga: niente stop a 30/60 s, campioni continui, prestazioni al secondo, video della webcam e del gioco, costo del registratore sotto il 2%, pacchetto zip valido;
  - una sessione interrotta da una ricarica, poi recuperata;
  - la prova guidata con il riferimento nelle metriche.
- `node natpf-swing-loss.mjs` (3140, 3141; `MODE=lan|internet`, `N=150`, `LOSS=0,0.03,0.08`, `ROOT` per misurare un altro checkout): consegna dei colpi con perdita di pacchetti simulata (prima/dopo le copie sul percorso veloce). Criteri: nessun colpo perso, p99 ≤ 50 ms con il 3% e ≤ 80 ms con l'8%. Serve iptables (root), quindi è uno script di misura e non sta nella matrice; per la LAN prima `npm run build`.
