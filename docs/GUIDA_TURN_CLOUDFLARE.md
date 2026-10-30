# Guida · server di inoltro (TURN) di Cloudflare per NATPF Simulator

Scopo: far collegare il telefono (e i due computer della sfida) anche sulle reti che bloccano le strade di oggi, come la
rete del telefono del Player 2 che si collegava solo con la VPN. Il TURN di Cloudflare passa anche dalla porta 443, come
un normale sito https.

Servono due cose, entrambe nella dashboard di Cloudflare (nessun programma da installare):

1. una **chiave TURN** (Cloudflare Realtime);
2. un **secondo Worker**, piccolo e separato dal gioco, che si chiama **`natpf-turn`**: tiene la chiave segreta e dà al
   gioco credenziali temporanee (24 ore). La chiave non va mai nello zip del gioco, in chat o nel repository.

Il gioco (zip 2026-10-28.17) cerca già il Worker all'indirizzo `https://natpf-turn.s-porcelli.workers.dev/`. Se il
Worker non c'è o non risponde, il gioco usa le strade di sempre: niente si rompe.

I nomi dei menu di Cloudflare cambiano spesso: dove è scritto *(nome non confermato)*, cercate la voce con il significato
più simile.

## A · Creare la chiave TURN

1. Accedete a https://dash.cloudflare.com con lo stesso account del gioco.
2. Aprite **Realtime** (prima si chiamava «Calls»), sottovoce **TURN Server** *(nome non confermato)*. Link diretto della
   documentazione ufficiale: https://dash.cloudflare.com/?to=/:account/calls
3. Premete **Create** e, se lo chiede, scegliete **TURN**. Nome: `natpf-turn`. Confermate.
4. Compaiono due valori: copiateli subito in un Blocco note.
   - **Turn Token ID** (identificativo) → servirà come `TURN_KEY_ID`;
   - **API Token** (stringa lunga) → servirà come `TURN_KEY_API_TOKEN`. Probabilmente si vede **una volta sola**: se lo
     perdete, cancellate la chiave e createne una nuova.
5. Costi: i primi **1.000 GB al mese sono gratis**, poi 0,05 $ per GB. Per un telefono-racchetta sono moltissimi.
   Se la dashboard chiede un metodo di pagamento, è il normale «pay-as-you-go» *(non confermato se sia obbligatorio)*.

## B · Creare il Worker `natpf-turn`

6. Aprite **Workers & Pages** → **Create** (o «Create application») → Worker → partite da **Hello World** *(etichetta
   non confermata)*.
7. Nome del Worker: **`natpf-turn`** (esattamente così: è l'indirizzo che il gioco cerca). Premete **Deploy**.
8. Nella pagina del Worker premete **Edit code**. Nell'editor selezionate tutto (Ctrl+A), cancellate e incollate
   **tutto** il file `natpf-turn-worker.js` che vi ho mandato (è `natpf-tennis/cloudflare/turn-worker.js` del
   repository). Premete **Deploy**.

## C · Le variabili del Worker

9. Pagina del Worker `natpf-turn` → **Settings** → **Variables and Secrets** → **Add**. Aggiungete tre righe (nomi
   identici, maiuscole comprese):

   | Tipo | Nome | Valore |
   |---|---|---|
   | Text | `TURN_KEY_ID` | il «Turn Token ID» del punto 4 |
   | **Secret** | `TURN_KEY_API_TOKEN` | l'«API Token» del punto 4 |
   | Text | `ALLOWED_ORIGINS` | `https://weathered-heart-53ed.s-porcelli.workers.dev` |

10. Premete **Deploy**: le variabili valgono solo dopo il Deploy. Il Secret dopo il salvataggio non si rilegge più.

## D · Controllare che il Worker funzioni

11. Aprite nel browser https://natpf-turn.s-porcelli.workers.dev (o l'indirizzo mostrato nella pagina del Worker).
12. Giusto: un testo che comincia con `{"iceServers":[` e contiene `turn.cloudflare.com`, `username` e `credential`, e
    finisce con `"ttl":86400`. Ricaricando, username e credential cambiano: è normale.
13. Se invece compare un errore:
    - `{"ok":false,...}` con 500: manca una variabile o il nome è scritto diverso, oppure non avete premuto Deploy;
    - 502: la chiave non è valida (ID e token scambiati o token sbagliato): rifate la chiave e il passo 9;
    - pagina non raggiungibile subito dopo la creazione: aspettate un paio di minuti.
    - Se l'indirizzo del Worker non è `natpf-turn.s-porcelli.workers.dev`, ditemelo: preparo lo zip con quello giusto.

## E · Caricare il gioco

14. Caricate sul Worker del gioco (weathered-heart-53ed) lo zip **`natpf-simulator-cloudflare-20261028-17.zip`** come
    al solito. Il Worker del gioco non cambia: nessun codice, nessuna variabile.

## F · Provare

15. Il Player 2 apre la sfida e collega il telefono **senza VPN**, sulla stessa rete di quando non funzionava.
16. Con la diagnostica accesa, nel registro cercate le righe **«strada telefono»** e **«strada sfida»**:
    - «relay (tls, TURN nostro)» (oppure udp/tcp al posto di tls) = il collegamento passa dal nostro TURN: è quello che
      serviva;
    - «host» o «srflx» e «senza TURN» = collegamento diretto, il TURN non è servito.
    Se il telefono ancora non si collega, mandatemi il registro della diagnostica di quel computer.

## G · Tenere d'occhio la spesa (consigliato)

17. **Manage Account → Billing → Billable Usage → Create budget alert**: soglia per esempio 1 $, la vostra email, Save.
    L'avviso manda solo un'email, non blocca il consumo.
18. Il consumo dettagliato del TURN la documentazione lo dà solo via API (GraphQL); se serve vi preparo la richiesta.

## Sicurezza in breve

- `ALLOWED_ORIGINS` impedisce ad altri **siti** di usare il Worker. Un programma che conosce l'indirizzo può comunque
  chiedere credenziali: durano 24 ore e il traffico costa poco, per questo l'avviso di spesa.
- Se l'API Token finisce nel posto sbagliato: cancellate la chiave in Realtime → TURN e createne una nuova (punti 3–4 e
  9).

Fonti: developers.cloudflare.com/realtime/turn/ (generate-credentials, faq), /realtime/pricing/,
/workers/configuration/secrets/, /billing/manage/budget-alerts/. Non verificato dal vivo: nessuna chiave Cloudflare è
stata usata nelle prove; il Worker è provato con una risposta di Cloudflare simulata.
