import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(process.env.NATPF_PHONE_SOURCE || new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('async function connect(){'), source.indexOf('// messaggi che valgono solo se arrivano subito'));
function setup(){
  const timers = new Map(), peers = []; let seq = 0;
  class Emitter { constructor(){ this.handlers = {}; } on(k, f){ (this.handlers[k] ||= []).push(f); } emit(k, v){ for (const f of this.handlers[k] || []) f(v); } }
  class Conn extends Emitter { constructor(){ super(); this.open = true; this.sent = []; } send(d){ this.sent.push(d); } close(){ this.open = false; this.emit('close'); } }
  class Peer extends Emitter {
    constructor(){ super(); this.destroyed = false; this.connections = []; peers.push(this); }
    connect(){ const c = new Conn(); this.connections.push(c); return c; }
    destroy(){ this.destroyed = true; for (const c of this.connections) c.close(); this.emit('error', { type: 'network' }); this.emit('disconnected'); }
    reconnect(){ this.emit('open'); }
  }
  const store = new Map([['resume', 'key']]);
  const sandbox = { LanPeer: Peer, isLanMode: () => true, peerConfig: () => ({}), performance: { now: () => 100 },
    ss: { get: k => store.get(k), set: (k,v) => store.set(k,v), del: k => store.delete(k) },
    setTimeout: (f, ms) => { timers.set(++seq, { f, ms }); return seq; }, clearTimeout: id => timers.delete(id),
    paint(){}, bar(){}, ui(){}, show(){}, closeFast(){}, openFast(){}, sendState(){}, sendDevice(){} };
  vm.createContext(sandbox);
  vm.runInContext("let peer=null,conn=null,pendingConn=null,connectEpoch=0,retryT=null,tries=0,linkState='off',pair={session:'game',token:'token'},lastRx=0,fastOk=false,sensor='ready',rtt=80;\n" + section + "\nglobalThis.api={connect,lost,relink,get state(){return linkState},get conn(){return conn}};", sandbox);
  const connect = async () => { await sandbox.api.connect(); const p = peers.at(-1); p.emit('open'); const c = p.connections.at(-1); c.emit('open'); c.emit('data', { t:'welcome',r:'key',f:1 }); return { p,c }; };
  const run = async ms => { for (const [id,t] of [...timers]) if (t.ms === ms){ timers.delete(id); await t.f(); } };
  return { api:sandbox.api,peers,timers,connect,run };
}
test('riapertura: eventi del vecchio peer non spengono quello pronto', async () => {
  const h=setup(),old=await h.connect(),fresh=await h.connect();
  old.p.emit('error',{type:'network'});old.p.emit('disconnected');old.c.emit('close');
  await h.run(1000);await h.run(1500);await h.run(12000);
  assert.equal(h.api.state,'on');assert.equal(h.api.conn,fresh.c);assert.equal(fresh.p.destroyed,false);assert.equal(h.timers.size,0);
});
test('errori ravvicinati: una sola riconnessione, welcome annulla le scadenze', async () => {
  const h=setup(),{p}=await h.connect();p.emit('error',{type:'fatal'});p.emit('error',{type:'fatal'});h.api.lost();
  assert.equal(h.timers.size,1);await h.run(1000);
  const n=h.peers.at(-1);n.emit('open');const c=n.connections[0];c.emit('open');c.emit('data',{t:'welcome'});
  assert.equal(h.api.state,'on');assert.equal(h.timers.size,0);
});
test('riapertura segnalazione non crea una seconda connessione', async () => {
  const h=setup(),{p,c}=await h.connect();p.emit('disconnected');await h.run(1500);p.emit('open');
  assert.equal(p.connections.length,1);assert.equal(h.api.conn,c);assert.equal(h.api.state,'on');
});
test('welcome tardivo della pagina precedente non sostituisce il telefono attuale', async () => {
  const h=setup(),old=await h.connect(),fresh=await h.connect();old.c.emit('data',{t:'welcome',r:'stale'});
  assert.equal(h.api.conn,fresh.c);assert.equal(h.api.state,'on');
});

// «Ricollega» (dal telefono o chiesto dal computer): canali nuovi con la chiave di ripresa e rl (stessa pagina); il
// collegamento di prima si chiude senza far partire i tentativi della connessione persa
test('«Ricollega»: peer nuovo, hello con la chiave di ripresa e rl, una sola connessione viva', async () => {
  const h=setup(),old=await h.connect();
  await h.api.relink();
  const p=h.peers.at(-1);assert.notEqual(p,old.p);assert.equal(old.p.destroyed,true);
  p.emit('open');const c=p.connections.at(-1);c.emit('open');
  assert.equal(JSON.stringify(c.sent[0]),JSON.stringify({t:'hello',v:2,r:'key',rl:1}));
  c.emit('data',{t:'welcome',r:'key',f:1});
  assert.equal(h.api.state,'on');assert.equal(h.api.conn,c);assert.equal(h.timers.size,0);
  // il collegamento successivo (non chiesto) non porta più rl
  await h.api.connect();const p2=h.peers.at(-1);p2.emit('open');const c2=p2.connections.at(-1);c2.emit('open');
  assert.equal(c2.sent[0].rl,undefined);
});
