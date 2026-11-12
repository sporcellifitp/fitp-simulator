# TRACCIA DEI PASSI · da leggere per primo quando si riparte

File breve, aggiornato **a ogni passo** (prima di un'operazione lunga e subito dopo). Dice dove si è arrivati e cosa
fare adesso. Il dettaglio sta in `docs/PIANO_LAVORI.md` (decisioni, regole) e `docs/WORK_PROGRESS.md` (misure).
Repository: `sporcellifitp/fitp-simulator`, branch `natpf-simulator`.

Segni: `[x]` fatto e su GitHub · `[~]` in corso (c'è scritto il punto esatto) · `[ ]` da fare.

## ADESSO (aggiornato il 12/11/2026 alle 18:05 UTC)

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

## B27 e B28 (secondo agente, sessione parallela; aggiornato il 12/11/2026 alle 17:35 UTC)

Lavoro chiesto dall'utente allo stand, in rami locali separati e unito qui un blocco alla volta dopo `git fetch`.
**Il prossimo numero di versione libero è 2026-11-12.4** (la 2026-11-12.3 è il B27).

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
- [~] Correzioni + unione sopra la 2026-11-12.3 nel ramo `b28-cal-giocando` (agente fermato dal limite d'uso alle 14:45
      UTC a metà dell'unione, ripreso alle 17:32 UTC)
- [ ] Correzioni, unione (tocca `natpf_lobby.js`, `natpf_training.js`, `natpf_ui.js`, `natpf_phone_racket.js`, tre righe
      di `game_engine.js`, `racchetta.js`, pannello dello stand), prove complete, versione, pacchetti
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
- [~] **B30 · Registro dello stand, in corso dalle 18:15 UTC** (richiesta dell'utente del 12/11: «prevedi una raccolta di log
      continuativi (solo gameplay) per quando aprirò lo stand alla gente»): workflow `b30-registro-dello-stand` (run
      `wf_f20b2599-40d`, base `ccb2f43`; worktree `wf_f20b2599-40d-1` → revisore → correzioni). Registro continuo e leggero,
      solo di gioco, senza dati personali; file JSON Lines per giorno sul PC dello stand (programma Windows) e nel
      browser; pannello dello stand «Registro di gioco: Sì · No», scarico e cancellazione; strumento
      `natpf-tennis/scripts/registro/riassunto.mjs`; documento `docs/b30/registro-dello-stand.md`. Invio automatico a
      Cloudflare: solo descritto, da decidere con l'utente. Ripresa: come per il B29 (script
      `b30-registro-dello-stand-wf_f20b2599-40d.js` nella stessa cartella).
- Nota dell'utente del 12/11 (18:10 UTC), con una schermata di Lob costruito nel codice in partita e le due immagini pulite
  generate: vuole in campo i personaggi come nelle immagini → è il B29. Il GLB che ha allegato è lo stesso `drop.glb` già
  in uso (stessa impronta sha256 `981fcbc1…`).
- [ ] Dopo le prove complete: `ripresa-b23-t2g2.js` (dritto dal video + tappa 2 gruppo 2, worktree `wf_26d95fdf-3ea-1` e
      `-2`, base `9b8f9cb`; all'unione attenzione a `game_engine.js` `_natpfRacketShot`, toccato dal gruppo 3).
- Aperti del gruppo 3 da chiedere all'utente dopo le prime partite vere: valore di partenza del livello Evento (0,8); a
  Evento cambiano anche le regole di chi gioca, non solo la CPU.

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

## COME SI LAVORA (regole dell'utente)

- Risposte **sintetiche**. Aggiornamento **ogni ora** mentre c'è lavoro in corso.
- Non superficiale: un agente per blocco, **revisore indipendente** prima dell'unione, poi prove complete.
- Pacchetti (installer su R2 + zip Cloudflare) dopo ogni versione, con «come si attiva» per ogni opzione nuova.
- Se un agente si ferma per il limite d'uso: le modifiche restano nella sua worktree (`git worktree list`); riprenderlo
  con un messaggio, non rifare da capo.
