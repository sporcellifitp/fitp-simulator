# B39 · Cose emerse dalla guida dello stand (14/11/2026, versione 2026-11-13.12)

Trovate scrivendo e verificando sul codice la guida `docs/GUIDA_STAND.md` (scrittore + verificatore indipendente). Molte
sono già nella lista unica (`LISTA-UNICA-E-PROPOSTA-B39.md`): chi fa il B39 le confronti e aggiunga quelle nuove.

## Cosa oggi non si fa con il solo mouse (o confonde)

- Pannello dello stand in partita: con il solo mouse non si apre. In campo il marchio non c'è e la pausa non ha la voce. Servono il telecomando, F9, oppure ❚❚ → «Torna al menu», che chiude la partita.
- Menu principale: lì il marchio è nascosto, quindi i 3 secondi di pressione non funzionano. Non c'è un segno di avanzamento e la pressione si annulla in silenzio se il puntatore esce dal marchio.
- I campi di testo non si scrivono con il mouse: nome del giocatore, nomi dello stesso schermo, codice della sfida tra due computer, campi della diagnostica. Dalla loro pagina i minigiochi non partono senza nome. La tastiera a schermo (B38) non c'è ancora.
- Il menu del programma Windows (Rete, Aiuto, Ricarica, Esci, Cartella dei dati, Scheda grafica) compare solo con Alt. Col mouse la rete ai telefoni si riapre solo riavviando il programma.
- Il gioco non ha né «Esci» né «Ricarica». Se si chiude con la X della finestra, il programma salva «finestra» e il prossimo avvio è in finestra. Ricaricare il gioco col solo mouse non si può.
- La classifica a schermo intero non ha un pulsante per uscire. Col mouse si esce solo con marchio → «Nuovo giocatore», che fa partire il percorso di un visitatore nuovo, oppure aspettando il chiosco.
- Porta 8443 o 8080 occupata: nella prova B39 su Linux compare un errore inglese (EADDRINUSE) con il solo «OK» e il gioco resta su «Avvio del gioco…». Il messaggio italiano descritto in COLLAUDO_WINDOWS §6 non compare.
- Doppio clic: nelle voci a giro del pannello (chiosco, formato, calibrazione, mira) fa due passi. «Alla partita ›» e «Gioca ›» stanno nello stesso punto, quindi un doppio clic può saltare «Pronto per la partita».
- La diagnostica si apre solo dalla pausa o con Maiusc+D: non c'è né nel menu né nel pannello.
- Il tasto laterale «indietro» del mouse riporta alla pagina «Avvio del gioco…». Ctrl+R non lo risolve: bisogna chiudere e riaprire il programma.
- «Azzera oggi» usa una finestra confirm() di Windows; «Scarica CSV» e «Scarica la coda» aprono «Salva con nome». Sono finestre piccole che possono cadere fuori dalla parte visibile del ledwall, e dal telecomando non si raggiungono.
- Il chiosco scollega il telefono (il visitatore dopo rifà il QR) e non conta il movimento del mouse come attività. Se nessuno clicca, può chiudere un foglio aperto, per esempio l'abbinamento del telecomando.
- «Musica» nel pannello e «Audio» nelle Opzioni non restano salvate: alla riapertura l'audio torna acceso.
- Il foglio del telecomando e docs/GUIDA_TELECOMANDO.md parlano di un QR «Certificato» nella pagina «Collega», ma il pulsante vero si chiama «Prima volta su questo telefono».
- Nel programma il link «Apri il link del controller ↗» della pagina «Collega» apre una seconda finestra sopra il gioco.
- Sul ledwall il puntatore di Windows è piccolo e sul campo resta un mirino sottile. Nel gioco non c'è un'opzione per ingrandirlo.

## Altre note del verificatore

- «Chi gioca» / «Livello della CPU» non resta salvato: a ogni avvio, ricarica o aggiornamento torna Adulto (Evento); un
  livello scelto dallo staff (Esperta, Leggenda) si perde. Da chiedere all'utente se deve restare.
- «Musica» del pannello e «Audio» delle Opzioni non restano salvati: alla riapertura l'audio torna acceso.
- «Scollega il telecomando» non ha la guardia del doppio clic dei pulsanti in due passi del B43: due clic veloci scollegano.
- Il foglio del telecomando e `docs/GUIDA_TELECOMANDO.md` parlano di un QR «Certificato» nella pagina «Collega», ma il
  pulsante vero si chiama «Prima volta su questo telefono».
