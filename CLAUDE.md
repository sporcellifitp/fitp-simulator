# CLAUDE.md · istruzioni permanenti per ogni agente

Repository: `sergio4/foro-italico-world`. Prodotto su cui si lavora: **NATPF Simulator** (tennis 3D, `natpf-tennis/`),
con il telefono come racchetta (pagina in `site/tennis/racchetta.html` + `site/js/tennis/`), webcam e modalità LAN.

## Branch

- Si lavora **solo** su `natpf-simulator`. Mai modificare o fare push su `main` o altri branch.
- Mai `reset --hard`, `push --force` o riscritture di storia sul branch remoto.

## Prima di iniziare (obbligatorio)

1. Leggere in quest'ordine: `docs/SESSION_HANDOFF.md` → `docs/WORK_PROGRESS.md` → `docs/PROJECT_MEMORY.md`.
2. Verificare lo stato reale: `git status`, `git log --oneline -10`, `git fetch origin natpf-simulator` e confronto.
   Se il repository e i documenti divergono, vale il repository: correggere i documenti.
3. Riprendere dalla «Prossima azione esatta» di `docs/SESSION_HANDOFF.md`.

Lo storico precedente al 28/10/2026 (racchetta virtuale, mira, webcam, LAN) è in `MEMORY.md`, `SESSION_HANDOFF.md`,
`WORKLOG.md` alla radice e in `docs/NATPF_*.md`: sono archivio, si consultano ma non si aggiornano più.

## Durante il lavoro (obbligatorio)

- Task piccoli, verificabili e recuperabili. Un commit descrittivo per ogni task completato e verificato.
- Dopo ogni modifica significativa aggiornare **subito** `docs/WORK_PROGRESS.md` (file toccati, intervento, stato, test).
- A fine di ogni task rilevante aggiornare `docs/SESSION_HANDOFF.md` con ultimo commit, problemi aperti e prossima
  azione esatta. Decisioni tecniche durature in `docs/PROJECT_MEMORY.md`.
- Prima di operazioni rischiose o ampie: commit di checkpoint (anche WIP, purché i test passino o sia dichiarato).
- Push su `origin natpf-simulator` **solo con autorizzazione esplicita dell'utente** (richiesta del 28/10/2026).
  Senza autorizzazione: commit locali, e lo stato scritto nei documenti del repository.
- Non fingere: se qualcosa non è stato provato (telefono reale, browser, audio generato), scriverlo.

## Comandi

```sh
cd natpf-tennis
npm ci              # dipendenze
npm test            # suite node:test (≈390 test, ~15 s)
npm run build       # build di produzione in natpf-tennis/dist
npm run dev         # server di sviluppo su :3000
node scripts/ui-shots.mjs   # screenshot del percorso UI con Chromium (vedi docs/PROJECT_MEMORY.md)
```

Il controllo dei tipi (`npm run lint`) non è affidabile come gate (codice JS con JSDoc parziale): usare test e build.

## Regole di prodotto

- Preservare gameplay, tracking smartphone (gesti in `site/js/tennis/` e `natpf-tennis/src/natpf/natpf_gestures.js`,
  `natpf_phone_racket.js`), webcam e LAN. Ogni cambiamento al riconoscimento dei gesti richiede test.
- Le dimostrazioni dei colpi nel tutorial devono corrispondere agli algoritmi reali di riconoscimento
  (vedi `docs/PROJECT_MEMORY.md` §Gesti).
- Niente dipendenze o asset pesanti; buone prestazioni su desktop e Android.
- Audio solo originale o con licenza verificata. Il nome del gioco di riferimento commerciale non va nei file.
- Testi dell'interfaccia in italiano; **voce del gioco solo in inglese**, una voce cartoon (vedi `docs/PROJECT_MEMORY.md`).
- Niente clip video generate per mostrare i gesti (rifiutate dall'utente il 28/10): animazione 3D verificata e foto.
- CSS: misure legate allo schermo con `cqw/cqh` e `@container natpf` (non `vw/vh`/`@media`), JS con `viewport()` di
  `natpf_screen.js`: il gioco può girare in un'area di ledwall (vedi `docs/PROJECT_MEMORY.md`).
