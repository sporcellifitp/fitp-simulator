# RIPRESA PER IL PROSSIMO AGENTE · lavori FERMATI dall'utente il 13/11/2026 alle 16:00 UTC

Scritto dall'agente principale (orchestratore) su richiesta dell'utente: «stoppa i lavori, salva tutto e lascia un
messaggio per l'altro agente per dirgli come deve continuare». Leggerlo **dopo** `CLAUDE.md` e **prima** di
`docs/TRACCIA_PASSI.md` (il diario passo per passo; le sezioni in fondo sono le più recenti). Repository
`sporcellifitp/fitp-simulator`, branch **`natpf-simulator`** (unico branch su cui lavorare e fare push).

## 0. MESSAGGIO PER L'AGENTE CHE RIPRENDE: cosa fare, nell'ordine

Quando sono stati fermati i lavori **nessun agente era in esecuzione**. Tutto è salvato:
- `natpf-simulator` su GitHub;
- i due rami di lavoro non ancora uniti, B37 e B42, in `docs/ripresa/rami-b37-b42.bundle`.

1. **Controlla lo stato.** `git fetch origin natpf-simulator`, `git status -sb`, `git log --oneline -5`. Leggi questo
   file fino in fondo, poi gli ultimi paragrafi di `docs/TRACCIA_PASSI.md`.
2. **Recupera i rami B37 e B42.** Se non esistono già in locale, segui la §2 (`git fetch` dal bundle e
   `git worktree add`). In cima a ogni ramo c'è un commit «IN CORSO … NON verificato»: è lavoro a metà, da guardare.
3. **Finisci B37** (ramo `b37-collaudo-bis`). I quattro punti sono fatti:
   - fuori e rete annunciati quando la palla tocca davvero terra o rete, anche a fine partita;
   - segno sopra chi serve e riquadro a terra;
   - scritta del segnale del momento giusto;
   - F9 nel programma Windows.

   Mancano le verifiche finali: suite del gioco, del sito e di `natpf-desktop`, build, `npm run audit:legend`, prove
   nel browser (natpf-rally, natpf-formato-fiera, natpf-fine-partita, natpf-stesso-schermo-b20, natpf-1v1-p2p,
   natpf-servizio-lancio, natpf-lob-drop, natpf-menu, natpf-telecomando, natpf-tabellone, natpf-fuori-vero). Poi
   completa `docs/b37/collaudo-13-11-bis.md`. Puoi farlo tu o con un agente (`docs/coda/B37-collaudo-bis.md` più un
   «RIPRESA»).

   Poi unisci in `natpf-simulator` e pubblica la versione **2026-11-13.10** con la procedura della §6. Guarda tu le
   schermate di chi serve in `docs/b37/`. All'utente spiega come si attiva:
   - F9 nel programma apre il pannello dello stand;
   - il resto non va acceso.
4. **Finisci B42** (ramo `b42-scambi-lunghi`). La regola, la scritta e le misure sono fatte; `docs/b42/scambi-lunghi.md`
   è quasi completo, ma manca la parte `TESTO_SUITE` nella §7. Mancano anche la suite completa, la build e le prove nel
   browser (natpf-rally, natpf-stesso-schermo-b20, natpf-leggenda, natpf-formato-fiera, natpf-1v1-p2p). Togli
   `natpf-tennis/legend-prova-tmp.mjs`, che è un file temporaneo dell'agente.

   Unisci **dopo** B37. Entrambi toccano `game_engine.js` in punti diversi: rifai `audit:legend` e le prove sul codice
   unito. Poi la versione successiva. All'utente spiega che lo scambio caldo è acceso di base e si spegne dal pannello
   dello stand («Scambio che si scalda»).
5. **Poi la coda della §3, punto per punto.** Ogni blocco ha il compito già scritto in `docs/coda/` oppure un progetto
   in `docs/b39/` o `docs/b41/`. L'ordine: B43, poi B41 prima parte, poi B38 e B39, poi B41 seconda parte, poi B40, poi
   B36.
6. **Regole.**
   - Al massimo due blocchi di sviluppo in parallelo.
   - Push solo con i test verdi.
   - Una versione nuova dopo ogni blocco unito, con zip e installer verificati.
   - Aggiorna `docs/TRACCIA_PASSI.md` a ogni passo.
   - Risposte all'utente in italiano, brevi, e sempre con «come si attiva».
   - Non chiedere segreti.
   - Niente dati personali nel repository, che è pubblico.
7. **Quando B37 e B42 sono uniti**, cancella `docs/ripresa/` (il bundle) con un commit: serviva solo alla ripresa.

## 1. Dove siamo (verificato)

- `natpf-simulator` = `origin/natpf-simulator`, ultimo commit al momento della scrittura: `16cc6b0` (più il commit di
  questo file). Albero pulito.
- **Versioni pubblicate oggi** (installer su R2 verificato dal link fisso con `attesa-installer.sh`, zip consegnato):
  - **2026-11-13.7**: registro dello stand collegato al Worker dell'utente. Installer 128.089.067 B, sha256
    `97c098a4…329c`.
  - **2026-11-13.8**: B35a, direzione e precisione dei colpi dal telefono. Installer 128.063.238 B, sha256
    `74728e9f…f33c`.
  - **2026-11-13.9**: B35b, correzioni del collaudo: pagina «Pronto per la partita» dopo gli scambi di prova, fine
    partita nuova, «Al servizio», scia spenta di base, riga «Formato veloce». Installer 128.064.760 B, sha256
    `662a83c6…d4bc`; zip 23.845.173 B, sha256 `c94e0d72…1672`.
  - La prossima versione è la **2026-11-13.10** (oppure la prima di un giorno nuovo: `AAAA-MM-GG.1`).
- **Registro dello stand (B30) attivo**:
  - Worker dell'utente `https://natpf-registro.s-porcelli.workers.dev/`. Bucket R2 privato `natpf-registro`, binding
    `REGISTRO`, segreto `CHIAVE_LETTURA` solo dell'utente, `ALLOWED_ORIGINS` = `https://localhost:8443` (l'utente gioca
    solo dal programma Windows).
  - L'indirizzo sta in `natpf-desktop/registro.json`. Lo zip Cloudflare si fa **senza** `--registro-url`.
  - Non ancora confermato dall'utente: il primo giorno registrato nella pagina del Worker.
- **Collaudo dell'utente sulla 13.9**: «direi bene con la precisione». Poi le richieste delle sezioni 3 e 4.

## 2. I due rami non ancora uniti (agenti FERMATI alle 16:00 UTC)

Gli agenti sono stati fermati: i run `wf_63518f90-393` (B37) e `wf_5cbad5b6-b75` (B42) non girano più. Il lavoro rimasto
non salvato è stato chiuso in un commit «IN CORSO … NON verificato» in cima a ogni ramo.

| Blocco | Ramo | Base | Ultimo commit | Worktree (se il contenitore è lo stesso) | Stato |
|---|---|---|---|---|---|
| **B37** collaudo, seconda parte | `b37-collaudo-bis` | `1043c85` | `2bfe09a` (9 commit) | `.claude/worktrees/wf_63518f90-393-1` | Punti 1–4 fatti. Schermate di chi serve (Classici, Lob & Drop, stesso schermo, area stretta) in `docs/b37/`. Impronte e Leggenda uguali alla base su due serie di semi. Nel commit «IN CORSO»: documento aggiornato, misure `docs/b37/misure/fuori-dopo-2.json`, prova `natpf-fuori-vero` ritoccata. Mancano le verifiche finali e il documento finale. |
| **B42** scambi lunghi | `b42-scambi-lunghi` | `fe6f774` | `ae76bdf` (4 commit) | `.claude/worktrees/wf_5cbad5b6-b75-1` | Fatti la regola (scambio caldo di base dal 20° colpo, per tutti e due i lati e la CPU) e la scritta piccola «Scambio caldo · colpo N». Misure dopo fatte, in `natpf-tennis/scripts/audit/b42/risultati/`: legend prima/dopo, cpu-pressione, evento-bambini, b25. Documento `docs/b42/scambi-lunghi.md` quasi completo (manca `TESTO_SUITE`). Mancano suite, build e prove nel browser; da togliere `natpf-tennis/legend-prova-tmp.mjs`. |

**Se le worktree non ci sono più** (contenitore nuovo), i due rami sono interi nel bundle, verificato con
`git bundle verify`:
```sh
git fetch docs/ripresa/rami-b37-b42.bundle b37-collaudo-bis:b37-collaudo-bis b42-scambi-lunghi:b42-scambi-lunghi
git worktree add .claude/worktrees/b37 b37-collaudo-bis
git worktree add .claude/worktrees/b42 b42-scambi-lunghi
# nelle worktree: (cd natpf-tennis && npm ci), poi (cd natpf-desktop && ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci) se serve
```
Il bundle richiede i commit `1043c85` e `fe6f774`, che stanno nella storia di `natpf-simulator`. Questi file servono solo
alla ripresa: si tolgono quando B37 e B42 sono uniti.

**Lo script dei blocchi**:
- Percorso: `/root/.claude/projects/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/workflows/scripts/blocco-singolo.js`.
  Esiste solo in questa sessione: in una sessione nuova si rifà così. Un agente in worktree esegue il compito, fa
  commit sul ramo (niente push) e restituisce `{worktree, branch, head, summary, howToActivate, measures, tests,
  notVerified, unsure}`.
- Argomenti: `{key, base, branch, title, doc, task, worktree?}`.
- Riprendere:
  `Workflow({scriptPath: '…/blocco-singolo.js', args: {…stessi args…, worktree: '<percorso della worktree>'}})`,
  con un `task` che dica «RIPRESA: fatto X, manca Y».
- Lezione: **non** mandare SendMessage agli agenti di un workflow in corso (nasce un'istanza doppia).

## 3. Coda dei lavori, in ordine

Regole del processo, decise con l'utente:
- un agente per blocco, al massimo **due** blocchi di sviluppo in parallelo;
- revisore indipendente solo alla fine di una serie;
- dopo ogni blocco l'orchestratore guarda risultati e schermate, unisce in `natpf-simulator`, poi versione nuova,
  controllo rapido, commit, fetch, push, zip, attesa e verifica dell'installer, e dice all'utente «come si attiva».

1. **Unire B37** (quando chiude): controllo rapido, più `natpf-rally`, `natpf-lob-drop` (parte di chi serve) e
   `natpf-formato-fiera` sul codice unito. Poi la versione.
2. **B43 · tabellone pulito e pannello dello staff che ferma la partita**. Compito pronto in
   `docs/coda/B43-tabellone-e-pannello.md`; base = `natpf-simulator` con B37 unito.
   - Richiesta dell'utente: troppi testi vicino al tabellone. Togliere «Formato veloce» e «al meglio di tre», al più
     un'etichetta nel tabellone.
   - Difetto verificato: il pannello aperto in partita **non ferma la partita** e si apre **sotto** la pausa.
3. **Unire B42** (quando chiude): rifare `audit:legend` sul codice unito.
4. **B41 prima parte · modalità fiera**: telefoni dello stand abbinati una volta, ricollegamento senza QR, chiosco che
   non scollega, pagina del telefono dello stand, **«Sono pronto» dal telefono con partenza automatica**, che vale anche
   fuori dalla fiera. Compito in `docs/coda/B41-modalita-fiera-parte-1.md`; progetto in
   `docs/b41/progetto-modalita-fiera.md`.
5. **B38 + B39 · stand con il solo mouse**:
   - tastiera a schermo: `docs/coda/B38-tastiera-a-schermo.md`;
   - lista dei 21 punti e proposta in 7 passi: `docs/b39/controllo-solo-mouse/LISTA-UNICA-E-PROPOSTA-B39.md`, più
     `revisore-cosa-manca.md`.
   - Bloccanti:
     - pannello dello stand e diagnostica raggiungibili con il mouse in ogni schermata (il marchio è nascosto nella
       pagina principale del menu, `natpf-ui.css:552`);
     - tasto «indietro» del mouse che fa sparire il gioco nel programma;
     - porta 8443/8080 occupata (errore inglese senza uscita);
     - Esci, Ricarica e schermo intero del programma con il mouse;
     - classifica a schermo intero senza uscita;
     - doppio clic che salta pagine (forse la causa delle «impostazioni saltate» del collaudo).
   - Decisioni: solo ledwall, mouse solo dello staff, tasto destro = menu dello staff.
   - Si può dividere in due agenti: programma Windows (`natpf-desktop`, `tools/lan`) e interfaccia del gioco.
6. **B41 seconda parte**: interruttore «Modalità fiera» nel pannello, foglio «Telefoni dello stand», pagina della fiera
   (il livello e via), «Prossimo giocatore», visitatori numerati, batte sempre il visitatore. Tappe B41.4–B41.5 del
   progetto.
7. **B40 · fine partita v2**: card della partita con il personaggio, trofei bronzo/argento/oro e **personaggi 3D
   animati per il giocatore 1 e 2** (chi vince esulta, l'altro applaude).
   - Proposta grafica nella riga «v2» della tavola https://claude.ai/artifact/PMb2Gg3ZiakcHuqynZ2pJL: tavole
     `V2Vittoria`, `V2Sconfitta`, `V2StessoSchermo`, `V2Trofei`; immagini di Lob e Drop già caricate nella tavola.
   - L'utente ha chiesto le animazioni ma non ha ancora commentato la card: mostrargliela prima di sviluppare.
   - Contatori nuovi in `natpf-tennis/src/natpf/natpf_match_stats.js`: serie di punti, game a zero, rimonta, colpi a
     vuoto, prima partita, posto in classifica.
8. **B36 · direzionalità al centro, campo aperto, stile arcade** (fase successiva chiesta dall'utente).
   - Analisi fatta: `docs/b36/analisi/` contiene cinque letture del codice e tre piani («prima il gioco», «prima il
     segnale», «prima la sicurezza»), più il video 1 guardato fotogramma per fotogramma
     (`video1-gioco-commerciale.md`; il video 2 non è mai arrivato).
   - Da fare: piano unico, poi tre revisori contrari, poi versione finale in `docs/b36/piano-direzionalita.md`. Il
     workflow `b36-piano-unico` (run `wf_c286e290-cbc`) è fallito per il limite: rilanciarlo con i percorsi in
     `docs/b36/analisi/`.
   - Mostrare il piano all'utente. **Niente codice prima del suo sì.**
9. **Dopo**: tappa 3 punto 4 (doppio 2 contro 2); tappa 3 punto 5 (misura del ritardo del ledwall, scelte di
   servizio, servizio della CPU più vario, Leggenda campione); estendere il dritto del B23 se piace; revisore
   indipendente finale della serie B37–B43; collaudo dell'utente allo stand.

## 4. Decisioni dell'utente ancora valide (13/11)

Stanno anche in `docs/PROJECT_MEMORY.md` §«Decisioni dell'utente del 13/11/2026 (pomeriggio)».
- **Modalità fiera**: scambi di prova per ogni visitatore (calibrazione «Giocando»); contro la CPU **batte sempre il
  visitatore**; visitatori numerati («Visitatore 12», da capo ogni giorno); «Sono pronto» sul telefono e partenza
  automatica.
- **Stand**: solo ledwall, mouse solo dello staff.
- **Gioco**:
  - «Ricalibra» a partita in corsa resta com'è;
  - i tre riquadri della fine partita vanno bene;
  - Leggenda e salita a rete: «resta com'è», cioè con la salita automatica del B31 come agli altri livelli (la proposta
    di toglierla, B34, è stata tenuta da parte e non si rimette);
  - classifica con prima le vittorie; km/h veri.
- **Sicurezza**: mai chiavi, token o dati personali nel repository (è **pubblico**), né nei commit; mai chiedere
  segreti in chat. Il nome del gioco commerciale e i nomi di giocatori reali non vanno nei file.

## 5. Cose da sapere

- **Ctrl+Maiusc+K** non apre il pannello sul PC dell'utente (causa non trovata). Strada con il mouse: aprire «Opzioni»
  e tenere premuto 3 s il marchio NATPF in alto a sinistra (nella pagina principale del menu il marchio è nascosto).
  B37 aggiunge F9 nel programma.
- **Il cerchietto bianco che segue la palla** è il segnale del momento giusto. B37 aggiunge la scritta che lo spiega.
- **YouTube** blocca il server cloud («accedi per confermare di non essere un bot»). L'installazione di yt-dlp è stata
  negata: non riprovare, chiedere i file all'utente.
- **Disco**: si è già riempito una volta. Liberare cancellando `node_modules` e `dist` nelle worktree già unite.
- **Limite d'uso**: con molti agenti in parallelo il limite arriva in fretta. Tenere al massimo 2 blocchi di sviluppo e
  1–2 analisi.

## 6. Procedura di rilascio (gli script dello scratchpad possono non esserci più: eccoli)

Versione nuova in **quattro file**:
- `site/js/tennis/version.js` (`NATPF_BUILD`);
- `site/tennis/build.json` (`version`);
- riga 1 di `natpf-tennis/lan/LEGGIMI.txt`;
- una riga nuova in `natpf-desktop/novita.txt` (`AAAA-MM-GG.n: testo semplice per chi gioca`).

Controllo rapido (`rapido.sh`), lanciato con un comando in sottofondo del harness, non con nohup:
```sh
cd /home/user/foro-italico-world
{ echo "== gioco"; (cd natpf-tennis && npm test 2>&1 | grep -E '^# (tests|pass|fail)');
  echo "== sito"; node --test tools/test/*.test.mjs 2>&1 | grep -E '^# (tests|pass|fail)';
  echo "== desktop"; (cd natpf-desktop && npm test 2>&1 | grep -E '^# (tests|pass|fail)');
  echo "== build"; (cd natpf-tennis && npm run build 2>&1 | tail -1); echo "== FINE"; } > rapido.txt 2>&1
```
Se mancano le dipendenze di natpf-desktop: `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci`.

Prove nel browser: `GAME_PORT=32xx CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/<prova>.mjs`, con una porta
libera.

Commit, `git fetch`, push su `origin natpf-simulator`: solo con i test verdi.

Zip Cloudflare:
```sh
node natpf-tennis/scripts/pacchetto-cloudflare.mjs --out=<cartella> --zip=<cartella>/NATPF-Simulator-Cloudflare-<v>.zip --turn-url=https://natpf-turn.s-porcelli.workers.dev/
```
Il limite è 25.000.000 B; il margine attuale è circa 1,15 MB. Provarlo estratto: la versione in
`natpf/js/tennis/version.js` e nessun `natpf/registro.json`. Mandarlo all'utente.

Installer: lo costruisce la GitHub Action dopo il push. Si aspetta e si verifica con `attesa-installer.sh <versione>
<cartella>`:
```sh
B=https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev/windows
# aspetta che $B/latest.json abbia "build": "<versione>", legge lo sha256, scarica $B/NATPF-Simulator-Setup.exe?v=<ora>
# finché lo sha256 coincide (latest.json può arrivare prima dell'exe), poi «VERIFICATO»
```
Poi aggiornare `docs/TRACCIA_PASSI.md` con le misure e gli sha, e dire all'utente cosa c'è e come si attiva.
