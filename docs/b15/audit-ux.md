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

Stato dopo il secondo giro (§6): **4, 5 e 6 fatte**; **3 non fatta** (motivi e piano in §6); 1 e 2 restano all'utente.
Fatti anche i due punti «da decidere» qui sotto sullo stesso schermo a 1280×720 e sul pannello della calibrazione.

**Aggiornamento B16 (08/11 sera): 1 e 2 fatte** dopo il «sì» dell'utente (ramo `b16-flow`, `docs/WORK_PROGRESS.md` B16).
Tocchi dall'apertura alla prima palla contati nel browser con la stessa prova prima e dopo
(`tools/e2e/natpf-flusso-tocchi.mjs`, comandi veri, telefono simulato):

| Percorso | Prima (contato) | Dopo 1 e 2 | Stima del primo giro |
|---|---|---|---|
| Gioco singolo con il telefono | 20 (computer 6, telefono 14) | **13** (5 + 8) | 21 → 15 |
| Stesso schermo, due telefoni | 31 (3 + 2 × 14) | **19** (3 + 2 × 8) | 29 → 17 |
| Sfida tra due computer | 25 (host 4 + 14 + Salta + Gioca, Player 2: link, Sono pronto, 3 sul telefono) | **18** | ≈ 35 |

Le stime del primo giro erano sbagliate di poco: 6 + 14 fa 20 (non 21), ogni telefono dello stesso schermo ha 14 tocchi
(QR, link, Attiva, 10 × Avanti, Tutto chiaro), e il Player 2 della sfida tra due computer non ha il tutorial (escluso dal
B4). Il riscaldamento insegnava al gioco il colpo tipico: senza, la forza dei primi colpi si legge con un riferimento
minimo (mediana dei colpi già fatti, 3/4 del colpo) invece della sola calibrazione (`natpf_phone_racket.powerRefs`,
banco `natpf-tennis/scripts/audit/riscaldamento.mjs`).

Schizzo «prima → dopo» in passi.

1. **Tutorial corto prima della partita** (11 → 5 schede: presa, posizione, dritto, rovescio, servizio; i colpi speciali
   restano nelle 11 schede dell'Allenamento e in «Rivedi i gesti»). Prima: 10 tocchi di Avanti per giocatore; dopo: 4.
   Singolo 21 → 15 tocchi; stesso schermo 29 → 17. **Fatta nel B16** (commit `c41723b`: 6 Avanti in meno per telefono,
   singolo 20 → 14 con la sola 1, calcolato; stesso schermo 31 → 19, contato).
2. **Riscaldamento facoltativo prima della partita**: dopo la calibrazione si va subito alla pagina «Partita» (o in campo),
   con «Riscaldati prima» come pulsante secondario. Prima: calibrazione → 5 colpi (o Salta) → Partita → Gioca; dopo:
   calibrazione → Gioca. Toglie un tocco e circa un minuto. **Fatta nel B16** (commit `476d62b`): dopo la calibrazione la
   pagina «Partita» con «Racchetta pronta ✓», «Gioca» e «Riscaldati prima»; con il telefono già calibrato o la webcam
   «Collega» porta subito lì (singolo 14 → 13, sfida tra due computer → 18).
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

## 6. Secondo giro (08/11): proposte 4, 5, 6 e due punti visti nel primo giro

Fatto sul ramo `b15-ux`, un commit per punto, nessun passo tolto e nessuna impostazione persa (al massimo un tocco in più
per le cose rare). Le decisioni dell'utente restano com'erano: tutte le schede del tutorial viste prima di «Tutto chiaro,
ho capito», modale piccola e centrata con le frecce, «Pronto» con Ricalibra/Ricollega/Scollega, presa nel palmo, niente
video. Le proposte 1 (tutorial corto) e 2 (riscaldamento facoltativo) non sono state toccate: le decide l'utente.

| Punto | Prima | Dopo | Commit |
|---|---|---|---|
| 4 · una voce per la guida | «Guida» nel menu e «Come si gioca» in alto aprivano la stessa finestra | resta «Come si gioca» in alto a destra (in ogni pagina, tasto H, anche nella riga dei tasti del menu); la fila in basso del menu ha Classifica e Opzioni | `ecb17ba` |
| 5 · pagina «Partita» con una scelta | livello + formato, durata, chi batte, visuale: 90 parole, 18 pulsanti | in vista le tre tessere del livello e la riga «Altre impostazioni · 1 game · singolare · 3ª persona» (chiusa a ogni visita, un tocco la apre: dentro le stesse righe di prima); 70 parole, 9 pulsanti. Stesso schermo: tolta l'unica tessera «Stesso schermo» che ripeteva il titolo, 91 → 62 parole, 13 → 4 pulsanti | `d87a0e9` |
| 6 · telefono «Attiva i sensori» | riquadro con Movimento, Mano (menu a tendina), «Riconosci il gesto solo mentre tengo premuto» e una nota, poi due pulsanti pieni: 39 parole | riga «Mano [Destra] [Sinistra]» sempre in vista sopra il pulsante giallo «Attiva i sensori», poi i link «Gioca con i tocchi» e «Opzioni» (dentro: Movimento e «solo mentre tengo premuto»): 26 parole, un solo pulsante grande | `674cfbe` |
| Stesso schermo a 1280×720 | la barra «Si parte da soli quando siete pronti tutti e due» stava a 585–657 px, sotto il piè di pagina (630): si vedeva solo scorrendo | nomi e scelta «Due telefoni / Una webcam per due» in una riga sola (prima due): barra a 511–583 px, in vista con la riga della presa; a 1920×1080 tutto in vista senza scorrere | `2abfa37` |
| Pannello della calibrazione e degli esercizi | 460 px e consiglio a 15 px fissi anche a 1920×1080 (da 2 m non si leggeva) | misure in `cqw` del contenitore `natpf`: a 1280 come prima, a 1920×1080 circa 614 px, titolo 51 px, consiglio 23 px | `8de3f58` |

**Mano la prima volta (proposta 6).** Un mancino non deve giocare da destro per errore: invece di nascondere la mano
sotto «Opzioni» (o di una riga «Mano: destra · cambia»), restano due pulsanti Destra / Sinistra con la scelta accesa, nella
stessa riga e sopra «Attiva i sensori». Un tocco cambia mano; passa dallo stesso `change` di prima (`applyHand` e messaggio
`hand` al computer), quindi il computer la salva e la rimanda con `cfg` (provato: il computer passa a «left»). Sul computer
la mano resta nella pagina «Con cosa giochi?» e in Opzioni.

**Proposta 3 (unire «Modalità» e «Racchetta»): non fatta.** Il telefono di default e la webcam dal link «Senza telefono?
Usa la webcam» di «Collega» funzionerebbero, ma oggi il passo non è sicuro:
- la pagina «Con cosa giochi?» è anche l'unico posto del percorso con la **mano** sul computer: chi gioca con la webcam (e
  il Player 2 senza telefono) la perderebbe dal percorso, restando solo in Opzioni; andrebbe spostata nella pagina «Collega»
  della webcam, cioè nella parte su cui lavora il ramo dei mancini (B15.B) in parallelo;
- la tappa `controller` è usata da 10 prove nel browser (`natpf-training-flow`, `natpf-tutorial-phone`,
  `natpf-tutorial-relink`, `natpf-training-reconnect`, `natpf-phone-blackout`, `natpf-diag-session`, `natpf-menu`,
  `natpf-aggiornamenti`, `natpf-1v1-p2p`, `scripts/ui-shots.mjs`) e da 6 file di test del gioco; due di quelle prove
  (`natpf-training-flow`, `natpf-tutorial-phone`) sono cambiate proprio nelle stesse righe sul ramo dei mancini: farlo ora
  vuol dire conflitti nell'integrazione B15;
- la scelta della racchetta resterebbe quella dell'ultimo visitatore (salvata nel browser) senza che nessuno la veda, e la
  modalità prova con mouse e tastiera (easter egg) non avrebbe più una pagina da cui sceglierla.
Come farla dopo l'integrazione B15 (un blocco a sé): `progressSteps` senza `controller` (CPU 4 tappe), `[data-mode]`,
`menu('training')` e `pickChallenge` verso `connect`, riga «Mano» nella pagina «Collega» della webcam, easter egg che
sceglie direttamente mouse e tastiera, chiosco che riporta la racchetta al telefono, prove aggiornate con lo stesso
significato. Risparmio: un clic nel gioco singolo (21 → 20), uno nell'Allenamento e uno nei minigiochi.

### Passi dall'apertura alla prima palla (dopo il secondo giro)

Invariati: gioco singolo con il telefono **21** (PC 6 + telefono 14, più «Consenti» su iPhone), stesso schermo **29**,
1v1 su due computer **≈ 35**. Il secondo giro toglie scelte in vista e parole (pagina «Partita» 18 → 9 pulsanti compresi
quelli in alto e in basso, telefono da 2 pulsanti pieni e 3 campi a 1 pulsante grande), non tocchi: la riga «Altre
impostazioni» e il link «Opzioni» sono tocchi in più solo per chi cambia formato, durata, chi batte, visuale, movimento o
«solo mentre tengo premuto». I tocchi veri da togliere restano le proposte 1–3.

### Parole (stesso script del primo giro, `innerText` visibile a 1280×720; telefono 390×844 con un conto dei nodi di testo visibili)

| Schermata | Dopo il primo giro | Dopo il secondo | Pulsanti |
|---|---|---|---|
| Menu principale | 54 | 53 | 8 → 7 |
| Partita (CPU) | 90 | 70 | 18 → 9 |
| Stesso schermo · Partita | 91 | 62 | 13 → 4 |
| Collega i due telefoni | 148 | 154 (stato delle schede diverso nella misura: «Preparo il QR» / «Inquadra il QR»; tolte le 3 parole «Si gioca con») | 11 → 11 |
| Telefono · «Attiva i sensori» | 39 (stesso conto sul codice di `c32cfb1`) | 26 | 5 controlli → 5 (1 pulsante grande, 2 per la mano, 2 link) |

(Il JSON «dopo» del primo giro era stato misurato prima di `464db52`: guida scheda 1 110 → 93 e Collega 111 → 107 vengono
da quel commit, non da questo giro.)

### Dove si trova ogni impostazione (nessuna persa)

Formato, durata, chi batte, visuale: «Partita → Altre impostazioni» (visuale anche in Opzioni e in pausa). Guida: «Come si
gioca» in alto, tasto H, pausa. Mano: telefono (sopra «Attiva i sensori»), «Con cosa giochi?», Opzioni, stesso schermo
(schede). Movimento e «solo mentre tengo premuto»: telefono → «Opzioni» (anche alla verifica della calibrazione). «Gioca con
i tocchi»: link sotto «Attiva i sensori», pulsante pieno se i sensori non vanno e durante la calibrazione. Webcam: «Con cosa
giochi?» e link in «Collega».

### Verifiche del secondo giro

`npm test` 896/896 (due test nuovi: riassunto di «Altre impostazioni» e apri/chiudi/richiuso a ogni visita) ·
`node --test tools/test/*.test.mjs` 196/196 (nuovo: struttura della schermata «Attiva i sensori», mano in vista prima del
pulsante, `#moreOpts` insieme a `#profileOptions`) · `npm run build` ok · prove nel browser sulle porte 3841–3848:
`natpf-menu` 22/22 (cinque voci, frecce `training,challenges,ranking,options,options,challenges`), `natpf-training-flow`
18/18, `natpf-tutorial-phone` 37/37, `natpf-split-ready` 34/34, `gesture-calibration` 19/19 (apre «Opzioni», tocca
«Sinistra»), `natpf-1v1-p2p` 37/37, `natpf-modale-gesti` 18/18 (16/18 al primo giro solo per i fps con il computer
carico da altre prove, 18/18 rifatta). Dettagli in `docs/WORK_PROGRESS.md` (B15-UX.6–11). Screenshot «dopo2»
(1280×720 con telefono 390×844, 1920×1080 con telefono 412×915, più pagina «Partita» aperta, stesso schermo, pannello degli
esercizi e telefono con «Opzioni» aperte): guardate le schermate toccate dal giro (menu, Partita chiusa e aperta, Sfida
un amico, stesso schermo QR / pronto / conto / webcam per due, calibrazione ed esercizio, telefono «Attiva i sensori»,
«Opzioni», «Sinistra» e sensori negati) alle due risoluzioni: niente tagliato, niente sovrapposto; la webcam per due a
1280×720 scorre ancora sotto le schede (come prima, con una riga in meno).
Non verificato: telefoni veri, persone vere, ledwall vero, lettori di schermo.
