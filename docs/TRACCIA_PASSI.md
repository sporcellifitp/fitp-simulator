# TRACCIA DEI PASSI · da leggere per primo quando si riparte

File breve, aggiornato **a ogni passo** (prima di un'operazione lunga e subito dopo). Dice dove si è arrivati e cosa
fare adesso. Il dettaglio sta in `docs/PIANO_LAVORI.md` (decisioni, regole) e `docs/WORK_PROGRESS.md` (misure).
Repository: `sporcellifitp/fitp-simulator`, branch `natpf-simulator`.

Segni: `[x]` fatto e su GitHub · `[~]` in corso (c'è scritto il punto esatto) · `[ ]` da fare.

## ADESSO (aggiornato l'11/11/2026 alle 18:10 UTC)

**Versione 2026-11-11.1** = tappa 2 gruppo 1 + stesso schermo (B20).
- [x] Tappa 2 passo 1 (servizio, personaggi fermi) con revisore · su GitHub (`0bdb83f`)
- [x] Tappa 2 passo 2 (CPU che sbaglia per la pressione) con revisore; Pro lasciato com'è (decisione dell'utente) · su GitHub
- [x] B20 stesso schermo con revisore e correzioni · unito in locale
- [x] Versione 2026-11-11.1 e documenti · commit locale
- [x] Push `5262fde`; prove sul codice unito: gioco 1132/1132, sito 205/205, LAN 12/12, Windows 28/28, build ok,
      `audit:legend` 69/69
- [x] Installer **2026-11-11.1** pubblicato su R2 e verificato dal link fisso: 124.644.689 B, sha256
      `099bf51c71ec13f7462f2d099cb3d04a1df0d1eee94e8fa80f7f057343e093fb`
- [x] Zip Cloudflare consegnato: 22.633.811 B, sha256
      `78bb85e3206b0f8fd2adcbaa278fe5fbac8b0adac58dea8eeb55f44885c379cf`, provato estratto
- [x] Prove nel browser sul codice unito: 16 su 16 verdi (stesso-schermo-b20 52/52, split-ready 34/34, formato-fiera
      22/22 e p2p 9/9, 1v1-p2p 39/39, tabellone 42/42, nuovo-giocatore 28/28, servizio-lancio 12/12, servizio-peso 8/8,
      menu 28/28, rally 9/9, leggenda 7/7, training-flow 22/22, tutorial-phone 52/52, gesti-speciali 9/9, phone-keep 13/13)
- [x] Detto all'utente come si attivano le opzioni nuove

**In corso: B21 + B22 (video nel gioco, scia luminosa)** — stato alle 18:10 UTC dell'11/11:
- [x] Implementazione finita nella worktree `/home/user/foro-italico-world/.claude/worktrees/wf_190d3d32-58d-1` (ramo `worktree-wf_190d3d32-58d-1` o quello indicato da
      `git worktree list`), commit `31fcfac` (scia + opzione), `b721432` (trailer con ripiego), `05eeeb3` (sfondo del
      tutorial), `69ae8b0`, `da4e827` (documento `docs/b21/video-e-scia.md`)
- [~] **Revisore indipendente in corso** (workflow `b21-b22-video-scia`, run `wf_190d3d32-58d`; il risultato, se finito, è
      l'ultima riga `result` di `/root/.claude/projects/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/subagents/workflows/wf_190d3d32-58d/journal.jsonl`).
      **Se il lavoro si è fermato per il limite d'uso**: rilanciare il workflow con
      `Workflow({scriptPath: '/root/.claude/projects/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/workflows/scripts/b21-b22-video-scia-wf_190d3d32-58d.js', resumeFromRunId: 'wf_190d3d32-58d'})`
      (riusa l'implementazione e, se c'è, la revisione). Se la sessione è nuova e quei file non ci sono più: fare la revisione
      a mano sul diff `4dc6ae7..da4e827` del ramo (controlli elencati sotto) e correggere.
      Controlli del revisore: ripiego dell'intro in tutti i casi (trailer 404, rete lenta, autoplay bloccato, ?intro=0);
      zip Cloudflare sotto 25.000.000 byte e senza il trailer; trailer dentro l'installer; passo nuovo del workflow GitHub
      (carica il trailer su R2 in `media/`, non blocca l'installer, niente segreti); sfondo del tutorial che non copre gesti
      e testi e si ferma a tutorial chiuso; scia: con «No» gioco e disegno identici a prima, nessun calo di fotogrammi.
- [ ] Correzioni dei punti trovati (stessa worktree)
- [ ] Unire il ramo su `natpf-simulator` (`git merge --no-ff`), versione nuova (2026-11-11.2 o del giorno: `version.js`,
      `build.json`, prima riga di `lan/LEGGIMI.txt`, riga in `natpf-desktop/novita.txt`), prove complete (script
      `scratchpad/v1111/prove.sh` come modello: gioco, build, sito, LAN, Windows, `audit:legend`, prove nel browser comprese
      le nuove `natpf-intro-trailer` e `natpf-scia-palla`), push
- [ ] Installer su R2 verificato dal link fisso; controllare anche che il trailer sia su R2
      (`https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev/media/…`, nome nel documento del ramo); zip Cloudflare
      (`npm run build` prima) provato estratto e mandato all'utente
- [ ] Dire all'utente come si spegne la scia (Opzioni → «Scia della palla: Sì · No») e come è venuto il resto

File dei video: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/video/` (se lo scratchpad è
sparito: sono già committati nel ramo di lavoro, e nella libreria Higgsfield dell'utente).

## IN CODA (nell'ordine; dettaglio in PIANO_LAVORI §1, voci B21–B24)

- [ ] **B21 Video nel gioco**: trailer come video d'avvio (senza titolo) con ripiego su `public/media/intro.mp4`; due clip
      sfocate come sfondo del tutorial; trailer su R2 (`media/`), clip dentro lo zip. File in `scratchpad/video/` e nella
      libreria Higgsfield dell'utente (crediti spesi 86 su 120).
- [ ] **B22 Scia luminosa della palla** nel gameplay (un po' meno luminosa del trailer) + voce nelle Opzioni per spegnerla
- [ ] **B25 Stesso schermo, decisioni dell'11/11** (PIANO, voce B25): lancio automatico dopo 30 s (opzione dello stand,
      spenta); campo aperto tra due persone (opzione dello stand, spenta: preparare e misurare); colpo super con la forza
      relativa al proprio colpo (solo il super); preparazione del colpo che non conta nel 1v1
      **+ aiuto al più giovane** (richiesta dell'11/11 sera): nello stesso schermo ogni giocatore sceglie Bambino · Ragazzo ·
      Adulto e il più giovane è facilitato; preparare 2–3 varianti, misurarle e far scegliere all'utente con i numeri
- [ ] **B23 Prova delle movenze dal video sul solo dritto** (se all'utente non piace si toglie)
- [ ] **B24 Lob & Drop** come personaggi (foto `docs/riferimenti/lob-drop-2026-11-11.webp`)
- [ ] **Tappa 2 gruppo 2**: Leggenda stessa regola (D2), palla corta che può sbagliare (D8)
- [ ] **Tappa 2 gruppo 3**: livelli Evento e Bambini (D3) con la scelta **«Chi gioca: Bambino · Ragazzo · Adulto»** al posto
      del livello (Pro e Leggenda in «Altre impostazioni»); segnale del momento giusto; super spiegato
- [ ] Dall'utente: prova di due minuti con un telefono vero agitato senza guardare (poi si decide la regola)

## COME SI LAVORA (regole dell'utente)

- Risposte **sintetiche**. Aggiornamento **ogni ora** mentre c'è lavoro in corso.
- Non superficiale: un agente per blocco, **revisore indipendente** prima dell'unione, poi prove complete.
- Pacchetti (installer su R2 + zip Cloudflare) dopo ogni versione, con «come si attiva» per ogni opzione nuova.
- Se un agente si ferma per il limite d'uso: le modifiche restano nella sua worktree (`git worktree list`); riprenderlo
  con un messaggio, non rifare da capo.
