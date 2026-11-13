# B40 · Fine partita v2: card della partita, trofei e personaggi animati

Base: `natpf-simulator` dopo la modalità fiera (B41 seconda parte). Proposta grafica **approvata dall'utente il 13/11
(sera)**: riga «v2» della tavola https://claude.ai/artifact/PMb2Gg3ZiakcHuqynZ2pJL (tavole `V2Vittoria`, `V2Sconfitta`,
`V2StessoSchermo`, `V2Trofei`; le immagini di Lob e Drop sono già nella tavola). Leggerla con lo strumento degli
Artifact (azione `read`), non con un download.

1. **Card della partita** come nella tavola: card da collezione con il personaggio, cornice che cambia con il livello
   (Bambini azzurra, Evento giallo-verde, Pro oro, Leggenda arcobaleno), «MVP della partita» / «Bella sfida», fino a 3
   trofei con medaglie bronzo/argento/oro e icone, «record di oggi», «prossimo trofeo» per chi perde; stesso schermo con
   le due card una contro l'altra e la corona su chi vince. Catalogo dei 12 trofei con le soglie (Cecchino, Razzo,
   Maratoneta, Asso, Vincente, Super, Game a zero, Rimonta, In serie, Muro, Prima volta, Re di oggi).
2. **Contatori nuovi** in `natpf-tennis/src/natpf/natpf_match_stats.js`: serie di punti, game a zero, rimonta, colpi a
   vuoto, prima partita, posto in classifica.
3. **Personaggi animati in loop** (richiesta dell'utente del 13/11 sera, domande a scelta: *dove* = fine partita,
   *movimento* = **esultanza**, *quando* = insieme a questo blocco): nella fine partita i personaggi **scelti per quella
   partita** (Classici o Lob & Drop, giocatore 1 e 2) con un'animazione in loop: chi vince **esulta** (salta e alza la
   racchetta), l'altro applaude. Ritratti dai modelli 3D anche per i Classici. Leggero: niente asset pesanti, buone
   prestazioni su desktop e Android, misure in cqw/cqh con `@container natpf`.

Vincoli: i tre riquadri della fine partita del B35b vanno bene (decisione del 13/11); classifica con prima le vittorie;
km/h veri. Prove: test di unità dei trofei e dei contatori; prove nel browser `natpf-fine-partita`, `natpf-lob-drop`,
`natpf-stesso-schermo-b20`, `natpf-formato-fiera`; schermate guardate (vittoria, sconfitta, stesso schermo, Classici e
Lob & Drop, 1920×1080 e area stretta). Documento `docs/b40/fine-partita-v2.md`.
