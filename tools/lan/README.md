# NATPF: smartphone e desktop sulla rete locale

La modalità `?lan=1` usa segnalazione WebSocket **sul desktop** e due DataChannel WebRTC cifrati diretti: comandi affidabili e sensori binari senza ritrasmissioni. `iceServers: []`: nessun servizio STUN/TURN, PeerJS pubblico o server cloud. WebSocket scambia soltanto offerte SDP/candidati ICE; sensori e colpi non passano dal server. Le modalità di invito Internet preesistenti rimangono disponibili quando `lan=1` non è presente.

## Avvio per telefono reale

1. Installa Node.js 20 o successivo sul desktop. Nella cartella `tools/lan`, esegui `npm ci` (oppure `npm install` al primo utilizzo).
2. Collega telefono e desktop alla stessa Wi-Fi. Disattiva l'isolamento client/guest dell'access point e autorizza la porta TCP 8443 nel firewall del desktop. La connessione WebRTC richiede anche traffico UDP tra i due dispositivi: il solo inoltro della porta HTTPS non basta.
3. Prepara un certificato HTTPS per **l'indirizzo IP LAN o nome locale esatto** del desktop, firmato da una CA riconosciuta anche dal telefono. È possibile usare una CA locale di sviluppo (per esempio mkcert), installando la sua radice attendibile sui dispositivi autorizzati. Su iOS occorre anche abilitare la fiducia completa nella CA installata. Un certificato autofirmato ignorato tramite avviso del browser non garantisce l'accesso ai sensori.
4. Avvia, dalla cartella `tools/lan`:

   ```sh
   node server.mjs --cert=/percorso/desktop-cert.pem --key=/percorso/desktop-key.pem --port=8443
   ```

5. Apri sul desktop l'indirizzo HTTPS **LAN** stampato dal server, per esempio `https://192.168.1.20:8443/tennis/?lan=1`, e inquadra il QR con il telefono. Aprire la pagina desktop da `localhost` produce un QR che il telefono non può raggiungere. Il parametro `lan=1` viene incluso nel QR.
6. Consenti i sensori dal pulsante del controller e completa la calibrazione. Il campo rimane sul desktop; lo smartphone è la racchetta.

Il server serve anche la dipendenza Three.js locale; non serve Internet per giocare dopo aver installato le dipendenze e predisposto i certificati. Per una prova di trasporto sul solo desktop è disponibile `npm start` in HTTP su porta 8080: **HTTP su IP LAN non abilita i sensori sul telefono**. La pubblicazione statica Cloudflare da sola non può eseguire questo server di segnalazione LAN.

## Stream e gestione delle perdite

Pacchetto fisso da **52 byte**, massimo **40 Hz**: versione/flag, sequenza uint32, timestamp float64, giroscopio, accelerometro e accelerazione con gravità float32. I dati sensore non sono JSON; la coda motion viene scartata in caso di backpressure, senza accumulare gesti vecchi. I messaggi sporadici di calibrazione, abbinamento, colpo e sincronizzazione mantengono un piccolo formato JSON sul canale affidabile.

Il desktop converte gli assi DeviceMotion alpha(Z), beta(X), gamma(Y) in XYZ, poi media gli ultimi quattro vettori reali, integra una rotazione normalizzata, usa SLERP per assorbire il jitter ed estrapola al massimo 60 ms. Dopo 150 ms senza campioni congela l'orientamento e riduce la confidenza a zero; il rendering sfuma verso la posa pronta. Nessun campione predetto produce un colpo. Il tempo di impatto conserva il picco reale misurato sul telefono e l'allineamento degli orologi. L'ingresso in stato `ready` dopo la calibrazione azzera l'orientamento relativo.

`createPhoneLink().motion(nowMs)` restituisce `{rotation:[qx,qy,qz,qw], angularVelocity:[deg/s,deg/s,deg/s], confidence, age, stale, loss, received, lost, rtt, transport}`. `loss` deriva dai salti di sequenza; comprende anche i campioni scartati per backpressure. Il RTT è misurato, non promesso: meno di 10 ms dipende dall'access point, radio, isolamento client e carico dei dispositivi. I picchi reali rimangono timestampati anche quando il RTT aumenta.

## Verifiche

```sh
node --test tools/test/network-lan.test.mjs
npm ci --prefix tools/e2e
node tools/e2e/node_modules/playwright-core/cli.js install chromium
node tools/e2e/lan-browser.mjs
```

I comandi dei test vanno eseguiti dalla radice del repository; per `lan-browser` devono essere già installate anche le dipendenze `tools/lan`. Il browser verifica gate QR, due canali, stream binario, clock, ripresa e revoca senza richieste HTTP esterne. Per diagnosticare una rete di evento: controlla prima raggiungibilità HTTPS dal telefono, poi connessione WebRTC, RTT e contatore `loss`; l'isolamento guest può consentire HTTPS ma impedire UDP diretto. Nessun relay remoto viene attivato automaticamente.
