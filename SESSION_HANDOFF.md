# SESSION_HANDOFF · NATPF Simulator, giro «racchetta virtuale» (dal 22/10/2026)

Stato persistente del lavoro: da leggere all'inizio di ogni sessione e aggiornare a ogni checkpoint. La memoria
generale del progetto resta `MEMORY.md`; la cronologia delle decisioni è in `WORKLOG.md`.

## Obiettivo (richiesta del 22/10)

Il telefono come racchetta virtuale: il gesto fisico è l'input del gameplay. Direzione, potenza, altezza e traiettoria
vengono dal gesto in modo comprensibile, con assistenza arcade (riferimenti: Wii Sports Tennis, Switch Sports) e
senza caso (gesti simili danno risultati simili).

Fasi della richiesta:
1. diagnosi dallo ZIP;
2. telefono come racchetta;
3. lateralità e calibrazione;
4. webcam con un solo soggetto;
5. riconoscimento e finestra d'impatto;
6. colpi al volo e smash;
7. traiettorie libere e assistenza;
8. fisica e avversario;
9. diagnostica e 14 test obbligatori;
10. checkpoint.

Vincoli: tenere 1 contro 1, il collegamento del telefono e le integrazioni valide. Niente 2 contro 2. Niente mouse o
tastiera come controlli nuovi.

## Stato corrente

- Branch `claude/friendly-fermat-dwv2w2` (mai `main`). Prima di questo giro il branch era al commit `bfd629c`.
- **Fase 1 (diagnosi) finita.** È in `docs/NATPF_RACCHETTA_VIRTUALE.md` §2, problemi P1–P10 con evidenze marcate
  [dati], [codice], [ipotesi] e [insufficiente].
- Fase in corso: **implementazione** (passi qui sotto).

## Diagnosi in breve (dettagli nel documento)

- **P1 Mano**: il telefono era impostato da mancino, il gioco da destro, e nessuno sincronizza le due impostazioni.
  Dai dati, chi giocava sembra destro (ipotesi, 9 colpi su 12).
- **P2 Verso**: dopo «Salta» della calibrazione il verso del gesto era sempre 0, e il lato veniva dalla palla. Il
  verso si può misurare dalla gravità senza calibrazione: netto in 35 colpi su 54.
- **P3 Mira**: veniva dalla rotazione del telefono senza centro per lato, ed era satura (|mira| ≥ 0,8 in 22 colpi su
  54). La deriva del giroscopio tolta era sbagliata: [3,4; 6,8; 4,4] °/s contro circa [0,5] reali.
- **P4 Colpi a vuoto**: la finestra d'attesa era di 0,16 s a Esperto e Leggenda; poteva anche partire un impatto con
  la palla fino a 4,85 m.
- **P5 Servizio**: sempre «POWER SERVE», con posizione casuale e senza falli.
- **P6 Volée**: impossibili; chi gioca aspetta sempre 2,15 m dietro il rimbalzo.
- **P7 Pallonetti**: decisi anche con confidenza bassa.
- **P8 Caso**: dispersione, profondità ed errori del colpo di chi gioca sono casuali.
- **P9 Calibrazione**: il passo «fermo» è troppo severo con il telefono in mano.
- **P10 Webcam**: nessun dato utile nello ZIP.
- **Funzionano**: collegamento e prestazioni (59,9 Hz, 31,8 + 6,7 ms, 60 fps).

## Prossimi passi (in ordine)

1. [ ] Mano unica: il computer manda la mano al telefono, la calibrazione non la cambia (`natpf_phone_racket.js`,
   `natpf_hand.js`, `racchetta.js`, `link.js`/messaggi `cfg`).
2. [ ] Verso del gesto dalla gravità con il profilo semplice; deriva del giroscopio accettata solo se plausibile
   (`swing-detect.js`, `face-tracker.js`).
3. [ ] Forma del gesto sul telefono: piano, percorso della testa, ampiezza, piatto, rotazione che chiude o apre.
   Nuovo modulo in `site/js/tennis/`, campi nuovi in `swing-message.js` compatibili con i telefoni vecchi.
4. [ ] Intenzione sul computer: nuovo modulo `natpf_stroke_intent.js` che decide tipo, direzione, profondità e
   altezza, con margini chiari.
5. [ ] Esito deterministico nel motore (`natpf_skill.js`, `game_engine.js`): niente caso nel colpo di chi gioca;
   errori solo se la traiettoria esce.
6. [ ] Finestra d'impatto con la traiettoria prevista. Swing in attesa fino all'arrivo della palla, mai impatti con la
   palla lontana. Finestra arcade a tutti i livelli.
7. [ ] Movimento automatico con volée e schiacciate al volo; salita a rete dopo un attacco.
8. [ ] Servizio dal gesto.
9. [ ] Avversario: l'angolo buono toglie qualità alla risposta; scambi che finiscono.
10. [ ] Calibrazione tollerante; «Salta» con il gioco completo.
11. [ ] Webcam: mano dall'impostazione unica; prove con più persone, perdita del tracciamento, tremolio.
12. [ ] Diagnostica: forma, intenzione ed esito negli eventi; prova guidata con il colpo richiesto; metriche di
    ripetibilità.
13. [ ] I 14 test obbligatori, prima/dopo sullo ZIP (`scripts/audit/zip-replay.mjs`), regressioni (`npm test`, e2e).
14. [ ] Documento finale (codice, test automatici e validazione fisica separati), procedura di prova fisica, build e
    zip.

## Come riprendere

1. `git status` e `git log --oneline -5` sul branch del progetto. Se ci sono modifiche non salvate, vanno protette con
   un commit sul branch; mai `git stash` senza nome, mai reset.
2. Leggere questo file, poi `docs/NATPF_RACCHETTA_VIRTUALE.md` §3.
3. Lo ZIP della sessione reale non è nel repository (contiene il video della webcam). Per rifare le analisi, estrarlo
   in una cartella vuota fuori dal repository e passare quella cartella agli script.
4. Test: `cd natpf-tennis && npm test`. Il passo in corso è il primo `[ ]` della lista sopra.
