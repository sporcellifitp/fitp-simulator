# Calibrazione, gesto e impatto — checkpoint successivo

Il test reale dell’utente ha riaperto il timing: la palla viene colpita quando appare vicina alla mano, ma spesso il sistema risponde «Anticipo». Non considerare chiuso questo punto sulla sola base dei test sintetici.

## Cause riscontrate e interventi

- Il rilevatore precedente dichiarava esplicitamente di emettere sia apertura sia colpo. Ora la calibrazione raccoglie il gesto completo e misura separatamente i picchi di preparazione e i due versi del colpo. In partita sono filtrate le aperture sotto il profilo appreso; dopo il contatto occorre un recupero con fase di quiete prima di riarmare. I buchi nei campioni invalidano il movimento parziale.
- Le soglie precedenti richiedevano almeno 200 gradi/s e un riferimento di potenza di almeno 250 gradi/s. La nuova modalità compatta ammette gesti più corti, confrontati con il rumore misurato, e la potenza si normalizza separatamente sulle due direzioni confortevoli. La scelta della mano viene conservata nella calibrazione; l’asse è appreso dai gesti, senza imporre un asse fisso del telefono.
- Un movimento debole e breve non diventa più automaticamente una palla corta. Piatto, slice, lob e palla corta vengono scelti esplicitamente sul telefono. Intensità e direzione restano nel gesto; smash e servizio dipendono dal contesto della palla. Non vengono introdotti nuovi tipi di colpo.
- Se apertura e impatto si somigliano troppo, la procedura propone il comando assistito: prima aprire il braccio, poi tenere premuto per armare il colpo. È disponibile anche il controllo interamente touch con direzione e intensità. Non promettere di ricavare sempre l’intenzione dai soli sensori inerziali.
- Sul computer una scena leggera usa lo stesso personaggio e integratore della partita: esempio di apertura/contatto/accompagnamento/recupero, riproduzione del colpo riconosciuto e traiettoria per i sei tipi, incluso il servizio. Per confermare nell’interfaccia occorre aver provato almeno un gesto nella simulazione. Le direzioni si possono invertire se l’utente vede una corrispondenza errata.
- La posizione del piatto corde durante il rovescio era ancora sul lato sbagliato del corpo. Il nuovo vincolo del braccio raggiunge il punto di contatto in coordinate mondo, mantiene la mano sul manico e orienta la racchetta sul vettore d’uscita. L’evento di animazione porta punto e direzione anche nelle istantanee online. Rimossa anche la traslazione verticale di 10 cm della palla renderizzata rispetto alla fisica.
- L’interfaccia del controller richiede portrait quando il browser permette il blocco; negli altri casi mostra il messaggio di rotazione e sospende i gesti in landscape. Le pagine piccole possono scorrere, lo zoom non è disabilitato. Una ricalibrazione avviata dal telefono riporta il computer in pausa e nel flusso guidato.

## Verifica e limiti

Test Node: regressioni su tennis, padel, punteggio, fisica, timing e rete, più gesti compatti, potenze relative, preparazione/ritorno, comando assistito, interruzioni dei sensori, tipi intenzionali e dati d’impatto negli snapshot.

Test browser: avvio e controller, percorso CPU/P1/P2 del checkpoint precedente, più calibrazione con eventi sintetici sulla pagina reale del telefono, prova visiva, touch, portrait e vincoli mano/manico/corde per sei tipi di colpo e due squadre. Le tracce sintetiche non dimostrano l’affidabilità su ogni impugnatura o dispositivo fisico.

Il personaggio rimane procedurale. Gli allunghi visivi sono limitati; non si promette un rig fotorealistico. Gli eventi ricevuti in ritardo richiedono ancora correzione dello stato storico: il feedback può essere differito su connessioni lente. Il tipo slice modifica la traiettoria, non introduce una nuova simulazione dello spin.

## Prova dell’utente richiesta

1. Ricalibrare con il movimento confortevole effettivo, includendo apertura e ritorno. Per gesti corti scegliere Compatto; se le fasi si confondono provare il comando assistito o touch.
2. Nella simulazione verificare direzione, tipo e intensità e confrontare l’arrivo della palla con il piatto corde.
3. In partita provare dritto e rovescio senza anticipare volontariamente il movimento per compensare il motore; verificare il feedback quando la palla è vicino alla racchetta.
4. Ripetere con un altro utilizzatore e, se disponibile, un’altra impugnatura/dispositivo. Annotare i casi residui invece di dichiarare eliminati i falsi positivi.

Il prossimo blocco resta subordinato alla conferma richiesta dall’utente. POV rialzato Nintendo Switch Sports, mira continua, solutore dei bersagli e skill gap tattico completo restano nella roadmap; non si dichiara completata l’intera revisione del gioco con questo checkpoint.
