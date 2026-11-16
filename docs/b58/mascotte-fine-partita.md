# B58 · Lob e Drop a fine partita (FIERA)

Richiesta dell'utente del 16/11/2026: le 20 animazioni delle mascotte (10 di Lob e 10 di Drop, 5 di vittoria e 5 di
sconfitta per ognuno) nella schermata di fine partita, scelte a caso in base all'esito, mai la stessa della partita prima.
Poi: «le gif devono vedersi», «aggiornare solo su fiera e adattare il materiale in base a quello che è ora». Dopo la 16.9
(mascotte accanto al titolo): «devono essere l'immagine del personaggio a sinistra, non sopra la schermata della vittoria.
Io li voglio dentro la card, come già accade» → **16.10**.

## Cosa c'è (dalla 16.10)

- **Materiale adattato** (`natpf-tennis/public/media/mascotte/`): le GIF consegnate avevano il fondo bianco pieno e sulla
  schermata blu erano un quadrato bianco. Fondo reso trasparente con il bordo morbido e l'ombra sotto i piedi semitrasparente,
  stesse misure (320×320), 10 fotogrammi, 1,6 s in loop; WebP animati con l'alfa, da 150 a 210 KB (3,6 MB in tutto, le GIF
  erano 4,4 MB). Script: `docs/b58/fondo-trasparente.py`; le GIF di partenza restano nel commit `9d48127` (branch
  `feature/natpf-mascotte-fine-partita-2`). Controllo a occhio dei 200 fotogrammi su fondo blu: Drop pulito (fascia e
  polsini bianchi intatti); in `lob-win-01`, fotogrammi 6–8 (il salto), restano due o tre punti chiari vicino alla visiera.
- **Dove**: nella **finestra del personaggio della card**, a sinistra, al posto del personaggio (ritratto 3D o disegnato),
  sul fondo colorato della finestra, sotto il nastro («MVP della partita», «Bella sfida») e la fascia dello stesso schermo.
  Il resto della card e della schermata non cambia.
- **Quale**: una per card con l'esito della card: contro la CPU e tra due computer la card di chi guarda; nello stesso
  schermo la card di chi vince con una di vittoria e quella di chi perde con una di sconfitta (attenuata come la sua card,
  B57); a pari nessuna (restano i ritratti). A caso fra le 10 dell'esito, mai una della partita prima né due uguali nella
  stessa partita (anche dopo un riavvio: le ricorda il computer, chiave `natpf-tennis.mascotte`).
- **Prericarica**: le prossime due (una di vittoria e una di sconfitta) si scelgono e si caricano 6 s dopo l'avvio e 2,5 s
  dopo ogni fine partita; a fine partita si usano quelle che servono, le altre restano prenotate. Mai tutte e venti.
- **Se manca il file** torna il personaggio disegnato (nessuna immagine rotta). **«Riduci movimento»** del sistema: primo
  fotogramma fermo. Sulle card con la mascotte i ritratti 3D non si montano (`natpf_ritratti.js`).
- **Solo FIERA**: si vedono nel programma Windows (`window.natpfDesktop`) e nel server di sviluppo per le prove; il gioco
  nel browser non le mostra e lo zip Cloudflare non porta la cartella (`FIERA_ONLY` in `scripts/pacchetto-cloudflare.mjs`):
  con le mascotte lo zip pesava 28,32 MB, sopra il limite dei 25; senza 23,95 MB.

File: `src/natpf/natpf_mascotte.js` (nuovo), `src/natpf/natpf_end_card.js` (`cardHtml`), `src/hud_ui.js`
(`showVictoryModal`), `src/natpf/natpf_ritratti.js`, `src/natpf/natpf_ui.js` (prericarica all'avvio), `natpf-hud.css`,
`scripts/pacchetto-cloudflare.mjs`.

![Mascotte a fine partita](fine-partita-mascotte.webp)

## Prove

- `natpf-tennis/test/natpf-b58-mascotte.test.mjs` (13): elenco uguale ai file e al manifest, WebP animati 320×320 con
  l'alfa, 10 fotogrammi da 160 ms in loop; scelta per esito; mai una della partita prima su 500 partite (e tutte e venti col
  tempo) e su 300 partite con due card; prenotate = mostrate; stato sul computer rovinato, assente o della 16.9; piano dalle
  card; animazione nella finestra del personaggio, solo file dell'elenco; solo programma Windows e sviluppo; file che manca
  (torna il ritratto); «riduci movimento»; niente più posto accanto al titolo. `pacchetto-cloudflare-zip.test.mjs` (+1).
- `tools/e2e/natpf-fine-partita.mjs` 66/66: mascotte nella finestra del personaggio, dell'esito della card, caricata, con il
  ritratto nascosto, almeno 60 px e dentro la finestra a 1280×720, 1920×1080, 1920×540, 1024×600, 720×720, 1366×768,
  1024×1024; nello stesso schermo due (vittoria su chi vince, sconfitta su chi perde); cinque partite di fila mai con una
  della partita prima.
- Build: la cartella è nella build (`dist/media/mascotte`, 20 file); nel codice di produzione `dev` è falso, quindi nel
  browser no. Il server dello stand dà i `.webp` come `image/webp`.

**Non provato**: nel programma Windows vero (si vede solo se c'è `window.natpfDesktop`: provato con il ponte finto, non con
l'installer), sul ledwall, con «riduci movimento» acceso in un browser vero (provato con un finto DOM).

**Versioni**: 2026-11-16.9 (PR #4 unita in un solo commit, decisione dell'utente «Unisci e pubblica»): mascotte accanto al
titolo; **2026-11-16.10**: nella card al posto del personaggio (richiesta dell'utente). L'installer cresce di circa 3,6 MB,
lo zip Cloudflare non cambia.
