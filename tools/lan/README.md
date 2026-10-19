# NATPF: smartphone e desktop sulla rete locale

La modalità `?lan=1` usa segnalazione WebSocket **sul desktop** e due DataChannel WebRTC cifrati diretti: comandi affidabili e sensori binari senza ritrasmissioni. `iceServers: []`: nessun servizio STUN/TURN, PeerJS pubblico o server cloud. WebSocket scambia soltanto offerte SDP/candidati ICE; sensori e colpi non passano dal server. Le modalità di invito Internet preesistenti rimangono disponibili quando `lan=1` non è presente.

## Avvio guidato: Windows

1. Estrai **il pacchetto NATPF Simulator LAN** e installa Node.js 20 o successivo.
2. Collega computer e telefono alla stessa Wi-Fi. Apri `tools/lan/avvia-lan.cmd` con un doppio clic. Al primo avvio le dipendenze vengono installate con `npm ci`: soltanto questa installazione richiede Internet.
3. Si apre la pagina di configurazione sul computer. Tieni aperta la finestra del programma mentre giochi. Se manca HTTPS, la pagina mostra gli indirizzi LAN esatti e le istruzioni per il certificato; non presenta un collegamento HTTP come se funzionasse sul telefono.
4. Dopo la configurazione HTTPS, premi **Apri NATPF** per l'indirizzo della stessa rete del telefono. Il campo rimane sul computer. Scansiona il QR col telefono, consenti i sensori e segui la calibrazione mostrata.

Su macOS/Linux, dalla cartella `tools/lan`: `npm ci`, poi `npm run setup`. La guida si apre su `http://127.0.0.1:8080/lan/`, accessibile solo sul computer; **il gioco e il telefono usano invece HTTPS su porta 8443**. Non usare `localhost` per la pagina del campo: il QR risultante non sarebbe raggiungibile dal telefono.

## Configurazione HTTPS una volta per ogni computer/rete

Serve un certificato valido per **l'indirizzo IP LAN esatto** del computer, firmato da una CA attendibile anche sul telefono. L'avvio guidato controlla file, coppia certificato/chiave, scadenza e corrispondenza dell'IP; non può verificare se il telefono si fida già della CA.

**Senza programmi da installare**: `node certificato.mjs` crea un'autorità locale del computer (`certs/ca/`, la chiave
non va mai copiata altrove), il certificato del server per gli indirizzi di rete attuali (`certs/cert.pem`, `key.pem`,
rifatto da solo quando cambiano) e la parte pubblica `certs/natpf-ca.crt`. `node certificato.mjs --servi` la offre ai
telefoni della stessa Wi-Fi su `http://IP:8081/` (pagina con istruzioni per iPhone e Android e QR nella finestra).

In alternativa puoi usare una CA locale di sviluppo, per esempio **mkcert**, predisposta dal responsabile del computer. Il launcher non scarica eseguibili e non modifica automaticamente la fiducia dei dispositivi. Se mkcert è già installato, dalla cartella `tools/lan`:

```sh
mkdir certs
mkcert -install
mkcert -cert-file certs/cert.pem -key-file certs/key.pem 192.168.1.20 localhost 127.0.0.1
mkcert -CAROOT
```

Sostituisci `192.168.1.20` con l'IP mostrato dalla guida; puoi inserire più IP separati da spazi. `mkcert -CAROOT` mostra la cartella che contiene il certificato pubblico della CA `rootCA.pem`.

- Installa **solo `rootCA.pem`** nei dispositivi autorizzati. Non trasferire mai `rootCA-key.pem` o `certs/key.pem` sul telefono o a terzi.
- Su iPhone/iPad installa il profilo della CA, poi abilita la fiducia completa in **Impostazioni → Generali → Info → Impostazioni attendibilità certificati**.
- Su Android installa la CA dalle impostazioni di sicurezza del dispositivo (nomi e percorso dipendono dal produttore). Verifica poi nel browser che la pagina HTTPS sia attendibile e autorizza i sensori quando richiesto.
- Ignorare un avviso di certificato autofirmato non garantisce l'accesso ai sensori. Se l'IP del computer cambia, rigenera il certificato per il nuovo IP. La guida riconosce i file aggiornati senza riavvio.

Per fiere/eventi è consigliabile predisporre questa configurazione sui dispositivi prima dell'apertura. Per eliminare questo passaggio dai telefoni personali serve un diverso modello di distribuzione/certificati o un controller nativo: il browser non permette al gioco di aggirare il requisito HTTPS.

## Rete e diagnostica

Autorizza Node.js sulla rete privata nel firewall del computer: HTTPS TCP 8443 e traffico WebRTC UDP tra dispositivi. Disattiva l'isolamento client/guest dell'access point. Il solo inoltro della porta HTTPS non basta a WebRTC.

La guida mostra indirizzi locali validi per il certificato e il numero di dispositivi registrati al server di abbinamento. **Registrato non significa ancora racchetta collegata**: lo stato effettivo, RTT e perdita pacchetti sono mostrati nel gioco, che osserva il collegamento WebRTC diretto. Se non compare alcun indirizzo, controlla la connessione Wi-Fi; se la porta è occupata, chiudi il precedente avvio.

Avvio avanzato, senza guida:

```sh
node server.mjs --cert=/percorso/desktop-cert.pem --key=/percorso/desktop-key.pem --port=8443
```

Apri sul desktop `https://IP-DEL-COMPUTER:8443/tennis/?lan=1`. Il parametro `lan=1` viene incluso nel QR. Il server serve Three.js e le risorse locali: dopo la preparazione non serve Internet per giocare. Per una prova di trasporto sul solo desktop rimane `npm start` in HTTP su porta 8080: **HTTP su IP LAN non abilita i sensori del telefono**. Il pacchetto statico Cloudflare da solo non può eseguire il server di segnalazione LAN.

## Stream e gestione delle perdite

Pacchetto fisso da **52 byte**, massimo **40 Hz**: versione/flag, sequenza uint32, timestamp float64, giroscopio, accelerometro e accelerazione con gravità float32. I dati sensore non sono JSON; la coda motion viene scartata in caso di backpressure, senza accumulare gesti vecchi. I messaggi sporadici di calibrazione, abbinamento, colpo e sincronizzazione mantengono un piccolo formato JSON sul canale affidabile.

Il desktop converte gli assi DeviceMotion alpha(Z), beta(X), gamma(Y) in XYZ, poi media gli ultimi quattro vettori reali, integra una rotazione normalizzata, usa SLERP per assorbire il jitter ed estrapola al massimo 60 ms. Dopo 150 ms senza campioni congela l'orientamento e riduce la confidenza a zero; il rendering sfuma verso la posa pronta. Nessun campione predetto produce un colpo. Il tempo di impatto conserva il picco reale misurato sul telefono e l'allineamento degli orologi. L'ingresso in stato `ready` dopo la calibrazione azzera l'orientamento relativo.

`createPhoneLink().motion(nowMs)` restituisce `{rotation:[qx,qy,qz,qw], angularVelocity:[deg/s,deg/s,deg/s], confidence, age, stale, loss, received, lost, rtt, transport}`. `loss` deriva dai salti di sequenza; comprende anche i campioni scartati per backpressure. Il RTT è misurato, non promesso: meno di 10 ms dipende dall'access point, radio, isolamento client e carico dei dispositivi. I picchi reali rimangono timestampati anche quando il RTT aumenta.

## Verifiche

```sh
node --test tools/test/network-lan.test.mjs
node --test tools/lan/test/setup.test.mjs
npm ci --prefix tools/e2e
node tools/e2e/node_modules/playwright-core/cli.js install chromium
node tools/e2e/lan-setup-browser.mjs
node tools/e2e/lan-browser.mjs
```

I comandi dei test vanno eseguiti dalla radice del repository; per `lan-browser` devono essere già installate anche le dipendenze `tools/lan`. Il browser verifica gate QR, due canali, stream binario, clock, ripresa e revoca senza richieste HTTP esterne. Per diagnosticare una rete di evento: controlla prima raggiungibilità HTTPS dal telefono, poi connessione WebRTC, RTT e contatore `loss`; l'isolamento guest può consentire HTTPS ma impedire UDP diretto. Nessun relay remoto viene attivato automaticamente.
