# B55 · «Torna alla versione di prima» (FIERA, programma Windows)

Richiesta dell'utente del 16/11/2026: «prevedi una funzionalità di fallback e downgrade della release qualora una versione
ha rotto delle dinamiche». Decisioni (domande a scelta): **solo la versione di prima sul PC** (non gli interruttori per
dinamica, non il ritiro centrale da GitHub); il comando sta **nelle Opzioni**. Prodotto: FIERA.

## Come funziona

- Il programma tiene la **storia delle versioni installate** (`%LOCALAPPDATA%\NATPF\aggiornamenti\storico.json`) e
  l'**installer della versione di prima** e di quella in uso (la pulizia non li cancella più). La «versione di prima» è
  l'ultima installata più vecchia di quella in uso; con la storia vuota (primo avvio con il B55) è l'ultima pubblicata più
  vecchia.
- Se l'installer della versione di prima non è sul PC, il programma lo **riscarica in sottofondo** all'avvio, dopo il
  controllo degli aggiornamenti, da `windows/versioni.json` su R2 (dimensione e sha256 controllati). Da lì il ritorno vale
  anche **senza internet**.
- **Opzioni → Aggiornamenti** (solo nel programma Windows): «Torna alla versione X». Primo clic: «Conferma: torna alla X»
  (6 secondi); secondo clic: come un aggiornamento (Windows chiede il permesso, il gioco si chiude e si riapre con la
  versione di prima, impostazioni e certificati restano).
- La versione lasciata **non si ripropone** come aggiornamento finché non ne esce una più nuova.
- Permesso di Windows rifiutato: niente cambia, la versione in uso non è segnata come lasciata.
- `windows/versioni.json` lo scrive il workflow «NATPF eseguibili Windows» dopo ogni pubblicazione
  (`natpf-desktop/scripts/versioni.mjs`): versioni ancora sul bucket (gli ultimi 5 installer), dal più nuovo, unite a
  quelle pubblicate prima del B55 (`natpf-desktop/versioni-pubblicate.json`, sha256 verificati il 16/11).
- I telefoni seguono il PC: dopo il ritorno prendono da soli la pagina di quella versione (B54.1), fuori dalla partita.
  L'app Android non cambia. Online (Cloudflare) il ritorno si fa dalla pagina di Cloudflare Pages (Deployments → Rollback).

## Prove

`natpf-desktop/test/aggiornamenti.test.mjs` (+5): storia e versione di prima, file tenuti dalla pulizia; da A a B e
ritorno senza installer e senza internet (detto chiaro); riscaricata da `versioni.json` con lo sha256 (sbagliato → niente),
permesso rifiutato, ritorno, la versione lasciata non si ripropone; storia vuota; `versioni.json` del workflow.
`desktop-core.test.mjs` (ponte con `rollback`). `natpf-tennis/test/natpf-aggiornamenti.test.mjs` (+2): pulsante solo con
una versione di prima e mai durante download o installazione, due clic con la conferma che scade, errore con l'avviso.

## Non provato

Windows vero (permesso, installazione di una versione più vecchia sopra una più nuova: l'installer non controlla la
versione e copia i file, ma i file in più della versione nuova restano nella cartella), `scripts/prova-linux.mjs`.
