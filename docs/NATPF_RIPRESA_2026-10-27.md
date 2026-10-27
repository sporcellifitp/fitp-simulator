# Ripresa del 27/10/2026 · build 2026-10-27.1

## Punto di partenza e checkpoint

Branch unico: `claude/friendly-fermat-dwv2w2`.

- `76b4657`: WIP recuperato dal PC dell'utente, tre file. Sintassi corretta, ma integrazione della mira incompleta.
- `f32ea00`: memoria di ripresa e baseline prima di nuovi interventi.
- `ba8b455`: calibrazione → mira dal primo colpo, riferimenti per verso e compatibilità Node 24.
- `88b08d9`: polso Pose nei colpi webcam, indipendente dal movimento del corpo.
- Il commit che contiene questo documento completa il tutorial e aggiorna la versione della diagnostica.

I checkpoint sono sul branch remoto e conservano la storia precedente. Per riprendere leggere prima la sezione
27/10 di `SESSION_HANDOFF.md`, poi questo documento. `MEMORY.md` riassume lo stato; `WORKLOG.md` registra i blocchi.

## Correzioni effettive

### Mira e calibrazione

La calibrazione conservava la rotazione relativa del piatto ma perdeva la misura assoluta usata dal gioco.
Ora `faceReference()` conserva `faceRef[dir].heading` da `face.abs`, con mediana circolare: +179° e −179° restano vicini.
Il profilo arriva a `_onCal(done)`, che inizializza `aimModel.seed()` nei due versi. La mira è disponibile dal primo
colpo, con mano destra o sinistra, e il test fino al motore verifica i bersagli distinti per P1/P2.

Invertire la calibrazione ora scambia anche `faceRef` e `heads`. Salta, profili precedenti/parziali e ricalibrazione
non ereditano riferimenti mancanti. Un nuovo collegamento azzera il frame precedente; in assenza di nuova
calibrazione il riferimento si impara dai colpi. Non è stata introdotta una sincronizzazione dei profili fra frame noti.

Il centro iniziale non insegue più i primi colpi mirati: adattamento rapido solo entro `settle`, non entro il doppio.
Restano le costanti del WIP (`faceAim .6`, curva della profondità `.7`, soglie 5°/25°); il minimo FLAT torna a 6,4 m
per mantenere accessibile la riga del servizio. I test verificano continuità, copertura del campo e ripetibilità.

Il controllo di sintassi legge ogni modulo da stdin ESM, eliminando il flag rifiutato da Node 24.

### Webcam a distanza

Pose prima serviva solo per il movimento del corpo. Ora il polso scelto alimenta anche i colpi quando Hands non
trova le dita. Il movimento del giocatore può restare automatico.

- Si richiedono spalle, gomito e polso visibili; acquisizione stabile del busto, continuità di taglia/posizione e
  corrispondenza con la mano già seguita quando disponibile.
- Il moto del busto viene sottratto dalla traccia del polso: spostarsi con tutto il corpo non genera uno swing.
- Pose e Hands non inviano inferenze in parallelo. Pose prenota il primo slot libero, così Hands lento non lo
  blocca continuamente. Intervallo minimo Pose 80 ms; verifica delle dita durante il fallback ogni 500 ms.
- Campioni vecchi scartati, ogni campione consumato una volta, cambio di sorgente senza un secondo colpo.
- Il polso Pose valido mantiene la salute del controller; il cambio di mano azzera le tracce. La diagnostica registra
  sorgente `pose` e relativo tempo d'inferenza, senza attribuirgli il tempo del modello Hands.

Limiti: il polso non misura l'orientamento fine delle dita. Soggetti sovrapposti di taglia simile restano un caso
ambiguo; visibilità e continuità non costituiscono identificazione biometrica. Prestazioni e jitter reali sul portatile
non sono stati misurati. Le soglie non vanno presentate come una validazione a 2–3 m su hardware reale.

### Tutorial

Incrociato e Lungolinea sono due esercizi verificati dal bersaglio del colpo nel riferimento del giocatore. Una
palla centrale o in rete non li completa. Gli esercizi dipendono dalla posizione d'impatto, non soltanto dal nome
del dritto/rovescio. Sono stati aggiunti tagliato e schiacciata per il telefono; il lanciapalle dello smash dà una
traiettoria alta prima del rimbalzo. I colpi speciali contano il tipo applicato dal motore, non solo quello richiesto
dal telefono; come prima, questi esercizi insegnano il gesto e possono contarlo anche se finisce fuori.

Durante il passo da fermo compare la figura della presa nel pannello del riscaldamento, anche per mancini; sparisce
quando si passa ai gesti. Le scritte restano leggibili nel verso normale. Telefono e computer chiedono di calibrare
con lo stesso gesto naturale e la stessa presa usati in partita. La pagina del telefono aggiorna la figura al cambio mano.

## Verifiche automatiche

Baseline WIP: 370 test di gioco (365 passati, 4 falliti, 1 saltato), 148/148 sito.
Blocco mira: 377/377 gioco. Blocco webcam: 385/385. Con il tutorial: **390/390 gioco**, **148/148 sito**.
Il test LAN prima saltato è stato eseguito dopo aver installato anche le dipendenze `tools/lan`.

I sei nuovi test della calibrazione sono stati eseguiti sul WIP precedente: falliscono tutti. La suite webcam nuova
include un gesto di 240 ms a 12,5 Hz attraverso il controller vero con risultati Pose simulati, movimento del busto
senza colpi, cambio verso Hands, lateralità, continuità e prenotazione dello slot di inferenza.
Il tutorial è provato con motore e interfaccia in ambiente DOM simulato. La build di produzione riesce.

Comandi dalla root, dopo le dipendenze del progetto:

```sh
cd natpf-tennis
npm test
npm run build
```

Dalla root: `node --test tools/test/*.test.mjs`.

Audit deterministici eseguiti:

- `scripts/audit/variety.mjs medio casual`: 459 colpi del giocatore, profondità p10/p50/p90 7,11/8,74/9,82 m,
  laterale assoluto 0,54/2,50/3,92 m; occupate tutte le nove categorie corta/media/fondo × centro/mezzo/riga.
  Sono ingressi simulati, non la distribuzione di una persona e non una misura della precisione del telefono vero.
- `scripts/audit/rally-balance.mjs --campo --points=50`: quattro profili, Casual/Pro, tre semi. Nessuna corsa
  automatica a rete dal fondo nei casi simulati. I test dedicati mantengono la corsa su palla corta e la risposta
  al servizio da fondo. Non sono stati riscritti POV, movimento o trasporto LAN già presenti e verificati nei test.

**Browser E2E non eseguiti:** download Playwright vuoti/troncati; il Chromium alternativo termina in SIGSEGV prima
di aprire pagine, anche con about:blank e GPU disabilitata. Non attribuire il crash al gioco e non dichiarare
passate le prove browser del 27/10. Restano gli avvisi di build sul bundle grande e sui chunk misti statici/dinamici.

## Prossimo passo: prove reali e browser

1. Aggiornare il checkout Windows con `git pull --ff-only origin claude/friendly-fermat-dwv2w2`, dopo aver salvato
   eventuali nuove modifiche locali. Installare le dipendenze richieste dall'avvio LAN e ricostruire il gioco.
2. Verificare nella diagnostica la build **2026-10-27.1**, sia sul computer sia sulla pagina del telefono.
3. Stessa presa nella calibrazione e nella partita: dal primo colpo provare sinistra/centro/destra e cinque colpi
   consecutivi verso lo stesso lato, poi destra/sinistra e P1/P2. Provare Salta, ricalibrazione e ricaricamento telefono.
4. Completare il tutorial: una palla al centro non deve far passare Incrociato/Lungolinea; lo smash deve ricevere
   una palla alta. Controllare la figura della presa e l'assenza di sovrapposizioni alle risoluzioni usate realmente.
5. Webcam E14, movimento automatico, luce frontale: circa 2 m e poi 3 m, braccio intero. Provare un altro soggetto
   che entra, occlusione breve, ripresa della mano e ritorno a Hands. Atteso: un evento per swing, nessun colpo dal
   solo movimento del busto, pausa se nessuna sorgente è attendibile. Misurare fps, inferenza ed età dei campioni.
6. Registrare una sessione da Pausa → Diagnostica (o Maiusc+D), segnare gli errori con Maiusc+M ed esportare lo ZIP.
   Campioni del telefono e video, se scelti, servono al confronto. Per le istruzioni complete usare anche
   `NATPF_PROVA_GUIDATA_2026-10-23.md`; le funzioni aggiornate qui prevalgono sulle sue descrizioni precedenti.
7. In un ambiente con Chromium funzionante eseguire, una prova alla volta, i percorsi in `tools/e2e/README.md`,
   soprattutto `natpf-training-flow.mjs`, `natpf-phone-upright.mjs`, `natpf-webcam-pipeline.mjs` e la sfida P1/P2.

Prima di un'altra interruzione aggiornare la sezione corrente di `SESSION_HANDOFF.md`, annotare modifiche e risultati
non ancora pubblicati, e creare il checkpoint sul branch unico. La memoria di progetto deve restare nel repository.
