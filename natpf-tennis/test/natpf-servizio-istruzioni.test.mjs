// B18 (miglioramento 2 dell'audit B16): istruzioni del primo servizio sul grande schermo. Prima lo schermo diceva solo
// «Al servizio»; dopo un lancio senza battuta la palla ricadeva senza un messaggio, ferma a mezz'aria, e il gioco
// aspettava un nuovo lancio che nessuno spiegava. Ora: «Alza il telefono: lanci la palla», «Colpisci!» vicino al punto
// più alto, «Colpisci quando la palla è in alto» dopo un lancio a vuoto (anche sul telefono), e si rilancia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serveCoachView, serveCoachStep, NatpfServeCoach, SERVE_COACH } from '../src/natpf/natpf_serve_coach.js';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { eventFlash } from '../../site/js/tennis/phone-screen.js';

const G = (o = {}) => ({ phase: 'SERVE_STANCE', mine: true, controller: 'phone', now: 0, idle: 0, ...o });

test('testi: lancio, «Colpisci!» vicino al punto più alto, lancio a vuoto; niente per la CPU o fuori dal servizio', () => {
  assert.deepEqual(serveCoachView({ served: 0 }, G()), { state: 'toss', big: 'Alza il telefono: lanci la palla', sub: 'Poi colpisci quando la palla è in alto' });
  assert.equal(serveCoachView({ served: 0 }, G({ controller: 'webcam' })).big, 'Alza la mano: lanci la palla');
  assert.equal(serveCoachView({ served: 0 }, G({ controller: 'mouse' })).big, 'Premi ↑ o W: lanci la palla');
  // lancio: in salita aspetta, vicino al punto più alto «Colpisci!», molto dopo niente
  assert.equal(serveCoachView({ served: 0 }, G({ phase: 'SERVE_TOSS', tossT: .55 })).state, 'wait');
  assert.deepEqual(serveCoachView({ served: 0 }, G({ phase: 'SERVE_TOSS', tossT: .2 })), { state: 'go', big: 'Colpisci!', sub: '' });
  assert.equal(serveCoachView({ served: 0 }, G({ phase: 'SERVE_TOSS', tossT: -.3 })).state, 'go');
  assert.equal(serveCoachView({ served: 0 }, G({ phase: 'SERVE_TOSS', tossT: -.5 })), null);
  // lancio a vuoto
  const miss = serveCoachView({ served: 3, missAt: 10 }, G({ now: 11 }));
  assert.equal(miss.state, 'miss'); assert.equal(miss.big, 'Colpisci quando la palla è in alto'); assert.match(miss.sub, /Alza il telefono/);
  assert.equal(serveCoachView({ served: 3, missAt: 10 }, G({ now: 10 + SERVE_COACH.missS + .1 })).state, 'toss', 'poi di nuovo l’istruzione del lancio');
  assert.equal(serveCoachView({ served: 3, missAt: 10 }, G({ phase: 'SERVE_TOSS', tossT: .1 })).big, 'Colpisci!', 'dopo un lancio a vuoto anche «Colpisci!»');
  // chi ha già servito: niente, salvo se resta fermo
  assert.equal(serveCoachView({ served: SERVE_COACH.firstServes }, G()), null);
  assert.equal(serveCoachView({ served: SERVE_COACH.firstServes }, G({ phase: 'SERVE_TOSS', tossT: .1 })), null);
  assert.equal(serveCoachView({ served: SERVE_COACH.firstServes }, G({ idle: SERVE_COACH.idleS })).state, 'toss', 'fermo al servizio: torna l’istruzione');
  // non è il suo servizio (CPU, avversario sull'altro computer), scambio, menu
  assert.equal(serveCoachView({ served: 0 }, G({ mine: false })), null);
  assert.equal(serveCoachView({ served: 0 }, G({ phase: 'RALLY' })), null);
});

test('stato: servizi riusciti, lancio a vuoto, tempo fermo; partita nuova da capo', () => {
  let s = { served: 0, missAt: null, idle: 0, phase: null };
  s = serveCoachStep(s, G({ fresh: true }), .1);
  s = serveCoachStep(s, G({ fresh: true }), .5); assert.equal(s.idle, .5);
  s = serveCoachStep(s, G({ phase: 'SERVE_TOSS', fresh: true }), .1); assert.equal(s.idle, 0);
  s = serveCoachStep(s, G({ fresh: true, now: 3 }), .1); assert.equal(s.missed, true); assert.equal(s.missAt, 3);
  s = serveCoachStep(s, G({ phase: 'SERVE_TOSS', fresh: true }), .1); assert.equal(s.missed, false);
  s = serveCoachStep(s, G({ phase: 'RALLY', fresh: true }), .1); assert.equal(s.served, 1); assert.equal(s.missAt, null);
  s = serveCoachStep(s, G({ phase: 'POINT_OVER' }), .1);
  s = serveCoachStep(s, G({ fresh: false }), .1); assert.equal(s.served, 1, 'stessa partita: si continua a contare');
  s = serveCoachStep(s, G({ phase: 'MATCH_OVER' }), .1);
  s = serveCoachStep(s, G({ fresh: true }), .1); assert.equal(s.served, 0, 'partita nuova: istruzioni piene');
  // il servizio della CPU che ricade non conta
  s = serveCoachStep({ ...s, phase: 'SERVE_TOSS' }, G({ mine: false }), .1); assert.equal(s.missed, false);
  // in pausa il tempo fermo non cresce
  s = serveCoachStep({ ...s, phase: 'SERVE_STANCE', idle: 2 }, G({ paused: true }), 1); assert.equal(s.idle, 0);
});

// motore vero senza grafica: lancio senza battuta → la palla ricade nella mano, il coach lo dice (e il telefono), si
// rilancia e il servizio parte
test('motore: dopo un lancio a vuoto la palla torna in mano, messaggio sullo schermo e sul telefono, si rilancia e si serve', async () => {
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(5);
  try {
    const e = createHeadlessEngine({ difficulty: 'casual' });
    e.startNewMatch({ showStartBanner: false });
    e.score.server = 'player'; e._setupPointServe({ showBanner: false });
    // telefono finto pronto (messaggi al telefono) e coach senza pagina
    const sent = [], ph = Object.create(NatpfPhoneRacket.prototype);
    Object.defineProperty(ph, 'ready', { value: true }); ph.link = { send: m => sent.push(m) };
    e.natpfPhone = ph;
    const coach = new NatpfServeCoach(e, { controller: 'phone' }), views = [];
    coach.paint = v => views.push(v);
    const run = (s, until = () => false) => { for (let t = 0; t < s; t += 1/120){ e.step(1/120); coach.tick(1/120); if (until()) return true; } return false; };
    run(.3);
    assert.equal(views.at(-1)?.big, 'Alza il telefono: lanci la palla');
    // partita in pausa: niente istruzioni sopra i pannelli
    e.natpfPaused = true; coach.tick(1/120); assert.equal(views.at(-1), null); e.natpfPaused = false; coach.tick(1/120);
    assert.equal(views.at(-1)?.state, 'toss');
    e._handleUserTossInput({});
    assert.equal(e.phase, 'SERVE_TOSS');
    assert.ok(run(1.4, () => views.at(-1)?.state === 'go'), '«Colpisci!» vicino al punto più alto');
    const apexY = e.ball.pos.y;
    assert.ok(apexY > 2.4, `palla alta: ${apexY}`);
    assert.ok(run(3, () => e.phase === 'SERVE_STANCE'), 'la palla ricade e si torna al servizio');
    // palla nella mano di chi serve, ferma (prima a mezz'aria a 0,95 m)
    assert.ok(Math.abs(e.ball.pos.y - 1.12) < 1e-6 && e.ball.vel.length() === 0, JSON.stringify(e.ball.pos));
    assert.ok(Math.abs(e.ball.pos.x - (e.player.pos.x - .28)) < 1e-6);
    coach.tick(1/120);
    assert.equal(views.at(-1).state, 'miss'); assert.equal(views.at(-1).big, 'Colpisci quando la palla è in alto');
    assert.deepEqual(sent.at(-1), { t: 'ev', k: 'miss', why: 'lancio', vib: [25, 60, 25] });
    assert.equal(eventFlash(sent.at(-1)).big, 'Lancio a vuoto');
    // si rilancia e si batte vicino al punto più alto: il servizio parte
    e._handleUserTossInput({});
    assert.equal(e.phase, 'SERVE_TOSS');
    run(1.4, () => e.ball.vel.y <= .5);
    e._handleUserSwingInput({ source: 'audit', speed: 1.2, dirX: 0 });
    assert.ok(run(1.5, () => e.phase === 'RALLY'), `servizio partito: ${e.phase}`);
    assert.equal(coach.state.served, 1);
    assert.equal(views.at(-1), null, 'durante lo scambio niente istruzioni');
  } finally { Math.random = real; }
});
