# Ridondanze nel percorso del gioco · analisi del 17/11/2026 (versione 2026-11-17.2) · BOZZA

Richiesta dell'utente: «quando collego i telefoni vedo Player e poi sotto la card del Player l'etichetta Bambino, Adulto
eccetera. È una ridondanza perché comunque questa difficoltà la imposto anche dopo, no? Fai analisi delle ridondanze».

Fonte: inventario dei comandi di ogni pagina dal codice (`natpf-tennis/index.html`, `natpf_lobby.js`, `natpf_split_ui.js`,
`natpf_fiera_page.js`, `natpf_rematch.js`, `natpf_kiosk.js`, pagina del telefono `site/tennis/racchetta.html`) e schermate
(pagina della fiera e «Collega i due telefoni»: prove nel browser `natpf-fiera-layout`, `natpf-stesso-schermo-b25`).
Niente è stato cambiato: questa è un'analisi, le proposte aspettano la decisione dell'utente.

## 1. La risposta alla domanda: la fascia Bambino · Ragazzo · Adulto

**Dove si sceglie oggi**

| Modo | Prima della partita | Dopo la partita |
|---|---|---|
| Contro la CPU | «Pronto per la partita» → «Chi gioca?» (3 tessere) **e** «Altre impostazioni» → «Livello della CPU» (Bambini · Facile · Evento · Esperta · Leggenda) | «Rivincita» → «Chi gioca?» (si sceglie di nuovo; parte da sola dopo 10 s) |
| Stesso schermo, menu normale | «Collega i due telefoni», sotto la scheda di ogni Player | «Rivincita» → «Chi gioca? Scegli la fascia di ciascuno» |
| Stesso schermo, modalità fiera | pagina della fiera, sotto «Player 1 · Telefono 1 pronto» | «Rivincita», come sopra |

Quindi: **sì, si sceglie due volte**, prima della partita e di nuovo alla «Rivincita». La seconda volta è già segnata
quella di prima e la rivincita parte da sola dopo 10 s; l'idea del B47 era cambiarla senza tornare al menu. Ma chi la vede
legge di nuovo la stessa domanda.

**C'è anche un problema di parole.** «Bambino · Ragazzo · Adulto» vuol dire due cose diverse:
- contro la CPU è la **difficoltà della CPU** (Bambini, Facile, Evento);
- nello stesso schermo è l'**aiuto al più giovane** (più margine sul tempo, palle più lente; la partita parte da 0-0, B25).
  Non è una difficoltà, e se tutti e due scelgono la stessa fascia non succede niente.
Il fatto che tu la chiami «difficoltà» conferma che le parole non lo dicono.

## 2. Tutte le ridondanze trovate

| # | Cosa | Dove si sceglie (oggi) | Quante volte | Peso allo stand |
|---|---|---|---|---|
| 1 | **Mano** Destra · Sinistra | Opzioni; «Con cosa giochi?»; foglio del nickname dopo «Nuovo giocatore»; «Pronto per la partita» (fiera, CPU); «Collega i due telefoni» (per Player); pagina della fiera (per Player); **telefono** (due tocchi, B46) | **7** | **Alto**: la mano sbagliata è uno dei tre casi del B46 per dritto e rovescio scambiati |
| 2 | **Fascia / livello** | vedi §1, più «Livello della CPU» che ripete 3 delle 5 voci di «Chi gioca?» | 2–3 | **Alto** (la tua domanda) |
| 3 | **Nome** | «Pronto per la partita» («Nome», tastiera a schermo); foglio del nickname (classifica, «Gioca come Ospite»); «Collega i due telefoni» (Player 1 · sinistra, Player 2 · destra); **telefono** (B54, prima di «Sono pronto») | 3–4 | Medio: dal B54 lo scrive chi gioca sul telefono, gli altri posti restano |
| 4 | **Lato** nello stesso schermo | «Player 1 · sinistra» sopra il campo del nome **e** «Marco gioca a sinistra» nella scheda sotto | 2 sulla stessa pagina | Basso (solo testo) |
| 5 | **Personaggi** Classici · Lob & Drop | Opzioni («Personaggi in campo») **e** «Pronto per la partita» («Personaggi») | 2 (stesso valore salvato) | Basso |
| 6 | **Visuale** 3ª · 1ª persona | Opzioni; «Altre impostazioni»; pausa | 3 | Basso |
| 7 | **Audio** | Opzioni (Audio, Voci); pannello dello stand (Musica); pausa (Musica, Voce) | 3 | Basso |
| 8 | **Schermo intero** | pulsante in alto a destra; Opzioni → Schermo; pausa | 3 | Basso (lo staff lo imposta una volta) |
| 9 | **Chi batte** | «Altre impostazioni» → «Batte per primo» (Tu · CPU · Sorteggio) **e** pannello dello stand → «Battuta» (Sempre lo stesso · Alternata) | 2, con significati vicini | Medio per lo staff: due voci per la stessa idea |
| 10 | **Segnale del momento giusto** | Opzioni (Di base · Sì · No) **e**, nascosto, «Chi gioca?» (acceso con Bambino e Adulto, spento con Ragazzo) | 1 visibile + 1 nascosto | Medio: cambia da solo quando si cambia la fascia |
| 11 | **Calibrazione** | pannello dello stand (Giocando · Con i gesti · Nessuna); «Gioca senza calibrare» nello stesso schermo; «Riscaldati prima»; pausa «Ricalibra» | 4 entrate | Basso: sono azioni diverse (va bene così) |

Non sono ridondanze: «Come si gioca» in alto, il tutorial dopo il collegamento e «Aiuto» in pausa sono entrate diverse
alla stessa guida (servono in momenti diversi).

## 3. Proposte (da approvare: nessuna è fatta)

In ordine di utilità per lo stand:

1. **Fascia una volta sola per modo, nello stesso posto.** Nello stesso schermo la fascia si toglie dalla pagina «Collega
   i due telefoni» (che serve solo a collegare) e va in «Pronto per la partita», come «Chi gioca?» contro la CPU. In fiera
   resta dov'è (la pagina della fiera è già «Pronto per la partita»). Alla «Rivincita» niente domanda: riparte con le
   stesse fasce, con un piccolo «Cambia fascia» per chi vuole.
2. **Parole diverse per le due cose.** Contro la CPU «Livello: Principiante · Facile · Evento» (o lasciare «Chi gioca?»);
   nello stesso schermo «Aiuto al più giovane: Bambino · Ragazzo · nessuno». Così nessuno pensa che sia la difficoltà.
3. **«Livello della CPU» senza i doppioni**: in «Altre impostazioni» restano solo Esperta e Leggenda («Livelli per
   esperti»); Bambini, Facile ed Evento si scelgono solo con «Chi gioca?».
4. **Mano in due posti**: sul telefono (la sceglie chi gioca, con i due tocchi del B46) e una volta sul PC nella pagina
   del modo (fiera, «Pronto per la partita», «Collega i due telefoni»). Via da Opzioni, «Con cosa giochi?» e dal foglio
   del nickname. Meno posti vuol dire meno «Mancino» toccato per sbaglio (B46).
5. **Personaggi, visuale, audio, schermo intero**: un posto per il visitatore («Pronto per la partita», pausa) e uno per
   lo staff (pannello dello stand); le Opzioni del menu tengono solo quello che non c'è altrove.
6. **Chi batte**: una voce sola nel pannello dello stand («Battuta: Sempre chi gioca · Alternata · Sorteggio») e via da
   «Altre impostazioni».

Le proposte 1–4 cambiano pagine che le prove nel browser controllano (stesso schermo, fiera, chi gioca, mano sicura):
vanno rifatte insieme, una per blocco.
