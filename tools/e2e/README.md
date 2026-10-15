# Prove nel browser: NATPF Simulator

Prove automatiche con Playwright e Chromium per NATPF Simulator: pairing QR, telefono simulato (eventi `devicemotion` sintetici), calibrazione, guasti e partita tra amici. Le prove simulate non sostituiscono la verifica su iPhone Safari e Android Chrome reali. Consultare `docs/NATPF_SIMULATOR_AUDIT.md`.

```bash
cd tools/e2e && npm install                    # playwright-core, peer, express, jsqr
python -m http.server 8765 -d ../../site &     # il sito
node peer-server.mjs &                         # server di segnalazione locale su 127.0.0.1:9000
CHROMIUM_PATH=/percorso/di/chrome node phone-cal.mjs   # contro la CPU con telefono e tastiera: partita intera, rivincita, pausa
node phone-cal.mjs          # QR, calibrazione guidata in 5 passi, partita con il telefono, ricalibrazione, telefono chiuso
node phone-failures.mjs     # niente sensori, permesso negato o concesso, swing troppo piccoli, «Scollega», server irraggiungibile
node invite.mjs             # invito con link: link aperto da smartphone, amico con il suo telefono, terzo escluso, rientro, fine partita
```

`CHROMIUM_PATH` serve solo se Playwright non trova Chromium da solo. Le schermate finiscono in `$OUT` (di norma nella cartella temporanea del sistema). Senza scheda grafica le prove sono lente: `?q=low` alleggerisce l'arena.
