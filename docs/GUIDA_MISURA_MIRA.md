# Misurare la mira del telefono: «alta» o «media»?

Dal B15 la mira del telefono è più sensibile: girando il telefono di 17° la palla va sulla riga (prima ne servivano 23).
Le palle sono più varie, ma se il riferimento della mira è sbagliato (calibrazione fatta storta, corpo girato durante il
gioco) le palle di una partita finiscono un po' di più da una parte. Questa guida serve a **misurarlo con partite vere** e
a scegliere tra «alta» e «media».

Cosa serve: il computer del gioco, un telefono, **3–5 persone diverse**, circa mezz'ora per ogni sensibilità.

## 1. Scegli la sensibilità

Menu → **Opzioni** → riga **«Mira del telefono»**:

- **Alta · 17°** (di base, la scelta del B15): palle più angolate;
- **Media · 20°**: lo stesso piatto girato manda la palla un po' meno di lato;
- **Bassa · 23°**: com'era prima del B15.

La scelta resta salvata sul computer (anche dopo averlo spento) e vale dal colpo successivo, anche per il secondo telefono
dello stesso schermo.

## 2. Accendi la registrazione

1. Premi **Maiusc+D** (oppure Pausa → Diagnostica). Il pannello dice quale mira è in uso, per esempio
   «Mira del telefono: alta (17°)».
2. Togli la spunta a «video della webcam» e «video del gioco»: per questa misura non servono e il pacchetto resta piccolo.
   Lascia «campioni dei sensori del telefono».
3. Nella «Nota» scrivi cosa provi, per esempio «mira alta, 4 persone».
4. Premi **● Avvia registrazione**. In alto a sinistra compare **● REC** con il tempo. Chiudi il pannello con ×.

## 3. Gioca

- Ogni persona collega il telefono e **calibra con cura**: in piedi davanti allo schermo, come dice il gioco.
- Partite **contro la CPU**, in **Singolare 1v1**, con **Altre impostazioni → Durata: Al meglio di 3** (con «1 game» una
  partita ha spesso meno di 20 colpi e non si giudica).
- **3 partite a persona**, ognuna con **almeno 30 colpi** del telefono. Con 3–5 persone fanno 9–15 partite.
- Non contano: riscaldamento e allenamento, minigiochi, servizi, colpi della webcam. Contano tutti i colpi dello scambio,
  anche quelli in rete o fuori.
- Mancini: vanno bene, il calcolo è a specchio.
- Nello **stesso schermo** (1v1 con due telefoni) si misurano tutti e due i giocatori, ognuno visto da sé.
- Una registrazione oltre 30 minuti si divide da sola in parti: vanno scaricate e mandate tutte.

## 4. Ferma e scarica

1. **Maiusc+D → ■ Ferma la registrazione**. Il pannello mostra il riassunto; le righe «Lato delle palle» sono in fondo.
2. Scorri il pannello fino in fondo e premi **⬇ Scarica il pacchetto**: arriva un file
   `natpf-diagnostica-AAAAMMGG-hhmmss-xxxx.zip` nella cartella dei download.
3. Manda lo zip (posta o cartella condivisa) **senza aprirlo né comprimerlo di nuovo**. Se ci sono più parti, mandale tutte.

Le sessioni restano anche nell'elenco «Sessioni salvate» del pannello: si possono scaricare dopo.

## 5. Leggi il verdetto

Nel riassunto del pannello, nel file `LEGGIMI.txt` e in `rapporto.html` dentro lo zip c'è una riga per persona e partita:

```
Lato delle palle · partita 1 · P1 (destro, mira media 20°): 22 colpi · sinistra 27 % · centro 27 % · destra 45 % ·
  |mediana x| per 20 colpi 0,10 m → equilibrata: 45 % dei colpi nella metà sinistra del campo, 55 % nella destra
```

- **sinistra · centro · destra**: dove cadono le palle **viste da chi gioca** («centro» = entro 1 m dalla metà del campo).
- **|mediana x| per 20 colpi**: quanto stanno da una parte le palle di ogni gruppo di 20 colpi. Mezzo metro è normale;
  oltre 1 m le palle stanno da una parte. Se il primo numero è alto e i successivi scendono, il gioco si sta correggendo
  da solo: era la calibrazione.
- **verdetto**:
  - «**equilibrata**»;
  - «**sbilanciata a destra** (dalla parte del dritto): 72 % dei colpi da quella parte» = almeno il **70 %** dei colpi in
    una metà del campo;
  - «troppo pochi colpi per giudicare» sotto i **20 colpi**: quella partita non conta.
- In fondo, «**in tutto**»: quante partite sono sbilanciate su quelle giudicate, separate per sensibilità.

Per leggere uno o più pacchetti insieme, dalla cartella `natpf-tennis` del progetto:

```
node scripts/audit/lato-palle.mjs natpf-diagnostica-*.zip
```

Stampa le stesse righe per ogni registrazione e il totale per sensibilità, per esempio
«mira alta (17°): 2 su 12 = 17 % · una su cinque o meno: la sensibilità va bene». Accetta anche le cartelle già estratte
(se lo zip è stato compresso di nuovo, va estratto e si passa la cartella).

## 6. Quando passare a «media»

Con **almeno 5 partite giudicate** (meglio 10 o più):

- **una partita su cinque o meno sbilanciata** (fino al 20 %): resta «alta»;
- **più di una su cinque** (oltre il 20 %):
  1. prima guarda la **calibrazione**: nel banco (persona simulata, 24 partite da 40 colpi) con la calibrazione giusta
     **nessuna** partita è sbilanciata, con tutte e tre le sensibilità. Le partite sbilanciate vengono da un riferimento
     sbagliato. Fai ricalibrare chi ha avuto le partite sbilanciate, davanti allo schermo, e rifai la misura;
  2. se resta oltre una su cinque, passa a **«Media · 20°»** e rifai il confronto (punto 7).

Cosa aspettarsi dal cambio (banco `scripts/audit/colpi.mjs --mode=lato`, partite sbilanciate su 48 con la calibrazione
sbagliata di 15°, e quanto stanno da una parte):

| Calibrazione | Alta 17° | Media 20° | Bassa 23° |
|---|---|---|---|
| giusta | 0 su 24 | 0 su 24 | 0 su 24 |
| sbagliata di 15° | 40 % (1,18 m) | 38 % (1,05 m) | 35 % (0,93 m) |
| sbagliata di 25° | 58 % (1,59 m) | 56 % (1,41 m) | 50 % (1,28 m) |
| sbagliata nei due versi in modo diverso | 33 % (1,22 m) | 27 % (1,11 m) | 25 % (1,00 m) |

Cioè: «media» toglie un poco di sbilanciamento (le palle stanno circa 10 % meno da una parte) ma **non lo cura**; quello
che lo cura è la calibrazione. In cambio «media» toglie un po' della varietà guadagnata nel B15.

## 7. Rifare il confronto con l'altra sensibilità

1. Opzioni → «Mira del telefono» → **Media · 20°**.
2. Nuova registrazione (punto 2), con la nota «mira media».
3. **Le stesse persone**, lo stesso numero di partite, la stessa durata (punto 3).
4. Ferma, scarica (punto 4).
5. Leggi tutti i pacchetti insieme: `node scripts/audit/lato-palle.mjs alta.zip media.zip`. Il totale è separato per
   sensibilità. Scegli quella con meno partite sbilanciate; a parità tieni «alta» (palle più varie).

Si può anche cambiare sensibilità tra una partita e l'altra nella stessa registrazione: ogni partita registra la sua.

## Passi provati (B16, 08/11/2026)

Provato nel browser con il telefono simulato (`tools/e2e/natpf-mira-lato.mjs`, 20/20 verifiche):

1. Menu → Opzioni: di base «Alta · 17°»; clic su «Media · 20°» → avviso «Mira del telefono: media (20°)»; ricaricata la
   pagina, resta «Media».
2. Maiusc+D → il pannello dice «Mira del telefono: media (20°)»; tolti i due video; nota; «● Avvia registrazione».
3. Telefono collegato e calibrato; pagina «Partita» → «Gioca»; partita 1 con 22 colpi del telefono. Menu → Opzioni →
   «Alta · 17°»; «Gioca»; partita 2 con 4 colpi.
4. Maiusc+D → «■ Ferma la registrazione»: nel riassunto
   «Lato delle palle · partita 1 · P1 (destro, mira media 20°): 22 colpi · sinistra 27 % · centro 27 % · destra 45 % ·
   |mediana x| per 20 colpi 0,10 m → equilibrata…», «partita 2 · P1 (destro, mira alta 17°): 4 colpi … troppo pochi colpi
   per giudicare (4, ne servono 20)», «in tutto: 0 partite sbilanciate su 1 giudicate · mira media (20°): 0 su 1».
5. Scorso il pannello, «⬇ Scarica il pacchetto»: lo zip ha la scheda «Lato delle palle per partita» in `rapporto.html`, le
   righe in `LEGGIMI.txt`, `latoPalle` in `metriche.json`, la mira in `sessione.json`.
6. `node scripts/audit/lato-palle.mjs <zip>`: le due partite con la loro sensibilità e il totale.

**Non provato**: telefoni veri, persone vere, il programma Windows (stesso gioco e stesso pannello, ma il download non è
stato provato lì), partite intere dal servizio (nella prova gli scambi partono da una palla della CPU).
