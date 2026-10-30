// Sfida tra due computer: tempi dei colpi del Player 2 (analisi del 30/10, «prima misurare, poi proteggere»).
// Prima il viaggio computer del P2 → host non era misurato e l'host giocava ogni colpo del P2 letto dal relay, per
// quanto vecchio: un lancio arrivato 2–3 s dopo faceva partire il servizio del P2. Ora:
//   • il relay mette la sua ora (now) nella lettura dello stato; il computer del P2 ci allinea il suo orologio (min-RTT);
//   • il P2 manda con colpo e lancio sentAtHost (ora del relay stimata all'invio), il relay la conserva;
//   • l'host non gioca un colpo o un lancio più vecchio di P2_STALE_MS dal gesto e lo registra nella diagnostica.
// node --import ./test/register.mjs --test test/natpf-versus-tempi.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatchRelay, natpfSwingExtras } from '../scripts/match-relay.mjs';
import { createLocalRelay, compactMatchState } from '../src/natpf/natpf_p2p.js';
import { p2SwingHitAt, p2SwingAgeMs, p2SwingStale, P2_STALE_MS } from '../src/natpf/natpf_versus.js';
import { NatpfVersusUi } from '../src/natpf/natpf_versus_ui.js';
import { MotionController } from '../src/motion_controls.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';

const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 2000){ const t0 = Date.now(); while (!fn()){ if (Date.now() - t0 > ms) throw new Error('tempo scaduto'); await tick(2); } }
const json = r => JSON.parse(r.text);

async function room(){
  const L = createLocalRelay({ relay: createMatchRelay({ publicUrl: '' }) });
  const { roomId } = json(await L.handle({ method: 'POST', url: '/api/match/create', body: {} }));
  const swing = body => L.handle({ method: 'POST', url: `/api/racket/swing?room=${roomId}&role=p2`, body: { room: roomId, role: 'p2', ...body } }).then(json);
  return { ...L, roomId, swing };
}

test('relay: la lettura dello stato porta l’ora del relay (now) e il colpo conserva sentAtHost solo se è un numero', async () => {
  const R = await room();
  const before = Date.now(), st = json(await R.handle({ url: `/api/match/state?room=${R.roomId}&role=p2&touch=p2` }));
  assert.equal(typeof st.now, 'number'); assert.ok(st.now >= before && st.now <= Date.now());
  const ok = await R.swing({ type: 'swing', sentAtHost: 1234567, natpf: { aim: 'swing', latency: .05 } });
  assert.equal(ok.swing.sentAtHost, 1234567); assert.equal(ok.swing.natpf.latency, .05);
  const toss = await R.swing({ type: 'toss', sentAtHost: 99 });
  assert.equal(toss.swing.type, 'toss'); assert.equal(toss.swing.sentAtHost, 99);
  for (const bad of ['123', null, true, { x: 1 }]){
    const r = await R.swing({ type: 'swing', sentAtHost: bad });
    assert.ok(!('sentAtHost' in r.swing), `sentAtHost ${JSON.stringify(bad)} scartato`);
  }
  assert.deepEqual(natpfSwingExtras({ sentAtHost: Infinity }), {}); assert.deepEqual(natpfSwingExtras({ sentAtHost: NaN }), {});
  assert.deepEqual(natpfSwingExtras({ sentAtHost: 5 }), { sentAtHost: 5 });
  // al P2 nella sfida senza server va la risposta compatta: now resta
  const text = (await R.handle({ url: `/api/match/state?room=${R.roomId}&role=p2` })).text;
  const c = JSON.parse(compactMatchState(text));
  assert.equal(c.now, JSON.parse(text).now); assert.equal(c.rackets, undefined);
});

test('età del colpo del P2: dal picco sul telefono (sentAtHost − latenza), null senza l’ora dell’host', () => {
  assert.equal(P2_STALE_MS, 600);
  assert.equal(p2SwingHitAt({ sentAtHost: 10000, natpf: { latency: .08 } }), 9920);
  assert.equal(p2SwingHitAt({ sentAtHost: 10000 }), 10000, 'mouse o tastiera: dall’invio');
  assert.equal(p2SwingHitAt({ sentAtHost: 10000, natpf: { latency: '0.1' } }), 10000, 'latenza non numerica: ignorata');
  assert.equal(p2SwingHitAt({ serverTimeMs: 10000 }), null);
  assert.equal(p2SwingAgeMs({ sentAtHost: 10000, natpf: { latency: .05 } }, 10450), 500);
  assert.equal(p2SwingAgeMs({}, 10450), null); assert.equal(p2SwingAgeMs({ sentAtHost: 1 }, NaN), null);
  assert.equal(p2SwingStale(null), false); assert.equal(p2SwingStale(600), false); assert.equal(p2SwingStale(601), true);
  assert.equal(p2SwingStale(-50), false, 'orologio un po’ avanti: non è vecchio');
});

/* ---------- computer del P2: orologio dell'host dalle letture dello stato ---------- */
function guestController(){
  const mc = Object.create(MotionController.prototype);
  Object.assign(mc, { role: 'p2', roomId: 'at-abcd', phonePollIntervalMs: 2, phoneState: { connected: false, orientation: { pitch: 0, roll: 0 } }, p2PhoneState: { connected: false }, lastProcessedP2PhoneSeq: 0, _listeners: { swing: [], toss: [] } });
  mc._notifyStatus = () => {}; mc._updatePhoneBadgeUI = () => {};
  return mc;
}

test('P2: orologio dell’host stimato dalle letture con ritardo (vale il viaggio più breve); colpo e lancio portano sentAtHost', async () => {
  const realFetch = globalThis.fetch, realNow = Date.now;
  // orologio virtuale del P2; il relay è 5000 ms avanti. Ritardi andata/ritorno per lettura: il più breve è simmetrico
  let vt = 1e6, reads = 0;
  const OFF = 5000, delays = [[120, 40], [60, 200], [15, 15], [80, 30]];
  const sent = [];
  Date.now = () => vt;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('/api/racket/swing')){ sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); }
    const [go, back] = delays[Math.min(reads, delays.length - 1)];
    vt += go; const now = vt + OFF; vt += back; reads++;
    return new Response(JSON.stringify({ ok: true, now }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const mc = guestController();
  try {
    // prima della prima lettura: nessuna stima, il colpo parte senza sentAtHost (l'host lo gioca come prima)
    assert.equal(mc.hostClockEstimate, null);
    mc._emitSwing({ source: 'mouse', side: 'forehand', speed: 1.2, role: 'p2' });
    assert.ok(!('sentAtHost' in sent[0]));
    mc.startPhonePolling();
    await until(() => reads >= delays.length);
    mc.stopPhonePolling(); mc._disposed = true;
    await tick(10);
    const est = mc.hostClockEstimate;
    assert.deepEqual(est, { offset: OFF, rtt: 30 }, `stima ${JSON.stringify(est)}`);
    // colpo del telefono (con la latenza) e lancio: ora del relay all'invio
    vt += 1000;
    mc._emitSwing({ source: 'natpf-phone', side: 'forehand', speed: 1.1, role: 'p2', natpf: { aim: 'swing', latency: .07 } });
    mc._emitToss({ source: 'natpf-phone', shotType: 'lob', speed: 1.1, role: 'p2' });
    assert.equal(sent[1].sentAtHost, vt + OFF); assert.equal(sent[1].natpf.latency, .07);
    assert.equal(sent[2].type, 'toss'); assert.equal(sent[2].sentAtHost, vt + OFF);
    // l'host stima l'età: arrivo dopo 40 ms sull'orologio del relay → 40 ms + 70 ms di latenza dal picco
    assert.equal(p2SwingAgeMs(sent[1], vt + OFF + 40), 110);
  } finally { globalThis.fetch = realFetch; Date.now = realNow; mc._disposed = true; mc.stopPhonePolling(); }
});

/* ---------- host: colpi del P2 letti dal relay ---------- */
// controller dell'host che legge il relay locale (come nella sfida senza server o in LAN)
function hostController(handle, roomId){
  const mc = Object.create(MotionController.prototype);
  Object.assign(mc, { role: 'p1', roomId, phonePollIntervalMs: 2, phoneState: { connected: false, orientation: {} }, p2PhoneState: { connected: false }, lastProcessedPhoneSeq: 0, phonePollInitialized: true, lastProcessedP2PhoneSeq: 0, p2PhonePollInitialized: true, _listeners: { swing: [], toss: [] } });
  mc._notifyStatus = () => {}; mc._updatePhoneBadgeUI = () => {};
  const fetchFn = async (url, init = {}) => { const r = await handle({ method: init.method || 'GET', url: String(url), body: init.body ?? null }); return new Response(r.text, { status: r.status, headers: { 'Content-Type': 'application/json' } }); };
  return { mc, fetchFn };
}
async function pollOnce(mc, fetchFn, until_){
  const realFetch = globalThis.fetch; globalThis.fetch = fetchFn;
  try { mc.startPhonePolling(); await until(until_); } finally { mc.stopPhonePolling(); mc._disposed = true; globalThis.fetch = realFetch; }
}

test('host: colpo del P2 vecchio (2 s) non giocato e registrato; fresco e senza ora giocati come prima', async () => {
  const R = await room(), now = Date.now();
  await R.swing({ type: 'swing', shotType: 'topspin', sentAtHost: now - 2000, natpf: { aim: 'swing', latency: .05, seq: 7 } });        // canale fermo e poi ripartito
  await R.swing({ type: 'swing', shotType: 'slice', sentAtHost: now - 40, natpf: { aim: 'swing', latency: .06, seq: 8 } });            // fresco
  await R.swing({ type: 'swing', shotType: 'lob', sentAtHost: now - 450, natpf: { aim: 'swing', latency: .25, seq: 9 } });             // 700 ms dal picco
  await R.swing({ type: 'swing', shotType: 'flat' });                                                                                   // P2 di prima: senza ora
  const { mc, fetchFn } = hostController(R.handle, R.roomId);
  const played = [], stale = [], info = [];
  mc.onP2Swing = s => played.push(s); mc.onP2Stale = i => stale.push(i); mc.onP2Played = i => info.push(i);
  await pollOnce(mc, fetchFn, () => mc.lastProcessedP2PhoneSeq >= 4);
  assert.deepEqual(played.map(s => s.shotType), ['slice', 'flat'], 'giocati solo il fresco e quello senza ora');
  assert.equal(mc.lastProcessedP2PhoneSeq, 4, 'i colpi vecchi contano comunque come letti');
  assert.deepEqual(stale.map(s => [s.tipo, s.n, s.max]), [['swing', 7, 600], ['swing', 9, 600]]);
  assert.ok(stale[0].eta >= 2050 && stale[0].eta < 2500, `età ${stale[0].eta}`);
  assert.ok(stale[1].eta >= 700 && stale[1].eta < 1100, `età ${stale[1].eta}`);
  assert.equal(info.length, 2); assert.ok(info[0].eta >= 100 && info[0].eta < 500, `età del fresco ${info[0].eta}`); assert.equal(info[0].n, 8);
  assert.equal(info[1].eta, null, 'senza ora: età sconosciuta');
});

test('host: lancio vecchio in SERVE_STANCE non fa partire il servizio del P2; il lancio fresco sì', async () => {
  const E = createHeadlessEngine({ difficulty: 'casual' });
  E.startNewMatch({ showStartBanner: false });
  Object.assign(E, { isMultiplayer: true, autoPlayMode: false, versus: { active: true } });
  E.score.server = 'opponent'; E.phase = 'SERVE_STANCE'; E.phaseTimer = 1;
  assert.ok(E._versusInMatch());
  const R = await room();
  await R.swing({ type: 'toss', shotType: 'lob', sentAtHost: Date.now() - 2500 });
  const a = hostController(R.handle, R.roomId), stale = [];
  a.mc.onP2Toss = e => E._handleP2TossInput(e); a.mc.onP2Swing = e => E._handleP2SwingInput(e); a.mc.onP2Stale = i => stale.push(i);
  await pollOnce(a.mc, a.fetchFn, () => a.mc.lastProcessedP2PhoneSeq >= 1);
  assert.equal(E.phase, 'SERVE_STANCE', 'il lancio di 2,5 s fa non fa servire il P2');
  assert.equal(stale[0]?.tipo, 'toss');
  await R.swing({ type: 'toss', shotType: 'lob', sentAtHost: Date.now() - 30 });
  const b = hostController(R.handle, R.roomId);
  b.mc.lastProcessedP2PhoneSeq = 1;
  b.mc.onP2Toss = e => E._handleP2TossInput(e); b.mc.onP2Swing = e => E._handleP2SwingInput(e);
  await pollOnce(b.mc, b.fetchFn, () => b.mc.lastProcessedP2PhoneSeq >= 2);
  assert.equal(E.phase, 'SERVE_TOSS', 'lancio fresco: il P2 serve');
});

test('P2 che è lui a leggere i propri colpi dal relay: nessuna scadenza (l’età vale solo sull’host)', async () => {
  const R = await room();
  await R.swing({ type: 'swing', shotType: 'slice', sentAtHost: Date.now() - 5000 });
  const { mc, fetchFn } = hostController(R.handle, R.roomId);
  mc.role = 'p2';
  const played = [], stale = [];
  mc.onP2Swing = s => played.push(s); mc.onP2Stale = i => stale.push(i);
  await pollOnce(mc, fetchFn, () => mc.lastProcessedP2PhoneSeq >= 1);
  assert.equal(played.length, 1); assert.equal(stale.length, 0);
});

/* ---------- diagnostica ---------- */
test('diagnostica: colpo vecchio e colpo giocato sull’host (età, fase, tempo del motore), orologio sul P2 ogni ~5 s', () => {
  const logs = [], recorder = { active: true, log: (k, d) => logs.push({ k, ...d }) };
  const mc = {}, engine = { phase: 'SERVE_STANCE', elapsedTime: 12.5, motionController: mc, natpfLastRacket: null };
  const v = Object.create(NatpfVersusUi.prototype);
  Object.assign(v, { engine, ui: { diag: { recorder } } });
  v._hookTiming();
  mc.onP2Stale({ eta: 2100, tipo: 'toss', n: null, max: 600 });
  assert.deepEqual(logs[0], { k: 'sfida.colpo_vecchio', eta: 2100, tipo: 'toss', fase: 'SERVE_STANCE', n: null, max: 600 });
  // colpo giocato subito dal motore (stesso istante, stesso numero): con il tempo del colpo; in attesa: senza
  engine.phase = 'RALLY'; engine.natpfLastRacket = { who: 'p2', at: 12.5, seq: 8, timing: -.0423 };
  mc.onP2Played({ eta: 140, tipo: 'swing', n: 8 });
  assert.deepEqual(logs[1], { k: 'sfida.colpo', eta: 140, tipo: 'swing', fase: 'RALLY', n: 8, tempoMs: -42.3 });
  engine.natpfLastRacket = { who: 'p2', at: 11, seq: 7, timing: .01 };
  mc.onP2Played({ eta: null, tipo: 'swing', n: 9 });
  assert.equal(logs[2].tempoMs, null); assert.equal(logs[2].eta, null);
  // P2: orologio ogni 5 s, da quando c'è una stima
  mc.hostClockEstimate = null; v._logClock(0); assert.equal(logs.length, 3);
  mc.hostClockEstimate = { offset: -3200, rtt: 48 };
  v._logClock(100); v._logClock(2000); v._logClock(5100); v._logClock(7000);
  assert.deepEqual(logs.slice(3), [{ k: 'sfida.orologio', rtt: 48, offset: -3200 }, { k: 'sfida.orologio', rtt: 48, offset: -3200 }]);
  // registratore spento: niente
  recorder.active = false; recorder.log = () => assert.fail('registratore spento');
  mc.onP2Played({ eta: 1, tipo: 'swing' }); v._logClock(20000);
});
