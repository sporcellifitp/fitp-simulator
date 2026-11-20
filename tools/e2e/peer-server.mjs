// server di segnalazione PeerJS locale, solo per le prove (il gioco vero usa 0.peerjs.com)
//   node peer-server.mjs [porta]        (oppure PEER_PORT=porta; predefinita 9000)
// Le prove lo possono avviare come processo figlio e chiuderlo alla fine (natpf-registro-sensori.mjs): il server di
// `peer` fa partire due cicli di pulizia (setTimeout che si riprogrammano: connessioni rotte ogni 300 ms, messaggi
// scaduti ogni 1000 ms) che non si fermano chiudendo il server HTTP e non hanno un comando per fermarli. Nel processo
// della prova lo terrebbero acceso dopo il sommario; in un processo a parte basta chiuderlo.
import express from 'express'; import http from 'node:http'; import { ExpressPeerServer } from 'peer';
const PORT = +(process.argv[2] || process.env.PEER_PORT || 9000);
const app = express(), server = http.createServer(app);
app.use('/fiw', ExpressPeerServer(server, { path: '/' }));
server.listen(PORT, '127.0.0.1', () => console.log(`peer server on ${PORT}`));
