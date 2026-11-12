# Guida per lo staff · telecomando e schermo del gioco

Il telefono dello staff (non quello che usano i visitatori) comanda il gioco: frecce, OK, Indietro, Pausa, Torna al
menu, Nuovo giocatore… Si abbina **una volta**: poi si ricollega da solo ogni giorno. Funziona con il programma Windows
NATPF Simulator (e anche con il gioco sul web). Dettagli tecnici e tutte le schermate: `docs/b27/telecomando.md`.

## 1. Una volta sola

**Serve**: il PC con NATPF Simulator aperto, il telefono dello staff sulla **stessa Wi-Fi** del PC (non quella per
ospiti). Android con Chrome o iPhone con Safari.

1. **Certificato** (come per i telefoni dei giocatori; se questo telefono ha già fatto da racchetta, salta il passo):
   sul gioco, pagina «Collega» → «Certificato», oppure dal menu del programma (F11 per uscire dallo schermo intero, poi
   Alt) **Rete → Indirizzi e certificato per i telefoni**: sul telefono apri l'indirizzo `http://<indirizzo del PC>:8081` e installa il certificato della rete
   NATPF. Senza, il telefono vede «connessione non sicura» e il telecomando non si apre.
2. **Abbinamento**: sul PC premi **Ctrl+Maiusc+K** (oppure tieni premuto 3 secondi il marchio NATPF in alto a sinistra
   nel menu) → **Telecomando dello staff**. Compare un QR (diverso da quello dei giocatori) e un codice come `K3ZQ-7M2P`.
   Inquadra il QR con la fotocamera del telefono dello staff: si apre «NATPF Telecomando» e in alto c'è
   **Collegato al gioco** (pallino verde). Sul PC: «Telecomando collegato ✓».
3. **Icona sulla schermata Home**:
   - **Android**: tocca «Installa» nel riquadro verde della pagina, oppure menu ⋮ → «Aggiungi a schermata Home».
   - **iPhone**: Condividi ⬆︎ → «Aggiungi alla schermata Home». Poi **apri l'icona** e scrivi il codice sotto il QR
     (sull'iPhone l'icona ha una memoria sua e non sa dell'abbinamento fatto in Safari; il codice vale 5 minuti con il
     foglio del telecomando aperto sul PC).
4. Fatto. Il QR dello staff non va mostrato ai visitatori (se qualcuno lo inquadra diventa lui il telecomando: vedi §5).

## 2. Ogni giorno

Apri l'icona **NATPF Telecomando**: si ricollega da sola (anche dopo il riavvio del gioco o del PC, un aggiornamento del
programma, un calo del Wi-Fi o lo schermo del telefono spento). In alto vedi dove è il gioco (menu, «Pronto per la
partita», partita con il punteggio, pausa…) e se il telefono del giocatore è collegato, con la batteria quando il telefono
la dice (Android sì, iPhone no).

## 3. Lo schermo del gioco (ledwall)

- **Primo avvio con il ledwall collegato** («Estendi» in Windows): il PC chiede **«Su quale schermo mostro il gioco?»**
  sullo schermo del portatile. Scegli quello con scritto **«probabile ledwall»** (il ledwall 2×2 è 1024×1024). Se nessuno
  risponde entro 30 secondi il programma usa proprio quello. La scelta resta per i prossimi avvii: niente più OBS.
- **Cambiare schermo**: dal telefono **Schermo del gioco** (passa al monitor successivo), oppure Pannello dello stand →
  **Schermo del gioco**, oppure **Ctrl+Maiusc+M** sul PC.
- Ledwall acceso dopo il programma: il gioco ci va da solo appena Windows lo vede.

## 4. I pulsanti

| Pulsante | Cosa fa |
|---|---|
| ↑ ↓ ← → e **OK** | come le frecce e Invio della tastiera nel menu e nelle finestre. **In partita non fanno niente** (non muovono il giocatore e non tirano colpi). |
| **Indietro** | come Esc: pagina precedente, chiude la finestra aperta; in campo mette in **pausa**. |
| **Pausa / Riprendi** | solo in campo. |
| **Gioca** | dal menu verso la partita contro la CPU; nella pagina «Pronto per la partita» è **Gioca!**; a fine partita **Gioca ancora**. |
| **Torna al menu** | dal punto in cui sei; con una partita in corso il telefono chiede conferma. |
| **Nuovo giocatore** | azzera nome, tutorial e calibrazione per chi arriva (il telefono del giocatore resta collegato). |
| **Salta** | intro, nome, riscaldamento, calibrazione, lezione: quando c'è. |
| **Ricalibra il telefono** | il telefono del giocatore rifà i gesti. |
| **Rivedi i gesti** | la modale del tutorial (Indietro la chiude). |
| **CPU: Facile / Esperta / Leggenda** | livello della prossima partita (dal menu, prima o dopo la partita). |
| **Schermo intero** | sì/no (nel programma Windows). |
| **Pannello dell'addetto** | apre e chiude il pannello dello stand. |

Un pulsante grigio e tratteggiato non serve in quella pagina: sotto c'è scritto perché.

## 5. Se il telecomando non si collega

| Cosa vedi | Cosa fare |
|---|---|
| «Mi ricollego…» che non finisce | Il gioco è aperto? Telefono e PC sulla stessa Wi-Fi? Sul PC (F11, poi Alt) menu **Rete → Apri la rete ai telefoni** (firewall). |
| «Mi ricollego…» dopo che il PC ha cambiato rete o indirizzo | L'icona ricorda l'indirizzo del PC: rifai l'abbinamento (§1.2, il QR ha l'indirizzo nuovo). Consiglio: nel router dai al PC un indirizzo fisso (prenotazione DHCP). |
| Pagina «connessione non sicura» | Manca il certificato sul telefono (§1.1), o il certificato è stato rifatto: installalo di nuovo. |
| «Questo telefono non è più il telecomando» | Qualcuno ha abbinato un altro telefono o ha premuto «Scollega il telecomando»: rifai l'abbinamento (§1.2). |
| «Codice non trovato» / «Codice scaduto» | Il foglio «Telecomando dello staff» deve essere aperto sul PC; il codice cambia a ogni apertura e dura 5 minuti. |
| Il telefono è collegato ma il gioco non risponde a un tasto | Il pulsante è spento in quella pagina (leggi il motivo), oppure c'è una finestra aperta sopra: **Indietro**. |
| Telefono perso o rubato | Sul PC: Pannello dello stand → Telecomando dello staff → **Scollega il telecomando**. Poi abbina il telefono nuovo. |

Solo **un** telefono alla volta è il telecomando: abbinarne un altro (QR o codice) scollega il precedente.

## 6. Cosa non è stato provato

Questa funzione è stata provata nel browser (gioco vero sul server del programma, telefono simulato, a 1024 × 1024) e
con il programma su Linux. **Non** è stata provata con telefoni veri, su Windows vero, con il ledwall vero, con
«Aggiungi a schermata Home» su Android e iPhone e con il Wi-Fi dello stand: alla prima occasione allo stand, prova i
punti 1–3 e la tabella del §5 e segnala cosa non va.
