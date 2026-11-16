# Registro vero della fiera di Torino (13–16/11/2026): partite, direzione dei colpi, trofei

Fonte: lo scarico del Worker del registro fatto dall'utente il 16/11 (`registro-tutto.jsonl.gz`, 1933 blocchi, 25.833
righe), letto con `natpf-tennis/scripts/registro/riassunto.mjs` e con uno script dei trofei (sotto). Qui solo numeri
aggregati: niente identificativi delle postazioni né altro del file (il repository è pubblico; il file non è nel repository).

## 1. Partite

**587 partite in 4 giorni** (552 finite, 34 abbandonate, 1 senza la riga di fine): 13/11 15 · 14/11 125 · 15/11 251 · 16/11 196.
Contro la CPU 371 (63 %), stesso schermo 216 (37 %); tutte con il telefono. Partite a un game: 99 %. Durata di una partita
finita 74 s (metà sotto 66 s). Nome inserito nel 64 % delle partite (prima del B54 solo dal PC).

## 2. Direzione dei colpi (piano B36, «misurare prima»)

- **La cima del telefono è molto imprecisa nell'uso vero**: scarto dal proprio colpo abituale con mediana 1–5°, ma metà dei
  colpi entro ±52–60° e 9 su 10 entro ±140–147°; oltre 45° il 55–62 % dei colpi. Il centro della mira per partita (primi 20
  colpi) si sposta di 29° (metà delle partite) e fino a 80° (9 su 10).
- **Oggi la palla la dirige il momento del colpo**: peso del tempo nella mira 72–77 %; rango tempo → rimbalzo 0,76–0,84,
  cima → rimbalzo 0,39–0,46 (obiettivo E1 del piano: ≥ 0,8 con «Nuova»).
- Obiettivi dello stand del piano (§7.6): E3 fuori con il tempo nella finestra 0–0,2 % (ok); E4 primi 10 colpi con |piatto| ≥ 0,5
  17–21 % (obiettivo ≥ 30 %); E5 partite storte 6,8 % a Evento (ok), 11,8 % nello stesso schermo.
- Nessuna partita a Precision con i campi della direzione (la prova a Precision non è stata fatta).
- **Conclusione per la B36.1** (regola del piano, §1 punto 8: «se le misure dicono che la cima è troppo imprecisa, si torna
  dall'utente prima di scrivere la regola»): con una dispersione di ±52° a metà dei colpi, un giro voluto di 15–25° si perde
  nel rumore; «la cima comanda» renderebbe la direzione casuale per i visitatori. **B36.1 ferma: si decide con l'utente.**

## 3. Tempo del colpo (osservazione in più)

L'84–91 % dei colpi è **in anticipo**: errore medio +105…+221 ms (metà entro ±100…235 ms); «Perfetto» solo nel 23 % dei
topspin (early 44 %, very early 23 %). Un anticipo così sistematico fa pensare a una finestra del tempo spostata (latenza
compensata troppo, o il visitatore che colpisce appena vede la palla): da guardare prima di cambiare la direzione, perché il
tempo oggi decide il 72–77 % della mira.

## 4. Trofei (B40) ritarati sui dati veri (versione 2026-11-16.7)

753 lati di partite finite (CPU: chi gioca; stesso schermo: tutti e due). Con le soglie dei giocatori simulati i visitatori
veri non prendevano quasi mai Cecchino (0,7 %), Muro (0,7 %), Asso (0,3 %), Maratoneta (2,7 %). Soglie nuove (obiettivo:
bronzo 10–15 %, argento ~3 %, oro sotto l'1 %), con la quota delle partite vere:

| Trofeo | Prima | Ora | Bronzo · argento · oro (Torino) |
|---|---|---|---|
| Cecchino (Perfetti × game) | 16 · 21 · 27 | 8 · 12 · 15 | 10,2 · 2,8 · 0,9 % |
| Maratoneta (scambio più lungo) | 30 · 34 · 38 | 23 · 29 · 37 | 10,8 · 3,5 · 0,8 % |
| Asso (servizi vincenti × √game) | 3 · 4 · 5 | 1 · 2 · 3 | 12,6 · 1,7 · 0,3 % |
| Vincente (× game) | 4 · 5 · 6 | 3 · 4 · 5 | 14,9 · 3,3 · 0,4 % |
| Muro (di fila × √game) | 36 · 44 · 52 | 18 · 25 · 33 | 10,8 · 3,1 · 0,9 % |
| Super | 1 · 2 · 3 | uguale | 16,1 · 3,2 · 0,7 % |

Non ritarati: **Razzo** (il registro non scrive i km/h dei colpi di scambio, solo del servizio: mediana 87 km/h, 9 su 10 sotto
107 km/h, sotto il bronzo di 140); **In serie** (con le partite a un game si arriva al massimo a 4 punti di fila, cioè il game
a zero, che ha il suo trofeo); Game a zero, Rimonta, Re di oggi e Prima volta (non a soglie).
Calcolo: per ogni partita (postazione e numero) colpi Perfetti, scambio più lungo (`colpi` dei punti), servizi vincenti (punto
vinto con il proprio servizio e al più un colpo), vincenti (`fine` «vincente»), colpi rimandati di fila (senza rete, fuori o a
vuoto), colpi super (`sup`). Sono approssimazioni dei contatori del gioco (`natpf_match_stats.sideSummary`): da ricontrollare
con il registro della prossima giornata.
