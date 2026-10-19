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
- `node natpf-1v1-p2p.mjs` (dopo la build di `natpf-tennis`): sfida un amico sul sito statico con due sessioni del browser e WebRTC: stanza dal menu, link, «Sono pronto», partita con il servizio di tutti e due, uscita e rientro del P2, stanza chiusa, link inesistente. `DIST=cartella` per provarla su uno zip estratto.
