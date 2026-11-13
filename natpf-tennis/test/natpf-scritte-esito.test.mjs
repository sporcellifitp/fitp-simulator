// B10, segnalazione del 06/11: «se gioco 2v2, i nomi dei colpi (es. "Perfetto!") ostruiscono la visuale del campo».
// La scritta dell'esito non si apre più sopra la testa di chi colpisce (nel doppio il compagno a rete la metteva in mezzo
// al campo) ma nell'angolo in basso del proprio lato (natpf_shot_feedback.popupPlace), più breve. Prova nel browser con
// le misure sul campo proiettato: tools/e2e/natpf-scritte-2v2.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NatpfShotFeedback, popupPlace, POPUP_MS, shotQuality, timingWhy, qualityText, eventQuality, splitPhoneQuality, relayPhoneFeedback, landingOf, landsIn, LINE_TOL } from '../src/natpf/natpf_shot_feedback.js';
import { NatpfPhoneRacket, phoneLabel, pointReason } from '../src/natpf/natpf_phone_racket.js';
import { eventFlash } from '../../site/js/tennis/phone-screen.js';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';

test('posto della scritta: il tuo lato a sinistra, stesso schermo P1 a sinistra e P2 a destra, l’altro giocatore a destra', () => {
  assert.deepEqual(popupPlace({ p2: false, role: 'p1' }), { side: 'left', kind: 'mine' });
  assert.deepEqual(popupPlace({ p2: false, role: 'p1', partner: true }), { side: 'left', kind: 'partner' }, 'il colpo del compagno è il tuo gesto');
  assert.deepEqual(popupPlace({ p2: true, role: 'p1' }), { side: 'right', kind: 'other' }, 'sfida un amico: il suo colpo, piccolo a destra');
  assert.deepEqual(popupPlace({ p2: true, role: 'p2' }), { side: 'left', kind: 'mine' }, 'il P2 sul suo computer: il suo colpo a sinistra');
  assert.deepEqual(popupPlace({ p2: false, role: 'p2' }), { side: 'right', kind: 'other' });
  assert.deepEqual(popupPlace({ p2: false, split: true }), { side: 'left', kind: 'mine' });
  assert.deepEqual(popupPlace({ p2: true, split: true }), { side: 'right', kind: 'mine' });
});

function fakeDom(){
  const els = {}, cls = () => { const s = new Set(); return { add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), toggle: (c, f) => ((f ?? !s.has(c)) ? s.add(c) : s.delete(c)), contains: c => s.has(c) }; };
  const el = id => (els[id] ||= { id, classList: cls(), style: {} });
  return { getElementById: el, querySelectorAll: () => [] };
}
test('scritta del colpo: niente posizione sopra la testa, «compagno» per il colpo del compagno, durata più breve', () => {
  const shown = [], had = globalThis.document;
  globalThis.document = fakeDom();
  try {
    const engine = { scene: { add(){} }, ball: { targetLanding: { x: 0, z: -8 } }, playerRole: 'p1', elapsedTime: 0, hud: { showTimingPopup: o => shown.push(o) } };
    new NatpfShotFeedback(engine);
    const pop = document.getElementById('timing-popup');
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '113 KM/H', screenPos: { x: 600, y: 300, visible: true }, partner: true });
    assert.equal(shown[0].screenPos, null, 'nessuna posizione sul campo');
    assert.equal(shown[0].grade, 'Perfetto'); assert.equal(shown[0].detail, 'compagno · 113 km/h');
    assert.equal(shown[0].durationMs, POPUP_MS.hit);
    assert.ok(pop.classList.contains('anchored') && !pop.classList.contains('side-right'));
    engine.hud.showTimingPopup({ grade: 'P2 PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H', screenPos: { x: 600, y: 120, visible: true } });
    assert.equal(shown[1].detail, 'avversario · 120 km/h');
    assert.ok(pop.classList.contains('side-right') && pop.classList.contains('other'));
    engine.hud.showTimingPopup({ grade: 'TOO LATE! • WHIFF', detail: 'BALL PASSED', durationMs: 750 });
    assert.equal(shown[2].durationMs, POPUP_MS.miss); assert.equal(shown[2].grade, 'Troppo tardi', 'B18: il colpo a vuoto in ritardo dice «Troppo tardi»');
    // in prima persona come in terza: nell'angolo (prima al centro dello sguardo, sopra il campo)
    engine._isFirstPersonActive = () => true;
    engine.hud.showTimingPopup({ grade: 'EARLY • FOREHAND CROSS!', detail: '98 KM/H' });
    assert.equal(shown[3].screenPos, null); assert.equal(shown[3].grade, 'Anticipo');
  } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});

// Revisione B10: il servizio del Player 2 non aveva «P2» nel grade e la scritta finiva nell'angolo del P1 (stesso schermo:
// a sinistra; sfida un amico sul computer del P1: grande, senza «avversario», e «Fuori» anche col servizio dentro).
// Servizio vero del motore (senza browser), scritta con la stessa funzione del gioco
test('servizio del P2: «P2» nel grade, stesso schermo a destra, sfida a destra con «avversario», computer del P2 a sinistra', async () => {
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const had = globalThis.document, real = Math.random;
  globalThis.document = fakeDom(); Math.random = mulberry32(7);
  try {
    const serve = ({ who = 'opponent', role = 'p1', split = false } = {}) => {
      const e = createHeadlessEngine({ difficulty: 'pro' }), shown = [];
      e.startNewMatch({ showStartBanner: false });
      e.isMultiplayer = true; e.versus = { active: true, closing: false, local: split }; e.playerRole = role;
      e.natpfSplit.active = split;
      e.scene = { add(){} };
      const hud = e.hud; e.hud = new Proxy({}, { get: (t, k) => k in t ? t[k] : k === 'showTimingPopup' ? (o => shown.push(o)) : hud[k] });
      new NatpfShotFeedback(e);
      const pop = document.getElementById('timing-popup');
      for (const c of ['side-right', 'other', 'anchored']) pop.classList.remove(c);
      e.score.server = who; e.score.deuceSide = true; e.phase = 'SERVE_STANCE';
      const a = who === 'opponent' ? e.opponent : e.player;
      e._startServeToss(a);
      for (let i = 0; i < 400 && e.ball.vel.y > 0; i++) e.step(1/120);
      e._executeServeHit(a, { natpf: { intent: { rise: 0, plane: 0, face: 0, power: .5 } }, natpfServeTau: 0, speed: 1.2 });
      const mine = shown.filter(o => /SERVE|Perfetto|Buono|Anticipo|Ritardo|Fuori/.test(o.grade));
      assert.equal(mine.length, 1, 'una scritta del servizio');
      return { o: mine[0], right: pop.classList.contains('side-right'), other: pop.classList.contains('other') };
    };
    const split = serve({ split: true });
    assert.ok(split.right && !split.other, 'stesso schermo: il servizio del P2 nella sua metà, a destra');
    assert.notEqual(split.o.grade, 'Fuori', 'il servizio del P2 che entra non è «Fuori»');
    const amico = serve();
    assert.ok(amico.right && amico.other, 'sfida un amico, computer del P1: a destra e piccolo');
    assert.match(amico.o.detail, /^avversario · \d+ km\/h$/);
    const p2pc = serve({ role: 'p2' });
    assert.ok(!p2pc.right && !p2pc.other, 'computer del P2: il suo servizio nel suo angolo a sinistra');
    assert.doesNotMatch(p2pc.o.detail, /avversario/);
    const p1 = serve({ who: 'player', split: true });
    assert.ok(!p1.right && !p1.other, 'stesso schermo: il servizio del P1 a sinistra');
  } finally { Math.random = real; if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});

// Revisione B10: nell'Allenamento la scheda dell'esercizio (.coach-main, in basso a sinistra, sopra il gioco) copriva del
// tutto la scritta; ora la scritta sta sopra la scheda quando sono dallo stesso lato (in orizzontale)
test('Allenamento: la scritta sta sopra la scheda dell’esercizio e sopra le barre, non sotto', () => {
  const had = globalThis.document;
  const box = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t });
  const dom = fakeDom(), meters = [{ getBoundingClientRect: () => box(26, 651, 230, 698) }];
  let cards = [{ getBoundingClientRect: () => box(24, 597, 484, 696) }];
  dom.querySelectorAll = q => /coach-main/.test(q) ? cards : /meter-group/.test(q) ? meters : [];
  globalThis.document = dom;
  try {
    const engine = { scene: { add(){} }, ball: { targetLanding: { x: 0, z: -8 } }, playerRole: 'p1', elapsedTime: 0, hud: { showTimingPopup(){} } };
    new NatpfShotFeedback(engine);
    const pop = document.getElementById('timing-popup');
    pop.parentElement = { getBoundingClientRect: () => box(0, 0, 1280, 720) };
    pop.getBoundingClientRect = fakePopupRect(pop, box);
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.equal(pop.style.bottom, `${(720 - 597 + 6).toFixed(1)}px`, 'sopra la scheda');
    assert.ok(!pop.classList.contains('side-right'));
    cards = [];
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.equal(pop.style.bottom, `${(720 - 651 + 6).toFixed(1)}px`, 'senza scheda: sopra le barre, come prima');
    // scheda dall'altro lato (non si sovrappone in orizzontale): non conta
    cards = [{ getBoundingClientRect: () => box(800, 500, 1200, 600) }];
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.equal(pop.style.bottom, `${(720 - 651 + 6).toFixed(1)}px`);
  } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});
// riquadro finto della scritta (39 px di altezza) che segue le classi e lo stile come nella pagina: a sinistra 26–142,
// a destra 1138–1254, oppure da style.left/right; in basso a 22 px o da style.bottom
function fakePopupRect(pop, box){
  return () => {
    const bottom = 720 - (pop.style.bottom ? parseFloat(pop.style.bottom) : 22);
    const l = pop.style.left ? parseFloat(pop.style.left) : pop.style.right ? 1280 - parseFloat(pop.style.right) - 116 : pop.classList.contains('side-right') ? 1138 : 26;
    return box(l, bottom - 39, l + 116, bottom);
  };
}

// Revisione B10, stesso schermo: la camera di ogni metà è più larga e il campo arriva quasi in basso. La scritta prova, nella
// sua metà, l'angolo in basso sotto le barre, poi sopra le barre, poi accanto alle barre; mai sopra l'etichetta della metà
test('stesso schermo: la scritta resta nella sua metà e salta i posti occupati dall’etichetta del giocatore', () => {
  const had = globalThis.document;
  const box = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t });
  const meters = [{ getBoundingClientRect: () => box(26, 600, 230, 648) }, { getBoundingClientRect: () => box(1050, 600, 1254, 648) }];
  let tags = [{ getBoundingClientRect: () => box(200, 665, 438, 697) }];
  const dom = fakeDom();
  dom.querySelectorAll = q => [...(/meter-group/.test(q) ? meters : []), ...(/split-tag/.test(q) ? tags : [])];
  globalThis.document = dom;
  try {
    const engine = { scene: { add(){} }, ball: { targetLanding: { x: 0, z: -8 } }, playerRole: 'p1', elapsedTime: 0, natpfSplit: { active: true }, hud: { showTimingPopup(){} } };
    new NatpfShotFeedback(engine);
    const pop = document.getElementById('timing-popup');
    pop.parentElement = { getBoundingClientRect: () => box(0, 0, 1280, 720) };
    pop.getBoundingClientRect = fakePopupRect(pop, box);
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.ok(!pop.classList.contains('side-right') && !pop.style.bottom && !pop.style.left, 'P1: in basso a sinistra, sotto le barre');
    engine.hud.showTimingPopup({ grade: 'P2 PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.ok(pop.classList.contains('side-right') && !pop.style.bottom, 'P2: in basso a destra, nella sua metà');
    // etichetta della metà larga fino all'angolo: sopra le barre
    tags = [{ getBoundingClientRect: () => box(20, 660, 438, 700) }];
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.equal(pop.style.bottom, `${(720 - 600 + 6).toFixed(1)}px`, 'sopra le barre');
    assert.ok(!pop.classList.contains('side-right'), 'mai nella metà dell’altro');
  } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});

// ---------------------------------------------------------------------------------------------------------------------
// B18 (difetto 10 dell'audit B16): le scritte spiegano l'errore che viene dal tempo, il telefono dice la stessa cosa del
// computer e «Punto avversario» arriva al telefono solo a punto finito
test('B18 scritte: «Fuori · troppo presto», «In rete · in ritardo»; «Troppo tardi» per il colpo a vuoto in ritardo', () => {
  assert.equal(timingWhy('VERY EARLY • FOREHAND CROSS'), 'troppo presto');
  assert.equal(timingWhy('VERY LATE • BACKHAND LINE'), 'troppo tardi');
  assert.equal(timingWhy('EARLY • FOREHAND CROSS'), 'in anticipo');
  assert.equal(timingWhy('LATE SERVE'), 'in ritardo');
  assert.equal(timingWhy('PERFECT • FOREHAND TOPSPIN'), null);
  assert.deepEqual(shotQuality('VERY EARLY • FOREHAND CROSS', { inCourt: false }), { color: 'red', label: 'Fuori', why: 'troppo presto', text: 'Fuori · troppo presto' });
  assert.equal(qualityText(shotQuality('VERY LATE • FOREHAND LINE', { net: true })), 'In rete · troppo tardi');
  assert.equal(qualityText(shotQuality('LATE • FOREHAND LINE', { inCourt: false })), 'Fuori · in ritardo');
  // senza errore di tempo: solo «Fuori» (il motivo della situazione, se c'è, va nella riga piccola: shotWhy)
  assert.deepEqual(shotQuality('PERFECT • FOREHAND TOPSPIN', { inCourt: false }), { color: 'red', label: 'Fuori' });
  assert.equal(qualityText(shotQuality('PERFECT • FOREHAND TOPSPIN', { inCourt: false })), 'Fuori');
  // in campo il voto resta quello di prima
  assert.deepEqual(shotQuality('VERY EARLY • DEFENSIVE'), { color: 'yellow', label: 'Anticipo' });
  // colpi a vuoto
  assert.equal(shotQuality('TOO LATE! • WHIFF').label, 'Troppo tardi');
  assert.equal(shotQuality('P2 TOO LATE! • WHIFF').label, 'Troppo tardi');
  assert.equal(shotQuality('VERY EARLY • WHIFF').label, 'Troppo presto');
  assert.equal(shotQuality('OUT OF REACH • WHIFF').label, 'Troppo lontana');
});

test('B18 scritta del computer: la riga grande dice il perché; il colpo a vuoto in ritardo dice «Troppo tardi»', () => {
  const shown = [], had = globalThis.document;
  globalThis.document = fakeDom();
  try {
    const engine = { scene: { add(){} }, ball: { targetLanding: { x: 6.5, z: -8 } }, playerRole: 'p1', elapsedTime: 0, hud: { showTimingPopup: o => shown.push(o) } };
    const fb = new NatpfShotFeedback(engine);
    engine.hud.showTimingPopup({ grade: 'VERY EARLY • FOREHAND CROSS!', detail: '98 KM/H' });
    assert.equal(shown[0].grade, 'Fuori · troppo presto');
    engine.ball.natpfNetFault = true; engine.ball.targetLanding = { x: 0, z: -8 };
    engine.hud.showTimingPopup({ grade: 'VERY LATE • FOREHAND LINE!', detail: '98 KM/H' });
    assert.equal(shown[1].grade, 'In rete · troppo tardi');
    // giro dell'aptica: lo stesso esito va al telefono
    assert.equal(fb.onLocalFeedback({ kind: 'whiff', grade: 'TOO LATE! • WHIFF' }).label, 'Troppo tardi', 'prima «Mancata»');
    assert.equal(fb.onLocalFeedback({ kind: 'whiff', grade: 'OUT OF REACH • WHIFF' }).label, 'Troppo lontana', 'prima «Mancata»');
    assert.equal(fb.onLocalFeedback({ kind: 'hit', grade: 'VERY LATE • FOREHAND LINE' }).text, 'In rete · troppo tardi');
  } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});

// telefono finto: le chiamate del motore all'aptica → messaggi al telefono (stessa funzione del gioco)
function phoneSink(role = 'p1'){
  const sent = [], ph = Object.create(NatpfPhoneRacket.prototype);
  Object.defineProperty(ph, 'ready', { value: true });
  Object.defineProperty(ph, 'role', { value: role });
  ph.link = { send: m => sent.push(m) };
  return { ph, sent };
}
test('B18 telefono: dice la stessa cosa del computer (fuori, in rete, il perché), motivo del punto in italiano', () => {
  const { ph, sent } = phoneSink();
  ph.feedback({ role: 'p1', kind: 'hit', grade: 'VERY EARLY • FOREHAND CROSS', shotType: 'TOPSPIN', quality: shotQuality('VERY EARLY • FOREHAND CROSS', { inCourt: false }) });
  assert.deepEqual({ ...sent[0], vib: null }, { t: 'ev', k: 'contact', label: 'anticipo', shot: 'drive', vib: null, out: true, net: false, why: 'troppo presto' });
  assert.equal(eventFlash(sent[0]).big, 'Fuori', 'prima il telefono diceva «In anticipo» mentre il computer diceva «Fuori»');
  assert.equal(eventFlash(sent[0]).sub, 'Troppo presto');
  ph.feedback({ role: 'p1', kind: 'hit', grade: 'LATE • FOREHAND LINE', shotType: 'TOPSPIN', quality: shotQuality('LATE • FOREHAND LINE', { net: true }) });
  assert.equal(sent[1].net, true); assert.equal(eventFlash(sent[1]).big, 'In rete'); assert.equal(eventFlash(sent[1]).sub, 'In ritardo');
  // in campo: il voto del computer
  ph.feedback({ role: 'p1', kind: 'hit', grade: 'PERFECT • FOREHAND TOPSPIN', shotType: 'TOPSPIN', quality: shotQuality('PERFECT • FOREHAND TOPSPIN') });
  assert.equal(eventFlash(sent[2]).big, 'Perfetto!'); assert.equal(sent[2].out, false); assert.equal(sent[2].why, undefined);
  // colpo a vuoto in ritardo
  ph.feedback({ role: 'p1', kind: 'whiff', grade: 'TOO LATE! • WHIFF' });
  assert.equal(eventFlash(sent[3]).big, 'Troppo tardi');
  // punto finito: motivo in italiano (prima «Out», «Net», «Nice Shot!»)
  ph.feedback({ role: 'p1', kind: 'fault', grade: 'Out' });
  assert.deepEqual(sent[4], { t: 'ev', k: 'point', mine: false, txt: 'Fuori' });
  assert.equal(eventFlash(sent[4]).big, 'Punto avversario');
  assert.equal(pointReason('Net'), 'In rete'); assert.equal(pointReason('Nice Shot!'), 'Vincente'); assert.equal(pointReason('Point'), 'Palla non presa');
  assert.equal(pointReason('VERY EARLY • DEFENSIVE'), '', 'niente testo inglese del motore');
  assert.equal(phoneLabel(null, 'EARLY • FOREHAND'), 'anticipo');
  assert.equal(phoneLabel({ label: 'Perfetto' }, 'EARLY • FOREHAND'), 'perfetto', 'il voto del computer prima del grade');
});

// motore vero senza grafica: un colpo molto fuori tempo giocato in difesa (la palla resta in gioco) non manda più «fault»
const DT = 1/120;
const phoneSwing = (intent, { side = 'forehand' } = {}) => ({ source: 'natpf-phone', side, shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, ...intent }, power: intent.power, peak: 900, latency: 0, hand: 'right' } });
async function rallyWithLead(lead, difficulty = 'casual'){
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(17);
  try {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    const events = [];
    e.motionController = { triggerHapticFeedback: ev => events.push({ ...ev, phase: e.phase, inPlay: e.ball.inPlay }) };
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
    e.player.pos.set(.4, 0, 11.7); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
    e.ball.pos.set(-.5, 1, -11);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(1.6, 0, 8.5), 1.05, { topspin: 14 });
    e._natpfPlanPlayer();
    let sent = false;
    for (let t = 0; t < 6; t += DT){
      const ttc = NI.timeToContact(e, e.player);
      if (!sent && ttc != null && ttc <= lead){ e._handleUserSwingInput(phoneSwing({ shot: 'topspin', power: .6 })); sent = true; }
      e.step(DT);
      if (e.phase !== 'RALLY') break;
    }
    return { events, racket: e.natpfLastRacket, phase: e.phase };
  } finally { Math.random = real; }
}
test('B18 motore: il colpo difensivo è «hit» (palla in gioco), «fault» solo all’assegnazione del punto', async () => {
  let defensive = 0;
  for (const lead of [-.04, -.06, -.08, -.1, -.12, .3, .35, .4, .45]){
    const r = await rallyWithLead(lead);
    for (const ev of r.events){
      if (ev.kind === 'fault') assert.equal(ev.phase, 'POINT_OVER', `«fault» con la palla in gioco (lead ${lead}): ${ev.grade}`);
      if (/DEFENSIVE/.test(ev.grade || '')){ defensive++; assert.equal(ev.kind, 'hit', ev.grade); assert.equal(ev.defensive, true); }
    }
  }
  assert.ok(defensive >= 1, `colpi difensivi nelle prove: ${defensive}`);
});

// Revisione B18 (bloccante): nello stesso schermo il telefono del Player 2 riceveva l'esito null (natpf_ui.feedback lo
// calcola solo per chi gioca qui, il P1): il P2 che tirava fuori in anticipo leggeva «In anticipo» con l'anello verde,
// mentre la sua metà dello schermo diceva «Fuori · in anticipo». Ora il giro dell'aptica (relayPhoneFeedback, lo stesso
// del motore) calcola l'esito del P2 come la sua metà dello schermo
function splitRig({ split = true, target = { x: 0, z: 13.5 }, net = false } = {}){
  const engine = { scene: { add(){} }, playerRole: 'p1', elapsedTime: 0, natpfSplit: { active: split }, ball: { targetLanding: target, natpfNetFault: net }, hud: { showTimingPopup(){} } };
  engine.natpfUi = { feedback: e => ((e.role || 'p1') !== engine.playerRole ? null : eventQuality(engine, e)) };
  const p1 = phoneSink('p1'), p2 = phoneSink('p2');
  engine.natpfPhone = p1.ph; engine.natpfPhone2 = p2.ph;
  return { engine, p1: p1.sent, p2: p2.sent };
}
test('revisione B18: stesso schermo, il telefono del P2 dice «Fuori» e «In rete» come la sua metà dello schermo', () => {
  const shown = [], had = globalThis.document;
  globalThis.document = fakeDom();
  try {
    // il P2 tira verso z > 0: z 13,5 è oltre la linea di fondo del P1 → fuori
    const r = splitRig();
    r.engine.hud.showTimingPopup = o => shown.push(o);
    new NatpfShotFeedback(r.engine);
    r.engine.hud.showTimingPopup({ grade: 'P2 EARLY • CROSS-COURT!', detail: '90 KM/H' });
    assert.equal(shown[0].grade, 'Fuori · in anticipo', 'la metà destra dello schermo');
    relayPhoneFeedback(r.engine, { role: 'p2', kind: 'hit', grade: 'EARLY • CROSS-COURT', shotType: 'TOPSPIN' });
    assert.equal(r.p1.length, 0, 'il telefono del P1 non riceve il colpo del P2');
    assert.equal(r.p2[0].out, true, 'prima out:false'); assert.equal(r.p2[0].why, 'in anticipo');
    const f = eventFlash(r.p2[0]);
    assert.equal(f.big, 'Fuori', 'prima «In anticipo»'); assert.equal(f.ring, 'miss', 'prima l’anello verde «hit»'); assert.equal(f.sub, 'In anticipo');
    // in rete
    const n = splitRig({ target: { x: 0, z: 8 }, net: true });
    relayPhoneFeedback(n.engine, { role: 'p2', kind: 'hit', grade: 'VERY LATE • FOREHAND LINE', shotType: 'TOPSPIN' });
    assert.equal(eventFlash(n.p2[0]).big, 'In rete'); assert.equal(eventFlash(n.p2[0]).sub, 'Troppo tardi');
    // in campo: il voto della sua metà («Anticipo» → «In anticipo»)
    const ok = splitRig({ target: { x: 1, z: 8 } });
    relayPhoneFeedback(ok.engine, { role: 'p2', kind: 'hit', grade: 'EARLY • CROSS-COURT', shotType: 'TOPSPIN' });
    assert.equal(ok.p2[0].out, false); assert.equal(eventFlash(ok.p2[0]).big, 'In anticipo');
    // colpo a vuoto del P2 in ritardo: «Troppo tardi»
    relayPhoneFeedback(ok.engine, { role: 'p2', kind: 'whiff', grade: 'TOO LATE! • WHIFF' });
    assert.equal(eventFlash(ok.p2[1]).big, 'Troppo tardi');
    // il P1 nello stesso schermo resta com'era: il suo esito dal giro di chi gioca qui
    const p1 = splitRig({ target: { x: 0, z: -13.5 } });
    relayPhoneFeedback(p1.engine, { role: 'p1', kind: 'hit', grade: 'EARLY • CROSS-COURT', shotType: 'TOPSPIN' });
    assert.equal(eventFlash(p1.p1[0]).big, 'Fuori'); assert.equal(p1.p2.length, 0);
  } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});
test('revisione B18: l’esito del P2 si calcola solo nello stesso schermo (sfida tra due computer: lo calcola il suo computer)', () => {
  const lan = splitRig({ split: false });
  assert.equal(splitPhoneQuality(lan.engine, { role: 'p2', kind: 'hit', grade: 'EARLY • CROSS-COURT' }, null), null);
  const guest = splitRig(); guest.engine.playerRole = 'p2';
  const q = { color: 'green', label: 'Perfetto' };
  assert.equal(splitPhoneQuality(guest.engine, { role: 'p2', kind: 'hit', grade: 'PERFECT • X' }, q), q, 'chi gioca qui ha già il suo esito');
  assert.equal(splitPhoneQuality(guest.engine, { role: 'p1', kind: 'hit', grade: 'PERFECT • X' }, null), null);
  assert.equal(splitPhoneQuality(guest.engine, { role: 'p2', kind: 'point_won', grade: 'POINT WON!' }, null), null);
});
// motore vero senza grafica, stesso schermo: colpi del P2 nello scambio con tempi e direzioni diversi (anche fuori); per
// ognuno la scritta della metà destra dello schermo e quella del telefono del P2 (giro dell'aptica del motore →
// relayPhoneFeedback) dicono la stessa cosa
test('revisione B18, motore: colpi del P2 nello stesso schermo, metà destra e telefono del P2 uguali (anche fuori)', async () => {
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const had = globalThis.document, real = Math.random;
  globalThis.document = fakeDom();
  const SAME = { Perfetto: 'Perfetto!', Anticipo: 'In anticipo', Ritardo: 'In ritardo', Buono: 'Bel colpo', Fuori: 'Fuori', 'In rete': 'In rete' };
  let outs = 0, n = 0;
  try {
    for (const [lead, face] of [[0, 0], [.2, 0], [-.12, 0], [.45, -1], [-.2, 1], [.5, -1], [-.16, 1]]){
      Math.random = mulberry32(17);
      const e = createHeadlessEngine({ difficulty: 'casual' }), shown = [];
      e.startNewMatch({ showStartBanner: false });
      e.isMultiplayer = true; e.versus = { active: true, closing: false, local: true }; e.playerRole = 'p1'; e.natpfSplit.active = true;
      e.scene = { add(){} };
      const hud = e.hud; e.hud = new Proxy({}, { get: (t, k) => k in t ? t[k] : k === 'showTimingPopup' ? (o => shown.push({ ...o, at: e.elapsedTime })) : hud[k] });
      const fb = new NatpfShotFeedback(e);
      // (B37: con la scritta e il telefono del verdetto rimandato, come nel gioco: natpfUi.shot)
      e.natpfUi = { feedback: ev => ((ev.role || 'p1') !== e.playerRole ? null : fb.onLocalFeedback(ev)), shot: fb };
      let endAt = null; const aw = e._awardPoint.bind(e); e._awardPoint = (w, why) => { endAt ??= e.elapsedTime; return aw(w, why); };
      const p2 = phoneSink('p2'); e.natpfPhone2 = p2.ph; e.natpfPhone = phoneSink('p1').ph;
      e.motionController = { triggerHapticFeedback: ev => relayPhoneFeedback(e, ev) };
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
      e.opponent.pos.set(-.4, 0, -11.7); e.opponent.targetPos.copy(e.opponent.pos); e.opponent.vel.set(0, 0, 0);
      e.ball.pos.set(.5, 1, 11);
      e._launchBallToTarget(e.ball.pos, new THREE.Vector3(-1.6, 0, -8.5), 1.05, { topspin: 14 });
      e._natpfPlanOpponent();
      let swung = false;
      for (let t = 0; t < 6 && e.phase === 'RALLY'; t += DT){
        const ttc = NI.timeToContact(e, e.opponent);
        if (!swung && ttc != null && ttc <= lead){ e._handleP2SwingInput({ ...phoneSwing({ shot: 'topspin', power: .6, face }), role: 'p2' }); swung = true; }
        e.step(DT);
      }
      // B37: il messaggio che conta è l'ultimo (con fuori e rete arriva quando la palla tocca terra o la rete)
      const pop = shown.find(o => /^(Perfetto|Anticipo|Ritardo|Buono|Fuori|In rete)/.test(o.grade)), contacts = p2.sent.filter(m => m.k === 'contact'), msg = contacts.at(-1);
      assert.ok(pop && msg, `scritta e messaggio (lead ${lead}, face ${face}): ${JSON.stringify(shown.map(o => o.grade))} ${JSON.stringify(p2.sent)}`);
      const label = pop.grade.split(' · ')[0], f = eventFlash(msg);
      assert.equal(f.big, SAME[label], `lead ${lead}: schermo «${pop.grade}», telefono ${JSON.stringify(msg)}`);
      if (label === 'Fuori' || label === 'In rete'){
        outs++; assert.equal(f.ring, 'miss'); assert.equal(f.sub.toLowerCase(), pop.grade.split(' · ')[1] || '');
        // B37: al colpo il telefono del P2 non dice l'esito (wait), la scritta non c'è; tutti e due quando la palla tocca
        assert.equal(contacts.length, 2, JSON.stringify(contacts)); assert.equal(contacts[0].wait, 1); assert.equal(eventFlash(contacts[0]).ring, '');
        assert.equal(msg.late, 1); assert.ok(endAt != null && pop.at >= endAt - 1e-9, `scritta a ${pop.at} s, palla a terra a ${endAt} s`);
      } else assert.ok(endAt == null || pop.at < endAt, 'colpo in campo: la scritta subito, come prima');
      n++;
    }
  } finally { Math.random = real; if (had === undefined) delete globalThis.document; else globalThis.document = had; }
  assert.equal(n, 7); assert.ok(outs >= 2, `colpi fuori nelle prove: ${outs}`);
});

// Revisione B18 (trovato estendendo il banco): «Fuori» veniva dal bersaglio del motore (ball.targetLanding), non dal
// rimbalzo vero: l'effetto e l'aria portano la palla fino a 1,3 m più verso il centro, e più di metà delle «Fuori» dello
// scambio avevano la palla poi dentro (punto vinto, «Nice Shot!»). Ora: rimbalzo previsto con la fisica del motore e la
// tolleranza delle righe del motore (scripts/audit/fuori-vero.mjs)
test('revisione B18: «Fuori» dal rimbalzo vero previsto, con la tolleranza delle righe del motore', () => {
  // senza velocità (prove, palla ferma): il bersaglio, come prima
  assert.deepEqual(landingOf({ targetLanding: { x: 5, z: -8 } }), { x: 5, z: -8 });
  assert.equal(landsIn({ x: 4.2, z: -8 }), false, 'bersaglio: tolleranza 0,02');
  assert.equal(landsIn({ x: 4.2, z: -8, predicted: true }), true, 'rimbalzo previsto: tolleranza del motore');
  assert.equal(landsIn({ x: 4.115 + LINE_TOL.x + .01, z: -8, predicted: true }), false);
  assert.equal(landsIn({ x: 0, z: -(11.885 + LINE_TOL.z - .01), predicted: true }), true);
  assert.equal(landsIn({ x: 0, z: -7, predicted: true }, { serve: true }), false, 'servizio: riquadro del servizio, come prima');
  // palla vera in volo: il rimbalzo previsto, non il bersaglio
  const ball = { pos: { x: 0, y: 1, z: 10 }, vel: { x: -3, y: 3, z: -22 }, spin: { x: 0, y: 0 }, targetLanding: { x: -9, z: -8 } };
  const L = landingOf(ball);
  assert.ok(L.predicted && L.z < 0 && L.x > -6, JSON.stringify(L));
});
test('revisione B18, motore: nessuna «Fuori» con la palla poi dentro (prima più di metà), nessun «in campo» poi Out', async () => {
  const { simulate } = await import('../scripts/audit/rally-balance.mjs');
  const r = { before: [0, 0], after: [0, 0, 0, 0] };
  let hooked = false, pend = null;
  simulate({ profile: 'umano', difficulty: 'pro', points: 60, seed: 7, onStep: e => {
    if (hooked) return; hooked = true;
    const bounce = e._spawnBounceRing.bind(e);
    e._spawnBounceRing = (x, z) => {
      if (pend && e.ball.lastHitter === 'player'){
        const out = Math.abs(x) > 4.115 + .22 || Math.abs(z) > 11.89 + .28 || z > 0;
        if (pend.before === 'Fuori'){ r.before[0]++; if (!out) r.before[1]++; }
        if (pend.after === 'Fuori'){ r.after[0]++; if (!out) r.after[1]++; } else { r.after[2]++; if (out) r.after[3]++; }
      }
      pend = null; return bounce(x, z);
    };
    e.motionController = { triggerHapticFeedback: ev => {
      pend = null;
      if ((ev.role || 'p1') !== 'p1' || ev.kind !== 'hit' || /SERVE/.test(ev.grade) || e.ball.natpfNetFault) return;
      pend = { before: shotQuality(ev.grade, { inCourt: landsIn(e.ball.targetLanding) }).label, after: shotQuality(ev.grade, { inCourt: landsIn(landingOf(e.ball)) }).label };
    } };
  } });
  assert.ok(r.before[1] >= 5, `prima: ${JSON.stringify(r)}`);
  assert.equal(r.after[1], 0, `dopo, «Fuori» con la palla dentro: ${JSON.stringify(r)}`);
  assert.equal(r.after[3], 0, `dopo, «in campo» poi Out: ${JSON.stringify(r)}`);
  assert.ok(r.after[0] >= 5, JSON.stringify(r));
});
