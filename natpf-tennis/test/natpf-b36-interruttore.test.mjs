// B36.1 «La cima comanda (interna)» (docs/b73/direzione-b36-1.md): l'interruttore «Direzione dei colpi: Classica · Nuova».
//   - con «Classica» (il valore di base) l'esito del colpo è IDENTICO a prima: impronta di 10 000 colpi a caso
//     (test/b36-casi.mjs) presa sulla base 09cdac6b (2026-11-19.1), prima della regola nuova;
//   - intenzioni ricostruite (webcam, mouse, tastiera, telefoni senza la forma) e schiacciata: sempre la regola di oggi,
//     anche con «Nuova»;
//   - l'opzione è dello stand (salvata, di base «Classica») e il motore la legge a inizio partita: cambiarla in partita vale
//     dalla partita dopo; il registro dello stand la scrive nella riga «partita» (dir) e segna i colpi con la regola nuova (nr).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { casiB36 } from './b36-casi.mjs';
import { strokeOutcome, lateSpanOf, directionSpan, slowFactor, eventIntent } from '../src/natpf/natpf_stroke_outcome.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { RegistroStand } from '../src/natpf/registro/registro_registratore.js';
import { codaMemoria } from '../src/natpf/registro/registro_coda.js';
import * as DIR from '../src/natpf/natpf_direction.js';

const storageFinto = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
// impronta dei 10 000 colpi sulla base 09cdac6b (2026-11-19.1), con la regola di sempre
const BASE_09cdac6b = 'c71d83aa71dc60200e730c9984089ffd1817a959e59547d06b7872fbe86a94df';

test('B36.1: con «Classica» l’esito di 10 000 colpi a caso è identico a prima (impronta della base 09cdac6b)', () => {
  const casi = casiB36();
  assert.equal(casi.length, 10000);
  const oggi = casi.map(c => strokeOutcome(c));
  assert.equal(sha(oggi), BASE_09cdac6b, 'senza dir: l’esito di sempre');
  assert.equal(sha(casi.map(c => strokeOutcome({ ...c, dir: 'classica' }))), BASE_09cdac6b, 'dir «classica»: identico');
  assert.equal(sha(casi.map(c => strokeOutcome({ ...c, dir: 'boh' }))), BASE_09cdac6b, 'un valore sconosciuto vale «classica»');
  assert.ok(oggi.every(o => !('rule' in o)), 'con la regola di oggi l’esito non ha il campo rule');
  // copertura dei casi: tutti i tipi di colpo, intenzioni ricostruite, fuori finestra, falliti, ritardo abituale
  const tipi = new Set(oggi.map(o => o.shot));
  for (const k of ['TOPSPIN', 'FLAT', 'SLICE', 'DROP', 'LOB', 'SMASH']) assert.ok(tipi.has(k), k);
  assert.ok(casi.filter(c => c.intent.derived).length > 1000 && oggi.filter(o => o.excess > 0).length > 2000 && oggi.filter(o => o.failed).length > 1000 && oggi.filter(o => o.lag > 0).length > 1000);
});

test('B36.1: con «Nuova» la regola cambia solo per i telefoni con la forma (non la schiacciata); webcam, mouse e telefoni vecchi restano come oggi', () => {
  const casi = casiB36(), nuove = casi.map(c => strokeOutcome({ ...c, dir: 'nuova' }));
  let nuovi = 0, cambiati = 0;
  for (const [i, c] of casi.entries()){
    const o = strokeOutcome(c), n = nuove[i];
    if (c.intent.derived || String(c.intent.shot).toUpperCase() === 'SMASH'){ assert.deepEqual(n, o, `caso ${i}: regola di oggi`); continue; }
    nuovi++;
    assert.equal(n.rule, 'nuova', `caso ${i}`); assert.ok(DIR.usedNewRule(n));
    // cambia solo la direzione (e quello che dipende dal lato: profondità in diagonale); voto, tempo, qualità, effetto no
    for (const k of ['grade', 'cursor', 't', 'excess', 'q', 'lag', 'topspin', 'failed', 'netFault', 'weak', 'pressured', 'shot', 'assist', 'controlled'])
      assert.deepEqual(n[k], o[k], `caso ${i}: ${k}`);
    assert.equal(n.x0, 0, `caso ${i}: punto neutro al centro`);
    if (n.x !== o.x) cambiati++;
  }
  assert.ok(nuovi > 7000 && cambiati > .9*nuovi, `colpi con la regola nuova ${nuovi}, con la palla da un’altra parte ${cambiati}`);
  // l'intenzione ricostruita dagli altri controlli (eventIntent) non passa mai alla regola nuova
  const it = eventIntent({ shotType: 'topspin', speed: 1.2, dirX: .8 });
  assert.equal(it.derived, true); assert.equal(DIR.newRuleFor('nuova', it), false);
  assert.equal(DIR.newRuleFor('nuova', { shot: 'topspin', face: 0 }), true);
  assert.equal(DIR.newRuleFor('nuova', { shot: 'smash', face: 0 }), false);
  assert.equal(DIR.newRuleFor('classica', { shot: 'topspin', face: 0 }), false);
});

test('B36.1: opzione dello stand — «Classica» di base, salvata, «Nuova» in lavorazione, il forzato dei banchi comanda', () => {
  const st = storageFinto();
  assert.equal(DIR.readDirModel({ storage: st }), 'classica', 'di base Classica');
  assert.equal(DIR.readDirModel({ storage: null }), 'classica');
  assert.equal(DIR.readDirModel({ storage: { getItem(){ throw new Error('bloccato'); } } }), 'classica', 'archivio che non risponde: Classica');
  assert.equal(DIR.writeDirModel('nuova', { storage: st }), 'nuova'); assert.equal(st.getItem(DIR.DIR_KEY), 'nuova');
  assert.equal(DIR.readDirModel({ storage: st }), 'nuova');
  assert.equal(DIR.writeDirModel('boh', { storage: st }), 'classica', 'un valore sconosciuto si salva come Classica');
  assert.equal(DIR.nextDirModel('classica'), 'nuova'); assert.equal(DIR.nextDirModel('nuova'), 'classica'); assert.equal(DIR.nextDirModel(null), 'nuova');
  st.setItem(DIR.DIR_KEY, 'nuova');
  assert.equal(DIR.dirModelFor({ storage: st }), 'nuova'); assert.equal(DIR.dirModelFor({ forced: 'classica', storage: st }), 'classica'); assert.equal(DIR.dirModelFor({ forced: 'x', storage: st }), 'nuova');
  assert.equal(DIR.DIR_KEY, 'natpf-tennis.direzione');
  assert.equal(DIR.dirButton('classica'), 'Classica'); assert.equal(DIR.dirButton('nuova'), 'Nuova · in lavorazione');
  assert.match(DIR.dirToast('nuova'), /Nuova \(in lavorazione, non da provare\).*Vale dalla prossima partita; resta salvata/);
  assert.match(DIR.dirToast('classica'), /Classica, come sempre\. Vale dalla prossima partita/);
  assert.deepEqual({ ...DIR.DIRECTION }, { timeWeight: .3, natural: 0, follow: 0 });
});

// colpo del telefono con la forma: piatto face (−1…+1), scarto della cima dev (gradi; null = centro non ancora imparato)
const colpoTel = (face, dev, extra = {}) => ({ source: 'natpf-phone', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: 0, timing: null,
  natpf: { aim: 'swing', shot: 'topspin', power: .5, latency: 0, hand: 'right', aimDev: dev, peak: 800, typical: 780, aimFull: 17,
    intent: { shot: 'topspin', power: .5, typePower: .5, depth: .5, rise: .3, face, conf: 1 } }, ...extra });
// un colpo di chi gioca qui (P1) con il tempo u (unità della finestra, + anticipo), come il banco della direzione
function colpo(e, ev, u = 0){
  const vz = 18, lv = skillLevel(e.matchConfig.difficulty), span = directionSpan(lv)*slowFactor(vz), late = lateSpanOf(vz, lv);
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 3; e.pendingUserSwing = null;
  e.player.pos.set(0, 0, 11.4); e.player.vel.set(0, 0, 0); e.player.targetPos.copy(e.player.pos); e.player.swingCooldown = 0;
  e.ball.pos.set(.6, 1, 10.9); e.ball.vel.set(0, 0, vz); e.ball.targetLanding.set(.6, 0, 9);
  assert.ok(e._attemptPlayerRallyStrike({ ...ev, natpfTau: u >= 0 ? u*span : u*late, natpfLateSpan: late }, false));
  return e.natpfLastRacket.out;
}

test('B36.1: il motore legge la direzione a inizio partita (cambiarla in partita vale dalla partita dopo); il forzato comanda', () => {
  const real = Math.random, ls = globalThis.localStorage; Math.random = () => .5;
  try {
    globalThis.localStorage = storageFinto();
    const e = createHeadlessEngine({ difficulty: 'pro' });
    e.startNewMatch({ showStartBanner: false });
    assert.equal(e.natpfDirModel, 'classica', 'di base Classica');
    assert.equal(colpo(e, colpoTel(.5, 10)).rule, undefined, 'colpo con la regola di oggi');
    DIR.writeDirModel('nuova');                                   // lo staff la cambia durante la partita
    assert.equal(e.natpfDirModel, 'classica', 'la partita in corso resta con la sua regola');
    assert.equal(colpo(e, colpoTel(.5, 10)).rule, undefined);
    e.startNewMatch({ showStartBanner: false });                  // partita dopo
    assert.equal(e.natpfDirModel, 'nuova');
    assert.equal(colpo(e, colpoTel(.5, 10)).rule, 'nuova', 'telefono con la forma: regola nuova');
    assert.equal(colpo(e, colpoTel(0, null)).rule, 'nuova', 'centro della mira non ancora imparato (aimDev nullo): piatto 0, sempre la regola nuova');
    assert.equal(colpo(e, { source: 'audit', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: .5 }).rule, undefined, 'mouse e tastiera: regola di oggi');
    assert.equal(colpo(e, { source: 'webcam', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: .5, natpf: { aim: 'swing', shot: 'topspin', source: 'webcam', latency: 0, hand: 'right', wrist: .5 } }).rule, undefined, 'webcam (intenzione ricostruita): regola di oggi');
    // il forzato a mano (test e banchi: natpfDirRule) comanda sulla scelta salvata
    e.natpfDirRule = 'classica'; e.startNewMatch({ showStartBanner: false });
    assert.equal(e.natpfDirModel, 'classica');
    // sul computer del P2 della sfida vale «Classica» finché l'host non la manda (snapshot)
    const p2 = createHeadlessEngine({ difficulty: '1v1' }); Object.assign(p2, { playerRole: 'p2', isMultiplayer: true });
    p2.startNewMatch({ showStartBanner: false });
    assert.equal(p2.natpfDirModel, 'classica', 'P2 della sfida: Classica fino allo snapshot dell’host, anche con «Nuova» salvata qui');
  } finally { Math.random = real; globalThis.localStorage = ls; }
});

test('B36.1: il registro dello stand scrive la direzione della partita (dir) e i colpi con la regola nuova (nr)', async () => {
  const real = Math.random; Math.random = () => .5;
  try {
    const righe = async dir => {
      const e = createHeadlessEngine({ difficulty: 'pro' }), coda = codaMemoria();
      if (dir) e.natpfDirRule = dir;
      const R = new RegistroStand({ engine: e, ui: {}, coda, storage: storageFinto(), now: () => e.elapsedTime*1000, wallNow: () => Date.UTC(2026, 10, 20, 10), win: null, raf: () => {}, timers: false });
      e.startNewMatch({ showStartBanner: false });
      for (const [face, u] of [[.5, 0], [0, .4], [-.4, -.3]]){ colpo(e, colpoTel(face, DIR.devOfFace(face)), u); for (let i = 0; i < 240 && e.ball.inPlay; i++) e.step(1/120); if (e.ball.inPlay) e._awardPoint('player', 'Nice Shot!'); }
      // un colpo del mouse nella stessa partita: regola di oggi anche con «Nuova»
      colpo(e, { source: 'audit', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: .3 }); for (let i = 0; i < 240 && e.ball.inPlay; i++) e.step(1/120); if (e.ball.inPlay) e._awardPoint('player', 'Nice Shot!');
      await R.blocco();
      const rows = []; for (const b of await coda.elenco()) for (const l of (await coda.leggi(b.id)).trim().split('\n')) rows.push(JSON.parse(l));
      return rows;
    };
    const C = await righe(null), N = await righe('nuova');
    assert.equal(C.find(r => r.k === 'partita').dir, 'classica');
    assert.ok(C.filter(r => r.k === 'colpo').every(c => c.nr === undefined));
    assert.equal(N.find(r => r.k === 'partita').dir, 'nuova');
    assert.deepEqual(N.filter(r => r.k === 'colpo').map(c => c.nr), [1, 1, 1, undefined], 'tre colpi del telefono con la regola nuova, il colpo del mouse no');
  } finally { Math.random = real; }
});
