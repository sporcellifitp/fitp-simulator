# Lob e Drop a fine partita

Qui stanno le animazioni delle due mascotte da mostrare **a fine partita, nella schermata di fine partita**.

Regola d'uso: se ne mostra **una sola, scelta a caso**, fra quelle di vittoria quando chi sta giocando vince,
fra quelle di sconfitta quando perde. Alla partita successiva ne tocca un'altra: nessuna ripetizione immediata
della stessa animazione.

20 GIF in tutto: 10 di Lob e 10 di Drop, per ognuna 5 pose di vittoria (`-win-`) e 5 di sconfitta (`-lose-`).
Nomi: `lob-win-01 ... lob-win-05`, `lob-lose-01 ... lob-lose-05`, `drop-win-01 ... drop-win-05`,
`drop-lose-01 ... drop-lose-05`. Il file `manifest.json` elenca per ogni GIF il personaggio, l'esito,
l'azione e le specifiche.

## Specifiche

- 320 x 320 px, 10 fotogrammi, 1,6 s in loop, 160 ms per fotogramma
- fondo bianco #FFFFFF, come la card di fine partita: nessun ritaglio necessario
- da 173 a 251 KB ciascuna; se ne scarica una sola per partita, mai tutte e venti
- nessun testo oltre a LOB e DROP, nessun logo sul petto

## Origine

Generate con GPT Image 2.6 (`gpt_image_2_6`), risoluzione 2k, qualita high, 12 fotogrammi, a partire dai due
riferimenti dei peluche di Lob e Drop. Le pose sono state controllate una per una: espressione coerente con
l'esito, figura intera, nessun logo, nessuna figura di spalle.

## Da fare

L'innesto nell'interfaccia non e ancora in questo commit: va aggiunto in `site/tennis/index.html` (un `<img>`
dentro la card `#end`) e in `finish()` di `site/js/tennis/main.js`, che oggi imposta `#endTitle`, `#endScore`
e `#endStats`. Servono la scelta casuale senza ripetizione, la prericarica della GIF successiva e la variante
ferma per chi ha `prefers-reduced-motion`.

Mascotte dell'evento: uso interno, come il resto del materiale Nitto ATP Finals nel sito.
