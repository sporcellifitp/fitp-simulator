# NATPF arcade 1v1: refactoring e verifica

## Modifiche integrate

| Area | File principali | Risultato |
|---|---|---|
| Movimento | `match/arcade.js`, `ai.js`, `contact.js` | Auto-run obbligatorio per umano e CPU, previsione fisica condivisa, stati ready/run/lunge/dive/recover e portata finita. Gli input di movimento ricevuti dalla rete vengono ignorati. |
| Regole | `match/rules.js`, `physics.js` | Il primo rimbalzo valido determina la risoluzione del punto; secondo rimbalzo, ritorno oltre rete, uscita dal volume simulato e servizio conservano il vincitore corretto. |
| Qualità e mira | `match/shot-quality.js`, `arcade.js`, `ai.js`, `physics.js` | Mira continua locale indipendente dal busto, timing ed equilibrio misurabili, traiettorie coerenti col drag, CPU progressiva. La corsa è assistita; la scelta umana consiste nel gesto, nel timing e nella tattica. |
| Gesti | `tennis/swing-detect.js`, `gesture-intent.js`, `calibration.js`, `racchetta.js` | Sei drive per il riferimento personale più otto esempi di slice/lob/palla corta/servizio. Tipo ricavato dal movimento, nessuna selezione necessaria durante lo scambio. Un movimento soltanto debole non diventa un colpo speciale. |
| Servizio | `arcade.js`, `main.js`, `swing-detect.js` | Lancio e battuta riconosciuti anche su asse verticale; la pausa di recupero del drive non scarta il secondo gesto. Il controller torna allo stato di scambio dopo il servizio. |
| Rendering | `tennis/scene.js`, `viewpoint.js`, `character.js`, `impact-effects.js` | Camera locale rialzata, zoom d'impatto, rilascio in volo, smash con bersaglio rosa e lieve shake, scie colorate, animazioni di affondo/tuffo. Il punto di contatto e la presa conservano priorità sul movimento visuale dei sensori. |
| Rete LAN | `tennis/lan-transport.js`, `link.js`, `sensor-packet.js`, `racket-motion.js`, `tools/lan/*` | Signaling sul desktop, WebRTC diretto senza STUN/TURN, sensori binari, smoothing con bias personale e predizione limitata. |
| Online e input | `tennis/net.js`, `controls.js`, `input-time.js`, `main.js` | Mira continua e stati di locomozione conservati attraverso snapshot e input host/guest. Le collisioni usano il picco realmente misurato; l'estrapolazione riguarda la presentazione della racchetta. |

## Rete e avvio

La connessione precedente usava già WebRTC per i colpi, con signaling PeerJS remoto. La nuova modalità `?lan=1` usa solo il server locale del desktop e candidati ICE host. Per attivarla occorre il pacchetto LAN e un certificato HTTPS attendibile per l'indirizzo locale del desktop: vedere `tools/lan/README.md`. Il pacchetto statico Cloudflare mantiene il percorso WebRTC preesistente e non può avviare da solo un server LAN sul computer.

I campioni grezzi viaggiano in un ArrayBuffer da 52 byte, massimo 40 Hz (circa 2,1 kB/s di payload, escluso overhead). I comandi sporadici restano sul canale affidabile; lo stream usa `ordered:false,maxRetransmits:0`. Il desktop media quattro campioni, applica SLERP e predice al massimo 60 ms; oltre 150 ms senza campioni la confidenza scende a zero e il polso torna alla posa pronta. La coda di rete non accumula sensori vecchi. RTT e perdita sono mostrati sul desktop. Il limite di 10 ms è un obiettivo da misurare sulla LAN reale.

Three.js e le risorse del campo sono locali. Il gioco LAN non richiede caricamenti da CDN o Google Fonts dopo l'installazione delle dipendenze e dei certificati.

## Verifica ripetibile

- `node --test tools/test/*.test.mjs`: regole tennis/padel, scoring, timing, predizione, traiettorie e bersagli, qualità, auto-run, gesti personali, protocollo binario e perdita di pacchetti.
- `node tools/e2e/run-local.mjs phone-only.mjs timing-browser.mjs`: rendering e input reali CPU/P1/P2, pause e sincronizzazione.
- `node tools/e2e/run-local.mjs gesture-calibration.mjs`: pagina smartphone reale con eventi sensore sintetici, quattordici esempi, tipi automatici e servizio a due gesti.
- `node tools/e2e/run-local.mjs arcade-visuals.mjs`: Three.js reale, FOV, marker smash, pose, presa e dati scaduti.
- `node tools/e2e/lan-browser.mjs`: signaling locale e WebRTC reale, sensori binari, clock, ICE host, ripresa/revoca e assenza di richieste HTTP esterne. Richiede anche `npm ci --prefix tools/lan`.

L'ultimo comando e i test online devono aprire effettivamente WebRTC: non si considera sufficiente sostituirli con chiamate dirette ai controlli. I sensori sintetici non validano ogni smartphone o impugnatura fisica.

## Prova fisica

Ricalibrare dopo l'aggiornamento. Usare gesti comodi, anche compatti; includere apertura e ritorno. Verificare nella simulazione tipo, angolo e intensità prima di confermare. Provare servizio con due movimenti, dritto/rovescio, lob e smorzata. I gesti ambigui vengono segnalati e privilegiano il drive. Il touch rimane un'alternativa accessibile.

Per una fiera: provare sulla Wi-Fi dell'evento con la stessa coppia di dispositivi, certificati già installati, accesso Internet scollegato e isolamento client disabilitato. Rilevare RTT/perdita durante lo scambio e controllare il ripristino dopo perdita temporanea dei sensori. Il ping del browser di test non sostituisce questa misura.
