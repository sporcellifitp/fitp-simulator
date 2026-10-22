# NATPF Simulator — passaggio di consegne del 17/10

Checkpoint: 17 ottobre 2026. Repository `sergio4/foro-italico-world`, branch `refactor/natpf-audit-20261015`. La precedente versione arcade pubblicabile era `72e13a678a3abfec476acfc986938a8caf450e0c`. Questo documento accompagna le modifiche successive, da completare e validare prima del nuovo rilascio.

## Perimetro e istruzioni dell'utente

- Sviluppare **solo NATPF Simulator**, non ricostruire o ridisegnare mondo esplorabile, museo, negozio, minigiochi o padel. Preservare il resto del repository.
- Il campo è sul computer; lo smartphone è soltanto la racchetta, collegata via QR. Niente movimento manuale: auto-run per entrambi.
- Riferimento di gameplay/POV: il tennis del gioco di riferimento con il controller di movimento. Conta il gesto intuitivo vicino alla racchetta visibile, non l'attraversamento di un cerchietto sul terreno.
- Utenti anche inesperti di tennis, bambini e persone con mobilità limitata: linguaggio semplice, gesti comodi/compatti, impugnatura personale, alternativa assistita o touch.
- Gesto, forza, velocità e inclinazione determinano il colpo; nessuna selezione obbligatoria del tipo durante lo scambio. Scambi divertenti con possibilità di chiusura e skill gap, senza interruzioni artificiali dopo N colpi.
- Ultima istruzione sul lavoro parallelo: **al massimo due subagent contemporaneamente**, eventualmente collaboranti.
- Nessun merge in main o deploy è stato effettuato per questo checkpoint.

## Ultimo feedback fisico dell'utente sulla versione Cloudflare

1. Visuale troppo dall'alto: abbassarla e offrire prima/terza persona.
2. Calibrazione troppo lunga e difficile: non conosce differenze o esecuzione dei colpi del tennis.
3. Nove colpi su dieci percepiti come anticipati: colpisce istintivamente quando la palla appare vicina alla racchetta; soltanto dopo ha capito il vecchio cerchio. Occorre contatto coerente e tollerante.
4. Completare in ordine i punti restanti della roadmap: timing/gesti reali, bilanciamento, spin, animazioni/stabilità, LAN semplice e pacchetto esclusivo NATPF.

Non dichiarare risolto il problema fisico sulla sola base dei test sintetici. Dopo queste modifiche l'utente **non ha ancora provato una nuova build**.

## Modifiche presenti nel checkpoint

| Area | File | Stato |
|---|---|---|
| Camera | `site/js/tennis/viewpoint.js`, `scene.js`, `character.js`, `main.js`, `site/tennis/index.html` | Terza persona circa 17,6° invece 33°, prima persona reale alla testa a 1,68 m. Scelta nel menu/pausa, persistita. P1/P2 specchiati; prima persona nasconde il corpo locale mantenendo braccia e racchetta. |
| Calibrazione breve | `calibration.js`, `gesture-intent.js`, `racchetta.js`, `calibration-preview.js`, HTML | Riposo nella presa comoda + quattro gesti alternati + prova libera; profilo v4. Niente 14 esempi obbligatori. L'apprendimento esteso resta API facoltativa `quick:false`. Tipi automatici da geometria relativa alla presa personale; la sola debolezza non diventa smorzata. |
| Contatto intuitivo | `site/js/match/contact.js`, `arcade.js`, `sweet-spot.js`, `scene.js` | `evaluateContact.accepted` definisce un volume raggiungibile condiviso. Il gesto valido risolve sul fotogramma storico mostrato, senza attendere il piano ideale. Finestra perfetta distinta; buffer locale limitato a 120 ms. |
| Feedback | `arcade.js`, `main.js` | Un input realmente arrivato ma troppo lontano non viene più chiamato "nessun movimento". Colpi anticipati/di recupero accettati restano più deboli o centrali, non automaticamente mancati. |
| Spin | `match/physics.js`, `ai.js`, `core.js`, `arcade.js`, `tennis/net.js`, preview | Magnus, decadimento, impulso tangenziale e rimbalzi topspin/slice distinti. Solver, clone, previsioni, storico e snapshot conservano spin; padel invariato. |
| Scambi | `tools/audit/rally-balance.mjs`, test | Audit multi-seed con una sola intenzione per risposta, senza rigenerare errori a ogni ricalcolo di `inc.Tc`. Nessun aumento artificiale degli errori in funzione della durata. |
| GPU | `scene-resources.js`, `scene.js`, `character.js` | Dispose su personaggi/segni/flash rimossi; teardown idempotente. |
| LAN guidata | `tools/lan/launcher.mjs`, `setup.html`, `server.mjs`, `.cmd`, README | Avvio Windows con pagina guida loopback, verifica certificato/chiave/scadenza/IP e indirizzi LAN. Il certificato attendibile sul telefono resta necessario; nessuna promessa di zero configurazione o ping <10 ms. |
| Pacchetti ridotti | `tools/package-natpf.py` | Dipendenze transitive del simulatore, librerie e arena: circa 50 file invece di 117. Root apre NATPF. ZIP statico e ZIP LAN senza altri modi di gioco. |

## Verifiche e limiti

Rieseguiti al passaggio: **124/124 test** con `node --test tools/test/*.test.mjs`; **3/3 test LAN setup** con `node --test tools/lan/test/setup.test.mjs`.

Nella sessione di implementazione sono passati anche:
- camera/pose/GPU: 9 verifiche browser, inclusi 12 riavvii con texture stabili;
- scelta camera/persistenza e contatto istintivo nelle due visuali: 5 verifiche browser;
- pagina smartphone con Peer esplicitamente simulato e DeviceMotion sintetico: 6 verifiche browser;
- pagina guida LAN: 3 verifiche browser.

La prova browser finale servita dal **pacchetto ridotto** era stata avviata, ma il suo esito finale non è conservato: **ripeterla**. La suite con collegamento telefono/WebRTC reale non è stata validata per questo nuovo checkpoint: **attendere/controllare la nuova CI**, non ereditare il successo della build precedente. Il vecchio commit `72e13a6` aveva tutte le suite verdi e falliva soltanto il caricamento degli artifact per quota GitHub esaurita.

Il workflow ora valida i pacchetti a ogni push e carica artifact soltanto su avvio manuale con `upload_artifacts=true`. Non sono stati cancellati artifact esistenti e nessun test è reso facoltativo per nascondere errori.

Audit sintetico (4 seed × 180 s, consegna 60 ms): preciso centrale circa 13,45 colpi/punto; preciso nel campo libero circa 5,54. Il profilo sintetico con anticipo medio 60 ms e deviazione 80 ms include anche gesti fuori portata e manca circa il 27,4%: **non interpretarlo come successo universale o dato di usabilità fisica**. I test dedicati alla zona visiva accettano il contatto sul frame mostrato.

## Prossime azioni, in ordine

1. Controllare CI dell'ultimo commit e completare i test browser sul pacchetto NATPF-only. Correggere eventuali regressioni effettive; non indebolire i test per ottenere verde.
2. Generare e consegnare il nuovo ZIP **solo NATPF** del commit verificato. L'utente non ha ancora ricevuto il pacchetto con queste ultime modifiche.
3. Chiedere una prova fisica breve: scegliere vista, quattro gesti comodi, servizio, risposta istintiva guardando racchetta/palla senza aspettare il cerchio. Raccogliere feedback e, se utile, tracce sensore anonimizzate con consenso.
4. In base alla prova correggere calibrazione/portata/posa: non chiamare "perfettamente funzionante" un comportamento non verificato. Validare su Android/Chrome e iPhone/Safari, prese e mobilità diverse.
5. Collaudare LAN reale e Wi-Fi evento: HTTPS attendibile, UDP locale, assenza di isolamento client, RTT/perdita misurati. Valutare naturalezza delle animazioni e fedeltà dell'arena rispetto ai riferimenti dell'utente (richiedere nuovamente le immagini se necessarie e non disponibili).

## Comandi ripetibili

Node.js 20+, Python 3. Nessuna compilazione dell'intero mondo è necessaria.

```sh
node --test tools/test/*.test.mjs
npm ci --prefix tools/e2e --no-audit --no-fund
npm ci --prefix tools/lan --no-audit --no-fund
node tools/e2e/node_modules/playwright-core/cli.js install --with-deps chromium
node --test tools/lan/test/setup.test.mjs
node tools/e2e/run-local.mjs phone-only.mjs timing-browser.mjs
node tools/e2e/run-local.mjs gesture-calibration.mjs
node tools/e2e/run-local.mjs arcade-visuals.mjs
node tools/e2e/run-local.mjs intuitive-contact.mjs quick-phone-ui.mjs
node tools/e2e/lan-setup-browser.mjs
node tools/e2e/lan-browser.mjs
python3 tools/package-natpf.py --out=/tmp/natpf-release --commit=SHA_DEL_COMMIT
NATPF_SITE_ROOT=/tmp/natpf-release/static node tools/e2e/run-local.mjs intuitive-contact.mjs quick-phone-ui.mjs phone-only.mjs
```

`TIMING_LOCAL_CONTROLS=1` isola il rendering quando l'ambiente non può aprire WebRTC: è soltanto una diagnostica, non sostituisce i test RTC. La suite `quick-phone-ui` dichiara il Peer simulato. `lan-browser` deve verificare una connessione WebRTC effettiva con ICE host e nessuna richiesta HTTP esterna.

## Documentazione

Leggere questo documento per primo, poi `docs/NATPF_PLAYABILITY_2026-10-16.md` e `tools/lan/README.md`. Gli audit precedenti sono checkpoint storici: istruzioni su 14 gesti obbligatori, selezione manuale dei colpi e camera precedente sono superate. Le approvazioni per singolo blocco richieste all'inizio sono state successivamente sostituite dall'autorizzazione a procedere su tutta la roadmap con massimo due subagent alla volta.
