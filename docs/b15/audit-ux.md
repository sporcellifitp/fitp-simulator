# B15 · Audit UX/UI dall'accesso alla partita (08/11/2026)

Richiesta dell'utente: «rivedi l'intero flusso dall'accesso al gioco fino alla partita. Semplifica eventuali ridondanze, testi
lunghi, rendi tutto semplice e di facile lettura e comprensione».

Metodo: screenshot di tutto il flusso con un telefono simulato (computer 1280×720 e 1920×1080, telefono 390×844 e 412×915;
script `scripts/ui-shots.mjs` più uno script dell'audit fuori dal repository), conteggio delle parole visibili per schermata
(`innerText` degli elementi in vista, script dell'audit), lettura dei testi nel codice. Le parole «dopo» sono misurate con lo
stesso script dopo i commit di questo blocco. Pubblico di riferimento: chi non conosce il gioco, pochi secondi di attenzione.

## 1. Schermate, parole e scelte

Parole = parole visibili nella pagina (titolo, testi, pulsanti, barra in alto e in basso), misurate con lo script dell'audit
(computer: `innerText` degli elementi in vista a 1280×720; telefono: testi della schermata, barra in alto compresa). Scelte =
pulsanti e link attivi. Le parole della guida scheda 1 restano 110 perché la presa (`GRIP.text`, 28 parole) e la racchetta
(smartphone/webcam) sono volute lì; le pagine con molti pulsanti (Partita, Opzioni) non cambiano: sono scelte, non testo.

| Schermata (computer) | Scopo | Parole prima → dopo | Scelte | Che cosa non andava |
|---|---|---|---|---|
| Intro | marchio, «premi un tasto» | 19 → 19 | 2 | nulla da togliere |
| Menu principale | scegliere Gioca / Allenamento / Minigiochi | 60 → 54 | 8 | descrizioni di 14–16 parole; «Guida» (menu) e «Come si gioca» (in alto) aprono la stessa finestra con due nomi |
| Scegli la modalità → «Con chi giochi?» | CPU, amico, stesso schermo | 164 → 98 | 7 | il sottotitolo ripete le tre tessere; ogni tessera ha descrizione **e** tre righe che dicono le stesse cose («1 contro 1 su due computer» / «2 giocatori · 2 computer in rete»); gergo: «ledwall 2×2 e 3×2 (Opzioni → Schermo)», «1v1», «2v2», «compagno CPU», «Leggenda» |
| Con cosa giochi? (racchetta) | telefono o webcam | 79 → 59 | 8 | sottotitolo = descrizioni delle tessere; «senza niente da impugnare» due volte; **errore**: la tessera dice «lo impugni in verticale, come il manico» (presa del 29/10, dal 04/11 è la presa nel palmo) |
| Collega il telefono | QR e passi sul telefono | 126 → 111 | 5 | passo 3 (presa) in 24 parole, poi la stessa presa torna nel tutorial (scheda 1) e sul telefono; «Si parte da soli» detto qui e sul pulsante |
| Accendi la webcam | webcam | 83 → 83 | 7 | ok; i messaggi d'errore della webcam sono lunghi (staff) |
| Pronto per la partita | livello, formato, durata, chi batte, visuale | 91 → 90 | 18 | 5 righe di scelte prima di «Gioca» (vedi proposte); «Rifai il riscaldamento» in basso |
| Collega i due telefoni | stesso schermo | 165 → 148 | 11 | la presa nel palmo spiegata una quarta volta sotto le schede; la barra «Si parte da soli quando tutti e due i giocatori sono pronti» è lunga; a 1280×720 la barra e la presa finiscono sotto il piè di pagina |
| Stesso schermo · partita | riepilogo | 94 → 91 | 13 | ok |
| Opzioni | schermo, mano, visuale, audio | 98 → 80 | 18 | nota dello schermo di 37 parole con `?area=x,y,larghezza,altezza` (è per chi installa, non per chi gioca); «Dimentica pallonetto e palla corta imparati» |
| Minigiochi | scegliere un minigioco | 153 → 146 | 6 | ogni tessera: descrizione, tre regole, record e «Nessun record oggi»; sottotitolo e nota sul nickname |
| Classifica | top 10 | 40 → 40 | 6 | ok |
| Guida «Come si gioca» (6 schede) | regole in breve | 112 / 60 / 83 / 119 / 49 / 95 → 110 / 46 / 62 / 64 / 47 / 64 | 10–12 | scheda 1 ripete tutta la presa (già in Collega, tutorial e telefono) più il riscaldamento; scheda 4 (mira) è un paragrafo di 70 parole in grassetto alternato; scheda 6 (colpi speciali) 55 parole |
| Pannello del telefono (QR in partita) | ricollegare | 70 → 70 | 2 | i passi «Impugna · Prova · Verifica» ripetono la calibrazione; il consiglio in «Pronto» è di 50 parole |
| Nickname | solo per la classifica | 20 → 17 | 2 | ok |
| Tutorial (modale, 11 schede: 1, 2, 3, 5) | presa e gesti prima della calibrazione | 80 / 71 / 39 / 40 → 56 / 60 / 37 / 38 | 2 | scheda 1: paragrafo (35 parole) **e** tre righe che dicono la stessa cosa; riga in fondo di 19 parole in grassetto; **sotto la modale** il pannello in basso a sinistra ripete «Sfoglia le schede, poi sul telefono «Tutto chiaro, ho capito»» (stessa frase due volte sullo schermo) |
| Calibrazione in campo | fermo, dritto, rovescio | — | 0 | «Ora: gesto naturale verso sinistra, con la stessa presa che userai in partita, poi fermati» (17 parole, 3 righe); la stessa frase anche sul telefono |
| Esercizi (Allenamento) | ripetere i colpi | — | 0 | consigli fino a 16 parole su 3 righe; il riquadro «Guarda e ripeti» ripete le tre righe della scheda del tutorial |
| Pausa | audio, visuale, telefono | 32 → 32 | 8 | ok |
| Calibra lo schermo | staff | 98 → 91 | 16 | per chi installa: lasciata |
| Risultato minigioco | punteggio | — | 3 | **a 1280×720 i pulsanti Riprova / Classifica / Menu finiscono sotto il piè di pagina** (si vedono solo scorrendo) |

| Schermata (telefono) | Scopo | Parole prima → dopo | Che cosa non andava |
|---|---|---|---|
| Collegato («Attiva i sensori») | attivare i sensori | 48 → 41 | sotto il pulsante: Movimento, Mano, «Riconosci il gesto solo mentre tengo premuto» e «Bastano quattro piccoli gesti. Puoi giocare anche da seduto, con la presa che preferisci» (i gesti sono due e la presa è una sola) |
| Tutorial (spento) | aspettare le schede | 48 → 41 | «Guarda lo schermo», 17 parole di spiegazione, «Scheda 1 di 11 · Presa nel palmo», puntini, «Viste 0 di 11: «Tutto chiaro» si accende dopo l'ultima»: quattro righe per dire «guarda il computer» |
| Tutorial (acceso) | toccare «Tutto chiaro» | 36 → 27 | «Tocca «Tutto chiaro, ho capito», qui in alto: poi si calibra. Puoi ancora rivedere le schede con ‹ ›» |
| Preparati / Tieni fermo | fermo per la presa | 36 / 62 → 28 / 21 | «Tieni fermo» ripete tutto il testo della presa (40 parole) |
| Dritto / Rovescio | il gesto | 29 → 22 | «Ora: gesto naturale verso sinistra, con la stessa presa che userai in partita, poi fermati. Gesto 1 di 2.» |
| Pronto | aspettare la palla | 37 → 16 | **due frasi uguali**: «Guarda il computer e colpisci quando la palla arriva alla racchetta…» e sotto «Dai un colpetto quando la palla arriva alla racchetta sul computer.» |
| Al servizio | lanciare e colpire | 44 → 26 | tre frasi più la frase doppia |
| Pausa (con l'avviso dello schermo) | aspettare | 72 → 37 | «Partita in pausa: guarda il computer. Si riprende da solo quando il telefono è di nuovo pronto; se resta ferma, tocca «Ricollega»» più l'avviso dello schermo (30 parole) |
| Sensori negati | riprovare | 75 → 55 | 42 parole con iPhone, Android e tocchi insieme |
| Scollegato / Nessuna partita | riaprire il QR | 14 → 12 | ok |

Leggibilità: testi del telefono 17 px su fondo scuro (ok); sul computer i consigli degli esercizi e della calibrazione sono a
15 px fissi in basso a sinistra anche a 1920×1080 (piccoli da 2 m); nel tutorial le tre righe (cues) sono grandi e leggibili,
il paragrafo sopra è a 13–22 px e in grigio. Gerarchia: le pagine del menu hanno titolo, sottotitolo, tessere, un solo pulsante
giallo (bene). Contrasto: ok ovunque (testo chiaro su blu scuro), tranne le righe grigie delle tessere (text-2) a 1280×720.

## 2. Passi dall'apertura alla prima palla (prima volta, telefono Android; su iPhone +1 «Consenti»)

Contati i tocchi e i clic; i gesti con il telefono (calibrazione: fermo + 2 gesti; riscaldamento: 5 colpi) non sono tocchi.

| Percorso | Prima | Dopo questo blocco | Dettaglio (prima) |
|---|---|---|---|
| Gioco singolo con il telefono (Gioca → CPU) | **21** | 21 | computer: tasto dell'intro, Gioca, Contro la CPU, Smartphone, Salta (riscaldamento), Gioca = 6; telefono: QR, link, Attiva i sensori, 10 × Avanti (11 schede), Tutto chiaro = 14; poi il servizio è un gesto |
| Stesso schermo con due telefoni | **29** | 29 | computer: tasto, Gioca, Stesso schermo = 3; ogni telefono 13 (QR, link, Attiva, 10 × Avanti, Tutto chiaro); il conto alla rovescia parte da solo |
| 1v1 su due computer (sospeso: non serve agli eventi) | **≈ 35** | ≈ 35 | host come il singolo (senza Salta) + attesa; ospite: link, Entra in campo, telefono 13, pronto; l'host preme Gioca |

Il peso vero sta nelle **10 schede del tutorial** (metà dei tocchi) e nel riscaldamento prima della partita: entrambi sono
decisioni dell'utente (04–05/11) e non si toccano qui; sotto le proposte per ridurli.

## 3. Che cosa è stato cambiato in questo blocco (sicuro: solo testi, una regola CSS, nessun passo tolto)

- Testi accorciati a una frase, verbo all'imperativo, senza gergo: menu, modalità, racchetta, Collega, Opzioni, minigiochi,
  nickname, guida (6 schede), tutorial (presa e posizione), calibrazione (computer e telefono), esercizi, pannello del
  telefono, pausa del telefono, avvisi del telefono, stesso schermo.
- Ripetizioni tolte: sottotitoli che ripetevano le tessere; «Niente da impugnare» due volte; presa spiegata in Collega
  ridotta a una riga (il tutorial la mostra con foto e figura); sul telefono in «Pronto» la frase doppia; sotto la modale del
  tutorial il pannello non ripete più la riga della modale (resta la barra con «Salta» e la pausa).
- Errore corretto: la tessera Smartphone diceva «lo impugni in verticale, come il manico».
- Coerenza computer ↔ telefono: stesso titolo per lo stesso passo («Inquadra il QR», «Tocca «Attiva i sensori»», «Tieni fermo
  il telefono», «Dritto ←»), stesse parole per il gesto.
- Risultato dei minigiochi: i pulsanti non finiscono più sotto il piè di pagina a 1280×720 (CSS, solo su schermi bassi).

## 4. Proposte strutturali per l'utente (non fatte: cambiano passi o schermate)

Schizzo «prima → dopo» in passi.

1. **Tutorial corto prima della partita** (11 → 5 schede: presa, posizione, dritto, rovescio, servizio; i colpi speciali
   restano nelle 11 schede dell'Allenamento e in «Rivedi i gesti»). Prima: 10 tocchi di Avanti per giocatore; dopo: 4.
   Singolo 21 → 15 tocchi; stesso schermo 29 → 17.
2. **Riscaldamento facoltativo prima della partita**: dopo la calibrazione si va subito alla pagina «Partita» (o in campo),
   con «Riscaldati prima» come pulsante secondario. Prima: calibrazione → 5 colpi (o Salta) → Partita → Gioca; dopo:
   calibrazione → Gioca. Toglie un tocco e circa un minuto.
3. **Unire «Modalità» e «Racchetta»**: il telefono è la racchetta di default (già scelta); la webcam resta come link «Senza
   telefono? Usa la webcam» nella pagina Collega (c'è già). Prima: Gioca → Modalità → Racchetta → Collega; dopo: Gioca →
   Modalità → Collega. Un clic in meno e una pagina in meno nella barra di avanzamento (4 tappe invece di 5).
4. **Una sola voce per la guida**: «Guida» nel menu e «Come si gioca» in alto aprono la stessa finestra. Tenere solo «Come
   si gioca» in alto (c'è in ogni pagina) oppure rinominare la voce del menu. Nessun passo in meno, meno confusione.
5. **Pagina «Partita» con una scelta sola**: livello della CPU in vista, il resto (formato, durata, chi batte, visuale) sotto
   «Altre impostazioni» richiuso: 18 pulsanti → 4 e «Gioca» più vicino. Durata e visuale sono già salvate.
6. **Telefono, schermata «Attiva i sensori» senza opzioni**: Movimento, Mano e «solo mentre tengo premuto» sotto un link
   «Opzioni» (la mano si sceglie già sul computer). Da 2 pulsanti più 3 campi a 1 pulsante grande.

Altre cose viste, da decidere: nella pagina «Collega i due telefoni» a 1280×720 la barra dell'avvio e la riga della presa
restano sotto il piè di pagina (si scorre); il pannello della calibrazione in basso a sinistra è piccolo a 1920×1080 (testo
15 px fisso: da 2 m non si legge, una misura in `cqw` lo risolverebbe); la voce «Sfida un amico» (due computer) compare
nel menu («CPU · Sfida un amico») e nella pagina Modalità anche se agli eventi non serve (decisione del 04/11: non si
sviluppa, non si toglie).

## 5. Verifiche

Vedi la risposta finale del blocco e `docs/WORK_PROGRESS.md`: test del gioco e del sito, build, prove nel browser
(`natpf-training-flow`, `natpf-tutorial-phone`, `natpf-menu`, `natpf-modale-gesti`), screenshot «dopo» controllati a occhio a
1280×720, 1920×1080 e sul telefono simulato (390×844, 412×915). Non verificato: telefoni veri, persone vere, ledwall.
