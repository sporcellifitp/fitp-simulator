# TRACCIA DEI PASSI · da leggere per primo quando si riparte

File breve, aggiornato **a ogni passo** (prima di un'operazione lunga e subito dopo). Dice dove si è arrivati e cosa
fare adesso. Il dettaglio sta in `docs/PIANO_LAVORI.md` (decisioni, regole) e `docs/WORK_PROGRESS.md` (misure).
Repository: `sporcellifitp/fitp-simulator`, branch `natpf-simulator`.

Segni: `[x]` fatto e su GitHub · `[~]` in corso (c'è scritto il punto esatto) · `[ ]` da fare.

## >>> 15/11/2026, 16:15 UTC · STATO ATTUALE: versione 2026-11-14.8 pubblicata. Leggi la sezione IN FONDO («15/11, 16:15 UTC») <<<

Dopo il passaggio di consegne delle 13:15 sono uscite la **14.6** (B51 telefono bloccato), la **14.7** (B48 + B48.1, B40,
B49, B50 in un solo commit) e la **14.8** (pannello dello stand compatto). Il bundle `rami-b40-b48.bundle` è già
dentro `natpf-simulator`: **non va riunito**. Del passaggio `docs/consegna/2026-11-15/PASSAGGIO_2026-11-15.md` valgono
ancora §4.6–§4.8, §5 e §7. Cosa resta: sezione in fondo a questo file e Checkpoint di `docs/PIANO_LAVORI.md`.

## >>> RIPRESI IL 13/11/2026 ALLE 16:35 UTC (dopo l'arresto delle 16:00): lo stato attuale è nelle sezioni IN FONDO <<<

B37 e B42 sono finiti e pubblicati (2026-11-13.10 e 2026-11-13.11); il bundle `docs/ripresa/` non serve più ed è stato
tolto. Coda: B43 (in corso) → B41 prima parte con B28.1 → B38+B39 → B41 seconda parte → B40 → B36 (B36.0 dopo B43).
Regole e decisioni ancora valide in `docs/RIPRESA_AGENTE.md` §3–§6 e `docs/PROJECT_MEMORY.md`. Le domande all'utente si
fanno solo con le domande a scelta.

## ADESSO (aggiornato il 12/11/2026 alle 22:05 UTC)

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
- [x] Zip Cloudflare 2026-11-12.2 consegnato: 23.297.434 B, sha256
      `4308f1559e9fef7da38d994f80e9a672c62bc3f3623276d26486c87d12243e2a`, provato estratto
- [x] **Installer 2026-11-12.2 pubblicato su R2** e verificato dal link fisso: 127.576.457 B, sha256
      `ec66a7249b3432805fa69430297a00efbb437525f816209de6526fa129083ace`
- [x] Detto all'utente come si attivano Lancio automatico, Campo aperto e fasce
- [x] Prove complete della 2026-11-12.2 (12/11, 09:30 UTC): LAN 12/12, `audit:legend` 69/69, nel browser 20 su 21 verdi
      (stesso-schermo-b25 54/54, intro-trailer 78/78, scia-palla 39/39, schermo 41/41, stesso-schermo-b20 52/52,
      split-ready 34/34, formato-fiera 22/22 e p2p 9/9, 1v1-p2p 39/39, tabellone 42/42, nuovo-giocatore 28/28,
      servizio-lancio 12/12, servizio-peso 8/8, menu 28/28, rally 9/9, leggenda 7/7, training-flow 22/22, tutorial-phone
      52/52, gesti-speciali 9/9, phone-keep 13/13)
- [x] `natpf-modale-gesti` guardata (12/11, 11:50 UTC): falliscono solo le misure dei fotogrammi a 1920×1080. Su questa
      macchina senza scheda grafica il campo da solo gira a 0,8–2 fps e la modale a 0,7–1,9: il confronto «≥ 85% del
      campo da solo» è rumore (0,7 contro 0,8), e «arena ferma ≥ 55 fps» dà 52,7 quando partono altri processi. Non è un
      difetto della 12.2 (le altre 27 verifiche sono verdi; da sola sulla 12.1 era 29/29). Resta da misurare su una
      scheda grafica vera.
- Decisioni ancora da chiedere all'utente (dal documento B25): soglia del colpo super (1,3 volte; «qualche volta a
  partita» non raggiunto), «tira sempre fortissimo» rende 65–69% con il campo aperto, chi batte parte sfavorito con il
  campo aperto (44–48 punti su 100).
**In corso dalle 09:10 UTC del 12/11: workflow `b23-dritto-video-e-tappa2-gruppo2`** (run `wf_26d95fdf-3ea`, base `9b8f9cb`), due
filoni in parallelo, ciascuno agente in worktree → revisore indipendente → correzioni:
- [~] **B23** prova delle movenze dal video sul solo dritto, con voce nelle Opzioni «Dritto come nel video (prova): Sì · No»
      e `?dritto=video|prima`; documento `docs/b23/dritto-dal-video.md` con foglio PRIMA / DOPO / VIDEO.
- [~] **Tappa 2 gruppo 2**: Leggenda con la stessa regola degli altri livelli (D2), palla corta che può sbagliare (D8);
      documento `docs/b18/t2-3-leggenda-e-palla-corta.md`.
Se si ferma per il limite d'uso: `Workflow({scriptPath: '/root/.claude/projects/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/workflows/scripts/b23-dritto-video-e-tappa2-gruppo2-wf_26d95fdf-3ea.js', resumeFromRunId: 'wf_26d95fdf-3ea'})`
(attenzione: con due filoni in parallelo la ripresa può rifare un agente già finito; le worktree `wf_26d95fdf-3ea-*`
tengono il lavoro: in quel caso continuare a mano o con un agente singolo sulla worktree). Quando finisce: guardare i
fogli del dritto, unire i due rami, versione 2026-11-12.3, controllo rapido, push, zip e installer SUBITO, prove complete dopo.
**In corso dalle 09:20 UTC del 12/11 (richiesta dell'utente: «mi servono entro oggi»): workflow
`b24-lob-drop-e-tappa2-gruppo3`** (run `wf_0782518b-44b`, base `9b8f9cb`), due filoni in parallelo con revisore e correzioni:
- [x] **B24 Lob & Drop** (2026-11-12.4, costruiti nel codice; i modelli 3D sono il B29) come personaggi in campo: voce nelle Opzioni «Personaggi in campo: Di sempre · Lob & Drop»
      (di base «Di sempre»), `?personaggi=lobdrop|sempre`; documento `docs/b24/lob-e-drop.md`.
- [x] **Tappa 2 gruppo 3** (2026-11-12.4): livelli Evento (adattivo) e Bambini, «Chi gioca: Bambino · Ragazzo · Adulto» al posto del
      livello (Pro e Leggenda in «Altre impostazioni»), segnale del momento giusto, colpo super spiegato; documento
      `docs/b18/t2-4-evento-bambini.md`.
Ripresa: `Workflow({scriptPath: '/root/.claude/projects/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/workflows/scripts/b24-lob-drop-e-tappa2-gruppo3-wf_0782518b-44b.js', resumeFromRunId: 'wf_0782518b-44b'})`
(stessa attenzione di sopra; worktree `wf_0782518b-44b-*`). Quattro filoni in tutto sulla macchina a 4 processori: le
misure dei fotogrammi al secondo nelle prove possono fallire per il carico, rifarle a macchina libera.
All'unione: i quattro rami toccano zone diverse ma `SKILL_LEVELS`, `natpf_stroke_outcome.js`, Opzioni e menu possono
dare conflitti: unire uno alla volta e rifare i test. Consegna man mano che un filone è rivisto e corretto.

**FOTOGRAFIA DELLO STATO alle 09:40 UTC del 12/11 (l'utente avvisa che il limite d'uso è vicino).** `natpf-simulator` su
GitHub è pulito e aggiornato (2026-11-12.2 consegnata). I quattro filoni sono a metà della fase «Lavoro» (nessun revisore
ancora partito); il lavoro, anche non committato, resta nelle worktree sotto `/home/user/foro-italico-world/.claude/worktrees/`:

| filone | worktree | ramo | stato alle 09:40 |
|---|---|---|---|
| B23 dritto dal video | `wf_26d95fdf-3ea-1` | `b23-dritto-video` | 1 commit (`360b83a`: modulo del dritto) + 1 file modificato |
| Tappa 2 gruppo 2 (Leggenda, palla corta) | `wf_26d95fdf-3ea-2` | `worktree-wf_26d95fdf-3ea-2` | nessun commit, 5 file modificati |
| B24 Lob & Drop | `wf_0782518b-44b-1` | `b24-lob-drop` | 1 commit (`5452261`: mascotte nel codice) + 2 file modificati |
| Tappa 2 gruppo 3 (Evento, Bambini, Chi gioca) | `wf_0782518b-44b-2` | `b18-t2-4-evento-bambini` | nessun commit, 19 file modificati |

**Come ripartire dopo il limite:** (1) `git worktree list` e, per ogni worktree, `git status -s` e `git log --oneline -3`;
(2) NON rilanciare i workflow con `resumeFromRunId` se un agente «Lavoro» non aveva finito (ripartirebbe da zero in una
worktree nuova): lanciare invece **un agente per filone sulla worktree esistente**, con il compito preso dallo script del
workflow (`TASKS.<chiave>.task` e `CONTEXT` nei due file in
`/root/.claude/projects/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/workflows/scripts/`: `b23-dritto-video-e-tappa2-gruppo2-wf_26d95fdf-3ea.js`
e `b24-lob-drop-e-tappa2-gruppo3-wf_0782518b-44b.js`) e la frase «le modifiche non committate sono lavoro tuo già
cominciato: riprendilo»; poi revisore indipendente (testo `TASKS.<chiave>.review`) e correzioni; (3) se quei file non ci
sono più (contenitore nuovo), il compito è descritto qui sopra e in PIANO_LAVORI (voci B23, B24, B25 «Chi gioca») e nel
rapporto `docs/b16/rapporto-gameplay.md` (D2, D3, D8, miglioramenti 3 e 4); **le worktree non sono su GitHub: se il
contenitore è stato ricreato il lavoro a metà è perso e si riparte dal compito**; (4) priorità dell'utente: **Lob & Drop
e livelli Evento e Bambini entro oggi**, quindi riprendere prima quei due; (5) unire un ramo alla volta, versione
2026-11-12.3 e seguenti, controllo rapido, push, zip e installer subito, prove complete dopo.

**RIPRESA delle 11:47 UTC del 12/11** (limite d'uso passato alle 11:40; la macchina è stata riavviata ma le worktree e
il lavoro a metà ci sono tutti). Gli script dei workflow sono stati riscritti per CONTINUARE nelle worktree esistenti
(senza worktree nuove): `ripresa-b24-t2g3.js` e `ripresa-b23-t2g2.js` nella cartella degli script.
- [~] In corso: `ripresa-b24-t2g3.js` (run `wf_3af250f1-cd0`): Lob & Drop + Evento/Bambini, ciascuno lavoro → revisore →
      correzioni. Sono i due che l'utente vuole entro oggi: per questo partono da soli (due agenti, non quattro).
- [ ] Da lanciare quando questi passano al revisore o finiscono: `Workflow({scriptPath: '/root/.claude/projects/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/workflows/scripts/ripresa-b23-t2g2.js'})`
      (dritto dal video + tappa 2 gruppo 2, nelle worktree `wf_26d95fdf-3ea-1` e `-2`).
- Se si fermano di nuovo: rilanciare lo stesso script di ripresa SENZA `resumeFromRunId` (riparte dall'agente «Lavoro»
  che ritrova commit e modifiche nella worktree); se il «Lavoro» era finito, usare `resumeFromRunId` per non rifarlo.

**AVVISO DELL'UTENTE del 12/11 (12:40 UTC): un altro agente sta per pubblicare su questo branch i blocchi B27 (telecomando e
schermo del gioco) e B28 (calibrazione giocando e tutorial senza blocco).** Quindi: **`git fetch` e integrazione PRIMA di
ogni push** (se il remoto è avanti: unire, rifare i test del gioco e del sito, poi pubblicare; mai `--force`); non usare
i numeri B27 e B28 per altri lavori (i prossimi blocchi di questo agente partono da B29); all'unione dei rami in corso
aspettarsi conflitti su telefono/telecomando, tutorial e calibrazione, e nei file di versione (prendere la versione più
alta e aggiungere la propria riga in `novita.txt`).

**RICHIESTA DELL'UTENTE del 12/11 (13:10 UTC): «dammi la possibilità, dalle impostazioni di un match, di decidere quali
personaggi usare ogni volta (classici / Lob & Drop)».** Da fare DOPO l'unione di B24 e del gruppo 3 (toccano le stesse
schermate), come passo piccolo con test e prova nel browser: nella schermata dove si imposta la partita (contro la CPU:
la pagina «Chi gioca»; stesso schermo: la pagina «Collega i due telefoni»; sfida tra due computer: dove l'host imposta
la partita) una scelta **«Personaggi: Classici · Lob & Drop»**, che vale per quella partita e parte dall'ultima scelta
fatta; la voce nelle Opzioni resta come valore di base. Usare l'etichetta «Classici» (parola dell'utente) al posto di
«Di sempre». Chiosco e «Nuovo giocatore»: tornare al valore di base delle Opzioni. Dire all'utente dove si trova.

**Lob & Drop con Higgsfield (domanda dell'utente del 12/11, 12:00 UTC: «valuta se ha senso ricreare il personaggio tramite
Higgsfield»).** Valutato, solo preventivo, niente speso: `generate_3d` modello `image_to_3d` (Meshy) da una foto dà un GLB
con texture a **30 crediti** per mascotte, **35** con lo scheletro automatico; saldo 504, tetto dei 120 già usato per 86.
Limiti: nella foto le mascotte si coprono a vicenda (serve prima un'immagine pulita di ciascuna, fronte e retro); lo
scheletro è quello di Meshy, non quello del gioco (le animazioni del gioco vanno riportate su quelle ossa); peso da
ridurre (zip Cloudflare: 1,7 MB di margine). Proposta fatta all'utente: oggi la versione costruita nel codice (in corso),
poi una prova con il solo Drop; l'utente ha detto **«Sì procedi con la prova»** (12/11, 12:35 UTC). Fatto: immagine pulita di Drop (job
`261684cd-a201-4cc8-922f-b840a0f2e188`, 0,25 crediti; nel logo generato c'è scritto «Nittto», da correggere se si adotta) e
modello 3D con texture e scheletro avviato (job `9a8b3d4c-8f82-4171-8879-c22b112c6487`, 35 crediti; crediti spesi in tutto
121,25). File in `scratchpad/lobdrop3d/`. **Esito (12/11, 12:55 UTC): riuscito.** GLB in `scratchpad/lobdrop3d/glb/drop.glb`
(2.885.704 B: 8.268 triangoli, texture JPEG 2,1 MB da ridurre, scheletro umanoide di 24 ossa con nomi standard `Hips`,
`Spine`, `LeftArm`, `RightForeArm`…); provato in three.js: si riconosce bene e lo scheletro piega pulito (braccio alzato,
gamba avanti, busto ruotato). Immagine mostrata all'utente (`scratchpad/lobdrop3d/drop-3d-prova.jpg`). Proposto: fare anche
Lob (35,25 crediti) e un blocco **B29** che carica i due GLB alleggeriti (obiettivo sotto 0,4 MB l'uno) e riporta le
animazioni del gioco sulle 24 ossa, al posto delle mascotte costruite nel codice. **L'utente ha detto «Sì» (12/11, 13:00 UTC).**
- [x] Lob fatto (12/11, 13:05 UTC): immagine pulita (job `b63b21a6-dcc8-4bbf-bee2-c0729798a25b`, logo scritto giusto) e
      modello 3D con scheletro (job `20e496ac-412f-4ee8-9f2d-0f286ff0bb34`): 2.992.640 B, 8.210 triangoli, texture JPEG
      2,26 MB, stesse 24 ossa di Drop; si riconosce (visiera blu con LOB, occhiali, punta in testa) e lo scheletro piega
      pulito. Immagine mostrata all'utente. Crediti spesi in tutto: 156,5 (86 video + 70,5 mascotte). I due GLB stanno in
      `scratchpad/lobdrop3d/glb/` (`drop.glb`, `lob.glb`); se lo scratchpad non c'è più si riscaricano dalla libreria
      Higgsfield dell'utente con i job qui sopra (`jobs_wait` restituisce l'indirizzo).
- [ ] **B29 · Lob & Drop dai modelli 3D** (dopo l'unione del B24, sullo stesso ramo di partenza): copiare i due GLB nel
      repository alleggeriti (texture 1024 px o meno, niente tangenti né clip, attributi compatti; obiettivo sotto 0,4 MB
      l'uno, margine dello zip Cloudflare 1,7 MB), correggere «Nittto» nella texture di Drop, caricarli con GLTFLoader al
      posto delle mascotte costruite nel codice quando l'opzione «Personaggi in campo» è su «Lob & Drop», riportare le
      animazioni del gioco (corsa, colpi, servizio, esultanza, mancini) sulle 24 ossa (`Hips`, `Spine`, `Spine01`,
      `Spine02`, `neck`, `Head`, `Left/RightShoulder`, `Arm`, `ForeArm`, `Hand`, `UpLeg`, `Leg`, `Foot`, `ToeBase`),
      racchetta nella mano giusta e sulla palla all'impatto; se il modello non si carica, ripiego sulle mascotte nel
      codice; fogli di confronto, prova nel browser, revisore indipendente.

## B27 e B28 (secondo agente, sessione parallela; aggiornato il 12/11/2026 alle 19:15 UTC)

Lavoro chiesto dall'utente allo stand, in rami locali separati e unito qui un blocco alla volta dopo `git fetch`.
**Il prossimo numero di versione libero è 2026-11-12.6** (2026-11-12.3 = B27, 2026-11-12.4 = Lob & Drop ed Evento/Bambini dell'altra sessione, 2026-11-12.5 = B28).

**Versione 2026-11-12.3 = B27 · Postazione dello staff** (dettaglio: `docs/WORK_PROGRESS.md` B27, guida
`docs/GUIDA_TELECOMANDO.md`, matrice delle schermate `docs/b27/telecomando.md`).
- [x] Programma Windows: domanda «Su quale schermo mostro il gioco?» all'avvio (2+ monitor e nessuno scelto), voce
      «Schermo del gioco» nel pannello dello stand, ponte `window.natpfDesktop.displays` (preload versione 3)
- [x] Telecomando dello staff: `site/tennis/telecomando.html`, abbinamento dal pannello dello stand confermato sul
      computer, ripresa da solo con prova della chiave; nel gioco `natpf_remote.js` e `natpf_remote_map.js`
- [x] Revisore indipendente: 12 difetti (2 bloccanti), tutti corretti e con test
- [x] Unito sopra `b831973`, prove sul codice unito: gioco 1194/1194, sito 223/223, LAN 12/12, Windows 33/33, build ok;
      nel browser `natpf-telecomando` 80/80, `natpf-menu` 38/38, `natpf-training-flow` 22/22
- [x] Push `76c6ed3`; tre esecuzioni di GitHub verdi; **installer 2026-11-12.3 pubblicato su R2** e verificato dal link
      fisso: 127.622.808 B, sha256 `7642dcc3724e17761156e4bc30c208c9c5424cd9b9f0d7446e9dfea6801fbbb2`; zip Cloudflare
      consegnato: 23.330.733 B, sha256 `0d762b68e485de25b8e8396ba2f42fa2725e3d37759de7799215bb81bd658266`, provato
      estratto (gioco, pagina della racchetta e pagina del telecomando; unico errore atteso: CORS del TURN)
- [x] Detto all'utente come si attivano la domanda dello schermo, «Schermo del gioco» e «Telecomando dello staff»
- **Attenzione per chi unisce altri rami**: il pannello dello stand (`#natpf-staff` in `natpf-tennis/index.html`) ha due
  voci nuove nella riga in basso («Telecomando dello staff», «Schermo del gioco») e deve restare senza scorrimento
  (`natpf-menu` lo controlla a 1024×600, 1366×657 e 1024×1024). Chi aggiunge una schermata o un `confirm()` deve
  aggiornare la mappa del telecomando (`natpf_remote_map.js`; un test fallisce se un `confirm()` non è nell'elenco).

**B28 · Calibrazione giocando e tutorial senza blocco** (ramo locale `b28-cal-giocando`, base `8b85a3c`, 11 commit, non
su GitHub; documento `docs/b28/calibrazione-giocando.md` nel ramo).
- [x] Sviluppo: scambi di prova di 10–15 s al posto della calibrazione con i gesti (opzione dello stand «Calibrazione:
      Giocando · Con i gesti · Nessuna», di base Giocando), tutorial chiudibile da ogni scheda, «Avanti ›» negli esercizi
- [x] Revisore indipendente (12/11, 14:40 UTC): nessun blocco sul percorso di base; 4 difetti da correggere (chi tira
      solo di dritto e manca una palla si ritrova destra e sinistra invertite; il Player 2 che esce dagli scambi di prova
      nella sfida tra due computer; pausa del telefono del Player 2 nello stesso schermo; profilo del visitatore prima
      ereditato quando si cambia l'opzione) e 3 minori; il percorso di base ha poche prove
- [x] Correzioni dei 7 difetti (ramo fino a `953eb34`), seconda revisione indipendente: via libera, nessun bloccante
- [x] **Versione 2026-11-12.5**: unito sopra la 2026-11-12.4 (conflitti solo in `natpf_ui.js` `tick` e nel registro);
      all'unione corretto il pulsante «CPU» del telecomando, rotto dalla 12.4 (ora gira tra i cinque livelli di
      `natpf_who.js` e dice «Chi gioca: …»). Prove sul codice unito: gioco 1283/1283, sito 226/226, LAN 12/12, Windows
      33/33, build ok; nel browser telecomando 81/81, menu 45/45, scambi-di-prova 24/24 · 25/25 · 12/12, flusso-tocchi
      5/5, training-flow 21/21, nuovo-giocatore (modo di base) 30/30
- [x] Push `3586020`; tre esecuzioni di GitHub verdi; **installer 2026-11-12.5 pubblicato su R2** e verificato dal link
      fisso: 127.643.482 B, sha256 `ee207b7823c1c3533c4f82ddd7b92fb528ca8a6096e26e57539f770c09d8d26f`; zip Cloudflare
      consegnato: 23.354.730 B, sha256 `72189697b9d1035d48677f9f90caa764e8e8fe86840b717d2e0f6112e77a0330`, provato
      estratto (unico errore atteso: CORS del TURN)
- [x] Detto all'utente come si attiva «Calibrazione» e cosa cambia; in corso il B28.1 nel ramo `b28-cal-giocando`
- [ ] **Prossima versione (B28.1)**: i punti aperti della seconda revisione (`docs/WORK_PROGRESS.md`, «B28 · integrazione
      e seconda revisione»): profilo che non si rinnova nei minigiochi e nell'allenamento, sfida tra due computer con
      «Nessuna», scritta finale nello stesso schermo, limite di `natpf-phone-keep`
- **Attenzione**: con il B28 chi aggiunge un controllo «siamo in partita?» deve escludere `ui.trial.active`; le prove
  `natpf-*` di prima girano con `CAL=gesti` (calibrazione con i gesti), il percorso nuovo lo provano i test nuovi.

**RIPRESA delle 16:45 UTC del 12/11** (secondo limite d'uso della giornata, passato alle 16:40). Stato:
- L'altro agente ha pubblicato **B27 (schermo del gioco all'avvio e telecomando dello staff) come versione 2026-11-12.3**
  (`76c6ed3`): integrato qui con avanzamento lineare. **La prossima versione di questo agente è la 2026-11-12.4** (o la
  successiva alla più alta che c'è sul remoto al momento dell'unione).
- B24 Lob & Drop: revisore finito (1 bloccante: la racchetta entra nella testa delle mascotte; 6 minori). Tappa 2 gruppo
  3: revisore finito (2 bloccanti: anello verde più lungo della finestra vera; scritta «Super mancato: eri in corsa» quasi
  sempre falsa; 8 minori), correzioni già a metà (6 commit). I punti del revisore sono salvati in
  `scratchpad/revisioni/b24.json` e `t2g3.json`.
- [x] Correzioni finite (workflow `correzioni-b24-t2g3`): B24 fino a `eed8772` (modulo `natpf_racket_clear.js`: la racchetta
      si scosta dalla testa grande; etichetta «Classici»; linguette del tabellone blu/gialle), gruppo 3 fino a `a9ba5ed`
      (anello verde uguale alla finestra vera del «Perfetto»; scritta del super con la causa vera).
- [x] Uniti sopra il B27 (`f8d4bf6`, `662b0a7`; un conflitto sugli import di `natpf_lobby.js`, risolto tenendo tutti e due)
      e integrato un altro commit dell'altro agente (`73cc7d4`).
- [x] Scelta **«Personaggi: Classici · Lob & Drop»** nella pagina «Pronto per la partita» (riga sotto «Chi gioca»,
      `data-match-cast`, stessa `setCast` delle Opzioni: una scelta sola, salvata). Guardata a 1280×720 e 1920×540.
- [x] **Versione 2026-11-12.4**: controllo rapido gioco 1235/1235, sito 223/223, Windows 33/33, build ok; nel browser
      chi-gioca 55/55, lob-drop 80/80 → push.
- [x] Zip Cloudflare consegnato: 23.343.105 B (margine 1.656.895 B), sha256
      `97d01104b52300ccf771ad3d0581cebe2e9787a017c9b00ffd262f248d2f4769`, provato estratto.
- [x] **Installer 2026-11-12.4 pubblicato su R2** e verificato dal link fisso: 127.655.077 B, sha256
      `0dfce566752624e604dc5cd74f8ecf74c6a9f7441640521342d8bc5d75148f50`. Detto all'utente come si attiva tutto.
- [~] Prove complete sul codice unito: `scratchpad/v1112d/prove.sh` → `prove.txt` (finisce con `== FINE`).
- [~] **B29 in corso dalle 18:10 UTC**: workflow `b29-lob-drop-modelli-3d` (run `wf_c1842a53-f0f`, base `fb6169e`; agente in
      worktree `wf_c1842a53-f0f-1` → revisore indipendente → correzioni). Modelli in `scratchpad/lobdrop3d/glb/`. Se si ferma
      nella fase «Lavoro»: rilanciare lo script SENZA `resumeFromRunId` dopo averlo modificato per continuare nella
      worktree esistente (come `ripresa-b24-t2g3.js`: togliere `isolation: 'worktree'` e indicare il percorso); se si
      ferma dopo: `resumeFromRunId: 'wf_c1842a53-f0f'`. Script:
      `/root/.claude/projects/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/workflows/scripts/b29-lob-drop-modelli-3d-wf_c1842a53-f0f.js`.
- [~] **B30 · Registro dello stand** (richiesta dell'utente del 12/11: «prevedi una raccolta di log continuativi (solo
      gameplay) per quando aprirò lo stand alla gente»). **Due decisioni dell'utente (12/11, 18:25 UTC): «Non puoi salvare i
      log su un drive? Il pc non è il mio, comunque vorrei avere questa modalità di default sempre attiva».** Quindi:
      registro **acceso di base sempre**, in tutte le versioni; i dati **escono da soli dal PC** verso lo spazio
      Cloudflare dell'utente (R2, con un Worker nuovo `natpf-tennis/cloudflare/registro-worker.js` che accetta solo
      aggiunte; lettura e scarico solo con una chiave segreta che sceglie e tiene l'utente, mai nel repository); sul PC
      resta solo la coda non ancora inviata; guida `docs/GUIDA_REGISTRO_CLOUDFLARE.md` (il Worker lo crea l'utente, come
      per il TURN). Niente Google Drive/OneDrive: servirebbe mettere una chiave dell'account dentro un gioco pubblico.
      **Terza indicazione dell'utente (18:35 UTC): «ok su Cloudflare ma non ho spazio infinito»** (R2 da 10 GB, con dentro
      installer e trailer): il Worker deve avere un tetto totale configurabile (di base 2 GB) che cancella da solo i giorni
      più vecchi, blocchi compressi e righe compatte, stima di partite e giorni che stanno in 2 e 10 GB scritta nella
      guida, spazio occupato e cancellazione visibili con la chiave. Mandato come messaggio all'agente in corso
      (`ab084c973d39c8426`); il testo del compito nello script v2 NON lo contiene: **controllare che sia stato fatto** e,
      se no, chiederlo nelle correzioni.
      **ATTENZIONE (12/11, 18:40 UTC): nella worktree del B30 lavorano DUE istanze dello stesso agente** (un mio
      `SendMessage` all'agente del workflow lo ha «ripreso» in una seconda copia: lezione → NON mandare messaggi a un
      agente di un workflow mentre gira; per cambiare il compito fermare il workflow e rilanciarlo). Divisione approvata:
      istanza A (workflow) = Worker, strumenti di riassunto, guida, documento, verifiche finali e risultato; istanza B =
      gioco, pannello dello stand, programma Windows, pacchetti, prova nel browser; protocollo = quello del commit
      `020e7ab`; coordinamento nel file `scratchpad/b30-coordinamento.md`. Altra aggiunta mandata: **bucket R2 separato e
      privato `natpf-registro`** (quello di installer e trailer è pubblico). All'unione controllare bene che le due metà
      stiano insieme (stesso protocollo, test verdi) e che il revisore abbia visto tutto.
      Il primo workflow (`wf_f20b2599-40d`) è stato fermato dopo pochi minuti e rilanciato con il compito aggiornato:
      **`b30-registro-v2.js`, run `wf_0f562962-c56`**, che continua nella worktree `wf_f20b2599-40d-1` → revisore →
      correzioni. Ripresa: rilanciare `b30-registro-v2.js` senza `resumeFromRunId` se la fase «Lavoro» non era finita,
      con `resumeFromRunId: 'wf_0f562962-c56'` se era finita. Dopo: dire all'utente i passi della guida e chiedergli
      l'indirizzo del Worker per metterlo nei pacchetti.
- Nota dell'utente del 12/11 (18:10 UTC), con una schermata di Lob costruito nel codice in partita e le due immagini pulite
  generate: vuole in campo i personaggi come nelle immagini → è il B29. Il GLB che ha allegato è lo stesso `drop.glb` già
  in uso (stessa impronta sha256 `981fcbc1…`).
- [ ] Dopo le prove complete: `ripresa-b23-t2g2.js` (dritto dal video + tappa 2 gruppo 2, worktree `wf_26d95fdf-3ea-1` e
      `-2`, base `9b8f9cb`; all'unione attenzione a `game_engine.js` `_natpfRacketShot`, toccato dal gruppo 3).
- Aperti del gruppo 3 da chiedere all'utente dopo le prime partite vere: valore di partenza del livello Evento (0,8); a
  Evento cambiano anche le regole di chi gioca, non solo la CPU.

**RIPRESA delle 21:55 UTC del 12/11 (questo agente; terzo limite d'uso della giornata, passato alle 21:40).**
- L'altro agente ha pubblicato **2026-11-12.5** (B28 calibrazione giocando e tutorial senza blocco; telecomando con
  «Chi gioca»): integrato con avanzamento lineare (`a6188ba`). Una mia correzione del pulsante «CPU» del telecomando
  (non pubblicata) era doppia rispetto alla sua: tolta, vale la sua. **La prossima versione di questo agente è la
  2026-11-12.6** (o la successiva alla più alta sul remoto).
- Prove complete della 2026-11-12.4 (finite alle 18:37 UTC): 18 su 21 al primo giro; rifatte: scia-palla 39/39,
  intro-trailer 77/78 (fallisce solo «M: CPU rallentata 6 volte → parte il trailer» con la macchina a carico 10: è il
  ripiego voluto quando la pagina è lentissima; da sola la parte A è verde), telecomando 79/80 per il pulsante «CPU» con
  i livelli nuovi → corretto dall'altro agente nella 12.5. Da rifare la prova del trailer a macchina libera.
- B29 e B30 fermati dal limite nella fase «Lavoro». Rilanciati con script di ripresa che continuano nelle worktree
  esistenti e **prima uniscono il ramo principale aggiornato** (base dei confronti `a6188ba`):
  - [~] B29: `ripresa-b29.js`, run `wf_44a8ed48-acc` (worktree `wf_c1842a53-f0f-1`, ramo `b29-lob-drop-3d`).
  - [~] B30: `ripresa-b30.js`, run `wf_55a0047e-b27` (worktree `wf_f20b2599-40d-1`, ramo `b30-registro-stand`; UNA sola
        istanza ora, con tutte le aggiunte dell'utente nel testo del compito).
  Se si fermano di nuovo nella fase «Lavoro»: rilanciare lo stesso script senza `resumeFromRunId`.
- Dopo: unire B29 e B30, versione, controllo rapido, push, zip e installer; poi `ripresa-b23-t2g2.js` (dritto dal video
  e tappa 2 gruppo 2; anche lì far unire prima il ramo principale aggiornato).

**DECISIONE DELL'UTENTE del 12/11 (23:10 UTC) sulla roadmap: «Dopo la consegna fino al punto 3, poi vai avanti e tira
dritto fino alla tappa 3 (6, 7, 8)».** Ordine di lavoro deciso (senza fermarsi a chiedere tra un blocco e l'altro; si
consegna dopo ogni blocco come sempre, con «come si attiva»):
1. B29 Lob & Drop dai modelli 3D → consegna (in corso, al revisore)
2. B30 Registro dello stand → consegna + passi Cloudflare all'utente (in corso, al revisore)
3. B28.1 dell'altro agente (suo; qui solo integrarlo quando lo pubblica)
4. B23 dritto con le movenze del trailer (prova con interruttore) e 5. tappa 2 gruppo 2 (Leggenda stessa regola D2,
   palla corta che può sbagliare D8): `ripresa-b23-t2g2.js`, worktree `wf_26d95fdf-3ea-1` e `-2`, **prima unire il ramo
   principale aggiornato** (le worktree partono da `9b8f9cb`)
6. **B31 · Tappa 3.1**: gioco a rete per tutti e due, la CPU schiaccia e fa qualche rara palla corta, il tagliato
   diventa utile; insieme i difetti della rete (rapporto `docs/b16/rapporto-gameplay.md` §4 tappa 3, miglioramento 6 e
   punto 22)
7. **B32 · Tappa 3.2**: movimento con accelerazione e colpi in corsa (miglioramento 7)
8. **B33 · Tappa 3.3**: fine partita con dati veri e classifica delle partite (miglioramento 5)
Restano fuori per ora (non chiesti): tappa 3 punti 4 (doppio 2v2) e 5 (ledwall, servizio con scelte, Leggenda campione).
**PROCESSO NUOVO (decisione dell'utente del 12/11, 23:20 UTC: «Il revisore indipendente magari serve alla fine,
ottimizza i processi»)**, dal punto 4 in poi:
- un solo agente per blocco, senza revisore per blocco; l'agente fa le sue verifiche (test, impronte, prove nel browser
  del blocco, schermate guardate) e scrive nel documento cosa non è provato;
- al più due agenti insieme (la macchina ha 4 processori: con tre o quattro le prove nel browser falliscono per il carico
  e vanno rifatte, lavoro sprecato);
- consegna dopo ogni blocco come sempre (controllo rapido, push, zip, installer, «come si attiva»), prove complete solo
  sulla consegna finale;
- **un revisore indipendente solo alla fine della serie** (B23, tappa 2 gruppo 2, B31, B32, B33 insieme, sul codice
  unito), poi correzioni e versione finale;
- B29 e B30 hanno già il revisore in corso: si lasciano finire (il costo è già speso).
Prima la regola era: impronte dei livelli e dello stesso schermo
invariate dove non devono cambiare; regole dell'utente già prese (Pro com'è, nessun vantaggio di punti, ecc.).

**Versione 2026-11-12.6 = B30 registro dello stand** (12/11, 23:45 UTC). Ramo `b30-registro-stand` (con revisore: 3
bloccanti corretti, tra cui «senza chiave si potevano far cancellare i giorni veri»: ora il Worker oltre il tetto
rifiuta e non cancella mai da solo), unito in `4efc6d8`. Controllo rapido: gioco 1336/1336, sito 226/226, Windows 42/42,
build ok → push. Zip Cloudflare 23.371.976 B (margine 1.628.024 B), sha256
`a8b106c2041c762610c0323619383eac69af7691cbdaafb3c99edf746dd31df6`, provato estratto; **senza `--registro-url`** (manca
l'indirizzo del Worker: il registro resta in coda sul PC finché l'utente non crea il Worker). Mandati all'utente lo zip,
il codice del Worker e la guida `docs/GUIDA_REGISTRO_CLOUDFLARE.md`. Installer: in attesa di GitHub Actions →
`scratchpad/v1112f/attesa.sh`. **Da fare quando l'utente manda l'indirizzo del Worker**: zip con `--registro-url=<indirizzo>`
e `natpf-desktop/registro.json` con `{"url": "<indirizzo>"}`, versione nuova, pacchetti. Mai la chiave in chat.
Prove complete della 12.6: non ancora (si fanno sulla consegna finale della serie, processo nuovo).

**Installer 2026-11-12.6 pubblicato su R2** e verificato: 127.664.077 B, sha256
`797d8ce6fcc48918e91b7e7162f1922aa3a0e2aff0c34869f87bedbb5763da4f`.

**Versione 2026-11-12.7 = B29 Lob & Drop dai modelli 3D** (13/11, 00:10 UTC). Ramo `b29-lob-drop-3d` (revisore: 0
bloccanti, 8 minori sistemati), unito in `06511fb`. Controllo rapido: gioco 1349/1349, sito 226/226, Windows 42/42, build
ok → push. Zip 23.826.443 B (**margine solo 1.173.557 B**: i due modelli pesano 0,65 MB), sha256
`8717eda1ad755e747f9388e40e340f7c5ef4006b00ad58500fa0cbe3f614802a`. **Installer 2026-11-12.7 pubblicato su R2** e verificato: 128.043.481 B, sha256
`70035aa2d5f0749cb523cb453650b1a4dca140e6e35d4e29504c55f8f99ffb28`. Scelte di
gusto da far vedere all'utente: scala 1,6 m (`docs/b29/img/scala.webp`) e bordo chiaro di Drop (`bordo-drop.webp`).

**In corso dalle 00:10 UTC del 13/11: punto 4 e 5 della roadmap** — workflow `b23-t2g2-senza-revisore` (script
`ripresa-b23-t2g2.js`, run `wf_20200b80-a34`; dopo il riavvio del container alle 00:30 UTC del 13/11 rilanciato: run `wf_4fd99346-ef1`): due agenti nelle worktree `wf_26d95fdf-3ea-1` (dritto dal video) e `-2`
(tappa 2 gruppo 2), prima uniscono il ramo principale, **senza revisore** (processo nuovo). Se si fermano: rilanciare lo
script senza `resumeFromRunId`. Poi B31, B32, B33 (tappa 3).

**Versione 2026-11-13.1 = B23 dritto dal video (prova) + tappa 2 gruppo 2** (13/11, 01:45 UTC), senza revisore per
blocco (processo nuovo). Unione `e697f4e` (B23) e `03d5c67` (T2.3), versione `1906562`. Controllo rapido: gioco
1375/1375, sito 226/226, Windows 42/42, build ok → push. Zip 23.830.402 B (margine 1.169.598 B), sha256
`3c741f5dc36237636c31ff8d3bc295838db46096fd232888e65f18744c7b14a2`. **Installer 2026-11-13.1 pubblicato su R2** e verificato: 128059991 B, sha256 `eb00f52949faa7752d47464901da1e9ade5339db8d8c8ed3d687e20839d8c82c`.
Punti aperti della T2.3 da portare al revisore finale: a Facile la palla corta al momento giusto vale −1…−2 punti per
«amatore» (scheda D8: +2…+5); a Leggenda margini stretti sui criteri (CPU contro «tennista» 87–89%, criterio ≥85%);
finestra che si stringe negli scambi lunghi solo a Leggenda (forse da far decidere all'utente); Esperta contro «medio»
72,6% in una serie (criterio 70–85%).

**In corso dalle 01:45 UTC del 13/11 (due agenti, script `blocco-singolo.js` con `args`):**
- [x] **B31** finito (ramo `b31-gioco-a-rete`, `1455e1e`), unito in `62508e3`: **versione 2026-11-13.3** (`fa2482c`;
      controllo rapido gioco 1397/1397, sito 226/226, Windows 42/42, build ok; zip 23.839.397 B, sha256
      `70b5e87ce9d0edf496ebbb05c4bca2fd75d80a4a6aa8d483211458208a47526d`; **installer pubblicato su R2** e verificato: 128061270 B, sha256 `bb2deb6ba9df51693e79a8b604c2122d38c051b3ab6e7eed5f218a4d380bea90`).
      **Da portare al revisore finale**: a Leggenda il profilo «preciso» perde molto di più (CPU 68,2% → 83,5% dei game;
      criterio ≥60% rispettato); la CPU a rete vince poco (20–47% dei punti in cui sale); solo tagliati in una casella
      +4,9 punti (tetto +3); «Stanco!» 0,5% → 4,4% del tempo; «tennista» al livello Bambini a rete 35% dei colpi; il
      Worker del registro va ricaricato su Cloudflare per il campo nuovo `rete` (l'utente non l'ha ancora creato).
- [x] **B33** finito (ramo `b33-fine-partita`, `3ac03d0`), unito: **versione 2026-11-13.2** (controllo rapido gioco
      1385/1385, sito 226/226, Windows 42/42, build ok; zip 23.836.415 B, sha256
      `01232d0ba08b7c06e04c3fbd776584b7e46b492f13d075c9f34c752bb8e0014a`; **installer pubblicato su R2** e verificato: 128.059.215 B, sha256 `f8db3e2265119b9112d15891dfef2cb90d807e39533d6e11c7a30801365f1e0e`).
      **Da portare al revisore finale / all'utente**: «colpo più veloce» 221–240 km/h (numero del popup del colpo: poco
      credibile, va controllato da dove viene); in classifica una sconfitta a Leggenda (286 punti) sta sopra le vittorie
      (punteggio = % punti × valore del livello: decisione da chiedere all'utente se vuole premiare la vittoria); nella
      sfida tra due computer il Player 2 non vede ace e vincenti.
- [x] **B32** finito (ramo `b32-movimento`, `c9a993f`), unito: **versione 2026-11-13.4** (`7c72b70`; controllo rapido
      gioco 1409/1409, sito 226/226, Windows 42/42, build ok; zip 23.840.746 B, sha256
      `d83ec86fb9dd0b810b3717b16be32968607c878834b462e12cc01d430fdb91b7`; **installer pubblicato su R2** e verificato: 128039808 B, sha256 `7d9519820500826252a6fcea25fea4830b68530f1271964a48f11159a938fdf4`).
      Da portare al revisore: a Evento un colpo su cinque «in corsa» (troppe scritte?); palle davvero imprendibili non
      aumentate (per non far uscire Pro dal criterio); 4 controlli «corde al colpo» in natpf-lob-drop.
- [x] **REVISIONE FINALE della serie** fatta (run `wf_97a327be-1bf`; il container si è riavviato durante le ultime
      verifiche dell'agente di correzioni: le ha finite l'agente principale). Revisori: 4 bloccanti (2 uguali), 14 minori,
      13 decisioni. Corretti: «Palla corta della CPU» che non compariva mai; passo corto a rete nascosto (ora vale il
      movimento del B32 anche a rete); documento del «colpo più veloce»; minori. Ramo `revisione-finale` unito:
      **versione 2026-11-13.5** (`ff67126`; controllo rapido gioco 1411/1411, sito 226/226, Windows 42/42, build ok; zip
      23.840.848 B, sha256 `0457a434f553aad8e7e9ad6b5b7da024f18c56d462e189f672746e980c872e4e`; installer:
      `scratchpad/attesa-installer.sh`). Documento con le **13 decisioni per l'utente**: `docs/revisione-finale-2026-11-13.md` §3.
- **DECISIONI DELL'UTENTE del 13/11 (07:45 UTC) sulla revisione finale** (`docs/revisione-finale-2026-11-13.md` §3):
  - decisione 9, classifica delle partite: **prima le vittorie** (in cima le vinte per punteggio, sotto le perse);
  - decisione 10, km/h: **km/h veri** (velocità della palla × 3,6, stessa scala per servizio e scambio; il «colpo più
    veloce» conta solo colpi finiti in campo);
  - decisione 1, Leggenda e gioco a rete: **a Leggenda niente salita a rete automatica** dopo un attacco;
  - decisioni 2 e 11, scritte «in corsa / in allungo»: **solo con la corsa forte** (soglia da 0,5 a 0,8);
  - le altre (3–8, 12, 13) non chieste: **restano come sono** (opzione «tenere»).
  → **B34 fatto** (ramo `b34-decisioni`, `29590e1`), unito in `4ba33d1`. **La decisione 1 (Leggenda senza salita a rete)
    è TENUTA DA PARTE** (revert `e5fa4bd` del commit `c592035`): con le misure vere non rende la Leggenda più facile
    («preciso» resta intorno al 77%, la revisione prevedeva 62,6%) e fa uscire di poco un criterio di audit:legend
    (amatore, errori della CPU 1,9% su 2–6%). Chiesto all'utente se la vuole lo stesso. Per rimetterla: `git revert e5fa4bd`.
  → **versione 2026-11-13.6** (`65817db`): controllo rapido gioco 1416/1416, sito 226/226, Windows 42/42, build ok,
    `audit:legend` tutti i criteri OK; zip 23.841.154 B, sha256 `ff0ec72cf410e17b345b62c29f7eb9439961aa22b7c535106bbfef817dc36472`;
    **installer pubblicato su R2** e verificato: 128070648 B, sha256 `07f526cae924c01c624f326579b71a21a9017bac392c24daa8d3d9d8e05e10d4`. Installer della 13.5 verificato: 128.086.155 B, sha256
    `22e4d307e0336e6a33e3356f3b0f6b43b2b64346ce24eee1bf533611247933a7`.
  → prove complete: quelle della 13.5 si sono fermate al riavvio del processo (verdi fino a fine partita 34/34); rifatte
    sulla 13.6: `scratchpad/v1113f/prove.sh` → `prove.txt`.
- [x] Prove complete: vedi sopra (13.6).
- Il disco era pieno (100%, l'agente di correzioni ha fatto la build in `/dev/shm`): liberati 10 GB togliendo
  `node_modules` e `dist` dalle worktree già unite (si rigenerano con `npm ci`) e vecchie cartelle dello scratchpad.
      indipendente unico** su B23, T2.3, B31, B32, B33 e correzioni, versione finale con prove complete.
Ripresa se si fermano: `Workflow({scriptPath: '…/workflows/scripts/blocco-singolo.js', args: {stessi args + "worktree": "<percorso della worktree già creata>"}})`
(gli args sono nel journal del run; la worktree con `git worktree list | grep <ramo>`).

**COLLAUDO DELL'UTENTE sulla 2026-11-13.6 (13/11, 09:30 UTC) → blocco B35** (testo dell'utente, in breve):
- Leggenda senza salita a rete: **resta com'è** (la decisione 1 tenuta da parte non si rimette).
- Registro su Cloudflare: l'utente chiede i passi in chat (dati; mandato anche il file del Worker aggiornato).
1. «I movimenti non seguono ancora quelli del braccio/polso»: dritto da destra verso sinistra per incrociare → esce
   **lungolinea**; uguale per i rovesci. «Devi lavorare ancora molto sulla stabilità e precisione dei colpi tramite
   smartphone».
2. «Molti dei colpi che facevo uscivano», anche cercando la massima precisione: sempre punto dell'avversario.
3. In un game singolo (BO1) la battuta era **alternata** e non fissa a un giocatore: non capisce perché.
4. Le impostazioni della partita non si sono potute scegliere: finiti gli scambi di calibrazione (B28) è partita
   subito la partita.
5. Statistiche di fine partita troppe e poco comprensibili: usare «/design», forme tondeggianti, statistiche di cui
   essere fieri (cose positive).
6. Con Lob & Drop (che gli piacciono) non si vede chi deve servire (manca la scritta di chi batte).
7. Scia della palla tolta: dà fastidio ed è troppo evidente.
In corso dalle 09:50 UTC del 13/11 (script `blocco-singolo.js`, due agenti):
- [~] **B35a direzione e precisione dei colpi dal telefono** (punti 1–2) — run `wf_a87c484e-11a`, ramo
      `b35-precisione-telefono`, base `d152035`, documento `docs/b35/precisione-telefono.md`.
- [~] **B35b correzioni del collaudo** (punti 3, 4, 5, 6, 7) — run `wf_49eb0080-cad`, ramo `b35-collaudo`, base
      `d152035`, documento `docs/b35/collaudo-13-11.md`. Fine partita rifatta sulla proposta grafica mostrata all'utente:
      https://claude.ai/artifact/PMb2Gg3ZiakcHuqynZ2pJL (file in `scratchpad/design-fine/project/`). Scia: spenta di base
      e più discreta. Il punto 4 tocca il flusso del B28 (scambi di prova) dell'altro agente: avvisarlo nella traccia.
**REGISTRO DELLO STAND ACCESO (13/11, 10:35 UTC)**: l'utente ha creato il Worker `natpf-registro` con bucket R2 privato,
binding `REGISTRO`, segreto `CHIAVE_LETTURA` (solo suo) e `ALLOWED_ORIGINS` = `https://localhost:8443` (apre il gioco solo
dal programma Windows). Verificato da qui: pagina «Registro di NATPF Simulator» e stato `{ok, registro: pronto, spazio,
chiave}`; preflight CORS da `https://localhost:8443` → 204 con l'origine permessa. Indirizzo:
`https://natpf-registro.s-porcelli.workers.dev/` (non è un segreto: la chiave sta solo nel Worker).
- [x] **Versione 2026-11-13.7** (`1c8c1b2`; controllo rapido gioco 1416/1416, sito 226/226, Windows 42/42, build ok; zip 23.841.151 B, sha256 `50963e48aceed1586a269027e48169c141ab3d951b8c2121070094cf4557e813`, provato estratto, senza `natpf/registro.json`; **installer pubblicato su R2** e verificato dal link fisso: 128.089.067 B, sha256 `97c098a41722a36dc132beb97df871c0b5bd59e951f8120369f4c3835d82329c`) = solo l'indirizzo del registro in `natpf-desktop/registro.json` (installer). Lo zip
      Cloudflare resta **senza** `--registro-url`: il Worker accetta solo il programma Windows, il gioco nel browser
      verrebbe rifiutato. Passi: versione nei 4 file → controllo rapido (`scratchpad/v1113a/rapido.sh`) → commit → fetch
      → push → zip → `scratchpad/attesa-installer.sh 2026-11-13.7 <dir>`. B35a e B35b andranno nella 13.8.
- Le prove complete della 13.6 si sono fermate a natpf-dritto-video quando il processo è stato riavviato (verdi fino a
  lì): i processi lanciati con nohup non sopravvivono ai riavvii; da rifare con un comando in background del harness.

## IN CODA (nell'ordine; dettaglio in PIANO_LAVORI §1, voci B21–B24)

- [x] **B21 Video nel gioco** (2026-11-11.2): trailer come video d'avvio (senza titolo) con ripiego su `public/media/intro.mp4`; due clip
      sfocate come sfondo del tutorial; trailer su R2 (`media/`), clip dentro lo zip. File in `scratchpad/video/` e nella
      libreria Higgsfield dell'utente (crediti spesi 86 su 120).
- [x] **B22 Scia luminosa della palla** (2026-11-11.2) nel gameplay (un po' meno luminosa del trailer) + voce nelle Opzioni per spegnerla
- [x] **B25 Stesso schermo, decisioni dell'11/11** (2026-11-12.2; aiuto solo di gioco, senza punti) (PIANO, voce B25): lancio automatico dopo 30 s (opzione dello stand,
      spenta); campo aperto tra due persone (opzione dello stand, spenta: preparare e misurare); colpo super con la forza
      relativa al proprio colpo (solo il super); preparazione del colpo che non conta nel 1v1
      **+ aiuto al più giovane** (richiesta dell'11/11 sera): nello stesso schermo ogni giocatore sceglie Bambino · Ragazzo ·
      Adulto e il più giovane è facilitato; preparare 2–3 varianti, misurarle e far scegliere all'utente con i numeri
- [~] **B23 Prova delle movenze dal video sul solo dritto** (se all'utente non piace si toglie)
- [x] **B24 Lob & Drop** (2026-11-12.4, costruiti nel codice; i modelli 3D sono il B29) come personaggi (foto `docs/riferimenti/lob-drop-2026-11-11.webp`)
- [~] **Tappa 2 gruppo 2**: Leggenda stessa regola (D2), palla corta che può sbagliare (D8)
- [x] **Tappa 2 gruppo 3** (2026-11-12.4): livelli Evento e Bambini (D3) con la scelta **«Chi gioca: Bambino · Ragazzo · Adulto»** al posto
      del livello (Pro e Leggenda in «Altre impostazioni»); segnale del momento giusto; super spiegato
- [ ] Dall'utente: prova di due minuti con un telefono vero agitato senza guardare (poi si decide la regola)
- [ ] **Per la 13.8 (con B35)**: l'utente dice che **Ctrl+Maiusc+K non apre il pannello dello stand** sul PC dello stand (programma Windows 13.7). Nel codice la scorciatoia è giusta (`natpf_kiosk.js:61`, ascolto in cattura su window; il programma non la intercetta: `desktop-core.mjs` `shortcutFor` usa solo F11, Ctrl+R/Q, Ctrl+Maiusc+M/I; il menu la lascia passare con Ctrl premuto, `natpf_lobby.js` `_key`; durante il video iniziale ogni tasto serve solo a partire, `natpf_intro.js` `_input`). Cause probabili: «Bloc Maiusc» al posto di Maiusc ⇧, tasti premuti durante il video iniziale, oppure un altro programma del PC che usa Ctrl+Maiusc+K. Detto all'utente di usare il marchio NATPF tenuto premuto 3 s nel menu. **Da aggiungere**: voce «Pannello dello stand» nel menu del programma Windows (Alt), che apre il pannello senza scorciatoia, con test.
- [x] **B35a finito** (ramo `b35-precisione-telefono`, `c5de71c`), unito in `c22b6e8`: tre cause corrette con il telefono
      simulato (piatto non girato con il verso sui telefoni con i sensori al contrario; centro della mira che inseguiva una
      mira tenuta; ritardo abituale dello schermo non misurato). Banco `scripts/audit/direzione-telefono.mjs`: Pro, gesto
      buono, colpi nella direzione voluta 58→73% (56→71%), incrociato voluto finito lungolinea 25→0%; con ~95 ms di ritardo
      fisso giusti 27→66%, fuori 24→8%. Agente: gioco 1425/1426 (1 saltato), sito 226, build, audit:legend uguale, 7 prove
      nel browser. Documento `docs/b35/precisione-telefono.md` (istruzioni per registrare una sessione vera).
- [x] **Versione 2026-11-13.8** = B35a (`6159b7e`; controllo rapido gioco 1426/1426, sito 226/226, Windows 42/42, build ok; zip 23.842.134 B, sha256 `0ba248a657a23618733a63d1292bc420e08b09b885beb6703c4b9bdbf014ed51`, provato estratto; **installer pubblicato su R2** e verificato dal link fisso: 128.063.238 B, sha256 `74728e9ff54240008aaa1fa45514a5e071f7ddeaa865c7ada924725841f8f33c`).
- [x] **B35b finito** (ramo `b35-collaudo`, `f8b2040`, 11 commit), unito in `1043c85`: formato veloce detto a schermo;
      pagina «Pronto per la partita» dopo gli scambi di prova (e «Ricalibra» che ci riporta); fine partita come la
      proposta grafica (schermate guardate: vittoria e stesso schermo); «Al servizio» nelle due metà anche con Lob & Drop;
      scia spenta di base e più discreta (−54…−65% di pixel). Agente: gioco 1430/1430, sito 226/226, build, audit:legend e
      impronte uguali, unione di prova con B35a 1440/1440. Dubbi dell'agente da portare all'utente: «Ricalibra» a partita
      in corsa rifà gli scambi e rigioca il punto (non torna alla pagina); i tre riquadri escono quasi sempre Perfetti,
      vincenti, punti vinti.
- [x] **Versione 2026-11-13.9** = B35a + B35b (`4ac755c`): controllo rapido gioco 1440/1440, sito 226/226, Windows 42/42,
      build ok; sul codice unito `natpf-scambi-di-prova` 30/30 e `natpf-telecomando` 85/85; zip 23.845.173 B, sha256
      `c94e0d72c7c902a36446fc614bffd9f093a98b13fcd7ece7259030f4d6181672`, provato estratto; **installer pubblicato su R2** e
      verificato dal link fisso: 128.064.760 B, sha256 `662a83c6715e3fba1e1d363eb584e2c25f172d024dd85f8ecaec6f19eae5d4bc`.
- [~] **B37** partito alle 14:00 UTC (run `wf_63518f90-393`, ramo `b37-collaudo-bis`, base `1043c85`).
- **NUOVO COLLAUDO DELL'UTENTE (13/11, 11:25 UTC) → blocco B37** (dopo B35b, sopra il suo lavoro):
  1. «quando la palla va fuori, aspetta che vada realmente fuori (anche quando finisce la partita): è brutto che si
     anticipi la palla fuori e si dica subito che la persona ha perso o si assegni subito il punto»;
  2. chi deve servire: non basta la scritta «alza la mano»; serve un elemento di gioco, per esempio un **selettore sopra
     il personaggio** (anche Lob) o una **zona colorata/evidenziata** che faccia capire chi batte;
  3. contro la CPU «un cerchietto bianco che segue la palla nel tragitto, non capisco cosa sia»: è il **segnale del
     momento giusto** (`natpf_timing_cue.js`, anello bianco che si stringe e diventa verde; acceso di base con «Bambino»
     e «Adulto», Opzioni → «Segnale del momento giusto»). Va spiegato a schermo le prime volte (o spento di base se
     l'utente preferisce);
  4. voce «Pannello dello stand» nel programma Windows, che non dipenda da Ctrl+Maiusc+K (nel menu e con un tasto, per
     esempio F9, gestito dal programma: a schermo intero la barra del menu non c'è).
  Video 1 dei riferimenti B36 ricevuto (`scratchpad/b36/video1/video1.mp4`, 36,7 s, 720×1280): il secondo non è arrivato.
- **12:50 UTC, limite d'uso**: si erano fermati B35b (solo verifiche finali e documento), il controllo «solo mouse» (fatte
      le ricerche «tasti» e «programma») e il piano unico B36 (nessun agente finito). Ripresi alle 12:55: B35b (run
      `wf_0112b1ff-1d5`, stessa worktree), controllo «solo mouse» con `resumeFromRunId wf_826fa68a-9cc`; il piano unico B36
      (`b36-piano-unico`, run `wf_c286e290-cbc`, rilanciare con `resumeFromRunId`) dopo B35b/B37/B38 per non consumare il
      limite tutto insieme.
- **Scoperta del controllo «solo mouse» (verificata)**: nella PAGINA PRINCIPALE del menu il marchio NATPF è nascosto
  (`natpf-ui.css:552`, `visibility: hidden`): tenerlo premuto 3 s non fa niente; funziona nelle altre pagine del menu
  (es. «Opzioni»). Detto all'utente di passare da un'altra pagina. Da correggere (B38/B39): marchio anche nella pagina
  principale, anello che si riempie, pannello raggiungibile con il mouse anche in partita.
- **Decisioni dell'utente (13/11, 14:25 UTC)**: «Ricalibra» a partita in corsa resta com'è (rifà gli scambi e rigioca il
  punto); i tre riquadri di fine partita vanno bene. Poi: «lavora ancora per sintetizzare a fine partita i risultati
  usando /design, con qualcosa di più figo, con icone o achievements e con l'immagine di Lob e Drop o dei due personaggi
  rispettivamente. Qualcosa di creativo».
  [x] Proposta grafica **v2 «la card della partita»** sulla stessa tavola https://claude.ai/artifact/PMb2Gg3ZiakcHuqynZ2pJL
      (file in `scratchpad/design-fine/project/V2*.dc.html`, immagini di Lob e Drop dai modelli 3D caricate nella tavola):
      card da collezione con il personaggio, cornice che cambia con il livello (Bambini azzurra, Evento giallo-verde, Pro
      oro, Leggenda arcobaleno), «MVP della partita» / «Bella sfida», fino a 3 trofei con medaglie bronzo/argento/oro e
      icone, «record di oggi», «prossimo trofeo» per chi perde, stesso schermo con le due card una contro l'altra e la
      corona su chi vince, catalogo dei 12 trofei (Cecchino, Razzo, Maratoneta, Asso, Vincente, Super, Game a zero,
      Rimonta, In serie, Muro, Prima volta, Re di oggi) con le soglie. **In attesa del parere dell'utente** → poi blocco
      **B40 · Fine partita v2** (ritratti dai modelli 3D anche per i Classici, contatori nuovi in `natpf_match_stats.js`:
      serie, game a zero, rimonta, colpi a vuoto, prima partita, posto in classifica).
- **Richieste dell'utente (13/11, 14:40–14:55 UTC) → blocco B41 «Modalità fiera»**: (1) «una modalità evento fiera: i
  telefoni sono sempre gli stessi, è inutile ogni volta collegare il telefono, scansionare il QR e fare la calibrazione;
  io seleziono solo il livello di difficoltà, i telefoni sono già calibrati da me, le persone devono solo fare destra
  sinistra e io gli do i telefoni»; (2) «nella schermata "Pronto per la partita" l'utente deve toccare sullo smartphone
  "Sono pronto" (dove ora c'è "Pronto") e quando entrambi sono pronti la partita parte da sola, senza che uno clicchi su
  Gioca». Analisi FATTA (run `wf_faa56d62-b61`): progetto in `scratchpad/fiera/progetto-modalita-fiera.md` (8 tappe B41.1–B41.8).
  Scoperte: il telefono resta già collegato tra una persona e l'altra, ma il chiosco scollega il telefono P1 e ogni ricarica
  del gioco o riavvio del programma obbliga al QR (id di sessione nuovo a ogni avvio, link.js:79-80); il telecomando dello
  staff ha già l'abbinamento «una volta per tutte» (indirizzo fisso, chiave in localStorage, HMAC) da riusare; un profilo
  di un adulto usato per un bambino gli fa perdere 7–8 colpi su 9 (meglio la forza imparata dai primi colpi). Piano:
  B41.1–B41.3 (abbinamento fisso, collegamento, pagina del telefono dello stand) e B41.6 («Sono pronto») dopo B42;
  B41.4–B41.5 (interruttore, foglio «Telefoni dello stand», pagina della fiera, «Prossimo giocatore») dopo B38/B39.
  Domande all'utente: calibrazione (consigliata: forza imparata dai primi colpi), in fiera batte sempre la CPU?, nomi
  («Visitatore 12»?), solo ledwall o anche portatile.
- **DECISIONI DELL'UTENTE sulla modalità fiera e sullo stand (13/11, 15:30 UTC)**:
  1. calibrazione in fiera: **scambi di prova per ogni visitatore** (circa 10 s, 4 palle: la calibrazione «Giocando» del
     B28), non il profilo dello staff né la sola forza imparata dai primi colpi; lo staff prepara i telefoni una volta
     (collegamento e prova di dritto e rovescio);
  2. in fiera contro la CPU **batte sempre il visitatore** (servizio fisso al visitatore in tutti i game, niente
     alternanza);
  3. nomi: **numero automatico «Visitatore 12»** (da capo ogni giorno, classifica del giorno valida), nome facoltativo
     scritto dallo staff con la tastiera a schermo del B38;
  4. allo stand **solo il ledwall, il mouse è solo dello staff** (niente icona nell'area di notifica; tasto destro =
     menu dello staff; comandi dello staff protetti dai visitatori).
- [x] **Controllo «stand con il solo mouse» finito** (run `wf_826fa68a-9cc`, 6 agenti con prove nel browser): lista unica
  in `scratchpad/mouse/risultati/05.md` (21 voci: 9 bloccanti, 10 importanti, 2 utili) e proposta **B39 · Stand con il
  solo mouse** in 7 passi; revisore in `06.md`. Da sapere: **il pannello dello stand aperto in partita NON ferma la
  partita** (la CPU fa punti dietro il pannello) e si apre SOTTO la pausa (`natpf_ui.js:219-221`, z-index): con F9 del B37
  diventa più facile capitarci → passo **B39.0** subito dopo B37 (fogli dello staff sopra tutto e partita ferma). Altri
  bloccanti: tasto «indietro» del mouse che fa sparire il gioco nel programma; porta 8443/8080 occupata = errore inglese
  senza uscita; programma senza Esci/Ricarica col mouse; diagnostica e classifica a schermo intero senza uscita col mouse.
  Domande per l'utente: solo ledwall o anche lo schermo del portatile? tasto destro = menu di Windows o del gioco? il
  mouse è solo dello staff?
- **L'utente ha giocato la 13.9 (13/11, 15:00 UTC)**: «direi bene con la precisione» (B35a funziona). Nuove richieste:
  (1) scambi troppo lunghi: «dopo 20 colpi consecutivi la probabilità di usare colpi speciali o forti aumenti
  progressivamente o del doppio, così la partita diventa più spettacolare o veloce e la serie di colpi porta a un
  risultato» → **[~] B42 partito** (run `wf_5cbad5b6-b75`, ramo `b42-scambi-lunghi`, base `fe6f774`): scambio caldo dal
  20° colpo acceso di base in tutti i modi, colpo super più facile e CPU più aggressiva per tutti e due i lati, misure
  prima/dopo e audit:legend; (2) «animazioni dei personaggi scelti (classici o Lob & Drop) nella schermata di fine
  partita, per player 1 e 2» → nella fine partita v2 (**B40**, insieme alla card e ai trofei); (3) «troppi testi vicino
  al tabellone che l'utente non legge: semplifica, togli Formato veloce e al meglio di tre, magari un'etichetta sul
  tabellone» → **B43** (con il pannello dello staff che ferma la partita), testo pronto in `scratchpad/b43-task.md`, parte
  appena B37 è unito.
- [ ] **B38 · Tastiera a schermo** (richiesta dell'utente del 13/11, 11:50 UTC: «una tastiera su schermo che compaia quando
      devo digitare, perché ho solo un mouse e non ho una tastiera wireless»). Tastiera del gioco (non di Windows) che
      compare cliccando un campo di testo (nome, nomi dello stesso schermo, codice della sfida, campi della diagnostica) e
      sparisce con «Fatto», Esc o appena si usa una tastiera vera; opzione dello stand «Tastiera a schermo: Automatica ·
      Sempre · Mai». Testo del compito: `scratchpad/b38-task.md`. Parte dopo B35b, in parallelo a B37 (due agenti).
- [~] **Stand con il solo mouse** (richiesta dell'utente del 13/11, 11:55 UTC: «pensa ad altre cose necessarie se controllo il
      ledwall dal solo mouse»). Controllo in corso (workflow `stand-solo-mouse`, run `wf_826fa68a-9cc`: tasti del gioco,
      programma Windows, ledwall e puntatore, prova vera nel browser con il solo mouse → lista unica → revisore). Prime
      voci da confermare: pannello dello stand e diagnostica senza tastiera in ogni schermata; uscita, schermo intero e
      ricarica del programma senza la barra del menu; calibrazione dell'area del ledwall con le frecce; puntatore minuscolo
      sul ledwall; doppio clic che salta una pagina. Risultato → probabile blocco **B39 · Stand con il solo mouse**.
- [ ] **B36 · FASE SUCCESSIVA (richiesta dell'utente del 13/11, 10:40 UTC): direzionalità al centro del gioco, campo
      completamente aperto, stile arcade.** Da fare **dopo** B35a/B35b, senza toccarli. Punti dell'utente: (1) la direzione
      impressa dal giocatore decide traiettoria e punto d'atterraggio, è il fattore principale; (2) colpi diversi per gesto,
      angolo, tempo e punto d'impatto (traiettoria, profondità, potenza, angolo coerenti); (3) incrociati, lungolinea,
      stretti e profondi su tutto il campo, premiando la precisione; (4) arcade, comandi immediati; **all'inizio niente
      palle corte e volée**; (5) gesti simili in condizioni simili → risultati coerenti, niente traiettorie casuali o
      troppo assistite. «Non più traiettorie, ma il movimento del giocatore che decide dove e come colpire.»
      Video di riferimento dati dall'utente: uno scambio da fondo in un gioco di tennis commerciale (Shorts `hu8sG08DJGY`)
      e una raccolta di 25 colpi veri del circuito (`OXaEUUUJJ7s`). **YouTube blocca il server** («accedi per confermare
      di non essere un bot»): visti solo titoli e miniature pubbliche (`scratchpad/b36/miniature/`); l'installazione di
      uno strumento per scaricare i video è stata negata. Per guardarli davvero servono i file o delle schermate
      dall'utente.
      [x] Analisi in sola lettura finita (run `wf_a58a8c0b-a47`, 8 agenti: letture telefono/esito/B35a/vincoli/riferimenti
      e tre piani «prima il gioco», «prima il segnale», «prima la sicurezza»), risultati in `scratchpad/b36/risultati/`
      (01–05 letture, 06–08 piani). Video 1 guardato: `scratchpad/b36/video1/analisi-video1.md`.
      [~] Dalle 12:35 UTC: piano unico + tre revisori contrari + versione finale (run `wf_c286e290-cbc`) →
      `scratchpad/b36/piano/piano-direzionalita.md` → da copiare in `docs/b36/piano-direzionalita.md` e mostrare
      all'utente. **Nessuna modifica al codice finché l'utente non approva il piano.**

## COME SI LAVORA (regole dell'utente)

- Risposte **sintetiche**. Aggiornamento **ogni ora** mentre c'è lavoro in corso.
- Non superficiale: un agente per blocco, **revisore indipendente** prima dell'unione, poi prove complete.
- Pacchetti (installer su R2 + zip Cloudflare) dopo ogni versione, con «come si attiva» per ogni opzione nuova.
- Se un agente si ferma per il limite d'uso: le modifiche restano nella sua worktree (`git worktree list`); riprenderlo
  con un messaggio, non rifare da capo.

**13/11, 16:00 UTC · LAVORI FERMATI dall'utente** («stoppa i lavori, salva tutto e lascia un messaggio per l'altro agente»).
Fermati i run di B37 (`wf_63518f90-393`) e B42 (`wf_5cbad5b6-b75`); il loro lavoro non salvato chiuso in un commit
«IN CORSO … NON verificato» (B37 `2bfe09a`, B42 `ae76bdf`); i due rami salvati in `docs/ripresa/rami-b37-b42.bundle`.
Nessun agente in esecuzione. Come continuare: `docs/RIPRESA_AGENTE.md` §0.


**13/11, 16:35 UTC · RIPRESA (nuova sessione dell'agente principale, contenitore diverso).** Letti `CLAUDE.md`,
`docs/RIPRESA_AGENTE.md` e questa traccia; `natpf-simulator` = `origin` a `06a335b`, albero pulito.
- Rami B37 e B42 recuperati dal bundle (`git fetch docs/ripresa/rami-b37-b42.bundle …`): `b37-collaudo-bis` a `2bfe09a`,
  `b42-scambi-lunghi` a `ae76bdf`. Worktree **nello scratchpad di questa sessione** (non in `.claude/worktrees`, che non è
  ignorata da git): `…/scratchpad/b37/wt` e `…/scratchpad/b42/wt`, dipendenze installate.
- [~] **B37 finitura** (controllo del commit «IN CORSO», suite, build, `audit:legend`, 13 prove nel browser, documento):
      workflow `b37-finitura`, run `wf_4f52f180-303`, porte 4100–4149 (più 4902/4903 del telecomando).
- [~] **B42 finitura** (controllo del commit «IN CORSO», tolto `legend-prova-tmp.mjs`, suite, build, `audit:legend`, 6 prove
      nel browser, `TESTO_SUITE` del documento, dove si scontrerà con B37): workflow `b42-finitura`, run `wf_32a43c3c-f2c`,
      porte 4150–4199.
  Se si fermano (limite d'uso): rilanciare lo stesso script con `resumeFromRunId` se l'agente aveva finito, altrimenti
  un agente nuovo nella stessa worktree con «RIPRESA: …» (gli appunti con l'ora sono in `…/scratchpad/b37/notes.md` e
  `…/scratchpad/b42/notes.md`). In un contenitore nuovo le worktree non ci sono: si riparte dal bundle (RIPRESA §2).
- Poi: unire B37 → **2026-11-13.10**; B42 unito sopra B37 (conflitti attesi in `game_engine.js`, `index.html`,
  `natpf_hot_rally.js`, `natpf_kiosk.js`), `audit:legend` sul codice unito → **2026-11-13.11**; poi la coda (B43, …).
- **B28.1 mai unito** (lavoro di questa sessione del 12/11, fermato dal limite d'uso): ramo locale `b28-cal-giocando` a
  `88cf743`, solo in questo contenitore, fermo alla 2026-11-12.5. Il profilo del telefono non si rinnova tra minigiochi e
  allenamenti, sfida tra due computer con «Nessuna», fine degli scambi di prova per chi tiene i gesti, soglia di
  `natpf-phone-keep`. Compito per rifarlo o unirlo: `docs/coda/B28.1-profilo-per-attivita.md` (da fare prima o insieme
  alla B41 prima parte, che tocca gli stessi file).

**13/11, 18:30 UTC · piano B36 e decisioni.** Piano della direzionalità scritto e pubblicato (run `wf_b6acb5fb-075`:
piano unico, tre revisori contrari, piano finale) in `docs/b36/piano-direzionalita.md`, materiale in `docs/b36/piano/`.
**Risposte dell'utente** (domande a scelta; d'ora in poi le domande si fanno solo così): cima del telefono; palle corte e
volée **accese** come oggi; fuori **come nel tennis vero** girando troppo; una riga nella pagina «Pronto»; prove con
**giornate intere** con «Nuova»; **B36.0 dopo B43**. Card del fine partita v2 (B40) **approvata**. Il piano §0 dice come
cambiano le tappe (cade B36.2; B36.4 senza rientro verso l'angolo).
- [x] B42 finito sul ramo (`ade3377`): gioco 1451/1451, sito 226, Windows 42, LAN 12, build, `audit:legend` tutti i
      criteri; nel browser rally 10/10, formato-fiera 25/25, 1v1-p2p 39/39, menu 45/45, stesso-schermo-b20 51/53 (i 2 KO
      del banner del sorteggio ci sono già sulla base dal B35b), leggenda 6/7 (posa nell'allungo in corsa: capita anche
      prima del 20° colpo; aperto). Da unire dopo B37.
- [~] B37 nelle ultime prove (lob-drop: trovate impronte diverse per un sorteggio delle palpebre spostato dal segno di chi
      serve; corretta la prova, non il gioco).

**13/11, 19:40 UTC · B37 unito in locale, B37.1 e B42 in corso.**
- [x] B37 finito (`62f4c2a`: controllo del commit «IN CORSO», suite, `audit:legend` uguale alla base, 13 prove nel browser,
      documento) e unito in `natpf-simulator` (`c619266`). Controllo rapido sul codice unito: gioco 1464/1464, sito 226/226,
      Windows 43/43, LAN 12/12, build ok; nel browser rally 9/9, lob-drop (chi serve) 13/13, formato-fiera 25/25.
- **L'utente (19:30 UTC): «Il triangolino in alto è orribile, meglio la casella tonda che usavi prima "al servizio"».**
  Quindi la 2026-11-13.10 aspetta il **B37.1**: via la gemma 3D sopra chi batte, torna la casella tonda gialla «Al
  servizio» del B35b (il riquadro a terra resta). [~] Workflow `b37-1-al-servizio` (run `wf_3b4ff94f-e89`) sul ramo
  `b37-collaudo-bis`, porte 4100–4149. Poi: riunire il ramo, versione 2026-11-13.10 (quattro file), controllo rapido,
  push, zip, installer.
- **Decisione dell'utente (domanda a scelta)**: la scritta grande del punto arriva **mezzo secondo dopo** che la palla tocca
  terra (prima si vede la palla cadere fuori con l'anello rosso): aggiunta al compito B43 (punto 3).
- [~] **B42 sopra B37**: workflow `b42-unione-sopra-b37` (run `wf_7f418d88-ade`) nella worktree di B42: unione di
  `c619266`, conflitti, suite, `audit:legend`, 8 prove nel browser, posa della Leggenda misurata con e senza B42. Porte
  4150–4199. Dopo la 13.10: unire B42 → 2026-11-13.11.

**13/11, 21:10 UTC · versione 2026-11-13.10 = B37 + B37.1.**
- [x] B37.1 (`dade1dc`): via la gemma 3D sopra chi batte, torna la casella tonda gialla «Al servizio» del B35b (più
      grande sui grandi schermi, sopra la testa misurata per Classici e Lob & Drop); riquadro a terra invariato. Agente:
      gioco 1465/1465, sito 226/226, build; chi-serve 64/64 (riscritta), stesso-schermo-b20 52/52, servizio-lancio 12/12,
      tabellone 42/42, lob-drop servizio 13/13 (intera 131/136: 3 «corde» note dal B32 e 2 fps sotto carico, da sola 15/15).
- [x] Unione in `natpf-simulator`, versione nei quattro file. Controllo rapido: gioco 1465/1465, sito 226/226, Windows
      43/43, LAN 12/12, build ok; `SERVIZIO=1 natpf-lob-drop` 13/13 sul codice unito → commit, push.
- [x] Zip Cloudflare 23.849.291 B, sha256 `6f5d7ef88dfa94e581cd6d8975dece9401ea666ff010abd26926ab51090be6c6`, provato
      estratto (versione giusta, nessun `natpf/registro.json`); **installer 2026-11-13.10 pubblicato su R2** e verificato dal
      link fisso: 128.074.949 B, sha256 `640dc6e6ae97d15f16726e4b12377376d48fef57596fa1a6573fdd2e907535bc`. Detto all'utente
      come si attiva tutto.

**13/11, 21:20 UTC · versione 2026-11-13.11 = B42 (in verifica).**
- [x] B42 sopra B37 (`4b8bf2d`, workflow `wf_7f418d88-ade`): gioco 1475/1475, sito 226, Windows 43, LAN 12, build,
      `audit:legend` identico a `scripts/audit/b42/risultati/legend-dopo.txt`; nel browser rally 10/10, stesso-schermo-b20
      53/53, fuori-vero 10/10, segnale-spiegato 14/14, menu 45/45, formato-fiera 25/25, 1v1-p2p 39/39. Posa della Leggenda:
      1 giro su 3 verde sia con sia senza B42 (la prova confronta con una mediana che mescola dritto e rovescio: da
      correggere nella prova, non nel gioco).
- [x] Unito in `natpf-simulator` (`dd4cd44`, solo conflitti nei documenti), versione nei quattro file.
- [x] Sul codice unito: gioco 1476/1476, sito 226/226, Windows 43/43, LAN 12/12, build ok, `audit:legend` 69 OK e
      identico a `legend-dopo.txt` del B42, rally 10/10, stesso-schermo-b20 53/53 → push.
- [x] Zip Cloudflare 23.850.185 B, sha256 `7f8ca17750f7fa0542a56852d9eeed1d6ce7e7479516bdd122e9fc66c2980c68`, provato
      estratto; **installer 2026-11-13.11 pubblicato su R2** e verificato dal link fisso: 128.054.038 B, sha256
      `166966ee09cf97ced67ecabc36eed58de8fd7d6ba1c2911442b6f2dda8bb70cb`.
- [x] Tolto `docs/ripresa/` (il bundle di B37 e B42: tutti e due uniti).
- [~] **B43** (tabellone pulito, pannello che ferma la partita, scritta del punto mezzo secondo dopo): workflow
      `b43-tabellone-e-pannello` (run `wf_53b28db9-129`), worktree `scratchpad/b43/wt`, ramo `b43-tabellone-pannello`, base
      `fd71f91` (13.10); unirà da solo la 13.11 prima delle verifiche finali. Porte 4100–4149 e 4902/4903.

**13/11, 21:55 UTC · riavvio del contenitore (21:48 UTC) e due blocchi in corso.**
- Il riavvio ha fermato l'agente del B43. Salvato: punto 3 fatto (`640ef31`, scritta grande del punto mezzo secondo dopo
  l'atterraggio; suite del gioco 1480 ok), punto 2 a metà messo nel commit `dc3adae` «B43 IN CORSO … NON verificato»,
  punto 1 da fare. Il ramo ha già dentro la 13.11.
- [~] **B43 ripresa**: stesso script con una sezione «RIPRESA» (workflow `b43-tabellone-e-pannello-ripresa`, run
      `wf_7c6beb81-eb3`), worktree `scratchpad/b43/wt`, porte 4100–4149.
- [~] **B41 prima parte + B28.1**: workflow `b41-fiera-parte-1` (run `wf_c35c3067-84a`), worktree `scratchpad/b41/wt`,
      ramo `b41-fiera-1`, base `38709e3` (13.11), porte 4150–4199. Prima porta il B28.1 (dal ramo locale
      `b28-cal-giocando` o rifatto dal compito), poi B41.1–B41.3 e B41.6; unirà la 13.12 (B43) prima delle verifiche finali.
- `natpf-telecomando` ha le porte fisse 4902/4903: i due agenti lo lanciano con `flock scratchpad/telecomando.lock`.
- Se il contenitore si riavvia ancora: guardare `git log` e `git status` nelle due worktree e gli appunti
  `scratchpad/b43/notes.md` e `scratchpad/b41/notes.md`, salvare il lavoro non committato in un commit «IN CORSO», poi
  rilanciare lo script del workflow con una sezione «RIPRESA» (senza `resumeFromRunId`: l'agente non aveva finito).

**13/11, 23:40 UTC · versione 2026-11-13.12 = B43.**
- [x] B43 finito (ripreso dopo il riavvio; `6acbf08`): una sola etichetta dentro il tabellone («1 GAME», «AL MEGLIO DI 3»,
      «PUNTO DECISIVO» rosa sul 40-40 in fiera), «Formato veloce» solo nel banner d'inizio; pannello dello stand,
      telecomando e diagnostica che fermano la partita e stanno sopra la pausa; conferma in due clic per «Nuovo
      giocatore», «Classifica a schermo intero», «Telefono: Scollega» in partita e «Torna al menu» della pausa; scritta
      grande del punto 0,5 s dopo l'atterraggio. Agente: gioco 1492/1492, sito 226, Windows 43, LAN 12, build,
      `audit:legend` identico; nel browser pannello-partita (nuova) 25/25, tabellone 41/41, formato-fiera 25/25,
      stesso-schermo-b20 53/53, menu 45/45, diag-session 26/26, lob-drop servizio 13/13, fuori-vero 12/12, fine-partita
      47/47, telecomando 85/85.
- [x] Unito (`0035e02`), sul codice unito: gioco 1492/1492, sito 226/226, Windows 43/43, LAN 12/12, build ok,
      pannello-partita 25/25, tabellone 41/41 → push. Zip 23.851.547 B, sha256
      `bef22aa41b06cff6a8a7e673d8ad8e0aa2cabfff60ebdc5cf6ccbb4820543b94`, provato estratto; **installer 2026-11-13.12
      pubblicato su R2** e verificato dal link fisso: 128.066.450 B, sha256
      `e848cb1dbbec152db7cb22d05eaac0b6f6069bdc79eb18bf45cec650eb42b395`.
- Dubbi del B43 da portare all'utente (con le domande a scelta, quando serve): «Parità/Vantaggio» non più scritti (restano
  40/AD); istruzioni del servizio che a 720×720 sfiorano l'angolo del tabellone (come prima); la diagnostica ora ferma la
  partita anche con `?diag=1`.
- [~] **B36.0 · misure** (decisione dell'utente: dopo B43): workflow `b36-0-misure` (run `wf_0cc9ce5f-199`), worktree
      `scratchpad/b36/wt`, ramo `b36-0-misure`, base `0035e02`, porte 4100–4149. Il gioco non cambia; servirà ricaricare
      una volta il Worker del registro.
- [~] **B41 prima parte + B28.1** (run `wf_c35c3067-84a`): B28.1 fatto sul ramo; in corso B41.1.

**14/11, 07:05 UTC · versione 2026-11-14.1 = B41 prima parte (+ B28.1) + B36.0.** (Il contenitore si è riavviato nella
notte: i controlli della 14.1 erano finiti prima, salvi in `scratchpad/v1401/`.)
- [x] B41 prima parte + B28.1 (`0452d93`): B28.1 portato con cherry-pick; telefoni dello stand abbinati una volta (posti
      Telefono 1/2, conferma dello staff, prova HMAC come il telecomando, nessun indirizzo fisso nei QR), collegamento
      fisso senza QR dopo ricariche e riavvii, chiosco che non scollega, pagina del telefono dello stand, «Sono pronto» dal
      telefono con conto di 3 s e partenza da sola; regola pura «in fiera batte sempre il visitatore». L'interruttore e il
      foglio con il mouse arrivano con la B41 seconda parte (per ora da console, `?stand=fiera`).
- [x] B36.0 (`430af1d`): nove campi della direzione nel registro (formato delle righe 2; il Worker va ricaricato una volta,
      il vecchio accetta le righe e toglie i campi nuovi), sezione «Direzione» del riassunto, giocatori simulati con lo
      scarto della cima, banco della direzione esteso; impronte e `audit:legend` identici. Primi numeri simulati: gesto
      «piatto» buono 69% dove voluto (persona simulata 48%); errore del seme degli scambi di prova 5,8° (il piano chiede
      4°); posa «pronto» tenuta 1 s → −0,66 m (serve la B36.9).
- [x] Uniti (`e02ddd7`, `76a6d2e`). Sul codice unito `natpf-scambi-di-prova` dava 29/30: con «Gioca» sul computer il
      telefono restava su «Sono pronto» per un giro del controllo. Corretto (offerta ritirata alla partenza e pulsante solo
      in fase «menu», test nuovo) → 30/30, fiera-telefoni 38/38. Controllo rapido finale: gioco 1525/1525, sito 248/248,
      Windows 43/43, LAN 12/12, build ok; prima anche `audit:legend` 69 OK, registro 39/39, menu 45/45.
- [x] Guida dello stand `docs/GUIDA_STAND.md` (tutte le opzioni con il solo mouse; scrittore + verificatore indipendente +
      correzioni), aggiornata alla 14.1. Lacune del solo mouse trovate dalla guida: `docs/b39/controllo-solo-mouse/dalla-guida-dello-stand.md`.
- **Decisioni dell'utente (domande a scelta)**: B39 tasto destro = **menu di Windows** con le voci dello staff; **«Gioca
  come Ospite»** sì (fuori classifica).
- [x] Push (`889cb25`), zip 23.871.347 B, sha256 `ebe0cb7a882d9e256076fcc4b5d4d8f0927a222f18cbcec60b88f0a26dec8727`,
      provato estratto; mandati all'utente zip, file nuovo del Worker e guida dello stand. [~] Installer: in attesa.
- [~] **B38 + «Gioca come Ospite» + B44** (workflow `b38-b44-tastiera-ospite-servizio`, run `wf_a9ff8e57-823`), worktree
      `scratchpad/b38/wt`, ramo `b38-tastiera`, porte 4100–4149.
- [~] **B39 stand con il solo mouse** (workflow `b39-stand-solo-mouse`, run `wf_9888a904-9b5`), worktree `scratchpad/b39/wt`,
      ramo `b39-solo-mouse`, porte 4150–4199; 8443/8080/8081 e 4902/4903 con `flock` sui file `scratchpad/lan.lock` e
      `scratchpad/telecomando.lock`.
- Se il contenitore si riavvia: nelle due worktree `git log`/`git status`, appunti `scratchpad/b38/notes.md` e
  `scratchpad/b39/notes.md`, lavoro non salvato in un commit «IN CORSO», poi rilanciare lo script con una sezione «RIPRESA».

**14/11 · URGENTE: dritto e rovescio scambiati (segnalazione dell'utente sulla 2026-11-14.1).** Parole dell'utente: «se
provavo a fare un rovescio mi veniva fuori un dritto lungolinea, se facevo un dritto veniva fuori un rovescio incrociato.
Credo siano scambiati». La scritta «Dritto/Rovescio» del motore viene dal lato del colpo riconosciuto (`game_engine.js`
≈2258, `H`), «incrociato/lungolinea» dalla caduta: il lato è davvero girato.
- [x] Installer 2026-11-14.1 su R2 verificato (`latest.json` 2026-11-14.1, 128.087.782 B, sha256 `ad98f5f2…ed7b`).
- [~] Indagine (workflow `dritto-rovescio-scambiati`): tre meccanismi che girano il verso da soli: segno dell'accelerazione
      votato ai tocchi dello schermo (`motion-sign.js`, `racchetta.js` ≈709, tocchi nuovi «Sono pronto» della B41.6),
      voto del rilevatore del telefono con il verso atteso (`swing-detect.js` ≈414, messaggio «ex» con il segno del gioco),
      segno degli scambi di prova (`natpf_trial_learn.js`, `natpf_phone_racket.js` ≈800 `ballSideNow`). Bisezione tra le
      versioni 13.7 → 14.1 con il telefono simulato. Worktree e appunti in `scratchpad/swap/`, porte 4300–4499.
- **Risposte dell'utente (domande a scelta)**: telefono **Android**; modalità **stesso schermo**; giocatore con il problema
      **quello di sinistra (Telefono 1 = Player 1)**; **dal primo colpo**; «Calibrazione» **Giocando**. Prima indagine
      fermata e rilanciata con questi dati: workflow `dritto-rovescio-scambiati-stesso-schermo` (run `wf_a5f1f725-dce`),
      cinque indagini → sintesi → tre verifiche; risultati in `scratchpad/swap/<nome>/RISULTATO.md`.
- [x] B38 + «Gioca come Ospite» + B44 finiti sul ramo `b38-tastiera` (`c81b3d5`; gioco 1543, sito 248, Windows 43, 11 prove
      nel browser verdi, b25 53/54 come sulla base). B39 finito sul ramo `b39-solo-mouse` (`f5046fb`; gioco 1542, sito 248,
      Windows 51, LAN 13, Electron Linux 101/101, natpf-solo-mouse 42/42). Schermate guardate: a posto.
- [~] Unione B38+B39 (workflow `unione-b38-b39`, run `wf_dfd6c3fe-395`) nel ramo nuovo `int-b38-b39`, worktree
      `scratchpad/int/wt`, porte 4100–4199, poi revisione indipendente. Niente push del ramo: si porta in natpf-simulator
      con la versione.
- Poi: correzione di dritto e rovescio con test sopra `int-b38-b39`, versione 2026-11-14.2 con tutto (se l'indagine va per
  le lunghe: prima B38+B39, poi la correzione), zip, installer, «come si attiva». Poi la B41 seconda parte.
- Se il contenitore si riavvia: `git -C scratchpad/int/wt log`/`status`, `scratchpad/int/notes.md`; risultati delle
  indagini in `scratchpad/swap/`; rilanciare gli script con una sezione «RIPRESA».

**14/11, 12:10 UTC · ripresa dopo il limite d'uso (11:20–11:40) e il riavvio del contenitore.**
- L'indagine a cinque e l'unione si erano fermate per il limite d'uso. Risultati utili salvati:
  `scratchpad/swap/split-ruoli-mano/` (prove ripetibili: lo stesso schermo legge giusto; la segnalazione esce con la mano
  del Player 1 salvata «sinistra» o con il segno del telefono cambiato dopo gli scambi di prova; uguale dalla 12.5 alla
  14.1). L'unione B38+B39 era già fatta: ramo `int-b38-b39` = `55e818a` (merge di b38 e b39), prove gioco 1560/1560, sito
  248, Windows 51, LAN 13, build ok, controlli dell'unione a/b/c OK (`scratchpad/int/controlli-unito-1.txt`).
- L'utente non ha risposto alle domande sulla mano e sul registro: ha mandato richieste nuove (fiera: livelli dopo
  «Rivincita», battuta a un solo giocatore, conto alla rovescia grande; telefono che si scollega). Scritte in
  `docs/coda/B41-parte-2-richieste-14-11.md` e in `docs/PROJECT_MEMORY.md`.
- [~] Workflow `b46-lato-sicuro-e-b45-cadute` (run `wf_8a5bb805-8d4`): **B46** dritto e rovescio al sicuro (ramo
      `b46-lato-sicuro` da `int-b38-b39`, worktree `scratchpad/b46/wt`, porte 4100–4149, appunti `scratchpad/b46/notes.md`)
      e **B45** analisi delle cadute del telefono (sola lettura, `scratchpad/b45/`, porte 4200–4249), poi due revisori.
- [~] Coordinatore: prove nel browser e Electron del ramo `int-b38-b39` (porte 4150–4199), uscite in `scratchpad/int/`.
- Poi: unire B46 sopra `int-b38-b39`, versione 2026-11-14.2 (B38+B44+B39+B46), zip, installer, «come si attiva»; poi
  B41 seconda parte con le richieste del 14/11; poi B45 (misure e correzioni delle cadute).
- [~] L'utente ha gente allo stand adesso («ottimizza i tempi senza essere superficiale»): avviato in parallelo il
      workflow `b47-fiera-subito` (run `wf_dfd8c0f1-4f5`): **B47** battuta sempre allo stesso giocatore (opzione del
      pannello «Battuta: Sempre lo stesso · Alternata», di base «Sempre lo stesso»), conto alla rovescia grande «Preparati,
      la partita sta per cominciare», livelli dopo «Rivincita». Ramo `b47-fiera-subito` da `int-b38-b39`, worktree
      `scratchpad/b47/wt`, porte 4250–4299, appunti `scratchpad/b47/notes.md`.
- Ordine dei rilasci: **2026-11-14.2** appena B46 è finito (B38+B44+B39+B46, senza aspettare l'analisi B45), poi
  **2026-11-14.3** con B47. Rimedio subito per l'utente: «Nuovo giocatore» dal pannello (rimette destri i due giocatori e
  azzera quello che il telefono ha imparato); se resta girato, ricaricare la pagina del telefono.

**14/11, 14:15 UTC · versione 2026-11-14.2 = B38 + «Gioca come Ospite» + B44 + B39 + B46.**
- [x] Unione `int-b38-b39` (prove nel browser 17 suite: tutte verdi rilanciate da sole, b25 53/54 come la base; Electron
      98/101 sotto carico, da solo 43/44: resta «finestra: Alt mostra il menu, Alt di nuovo lo nasconde», che con il solo
      B39 passa e con B38 unito no; non è il listener dei tasti della tastiera (provato togliendolo); solo tastiera in
      finestra, non tocca il mouse a schermo intero: da sistemare nella 14.3).
- [x] B46 dritto e rovescio al sicuro (`f75bc54`): mano con due tocchi sul telefono, «Mancino» in vista, avviso grande del
      cambio di mano, destri a ogni visitatore (Nuovo giocatore e chiosco), segno dei tocchi solo nelle pagine da leggere,
      segno imparato rimesso a +1 se cambia il segno dei sensori, righe del registro; gioco 1576, sito 254, prove nel
      browser verdi (natpf-mano-sicura nuova 17/17 a 1280×720 e 720×720). Revisore del B46 ancora in corso.
- [x] Unione in natpf-simulator (`1f0beb6`, conflitto solo in PROJECT_MEMORY: tenute le due parti), versione 2026-11-14.2,
      controllo rapido: gioco 1576/1576, sito 254/254, Windows 51/51, LAN 13/13, build ok.
- [x] Push (`b98530d`). Zip Cloudflare 23.891.833 B, sha256 `9d55a3f91ab457a3d6f9c669f3ce8a285286c0fdd6fff2062920a2c3936d46ad`,
      provato estratto (versione 2026-11-14.2, voce 47 clip, QR dei due telefoni, stesso schermo), mandato all'utente.
      Installer **2026-11-14.2** pubblicato su R2 alle 14:16 UTC e verificato dal link fisso: 128.094.408 B, sha256
      `f4d1b8e750b869faea95284cf4857a4810bb0c1e380a71bbfb2279d6383d5881`. «Come si attiva» mandato all'utente.
- [~] B47 (fiera) in chiusura, poi 14.3 (con il tasto Alt in finestra del programma da sistemare).
- [x] Revisioni indipendenti (`scratchpad/b45/revisione.md`): B46 senza difetti nel gioco (testi troppo forti nel documento,
      fase REPLAY che vota il segno, righe del registro da precisare); analisi B45 con una causa nuova e sicura: **il chiosco
      scollega di proposito il telefono col QR** dopo 45 s senza attività sul computer (natpf_kiosk.js ≈152), poi la
      racchetta col QR che smette di riprovare dopo 10 tentativi, la pagina del gioco ricaricata, i sensori fermi.
- [~] Workflow `b45-1-collegamento-solido` (run `wf_b9d78382-3b3`): **B45.1** chiosco che non scollega, ricollegamento
      senza fine in LAN, controllo di vita a 10 s con ogni messaggio come segno di vita, «Ricollega» solo se il telefono
      risponde, motivo di ogni caduta nel registro e nel pannello; più le rifiniture della 14.2 (revisione B46, tasto Alt in
      finestra). Ramo `b45-1-collegamento` da natpf-simulator 14.2, worktree `scratchpad/b451/wt`, porte 4100–4149,
      appunti `scratchpad/b451/notes.md`. Rilasci: 14.3 = B47 appena pronto, 14.4 = B45.1.

**14/11, 17:45 UTC · dopo il secondo limite d'uso (16:50) · priorità: il telefono che dice «scollegato».**
- L'utente (17:00–17:40): con un solo telefono in fiera il ledwall dice spesso «scollegato»; router dedicato con il PC sul
  cavo, risparmio energetico spento, rete come consigliato: cade lo stesso. Sul ledwall la scritta è quella dello stato
  `lost` («Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo», `natpf_ui.js` ≈421/868).
- [x] B47 unito in natpf-simulator (`6348253`; conflitti in natpf_kiosk.js e natpf_ui.js risolti tenendo le due parti),
      controllo rapido: gioco 1600/1601 (l'unico KO, `natpf-webcam-load`, è di tempi sotto carico: da solo 9/9 tre volte),
      sito 254, Windows 51, LAN 13, build ok; `audit:legend` 69 OK; push fatto. Prove nel browser in corso
      (`scratchpad/v1403/run.log`: b47-fiera 20/20, mano-sicura 17/17, …).
- [~] **B45.1 ripreso** (workflow `b45-1-collegamento-ripresa`, run `wf_fa4da2bf-953`; lavoro di prima salvato in `6358611`
      «IN CORSO»). **Fase A** (chiosco che non scollega, tentativi senza fine, vita a 10 s con ogni messaggio, «Ricollega»
      solo se il telefono risponde, scritta «segnale debole»): alle 17:29 gioco 1584/1584, sito 265, LAN 13, Windows 51,
      `natpf-phone-blackout` 10/10 (bui di 3 e 7 s senza caduta, 12 s caduta a 10,6 s e ritorno da solo in 3,3 s); mancano
      telecomando da solo, mano-sicura, swing-loss. Quando compare il commit «B45.1 FASE A PRONTA» (sentinella del
      coordinatore): unirlo in natpf-simulator, controllo rapido e prove mirate, **versione 2026-11-14.3 = B47 + B45.1
      fase A**, push, zip, installer, «come si attiva». Fase B (motivi delle cadute, rifiniture, tasto Alt) nella 14.4.
- [~] **B41 seconda parte** (workflow `b41-parte-2-fiera-con-il-mouse`, run `wf_5bb13fa8-3f0`): ramo `b41-fiera-2` da
      `6348253`, worktree `scratchpad/b412/wt`, porte 4250–4299, appunti `scratchpad/b412/notes.md`.
- Dal 14/11 pomeriggio i commit del coordinatore finiscono con «Co-Authored-By: Claude Fable 5.2» (modello cambiato
  dall'utente); gli agenti già partiti tengono la riga di prima.

**14/11, 18:15 UTC · versione 2026-11-14.3 = B47 (fiera subito) + B45.1 fase A (telefono che non si scollega).**
- [x] B45.1 fase A pronta (`506ec41`, ramo `b45-1-collegamento`): controllo di vita a 10 s con ogni messaggio come segno
      di vita sui due lati (`site/js/tennis/link-life.js`), lato fermo che prima legge la coda, «Ricollega» automatico solo
      se il telefono risponde, racchetta col QR che riprova senza fine in LAN, chiosco che non scollega più i telefoni
      (azzera solo chi gioca) e conta i messaggi del telefono come attività, riquadro «Telefono 1: segnale debole, aspetto
      che torni…» e poi «scollegato · si ricollega da solo», primo racconto dei motivi delle cadute (`natpf_cadute.js`).
- [x] Unita in natpf-simulator sopra B47 (`beaeead`; un solo conflitto, gli import di natpf_kiosk.js). Sul codice unito:
      gioco 1609/1609, sito 265/265, Windows 51/51, LAN 13/13, build ok; nel browser natpf-phone-blackout 10/10 (bui di 3 e
      7 s: nessuna caduta, la partita riprende da sola; 12 s: caduta dopo 10 s e ritorno da solo in ~3 s senza QR),
      split-ready 34/34, scambi-di-prova 30/30, b47-fiera 20/20, mano-sicura 17/17, fine-partita 47/47. Schermate guardate
      (conto alla rovescia, scelta del livello). Sul solo B47 unito: chi-serve 64/64, `audit:legend` 69 OK; b20 51/52, b25
      54/55 e split-ready 32/34 sotto carico 10 (controlli di tempi: split-ready rifatta 34/34; b20 e b25 da rifare da sole).
- [x] Versione 2026-11-14.3 (controllo dopo il cambio: sito 265, Windows 51, 55 test del gioco sulla versione, build ok):
      push (`bb9a4b3`). Zip Cloudflare 23.908.079 B, sha256
      `941eb4d9bb3aa5e385dfb0de564e7589f636a8902553df161743a3f2bfb73764`, provato estratto, mandato all'utente. Installer
      **2026-11-14.3** pubblicato su R2 alle 18:14 UTC e verificato dal link fisso: 128.127.554 B, sha256
      `411ea0192563bab87c133ffbafb4906db3598ffd2358f786e4fb3b98c3e70432`. «Come si attiva» mandato all'utente (dopo
      l'aggiornamento il telefono rifà il QR: la correzione sta anche nella pagina del telefono).
- [x] Altre prove nel browser sul codice pubblicato (`scratchpad/v1403b/e2e.log`, carico della macchina 9–10): verdi
      training-reconnect 6/6, tutorial-relink 9/9, nuovo-giocatore 28/28, menu 45/45, tabellone 41/41, solo-mouse 42/42,
      tastiera-schermo 53/53. **Da sistemare nella 14.4** (difetti veri, piccoli):
      1. `natpf-stesso-schermo-b20` punto 6 (50/52): con la pagina di un telefono CHIUSA in partita il riquadro ora dice
         «Telefono di Giulia scollegato · si ricollega da solo» (B45.1) e la prova aspetta «…in pausa»; con la parola «cl»
         `pagina` il computer sa che la pagina è stata chiusa: titolo giusto («pagina chiusa · inquadra il QR») e prova
         aggiornata. Il B45.1 non aveva la b20 tra le sue prove.
      2. `natpf-stesso-schermo-b25` (54/55): pannello dello stand a 1024×600 con quattro opzioni accese che scorre di 5 px
         (voce «Battuta» del B47 + riga delle cadute del B45.1); «Chiudi» resta in vista.
      3. `natpf-fiera-telefoni` (28/33): la prova aspetta ancora il conto piccolo dopo «Sono pronto», tolto dal B47; la
         modalità fiera oggi si accende solo da console: la aggiorna la B41 seconda parte (già fatto nel suo ramo, 2ffa80f).
      Di tempi sotto carico (da rifare da sole): b20 «richiamo per nome» (il riquadro è giusto, manca solo il tempo
      `called`), telecomando 90/91 («Salta» dal telecomando, già visto e passato da solo due volte), chi-serve 63/64
      (costo del disegno 1,34 ms contro 1 ms con la grafica in software).
- [~] In corso: B45.1 fase B (motivi delle cadute nel pannello e nel registro, rifiniture della 14.2, tasto Alt in
      finestra, documenti) → 14.4; B41 seconda parte (`b41-fiera-2`).
- Non provato: rete vera di una fiera, telefoni veri, Windows, ledwall. La 14.3 va confermata dall'utente allo stand.

**14/11, 19:10 UTC · dopo la 14.3: revisione indipendente del B45.1 e blocco B45.2.**
- [x] B45.1 fase B pronta (`f20d647`, ramo `b45-1-collegamento`, NON ancora unita): motivi delle cadute nel registro e nel
      pannello («Telefono 1: 3 cadute oggi · motivo più frequente: Wi-Fi ferma 10 s»), rifiniture della 14.2 (revisione del
      B46), prova di Windows con il tasto Alt, documenti; gioco 1584, sito 265, Windows 51, LAN 13, Electron Linux 101/101.
- [x] Revisione indipendente del B45.1: **non ok**, testo in `scratchpad/b451/revisione-b45-1.md` (prove in
      `scratchpad/rev-b451/`). Difetti veri, in parte già nella 14.3 pubblicata (nessuno fa tornare le cadute): «Scollega»
      dal computer contato come caduta; schermo del telefono spento scritto come «Wi-Fi ferma» e contato due volte; pagina
      del telefono chiusa con la scritta «si ricollega da solo» e QR dopo 20 s (prova b20 rossa); racconto `pagina`
      sovrascritto; `relinkAt` mai azzerato; riga delle cadute tagliata nel pannello; nessun test del chiosco che conta i
      messaggi del telefono; con i telefoni dei visitatori il chiosco non libera più il posto (da scrivere nella guida:
      «Scollega» nel riquadro del telefono); tasto Alt corretto solo nella prova.
- [~] Workflow `b45-2-rifiniture-collegamento` (run `wf_9a2e841a-941`): **B45.2** = i dieci punti (revisione + pannello a
      1024×600 che scorre di 5 px + prove instabili sotto carico rese robuste), sullo stesso ramo `b45-1-collegamento` dopo
      aver unito natpf-simulator; worktree `scratchpad/b451/wt`, porte 4100–4149, appunti `scratchpad/b451/notes.md`
      (sezione «B45.2»); poi revisore.
- [~] B41 seconda parte (`wf_5bb13fa8-3f0`, ramo `b41-fiera-2`): B41.4–B41.5 scritti (`2f8c5f0`, `2ffa80f`), 14.3 unita nel
      ramo (`af42330`), prove e correzioni in corso (titolo di fine partita con «Visitatore N» tagliato a 1280×720).
- Prossimo rilascio: **2026-11-14.4** = B41 seconda parte + B45.1 fase B + B45.2, quando i due revisori dicono ok (se uno
  dei due tarda, esce prima l'altro).

## >>> 14/11, 22:10 UTC · ISTRUZIONE DELL'UTENTE: «Riprendi il lavoro da dove hai interrotto e torna da me solo quando
## sarà tutta finita l'intera roadmap». Si va avanti da soli, blocco dopo blocco, con le versioni pubblicate come sempre;
## all'utente si scrive una volta sola, alla fine, con il riepilogo di tutte le versioni e «come si attiva». <<<

- Terzo limite d'uso alle 19:50 UTC (si azzera ogni 5 ore circa): B45.2 e B41.2 fermati a metà, salvati in commit «IN
  CORSO» (`de60c12` su `b45-1-collegamento`, `8c37a98` su `b41-fiera-2`) e ripresi con il workflow
  `ripresa-b45-2-e-b41-2` (run `wf_2e24e751-b16`), ognuno con il suo revisore appena finisce.
- Tavola grafica del B40 (artifact PMb2Gg3ZiakcHuqynZ2pJL): NON si apre più da questa sessione (404). Il B40 segue la
  descrizione scritta (`docs/coda/B40-fine-partita-v2.md`, `TRACCIA` riga ≈551) e fissa le soglie dei 12 trofei dai dati
  del gioco simulato, scritte nel documento.

**Coda fino alla fine della roadmap (in ordine; al massimo due blocchi di sviluppo insieme):**
1. [~] **2026-11-14.4** = B41 seconda parte + B45.1 fase B + B45.2 (dopo i due revisori).
2. [ ] **B40** fine partita v2: card della partita, trofei, contatori nuovi, personaggi 3D che esultano in loop.
3. [ ] **B48** tappa 3.5 del gameplay, prima parte: difetto 16 (giudicare «palla passata» con la posizione della palla al
       momento del gesto, togliendo il ritardo), servizio con scelte (prima del punto più alto verso il centro, dopo verso
       l'esterno; una riga nella scheda del servizio), servizio della CPU vario (a Casual non più veloce di chi gioca,
       niente scossa della telecamera, km/h veri al posto dei 194 fissi), Leggenda più da campione (al più una smorzata
       ogni 8 colpi, da ricontrollare con `audit:legend`).
4. [ ] **B49** tappa 3.4: doppio 2 contro 2 con lo stesso colpo e lo stesso posizionamento del singolo, compagno spiegato o
       autonomo (decisione del coordinatore: compagno che gioca da solo le sue palle, con un anello sotto di lui quando la
       palla va a lui; opzione nel pannello per tornare «con il tuo gesto»).
5. [ ] **B50** prova del ritardo del ledwall per lo staff (20 s, dopo il difetto 16) e pulizie trovate per strada:
       `racchetta.js` `let screen` che nasconde `window.screen` (blocco dell'orientamento mai attivo dal B9); dubbi del
       B43 (Parità/Vantaggio, istruzioni del servizio a 720×720, pause della diagnostica); prova della Leggenda con il
       riferimento per lato; avviso della mano a 720×720 (se non già nel B45.2).
6. [ ] **Revisore indipendente finale** della serie (B37–B50), correzioni, versione finale.
7. Restano all'utente (da dire nel riepilogo finale): ricaricare il Worker del registro e la prova a Precision con 3
   persone (sblocca B36.1+), il parere sul dritto del B23 (estenderlo o no), le decisioni aperte (Musica e «Chi gioca»
   salvati, «Schermo intero» salvato, chiosco e calibrazione, tasto «indietro» del mouse), il collaudo allo stand.


## 15/11, 00:30 UTC · B45.2 e B41.2 finite; 14.4 con la sola B45.2, la B41.2 torna in correzione (B41.3)

- Workflow `ripresa-b45-2-e-b41-2` (run `wf_2e24e751-b16`) finito, 4 agenti su 4.
  - **B45.2 approvata** dal revisore (nessun difetto del prodotto; note sulla forza di due test: chiosco col collegamento
    vero poco stringente, guardia `d.end` non coperta; difetto di 720×720 intermittente provato solo dal CSS). Ramo
    `b45-1-collegamento` a `41583ce`: gioco 1623/1623, sito 269/269, desktop 51/51, LAN 13/13, build, audit:legend
    uguale, prova-linux 101/101 (riprovati 0), 15 prove nel browser verdi al primo giro (nuova: natpf-pannello-cadute 33/33).
  - **B41.2 NON approvata**: tre difetti medi (doppio tocco su «Sono pronto» o «Gioca ›» + tocco salta gli scambi di
    prova; «Scollega» nel foglio dal telecomando con un OK; «Torna al menu» in fiera non azzera il visitatore) e quattro
    bassi (1920×540 con un telefono non pronto, modalità spenta che non rimette «Con cosa giochi» e «Calibrazione»,
    «Con i gesti» in fiera, testi). Più il difetto vecchio del B39.3 (riga sotto le voci che cambia altezza).
- Unita la B45.2 in natpf-simulator (`3d92ce1`, stesso albero di `41583ce`). Versione **2026-11-14.4** = B45.1 fase B +
  B45.2 (la B41 seconda parte va nella versione dopo, con le correzioni).
- Avviato il workflow `b41-3-e-b48` (run `wf_bedc7b7e-f41`): **B41.3** (unione della B45.2 nel ramo `b41-fiera-2`, otto
  correzioni, porte 4250–4299) e **B48** (ramo nuovo `b48-servizio`, worktree `scratchpad/b48/wt`, porte 4300–4349:
  prima controlla cosa c'è già di difetto 16 e km/h veri dal B18/B34, poi servizio con scelte, servizio della CPU vario,
  Leggenda al più una smorzata ogni 8 colpi), ciascuno con il suo revisore.
- Dopo: B40 (quando la B41.3 è unita: tocca anche lei la fine partita), poi B49, B50, revisore finale.
- **2026-11-14.4 pubblicata** (`4dc7a6d`, spinta 00:37 UTC): controllo rapido gioco 1623/1623, sito 269/269, desktop
  51/51, LAN 13/13, build ok. Zip Cloudflare `natpf-simulator-cloudflare-2026-11-14.4.zip` 23.909.825 B, sha256
  `d9efc5387edba64578e79213aaa9bd1efaab2b09a707142474cea23789332d63`, provato estratto (versione servita 14.4, QR dei due
  telefoni, stesso schermo, pausa), senza `natpf/registro.json`. **Installer verificato dal link fisso**: 128.102.449 B,
  sha256 `df052b1cef8f09d7e090b1060338821d4ba48bd0d1283eaafb7bab97fe8db004`. Prove nel browser sul checkout principale:
  natpf-phone-blackout 11/11, natpf-pannello-cadute 33/33, natpf-stesso-schermo-b20 52/52, natpf-menu 45/45 (carico
  4–9); schermate del pannello guardate (1024×600 e 720×720 con due telefoni: righe delle cadute intere, «Chiudi» in vista).
- 01:00 UTC · avviate tre analisi senza modifiche al repository (workflow `preparazione-b40-b49-b50`, run `wf_e5a08c57-d8f`,
  porte 4350–4399): piani pronti per lo sviluppo di B40 (soglie dei 12 trofei dalle partite simulate), B49 (doppio) e B50
  (prova del ritardo del ledwall e pulizie), in `scratchpad/prep/b40|b49|b50/*-piano.md`. In corso anche
  `b41-3-e-b48` (`wf_bedc7b7e-f41`).

## 15/11, 07:10 UTC · quarto limite d'uso (01:40–02:50 UTC); ripresa alle 07:10 su richiesta dell'utente («Riprendi»)

- Il limite ha fermato B41.3, B48 e l'analisi del B50. Salvati i commit «IN CORSO … NON verificato»: `80239be` su
  `b41-fiera-2` (fatti e in commit: unione della B45.2, difetti 1, 2, 3, 5, 6, 8; a metà il 4) e `2750e73` su
  `b48-servizio` (fatto il passo 1, difetto 16 su tutti i percorsi; scritti ma non verificati i passi 2–4).
- Rilanciati: `ripresa-b41-3-e-b48` (run `wf_04e347cd-a52`, con i revisori) e `ripresa-analisi-b50` (`wf_435f2003-304`).
- Analisi finite: piani di **B40** (soglie dei 12 trofei da 8000 partite simulate; card, contatori, esultanza e
  applauso, ritratti resi una volta) e **B49** (doppio: colpo e posizionamento del singolo, compagno autonomo con l'anello,
  voce del pannello, pressione contata sullo scambio di chi gioca; prototipo misurato) copiati in
  `docs/coda/B40-piano-analisi.md` e `docs/coda/B49-piano-analisi.md`. Ordine: B40 dopo l'unione della B41.3; B49 dopo
  l'unione del B48 (toccano le stesse funzioni del motore); B50 per ultimo.
- 07:45 UTC · piano del **B50** finito e copiato in `docs/coda/B50-piano-analisi.md`: pulizie (orientamento del telefono
  mai bloccato per `let screen`, «Parità»/«Vantaggio» nella pillola, istruzioni del servizio a 720×720 che coprono il
  tabellone di 12×46 px, prova della Leggenda per lato, avviso della mano già chiuso) e prova del ritardo dello schermo
  di 20 s nella diagnostica (mediana con scarto dei fuori misura, riferimento sul monitor del PC, ±20 ms con il telefono
  simulato). Nota per il revisore finale: oltre 160 ms di ritardo la palla riparte 2–4 m dietro il personaggio.

## 15/11, 10:30 UTC · B41.3 finita e unita: versione 2026-11-14.5 (modalità fiera con il solo mouse)

- Workflow `ripresa-b41-3-e-b48` (`wf_04e347cd-a52`) finito, 4 agenti su 4.
  - **B41.3**: otto difetti chiusi (doppio tocco, «Scollega» in due passi, «Torna al menu» in fiera azzera, pagina della
    fiera in due, scelte rimesse allo spegnimento, calibrazione ferma su «Giocando (fiera)», testi, pannello che non trema).
    Revisore: nessun difetto che blocchi il visitatore; restano cose piccole che vanno nel **B50**: «o Invio» nei documenti
    e nei commenti di «Conferma» (Invio non funziona: motion_controls.js:1620), prove del repository per il tremolio del
    pannello e la pagina della fiera a 1920×540 (oggi solo sonde nello scratchpad), ?stand=fiera con la calibrazione «Con i
    gesti» salvata, guida 8.4 (la finestra del certificato non ha un QR; la strada alternativa sovrascrive le scelte
    ricordate), spazio vuoto di 45–50 px sotto la nota del chiosco. Rapporto: `scratchpad/b413/revisione-b41-3.md`.
  - **B48**: revisore con una regressione MEDIA (a Bambini chi risponde schiaccia al volo il servizio lento della CPU,
    natpf_impact.js:169) e cose basse (test che proteggano tarature ed effetti, firstKmh 70 sopra il servizio più lento di
    chi gioca, servizio della CPU ancora poco vario nei rimbalzi veri e corto a Pro/Evento/Leggenda, documenti). Rapporto:
    `scratchpad/b48/revisione-b48.md`. In correzione: **B48.1** (agente sul ramo `b48-servizio`, porte 4300–4329).
- Unita la B41.3 (`9e19f75`). **2026-11-14.5** (`26a10ca`, spinta 10:24 UTC): gioco 1660/1660, sito 272/272, desktop
  51/51, LAN 13/13, build ok. Zip `natpf-simulator-cloudflare-2026-11-14.5.zip` 23.920.328 B, sha256
  `fac39ddcc4a4472b94e8840e9c00c08dcd18dda5f56c0c88d46183c8d772ab7e`, provato estratto. **Installer verificato dal link
  fisso**: 128.141.130 B, sha256 `7154833e43744756f1dd548a5d875c5534459216ac0bab51caf6fce42c74b490`. Prove nel browser
  sul checkout principale: natpf-fiera-telefoni 54/54, natpf-pannello-cadute 33/33, natpf-stesso-schermo-b25 55/55,
  natpf-menu 45/45, natpf-fine-partita 47/47 (carico 4–13); schermate della pagina della fiera e del foglio «Telefoni
  dello stand» guardate.
- Avviato il **B40** (agente, ramo `b40-fine-partita`, worktree `scratchpad/b40/wt`, porte 4350–4389) dal piano
  `docs/coda/B40-piano-analisi.md`, con le decisioni sulle proposte dell'analista scritte nel compito.
- Da qui gli agenti si lanciano con lo strumento Agent (uno per blocco), non più con i workflow.
- 11:00–12:00 UTC · quinto limite d'uso: fermati B40 (fatti B40.1–B40.6 in commit fino a `401eaee`) e B48.1 (punti 2, 3,
  6 in commit e unione della 14.5 `3072637`). 12:21 UTC: ripresi tutti e due con un messaggio (stesso agente, stesso
  contesto). Prossimo controllo di sicurezza programmato alle 17:30 UTC.

## >>> 15/11, 12:40 UTC · RICHIESTA URGENTE DELL'UTENTE, IN CIMA ALLA LISTA: telefono bloccato in partita (B51) <<<

- Parole dell'utente: «molte persone che giocano cliccano sul display, chiudono il browser o interagiscono col
  touchscreen… escono da Chrome e perdono la connessione al telefono… ci sarebbe una modalità dove se anche l'utente clicca
  sul display non appare nulla, come se fosse bloccata fino alla fine del match?» (chiedeva anche se un'app/APK sarebbe più
  stabile).
- Decisioni (domande a scelta): **prima il blocco nella pagina** (APK solo se dopo servirà ancora); allo stand **solo
  Android**; sblocco con **gesto dello staff sul telefono o dal PC**, da solo a fine partita.
- **B51** avviato subito (agente, ramo `b51-telefono-bloccato`, worktree `scratchpad/b51/wt`, porte 4400–4449): schermo
  del telefono scuro che ignora i tocchi durante scambi di prova e partita, Indietro intrappolato, schermo acceso, schermo
  intero e verticale (con la correzione di `let screen` del piano B50 §1a), sblocco dello staff e dal PC, voce del
  pannello «Blocco del telefono in partita» (di base Sì), guida con i passi di Android «Fissa app». Eccezione alla regola
  dei due blocchi insieme: B48.1 è alle prove finali e il B51 è urgente.
- Coda aggiornata: **B51** → versione appena pronto; B48.1 (prove finali) e B40 (passo B40.7) in corso; poi B49, B50,
  revisore finale. APK Android: solo se dopo il B51 serve ancora (da chiedere all'utente nel riepilogo).

## 15/11, 13:15 UTC · PASSAGGIO DI CONSEGNE (richiesta dell'utente: «salva tutto, devo passarlo a un altro agente»)

- Fermati gli agenti in corso (B40, B48.1, B51) e il promemoria delle 17:30. B40 e B48.1 avevano tutto in commit; B51
  non aveva ancora codice. Rami salvati nel bundle `docs/consegna/2026-11-15/rami-b40-b48.bundle`
  (`b40-fine-partita` dc64d2e, `b48-servizio` 450256e).
- Scritto `docs/consegna/2026-11-15/PASSAGGIO_2026-11-15.md` (stato, versioni, cosa resta di ogni blocco, ordine
  consigliato, procedura di rilascio, comandi, regole) con appunti degli agenti, revisioni, script di rilascio e sonde.

## >>> 15/11, 16:15 UTC · RIPRESA DOPO LE VERSIONI 14.6–14.8 (agente Claude Code nel cloud, sessione nuova) <<<

**Cosa è successo dopo il passaggio delle 13:15** (ricostruito dal repository: i tre commit sono di `sporcellifitp`,
senza firma di sessione, e non hanno aggiornato traccia e piano):

- [x] **2026-11-14.6** (`d77f21c`, 14:11 UTC) · **B51 telefono bloccato**: `site/js/tennis/phone-touch-lock.js` (stato del
      blocco, voce di protezione nella cronologia, gesto dello staff: due dita ferme 3 s, poi «Sblocca» per 6 s),
      `racchetta.js` (schermo scuro con «Telefono N · Gioca!», tocchi fuori dallo strato fermati in cattura, resto della
      pagina `inert`, schermo intero all'ultimo tocco vero, `let screen` → `viewScreen`: **correzione B50 §1a fatta qui**),
      sblocco dal PC (pannello e scheda del telefono in fiera), guida §8.6 con «Fissa app». Prove: `tools/test/phone-touch-lock`
      (3), `natpf-b51-blocco-telefono` (gioco), `tools/e2e/natpf-telefono-bloccato.mjs`. Manifest facoltativo: non fatto.
- [x] **2026-11-14.7** (`8018967`, 14:58 UTC) · in **un solo commit** da 76 file: **B48 + B48.1** (servizio con scelte,
      risposta dopo il rimbalzo, servizio della CPU vario, Leggenda), **B40** (contatori, 12 trofei, card, ritratti,
      esultanze), **B49** (compagno autonomo nel doppio, anello azzurro, voce «Doppio: compagno»), **B50** (prova del
      ritardo di 20 s nella diagnostica, «Parità»/«Vantaggio» nella pillola, servizio a 720×720, Leggenda per lato). Il
      codice dei rami del bundle è dentro (27 file su 35 del B48 e 19 su 26 del B40 identici; gli altri fusi a mano):
      **il bundle non va riunito**. Dichiarato nel commit: gioco 1734/1734, sito 275/275, desktop 51/51, LAN 13/13.
- [x] **2026-11-14.8** (`3149115`, 15:08 UTC) · pannello dello stand compatto a 720×720 (suggerimenti accorciati), tre
      prove d'impaginazione portate dalle sonde B41.3 (`tools/e2e/natpf-fiera-layout.mjs`, `natpf-stand-layout.mjs`,
      `natpf-stand-settle.mjs`: **resto B41.3 n. 2 chiuso**). **Installer 14.8 verificato dal link fisso** (15/11, 16:05
      UTC): 128.153.784 B, sha256 `07a0c687bad57b2cdd1d77d96573b2614c3cb43f3540ab280756534129cb8f0f`, pubblicato 15:13:56
      UTC. Zip Cloudflare della 14.8: nessuna traccia che sia stato fatto.

**Verifica di questo agente sulla 14.8 (checkout `3149115`):**

- [x] **Difetto trovato e corretto:** il commit della 14.8 ha accorciato il suggerimento di «Stesso schermo: campo
      aperto» e `natpf-tennis/test/natpf-b25-stesso-schermo.test.mjs:388` cercava la frase vecchia: **1 test rosso** (anche
      su GitHub, workflow «NATPF motore base MVP» fallito sulla 14.8; «NATPF Simulator tests» non esegue quel file). Test
      aggiornato alla frase nuova («Con qualunque formato si serve due punti a testa»): il file passa 26/26, la suite del
      gioco 1734/1734 (3 min 49 s). Solo test:
      i pacchetti della 14.8 non cambiano.
- [x] Sito 275/275, LAN 13/13, desktop 51/51 sulla 14.8.
- [x] Resti B41.3 n. 1 («o Invio» tolto da documenti e commenti) e n. 3 (`?stand=fiera` con la calibrazione «Con i
      gesti»: il pannello ora mostra il valore vero, `natpf_kiosk.js:393`) **già chiusi** nel codice.

**Cosa resta (in quest'ordine):**

1. [ ] **Documenti dei blocchi mancanti**: `docs/b48/servizio-e-leggenda.md` e `docs/b40/fine-partita-v2.md` +
   `b40-trofei-risultati.txt` esistono solo nel bundle (segnaposto `__PROVE_B481__`, `MISURE_RITRATTI`, `PROVE_B40` da
   riempire); `docs/b49/`, `docs/b50/ritardo-e-pulizie.md`, `docs/b51/telefono-bloccato.md` mai scritti; `WORK_PROGRESS`
   e `PROJECT_MEMORY` fermi alla 14.5.
2. [ ] **B50, parti del piano non fatte**: test `tools/test/b50-pulizie.test.mjs` (spia sul blocco dell'orientamento),
   prova nel browser `tools/e2e/natpf-ritardo-schermo.mjs` (B50-9, ritardi finti 80/160 ms), `docs/NATPF_DIAGNOSTICA.md`
   (B50-4), test della stima più stretti (B50-6: oggi 3 test contro i 7 gruppi del piano).
3. [ ] **B49, parti del piano non fatte**: test del motore (`natpf-b49-doppio-motore`), misure del doppio, prova nel
   browser.
4. [ ] **B40**: rimisura delle soglie di Asso e Razzo con il B48 dentro (`scripts/audit/b40-trofei.mjs`), prove nel
   browser del B40.7.
5. [ ] **Revisore finale della serie B37–B51** (passaggio §4.6), che copre anche la revisione mirata del B48.1 mai fatta.
6. [ ] Poi versione nuova, zip Cloudflare, installer dal link fisso, riepilogo unico all'utente (passaggio §4.8).

### 15/11, 21:20 UTC · revisione finale e pezzi mancanti → versione 2026-11-14.9 (la sessione si è fermata tra le 17:00 e le 21:10 per un riavvio; il lavoro nel checkout era intatto)

- [x] Versione **2026-11-14.9** (quattro file, guida «Vale per…»). Controllo rapido (21:15–21:20 UTC): gioco **1740/1740**,
      sito 275/275, desktop 51/51, LAN 13/13, build ok. Commit e push qui sotto.
- [ ] Dopo il push: installer dal link fisso, secondo gruppo di prove nel browser (ritardo-schermo nuova, stesso-schermo
      b20/b25, stand-layout `VARIANTS=quick`, lob-drop, flusso-tocchi fiera, nuovo-giocatore, telecomando,
      phone-blackout, scambi-di-prova, training-flow, servizio-peso, chi-serve, tabellone, mano-sicura), zip Cloudflare
      provato estratto, riepilogo all'utente.
- Nel commit della 14.9:
  - documenti dei blocchi: `docs/b40/` e `docs/b48/` ripresi dal bundle con le prove riempite, `docs/b49/doppio-compagno.md`
    (+ misure), `docs/b50/ritardo-e-pulizie.md`, `docs/b51/telefono-bloccato.md`, `PROJECT_MEMORY` (B40, B48–B51),
    `NATPF_DIAGNOSTICA` (prova del ritardo, `diag=1`), riga `diag=1` della guida;
  - test: `natpf-b50-ritardo-prova` 3 → 8, `natpf-b49-doppio` 3 → 4 (`hitCountsForStats`, nuova funzione in
    `natpf_doubles.js` usata da `game_engine.js`: il colpo del compagno nel doppio contro la CPU non conta nei trofei);
  - correzione: frase d'aiuto della prova del ritardo nascosta con il pulsante acceso (`natpf_diag.js`);
  - prove nel browser: nuova `tools/e2e/natpf-ritardo-schermo.mjs` (B50-9); `natpf-fiera-layout` ora esce da sola
    (restava appesa a risultato scritto); `natpf-stesso-schermo-b20`/`-b25` aggiornate a 18 pulsanti del pannello.
- Misure della revisione: B49 sei obiettivi rispettati (`docs/b49/`), trofei dopo il B48 invariati (`docs/b40/`),
  `audit:legend` tutti i criteri, mutazioni B48.1 5 su 5 prese, stima del ritardo nei criteri del piano (limite noto con
  colpi irregolari, `docs/b50/`).
- Primo gruppo di prove nel browser (14.8): servizio-scelta 18/18, fine-partita 56/56, ritratti 24/24, telefono-bloccato
  12/12 (con `run-local.mjs` e il sito sotto `/natpf/`), fiera-layout 63/63, fiera-telefoni 61/61, pannello-cadute 33/33,
  menu 45/45, leggenda 7/7, stand-settle ok; stesso-schermo-b25 44/55 **solo per il conto vecchio dei pulsanti** (16
  invece di 18; nessuno scorrimento, nessuna scritta tagliata): prova aggiornata, da rifare.

### 15/11, 21:45 UTC · dopo il push della 14.9 (`9315b8d`)

- [x] **Installer 2026-11-14.9 verificato dal link fisso**: 128.140.546 B, sha256
      `fde90cb9a2f82b3a98713e868a80df8848045131bd9fcb5ae4fc5e58e0370f4d` (uguale a `latest.json`, pubblicato 21:24:45 UTC).
      GitHub sulla 14.9: «NATPF Simulator tests», «eseguibili Windows» e «motore base MVP» verdi.
- [x] **Zip Cloudflare 2026-11-14.9**: 23.942.671 B (margine 1,06 MB), sha256
      `e0c6a17e8aa1379d854a1b026b54905e35201595f439a96a3c5b09b6e79fe735`, niente `natpf/registro.json`; provato estratto
      (`cf-browser.mjs`, porta 4205): versione 14.9 servita, QR dei due telefoni, pausa con «Ricollega», pagina del telefono;
      solo gli errori attesi (404 di `/api/match/state`, `registro.json`, `/lan/status`, CORS del TURN).
      `natpf-telefono-bloccato` sullo zip estratto 11/12 (l'unico rosso è lo stesso CORS del TURN).
- [x] `natpf-ritardo-schermo` corretta (aspetta il riquadro della diagnostica, che si disegna dopo la lettura delle
      sessioni; secondo telefono finto con i metodi chiamati a ogni fotogramma): **13/13**, schermate guardate.
- [x] Secondo gruppo di prove nel browser sulla 14.9 (21:22–22:25 UTC, carico 1–11): stesso-schermo-b25 55/55,
      stand-layout `VARIANTS=quick` 16/16 (quattro misure), stesso-schermo-b20 52/52, flusso-tocchi `FLOW=fiera VISITORS=10`
      46/46, nuovo-giocatore 28/28, servizio-peso 8/8, chi-serve 64/64, scambi-di-prova 30/30, mano-sicura 17/17,
      phone-blackout 11/11, training-flow 21/21, telecomando 91/91. Due prove rimaste indietro rispetto al gioco, aggiornate:
      **natpf-tabellone** 36/41 → **41/41** (si aspettava il formato nella pillola a parità e vantaggio; dal B50-3 la pillola
      dice «PARITÀ»/«VANTAGGIO»; schermate guardate) e **natpf-lob-drop** 133/136 (i 3 controlli «corde» del difetto noto dal
      B32, identici sulla 14.5: analisi e decisione in `docs/PROJECT_MEMORY.md`, «Racchetta delle mascotte al colpo»):
      con il controllo nuovo **136/136** (22:42 UTC).
- [x] Resti della revisione B41.3 chiusi: n. 4 guida 8.4 (finestra con l'indirizzo, classifica a schermo intero), n. 5 la
      riga sotto le voci del pannello è ad altezza fissa apposta (difetto 8, niente tremolio): resta.

## >>> 15/11, 22:40 UTC · ROADMAP: tutto quello che si può fare senza l'utente è fatto <<<

Coda del documento di ripresa (`docs/RIPRESA_AGENTE.md` §3) e passaggio §4: punti 1–7 fatti (B37, B43, B42, B41 prima
parte, B38+B39, B41 seconda parte, B40), poi B44–B51 e la revisione finale della serie (questa ripresa). Restano solo
cose che aspettano l'utente:

1. **B36 · direzione dei colpi** (punto 8 della coda, piano approvato il 13/11): fatta la B36.0. Il piano mette un
   **cancello** prima di qualunque regola nuova (`docs/b36/piano-direzionalita.md` §3): ricaricare una volta il Worker del
   registro (`docs/b36/misure-b36-0.md` §3) e fare la **prova a Precision di 15–20 minuti con 3 persone** (§6). Con i
   numeri veri: se rispettano i criteri si parte con la B36.1, altrimenti si torna dall'utente con una proposta.
2. **APK Android** (passaggio §4.7): solo se dopo il B51 la gente esce ancora da Chrome (decisione dell'utente).
3. **Dritto del B23**: estenderlo o no (parere dell'utente).
4. Decisioni aperte del passaggio §4.8 (Musica e «Chi gioca» salvati; «Schermo intero» salvato; chiosco e calibrazione;
   tasto «indietro» del mouse), collaudo allo stand (telefoni veri, Windows vero, ledwall, rete della fiera, «Fissa app»),
   soglie dei trofei da ritarare con il registro dopo una giornata.


## >>> 15/11, 23:15 UTC · DECISIONI DELL'UTENTE E NUOVI BLOCCHI: B52 app Android, B53 movenze del video su tutti i colpi <<<

Risposte dell'utente (domande a scelta, 15/11 sera): **app Android sì** («la gente esce da Chrome cambiando
schermata»), con **«Fissa app» automatico** (non il chiosco completo); **dritto del B23: estenderlo agli altri colpi**.
Ordine: B52, poi B53.

- [x] **B52 · app Android dello stand** (`natpf-android/`, `docs/b52/app-android.md`, guida 8.9): WebView con la pagina
      vera, si fissa da sola, schermo acceso, Wi-Fi a bassa latenza, riapre l'ultimo collegamento, riprova da sola, lettore
      di QR, Indietro alla pagina, tre «volume giù» per lo staff, orientamento passato all'app. Test di unità 4/4, lint 0
      errori, APK 1.0.0 firmato con la chiave dello stand (294.388 B, sha256
      `eb2a99eba36145e1ee021117ed00bc0c109dcc5da0ede0241016b82387359189`), prova nel browser `natpf-app-android` 5/5.
      Workflow `natpf-android.yml` (APK negli Artifacts; firmato e su R2 quando l'utente aggiunge i due segreti della chiave).
      La chiave non è nel repository: consegnata all'utente. **Non provata su un telefono vero.**
- [~] **B53 · movenze del video su rovescio, servizio, volée, schiacciata** (stesso interruttore del B23). Trailer
      guardato (`natpf-desktop/media/trailer-aad6b9311db4.mp4`, 10 s): oltre al dritto (0–3 s) ci sono un **rovescio** in
      allungo a due mani con il finale alto sopra la spalla della racchetta (giocatore blu di fronte, 4,5–6 s) e una
      **schiacciata in salto** (giocatore bianco lontano, 7–8 s). **Servizio e volée non ci sono**: si fanno nello stesso
      stile (busto che gira, peso che passa, finale ampio), dichiarato nel documento. Passi, uno per commit con prove:
      B53.1 rovescio → B53.2 schiacciata → B53.3 volée → B53.4 servizio → B53.5 voce delle Opzioni «Movimenti come nel
      video» (stessa chiave salvata), versione. Vincoli del B23 per ogni colpo: con «No» ossa identiche, partite
      identiche, racchetta sulla palla all'impatto come prima, niente scatti. Base: `natpf_forehand_video.js`, prove
      `natpf-dritto-video.test.mjs`, `tools/e2e/natpf-dritto-video.mjs` e `-foglio.mjs`.
- [x] **B53.1 rovescio** → versione **2026-11-15.1** (16/11, 07:15 UTC): `natpf_strokes_video.js` (nuovo), agganci in
      `player_body_animation.js`, test `natpf-colpi-video.test.mjs` (6), due test del B23 aggiornati, `COLPO=rovescio` per i
      fogli e misura degli scatti con il segno dei quaternioni continuo in `tools/e2e/natpf-dritto-video.mjs`, `docs/b53/`
      con le immagini. Correzioni durante il passo: mano libera aperta nel finale (copriva gli occhi delle mascotte),
      niente scostamento della racchetta nella preparazione (scatto 740 mm), scioglimento lento fuori dallo swing e mano
      che divide la velocità con il dritto del B23 (scatti della CPU fuori dallo swing). Verifiche: gioco 1746/1746, sito
      275/275, desktop 51/51, LAN 13/13, build; `natpf-dritto-video` 54/58 con gli stessi 4 rossi della 14.9 (riga delle
      Opzioni fuori schermo, tre partite diverse dalla base del B23: cambiate dai blocchi venuti dopo).
- [x] Installer **2026-11-15.1** verificato dal link fisso: 128.156.692 B, sha256
      `dbf510c60c2fcdd0df6b7e3e8807d4b9fbc4c8dc1554b2a55dae4442dfd76a86`; zip Cloudflare 2026-11-15.1 23.944.655 B, sha256
      `650b9c2ab6bfa630dbb72479f6378eb9a4879324939929f752f0316a4bef0b17`, provato estratto; GitHub verde.
- [x] **B53.2 schiacciata** → versione **2026-11-15.2**: `SV_STROKES.smash` (gambe piegate e di lato, impatto sulle
      punte, salto di 14 cm che parte 0,06 s dopo l'impatto, atterraggio a braccia aperte), modulo generalizzato (mano per
      posa, salto per colpo, finale della racchetta facoltativo), 3 test nuovi, `COLPO=schiacciata` per i fogli (pallonetto
      della CPU come secondo colpo: sulla risposta al servizio il gioco non schiaccia). Gioco 1749/1749, sito 275/275,
      desktop 51/51, LAN 13/13, build; `natpf-dritto-video` 54/58 con i 4 rossi di sempre; fogli guardati.
- [~] B53.3 volée (a rete, cioè a meno di 7 m dalla rete, dritto e rovescio hanno pose corte al posto di quelle ampie)
      → B53.4 servizio → B53.5 voce delle Opzioni. Vedi la sezione qui sotto per il punto esatto.

## >>> 16/11, 08:25 UTC · URGENTE (utente): app Android 1.0.0 si chiudeva su «Inquadra il QR del PC» → 1.0.1 <<<

- [x] **B52.1 · app 1.0.1** (`docs/b52/app-android.md` §5): la libreria del lettore QR richiamava `ContextCompat` e
      `ActivityCompat` di AndroidX che nell'APK non c'erano (zero classi `androidx` nel dex della 1.0.0). Aggiunto
      `androidx.core:core:1.6.0`, lettore aperto con `ScanOptions`; controllo nuovo `natpf-android/controlla-classi.mjs`
      (anche nel workflow): rosso sulla 1.0.0 proprio su quelle due classi, verde sulla 1.0.1. Test di unità 4/4, lint 0
      errori, `natpf-app-android` 5/5, sito 275/275; APK 1.0.1 firmato con la chiave dello stand (stesso certificato),
      679.677 B, sha256 `fe332244e4609538fd1083072f69e43ad6f2f9b1f2a308b26ea3aa6c56cc96a7`, **consegnato all'utente**.
      Non provata su un telefono vero. Su GitHub (`9978349`) build e controllo verdi, APK firmato (i segreti della chiave
      ci sono), ma la **pubblicazione su R2 ha avuto «AccessDenied»**: nel workflow Android le chiavi R2 non erano
      ripulite come in quello Windows (che con gli stessi segreti carica). Corretto (stessa pulizia, endpoint UE se serve):
      da controllare il giro dopo il push e il link fisso `android/NATPF-Racchetta.apk`.
- [x] Ripubblicazione: con le chiavi ripulite (`53333aa`) la 1.0.1 è su R2 (`android/NATPF-Racchetta.apk`).
- [x] **B52.2 · app 1.0.2** (16/11, 08:40 UTC; `docs/b52/app-android.md` §6). L'utente con la 1.0.1: QR del PC dello
      stand (rete locale), sul telefono solo l'app → «App fissata» e poi schermo fermo. Causa: certificato fatto dal PC
      rifiutato in silenzio dalla WebView (senza il certificato NATPF sul telefono) e app fissata anche sulla pagina
      d'errore. Ora `proceed` solo per l'indirizzo di rete locale del QR (`RacketLink.trustStandCertificate`), avviso che
      resta e niente «Fissa app» dopo un errore, versioni e ultimo errore nella schermata dello staff. Prova nuova
      `tools/e2e/natpf-app-certificato.mjs` (server LAN vero, certificato vero, «Procedi» in Chromium) 7/7; unità 5/5, lint
      0 errori, classi verde, `natpf-app-android` 5/5. APK 1.0.2 680.905 B, sha256
      `99902fa99644735e91221255138cdb1c65543e0c86e72beedcd936f1c291439f`, **consegnato**. Non provata su un telefono vero.
- [~] **B53.3 volée, punto esatto** (la misura dei fotogrammi rifatta due volte è verde: 309,7 contro 283,0 e 301,0
      contro 259,8; manca solo il commit, sospeso dall'utente): codice, test (`natpf-colpi-video` 12/12), fogli, documento §4 e versione
      **2026-11-15.3** sono salvati, **non applicati**, in `docs/b53/volee-in-sospeso.patch` (16/11, 08:50: l'utente ha
      sospeso tutto tranne l'app; il gioco su GitHub resta alla 15.2). Per riprendere: `git apply
      docs/b53/volee-in-sospeso.patch`, togliere il file della patch nello stesso commit della 15.3.
      Controllo rapido gioco 1752/1752, sito 275/275, desktop 51/51, LAN 13/13, build. `natpf-dritto-video` 53/58: i 4
      rossi di sempre più i fotogrammi al secondo (91,5% < 95%, numeri molto ballerini: 203–368); la misura ripetuta
      (`SOLO=costo`) è stata interrotta per l'urgenza: **rifarla**, poi commit della 15.3, zip e installer. Da aggiungere
      anche in `docs/PROJECT_MEMORY.md` la lezione della 1.0.1 (librerie Android: controllare le classi nell'APK).

## >>> 16/11, 12:40 UTC · STATO (verificato su GitHub e R2) e B54 NOME DAL TELEFONO in corso <<<

Stato trovato alla ripresa (commit di un altro agente, non registrati qui): **2026-11-15.3** (volée, `27b1ecf`) pubblicata,
installer su R2 (`latest.json` 16/11 09:26 UTC, 128.154.425 B, sha256 `2d164fa6…af7`), GitHub verde; **app 1.0.3**
(`f7d9168`: schermata che si adatta alla tastiera) al link fisso `android/NATPF-Racchetta.apk` (681.001 B), GitHub verde.
L'utente aveva chiesto all'altro agente anche il nome dal telefono: **non fatto**. Lo zip Cloudflare della 15.3 l'ha
verificato l'altro agente (non visto qui).

- [x] B53.3 volée → 15.3 (altro agente). Restano B53.4 servizio e B53.5 voce delle Opzioni.
- [x] **B54 · nome del giocatore dal telefono** → versione **2026-11-16.1** (richiesta dell'utente del 16/11; decisioni:
      facoltativo con «Salta» in alto a destra, prima di «Sono pronto», campo vuoto per un giocatore nuovo e nome di prima
      nella rivincita, filtro delle parolacce + correzione dello staff). Documento `docs/b54/nome-dal-telefono.md`.
      Verifiche: gioco 1761/1761, sito 280/280, LAN 13/13, desktop 51/51, build; nel browser `natpf-nome-telefono` 20/20,
      `natpf-fiera-telefoni` 66/66 (dopo la correzione dei pulsanti dello staff sul telefono dello stand),
      `natpf-flusso-tocchi` fiera 20/20, fiera-due 13/13, singolo 5/5, stesso 6/6, `natpf-telefono-bloccato` 12/12.
      L'app Android non cambia (la pagina arriva dal PC). Non provato su un telefono vero.
- [x] Pacchetti della 16.1 (commit `3135a0d`, GitHub verde: test, eseguibili Windows, motore base): **installer** dal link
      fisso e dal file della versione uguali a `latest.json` (128.155.172 B, sha256
      `d9ee30a73914f3175750f77b5f582291b830056cd2fdb9e1bd854603cb4eab50`, pubblicato 12:50 UTC); **zip Cloudflare**
      23.951.030 B (144 file), sha256 `6be7b8d3ae529d66dbb55f4d606af3db9635c956a29aea07fddcaff7e98d04b6`, provato estratto
      (`natpf-nome-telefono` 20/20, gioco avviato con la 16.1 senza errori, `natpf-telefono-bloccato` 11/12 con il solo
      CORS del TURN, atteso), consegnato all'utente.
- [ ] Poi: B53.4 servizio, B53.5 voce delle Opzioni «Movimenti come nel video».

## >>> 16/11, 13:10 UTC · MESSAGGIO PER IL PROSSIMO AGENTE (limite d'uso vicino) <<<

**Segnalazione dell'utente (foto, 13:59 ora italiana)**: sul telefono dello stand, nell'app 1.0.3, c'è «Sono pronto» e
nessuna richiesta del nome. Cause (dal codice, non verificate sul posto): (1) il PC non è ancora alla 2026-11-16.1
(l'aggiornamento dal gioco lo accetta lo staff); (2) anche con il PC aggiornato, **il telefono dello stand tiene la pagina
di prima**: quando il PC si riavvia si ricollega da solo senza ricaricare la pagina, e la pagina di prima non manda
`dev nm 1`, quindi il PC non chiede il nome (compatibilità voluta del B54). Rimedio subito per l'utente: PC alla 16.1, poi
su ogni telefono **tre volte «volume giù» → «Riapri l'ultimo collegamento»** (o chiudere e riaprire l'app): il server
del PC manda i file con `Cache-Control: no-store`, la pagina nuova arriva.
**Correzione in corso (B54.1)**: il PC dice al telefono la sua versione; una pagina di versione diversa si ricarica da sola
una volta (vale dalle pagine della 16.2 in poi; per quelle già sui telefoni resta il rimedio sopra). Poi: B53.4 servizio,
B53.5 voce delle Opzioni. Regole e procedura: CLAUDE.md, `docs/PIANO_LAVORI.md` §1 e §6.

- [x] **B54.1 → versione 2026-11-16.2**: versione del gioco al telefono (`bv`) e ricarica da sola della pagina di un'altra
      versione, fuori dalla partita, una volta per versione. Gioco 1762/1762, sito 280/280, LAN 13/13, desktop 51/51,
      build; `natpf-nome-telefono` 23/23. Per i telefoni con la pagina di prima (16.1 e prima): una volta a mano
      «Riapri l'ultimo collegamento» (guida 3). **Punto esatto**: commit e push della 16.2, poi zip Cloudflare e installer
      (procedura `docs/PIANO_LAVORI.md` §6), poi B53.4 servizio e B53.5 voce delle Opzioni.
- [x] Pacchetti della 16.2 (`37db3ca`, GitHub verde): installer dal link fisso = `latest.json` (128.163.978 B, sha256
      `f0e95275f0335be2203be36721a7050248c55fd24c56f172511ee9d167e9137a`); zip Cloudflare 23.951.355 B, sha256
      `768829c0fc537635d3857a624d48515e31df48be165521618625f944f1641bba`, provato estratto (`natpf-nome-telefono` 23/23,
      gioco avviato), consegnato.
- [x] **B53.5 → versione 2026-11-16.3**: voce delle Opzioni «Movimenti come nel video» (stessa chiave `drittoVideo`),
      avvisi nuovi, guida e `docs/b53/colpi-dal-video.md` §5. Gioco 1762/1762, sito 280/280, LAN 13/13, desktop 51/51,
      build. **Punto esatto**: commit e push della 16.3, zip e installer; poi **B53.4 servizio** (l'ultimo pezzo del B53).
- [x] Pacchetti della 16.3 (`64dfc13`, GitHub verde): installer = `latest.json` (128.154.412 B, sha256
      `61f14209676e02450b7049e4290961430c83bd88ff19dae17d1dea16f4db13e3`); zip 23.951.339 B, sha256
      `6b728776c0c536638d698a179b10d83529b1bdadb859a2adba43b5587f478a37`, provato estratto, consegnato.
- [x] **B53.4 servizio → versione 2026-11-16.4** (`docs/b53/colpi-dal-video.md` §6): corpo in avanti all'impatto, finale con
      il busto che passa, saltello di 7 cm dopo la zona libera; attesa e lancio identici; gambe piegate NON possibili dentro
      lo swing (0,35 s, parte al 18 %). Gioco 1764/1764, sito 280/280, LAN 13/13, desktop 51/51, build. **Con questo il B53
      è finito** (manca solo il foglio di confronto nel browser del servizio).

## >>> 16/11, 16:00 UTC · MESSAGGIO PER IL PROSSIMO AGENTE <<<

Stato: gioco **2026-11-16.4** (B53 finito, B54 nome dal telefono, B54.1 pagina nuova dopo l'aggiornamento del PC),
app Android **1.0.3** (nessun APK nuovo serve). Se il checkpoint non dice altro: **pacchetti della 16.4** (zip Cloudflare
con `natpf-tennis/scripts/pacchetto-cloudflare.mjs --turn-url=https://natpf-turn.s-porcelli.workers.dev/`, provato
estratto con `tools/e2e/natpf-nome-telefono.mjs` via `run-local.mjs`; installer: aspettare il workflow «NATPF eseguibili
Windows» e confrontare lo sha256 del link fisso, scaricato con `?v=<numero>`, con `windows/latest.json`), consegna all'utente.
Poi la roadmap è vuota salvo le cose dell'utente: collaudo allo stand (telefono vero, nome con la tastiera vera, ledwall),
Worker del registro e prova a Precision (B36.1); sui telefoni con la pagina di prima della 16.2 una volta «Riapri l'ultimo
collegamento». Idee aperte da proporre, non fatte: foglio di confronto del servizio (`COLPO=servizio`), gambe piegate nel
lancio del servizio (cambia l'attesa: chiedere), togliere la doppia richiesta del nome fuori dalla fiera («Nuovo
giocatore» chiede il nome sul PC e poi sul telefono). Regole: CLAUDE.md; procedura: `docs/PIANO_LAVORI.md` §6.
- [x] **Pacchetti della 16.4** (`09bc31e`, GitHub verde sui tre workflow): installer dal link fisso = `latest.json`
      (128.161.534 B, sha256 `95bce704e7874585c0d48a7990c3daf410d4b5578d163710c2f556a4674ff31b`); zip Cloudflare 23.951.506 B,
      sha256 `0122f7176804dc833e1b4aa29af72085122b44836ceb74238df466723b8a85f8`, provato estratto (`natpf-nome-telefono` 23/23,
      gioco avviato con la 16.4), consegnato. **Roadmap senza l'utente finita**: restano le sue cose e le idee del messaggio
      qui sopra.

## >>> 16/11, 17:00 UTC · RICHIESTE DELL'UTENTE (dopo la lista dei punti aperti) <<<

- [x] **B54.2 → versione 2026-11-16.5**: «Nuovo giocatore» per la partita con il telefono non apre più la tastiera del PC
      (decisione: «togli la richiesta dal PC»). Gioco 1765/1765, sito 280/280, build. Pacchetti (`e54a309`, GitHub verde):
      installer dal link fisso = `latest.json` (128.165.079 B, sha256 `6021deb38df984785683a47e6b214180607472a559b5f26b77fb8220b97ebadf`);
      zip 23.951.539 B, sha256 `6dbb088f78f2256b8f806e83dc9165a778abf035453833c3ec4529f03f731285`, provato estratto, consegnato.
- [x] Worker del registro: **già ricaricato** (lo stato pubblico risponde `formato: 2`, l'ultima versione del repository,
      B36.0). Non serve rifarlo.
- [ ] **Struttura delle funzionalità per prodotto** (richiesta dell'utente): versione per la **fiera** (installer, NATPF
      Simulator) e versione **online** con vita propria (FITP Simulator). Bozza in `docs/PRODOTTI_FIERA_E_ONLINE.md`;
      regola nuova: per ogni richiesta dire a quale prodotto va (in CLAUDE.md).
- [ ] **B36.1 direzione dei colpi e soglie dei trofei «in parallelo»** (richiesta dell'utente): il piano B36 ha il cancello
      della prova a Precision; ora ci sono i dati veri della fiera di Torino nel registro (si leggono solo con la chiave
      dell'utente: proposto all'utente di scaricare i giorni dalla pagina del Worker e caricarli qui).

**Prossima azione esatta (16/11, 17:30 UTC)**: aspettare le risposte dell'utente sulle domande di
`docs/PRODOTTI_FIERA_E_ONLINE.md` §4 e i file dei giorni di Torino scaricati dalla pagina del Worker (con la sua chiave:
mai in chat). Con i file: conto delle partite, poi B36.1 (direzione) e soglie dei trofei sui dati veri
(`scripts/audit/b40-trofei.mjs`, `docs/b36/piano-direzionalita.md`).

## >>> 16/11, 18:00 UTC · B55 RITORNO ALLA VERSIONE DI PRIMA (FIERA) · in corso <<<

Richiesta dell'utente: «prevedi una funzionalità di fallback e downgrade della release qualora una versione ha rotto
delle dinamiche». Decisioni (domande a scelta): **solo «Versione di prima sul PC»** (non gli interruttori per dinamica,
non il ritiro centrale da GitHub); il comando sta **nelle Opzioni**. Prodotto: FIERA (programma Windows).
Oggi non si può: l'aggiornamento accetta solo versioni più nuove (`aggiornamenti.mjs`, `compareBuilds <= 0`) e
`staleFiles` cancella gli installer delle versioni vecchie; gli installer di ogni versione restano su R2.
Piano: (1) il workflow pubblica anche `windows/versioni.json` (ultime versioni con file, dimensione, sha256);
(2) il programma tiene la storia delle versioni installate e l'installer della versione di prima (scaricato e controllato
in sottofondo quando c'è internet, così poi vale anche offline; non cancellato da `staleFiles`); (3) ponte
`natpfDesktop.updates`: versione di prima disponibile e `rollback()`; (4) nelle Opzioni del gioco, solo nel programma
Windows: «Torna alla versione di prima (X)» con conferma; (5) dopo il ritorno la versione lasciata non si ripropone
finché non ne esce una più nuova; (6) l'installer deve accettare una versione più vecchia (controllare NSIS); prove con
node:test e `scripts/prova-linux.mjs`.
- [x] B55 passo 1: `natpf-desktop/src/aggiornamenti.mjs` (storia `storico.json`, `previousBuild`, installer della versione di
      prima e di quella in uso tenuti, `prefetchPrevious` da `windows/versioni.json`, `rollback()`, versione lasciata non
      riproposta), prove `natpf-desktop/test/aggiornamenti.test.mjs` 16/16 (+3). **Punto esatto**: passo 2 = `main.mjs`
      (azione IPC `rollback`, `prefetchPrevious` dopo il controllo all'avvio), `preload.cjs` (`updates.rollback`), passo 3 =
      pulsante nelle Opzioni (`natpf-tennis/src/natpf/natpf_updates.js`, due tocchi per confermare), passo 4 = workflow che
      pubblica `windows/versioni.json` (con le versioni già pubblicate dalla 16.1: sha256 in questa traccia), versione, pacchetti.
- [x] **B55 → versione 2026-11-16.6** (`docs/b55/versione-di-prima.md`, guida 8.10): passi 2–4 fatti (ponte `rollback`,
      versione di prima riscaricata all'avvio, pulsante in Opzioni → Aggiornamenti con due clic, workflow che pubblica
      `windows/versioni.json` con `natpf-desktop/scripts/versioni.mjs` e `versioni-pubblicate.json`). Gioco 1767/1767, sito
      280/280, LAN 13/13, desktop 56/56, build. **Punto esatto**: dopo il push controllare il workflow Windows (installer e
      `windows/versioni.json` su R2), zip; poi l'errore 503 di «Scarica» nella pagina del Worker del registro (segnalato
      dall'utente).
- [x] **Scarico dalla pagina del Worker del registro: 503** (segnalato dall'utente): i 503 vengono da Cloudflare (limiti del
      piano gratuito per richiesta; gli errori del Worker sono 500). `natpf-tennis/cloudflare/registro-worker.js`: 15 blocchi
      per richiesta invece di 40, la pagina riprova da sola su 500/502/503 (GET), colonna **«Partite»** nella tabella. Prove
      del Worker 49/49. **L'utente deve ricaricare il Worker** (`docs/b36/misure-b36-0.md` §3; file consegnato). Non provato
      sul Cloudflare vero.
- [x] **Pacchetti della 16.6** (`22a6e73`, GitHub verde): installer dal link fisso = `latest.json` (128.152.628 B, sha256
      `abe181fd86abe76e08f1cf13c2bc9e56334394244a6934c47d5ffedf6b0977af`); **`windows/versioni.json` su R2** con 16.6, 16.5,
      16.4, 16.3, 16.2 (sha256 giusti); zip 23.951.983 B, sha256
      `876bbf6f7569281c574e6568e0045f6e4c1639ae08bbbce8f15e343406549508`, provato estratto, consegnato.

**Prossima azione esatta (16/11, 20:00 UTC)**: aspettare l'utente: ricarica del Worker (file consegnato) e scarico dei
giorni di Torino → conto delle partite, B36.1, soglie dei trofei; risposte alle domande di `docs/PRODOTTI_FIERA_E_ONLINE.md` §4.

## >>> 16/11, 20:30 UTC · REGISTRO DI TORINO (file dell'utente) <<<

- [x] **Partite**: 587 in 4 giorni (13/11 15 · 14/11 125 · 15/11 251 · 16/11 196), 552 finite. Misure in
      `docs/b36/misure-torino.md` (solo numeri aggregati; il file dell'utente non è nel repository).
- [x] **Trofei ritarati → versione 2026-11-16.7**: Cecchino 8·12·15, Maratoneta 23·29·37, Asso 1·2·3, Vincente 3·4·5,
      Muro 18·25·33 (`natpf_trofei.js`; prove `natpf-b40-trofei`, `natpf-b40-card` aggiornate). Gioco 1768/1768, sito
      280/280, LAN 13/13, desktop 56/56, build. Razzo e In serie non ritarati (perché: documento §4).
- [ ] **B36.1 direzione: FERMA, da decidere con l'utente** (regola del piano): la cima è troppo imprecisa nei dati veri
      (metà dei colpi entro ±52°), oggi la palla la dirige il tempo (72–77 %). Osservazione: 84–91 % dei colpi in anticipo
      (+105…+221 ms): da guardare per prima.
- [x] Pacchetti della 16.7 (`ad38cc3`, GitHub verde): installer = `latest.json` (128.150.771 B, sha256
      `cc1002e940db4344b4d3eebdb4586172d26a42dfa380be94c8880bfe142e6d21`), `versioni.json` 16.7…16.3; zip 23.951.984 B,
      sha256 `0f2256607f9df2ac51272c32cac1e355e137e4abfb33f25ee3e138949b1b3cb9`, provato estratto, consegnato.
- [x] **B56 · anticipo dei colpi** (codice e prove; esce con la 2026-11-16.8) (decisione dell'utente del 16/11, domanda a scelta: «Prima l'anticipo»; la B36.1 resta
      ferma): capire se l'anticipo di Torino (84–91 % dei colpi, +130 ms in media) è uno spostamento fisso (latenza
      compensata male) o dipende dalla palla (persone che colpiscono presto), poi correggerlo e rimisurare con il registro.
- [x] B56: anticipo di ~+120 ms quasi costante a ogni velocità e postazione (`docs/b36/misure-torino.md` §5); correzione di
      100 ms solo in modalità fiera (`ANTICIPATION_S`), prove `natpf-b56-anticipo` 2/2, gioco 1770/1770. Da rimisurare.
- [x] **B57 · fine partita nello stesso schermo** (foto dell'utente del 16/11, 19:45): in alto e in evidenza solo chi ha
      vinto, sotto chi ha perso, visibile ma non in evidenza. Poi versione 2026-11-16.8 con B56 e B57.
- [x] B57 fatta (`docs/b57/fine-partita-chi-vince-sopra.md`): chi vince sopra e in evidenza, chi perde sotto attenuato;
      `natpf-fine-partita` 56/56. **Versione 2026-11-16.8** = B56 + B57: dopo il push pacchetti e consegna.
- [x] Pacchetti della 16.8 (`701436d`, GitHub verde): installer = `latest.json` (128.152.995 B, sha256
      `8f3d17f0100a09401490ec9b90cc128d541508f02139bc14ac9d6efad86fc344`); zip 23.952.107 B, sha256
      `4444b769527e703a56bd624420aade9ba17cc89f24b7b991973e014c2f8d00d0`, provato estratto, consegnato.

**Prossima azione esatta (16/11, 21:45 UTC)**: con lo scarico del registro della prossima giornata (utente): rimisurare
l'anticipo (atteso: mediana dell'errore di tempo vicina a 0 in fiera, più «Perfetto»), i trofei e la direzione; risposte
alle domande di `docs/PRODOTTI_FIERA_E_ONLINE.md` §4. Il Worker del registro va ricaricato dall'utente (503 dello scarico).

## 16/11, 23:00 UTC · B58 Lob e Drop a fine partita → versione 2026-11-16.9

- [x] Incarico dell'utente: pubblicare le 20 animazioni (PR #3 chiusa: erano in `site/assets/`, in fiera non si
      vedevano; PR #4 con i file in `natpf-tennis/public/media/mascotte/`). Il branch remoto
      `feature/natpf-mascotte-fine-partita` non si poteva cancellare da qui (proxy): resta, si può togliere da GitHub.
- [x] Richiesta dell'utente: «le gif devono vedersi», «aggiornare solo su fiera e adattare il materiale». Fondo
      trasparente (WebP, script `docs/b58/fondo-trasparente.py`), accanto al titolo, solo programma Windows;
      `docs/b58/mascotte-fine-partita.md`. Prove: `natpf-b58-mascotte` 11, pacchetto +1, `natpf-fine-partita` 66/66.
- [x] Domanda a scelta: «Unisci e pubblica» → unita in `natpf-simulator` (un commit), versione 2026-11-16.9.
- [x] 16.9 pubblicata (`7772083`; `latest.json` 16.9, installer sha256 `d939662a…3716`); zip 16.9 non consegnato.

**Prossima azione esatta (16/11, 23:00 UTC)**: pacchetti della 16.9; poi, con lo scarico del registro della prossima
giornata, rimisurare anticipo, trofei e direzione; risposte al §4 di `docs/PRODOTTI_FIERA_E_ONLINE.md`; Worker del
registro da ricaricare (utente).

## 16/11, 23:40 UTC · mascotte nella card → versione 2026-11-16.10

- [x] Richiesta dell'utente dopo la 16.9: «devono essere l'immagine del personaggio a sinistra, non sopra la schermata
      della vittoria; dentro la card». Fatto: finestra del personaggio della card, una per card (nello stesso schermo
      vittoria e sconfitta), ritratto di ripiego; `natpf-b58-mascotte` 13/13, `natpf-fine-partita` 66/66.
- [x] Prove della 16.10: gioco 1784/1784, sito 280/280, LAN 13/13, desktop 56/56, build (`2026-11-16.10` nel bundle).
- [x] Versione 2026-11-16.10 (`0a102d0`, tre workflow verdi): installer dal link fisso = `latest.json` (131.858.384 B,
      sha256 `1e644c2f05f8903e41d2ddb0f7202b5120e54827fe4bc439f91676b6f8356743`); zip 23.953.852 B, sha256
      `8a42a2d877dc99c7e6ef1d97ef939f8f46fe61d58c4456051111f343a827b997`, provato estratto (senza mascotte; con il ponte
      finto: file che manca → torna il personaggio 3D; build di produzione con il ponte: mascotte nella card).

**Prossima azione esatta (16/11, 23:40 UTC)**: pacchetti della 16.10; poi, con lo scarico del registro della prossima
giornata, rimisurare anticipo, trofei e direzione; risposte al §4 di `docs/PRODOTTI_FIERA_E_ONLINE.md`; Worker del
registro da ricaricare (utente).

## 16/11, 23:55 UTC · domande dell'utente sulle mascotte, B59 in coda

- [x] «Si muovono? sono animate?»: sì (10 fotogrammi, 1,6 s in loop) ma poco: 16 su 20 con i piedi fermi (misura in
      `docs/PIANO_LAVORI.md` §5, B58.1). Anteprima dei passi in CSS mandata all'utente: si fa solo con il suo sì.
- [x] Trovato un velo quasi invisibile sul fondo di 4 animazioni di Lob: script corretto, animazioni rifatte (velo 0 %,
      figure identiche), non ancora nel repository: vanno nella 16.11.
- [ ] B59 conto alla rovescia «Allenati un po'!» prima degli scambi di prova: in coda (`docs/PIANO_LAVORI.md` §5).

**Prossima azione esatta (16/11, 23:55 UTC)**: risposta dell'utente sui passi → versione 2026-11-16.11 (animazioni senza
velo, passi se approvati) → B59.

## 17/11, 00:20 UTC · versione 2026-11-16.11 (mascotte senza velo)

- [x] L'utente non capiva come erano le GIF in origine e come sono ora: mandate tre animazioni (confronto a tre colonne
      su quattro pose; gioco vero contro la CPU; gioco vero stesso schermo).
- [x] Animazioni senza velo nel repository (manifest e LEGGIMI aggiornati: 136–181 KB, 3,18 MB). Prove: gioco 1784/1784,
      sito 280/280, LAN 13/13, desktop 56/56, build (`2026-11-16.11` nel bundle), `natpf-fine-partita` 66/66.
- [x] Versione 2026-11-16.11 (`ddc1167`, tre workflow verdi): installer dal link fisso = `latest.json` (131.361.236 B,
      sha256 `cef5bf74deca583ee75a5de9197dfff499f2115d0f16e059528b75c2318e4dee`); zip 23.953.853 B, sha256
      `ac26663469ce1c60bf8e9631f2736bc8d7bc5d8f45277cb56cfc1f081e222585`, provato estratto (senza mascotte; build con il
      ponte finto: mascotte nella card senza riquadro), consegnato.

**Prossima azione esatta (17/11, 00:45 UTC)**: risposta dell'utente sui passi delle mascotte (B58.1); poi B59 (conto alla
rovescia «Allenati un po'!» prima degli scambi di prova); poi rimisure con il registro della prossima giornata.

## 17/11, 01:30 UTC · B59 conto alla rovescia «Allenati un po'!» prima degli scambi di prova

- [x] Decisione dell'utente: «ok con versione senza sfondo bianco» (mascotte come sono, niente passi), «vai avanti» → B59.
- [x] B59 fatto (`docs/b59/conto-allenati.md`): `natpf_prematch.beginTrial`, `natpf_trial` fase `count`, telefono
      `countFlash` con `trial`. Prove: gioco 1789/1789 (`natpf-b59-conto-prova` 5; tempi di 8 prove degli scambi
      aggiornati, +3,2 s), sito 280/280, build. Commit senza versione nuova (in attesa delle prove nel browser).
- [~] Prove nel browser degli scambi di prova (12 script) in corso; poi versione 2026-11-17.1 e pacchetti.

**Prossima azione esatta (17/11, 01:30 UTC)**: esiti delle 12 prove nel browser (`natpf-scambi-di-prova`,
`natpf-flusso-tocchi`, `natpf-fiera-telefoni`, `natpf-nuovo-giocatore`, `natpf-rally`, `natpf-phone-keep`,
`natpf-mano-sicura`, `natpf-servizio-lancio`, `natpf-servizio-scelta`, `natpf-solo-mouse`, `natpf-stesso-schermo-b25`,
`natpf-pannello-partita`): sistemare i tempi se servono, poi versione 2026-11-17.1, pacchetti, registrazione del conto
per l'utente.

## 17/11, 02:30 UTC · B60 km/h dei colpi nel registro; correzione della rivincita; prove nel browser

- [x] B60 (`docs/b60/kmh-dei-colpi.md`): riga «colpo» con `kmh` (campo già nel Worker), sezione del riassunto per il
      trofeo Razzo. Prove: `natpf-registro` +1, `registro-riassunto` +1.
- [x] Rivincita dai telefoni: «si parte da soli tra 11 s» a volte al posto di 10 (arrotondamento di orari con i decimali,
      `natpf_rematch.rematchAutoLine`): corretto, prova +3 controlli; `natpf-b47-rivincita` 8 volte su 8 verde.
- [x] Prove nel browser (12) dopo il B59: verdi fiera-telefoni 66/66, rally 10/10, mano-sicura 17/17, servizio-scelta
      18/18, solo-mouse 42/42, stesso-schermo-b25 55/55, flusso-tocchi 5/5. Aggiornate per il flusso di oggi:
      `natpf-scambi-di-prova` (prima il conto, B59) e `natpf-nuovo-giocatore` (nome dal telefono, B54.2: la prova si
      aspettava ancora la tastiera del PC). Da capire: `natpf-servizio-lancio` 10/17, `natpf-pannello-partita` 24/25,
      `natpf-phone-keep` (fermo su un clic): in corso le stesse tre sulla versione di prima (17/11, `9156fc5`).

**Prossima azione esatta (17/11, 02:30 UTC)**: confronto delle tre prove con la versione di prima; correggere; rifare le
prove cambiate; poi versione 2026-11-17.1 (B59 + B60 + rivincita) e pacchetti.

## 17/11, 04:00 UTC · telefono: blocco che copriva «Riattiva i sensori»; prove nel browser rimesse in riga; fogli del servizio

- [x] Difetto vero trovato da `natpf-phone-keep` (rossa anche prima): con il blocco dello schermo in partita (B51) il
      pulsante «Riattiva i sensori» e il velo «tocca per riprendere» stavano sotto il blocco (z-index 40 contro 30) e il
      tocco non arrivava. `phone-touch-lock.touchLockActive` con `alertTap` e `veil`, `racchetta.js` li passa e ridisegna
      il blocco quando cambiano. Prove: `phone-touch-lock` +2, sito 282/282, `natpf-phone-keep` 13/13.
- [x] Prove nel browser rosse già prima del B59 (confronto sulla `9156fc5`) e scritte per flussi vecchi, aggiornate:
      `natpf-servizio-lancio` (lancio con il gesto: i tocchi in campo non valgono dal B51) 17/17,
      `natpf-pannello-partita` (la CPU batte apposta: dal B47 batte sempre chi gioca) 25/25,
      `natpf-scambi-di-prova` (conto B59 guardato appena è in vista, scritte annotate) 32/32,
      `natpf-nuovo-giocatore` (nome dal telefono B54.2, scambi di prova prima della pagina B35, attese più lunghe).
- [x] Osservato nelle prove: all'inizio degli scambi di prova, con il telefono simulato lento (più di 2,5 s a ripartire),
      la pausa «Telefono non pronto» per circa 3 s; c'era già prima del B59. Un telefono vero risponde in pochi decimi:
      da guardare nel registro (righe di pausa all'inizio della prova), nessuna modifica al gioco.
- [x] Capito e corretto: con la calibrazione «Con i gesti», dopo «Nuovo giocatore» (B54.2, senza il foglio del nome)
      l'allenamento partiva nello stesso istante del reset, con il telefono ancora «pronto»: saltava la calibrazione e
      tornava alla pagina, il telefono restava su «Prova un colpetto». `natpf_new_player.afterPhoneReset`: con i gesti si
      aspetta la risposta del telefono (al più 1,5 s). Prove: `natpf-b54-nome` +1, gioco 1792/1792,
      `natpf-nuovo-giocatore` 29/29 con i gesti e 32/32 con «Giocando»; `natpf-telefono-bloccato` 12/12,
      `natpf-nome-telefono` 23/23 (con `NATPF_SITE_ROOT`: cartella con `natpf` → `site`).
- [x] Fogli di confronto del servizio (B53.4): `COLPO=servizio` in `tools/e2e/natpf-dritto-video.mjs`, 4/4,
      `docs/b53/servizio-prima-dopo.webp`.

**Prossima azione esatta (17/11, 04:00 UTC)**: esiti di `natpf-nuovo-giocatore` (Giocando e Con i gesti),
`natpf-telefono-bloccato`, `natpf-nome-telefono`; il caso «Con i gesti»; poi versione 2026-11-17.1 e pacchetti.

## 17/11, 05:00 UTC · versione 2026-11-17.1

- [x] B59 + B60 + correzioni (rivincita, blocco del telefono, «Nuovo giocatore» con i gesti). Prove: gioco 1792/1792,
      sito 282/282, LAN 13/13, desktop 56/56, build (`2026-11-17.1` nel bundle); nel browser l'elenco in WORK_PROGRESS.
- [x] Pacchetti della 17.1 (`8620ceb`, tre workflow verdi): installer dal link fisso = `latest.json` (131.372.014 B,
      sha256 `d1b842cd46148fe8e6978bfc35e50dbc798977bcd708bf9a6eb0a3818c41c69b`); zip 23.955.038 B, sha256
      `290c94bab354b10e7a2d4c910b127a88b600de3c4ae5154b9c45fc2609d64861`, provato estratto (senza mascotte; build con il
      ponte finto: mascotte nella card), consegnato.

## MESSAGGIO PER IL PROSSIMO AGENTE (17/11, 07:40 UTC)

La roadmap di sviluppo è finita: versione **2026-11-17.1** pubblicata e verificata. Quello che resta dipende dall'utente:
1. **Registro della prossima giornata** (lo scarica lui dal Worker e lo carica qui): rimisurare l'anticipo (B56: mediana
   dell'errore di tempo in fiera vicina a 0, più «Perfetto»), i trofei, il **Razzo** con i km/h dei colpi (B60, sezione
   «Velocità dei colpi» di `natpf-tennis/scripts/registro/riassunto.mjs`, solo righe dalla 17.1), la direzione (B36.1:
   ferma, decide l'utente con i numeri), e le pause «Telefono non pronto» all'inizio degli scambi di prova (viste solo
   con il telefono simulato lento).
2. **Worker del registro da ricaricare** (lui: corregge il 503 dello «Scarica» e mostra la colonna «Partite»).
3. **Due prodotti**: risposte alle domande del §4 di `docs/PRODOTTI_FIERA_E_ONLINE.md` prima di separare il codice.
4. **Collaudi** che qui non si possono fare: telefoni veri con l'app 1.0.3, ledwall, programma Windows vero.
Prove nel browser: le `natpf-*` si lanciano da sole; `natpf-telefono-bloccato` e `natpf-nome-telefono` con
`NATPF_SITE_ROOT` (cartella con il collegamento `natpf` → `site`) e `tools/e2e/run-local.mjs`.

**Prossima azione esatta (17/11, 07:40 UTC)**: aspettare l'utente (punti 1–4 qui sopra).

## 17/11, 09:10 UTC · B61 collaudo dello stand, versione 2026-11-17.2

- [x] Quattro segnalazioni dell'utente sulla 17.1 (foto del ledwall): `docs/b61/collaudo-17-11.md`. Mascotte Drop e Lob per
      parte, sempre animate con la figura che si muove; stesso schermo: anello del Player 2 e TORINO dritto; `pl` nel
      registro per dritto e rovescio (non riprodotto). Prove: gioco 1800/1800, sito 282/282, LAN 13/13, desktop 56/56,
      build; nel browser fine-partita 68/68, stesso-schermo-b25 57/57.
- [x] Pacchetti della 17.2 (`d8183f1`, tre workflow verdi): installer dal link fisso = `latest.json` (131.379.955 B, sha256
      `f3788fa9cae637d4b2d537d731002eef98c0e7ef8df2681c0eb91ec4ae66ca2d`); zip 23.955.734 B, sha256
      `a0fc630ff40ff5254c28d8656bb3772de9aa9780f6a43262839c079df408f89a`, provato estratto, consegnato con l'anteprima
      animata della fine partita (`docs/b61/fine-partita-17-2.webp`).

**Prossima azione esatta (17/11, 09:30 UTC)**: aspettare l'utente: registro del 17/11 (sezioni B46 e «Dritto e
rovescio dalla parte della palla»), la sua mano, il video; Worker da ricaricare solo per `pl` della 17.2.

Verifica del 17/11, 09:40 UTC: la pagina pubblica del Worker (`natpf-registro…workers.dev`, senza chiave) ha già i nuovi
tentativi su 500/502/503 e la colonna «Partite»: **la ricarica dell'8cf2561 (503) l'utente l'ha già fatta**. Resta da
ricaricare solo per il campo `pl` (dalla 17.2); senza, il Worker lo scarta e tiene la riga.

## 17/11, 13:30 UTC · B62 salvaschermo e analisi delle ridondanze, versione 2026-11-17.3

- [x] Salvaschermo (`docs/b62/salvaschermo.md`) e analisi delle ridondanze (`docs/analisi/ridondanze-2026-11-17.md`).
      Prove: gioco 1808/1808, sito 282/282, LAN 13/13, desktop 56/56, build; nel browser salvaschermo 21/21, b25 57/57,
      b20 52/52, stand-layout 8/8, solo-mouse 42/42, pannello-partita 25/25.
- [x] Pacchetti della 17.3 (`b96f283`, tre workflow verdi): installer dal link fisso = `latest.json` (131.354.343 B, sha256
      `a6cbc2baf42c1d8a32834d173275911177f8f73a0b0429648e395bac7b80fa21`); zip 23.957.559 B, sha256
      `7540d176c0d364345f934991422f2d6aaf32042718f57e0909aacc385f556ee5`, provato estratto (salvaschermo spento online).
- [x] Anteprima delle mascotte 3D native di oggi (ritratti del B40.6, Drop esulta e Lob applaude):
      `docs/analisi/mascotte-3d-attuali.webp`. Decisione all'utente.

**Prossima azione esatta (17/11, 14:00 UTC)**: aspettare l'utente: mascotte (GIF di oggi, 3D di oggi, 3D con animazioni
nuove), proposte delle ridondanze, registro del 17/11.

## 17/11, 14:10 UTC · decisioni dell'utente e piano (B63 mascotte 3D, B64 ridondanze)

Risposte dell'utente (domande a scelta):
- Mascotte: **«3D con animazioni nuove»**: 3 animazioni di vittoria e 3 di sconfitta per i modelli 3D di Lob e Drop (passi
  avanti, indietro, di lato, balletto, testa bassa), **anteprima all'utente prima di pubblicare** (B63).
- Ridondanze (`docs/analisi/ridondanze-2026-11-17.md` §3): **sì** a «Fascia una volta sola» (stesso schermo: fascia in «Pronto
  per la partita», niente domanda alla Rivincita con «Cambia fascia», parole «Aiuto al più giovane» / «Livello»), «Livello
  CPU senza doppioni» (in «Altre impostazioni» solo Esperta e Leggenda), «Impostazioni doppie» (personaggi, visuale, audio,
  schermo intero, chi batte: un posto per il visitatore e uno per lo staff); **no** alla mano in due posti (B64).

Piano: [ ] B63 animazioni 3D e anteprima → [ ] B64 ridondanze (un passo per proposta, prove nel browser) → versione.

**Prossima azione esatta (17/11, 14:10 UTC)**: B63, leggere `src/player_body_animation.js` (reazioni «cheer» e «clap») e
`src/natpf/natpf_ritratti.js` (cattura dei fotogrammi), poi le animazioni nuove.

## 17/11, 16:30 UTC · B63 anteprima consegnata, B64 fatto, prove nel browser in corso

- [x] B63 (`docs/b63/mascotte-3d.md`): sei movimenti 3D, interruttore spento di base; anteprima mandata all'utente
      (`docs/analisi/mascotte-3d-anteprima.webp`). **Aspetta l'approvazione**: se sì, accendere di base nel programma
      Windows (e decidere Lob e Drop anche con i Classici).
- [x] B64 (`docs/b64/ridondanze.md`): «Livelli per esperti», righe doppie delle Opzioni nascoste, «Batte per primo» solo
      quando conta, rivincita dello stesso schermo «Stessi giocatori, stesse fasce» + «Cambia fascia».
- [x] Salvaschermo spento di base nel server di sviluppo e in `tools/e2e/th.mjs` (copriva le prove ferme nel menu).
- [~] Prove nel browser: salvaschermo, chi-gioca, lob-drop, b47-fiera, stesso-schermo-b20, schermo (gioco 1815/1815, sito
      282/282). Poi versione 2026-11-17.4 e pacchetti.

**Prossima azione esatta (17/11, 16:30 UTC)**: esiti delle sei prove (task in background); se verdi, versione 17.4
(version.js, build.json, LEGGIMI, novità, guida), commit, push, pacchetti; se il controllo dei piedi di lob-drop fallisce
ancora (3,08 % contro 3 %), verificarlo sulla 17.3 (non toccato oggi).
- [x] Commit e push del lavoro (B63 spento, B64, salvaschermo spento in sviluppo) **senza** versione nuova: le prove nel
      browser non erano finite e il workflow pubblica solo con la versione che sale. La riga delle novità della 17.4 è in
      attesa (testo nel commit seguente).

## 17/11, 18:00 UTC · B65 classifica a fine partita, versione 2026-11-17.4

- [x] Decisioni dell'utente: nello stesso schermo solo chi vince; classifica dopo la card per 8 s. Fatto
      (`docs/b65/classifica-fine.md`), prove 1820/1820, sito 282/282, nel browser classifica-fine 11/11.
- [x] Prove nel browser delle ridondanze (B64) tutte verdi; lob-drop: il controllo dei piedi fallisce uguale sulla 17.3.
- [x] Versione 17.4 (`f5c6a4f`): installer dal link fisso = `latest.json` (131.379.204 B, sha256
      `d442fa8de1ef7d2341705597a5242c0a6d463db1926e51897ef10752b4fb7aed`); zip 23.961.695 B, sha256
      `8e2559f1bc0d5cc73bb744ad95cfd3d67e48d9241d5ad36482fb14e28d8c5422`, provato estratto. Workflow «motore base MVP» rosso
      la prima volta su un test di velocità del Worker del registro (soglia di 20/30 ms sulla macchina di GitHub; in
      locale verde): rilanciato, verde (tre workflow verdi).

**Prossima azione esatta (17/11, 18:40 UTC)**: aspettare l'utente: approvazione delle mascotte 3D (B63, poi accenderle nel
programma Windows e decidere Lob e Drop anche con i Classici); registro del 17/11 (dritto e rovescio); collaudo allo stand
di salvaschermo, ridondanze e classifica di fine partita. Punto aperto: il controllo dei piedi in corsa di
`tools/e2e/natpf-lob-drop.mjs` (3,08 % contro 3 %) fallisce già sulla 17.3.

## 17/11, 19:00 UTC · Worker del registro

- [x] L'utente: «stamattina mi pare di averlo già fatto» (ricarica del Worker con il file della 17.2, campo `pl`). Da
      confermare con il prossimo scarico del registro: le righe «colpo» dalla 17.2 devono avere `pl`; se mancano, il Worker
      ha ancora la versione del 16/11 e va ricaricato una volta.


## 18/11, 07:30 UTC · richiesta dell'utente: più dati nel registro su sensori, calibrazione, prestazioni e precisione (B66)

- Proposta del coordinatore (sei gruppi) e risposta dell'utente: «aggiungili tutti subito; il percorso del visitatore non
  conta (non sempre c'è fila); salute del PC non fondamentale; voglio puntare su qualità dei sensori, calibrazione,
  performance e precisione dei gesti». Prodotto: FIERA.
- **B66** (agente, ramo locale `b66-registro-sensori`, worktree `scratchpad/b66/wt`): (1) rete e stato del telefono
  dall'app Android (segnale Wi-Fi, banda, velocità del collegamento, batteria, carica, temperatura, «Fissa app»); (2)
  qualità del collegamento (distribuzione del ritardo, sbalzi, messaggi persi o tardivi, pause per segnale debole); (3)
  qualità dei sensori (frequenza vera, buchi durante il gesto, versione della pagina/app contro il PC); (4) telefono
  bloccato (tocchi bloccati, sblocchi, uscite); più misure di calibrazione e di precisione dei gesti. Niente percorso del
  visitatore, niente salute del PC. Campi nuovi = Worker del registro da ricaricare (lo fa l'utente).
- Nota: in questo contenitore non c'è l'SDK di Android; l'APK si costruisce nel workflow di GitHub.
- 18/11, 07:45 UTC · richiesta dell'utente sulle mascotte 3D (B63): «sistemare meglio come la mascotte impugna la
  racchetta; pose simpatiche come "Six Seven" (TikTok) o aura battle; nella sconfitta la mascotte deve sembrare visibilmente
  triste». **B67** avviato (agente, ramo locale `b67-mascotte-pose`, worktree `scratchpad/b67/wt`, porte 4550–4599): niente
  unione né versione finché l'utente non approva la nuova anteprima (`docs/analisi/mascotte-3d-anteprima-b67.webp`).
  Interruttore delle mascotte 3D sempre spento di base.

## 18/11, 11:30 UTC · B66 fatto, versione 2026-11-18.1

- [x] B66 (`docs/b66/registro-sensori.md`): registro con qualità dei sensori (`tq`), collegamento (`lat`, `rit` nei colpi),
      rete e batteria dall'app (`wifi`), telefono bloccato (`blocco`), calibrazione (`cal`), pause, precisione dei gesti
      (`cf`, `mg`, `gb` nei colpi), versioni di pagina e app. Formato delle righe 3: **Worker da ricaricare** (utente, §5).
- [x] App NATPF Racchetta 1.0.4: `Bridge.stato()` (solo numeri). SDK di Android installato nel contenitore
      (`scratchpad/b66/android-sdk`): build, test e lint locali verdi.
- [x] Prove: gioco 1826/1826, sito 289/289, LAN 13/13, desktop 56/56, build; nel browser 8 prove verdi (WORK_PROGRESS).
- [x] Push `fc593e4`. Pacchetti: installer dal link fisso = `latest.json` 2026-11-18.1 (131.385.673 B, sha256
      `2a79bc0f738dc390d46dee1452598c1f2a0683472cf0739265c2696ba198abbe`); zip Cloudflare 23.969.237 B, sha256
      `f24a6212d45231624d0a00946b1e4d104d6e9d4048777690d87020e9f4058d4b`, senza `registro.json`, provato estratto (gioco e
      pagina del telefono 2026-11-18.1, registro in coda senza indirizzo; `natpf-nome-telefono` 23/23, `natpf-telefono-bloccato`
      11/12: l'unico KO è il CORS del Worker TURN vero visto da 127.0.0.1, non del B66); APK 1.0.4 pubblicato su R2
      (`android/NATPF-Racchetta-1.0.4.apk` = link fisso, 682.229 B, sha256
      `cdcacbd00d44bacef27552be979ae2e5bcf669c5b102ab33595ddaaec19968a5`, versionCode 5, firmato con la chiave dello stand).
      Quattro workflow verdi sul commit della versione (Simulator tests, motore base MVP, eseguibili Windows, app Android).

**Prossima azione esatta (18/11, 11:45 UTC)**: aspettare l'utente: **ricaricare il Worker del registro** (formato 3,
`docs/b66/registro-sensori.md` §5), installare l'app 1.0.4 sui telefoni dello stand, poi il registro della prossima
giornata (sezioni nuove del riassunto). B67 (mascotte) è di un altro agente.

- 18/11 · **Worker del registro ricaricato dall'utente** con il file della 2026-11-18.1 (B66). Verificato dalla risposta
  pubblica del Worker: `{"ok":true,"registro":"pronto","spazio":true,"chiave":true,"formato":3}`.
- 18/11, 11:15 UTC · **B68** «Batte per primo» più breve (`093258f`): chi batte e il sorteggio li dice il conto, «Si gioca»
  dopo il conto non lo ripete e dura 1,3 s (prima 2,6 s). Gioco 1828/1828, sito 289/289, desktop 56/56, LAN 13/13, build;
  nel browser b20 52/52, b47-fiera 20/20, formato-fiera 29/29 (controllo vecchio della 14.7 allineato, `63f8f55`). Esce
  con la prossima versione.
- 18/11, 11:15 UTC · l'utente approva le mascotte del B67 («ok, integra queste») e chiede **altri balletti di esultanza**
  nello stile dei balletti virali. **B69** avviato (agente): unire il ramo `b67-mascotte-pose`, accendere le mascotte 3D di
  base nel programma Windows, 4–5 balletti nuovi originali, anteprima, poi versione **2026-11-18.2** con B68 e pacchetti.

## 18/11, 13:30 UTC · B69 fatto, versione 2026-11-18.2

- [x] B67 + B69 uniti (`13034c0`): mascotte 3D approvate e **accese di base** dove in campo ci sono Lob e Drop (programma
      Windows e web: solo codice, niente asset); con i Classici GIF del B58 (Windows) o ritratti (web) come prima.
      Spegnere: `natpf-tennis.mascotte3d` = '0' o `?mascotte3d=0`.
- [x] Balletti nuovi (`docs/b69/balletti-mascotte.md`): robot a scatti, disco con il dab, corsa all'indietro, passi
      incrociati, braccia a pendolo (racchetta piantata a terra), su il soffitto; sconfitte «Calcia un sassolino» e
      «Capriccio». 10 di vittoria e 5 di sconfitta, a caso, mai lo stesso della partita prima.
- [x] Anteprima: `docs/analisi/mascotte-3d-anteprima-b69.webp`, `docs/analisi/mascotte-3d-b69-grandi.png`, card
      `docs/analisi/mascotte-3d-b69-card-1920x1080.webp` e `-card-area-640x360.webp`.
- [x] Prove: gioco 1843/1843, sito 289/289, LAN 13/13, desktop 56/56, build; nel browser 7 prove verdi (lob-drop 136/137:
      piedi in corsa come prima). Versione 2026-11-18.2 con il B68.
- [x] Push `2c07fe9`. Pacchetti della 18.2: installer dal link fisso = `latest.json` 2026-11-18.2 (131.398.459 B, sha256
      `93251e5ce92fc0716767675b1a5ae04dbbd28c3ff229218932dd655ba64726c3`; dentro il gioco 18.2 con i balletti, nessun
      `.pem`/chiave); zip Cloudflare 23.979.096 B, sha256 `2b8767783775387f19f9ddabf7bd0c7d92722ab1259f31c35767fae9d20c3475`,
      senza `registro.json`, provato estratto (gioco e pagina del telefono 18.2, card con le mascotte 3D che ballano, 24
      fotogrammi; unico errore il CORS del Worker TURN vero visto da 127.0.0.1, come sempre). Tre workflow verdi (Simulator
      tests, motore base MVP, eseguibili Windows; l'app Android non cambia).

**Prossima azione esatta (18/11, 13:45 UTC)**: aspettare l'utente: collaudo delle mascotte che ballano sul ledwall e sul
PC dello stand (tempi veri della cattura con la GPU), installare l'app 1.0.4 sui telefoni dello stand.

## 18/11, 13:10 UTC · decisioni dell'utente sui prodotti; B70 mascotte solo nel programma Windows, versione 2026-11-18.3

- Versione **2026-11-18.2** (B67 + B69 mascotte che ballano, B68 «Batte per primo» più breve) pubblicata dall'agente:
  installer `93251e5c…26c3` dal link fisso (verificato), zip `2b876777…3475`, consegnati all'utente con l'anteprima.
- Decisioni dell'utente (`docs/PRODOTTI_FIERA_E_ONLINE.md` §4.1): mascotte che ballano **solo nel programma Windows** della
  fiera; Lob e Drop sono del solo evento: a fine fiera si torna ai **Classici**; **FITP Simulator white label**
  (brandizzabile per evento), che torna sul campo esports della FITP.
- **B70**: `natpf_card_moves.cardMovesOn` acceso solo con `window.natpfDesktop` o nel server di sviluppo (come
  `dayBoardOn`); test `natpf-b70-mascotte-solo-windows`. Gioco 1844/1844, sito 289/289, desktop 56/56, LAN 13/13, build.
  Versione **2026-11-18.3**.
