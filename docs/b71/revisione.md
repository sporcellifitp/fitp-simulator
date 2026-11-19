# B71 · Revisione: rilievi confermati applicati sul ramo `b71-int` (19/11/2026)

Prodotto: **FIERA**. Agente di sistemazione del workflow B71, dopo i revisori e la verifica avversaria del ramo `b71-int`
(unione dei tre rami: `docs/b71/unione.md`). Richiesta dell'utente del 19/11: «fixiamo subito i punti più importanti:
calibrazione giocando (importantissima), dritto e rovescio, sensori». Commit solo locali sul ramo `b71-int`, niente push,
file di versione non toccati (versione pubblicata 2026-11-18.3, app 1.0.4; l'app del ramo è la 1.0.5).

Undici rilievi confermati dalla verifica: **tutti applicati** (due, «fiera (non sommato)» del riassunto, erano lo stesso
difetto visto da due revisori e hanno una sola correzione). Nessuno scartato.

## 1. Calibrazione giocando: il colpo si conta nel verso che si vede (importante)

**Difetto.** In fiera, con il verso del gesto incerto (`verseUnsure`: confidenza sotto 0,35, gesto trattenuto ≥ 20 ms o
arrivo ≥ 150 ms dopo il picco), il B71 prendeva il lato dalla palla ma cambiava **solo** `ev.side`. Il verso del colpo
(`s.dir`) restava quello incerto e decideva tre cose: i colpi contati negli scambi di prova (puntini «Dritto/Rovescio»,
`trialDone`, livello, `refs`, `rises`, `faceRef` del profilo), la lettura del colpo (salita abituale e centro della mira
del verso sbagliato, segno di `head`) e i modelli della partita (`riseModel`, `aimModel`, `faceModel`, `liftModel`,
`headModel`). Nei registri del 18–19/11 i colpi trattenuti erano 164–198 al giorno, il 73% dalla parte sbagliata della
palla: tutti passavano di qui. Riprodotto nel mondo di prova (fiera accesa, palle del dritto colpite al contrario con
confidenza 0,2): a schermo 4 dritti e 2 rovesci, imparati **0 e 6**, livello «partial», **6 palle** invece di 4.

**Correzione** (`natpf_phone_racket._onSwing`, `natpf_trial_learn`):
- il lato dalla palla si decide **prima** di leggere il colpo; il suo verso (`wantOfSide`) sostituisce `s.dir` per tutto
  il colpo (lettura, modelli per verso, riferimenti);
- il voto sul segno resta sul verso grezzo del telefono (si vota prima, come prima);
- `learner.mark` riceve `dir` (il verso in cui il gioco ha letto il colpo, già corretto dal segno) e `split()` lo usa al
  posto di `sign·raw`. Non è moltiplicato per il segno (la verifica avversaria ha mostrato che `bd·segno` sbaglia se il
  segno gira dopo nello stesso scambio di prova): il colpo resta dove si è visto;
- il gesto senza verso con il lato dalla preparazione resta come prima (lato dalla palla e basta).

**Dopo:** stesso scenario, destro e mancino: imparati 2 dritti e 2 rovesci come a schermo, «full», 4 palle; centro della
mira del dritto dai dritti. Fuori dalla fiera niente cambia (prova).

## 2. Regola KEEP con il lato del gesto (minore)

**Difetto.** `KEEP` e `keepsSpecial` (`natpf_impact.js`) riconoscono il braccio che torna dal lato diverso da quello della
palla corta. Con il B71 in fiera anche il rientro incerto prende il lato dalla palla, uguale a quello della palla corta
verticale: la regola non scattava e il rientro sostituiva la palla corta voluta fatta in tempo (SLICE invece di DROP a tutti
i livelli).

**Correzione.** Quando il lato l'ha dato la palla, il colpo porta il lato del gesto in `natpf.gs`; `keepSide(e)` =
`natpf.gs || side` e KEEP/keepsSpecial confrontano quello: sono gli ingressi di prima del B71.

## 3. App 1.0.5: riaccensione dello schermo che non si addormenta (importante)

**Difetto.** `schermoSpento()` metteva in coda la riaccensione con `postDelayed(300 ms)`, che conta il tempo con
`uptimeMillis` (fermo nel sonno profondo), senza tenere sveglia la CPU: la pausa promessa di ~1 s (prima 5–8 s nei registri)
poteva diventare di secondi o non arrivare.

**Correzione** (`MainActivity.java`): wake lock **parziale** a tempo (300 ms + 1 s di margine) preso dentro `onReceive`
(ancora sotto il wake lock della trasmissione di sistema) prima di `postDelayed`; rilasciato nel `finally` della
riaccensione, in `onResume` e in `onDestroy`. Nessun permesso nuovo (`WAKE_LOCK` c'era).

## 4. App 1.0.5: «in uso» che restava alla pagina nascosta o cambiata (minore)

**Difetto.** `RisveglioSchermo` teneva l'ultimo «in uso» detto dalla pagina anche sulla schermata d'avvio dello staff
(tre volte «volume giù») o dopo una pagina nuova: lo schermo spento dallo staff si riaccendeva (fino a 2 volte in 20 s).

**Correzione.** `RisveglioSchermo.azzera()` in `showStart` e `onPageStarted`; `spento(ora, paginaAperta, fissata)`:
con la pagina non visibile o non arrivata non si riaccende mai. Prova JUnit nuova (`paginaNascostaOCambiataNonVale`).

## 5. Sensori dell'app: ritardo tra browser e app misurato e compensato (minore)

**Difetto.** L'evento `devicemotion` arriva dopo la lettura del sensore (età della lettura più i passaggi interni, stima
8–15 ms); con l'app l'istante è quello vero. Nessuno lo misurava: la prova all'avvio confrontava i tratti da 50 ms senza
riallineare (con 15–20 ms di ritardo i colpi veloci davano un rifiuto 'r' senza motivo nel 7–45% dei blocchi, simulazione
della verifica), e le finestre del tempo ritarate sui registri del 18–19/11 (tutti presi con il browser) si sarebbero
spostate di quei ms verso l'anticipo.

**Correzione** (`site/js/tennis/sensori-nativi.js`): `stimaRitardo` misura il ritardo sugli stessi movimenti (misura della
rotazione ricampionata ogni 5 ms, spostamenti 0–40 ms, picco affinato tra i vicini); ogni blocco si giudica allo
spostamento migliore; `lag` = mediana dei blocchi. Con l'app, `lag` si somma all'istante dei campioni (`shift`): i colpi
restano con la convenzione del browser. Il telefono lo manda nello stato (`lg`, ms interi) e il registro lo scrive in `tq`
della riga «partita.fine» (`CAMPI_B71S`, Worker, `docs/b66/registro-sensori.md` §8). Sui colpi veri del 28/10 con il
browser spostato di 0, 8, 12, 15, 20 ms: ritardo stimato esatto (±1 ms), tutti i blocchi giusti; senza la ricerca (com'era)
con 20 ms il dritto è un blocco «rotazione sbagliata». Segno, ordine degli assi e unità sbagliati restano rifiutati.

## 6. Registro: formato 4, avviso se il Worker non è ricaricato (importante)

**Difetto.** Dodici campi nuovi del B71 con il formato ancora a 3: la pagina del Worker diceva lo stesso prima e dopo il
ricaricamento e il riassunto non avvisava se mancavano.

**Correzione.** `REGISTRO.versione` e `FORMATO` del Worker a **4**; pagina del Worker: «Formato delle righe: 4 (con la
direzione dei colpi, le misure dei sensori del B66 e del B71: verso del gesto, ritardo dello schermo, sensori dell'app)».
Riassunto: «ATTENZIONE: N partite con il telefono di un gioco con formato 4 senza displayLagMs: il Worker del registro non è
stato ricaricato…» (`displayLagMs` si scrive sempre con il telefono). Guida §I e `docs/b66/registro-sensori.md` aggiornate;
prova «Worker del 18/11» con il formato 3 e il testo di prima.

## 7. Registro e riassunto: modalità fiera e confidenza per versione (minori)

- **Modalità fiera** (due rilievi, una correzione): il riassunto diceva «fiera (non sommato all'anticipo)» da `fiera`, che
  è il «Formato in fiera» del punteggio; la modalità fiera (`natpfUi.fiera.on`, quella che decide anticipo, ritardo dello
  schermo non sommato, «Perfetto» e segno di fiera) non era scritta. Ora la riga «partita» ha `stand.modo: 'fiera'` (campo
  di sempre: anche il Worker del 18/11 lo tiene) e il riassunto usa quello («modalità fiera (non sommato all'anticipo)»).
- **Confidenza `cf`**: fino alla 2026-11-18.3 era quella del telefono (0,45 fissa in fiera); il riassunto la sommava a
  quella del gioco. Ora conta `cf` solo per le versioni dopo la 18.3 (data e numero come interi: «.10» dopo «.3»), le altre
  a parte («Colpi con la confidenza del telefono…»). I registri finti (`finto.mjs`) con le misure hanno ora la versione
  2026-11-19.1 e il formato 4.
- Il riassunto mostra anche (righe brevi) il lato dei colpi per origine (`ls`) con il verso incerto (`vc` < 0,35) e, per i
  telefoni, sorgente dei sensori (`sr`), ritorni al browser (`rp`) e ritardo misurato (`lg`).

## 8. Pannello dello staff: ritardo dello schermo in fiera (minore)

In modalità fiera il ritardo salvato non si somma (B71, `docs/b71/registro-tempo.md` §3c), ma il pannello non lo diceva.
Ora il riepilogo «Ritardo dello schermo», il messaggio dopo «Salva» e il risultato della prova del ritardo del B50 dicono,
solo in fiera: «In modalità fiera il ritardo salvato non si somma: la correzione della fiera (100 ms) lo comprende già.
Serve fuori dalla fiera.» (`LAG_FAIR_NOTE`).

## 9. Prove che confrontavano un valore con se stesso (minore)

`natpf-b71-gesti.test.mjs`: le righe «tel» con `voti` si controllano con `controllaRiga(...) === []` e il colpo giocato
dopo la palla corta debole è `seq 2`.

## 10. Prove aggiunte

| File | Prova |
| --- | --- |
| `natpf-tennis/test/natpf-b71-gesti.test.mjs` | scambi di prova in fiera con i dritti letti al contrario e vc 0,2 (destro e mancino, con e senza fiera: puntini = schermo, «full», 4 palle, `natpf.gs`); colpo contato nel verso della palla che resta lì se il segno gira dopo |
| `natpf-tennis/test/natpf-racchetta-motore.test.mjs` | palla corta voluta e rientro con il lato dalla palla (leggenda, evento, casual, pro; rientro prima e dopo l'arrivo della palla) → DROP |
| `natpf-tennis/test/registro-riassunto.test.mjs` | modalità fiera da `stand.modo`; `cf` solo dopo la 18.3 (anche «.10»); avviso del formato 4 senza `displayLagMs`; righe B71 |
| `natpf-tennis/test/natpf-registro.test.mjs` | `stand.modo: 'fiera'` solo con la modalità fiera, non con il formato in fiera; righe pulite uguali nel Worker |
| `natpf-tennis/test/natpf-b71-sensori-registro.test.mjs` | `lg` nel `tq` (interi 0–100) |
| `natpf-tennis/test/natpf-b48-ritardo.test.mjs` | nota della fiera nel messaggio di «Salva»; il ritardo non si somma in fiera |
| `natpf-tennis/test/registro-worker.test.mjs` | formato 4, testo della pagina, Worker del 18/11 con formato 3 |
| `tools/test/sensori-nativi.test.mjs` | ritardo misurato sui colpi veri del 28/10 (0–20 ms), prima/dopo; istanti con il ritardo del browser |
| `natpf-android/.../RisveglioSchermoTest.java` | pagina nascosta o cambiata: non si riaccende |

Le prove nuove dei punti 1 e 2 falliscono sul codice di prima (provato rimettendo i file di `b4fb3446`).

## 11. Prove complete (19/11, ramo `b71-int` dopo i due commit della revisione)

Contenitore Linux, Node 22, Chromium senza scheda grafica, telefono simulato; nello stesso contenitore giravano altri agenti
(carico medio 4–13).

| Suite | Comando | Esito |
| --- | --- | --- |
| Gioco | `cd natpf-tennis && npm test` | **1877/1877**, 0 rosse, 0 saltate (1872 + 5 prove nuove) |
| Sito e pagina del telefono | `node --test tools/test/*.test.mjs` | **310/310** (308 + 2 nuove) |
| Server LAN | `(cd tools/lan && node --test test/*.test.mjs)` | **13/13** |
| Programma Windows | `(cd natpf-desktop && npm test)` | **56/56** |
| Build | `cd natpf-tennis && npm run build` | ok (`dist/natpf/js/tennis/sensori-nativi.js` con `stimaRitardo`) |
| App Android | `gradle --offline testReleaseUnitTest lintRelease assembleRelease` con l'SDK 34 rimasto nello scratchpad del B66, poi `node controlla-classi.mjs` | **BUILD SUCCESSFUL**: prove JUnit **22/22** (RisveglioSchermo 4, CampioniNativi 8, PhoneStatus 5, RacketLink 5), lint 0 errori e 12 avvisi (uno «Wakelock» sul rilascio di `sveglia` in `onDestroy`, di prima), APK di prova firmato con la chiave di debug, `controlla-classi` **VERDE** |

Prove nel browser (una alla volta, porte proprie):

| Script | Esito |
| --- | --- |
| `natpf-scambi-di-prova.mjs` (calibrazione giocando) | **32/32** (due giri con la macchina carica, carico 8–9: 28/32, prima palla persa perché la prova non vedeva in tempo «Allenati un po'!»; sul ramo di prima `b4fb3446` con carico 4: 32/32; di nuovo sul ramo con carico 3–5: **32/32**) |
| `natpf-training-flow.mjs` | **21/21** |
| `natpf-registro.mjs` | **39/39** |
| `natpf-registro-sensori.mjs` | **23/23** (fermato dopo il sommario: non esce da solo, già noto) |
| `natpf-b47-fiera.mjs` | **20/20** |
| `natpf-formato-fiera.mjs` | **29/29** |
| `natpf-stesso-schermo-b20.mjs` | **52/52** (con la macchina carica 51/52 e 50/52, rossi diversi ogni volta: richiamo «batti tu» e icona del lancio, controlli di disposizione a tempo) |
| `natpf-fiera-telefoni.mjs` | **66/66** |
| `natpf-tutorial-phone.mjs` | **46/46** |
| `natpf-gesti-speciali.mjs` | **9/9** |
| `natpf-gesti-sequenze.mjs` (dimostrazioni del tutorial) | **47/47** |
| `natpf-sensori-nativi.mjs` (run-local) | **16/16** (15 + il ritardo `lg` nello stato: 8 ms con il ponte finto) |
| `natpf-app-android.mjs` (run-local, `dist`) | **5/5** |
| `natpf-telefono-bloccato.mjs` (run-local, `dist`) | **12/12** |
| `gesture-calibration.mjs` (run-local) | **21/21** |
| `phone-only.mjs` (run-local) | **10/10** |
| `timing-browser.mjs` (run-local) | **8/8** (con la macchina carica due volte fermato da un'attesa di 20 s; sul ramo di prima 8/8; di nuovo sul ramo **8/8**) |

Non rifatte: `natpf-lob-drop.mjs` (mascotte, 136/137 già noto, nessun file toccato) e `natpf-modale-gesti.mjs` (soglie di
fotogrammi al secondo che dipendono dal carico della macchina).

## 12. Esiti

Tutto verde dopo i rifacimenti a carico più basso. I rossi visti con la macchina carica non dipendono dalla revisione: lo
stesso script sul ramo di prima passava con poco carico, e sul ramo della revisione passa appena il carico scende.

## 13. Cosa NON è verificato

- **Telefono vero**: niente di questo è provato su un telefono, né con l'app 1.0.5 vera: riaccensione dello schermo con il
  wake lock parziale (tempo vero di riaccensione, telefoni che addormentano la CPU), ritardo vero tra browser e app (la
  stima 8–15 ms resta da misurare: ora c'è `lg` nel registro), lato dalla palla e calibrazione giocando con persone vere.
- **APK 1.0.5**: costruito qui solo con la chiave di debug (SDK 34 rimasto nello scratchpad del B66, gradle offline: §11),
  mai installato; l'APK firmato con la chiave dello stand lo fa la CI `natpf-android.yml` al push.
- **Programma Windows installato e ledwall**: solo Node e Chromium senza scheda grafica.
- **Worker del registro**: non ricaricato (lo fa l'utente: la pagina deve dire «Formato delle righe: 4»).
- La compensazione del ritardo con l'app sposta l'istante dei colpi di `lg` ms rispetto alla 18.3 con l'app: è la
  convenzione del browser su cui sono tarate le finestre, ma l'effetto sul voto va guardato nel prossimo registro (`ms` dei
  colpi con `sr` `n` e `lg`).
