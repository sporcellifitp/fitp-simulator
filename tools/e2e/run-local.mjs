// Deterministic local signaling and static hosting; no public PeerJS dependency.
import express from 'express';
import http from 'node:http';
import { ExpressPeerServer } from 'peer';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const app = express(), signalApp = express(), signal = http.createServer(signalApp);
const peerServer = ExpressPeerServer(signal, { path: '/' });
if (process.env.SIGNAL_DEBUG) peerServer.on('message', (_, msg) => console.log('Signal:', msg.type));
signalApp.use('/fiw', peerServer);
app.use(express.static(fileURLToPath(new URL('../../site/', import.meta.url))));
const web = http.createServer(app);
await Promise.all([new Promise(r => web.listen(8765, '127.0.0.1', r)), new Promise(r => signal.listen(9000, '127.0.0.1', r))]);
try {
  for (const test of process.argv.slice(2)){
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [fileURLToPath(new URL(test, import.meta.url))], { stdio: 'inherit', env: { ...process.env, PEER: '127.0.0.1:9000' } });
      child.on('exit', resolve); child.on('error', reject);
    });
    if (code !== 0){ process.exitCode = code || 1; break; }
  }
} finally { web.close(); signal.close(); }
// PeerServer owns housekeeping intervals; this CLI has finished all children.
process.exit(process.exitCode || 0);
