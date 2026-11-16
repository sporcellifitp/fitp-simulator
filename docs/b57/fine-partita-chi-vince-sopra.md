# B57 · Fine partita nello stesso schermo: sopra e in evidenza solo chi vince (FIERA)

Richiesta dell'utente del 16/11/2026 (foto del ledwall allo stand): «a fine schermata vorrei mettere in evidenza e sopra solo
chi ha vinto. Sotto chi ha perso non in evidenza ma comunque visibile». Prima le due card erano nell'ordine dei giocatori
(Player 1 sopra) e con la stessa cornice accesa.

- `natpf_end_card.js` (`splitOrder`, `cardsHtml`): nello stesso schermo la card di chi vince va per prima (sopra con lo
  schermo stretto o quadrato, a sinistra con quello largo); senza vincitore l'ordine dei giocatori.
- `natpf-hud.css`: chi vince con la cornice accesa, la corona e più spazio (`flex-grow 1.3`); chi perde con la cornice spenta,
  senza ombra, attenuato (opacità 0,82, colori meno saturi) e il nome più piccolo, ma leggibile.
- Prove: `natpf-b40-card.test.mjs` (+1); `tools/e2e/natpf-fine-partita.mjs` 56/56 (Marco, che vince, per primo; schermata
  dentro lo schermo a 1280×720, 1920×1080, 1920×540, 1024×600, 720×720, 1366×768, 1024×1024).

![Chi vince sopra](fine-stesso-schermo.webp)

Non provato sul ledwall vero.
