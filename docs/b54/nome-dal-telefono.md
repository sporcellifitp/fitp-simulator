# B54 · Nome del giocatore scritto sul telefono

Richiesta dell'utente del 16/11/2026: «prima di cliccare "Sono pronto" […] poteva inserire dallo smartphone il nome utente
che avrebbe visualizzato a fine partita o nello scoreboard in alto a sx durante la partita. […] Ad oggi inserimento nome è
possibile solo da tastiera su schermo e per evento in fiera (cpu o stesso schermo) è molto scomodo. Ho bisogno di un flusso
guidato che dopo aver attivato i sensori per ogni partita io possa, per ogni telefono abbinato, impostare un nome e
cambiarlo per la partita seguente. Ciascun visitatore digiterà il proprio nome.» (Era stato chiesto anche per l'app 1.0.3,
che però aveva solo adattato la schermata alla tastiera.)

Decisioni (domande a scelta, 16/11):
- **facoltativo**, con **«Salta» in alto a destra**; il nome si scrive **prima di «Sono pronto»** (passo a sé);
- partita dopo: **campo vuoto per un giocatore nuovo** («Prossimo giocatore», «Nuovo giocatore»), **il nome di prima nella
  rivincita** (si tiene o si cambia);
- **filtro delle parole volgari** sul telefono e sul computer, più **la correzione dello staff dal PC**.

![Il telefono chiede il nome](telefono-nome.webp)

## 1. Il flusso

1. Sulla pagina **«Pronto per la partita»** (anche quella della fiera), contro la CPU con il telefono e nello stesso schermo
   con due telefoni, ogni telefono **pronto** (sensori attivi, calibrato) riceve dal computer la richiesta del nome
   (`natpf_ready_go.js` → `NatpfPhoneRacket.offerName`, messaggio `nm`).
2. Il telefono mostra **«Come ti chiami?»**: «Salta» in alto a destra, il campo (14 caratteri, iniziali maiuscole, niente
   correttore), «Conferma» (o «Fatto» della tastiera). Anello e scritte della pagina spariscono finché si scrive: campo e
   pulsanti restano nella metà alta, sopra la tastiera. Sul computer, accanto a «Gioca ›», «Telefono: scrive il nome».
3. Il telefono controlla subito il nome con le stesse regole del computer e dice cosa non va («Almeno 2 caratteri»,
   «Scegli un altro nome»…); il computer lo ricontrolla sempre (una pagina vecchia o cambiata non lo salta) e, se non va,
   lo richiede con il perché.
4. Con il nome (o «Salta») il computer toglie la richiesta e offre **«Sono pronto»** come prima (B41.6, B47).
5. Dove va il nome: **contro la CPU** il nickname (`NatpfEvents.nickname`: tabellone al posto di «Tu», schermata finale,
   classifica del giorno; senza nome in fiera resta «Visitatore N»); **nello stesso schermo** il nome di quel giocatore
   (`natpfSplitNames`: targhette in campo, tabellone, schede della pagina della fiera, schermata finale).
6. «Salta» tiene il nome che c'è (vuoto per un giocatore nuovo). Si chiede di nuovo a ogni arrivo sulla pagina (partita
   dopo); un foglio dello staff aperto e chiuso non lo richiede.
7. **Correzione dello staff**: come prima, «Nome» sulla pagina della fiera (contro la CPU) o i campi del nome dello stesso
   schermo; i nomi scritti dallo staff sul PC non passano dal filtro (lo staff decide).
8. **Registro dello stand**: `pronto.nome` con `nome: sì | saltato | rifiutato`, **mai il nome** (come per il nickname).
9. **Pagine del telefono di prima**: il computer chiede il nome solo a quelle che lo sanno fare (messaggio `dev` con `nm 1`);
   le altre vanno dritte a «Sono pronto» come prima (e non ricevono messaggi nuovi).
10. Con «Gioca ›» dello staff la partita parte senza chiedere il nome (lo staff ha deciso di partire).

L'app Android non cambia (la pagina arriva dal PC): dalla 1.0.3 la schermata si adatta alla tastiera.

## 2. Il filtro delle parole

`site/js/tennis/player-name.js` (prima stava in `natpf_events.js`, che ora lo prende da qui): lunghezza 2–14, lettere,
numeri, spazio, punto e trattino; «Ospite» e i nomi che dà il gioco («Player 1», «Visitatore 12»…) non si scelgono.
Parole da non mostrare: pezzi di parola (parolacce, bestemmie, insulti, anche inglesi) cercati nel nome intero senza spazi,
con le lettere doppie ridotte e i numeri al posto delle lettere («c4zz0», «C A Z Z O», «Caaazzo»), e parole intere per
quelle che stanno dentro nomi veri («Troiano», «Nazario», «Yamashita», «Fagotto» passano; «troia», «nazi», «shit» no).
Provato con 70 nomi veri italiani e stranieri e 42 parole da bloccare (`natpf-b54-nome.test.mjs`). Limite: un cognome raro
come «Merdani» non passa (lo scrive lo staff dal PC); un filtro di parole non ferma tutto (allusioni, nomi di persone
famose): per quello c'è la correzione dello staff.

## 3. Prove (16/11/2026)

- `natpf-tennis/test/natpf-b54-nome.test.mjs` (9): regole del nome (nomi veri e parolacce); nome proposto e risposta;
  tabellone; contro la CPU (prima il nome, poi «Sono pronto», nickname, tabellone, registro senza il nome); rivincita e
  giocatore nuovo, «Salta»; nome volgare rifiutato dal computer e risposta vecchia ignorata; foglio dello staff; pagina di
  prima; stesso schermo con i due nomi.
- `tools/test/b54-nome-telefono.test.mjs` (5) e `phone-link-fast.test.mjs` (capacità `nm` del telefono).
- Nel browser, pagina vera del telefono con il gioco finto `tools/e2e/natpf-nome-telefono.mjs` (20): richiesta, posizione di
  «Salta», misure a 390 × 844 e con la tastiera aperta (390 × 470), parola volgare e campo vuoto rifiutati sul telefono,
  «Fatto» della tastiera, rifiuto del computer, «Salta», poi «Sono pronto», rivincita, blocco dei tocchi che non copre il
  campo.
- Nel browser, gioco vero e telefoni veri: `tools/e2e/natpf-fiera-telefoni.mjs` (nome scritto in fiera, tabellone e
  schermata finale con il nome, tre visitatori con «Salta», stesso schermo con un nome e un «Salta») e
  `tools/e2e/natpf-flusso-tocchi.mjs` (tocchi per visitatore: ora al massimo 2 con un telefono e 4 con due).

## 4. Cosa non è provato

Telefono vero (tastiere vere di Android e iPhone, l'app 1.0.3 con la tastiera aperta), ledwall, visitatori veri.
