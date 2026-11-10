# Due misure da raccogliere con persone vere (B18)

Tappa 1, punto 12 dell'audit del gameplay (`docs/b16/rapporto-gameplay.md` §4). Le due misure non cambiano il gioco:
servono a decidere dopo, con dati veri, due cose che oggi si conoscono solo dal gioco simulato.

| misura | che cosa decide | da dove viene |
|---|---|---|
| **Quanto varia il gesto** da un colpo all'altro (salita della testa del telefono rispetto alla propria abituale, piano, forza) | se la soglia del tagliato deve diventare relativa al gesto di ciascuno (difetti 13 e 25) e quanto rischia una persona di fare una schiacciata non voluta (difetto 7) | colpi del telefono registrati (`tel.colpo`: forma e intenzione) |
| **Quando si colpisce rispetto al rimbalzo** (ms dal rimbalzo della palla al picco del gesto, e ms dal gesto all'impatto previsto dal gioco) | se spostare il punto d'impatto più in alto, dopo il rimbalzo (punto 23) | rimbalzi, piano d'intercetto e colpi del telefono registrati |

Il calcolo è in `natpf-tennis/src/natpf/diag/diag_gesture.js`: lo stesso nel pannello della diagnostica, nel rapporto
scaricato e nello script.

## Come si raccolgono

1. Sul computer dello stand apri la diagnostica: **Maiusc+D** (oppure **Pausa → Diagnostica**).
2. Premi **Avvia registrazione** prima che la persona cominci (riscaldamento compreso: i colpi del lanciapalle contano).
3. Fai giocare la persona come al solito: riscaldamento e una partita contro la CPU vanno bene. Servono **almeno 10 colpi
   normali per lato** (dritto e rovescio) perché la variazione del gesto abbia un verdetto.
4. Mentre gioca, il pannello della diagnostica mostra già, sopra la tabella dei colpi, le righe
   «Variazione del gesto (dritto, … colpi normali)» e «Dal rimbalzo al gesto (… palle)» (ricalcolate ogni secondo).
5. A fine partita premi **Ferma**, poi **Scarica**: è uno zip con il rapporto. Le stesse righe sono nel riassunto del
   rapporto.
6. **Una registrazione per persona**: la variazione del gesto è di una persona. Annota a parte (non nel gioco) se era un
   adulto o un bambino e se aveva già giocato.

Obiettivo utile: 15–20 persone diverse, adulti e bambini.

## Come si leggono

Dalla cartella `natpf-tennis`:

```sh
node scripts/audit/gesto-rimbalzo.mjs <pacchetto.zip | cartella estratta> [altri…] [--json=uscita.json]
```

Per ogni registrazione:

- **Variazione del gesto** (per lato): `salita ±x` è la deviazione della salita della testa rispetto alla propria
  abituale. Sopra **0,15** il verdetto è «varia molto: soglia relativa da considerare» (soglia indicata dall'audit B16).
  «Vicini alla soglia del tagliato» = colpi normali a meno di 0,1 dalla soglia del tagliato; «sotto la soglia della
  schiacciata» = colpi normali che con la palla alta potrebbero diventare una schiacciata.
- **Dal rimbalzo al gesto**: mediana, 10° e 90° percentile in ms. «Gesto prima dell'impatto previsto» positivo vuol dire
  in anticipo sul punto in cui il gioco colpisce la palla.

In fondo il totale: la variazione mediana tra le persone, quante superano 0,15 e il tempo dal rimbalzo su tutte le palle.

**Come decidere** (proposta, da confermare con i dati):

- se più di una persona su cinque supera 0,15, la soglia del tagliato relativa al proprio gesto vale il lavoro;
  altrimenti si lascia la soglia uguale per tutti;
- se il gesto arriva in mediana ben dopo l'impatto previsto, o molto presto dopo il rimbalzo, si valuta il punto
  d'impatto più in alto (punto 23 dell'audit); se arriva in anticipo, come dicono le diagnostiche del 23/10, si lascia.

## Limiti

- Servono telefoni con la forma del gesto (pagina del telefono di oggi); con la webcam queste misure non ci sono.
- L'istante del gesto è quello del picco sul telefono riportato sull'orologio del computer: se l'orologio non è allineato
  (collegamento appena ripreso), i primi colpi possono essere spostati di qualche decina di ms.
- Dove registrare: sul computer dello stand contro la CPU, o sul computer che ospita la sfida (Player 1). Dalla revisione
  del 10/11 la registrazione scrive anche chi gioca su quel computer (`ruolo` nell'evento «partita») e sul computer del
  Player 2 di una sfida tra due computer la misura del rimbalzo conta le palle del P1; questo caso però è provato solo
  con eventi costruiti nei test, e l'impatto previsto («prima dell'impatto») lì può mancare. Nello stesso schermo la
  misura vale per il Player 1 (metà sinistra). Le registrazioni fatte prima della revisione non hanno il ruolo e valgono
  come computer del Player 1.
- Nessuna di queste misure è ancora stata raccolta con persone vere: le prove sono solo con eventi costruiti nei test
  (`natpf-tennis/test/natpf-diag-gesto-rimbalzo.test.mjs`).
