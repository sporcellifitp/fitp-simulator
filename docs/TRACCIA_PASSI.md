# TRACCIA DEI PASSI · da leggere per primo quando si riparte

File breve, aggiornato **a ogni passo** (prima di un'operazione lunga e subito dopo). Dice dove si è arrivati e cosa
fare adesso. Il dettaglio sta in `docs/PIANO_LAVORI.md` (decisioni, regole) e `docs/WORK_PROGRESS.md` (misure).
Repository: `sporcellifitp/fitp-simulator`, branch `natpf-simulator`.

Segni: `[x]` fatto e su GitHub · `[~]` in corso (c'è scritto il punto esatto) · `[ ]` da fare.

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

