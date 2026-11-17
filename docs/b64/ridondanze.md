# B64 · Ridondanze tolte (ENTRAMBE: stesso gioco)

Decisione dell'utente del 17/11/2026 sulle proposte di `docs/analisi/ridondanze-2026-11-17.md` §3: **sì** a «Fascia una
volta sola», «Livello CPU senza doppioni», «Impostazioni doppie»; **no** alla mano in due posti (la mano resta com'è).

## Cosa cambia

| Proposta | Prima | Adesso |
|---|---|---|
| **Fascia una volta sola** | Stesso schermo: fascia in «Collega i due telefoni» (o nella pagina della fiera) e di nuovo alla «Rivincita» («Chi gioca? Scegli la fascia di ciascuno») | La fascia si sceglie una volta, prima della partita. Alla «Rivincita»: **«Stessi giocatori, stesse fasce»** con le fasce di prima scritte e «Gioca»; un piccolo **«Cambia fascia»** apre la scelta di sempre. Sulle schede di «Collega» il passaggio del mouse spiega che è l'aiuto al più giovane, non la difficoltà |
| **Livello CPU senza doppioni** | «Altre impostazioni» → «Livello della CPU»: Bambini · Facile · Evento · Esperta · Leggenda (i primi tre uguali alle tessere di «Chi gioca») | **«Livelli per esperti»: Esperta · Leggenda**. Bambini, Facile ed Evento solo con le tessere |
| **Impostazioni doppie** | Opzioni con Visuale, Personaggi in campo, Audio (Audio, Voci); «Batte per primo» anche quando non cambiava niente; nelle Opzioni due pulsanti «Schermo intero» | Opzioni senza Visuale (resta in «Altre impostazioni» e in pausa), senza Personaggi (resta in «Pronto per la partita»), senza Audio e Voci (restano in pausa e la musica nel pannello dello stand; nelle Opzioni restano i Volumi). «Batte per primo» contro la CPU solo con «Battuta: Alternata» (con «Sempre lo stesso», di base, batte sempre chi gioca). Nelle Opzioni il pulsante in alto a destra non c'è: resta la riga «Schermo» con lo stato e «All'avvio» |

## Scostamento dalla proposta (da sapere)

La proposta diceva di **spostare** la fascia dello stesso schermo da «Collega» a «Pronto per la partita». Nel gioco vero la
partita dello stesso schermo **parte da sola** quando i due telefoni sono pronti, dalla pagina «Collega»: «Pronto per la
partita» è facoltativa e quasi nessuno la vede. Spostarla lì avrebbe fatto sparire la fascia per molti. Quindi la fascia
resta dov'è (una volta sola) e il doppione tolto è quello della rivincita, che è quello segnalato dall'utente («la imposto
anche dopo»). Contro la CPU la rivincita continua a chiedere «Chi gioca» (richiesta dell'utente del B47, 14/11).

## File

`index.html` (righe delle Opzioni nascoste con `data-b64="doppione"`: il codice che le dipinge serve alle altre pagine;
«Livelli per esperti»; spiegazione sulle fasce), `natpf_rematch.js` (`showBands`, testi `titleSplitSame`, `subSplitSame`,
`bandsBtn`), `natpf_lobby.js` («Batte per primo» solo quando conta), `natpf_kiosk.js` (ridisegno dopo «Battuta»),
`natpf-ui.css`.

## Prove

- `test/natpf-b47-rivincita.test.mjs`: la rivincita dello stesso schermo senza domanda, «Cambia fascia» e poi la scelta.
- Nel browser: `natpf-chi-gioca` (Livelli per esperti), `natpf-lob-drop` (personaggi da «Pronto per la partita», riga
  delle Opzioni nascosta), `natpf-b47-fiera` (rivincita dello stesso schermo), `natpf-stesso-schermo-b20`, `natpf-schermo`.
