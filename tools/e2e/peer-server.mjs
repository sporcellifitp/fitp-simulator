// server di segnalazione PeerJS locale, solo per le prove (il gioco vero usa 0.peerjs.com)
import express from 'express'; import http from 'node:http'; import { ExpressPeerServer } from 'peer';
const app = express(), server = http.createServer(app);
app.use('/fiw', ExpressPeerServer(server, { path: '/' }));
server.listen(9000, '127.0.0.1', () => console.log('peer server on 9000'));
