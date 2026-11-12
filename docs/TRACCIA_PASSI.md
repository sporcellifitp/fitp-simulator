# TRACCIA DEI PASSI · da leggere per primo quando si riparte

File breve, aggiornato **a ogni passo** (prima di un'operazione lunga e subito dopo). Dice dove si è arrivati e cosa
fare adesso. Il dettaglio sta in `docs/PIANO_LAVORI.md` (decisioni, regole) e `docs/WORK_PROGRESS.md` (misure).
Repository: `sporcellifitp/fitp-simulator`, branch `natpf-simulator`.

Segni: `[x]` fatto e su GitHub · `[~]` in corso (c'è scritto il punto esatto) · `[ ]` da fare.

## ADESSO (aggiornato il 12/11/2026 alle 07:00 UTC)

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

**Versione 2026-11-11.2** = B21 (trailer all'avvio con ripiego, sfondo sfocato del tutorial) + B22 (scia della palla con
opzione), con revisore indipendente e correzioni (ramo `worktree-wf_190d3d32-58d-1`, fino a `9baff80`).
- [x] Unione su `natpf-simulator`, versione 2026-11-11.2, controllo rapido: gioco 1158/1158, sito 205/205, Windows 29/29,
      build ok → push
- [x] Zip Cloudflare 2026-11-11.2 consegnato: 23.292.883 B, sha256
      `5b008704198515b051e7c91d89af3b319c8c622e771911ffff34f39527c164c5`, provato estratto
- [x] Prove complete sul codice unito, tutte verdi: LAN 12/12, `audit:legend` 69/69, 20 prove nel browser (intro-trailer
      71/71, scia-palla 39/39, modale-gesti 29/29, schermo 41/41, stesso-schermo-b20 52/52, split-ready 34/34,
      formato-fiera 22/22 e p2p 9/9, 1v1-p2p 39/39, tabellone 42/42, nuovo-giocatore 28/28, servizio-lancio 12/12,
      servizio-peso 8/8, menu 28/28, rally 9/9, leggenda 7/7, training-flow 22/22, tutorial-phone 52/52, gesti-speciali
      9/9, phone-keep 13/13)
- [x] **Installer 2026-11-11.2 pubblicato su R2** e verificato dal link fisso: 127.584.496 B, sha256
      `ac7525fc1a581b2bd2ad09c9dbd8c67ebb37fa49ec854cf4c7d9104d4cfeaa02`; trailer su R2 (200, 2.258.622 B). Le Actions erano
      ferme per il budget a 0 $ con i minuti gratuiti finiti: l'utente ha reso **pubblico** il repository (Actions gratuite);
      la corsa incastrata non ripartiva, rilanciata a mano con workflow_dispatch (corsa 43114132100). La scritta «Usage
      blocked» sul budget resta ma non blocca i repository pubblici.
- [x] Detto all'utente come si spegne la scia (Opzioni → «Scia della palla») e `?trailer=0`

**Versione 2026-11-12.1** = B26, correzione dopo il collaudo dell'utente sulla 2026-11-11.2 (programma Windows: «è partito
il video di prima», scia «gialla ma poco diversa»). Ramo `b26-trailer-scia` (`2bd9017`), unito in `a3fc6e8`.
- [x] Trailer nel programma Windows: parte appena il primo fotogramma è pronto, 8 s di attesa (prima 1,5 s e «6 s su 10
      scaricati»), ripiego solo per errore vero del file, cronaca in `programma.log` (righe `[natpf-intro]`). **Causa non
      vista su un PC Windows vero**: è la più probabile; se riparte il video vecchio chiedere all'utente `programma.log`.
- [x] Scia: nastro 0,8 m pieno + alone, lunga fino a 10 m, piena da 14 m/s; «Scia della palla: No» = disegno di prima.
      Confronto guardato: `docs/b21/img/scia-confronto-b26.webp`.
- [x] Controllo rapido sul codice unito: gioco 1159/1159, sito 205/205, Windows 29/29, build ok → push
- [x] Zip Cloudflare consegnato: 23.293.679 B, sha256
      `5edcdb12d20265359d34048550fab842c0728bd309853a99357e77cbd6fb6b4e`, provato estratto (unico errore atteso: CORS del TURN)
- [x] **Installer 2026-11-12.1 pubblicato su R2** e verificato dal link fisso: 127.587.187 B, sha256
      `9e4f8335393ff332430ee76ff23ed8fa30e87568bd6305c762409f5416400a26` (corsa 43171074879, partita da sola con il push)
- [x] Detto all'utente cosa cambia e che, se parte ancora il video vecchio, serve `programma.log`
- [x] Prove complete sul codice unito (12/11, 07:40 UTC): LAN 12/12, `audit:legend` 69/69, nel browser 19 su 20 verdi
      (intro-trailer 78/78, scia-palla 39/39, schermo 41/41, stesso-schermo-b20 52/52, split-ready 34/34, formato-fiera
      22/22 e p2p 9/9, 1v1-p2p 39/39, tabellone 42/42, nuovo-giocatore 28/28 al secondo giro (27/28 al primo), servizio-lancio
      12/12, servizio-peso 8/8, menu 28/28, rally 9/9, leggenda 7/7, training-flow 22/22, tutorial-phone 52/52,
      gesti-speciali 9/9, phone-keep 13/13)
- [x] `natpf-modale-gesti` 29/29 rifatta a macchina libera (al primo giro 27/29 e 28/29 per la macchina satura dal
      revisore del B25 in parallelo: 0,8 fps). **Prove complete della 2026-11-12.1: tutte verdi, 20 su 20 nel browser.**
- L'agente B26 e il revisore del B25 si sono fermati due volte (limite delle 5 ore, poi «crediti finiti»): il B26 l'ha
  chiuso l'agente principale (mancava solo la sezione finale del documento e il commit).

**DECISIONE DELL'UTENTE del 12/11 (07:50 UTC) sull'aiuto al più giovane: «Non voglio che nessuno abbia un vantaggio di
punti, anzi voglio solo che il vantaggio si traduca nel gameplay».** Quindi: **niente punti regalati** (via il 15-0 della
variante C e il 30-0 della B, anche come varianti selezionabili in gioco); l'aiuto è solo nel gioco (margine sul tempo e,
se serve, altre leve di gioco: palla che arriva un po' più lenta al più giovane, più campo coperto, colpo più profondo).
Da fare dopo il revisore del B25: `HELP_DEFAULT` solo-gioco, misurare una variante solo-gioco più forte della A (A dà
29% al bambino contro adulto medio; obiettivo circa 40%), testi «Aiuto» senza punti, test e documento aggiornati.

**B25 (12/11, 08:35 UTC): implementazione + revisore indipendente + correzioni FATTI** nella worktree
`.claude/worktrees/wf_d8163833-9f8-1` (ramo `worktree-wf_d8163833-9f8-1`, `a4e5bf4`, non ancora unito). Bloccante del
revisore corretto: con il campo aperto il servizio passa ogni due punti anche nel classico (chi batte per primo tornato
al 50%). Documento: `docs/b25/stesso-schermo-equilibrio.md` in quella worktree.
- [x] **Aiuto solo nel gioco** fatto (variante G, `5fcff3d`…`3a3b9bc`): niente punti regalati (il motore non può più darli);
      bambino contro adulto = margine sul tempo ×2 e +0,1 s, palla verso di lui 10% più lenta, colpo 1 m più in fondo;
      fasce vicine e campo aperto = solo margine. Bambino contro adulto medio: 10–11% → 38–42% (tre serie).
- [x] Unito in `natpf-simulator` (`b3fd48d`), **versione 2026-11-12.2**.
- [x] Controllo rapido: gioco 1185/1185, sito 205/205, Windows 29/29, build ok → push
- [~] Zip e installer in consegna; prove
      complete dopo (`scratchpad/v1112c/prove.sh`, da aggiungere `natpf-stesso-schermo-b25`).
- Decisioni ancora da chiedere all'utente (dal documento B25): soglia del colpo super (1,3 volte; «qualche volta a
  partita» non raggiunto), «tira sempre fortissimo» rende 65–69% con il campo aperto, chi batte parte sfavorito con il
  campo aperto (44–48 punti su 100).
Poi B23 (prova delle movenze sul dritto), B24 e tappa 2 gruppi 2 e 3.

## IN CODA (nell'ordine; dettaglio in PIANO_LAVORI §1, voci B21–B24)

- [x] **B21 Video nel gioco** (2026-11-11.2): trailer come video d'avvio (senza titolo) con ripiego su `public/media/intro.mp4`; due clip
      sfocate come sfondo del tutorial; trailer su R2 (`media/`), clip dentro lo zip. File in `scratchpad/video/` e nella
      libreria Higgsfield dell'utente (crediti spesi 86 su 120).
- [x] **B22 Scia luminosa della palla** (2026-11-11.2) nel gameplay (un po' meno luminosa del trailer) + voce nelle Opzioni per spegnerla
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
