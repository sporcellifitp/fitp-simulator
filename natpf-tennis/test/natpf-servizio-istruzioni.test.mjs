// B18 (miglioramento 2 dell'audit B16): istruzioni del primo servizio sul grande schermo. Prima lo schermo diceva solo
// «Al servizio»; dopo un lancio senza battuta la palla ricadeva senza un messaggio, ferma a mezz'aria, e il gioco
// aspettava un nuovo lancio che nessuno spiegava. Ora: l'icona del lancio (B44: al posto di «Alza il telefono: lanci la
// palla»), «Colpisci!» vicino al punto più alto, «Colpisci quando la palla è in alto» dopo un lancio a vuoto (anche sul
// telefono), e si rilancia. B44: l'icona ai primi 2 servizi di ogni giocatore nuovo, non a ogni partita.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serveCoachView, serveCoachStep, NatpfServeCoach, SERVE_COACH, servedBy } from '../src/natpf/natpf_serve_coach.js';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { eventFlash } from '../../site/js/tennis/phone-screen.js';

const G = (o = {}) => ({ phase: 'SERVE_STANCE', mine: true, controller: 'phone', now: 0, idle: 0, ...o });

test('B44: al lancio l\'icona e nessuna scritta (telefono, webcam e tastiera); «Colpisci!» vicino al punto più alto, lancio a vuoto; niente per la CPU o fuori dal servizio', () => {
  // (prima «Alza il telefono: lanci la palla / Poi colpisci quando la palla è in alto», «Alza la mano…», «Premi ↑ o W…»)
  for (const controller of ['phone', 'webcam', 'mouse']) assert.deepEqual(serveCoachView({ served: 0 }, G({ controller })), { state: 'toss', icon: true, big: '', sub: '' }, controller);
  // lancio: in salita aspetta, vicino al punto più alto «Colpisci!», molto dopo niente
  assert.equal(serveCoachView({ served: 0 }, G({ phase: 'SERVE_TOSS', tossT: .55 })).state, 'wait');
  assert.deepEqual(serveCoachView({ served: 0 }, G({ phase: 'SERVE_TOSS', tossT: .2 })), { state: 'go', big: 'Colpisci!', sub: '' });
  assert.equal(serveCoachView({ served: 0 }, G({ phase: 'SERVE_TOSS', tossT: -.3 })).state, 'go');
  assert.equal(serveCoachView({ served: 0 }, G({ phase: 'SERVE_TOSS', tossT: -.5 })), null);
  // lancio a vuoto
  const miss = serveCoachView({ served: 3, missAt: 10 }, G({ now: 11 }));
  assert.equal(miss.state, 'miss'); assert.equal(miss.big, 'Colpisci quando la palla è in alto'); assert.equal(miss.sub, 'Lancio a vuoto: riprova');
  assert.equal(miss.icon, true, 'con l’icona del lancio');
  assert.deepEqual(serveCoachView({ served: 3, missAt: 10 }, G({ now: 10 + SERVE_COACH.missS + .1 })), { state: 'toss', icon: true, big: '', sub: '' }, 'poi di nuovo l’icona del lancio');
  assert.equal(serveCoachView({ served: 3, missAt: 10 }, G({ phase: 'SERVE_TOSS', tossT: .1 })).big, 'Colpisci!', 'dopo un lancio a vuoto anche «Colpisci!»');
  // chi ha già servito: niente, salvo se resta fermo
  assert.equal(serveCoachView({ served: SERVE_COACH.firstServes }, G()), null);
  assert.equal(serveCoachView({ served: SERVE_COACH.firstServes }, G({ phase: 'SERVE_TOSS', tossT: .1 })), null);
  assert.equal(serveCoachView({ served: SERVE_COACH.firstServes }, G({ idle: SERVE_COACH.idleS - .1 })), null);
  assert.equal(serveCoachView({ served: SERVE_COACH.firstServes }, G({ idle: SERVE_COACH.idleS })).icon, true, 'fermo al servizio per qualche secondo: torna l’icona');
  assert.equal(SERVE_COACH.firstServes, 2); assert.equal(SERVE_COACH.idleS, 6);
  // non è il suo servizio (CPU, avversario sull'altro computer), scambio, menu
  assert.equal(serveCoachView({ served: 0 }, G({ mine: false })), null);
  assert.equal(serveCoachView({ served: 0 }, G({ phase: 'RALLY' })), null);
});

test('stato: servizi riusciti, lancio a vuoto dal segnale del motore, tempo fermo; partita nuova da capo', () => {
  let s = { served: 0, missAt: null, idle: 0, phase: null };
  const M = (o = {}) => G({ match: 1, tossMisses: 0, ...o });
  s = serveCoachStep(s, M(), .1);
  s = serveCoachStep(s, M(), .5); assert.equal(s.idle, .5);
  s = serveCoachStep(s, M({ phase: 'SERVE_TOSS' }), .1); assert.equal(s.idle, 0);
  s = serveCoachStep(s, M({ now: 3, tossMisses: 1 }), .1); assert.equal(s.missed, true); assert.equal(s.missAt, 3);
  s = serveCoachStep(s, M({ phase: 'SERVE_TOSS', tossMisses: 1 }), .1); assert.equal(s.missed, false);
  s = serveCoachStep(s, M({ phase: 'RALLY', tossMisses: 1 }), .1); assert.equal(servedBy(s), 1); assert.equal(s.missAt, null);
  s = serveCoachStep(s, M({ phase: 'POINT_OVER', tossMisses: 1 }), .1);
  s = serveCoachStep(s, M({ tossMisses: 1 }), .1); assert.equal(servedBy(s), 1, 'stessa partita: si continua a contare');
  s = serveCoachStep(s, M({ phase: 'MATCH_OVER', tossMisses: 1 }), .1);
  // B44: la partita nuova dello stesso giocatore non rimette l'icona dei primi servizi (prima sì: a ogni partita)
  s = serveCoachStep(s, M({ match: 2, tossMisses: 1 }), .1); assert.equal(servedBy(s), 1, 'partita nuova, stesso giocatore: si continua a contare');
  // il servizio della CPU che ricade non conta
  s = serveCoachStep({ ...s, phase: 'SERVE_TOSS' }, M({ mine: false, match: 2, tossMisses: 2 }), .1); assert.equal(s.missed, false);
  // in pausa il tempo fermo non cresce
  s = serveCoachStep({ ...s, phase: 'SERVE_STANCE', idle: 2 }, M({ paused: true, match: 2 }), 1); assert.equal(s.idle, 0);
});

// Revisione B18: prima ogni SERVE_TOSS → SERVE_STANCE era un lancio a vuoto (anche una partita ricominciata con la palla
// in aria: «Colpisci quando la palla è in alto» sullo schermo e «Lancio a vuoto» al telefono), e il punteggio a zero
// rimetteva le istruzioni piene anche alla seconda palla dopo un fallo a 0-0
test('revisione B18: partita ricominciata con la palla in aria non è un lancio a vuoto; seconda palla a 0-0 non riparte da capo', () => {
  let s = serveCoachStep({ phase: null }, G({ match: 1, tossMisses: 0, fresh: true }), .1);
  s = serveCoachStep(s, G({ phase: 'SERVE_TOSS', match: 1, tossMisses: 0, fresh: true }), .1);
  s = serveCoachStep(s, G({ phase: 'RALLY', match: 1, tossMisses: 0, fresh: true }), .1); assert.equal(servedBy(s), 1);
  // primo servizio fallo a 0-0: si torna al servizio con il punteggio ancora a zero
  s = serveCoachStep(s, G({ phase: 'POINT_OVER', match: 1, tossMisses: 0, fresh: true }), .1);
  s = serveCoachStep(s, G({ match: 1, tossMisses: 0, fresh: true }), .1); assert.equal(servedBy(s), 1, 'prima tornava a 0');
  // lancio, poi «Nuova partita» dal menu della pausa con la palla in aria: contatore delle partite cambiato, nessun segnale
  s = serveCoachStep(s, G({ phase: 'SERVE_TOSS', match: 1, tossMisses: 0, fresh: true, ballY: 2.6, ballVy: 1 }), .1);
  s = serveCoachStep(s, G({ match: 2, tossMisses: 0, fresh: true }), .1);
  assert.equal(s.missed, false, 'prima «lancio a vuoto»'); assert.equal(s.missAt, null); assert.equal(servedBy(s), 1, 'partita nuova: B44, il conto è del giocatore');
  // il segnale del motore senza cambio di fase (palla rimessa in mano): conta solo con il passaggio di fase
  s = serveCoachStep(s, G({ phase: 'SERVE_TOSS', match: 2, tossMisses: 0 }), .1);
  s = serveCoachStep(s, G({ match: 2, tossMisses: 1, now: 5 }), .1); assert.equal(s.missed, true); assert.equal(s.missAt, 5);
});
test('revisione B18: Player 2 sull’altro computer (niente segnali del motore): lancio a vuoto dalla palla che ricadeva', () => {
  let s = serveCoachStep({ phase: null }, G({ fresh: true }), .1);
  s = serveCoachStep(s, G({ phase: 'SERVE_TOSS', ballY: 2.4, ballVy: 2 }), .1);
  s = serveCoachStep(s, G({ phase: 'SERVE_TOSS', ballY: 1.2, ballVy: -6 }), .1);
  s = serveCoachStep(s, G({ now: 4 }), .1); assert.equal(s.missed, true);
  // palla ancora alta quando il punto cambia (partita ricominciata): niente
  s = serveCoachStep(s, G({ phase: 'SERVE_TOSS', ballY: 2.8, ballVy: -1 }), .1);
  s = serveCoachStep(s, G({ now: 9 }), .1); assert.equal(s.missed, false);
  // senza contatore, la partita nuova si riconosce dal punteggio a zero arrivando da fuori dal punto (B44: toglie il lancio
  // a vuoto, il conto dei servizi resta del giocatore)
  s = serveCoachStep({ ...s, served: 2, phase: 'MATCH_OVER', missAt: 3 }, G({ fresh: true }), .1); assert.equal(servedBy(s), 2); assert.equal(s.missAt, null);
});
test('revisione B18: gravità del lancio come il motore; stesso schermo con la webcam per due: «Alza la mano»', () => {
  assert.equal(SERVE_COACH.gravity, 9.15);
  const E = { phase: 'SERVE_STANCE', score: { server: 'opponent', playerPoints: 0, opponentPoints: 0 }, natpfSplit: { active: true }, ball: { pos: { y: 1.1 }, vel: { y: 0 } }, elapsedTime: 0 };
  const c = new NatpfServeCoach(E, { controller: 'phone', split: { webcam: true } });
  assert.equal(c.snapshot().controller, 'webcam');
  assert.equal(serveCoachView({ served: 0 }, c.snapshot()).icon, true, 'B44: anche con la webcam per due l’icona, senza scritte');
  c.ui.split.webcam = false; assert.equal(c.snapshot().controller, 'phone');
  assert.equal(c.snapshot().side, 'right');
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
    assert.equal(views.at(-1)?.icon, true, 'B44: l’icona del lancio'); assert.equal(views.at(-1)?.big, '');
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
    assert.equal(servedBy(coach.state), 1);
    assert.equal(views.at(-1), null, 'durante lo scambio niente istruzioni');
  } finally { Math.random = real; }
});

test('stesso schermo: ogni giocatore ha il suo conto dei servizi con le istruzioni (revisione dell\'insieme B18.1)', () => {
  const G2 = o => ({ phase: 'SERVE_STANCE', mine: true, split: true, controller: 'phone', match: 1, tossMisses: 0, ...o });
  let s = serveCoachStep({ phase: null }, G2({ server: 'player' }), .1);
  // il P1 batte i due servizi del primo game (formato classico)
  for (let i = 0; i < SERVE_COACH.firstServes; i++){
    s = serveCoachStep(s, G2({ phase: 'SERVE_TOSS', server: 'player' }), .1);
    s = serveCoachStep(s, G2({ phase: 'RALLY', server: 'player' }), .1);
    s = serveCoachStep(s, G2({ phase: 'SERVE_STANCE', server: 'player' }), .1);
  }
  assert.equal(servedBy(s, 'player'), SERVE_COACH.firstServes);
  assert.equal(serveCoachView(s, G2({ server: 'player' })), null, 'il P1 ha già visto le istruzioni piene');
  // secondo game: batte il P2 per la prima volta e vede l'icona del lancio (prima no: il conto era uno solo)
  assert.equal(servedBy(s, 'opponent'), 0);
  assert.equal(serveCoachView(s, G2({ server: 'opponent' }))?.state, 'toss');
  s = serveCoachStep(s, G2({ phase: 'SERVE_TOSS', server: 'opponent' }), .1);
  s = serveCoachStep(s, G2({ phase: 'RALLY', server: 'opponent' }), .1);
  assert.equal(servedBy(s, 'opponent'), 1); assert.equal(servedBy(s, 'player'), SERVE_COACH.firstServes);
  // il numero semplice di prima vale ancora (un solo giocatore locale)
  assert.equal(servedBy({ served: 3 }, 'opponent'), 3);
});

/* ---------- B44 · l'icona del lancio al posto del riquadro ---------- */
import { NatpfServeHint, serveHintHtml, hintSide } from '../src/natpf/natpf_serve_hint.js';

test('B44: icona ai primi 2 servizi di ogni giocatore nuovo («Nuovo giocatore», chiosco), poi solo se chi batte resta fermo; mai per la CPU', () => {
  const M = (o = {}) => G({ match: 1, tossMisses: 0, server: 'player', ...o });
  let s = serveCoachStep({ phase: null }, M(), .1);
  const serve = () => { s = serveCoachStep(s, M({ phase: 'SERVE_TOSS' }), .1); s = serveCoachStep(s, M({ phase: 'RALLY' }), .1); s = serveCoachStep(s, M({ phase: 'POINT_OVER' }), .1); s = serveCoachStep(s, M(), .1); };
  assert.equal(serveCoachView(s, M()).icon, true, '1° servizio');
  serve(); assert.equal(serveCoachView(s, M()).icon, true, '2° servizio');
  serve(); assert.equal(serveCoachView(s, M()), null, 'dal 3° niente');
  // partita nuova («Gioca ancora»): stesso giocatore, niente icona
  s = serveCoachStep(s, M({ match: 2 }), .1); assert.equal(serveCoachView(s, M({ match: 2 })), null);
  // fermo al servizio per 6 s: torna
  assert.equal(serveCoachView(s, M({ match: 2, idle: 6 })).icon, true);
  // «Nuovo giocatore» (o il chiosco): di nuovo ai primi servizi
  const c = new NatpfServeCoach({ score: {}, ball: {} }, {});
  c.state = s; c.newPlayer();
  assert.equal(servedBy(c.state, 'player'), 0); assert.equal(servedBy(c.state, 'opponent'), 0);
  assert.equal(serveCoachView(c.state, M({ match: 2 })).icon, true);
  // la CPU che batte: mai (non è «mine»), anche ai primi servizi e ferma da molto
  assert.equal(serveCoachView({ served: 0 }, G({ mine: false, idle: 60 })), null);
});

test('B44: chi batte nella fotografia del gioco: la CPU mai, il Player 2 sull\'altro computer sul suo, lo stesso schermo tutti e due', () => {
  const E = (o = {}) => ({ phase: 'SERVE_STANCE', score: { server: 'opponent' }, ball: { pos: { y: 1.1 }, vel: { y: 0 } }, elapsedTime: 0, autoPlayMode: false, ...o });
  const ui = { controller: 'phone', training: { active: false }, events: { active: null }, trial: { active: false }, lobby: { visible: false } };
  assert.equal(new NatpfServeCoach(E(), ui).snapshot().mine, false, 'contro la CPU batte la CPU: niente');
  assert.equal(new NatpfServeCoach(E({ score: { server: 'player' } }), ui).snapshot().mine, true);
  assert.equal(new NatpfServeCoach(E({ playerRole: 'p2' }), ui).snapshot().mine, true, 'Player 2 della sfida tra due computer: sul suo computer');
  assert.equal(new NatpfServeCoach(E({ natpfSplit: { active: true } }), ui).snapshot().mine, true);
  assert.equal(new NatpfServeCoach(E({ autoPlayMode: true, score: { server: 'player' } }), ui).snapshot().mine, false, 'dimostrazione del menu');
});

test('B44: allenamento, esercizio «Servizio»: l\'icona a ogni servizio, senza scritte, e quei servizi non contano per la partita', () => {
  const E = { phase: 'SERVE_STANCE', score: { server: 'player' }, ball: { pos: { y: 1.1 }, vel: { y: 0 } }, elapsedTime: 0, autoPlayMode: false };
  const ui = { controller: 'phone', training: { active: true, cal: false, lesson: null, drill: { id: 'serve' } }, events: { active: null }, trial: { active: false }, lobby: { visible: false } };
  const c = new NatpfServeCoach(E, ui), g = c.snapshot();
  assert.equal(g.drill, true); assert.equal(g.mine, true);
  assert.deepEqual(serveCoachView({ served: { player: 9, opponent: 0 } }, g), { state: 'toss', icon: true, big: '', sub: '' }, 'anche dopo tanti servizi');
  assert.equal(serveCoachView({ served: 0 }, { ...g, phase: 'SERVE_TOSS', tossT: .1 }), null, 'durante il lancio niente scritte (la scheda ha il suo testo)');
  let s = serveCoachStep({ phase: 'SERVE_TOSS' }, { ...g, phase: 'RALLY' }, .1);
  assert.equal(servedBy(s, 'player'), 0, 'il servizio dell’esercizio non consuma i due della partita');
  // altri esercizi, lezione, calibrazione: niente
  for (const t of [{ drill: { id: 'forehand' } }, { lesson: {}, drill: { id: 'serve' } }, { cal: true, drill: { id: 'serve' } }]){
    const u = { ...ui, training: { active: true, cal: false, lesson: null, ...t } };
    assert.equal(new NatpfServeCoach(E, u).snapshot().mine, false, JSON.stringify(t));
  }
});

// pagina finta per l'icona: le caselle «Al servizio» (quella del motore e le due dello stesso schermo)
function hintPage(){
  const mk = id => { const kids = []; const cls = new Set(['nt-server-tag']); return { id, style: { left: '' }, kids,
    classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c), toggle: (c, f) => { const on = f === undefined ? !cls.has(c) : !!f; on ? cls.add(c) : cls.delete(c); return on; } },
    querySelector(){ return kids[0] || null; }, insertAdjacentHTML(_, html){ kids.push(html); } }; };
  const els = { 'server-tag': mk('server-tag'), 'server-tag-p1': mk('server-tag-p1'), 'server-tag-p2': mk('server-tag-p2') };
  const body = { kids: [], appendChild(n){ this.kids.push(n); } };
  const doc = { getElementById: id => els[id] || null, body, createElement: () => { const n = mk('fb'); n.innerHTML = ''; return n; } };
  return { doc, els, body };
}
test('B44: l\'icona sta nella casella «Al servizio» di chi batte (nello stesso schermo nella sua metà), di lato verso il centro; in prima persona in basso', () => {
  assert.match(serveHintHtml(), /<svg class="sh-svg"/); assert.doesNotMatch(serveHintHtml().replace(/<[^>]+>/g, ''), /\S/, 'senza scritte');
  assert.equal(hintSide(1200, 960), 'left'); assert.equal(hintSide(700, 960), 'right'); assert.equal(hintSide(NaN, 960), 'right');
  const { doc, els, body } = hintPage(), H = new NatpfServeHint(doc);
  els['server-tag'].style.left = '1100px';
  assert.equal(H.paint(true, { split: false, server: 'player', w: 1920 }), 'server-tag');
  assert.ok(els['server-tag'].classList.contains('with-hint') && els['server-tag'].kids.length === 1, 'icona dentro la casella');
  assert.ok(els['server-tag'].classList.contains('hint-left'), 'a destra del centro: icona a sinistra della casella');
  assert.ok(!els['server-tag-p1'].classList.contains('with-hint') && !els['server-tag-p2'].classList.contains('with-hint'));
  H.paint(true, { split: false, server: 'player', w: 1920 }); assert.equal(els['server-tag'].kids.length, 1, 'una volta sola');
  // stesso schermo: batte il Player 2 → solo nella metà destra
  assert.equal(H.paint(true, { split: true, server: 'opponent', w: 1920 }), 'server-tag-p2');
  assert.ok(els['server-tag-p2'].classList.contains('with-hint') && !els['server-tag-p1'].classList.contains('with-hint') && !els['server-tag'].classList.contains('with-hint'));
  assert.equal(H.paint(true, { split: true, server: 'player', w: 1920 }), 'server-tag-p1');
  // spenta: nessuna casella con l'icona
  assert.equal(H.paint(false, { split: true, server: 'player', w: 1920 }), null);
  assert.ok(!Object.values(els).some(t => t.classList.contains('with-hint')));
  // prima persona: la casella di chi gioca è nascosta → l'icona in basso al centro (elemento a parte)
  els['server-tag'].classList.add('hidden');
  assert.equal(H.paint(true, { split: false, server: 'player', w: 1920 }), 'solo');
  assert.equal(body.kids.length, 1); assert.equal(H.fallback.classList.contains('hidden'), false);
  H.paint(false, {}); assert.equal(H.fallback.classList.contains('hidden'), true);
});
