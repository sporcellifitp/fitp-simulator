# TRACCIA DEI PASSI · da leggere per primo quando si riparte

File breve, aggiornato **a ogni passo** (prima di un'operazione lunga e subito dopo). Dice dove si è arrivati e cosa
fare adesso. Il dettaglio sta in `docs/PIANO_LAVORI.md` (decisioni, regole) e `docs/WORK_PROGRESS.md` (misure).
Repository: `sporcellifitp/fitp-simulator`, branch `natpf-simulator`.

Segni: `[x]` fatto e su GitHub · `[~]` in corso (c'è scritto il punto esatto) · `[ ]` da fare.

## ADESSO (aggiornato l'11/11/2026 alle 16:20 UTC)

**Versione 2026-11-11.1** = tappa 2 gruppo 1 + stesso schermo (B20).
- [x] Tappa 2 passo 1 (servizio, personaggi fermi) con revisore · su GitHub (`0bdb83f`)
- [x] Tappa 2 passo 2 (CPU che sbaglia per la pressione) con revisore; Pro lasciato com'è (decisione dell'utente) · su GitHub
- [x] B20 stesso schermo con revisore e correzioni · unito in locale
- [x] Versione 2026-11-11.1 e documenti · commit locale
- [~] **Prove complete sul codice unito**: script `scratchpad/v1111/prove.sh`, risultati in `scratchpad/v1111/prove.txt`
      (gioco, build, sito, LAN, Windows, `audit:legend`, 16 prove nel browser). Se il file non finisce con `== FINE`,
      rilanciare lo script (o a mano i comandi di CLAUDE.md).
- [ ] Se tutto verde: `git push origin natpf-simulator` → GitHub costruisce l'installer e lo pubblica su R2
- [ ] Aspettare `https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev/windows/latest.json` con `"build": "2026-11-11.1"`,
      scaricare il link fisso `…/windows/NATPF-Simulator-Setup.exe` e controllare lo sha256
- [ ] Zip Cloudflare: `cd natpf-tennis && npm run build`, poi `node natpf-tennis/scripts/pacchetto-cloudflare.mjs
      --out=… --zip=…/natpf-simulator-cloudflare-2026-11-11.1.zip --turn-url=https://natpf-turn.s-porcelli.workers.dev/`,
      provarlo estratto, mandarlo all'utente
- [ ] Scrivere sha e misure in `docs/WORK_PROGRESS.md`, aggiornare questo file, push
- [ ] Dire all'utente **come si attivano**: Batte per primo (Stesso schermo → Partita → Altre impostazioni), Formato in
      fiera a tre valori e Scambio che si scalda (pannello dello stand, Ctrl+Maiusc+K)

## IN CODA (nell'ordine; dettaglio in PIANO_LAVORI §1, voci B21–B24)

- [ ] **B21 Video nel gioco**: trailer come video d'avvio (senza titolo) con ripiego su `public/media/intro.mp4`; due clip
      sfocate come sfondo del tutorial; trailer su R2 (`media/`), clip dentro lo zip. File in `scratchpad/video/` e nella
      libreria Higgsfield dell'utente (crediti spesi 86 su 120).
- [ ] **B22 Scia luminosa della palla** nel gameplay (un po' meno luminosa del trailer) + voce nelle Opzioni per spegnerla
- [ ] **B23 Prova delle movenze dal video sul solo dritto** (se all'utente non piace si toglie)
- [ ] **B24 Lob & Drop** come personaggi (foto `docs/riferimenti/lob-drop-2026-11-11.webp`)
- [ ] **Tappa 2 gruppo 2**: Leggenda stessa regola (D2), palla corta che può sbagliare (D8)
- [ ] **Tappa 2 gruppo 3**: livelli Evento e Bambini (D3, dire come si attivano), segnale del momento giusto, super spiegato
- [ ] Da chiedere all'utente: conferma della compensazione del servizio a Casual (`docs/b18/t2-1-servizio.md`); domande
      4 e 9–16 dell'audit B19 ancora senza risposta

## COME SI LAVORA (regole dell'utente)

- Risposte **sintetiche**. Aggiornamento **ogni ora** mentre c'è lavoro in corso.
- Non superficiale: un agente per blocco, **revisore indipendente** prima dell'unione, poi prove complete.
- Pacchetti (installer su R2 + zip Cloudflare) dopo ogni versione, con «come si attiva» per ogni opzione nuova.
- Se un agente si ferma per il limite d'uso: le modifiche restano nella sua worktree (`git worktree list`); riprenderlo
  con un messaggio, non rifare da capo.
