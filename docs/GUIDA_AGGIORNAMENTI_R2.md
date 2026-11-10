# Guida · aggiornamenti del programma Windows con Cloudflare R2

Scopo (richiesta del 07/11/2026): **un unico installer** di NATPF Simulator per Windows che poi **si aggiorna dal
gioco**, con un clic. Il repository è privato, quindi il programma non può scaricare da GitHub: gli aggiornamenti stanno
in un **bucket pubblico di Cloudflare R2**, sullo stesso account Cloudflare del gioco.

Come funziona, in breve:
1. a ogni versione nuova GitHub costruisce l'installer e lo carica sul bucket (prima l'installer, poi un piccolo file
   `windows/latest.json` che dice qual è l'ultima versione, quanto pesa e il suo codice di controllo sha256);
2. il programma installato, qualche secondo dopo l'avvio, legge `latest.json` (senza internet non succede niente: il
   gioco funziona lo stesso);
3. se c'è una versione nuova il gioco lo dice; con un clic la scarica, con un altro la installa: Windows chiede il
   permesso di amministratore (**Sì**), il gioco si chiude e si riapre aggiornato. Impostazioni e certificati restano.

Servono quattro cose, tutte nella dashboard di Cloudflare e in GitHub (nessun programma da installare). I nomi dei menu
cambiano spesso: dove è scritto *(nome non confermato)*, cercate la voce con il significato più simile. Nomi controllati
sulla documentazione ufficiale il 07/11/2026.

## A · Creare il bucket

1. Accedete a https://dash.cloudflare.com con lo stesso account del gioco.
2. Menu a sinistra: **R2 object storage** (o «Storage & Databases» → R2 *(nome non confermato)*). La prima volta R2 può
   chiedere di attivarlo e un metodo di pagamento: il piano gratuito resta gratuito entro i limiti del punto G.
3. **Create bucket**. Nome: **`natpf-aggiornamenti`** (minuscole, senza spazi). Posizione: automatica. Classe di
   archiviazione: **Standard** (il gratuito non vale per «Infrequent Access»). Confermate.
   Documentazione: https://developers.cloudflare.com/r2/buckets/create-buckets/

## B · Renderlo leggibile da internet (solo lettura)

4. Aprite il bucket → **Settings**.
5. Alla voce **Public Development URL** premete **Enable**; alla domanda **Allow Public Access?** scrivete `allow` e
   premete **Allow**. Deve comparire **Public URL Access: Allowed** e un indirizzo come
   `https://pub-xxxxxxxxxxxxxxxx.r2.dev`. **Copiatelo**: è l'indirizzo pubblico da mandarmi (punto F).
   Documentazione: https://developers.cloudflare.com/r2/buckets/public-buckets/
6. Chiunque abbia l'indirizzo può **scaricare** i file del bucket (l'installer del gioco), ma non può caricarli né
   cancellarli. Nel bucket mettete solo gli aggiornamenti del gioco.
7. Facoltativo: Cloudflare consiglia l'indirizzo `r2.dev` solo per prove (ha un limite di richieste). Per pochi PC
   va bene; se volete un indirizzo vostro (es. `aggiornamenti.vostrodominio.it`, dominio già su Cloudflare): stessa
   pagina **Settings** → **Custom Domains** → **Add** → dominio → **Continue** → **Connect Domain**, e aspettate che
   lo stato diventi **Active**. In quel caso mandatemi quell'indirizzo invece del `r2.dev`.

## C · Creare la chiave per GitHub (token API di R2)

8. Pagina **R2 object storage** → **Overview** → riquadro **Account Details** → accanto ad **API Tokens** premete
   **Manage**. Nello stesso riquadro c'è l'**Account ID** (32 caratteri): copiatelo, serve al punto D.
9. **Create Account API token**.
   - Nome: `natpf-github-aggiornamenti`.
   - **Permissions**: **Object Read & Write** (non «Admin»).
   - Limitate il token **solo al bucket `natpf-aggiornamenti`** (opzione «Apply to specific buckets only» o simile
     *(nome non confermato)*).
   - Scadenza (TTL): a piacere; quando scade la pubblicazione si ferma con un errore e si rifà il token.
10. Premete **Create Account API token**. Compaiono **Access Key ID** e **Secret Access Key**: copiateli subito in un
    Blocco note. **La Secret Access Key si vede una volta sola**: se la perdete, cancellate il token e createne uno
    nuovo.
    Documentazione: https://developers.cloudflare.com/r2/api/tokens/

Non mandatemi mai queste chiavi in chat o per email: vanno **solo** nei segreti di GitHub (punto D).

## D · Mettere le chiavi in GitHub (segreti)

11. Su GitHub aprite il repository **sporcellifitp/foro-italico-world** (prima sergio4/foro-italico-world) → **Settings** → **Secrets and variables** →
    **Actions** → scheda **Secrets** → **New repository secret**. Aggiungete quattro segreti (nomi identici, maiuscole
    comprese):

    | Nome | Valore |
    |---|---|
    | `R2_ACCESS_KEY_ID` | l'**Access Key ID** del punto 10 |
    | `R2_SECRET_ACCESS_KEY` | la **Secret Access Key** del punto 10 |
    | `R2_ACCOUNT_ID` | l'**Account ID** del punto 8 |
    | `R2_BUCKET` | `natpf-aggiornamenti` |

    Documentazione: https://docs.github.com/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
12. I segreti dopo il salvataggio non si rileggono: se sbagliate, premete **Update** e reincollate il valore.

## E · Indirizzo pubblico al programma

13. Il programma deve sapere dove guardare. Due modi, ne basta uno:
    - **mandatemi l'indirizzo pubblico** del punto 5 (es. `https://pub-xxxxxxxxxxxxxxxx.r2.dev`): lo scrivo io in
      `natpf-desktop/aggiornamenti.json` e preparo una versione nuova; oppure
    - stessa pagina del punto 11, scheda **Variables** → **New repository variable**: nome
      `NATPF_AGGIORNAMENTI_URL`, valore l'indirizzo pubblico. Le costruzioni successive lo mettono nell'installer.
14. **Una volta sola a mano**: l'installer che avete adesso non conosce l'indirizzo. Dopo il punto 13, alla prima
    versione nuova, installate a mano `NATPF-Simulator-Setup-<versione>.exe` (dagli Artifacts di GitHub o dal bucket:
    `<indirizzo pubblico>/windows/NATPF-Simulator-Setup.exe`, sempre l'ultima). Da lì in poi gli aggiornamenti
    arrivano dal gioco.

## F · Controllare che funzioni

15. GitHub → **Actions** → **NATPF eseguibili Windows** → ultima esecuzione: il passo «Pubblicazione su Cloudflare R2»
    deve essere verde e il riepilogo dire «Aggiornamento … pubblicato su Cloudflare R2». Se compare l'avviso
    «Aggiornamenti non pubblicati: mancano i segreti …», un segreto manca o ha il nome scritto diverso.
16. Nel browser aprite `<indirizzo pubblico>/windows/latest.json`: deve comparire un testo come
    `{"build": "2026-11-08.1", "version": "2026.1108.1", "file": "NATPF-Simulator-Setup-2026-11-08.1.exe", …}`.
17. Nel bucket (dashboard R2 → bucket → **Objects**) c'è la cartella `windows/` con l'installer della versione,
    `NATPF-Simulator-Setup.exe` e `latest.json`. GitHub tiene gli ultimi 5 installer con la versione nel nome e cancella
    i più vecchi.
18. Errori frequenti nel passo di GitHub: «Access Denied» o «InvalidAccessKeyId» → token sbagliato o non limitato
    al bucket giusto; «NoSuchBucket» → `R2_BUCKET` scritto diverso dal nome del bucket; errore di connessione →
    `R2_ACCOUNT_ID` sbagliato.

## G · Costi

- R2, piano gratuito ogni mese: **10 GB di spazio**, 1 milione di scritture e 10 milioni di letture, **uscita verso
  internet gratuita** (i download non si pagano). Documentazione: https://developers.cloudflare.com/r2/pricing/
- Un installer pesa circa 125 MB; con gli ultimi 5 più la copia con il nome fisso si arriva a circa 750 MB: molto sotto
  i 10 GB. Ogni controllo del programma è una lettura piccola.

## H · Cosa succede sul PC (da dire a chi usa il gioco)

- Il controllo avviene da solo qualche secondo dopo l'avvio, ma **niente si scarica o si installa senza un clic**.
- Il download (~125 MB) avviene mentre si gioca e va in `%LOCALAPPDATA%\NATPF\aggiornamenti`; se si interrompe riprende
  da dove era arrivato. Il file viene controllato (dimensione e sha256) prima di poterlo installare.
- **Installa**: Windows chiede il permesso di amministratore (Controllo dell'account utente, «Vuoi consentire a questa
  app…?» → **Sì**; serve perché il programma è installato in Programmi e ha la regola del firewall). Se rispondete
  **No**, il gioco resta aperto e l'aggiornamento resta pronto per dopo.
- Il gioco si chiude, l'aggiornamento dura meno di un minuto senza finestre, poi il gioco si riapre da solo.
  Impostazioni, record, monitor scelto e certificati dei telefoni restano (`%LOCALAPPDATA%\NATPF`).
- Senza internet (eventi in LAN) il gioco funziona come sempre; il controllo dice solo che il server degli
  aggiornamenti non è raggiungibile.
- Dal menu del programma (tasto **Alt** → Aiuto → **Cerca aggiornamenti…**) si fa la stessa cosa con le finestre di
  Windows.

## Nota: bucket nella giurisdizione UE

Il bucket `natpfsimulator` è stato creato nella giurisdizione **Unione Europea**: per caricare i file si usa l'indirizzo
`https://<Account ID>.eu.r2.cloudflarestorage.com`. Il workflow lo riconosce da solo (dal 07/11, `fa190f2`); l'indirizzo
pubblico `https://pub-….r2.dev` per scaricare non cambia.

