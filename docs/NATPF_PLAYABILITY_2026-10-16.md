# NATPF Simulator: visuale, avvio rapido e contatto intuitivo

## Richieste e stato

| Richiesta | Implementazione | Verifica |
|---|---|---|
| Vista meno dall'alto e prima/terza persona | `viewpoint.js`, `scene.js`, `character.js`, `main.js`, `tennis/index.html`: terza persona abbassata a circa 17,6°, prima persona dagli occhi a 1,68 m. Scelta nel menu e nella pausa, conservata sul dispositivo. | Proiezione dei due lati, cambio di vista, persistenza e rendering Three.js. |
| Calibrazione breve senza conoscere il tennis | `calibration.js`, `gesture-intent.js`, `racchetta.js`, `calibration-preview.js`: riposo nella presa comoda e quattro gesti alternati, poi una prova libera. Esempi dei colpi facoltativi, parole semplici. I profili v4 sostituiscono il vecchio percorso obbligatorio di quattordici gesti. | Pagina telefono reale con eventi DeviceMotion sintetici, impugnatura obliqua, gesti compatti, servizio a due movimenti. |
| Colpire quando la palla sembra vicina alla racchetta | `match/contact.js`, `arcade.js`: contatto immediato sullo stato mostrato quando la palla entra nel volume raggiungibile. Non si aspetta più il piano ideale del cerchio. Stessa valutazione nella preparazione visiva e nel giudizio; finestra perfetta distinta dalla validità. | Test a 30/60/120 Hz, entrambi i lati, consegna ritardata fino a 320 ms e scena browser nelle due visuali. |
| Skill gap e scambi finiti | `shot-quality.js`, `arcade.js`, `tools/audit/rally-balance.mjs`: gesto accurato più efficace; geometria e tattica producono vincenti senza limite artificiale di scambi. Il feedback distingue gesto assente, palla ancora lontana e fuori portata. | Audit sintetico su quattro seed; confronto timing e mira centrale/campo libero. |
| Spin e rimbalzi | `physics.js`, `ai.js`, `core.js`, `arcade.js`, `net.js`: Magnus, decadimento della rotazione, trasferimento tangenziale al rimbalzo. Topspin più alto e slice più basso; solutore, previsioni e snapshot condividono lo stato. | Sei tipi × due lati × tre frame rate: bersaglio entro 5 cm e superamento della rete. Padel conserva il comportamento precedente. |
| Personaggio e stabilità | `character.js`, `scene.js`, `scene-resources.js`: presa e punto di contatto condivisi, braccia in prima persona; rilascio di modelli, segni e flash rimossi. | Pose, legame mano/manico e dodici riavvii browser senza crescita delle texture. |
| LAN comprensibile | `tools/lan/launcher.mjs`, pagina locale di configurazione e README: indirizzi reali, stato del certificato e avvio guidato. | Test della configurazione e collegamento WebRTC separati. La prima configurazione HTTPS sul telefono resta necessaria. |
| Solo NATPF Simulator | `tools/package-natpf.py`: raccoglie le dipendenze effettive di simulatore e controller, librerie locali e asset dell'arena. Root apre direttamente NATPF. Esclusi mondo, museo, negozio, minigiochi e relative foto. | Integrità ZIP, manifest SHA256 e test browser serviti dal pacchetto ridotto. |

## Contatto e tolleranza

La validità usa un volume davanti e attorno al giocatore (portata planare massima 2,15 m; quota 0,1–3,1 m). Le finestre massime sono 360 ms prima e 260 ms dopo l'istante ideale, ma non consentono di colpire una palla fuori portata. Un buffer di 120 ms può conservare un gesto appena prima dell'ingresso nella zona; non trasforma quel colpo in perfetto. Il premio di precisione rimane entro 75 ms nella portata ammessa. La rete viene compensata con lo storico, senza cambiare il timestamp del picco o usare sensori predetti per colpire.

Un gesto accettato può essere anticipato o di recupero: produce un tiro meno efficace anziché un colpo automaticamente mancato. Il cerchio è un aiuto facoltativo, non un bersaglio da aspettare.

## Bilanciamento misurato

Benchmark ripetibile: quattro seed, 180 secondi di simulazione per scenario, latenza di consegna 60 ms. Il profilo preciso centrale produce circa 13,5 colpi per punto; la stessa precisione mirando nel campo libero circa 5,5. Non vengono aggiunti errori in funzione del numero di scambi. I profili imprecisi includono anche swing quando la palla è ancora fuori dal volume fisico: i loro errori non misurano l'affidabilità dei colpi eseguiti vicino alla racchetta.

## Verifica e distribuzione

Eseguire `node --test tools/test/*.test.mjs`, le suite browser del workflow e i test LAN. `python3 tools/package-natpf.py --out=/percorso/uscita --commit=SHA` crea soltanto i due pacchetti NATPF: statico Cloudflare e distribuzione LAN. Il workflow valida gli ZIP a ogni push; il caricamento degli artifact GitHub è attivabile manualmente, perché la quota era esaurita. Nessun test viene reso facoltativo per questo limite di storage.

Resta necessaria la prova fisica con l'utilizzatore: istante percepito del gesto, naturalezza delle pose e distinzione dei gesti su impugnature diverse non sono dimostrati dai sensori sintetici. Anche la fedeltà dell'arena ai riferimenti e il ping inferiore a 10 ms sulla Wi-Fi dell'evento richiedono verifica sul posto. Il modello resta procedurale; non è stato sostituito con un rig fotorealistico.
