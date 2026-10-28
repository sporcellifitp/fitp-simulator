// Server locale per provare l'online senza Higgsfield: file statici di public/ e stanze /ws/<nome>
// con lo stesso protocollo della stanza Higgsfield (join, action, reset, rt) e le regole di server/logic.js.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { WebSocketServer } from 'ws';
import * as logic from '../server/logic.js';

const root = new URL('../public/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try {
    const data = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
});
const rooms = new Map();
const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const name = req.url.replace(/^\/ws\/?/, '') || 'main';
  if (!rooms.has(name)) rooms.set(name, { status: 'waiting', seats: [], state: null, result: null, conns: new Map() });
  const room = rooms.get(name);
  const broadcast = () => {
    for (const [sock, pid] of room.conns) {
      sock.send(JSON.stringify({ type: 'state', status: room.status, seats: room.seats, you: pid, connected: room.conns.size, view: room.state ? logic.viewFor(room.state, pid) : null, result: room.result, meta: logic.meta }));
    }
  };
  ws.on('message', (buf) => {
    const raw = buf.toString();
    if (raw === '__ping') { ws.send('__pong'); return; }
    const m = JSON.parse(raw);
    if (m.type === 'rt') {
      for (const s of room.conns.keys()) if (s !== ws) s.send(JSON.stringify({ type: 'rt', data: m.data }));
      return;
    }
    if (m.type === 'join') {
      room.conns.set(ws, m.playerId);
      if (!room.seats.includes(m.playerId) && room.seats.length < logic.meta.maxPlayers) room.seats.push(m.playerId);
      if (room.status === 'waiting' && room.seats.length >= logic.meta.minPlayers) { room.state = logic.setup(room.seats); room.status = 'playing'; }
      return broadcast();
    }
    const pid = room.conns.get(ws);
    if (m.type === 'action') {
      if (room.status !== 'playing') return ws.send(JSON.stringify({ type: 'error', error: 'game is not in progress' }));
      const v = logic.validateAction(room.state, pid, m.action);
      if (!v.ok) return ws.send(JSON.stringify({ type: 'error', error: v.error }));
      room.state = logic.applyAction(room.state, pid, m.action);
      const end = logic.isGameOver(room.state);
      if (end.over) { room.status = 'over'; room.result = end; }
      return broadcast();
    }
    if (m.type === 'reset') { room.state = logic.setup(room.seats); room.status = 'playing'; room.result = null; broadcast(); }
  });
  ws.on('close', () => { room.conns.delete(ws); broadcast(); });
});
server.listen(+(process.env.PORT || 8790), () => console.log('mock server on', server.address().port));
