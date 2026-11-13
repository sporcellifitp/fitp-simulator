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
2. **Abbinamento, confermato sul PC**: sul PC premi **Ctrl+Maiusc+K** (**F9** nel programma Windows; oppure tieni premuto 3 secondi il marchio NATPF
   in alto a sinistra nel menu) → **Telecomando dello staff**. Compare un QR (diverso da quello dei giocatori) e un
   codice come `K3ZQ-7M2P`. Valgono solo finché questo foglio è aperto, per 5 minuti.
   - **Android**: inquadra il QR con la fotocamera. Sul telefono compare un **numero di tre cifre**; lo stesso numero
     compare sul PC («Un telefono chiede di diventare il telecomando · numero 417»). Se è lo stesso, sul PC premi
     **Conferma** con il mouse o la tastiera (se è diverso: **Rifiuta**). Sul telefono: **Collegato al gioco** (pallino
     verde); sul PC: «Telecomando abbinato ✓». Poi l'icona: «Installa» nel riquadro verde della pagina, oppure menu ⋮ →
     «Aggiungi a schermata Home».
   - **iPhone**: l'icona della schermata Home ha una memoria sua, quindi si abbina l'icona, non Safari. Inquadra il QR:
     la pagina dice di non abbinare quella scheda. Tocca Condividi ⬆︎ → «Aggiungi alla schermata Home», **apri l'icona
     NATPF Telecomando**, scrivi il **codice** che è sotto il QR sul PC e tocca «Collega con il codice». Compare il
     numero di tre cifre: sul PC premi **Conferma** se è lo stesso. (Se nel frattempo sono passati i 5 minuti, sul PC
     premi «Nuovo QR» e usa il codice nuovo.)
3. Fatto: sul PC il foglio non mostra più né QR né codice. Il foglio si vede anche sul ledwall, ma il QR da solo non
   basta: senza «Conferma» sul PC nessun telefono diventa il telecomando, e chiuso il foglio QR e codice non valgono
   più. **Non confermare mai un numero che non è quello del telefono dello staff.**
4. **Cambiare telefono** (o aggiungere quello di riserva al posto del primo): Telecomando dello staff → **Abbina un
   altro telefono** → come al punto 2. Il telefono di prima non è più il telecomando.

## 2. Ogni giorno

Apri l'icona **NATPF Telecomando**: si ricollega da sola (anche dopo il riavvio del gioco o del PC, un aggiornamento del
programma, un calo del Wi-Fi o lo schermo del telefono spento). In alto vedi dove è il gioco (menu, «Pronto per la
partita», partita con il punteggio, pausa…) e se il telefono del giocatore è collegato, con la batteria quando il telefono
la dice (Android sì, iPhone no).

## 3. Lo schermo del gioco (ledwall)

- **Primo avvio con il ledwall collegato** («Estendi» in Windows): il PC chiede **«Su quale schermo mostro il gioco?»**
  sullo schermo del portatile. Scegli quello con scritto **«probabile ledwall»** (il ledwall 2×2 è 1024×1024). Se nessuno
  risponde entro 30 secondi (o con «Decidi tu») il programma usa proprio quello. La scelta resta per i prossimi avvii:
  niente più OBS. Se un giorno il ledwall è ancora spento all'avvio e ci sono altri due schermi accesi, la domanda
  torna: senza risposta il gioco parte su un altro schermo solo per quella volta, e appena il ledwall si accende ci va.
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
| **Salta** | intro, nome, **scambi di prova** (la partita parte subito), riscaldamento, lezione, calibrazione con i gesti: quando c'è. Negli esercizi dell'allenamento è «Avanti»: passa all'esercizio dopo. |
| **Ricalibra il telefono** | fa quello che fa «Ricalibra» sul computer. Con «Calibrazione: Giocando» (di base): **in partita** si rifanno gli scambi di prova e poi si rigioca il punto, con il punteggio com'era (anche nello stesso schermo: per tutti e due); fuori dalla partita il telefono riparte da capo e il gioco impara dagli scambi di prova della prossima partita. Con «Calibrazione: Con i gesti» il telefono del giocatore rifà i gesti. Durante gli scambi di prova è spento: stanno già calibrando. |
| **Rivedi i gesti** | la modale del tutorial (Indietro la chiude). |
| **Chi gioca: Bambino / Ragazzo / Adulto** (poi CPU: Esperta, Leggenda) | chi gioca la prossima partita contro la CPU, cioè il livello; ogni tocco passa al successivo (dal menu, prima o dopo la partita). |
| **Schermo intero** | sì/no (nel programma Windows). |
| **Pannello dell'addetto** | apre e chiude il pannello dello stand. |

Un pulsante grigio e tratteggiato non serve in quella pagina: sotto c'è scritto perché.

**Pagina «Scambi di prova»** (con «Calibrazione: Giocando», dopo ogni «Gioca» e prima della partita vera, circa 10
secondi): sul telefono in alto c'è scritto «Scambi di prova». È una pagina «in campo»: frecce e OK sono spenti (li gioca
il giocatore), **Indietro** e **Pausa** mettono in pausa, **Salta gli scambi di prova** fa partire subito la partita,
**Torna al menu** e **Nuovo giocatore** chiedono conferma. «Ricalibra il telefono» lì è spento: stanno già calibrando.

## 5. Se il telecomando non si collega

| Cosa vedi | Cosa fare |
|---|---|
| «Mi ricollego…» che non finisce | Il gioco è aperto? Telefono e PC sulla stessa Wi-Fi? Sul PC (F11, poi Alt) menu **Rete → Apri la rete ai telefoni** (firewall). |
| «Mi ricollego…» dopo che il PC ha cambiato rete o indirizzo | L'icona ricorda l'indirizzo del PC: rifai l'abbinamento (§1.2, il QR ha l'indirizzo nuovo). Consiglio: nel router dai al PC un indirizzo fisso (prenotazione DHCP). |
| Pagina «connessione non sicura» | Manca il certificato sul telefono (§1.1), o il certificato è stato rifatto: installalo di nuovo. |
| «Il gioco non si trova… questo telefono non è più il telecomando» | Se il gioco è acceso: qualcuno ha abbinato un altro telefono o ha premuto «Scollega il telecomando». Rifai l'abbinamento (§1.2). Se il gioco era solo spento, alla riaccensione il telefono rientra da solo. |
| Sul telefono un numero di tre cifre che non passa | Sul PC, nel foglio «Telecomando dello staff», premi **Conferma** (se il numero è lo stesso). Dal telefono non si può confermare. |
| «Rifiutato sul computer» / «Un altro telefono sta già chiedendo» | Qualcun altro ha inquadrato il QR prima di te: sul PC «Rifiuta», poi inquadra il QR nuovo. |
| «Codice non trovato» / «Tempo scaduto» / «Il foglio è chiuso» | Il foglio «Telecomando dello staff» deve essere aperto sul PC con il QR in vista; QR e codice cambiano a ogni apertura e durano 5 minuti («Nuovo QR»). |
| «Telecomando aperto in un'altra pagina» | Il telecomando è aperto due volte sullo stesso telefono (Safari e icona, o due schede): tocca la scritta per usare questa pagina. |
| Il telefono è collegato ma il gioco non risponde a un tasto | Il pulsante è spento in quella pagina (leggi il motivo), oppure c'è una finestra aperta sopra: **Indietro**. |
| Telefono perso o rubato | Sul PC: Pannello dello stand → Telecomando dello staff → **Scollega il telecomando**. Poi abbina il telefono nuovo. |

Solo **un** telefono alla volta è il telecomando: abbinarne un altro (QR o codice, confermato sul PC) scollega il
precedente. Dal telecomando non si possono premere «Conferma», «Azzera oggi» e «Scarica CSV»: si fanno dal PC.

## 6. Cosa non è stato provato

Questa funzione è stata provata nel browser (gioco vero sul server del programma, telefono simulato, a 1024 × 1024) e
con il programma su Linux. **Non** è stata provata con telefoni veri, su Windows vero, con il ledwall vero, con
«Aggiungi a schermata Home» su Android e iPhone e con il Wi-Fi dello stand: alla prima occasione allo stand, prova i
punti 1–3 e la tabella del §5 e segnala cosa non va.
