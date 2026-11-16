# B53 · «Movimenti come nel video» sugli altri colpi

Decisione dell'utente del 15/11/2026 (domanda a scelta, dopo la prova del dritto del B23): **«Estendilo agli altri
colpi»** (rovescio, servizio, volée, schiacciata). Base: la prova del dritto, `docs/b23/dritto-dal-video.md` e
`natpf-tennis/src/natpf/natpf_forehand_video.js`, che resta identica. Il B53 sta in un modulo a parte,
`natpf-tennis/src/natpf/natpf_strokes_video.js`, con lo stesso interruttore (Opzioni → «Dritto come nel video (prova)»,
di base Sì, che dalla fine del B53 vale per tutti i colpi).

## 1. Cosa c'è nel trailer (guardato il 15/11)

Il trailer (`natpf-desktop/media/trailer-aad6b9311db4.mp4`, 10 s) non mostra solo il dritto:

| colpo | dove nel trailer | che cosa si vede |
|---|---|---|
| dritto | 0–3 s, giocatore bianco da dietro | fatto nel B23 |
| **rovescio** | 4,5–6 s, giocatore blu visto di fronte | spalle girate verso la parte libera, peso sulla gamba dietro e passo incrociato, due mani sulla racchetta, impatto in allungo, finale alto sopra la spalla della racchetta (`img/rovescio-trailer.webp`) |
| **schiacciata** | 7–8 s, giocatore bianco lontano | salto con la racchetta dietro la testa e il braccio libero alto |
| servizio, volée | **non ci sono** | si fanno nello stesso stile (busto che gira, peso che passa, finale ampio): non sono «copiate» dal video |

## 2. Rovescio (B53.1)

- **Quali colpi**: il rovescio in topspin e piatto (`svKindOf`); il tagliato e il pallonetto di rovescio restano quelli di
  sempre.
- **Pose** (scostamenti dall'animazione di sempre, `SV_STROKES.backhand`): preparazione con il bacino girato di 0,78 rad
  verso la parte libera (la testa resta sulla palla), peso dietro sul piede libero e piede della racchetta avanti;
  impatto con il bacino che torna e il tallone dietro alzato; finale con il busto passato e in punta di piedi; saltello di
  recupero di 4,5 cm.
- **Due mani**: la mano libera va sulla racchetta nella preparazione e verso l'impatto (con il suo limite di velocità,
  niente salti); **nel finale si apre** come nell'animazione di sempre. Con le due mani anche nel finale, la mano libera
  passava davanti agli occhi delle mascotte dalla testa grande (16 fotogrammi con Drop) e saltava di 33 cm: tolto.
- **Racchetta**: finale sopra la spalla della racchetta, avvolta all'indietro; **nell'intorno dell'impatto (0,2–0,46
  dello swing) è quella di sempre**; nella preparazione è quella di sempre (uno scostamento provato, più basso e più
  indietro, spariva di colpo quando chi gioca parte dall'impatto e rendeva lo scatto più grande dello scambio 740 mm
  contro i 624 di sempre: tolto).
- **Fuori dallo swing** (la palla passa dall'altra parte e la preparazione si scioglie) la posa si scioglie in circa
  0,4 s e la mano libera torna al più a 1,6 unità al secondo, **meno quanto la sta già spostando il dritto del B23** in
  quel fotogramma. Con i tempi dello swing la CPU superava le soglie di scatto del B23 fuori dallo swing (0,08 rad e 50
  mm): 0,21 rad e 155 mm, poi 0,100 rad e 81 mm, poi 0,083 e 66 mm. La causa, trovata registrando lo stato della CPU
  fotogramma per fotogramma: quando la palla passa dal rovescio al dritto la preparazione del dritto (B23) comincia
  nello stesso fotogramma, e bacino e mano libera si muovevano per tutti e due nello stesso verso. Ora: bacino 0,069
  rad, mano libera 38 mm (come sulla 14.9). Sotto 0,002 di peso, con il bersaglio a zero, la preparazione si chiude.
- Ordine con il dritto in `player_body_animation.js`: `svPre` prima di `fvPre`, `svPost` dopo `fvPost` (la mano libera
  torna alla posa di sempre in ordine inverso a come le pose la spostano).

Confronto (`img/rovescio-gioco.webp` camera di gioco, `img/rovescio-vicina.webp` camera ravvicinata; in alto PRIMA, in
basso DOPO; colonne: preparazione −0,40 s, caricamento −0,03 s, impatto, finale +0,15 s, recupero +0,37 s): si vedono il
busto girato nel caricamento e il finale sopra la spalla della racchetta. Nella preparazione (−0,40 s) la differenza è
piccola, come nel dritto: la rotazione cresce con l'arrivo della palla ed è piena nel caricamento.

Prova nel browser del B23 (`tools/e2e/natpf-dritto-video.mjs`): corretta la misura degli scatti, che confrontava i
quaternioni componente per componente (q e −q sono la stessa rotazione: un cambio di segno sembrava uno scatto di 4 rad).
Sulla 14.9 la prova dava 54/58: i 4 rossi (riga delle Opzioni fuori schermo, tre partite diverse dalla base del B23,
cambiate dai blocchi venuti dopo) c'erano già prima del B53.

Prove: `natpf-tennis/test/natpf-colpi-video.test.mjs` (6): quali colpi e pesi; racchetta sulla palla all'impatto
identica a prima (in tempo, anticipo, ritardo; chi gioca e CPU; destro e mancino; topspin e piatto); pose nella direzione
giusta, preparazione a due mani, mano libera più vicina alla racchetta all'impatto, finale alto dal lato della racchetta,
saltello e ritorno a terra; niente scatti (sotto 170 mm e 0,26 rad tra due fotogrammi); nella sequenza registrata cambia il
rovescio e restano identici attesa, servizio ed esultanza; uno stato per personaggio creato una volta. Con «No» le ossa
restano quelle di `ae68759` (`natpf-dritto-video.test.mjs`). Aggiornati due test del B23 che davano il rovescio per
immutato con la prova accesa. Fogli: `COLPO=rovescio SOLO=fogli FOGLI=<cartella> node tools/e2e/natpf-dritto-video.mjs`.

## 3. Cosa non è provato

Come il B23: telefono vero, webcam vera, ledwall, scheda video vera; il giudizio «mi convince» spetta all'utente. Le
pose sono ricavate a mano dai fotogrammi del trailer (il rovescio visto di fronte, il gioco lo mostra da dietro).
