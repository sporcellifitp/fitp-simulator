# CLAUDE.md · istruzioni permanenti per ogni agente

Repository: `sergio4/foro-italico-world`. Prodotto su cui si lavora: **NATPF Simulator** (tennis 3D, `natpf-tennis/`),
con il telefono come racchetta (pagina in `site/tennis/racchetta.html` + `site/js/tennis/`), webcam e modalità LAN.

## Branch

- Si lavora **solo** su `natpf-simulator`. Mai modificare o fare push su `main` o altri branch.
- Mai `reset --hard`, `push --force` o riscritture di storia sul branch remoto.

## Prima di iniziare (obbligatorio)

1. Leggere **`docs/PIANO_LAVORI.md`** (file di ripresa unico per tutti gli agenti): checkpoint con l'ultimo stato
   verificato e la **«Prossima azione esatta»**, regole di lavoro e decisioni dell'utente, e per ogni punto aperto
   stato, cosa fare, come e perché. Poi, se serve il dettaglio, `docs/WORK_PROGRESS.md` (registro dei passi) e
   `docs/PROJECT_MEMORY.md` (decisioni tecniche durature).
2. Verificare lo stato reale: `git fetch origin natpf-simulator`, `git status -sb`, `git log --oneline -10`.
   Se il repository e i documenti divergono, vale il repository: correggere i documenti.
3. Riprendere dalla «Prossima azione esatta» di `docs/PIANO_LAVORI.md`.

Archivio (si consulta, non si aggiorna): `docs/archivio/` (diari fino al 04/11/2026), e per lo storico prima del
28/10/2026 `MEMORY.md`, `SESSION_HANDOFF.md`, `WORKLOG.md` alla radice e `docs/NATPF_*.md`.
`docs/SESSION_HANDOFF.md` è solo un rimando a `docs/PIANO_LAVORI.md`.

## Durante il lavoro (obbligatorio)

- Lavoro a **blocchi autonomi** (registro in `docs/PIANO_LAVORI.md` §4) fatti di passi piccoli, verificabili e
  recuperabili. Ogni passo lascia il repository funzionante: test verdi, commit descrittivo, push, documenti.
- Dopo ogni passo: **riscrivere il Checkpoint** di `docs/PIANO_LAVORI.md` (ultimo commit, test, prossima azione esatta)
  e aggiungere la voce in `docs/WORK_PROGRESS.md` (file toccati, intervento, verifiche con i numeri, non verificato).
  Decisioni tecniche durature in `docs/PROJECT_MEMORY.md`. Il lavoro può interrompersi in qualunque momento (limite
  d'uso): **prima** di un'operazione lunga il Checkpoint dice già cosa si sta facendo e come riprendere.
- **Push** (autorizzato dall'utente il 04/11/2026, sostituisce la regola del 28/10): dopo ogni commit verificato,
  subito, su `origin natpf-simulator`. Verificato = test del gioco e del sito verdi, più build se il passo tocca build,
  asset, vite o `site/`. Prima `git fetch`; solo avanzamento lineare (se il remoto è avanti: integrare e rifare i
  test); mai `--force`; niente push con test rossi, salvo un WIP dichiarato autorizzato dall'utente caso per caso.
- **Pacchetti ZIP** (LAN Windows e Cloudflare), regola dell'utente del 04/11: **sempre dopo ogni commit**, consegnati
  all'utente senza aspettare che li chieda. Se il commit cambia il contenuto dei pacchetti si rifanno con una versione
  nuova (`site/js/tennis/version.js` e `site/tennis/build.json`) e si provano estratti; se non lo cambia (solo
  documenti o prove) si riconsegnano gli ultimi ZIP (stessa versione e sha256) dicendolo. Procedura in
  `docs/PIANO_LAVORI.md` §6.
- **Un agente alla volta** sul branch (Codex lavora al progetto, ma non in parallelo): fetch all'inizio, Checkpoint
  aggiornato alla fine.
- Non fingere: se qualcosa non è stato provato (telefono reale, browser, Windows, ledwall, audio generato), scriverlo.

## Comandi

```sh
cd natpf-tennis
npm ci              # dipendenze
npm test            # suite node:test del gioco (673 test al 04/11, ~25 s)
npm run build       # build di produzione in natpf-tennis/dist
npm run dev         # server di sviluppo su :3000
node scripts/ui-shots.mjs   # screenshot del percorso UI con Chromium (vedi docs/PROJECT_MEMORY.md)
cd ..
node --test tools/test/*.test.mjs                     # test del sito e della pagina del telefono (182)
(cd tools/lan && npm ci && node --test test/*.test.mjs) # server LAN (5)
CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/natpf-training-flow.mjs   # prove nel browser natpf-*
node tools/e2e/run-local.mjs <script>.mjs             # prove nel browser del sito (prima: npm ci --prefix tools/e2e)
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
