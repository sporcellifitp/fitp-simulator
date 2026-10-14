# Prove nel browser: Tennis 1 contro 1

Prove automatiche con Playwright e Chromium: il computer e un telefono simulato, che manda eventi `devicemotion` sintetici. Non sostituiscono la prova su un telefono vero (vedi `docs/v0.7-tennis-racchetta.md`).

```bash
cd tools/e2e && npm install                    # playwright-core, peer, express, jsqr
python -m http.server 8765 -d ../../site &     # il sito
node peer-server.mjs &                         # server di segnalazione locale su 127.0.0.1:9000
CHROMIUM_PATH=/percorso/di/chrome node desktop.mjs   # mouse e tastiera: partita completa, rivincita, pausa
node phone.mjs              # QR, collegamento, calibrazione, colpi e servizio col telefono, ripresa, telefono chiuso
node phone-failures.mjs     # senza sensori, permesso negato o concesso, «Scollega», server irraggiungibile
node phone-timing.mjs       # scarto di tempo dei colpi del telefono (picco del movimento → giudizio del gioco)
```

`CHROMIUM_PATH` serve solo se Playwright non trova Chromium da solo. Le schermate finiscono in `$OUT` (di norma nella cartella temporanea del sistema). Con la grafica software una partita a 1 game dura qualche minuto.
