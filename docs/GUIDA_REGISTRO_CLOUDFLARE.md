# Guida · registro dello stand su Cloudflare (Worker `natpf-registro` e bucket R2 privato)

Scopo: le righe di gioco dello stand (partite, punti, colpi, errori: **niente nomi, niente video, niente audio**) escono
da sole dal PC dello stand, che non è vostro, e arrivano nel **vostro** spazio Cloudflare. Sul PC resta solo quello che
non è ancora partito (per esempio senza rete). Che cosa c'è nel registro e cosa no: `docs/b30/registro-dello-stand.md`.

Servono tre cose, tutte nella dashboard di Cloudflare (nessun programma da installare):

1. un **bucket R2 nuovo, separato e privato**, che si chiama **`natpf-registro`**;
2. un **Worker nuovo** che si chiama **`natpf-registro`**: riceve le righe dal gioco e le scrive nel bucket;
3. una **chiave di lettura** che scegliete voi: serve solo a voi per vedere lo spazio occupato, scaricare e cancellare.

Se il Worker non c'è o non risponde il gioco funziona identico: le righe restano in coda sul PC e partono dopo.

I nomi dei menu di Cloudflare cambiano spesso: dove è scritto *(nome non confermato)*, cercate la voce con il significato
più simile.

> **ATTENZIONE · il bucket del registro deve restare PRIVATO.**
> Non usate il bucket dove ci sono l'installer e il trailer: quello è **pubblico** (chiunque indovini il nome di un file
> lo scarica). Il registro va in un bucket **nuovo**, `natpf-registro`, e su quel bucket **non accendete mai** «Public
> access», «R2.dev subdomain» né un «Custom domain». Il Worker non può accorgersi se il bucket è pubblico: dipende da voi.

## A · Creare il bucket privato `natpf-registro`

1. Accedete a https://dash.cloudflare.com con lo stesso account del gioco.
2. Menu a sinistra: **R2 Object Storage** (o «Storage & Databases» → **R2**) → **Overview** → **Create bucket**.
3. **Bucket name**: `natpf-registro` (esattamente così). **Location**: Automatic. **Default storage class**: Standard.
   Premete **Create bucket**.
4. Controllo: nella pagina del bucket → **Settings** → **Public access**: «R2.dev subdomain» deve dire **Disabled** (o
   «Not allowed») e in «Custom Domains» non ci deve essere niente. Se vedete «Allow Access» **non** premetelo.

## B · Creare il Worker `natpf-registro`

5. Menu a sinistra: **Workers & Pages** → **Create** (o «Create application») → **Worker** → partite da **Hello World**
   *(etichetta non confermata)*.
6. Nome del Worker: **`natpf-registro`**. Premete **Deploy**.
7. Nella pagina del Worker premete **Edit code**. Nell'editor selezionate tutto (Ctrl+A), cancellate e incollate **tutto**
   il file `natpf-registro-worker.js` che vi mando (è `natpf-tennis/cloudflare/registro-worker.js` del repository).
   Premete **Deploy**.
8. In alto nella pagina del Worker c'è il suo indirizzo, del tipo `https://natpf-registro.<vostro-sottodominio>.workers.dev`
   (lo stesso sottodominio del Worker `natpf-turn`). Copiatelo in un Blocco note: serve ai punti 13 e 16.

## C · Collegare il Worker al bucket

9. Pagina del Worker `natpf-registro` → **Settings** → **Bindings** → **Add** (o «+ Add binding») → **R2 bucket**.
   - **Variable name**: `REGISTRO` (maiuscole comprese);
   - **R2 bucket**: `natpf-registro` (quello del punto 3, **non** quello dell'installer).
   Premete **Add Binding** (o «Save») e poi **Deploy** se lo chiede.

Senza questo collegamento il Worker **non accetta righe** e la sua pagina lo dice in rosso: «Il registro NON è pronto:
manca il collegamento al bucket R2».

## D · Le variabili del Worker (e la chiave segreta)

10. Pagina del Worker → **Settings** → **Variables and Secrets** → **Add**. Aggiungete queste righe (nomi identici):

    | Tipo | Nome | Valore |
    |---|---|---|
    | **Secret** | `CHIAVE_LETTURA` | una chiave che inventate voi, **almeno 12 caratteri** (lettere e numeri) |
    | Text | `ALLOWED_ORIGINS` | l'indirizzo del gioco e quello del programma Windows, separati da una virgola, senza «/» finale: `https://<indirizzo-del-gioco>, https://localhost:8443` |
    | Text *(facoltativa)* | `MAX_TOTALE_MB` | tetto di tutto il registro in MB. Senza: **2048** (2 GB) |
    | Text *(facoltativa)* | `MAX_GIORNO_MB` | tetto di un solo giorno in MB. Senza: 200 |

    - `<indirizzo-del-gioco>` è la pagina che aprite per giocare (il Worker del gioco, per esempio
      `https://<nome-del-gioco>.<vostro-sottodominio>.workers.dev`). `https://localhost:8443` è il programma Windows.
    - La **chiave** la scegliete e la tenete **solo voi**: non scrivetela in chat, in un'email, in un file del gioco o
      del repository. Il gioco non la conosce e non gli serve: può solo **aggiungere** righe. Senza la chiave nessuno
      può leggere, elencare o cancellare niente (il Worker non cancella mai niente da solo). Chi conosce l'indirizzo del
      Worker (sta nel pacchetto web, che è pubblico) può però **riempire** lo spazio con righe finte: vedi il punto H.
11. Premete **Deploy**: le variabili valgono solo dopo il Deploy. Controllo: nell'elenco `CHIAVE_LETTURA` deve avere il
    tipo **Secret** (non «Variable», che si legge in chiaro nella dashboard). Se è «Variable», cancellatela e
    aggiungetela di nuovo scegliendo **Secret**, poi Deploy.
12. Se perdete la chiave: cambiatela qui (stessa riga, **Edit** o cancellate e aggiungete), Deploy. Le righe già salvate
    restano.

## E · Provare che funziona

13. Aprite nel browser l'indirizzo del Worker (punto 8). Si apre la pagina **«Registro di NATPF Simulator»**:
    - «Spazio R2 collegato: **sì**» e «Chiave di lettura impostata: **sì**» in verde = tutto a posto;
    - una scritta rossa dice cosa manca e dove si mette (punto 9 o 10).
14. Scrivete la chiave nella casella e premete **Mostra i giorni**. La prima volta: «Ancora nessun giorno registrato.»
    Sotto c'è la barra dello **spazio occupato** (per esempio «12 MB su 2.0 GB»).
15. Dopo aver caricato il gioco con l'indirizzo del registro (parte F): giocate una partita, aprite il pannello dello
    stand (**Ctrl+Maiusc+K**, **F9** nel programma Windows) e premete **Invia adesso**. Il pannello deve dire «ultimo invio riuscito alle …». Ripremete
    **Mostra i giorni** nella pagina del Worker: compare il giorno di oggi con blocchi, righe e peso.

## F · Mettere l'indirizzo nel gioco

16. Mandatemi l'indirizzo del Worker (punto 8: **solo l'indirizzo, mai la chiave**). Io preparo:
    - lo zip Cloudflare del gioco con l'indirizzo dentro (`scripts/pacchetto-cloudflare.mjs --registro-url=…`, che scrive
      il file `natpf/registro.json` nello zip);
    - l'installer Windows con l'indirizzo dentro (`natpf-desktop/registro.json`, oppure la variabile
      `NATPF_REGISTRO_URL` al momento della costruzione).
    - **Com'è oggi (13/11/2026)**: il gioco si apre solo dal programma Windows, quindi `ALLOWED_ORIGINS` =
      `https://localhost:8443` e l'indirizzo sta solo nell'installer (dalla versione 2026-11-13.7); lo zip Cloudflare
      resta **senza** `--registro-url` (il Worker rifiuterebbe il gioco aperto nel browser). Per registrare anche dal
      browser: aggiungete l'indirizzo del gioco ad `ALLOWED_ORIGINS` (Deploy) e chiedete uno zip con `--registro-url`.
17. Caricate lo zip sul Worker del gioco come al solito e installate il programma Windows sul PC dello stand. Il registro
    è **acceso da solo**: lo staff non deve fare niente. Nel pannello dello stand (Ctrl+Maiusc+K, F9 nel programma Windows) la voce «Registro di
    gioco: Sì · No» lo spegne, e lo stato dice partite di oggi, ultimo invio, righe in coda, oppure «indirizzo del
    registro non impostato» o «rete assente».

## G · Dove si vedono i file e come si scaricano

18. **Pagina del Worker** (il modo più semplice): chiave → **Mostra i giorni** → accanto a ogni giorno **Scarica** (un
    file `registro-AAAA-MM-GG.jsonl.gz`) e **Cancella**; sotto, **Scarica tutti i giorni in un file**. Questi file vanno
    mandati **così come sono** a chi sviluppa il gioco (sono compressi, pochi MB anche per giorni pieni).
19. **Nel bucket**: R2 → `natpf-registro` → **Objects**: cartelle `registro/<giorno>/<postazione>/` con dentro i blocchi
    `….jsonl.gz` (uno ogni 45 secondi di gioco circa, più uno a fine partita) e il file `conti.json` (il conto dello
    spazio). Da qui si può scaricare un blocco alla volta, ma è scomodo: meglio la pagina del Worker.
20. Per chi sviluppa (non serve a voi): `REGISTRO_CHIAVE=… node natpf-tennis/scripts/registro/scarica.mjs --url=<Worker> --out=cartella`
    scarica tutti i giorni, poi `node natpf-tennis/scripts/registro/riassunto.mjs cartella` fa il rapporto.

## H · Quanto spazio occupa (e cosa succede quando è pieno)

Misure (docs/b30/registro-dello-stand.md, «Quanto pesa»): una partita occupa nel bucket circa **2 kB** compressi (le
righe in chiaro sono circa 6 kB; con partite più lunghe o tanti colpi un po' di più). Stima prudente con **2,5 kB a
partita**:

| Partite al giorno | Spazio al giorno | Giorni in **2 GB** (tetto di base) | Giorni in **10 GB** |
|---|---|---|---|
| 1.000 | circa 2,5 MB | circa **800** giorni | circa **4.000** giorni |
| 5.000 | circa 12,5 MB | circa **160** giorni | circa **800** giorni |

In pratica, per le giornate dello stand, il registro occupa una piccola parte dei 10 GB dell'account (che contengono
anche installer e trailer).

- **Tetto totale** (`MAX_TOTALE_MB`, di base 2 GB): quando il registro è pieno il Worker **non accetta altre righe**
  (restano in coda sui PC dello stand e ripartono da sole quando c'è di nuovo posto). Il Worker **non cancella mai
  niente da solo**: la pagina del Worker scrive in rosso «Spazio quasi pieno» o «Spazio PIENO»; voi scaricate i giorni
  che volete tenere e li cancellate con **Cancella** (oppure alzate `MAX_TOTALE_MB`).
  Perché così (revisione del 12/11): prima, oltre il tetto, il Worker cancellava da solo i giorni più vecchi; chi
  conosceva l'indirizzo poteva mandare righe finte e far sparire i giorni veri dello stand. Adesso può al più riempire
  lo spazio: se vedete giorni che non sono dello stand pieni di righe, cancellateli e avvisate chi sviluppa.
- **Giorni accettati**: senza chiave il Worker accetta solo righe da **7 giorni fa a domani**. Un PC con l'orologio
  sbagliato, o rimasto senza rete più di una settimana, tiene i suoi blocchi in coda (il pannello dello stand dice
  «giorno non accettato (orologio del computer?)»): sistemate l'orologio, oppure portate via la coda con **Scarica la
  coda**.
- **Tetto di un giorno** (`MAX_GIORNO_MB`, di base 200 MB, ottanta volte una giornata da 1.000 partite): un giorno pieno
  non accetta altre righe; restano in coda sul PC (pannello: «invio non riuscito»).
- **Costi**: il piano gratuito di R2 comprende 10 GB, un milione di scritture e dieci milioni di letture al mese. Un
  invio fa due scritture e due letture, e una partita fa circa 3 invii (uno ogni 45 secondi di gioco e uno a fine
  partita): 1.000 partite al giorno sono circa 6.000 scritture al giorno, circa 180.000 in un mese pieno; con 5.000
  partite al giorno **tutti i giorni per un mese** si arriva vicino al milione gratuito (oltre, R2 costa pochi dollari
  per milione di scritture: impostate l'avviso di spesa come nella guida del TURN, punto 17). Il piano gratuito dei
  Worker comprende 100.000 richieste al giorno.

## Sicurezza in breve

- Il bucket `natpf-registro` è **privato e separato**: mai «Public access», mai un dominio pubblico, mai il bucket
  dell'installer.
- Il gioco (e chiunque conosca l'indirizzo del Worker) può solo **aggiungere** righe del registro, con limiti di
  dimensione e di frequenza, nei giorni da una settimana fa a domani; le righe che non sono del registro e i campi non
  previsti si scartano. `ALLOWED_ORIGINS` impedisce ad altri **siti** di scrivere (non a un programma che finge di
  essere il gioco). Chi conosce l'indirizzo può **riempire lo spazio** e bloccare le scritture finché non cancellate,
  ma **non può leggere né cancellare niente**: senza la chiave nessuna scrittura fa cancellare qualcosa.
- Leggere, elencare, scaricare e cancellare: **solo con la chiave**, che sta solo nelle variabili segrete del Worker e
  nella vostra testa. Dopo 10 chiavi sbagliate in 10 minuti il Worker si ferma per quell'indirizzo.

Fonti: developers.cloudflare.com/r2/ (buckets/create-buckets, buckets/public-buckets, pricing),
/workers/runtime-apis/bindings/ (R2), /workers/configuration/secrets/, /workers/platform/pricing/. Non verificato dal
vivo: nessun account Cloudflare è stato usato nelle prove; il Worker è provato con uno spazio R2 finto in memoria
(`natpf-tennis/test/registro-worker.test.mjs`) e, nella prova nel browser, dietro un piccolo server locale.
