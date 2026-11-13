# TRACCIA DEI PASSI · da leggere per primo quando si riparte

File breve, aggiornato **a ogni passo** (prima di un'operazione lunga e subito dopo). Dice dove si è arrivati e cosa
fare adesso. Il dettaglio sta in `docs/PIANO_LAVORI.md` (decisioni, regole) e `docs/WORK_PROGRESS.md` (misure).
Repository: `sporcellifitp/fitp-simulator`, branch `natpf-simulator`.

Segni: `[x]` fatto e su GitHub · `[~]` in corso (c'è scritto il punto esatto) · `[ ]` da fare.

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
- [~] **Versione 2026-11-13.7** (controllo rapido verde: gioco 1416/1416, sito 226/226, Windows 42/42, build ok; commit e push in corso) = solo l'indirizzo del registro in `natpf-desktop/registro.json` (installer). Lo zip
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
      [~] In corso dalle 10:45 UTC: analisi in sola lettura (workflow `b36-direzionalita-analisi`: telefono, esito del
      colpo, B35a, vincoli, riferimenti → tre piani tecnici) → sintesi in `docs/b36/piano-direzionalita.md` → due
      revisori contrari → piano finale all'utente. **Nessuna modifica al codice finché l'utente non approva il piano.**

## COME SI LAVORA (regole dell'utente)

- Risposte **sintetiche**. Aggiornamento **ogni ora** mentre c'è lavoro in corso.
- Non superficiale: un agente per blocco, **revisore indipendente** prima dell'unione, poi prove complete.
- Pacchetti (installer su R2 + zip Cloudflare) dopo ogni versione, con «come si attiva» per ogni opzione nuova.
- Se un agente si ferma per il limite d'uso: le modifiche restano nella sua worktree (`git worktree list`); riprenderlo
  con un messaggio, non rifare da capo.
