// Collegamento alla stanza online (WebSocket del server Higgsfield): stato autorevole della partita
// (punteggio, colpi, punti) e messaggi in tempo reale non salvati (posizione dell'avversario, latenza).
const PING = '__ping', PONG = '__pong';

function playerId() {
  const key = 'sta:playerId';
  let id = null;
  try { id = localStorage.getItem(key); } catch { /* archivio non disponibile */ }
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem(key, id); } catch { /* ignorato */ }
  }
  return id;
}

export function newRoomCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export class Net {
  constructor(room) {
    this.room = room;
    this.id = playerId();
    this.socket = null;
    this.retry = 0;
    this.closed = false;
    this.handlers = { state: [], rt: [], status: [] };
    this.posT = 0;
    this.pingT = 0;
    this.latency = 0.08;
    this.queue = [];
  }

  on(ev, fn) { this.handlers[ev].push(fn); }
  emit(ev, x) { for (const f of this.handlers[ev]) f(x); }

  connect() {
    if (this.closed) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws/${encodeURIComponent(this.room)}`);
    this.socket = ws;
    ws.addEventListener('open', () => {
      this.retry = 0;
      this.emit('status', 'connected');
      this.send({ type: 'join', playerId: this.id });
      for (const m of this.queue.splice(0)) this.send(m);
    });
    ws.addEventListener('message', (e) => {
      if (e.data === PONG) return;
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'state') {
        this.last = m;
        this.seat = m.seats.indexOf(this.id);
        this.emit('state', m);
      } else if (m.type === 'rt') {
        const d = m.data || {};
        if (d.k === 'ping') this.rt({ k: 'pong', t: d.t });
        else if (d.k === 'pong') this.latency = Math.min(0.4, Math.max(0.01, (performance.now() - d.t) / 2000));
        else this.emit('rt', d);
      } else if (m.type === 'error') {
        this.emit('status', `errore: ${m.error}`);
      }
    });
    ws.addEventListener('close', () => {
      if (this.closed) return;
      this.retry = Math.min(this.retry + 1, 6);
      const wait = 500 * 2 ** (this.retry - 1);
      this.emit('status', 'reconnecting');
      setTimeout(() => this.connect(), wait);
    });
    if (!this.keep) this.keep = setInterval(() => { if (this.socket?.readyState === 1) this.socket.send(PING); }, 25000);
  }

  send(m) {
    if (this.socket?.readyState === 1) this.socket.send(JSON.stringify(m));
    else if (m.type !== 'rt') this.queue.push(m);
  }
  action(a) { this.send({ type: 'action', action: a }); }
  rt(d) { this.send({ type: 'rt', data: d }); }
  reset() { this.send({ type: 'reset' }); }

  // Ogni fotogramma: posizione del mio giocatore ~12 volte al secondo, misura della latenza ogni 2 s.
  tick(dt, me) {
    this.posT += dt;
    this.pingT += dt;
    if (this.posT > 0.083) {
      this.posT = 0;
      this.rt({ k: 'pos', x: +me.pos.x.toFixed(3), z: +me.pos.z.toFixed(3) });
    }
    if (this.pingT > 2) {
      this.pingT = 0;
      this.rt({ k: 'ping', t: performance.now() });
    }
  }

  close() {
    this.closed = true;
    clearInterval(this.keep);
    try { this.socket?.close(); } catch { /* già chiuso */ }
  }
}
