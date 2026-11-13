// B37 (collaudo dell'utente del 13/11, seconda parte):
//   1) fuori e punto solo quando la palla esce davvero (scritta, anello, telefono e punto all'atterraggio vero);
//   2) chi deve servire con un elemento di gioco: riquadro di servizio a terra e casella gialla «Al servizio» appena sopra
//      la testa (B37.1: la gemma 3D sopra il personaggio tolta dopo il collaudo dell'utente del 13/11 sera);
//   3) il segnale del momento giusto spiegato le prime volte («Colpisci quando il cerchio diventa verde»);
//   4) pannello dello stand dal programma Windows (F9 e voce del menu, ponte del preload).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NatpfShotFeedback, relayPhoneFeedback, defersVerdict, isPendingVerdict, waitQuality, settledQuality, shotQuality, VIBRATION } from '../src/natpf/natpf_shot_feedback.js';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { gestureOutcome } from '../src/natpf/natpf_gesture_hud.js';
import { serveOutcome } from '../src/natpf/natpf_stroke_outcome.js';
import { eventFlash, verdictText } from '../../site/js/tennis/phone-screen.js';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';

// ---------- 4 · pannello dello stand dal programma Windows ----------
test('punto 4 · il pannello dello stand si apre e si chiude dal ponte del programma Windows (F9); Ctrl+Maiusc+K resta', async () => {
  const listeners = {}, cls = new Set(['hidden']), poked = [];
  const el = { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), contains: c => cls.has(c), add: c => cls.add(c) }, addEventListener(){}, querySelector: () => null, querySelectorAll: () => [] };
  let onToggle = null;
  const saved = {}, keep = k => (saved[k] = Object.getOwnPropertyDescriptor(globalThis, k));
  for (const k of ['window', 'document', 'localStorage', 'setInterval']) keep(k);
  const def = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  def('window', { addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); }, natpfDesktop: { staffPanel: { onToggle: cb => { onToggle = cb; return () => {}; } } } });
  def('document', { getElementById: id => (id === 'natpf-staff' ? el : null), querySelector: () => null, querySelectorAll: () => [] });
  def('localStorage', { getItem: () => null, setItem(){} });
  def('setInterval', () => 0);
  try {
    const { NatpfKiosk } = await import('../src/natpf/natpf_kiosk.js');
    const K = new NatpfKiosk({}, { phone: { onSwing(){} } });
    K.paint = () => {};
    const last0 = K.last;
    assert.equal(typeof onToggle, 'function', 'il pannello ascolta il ponte del programma');
    assert.equal(K.isOpen, false);
    await new Promise(r => setTimeout(r, 5));
    onToggle('toggle'); assert.equal(K.isOpen, true, 'F9: aperto');
    assert.ok(K.last > last0, 'F9 conta come presenza (il chiosco non riparte)');
    onToggle('toggle'); assert.equal(K.isOpen, false, 'F9 di nuovo: chiuso');
    onToggle('open'); onToggle('open'); assert.equal(K.isOpen, true);
    onToggle('close'); assert.equal(K.isOpen, false);
    // Ctrl+Maiusc+K resta com'era
    const key = { ctrlKey: true, shiftKey: true, code: 'KeyK', preventDefault(){ poked.push('pd'); }, stopImmediatePropagation(){} };
    for (const fn of listeners.keydown || []) fn(key);
    assert.equal(K.isOpen, true, 'Ctrl+Maiusc+K apre ancora');
    assert.ok(poked.includes('pd'));
  } finally {
    for (const [k, d] of Object.entries(saved)) if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k];
  }
});

test('punto 4 · senza il programma Windows (browser, zip Cloudflare) il pannello funziona come prima', async () => {
  const saved = {}, keep = k => (saved[k] = Object.getOwnPropertyDescriptor(globalThis, k));
  for (const k of ['window', 'document', 'localStorage', 'setInterval']) keep(k);
  const def = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  const cls = new Set(['hidden']), el = { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), contains: c => cls.has(c) }, addEventListener(){} };
  def('window', { addEventListener(){} });
  def('document', { getElementById: id => (id === 'natpf-staff' ? el : null), querySelector: () => null, querySelectorAll: () => [] });
  def('localStorage', { getItem: () => null, setItem(){} });
  def('setInterval', () => 0);
  try {
    const { NatpfKiosk } = await import('../src/natpf/natpf_kiosk.js');
    const K = new NatpfKiosk({}, { phone: { onSwing(){} } });
    K.paint = () => {};
    K.toggle(); assert.equal(K.isOpen, true);
  } finally {
    for (const [k, d] of Object.entries(saved)) if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k];
  }
});

// ---------- 1 · fuori e punto solo quando la palla esce davvero ----------
function fakeDom(){
  const els = {}, cls = () => { const s = new Set(); return { add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), toggle: (c, f) => ((f ?? !s.has(c)) ? s.add(c) : s.delete(c)), contains: c => s.has(c) }; };
  const el = id => (els[id] ||= { id, classList: cls(), style: {} });
  return { getElementById: el, querySelectorAll: () => [] };
}
function phoneSink(role = 'p1'){
  const sent = [], ph = Object.create(NatpfPhoneRacket.prototype);
  Object.defineProperty(ph, 'ready', { value: true });
  Object.defineProperty(ph, 'role', { value: role });
  ph.link = { send: m => sent.push(m) };
  return { ph, sent };
}
const withDom = async fn => { const had = globalThis.document; globalThis.document = fakeDom(); try { return await fn(); } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; } };
// motore finto in partita: palla del P1 che cadrà fuori largo (bersaglio, palla ferma: landingOf usa il bersaglio)
function fakeMatch({ target = { x: 6, z: -8 }, net = false, phase = 'RALLY', ui = {} } = {}){
  const shown = [], late = [], { ph, sent } = phoneSink('p1');
  const engine = { scene: { add(){} }, phase, playerRole: 'p1', elapsedTime: 10, autoPlayMode: false,
    ball: { targetLanding: target, natpfNetFault: net, rallyStrokeCount: 3, lastHitter: 'player', bounceCountOnCurrentSide: 0, pos: new THREE.Vector3(target.x, .075, target.z) },
    hud: { showTimingPopup: o => shown.push({ ...o, at: engine.elapsedTime }) }, _spawnBounceRing(){},
    racketKinematics: { getRacketRimWorldPoints: () => ({ centerWorld: new THREE.Vector3(0, 1, 11) }) }, player: {} };
  const fb = new NatpfShotFeedback(engine);
  engine.natpfUi = { feedback: ev => fb.onLocalFeedback(ev), shot: fb, gesture: { lateOutcome: q => late.push(q) }, ...ui };
  engine.natpfPhone = ph;
  // come il motore: prima la scritta del colpo, poi il giro dell'aptica
  const hit = (grade = 'VERY EARLY • FOREHAND CROSS!') => { engine.hud.showTimingPopup({ grade, detail: '98 KM/H' }); return relayPhoneFeedback(engine, { role: 'p1', kind: 'hit', grade: grade.replace('!', ''), shotType: 'TOPSPIN' }); };
  return { engine, fb, shown, late, sent, hit };
}

test('punto 1 · regole pure: verdetto rimandato solo in partita, solo per fuori e rete', () => {
  assert.equal(defersVerdict({ phase: 'RALLY' }), true);
  for (const e of [null, { phase: 'SERVE_TOSS' }, { phase: 'RALLY', autoPlayMode: true }, { phase: 'RALLY', natpfUi: { training: { active: true } } },
    { phase: 'RALLY', natpfUi: { events: { active: true } } }, { phase: 'RALLY', natpfUi: { trial: { active: true } } }]) assert.equal(defersVerdict(e), false, JSON.stringify(e));
  assert.equal(isPendingVerdict(shotQuality('EARLY', { inCourt: false })), true);
  assert.equal(isPendingVerdict(shotQuality('LATE', { net: true })), true);
  for (const q of [shotQuality('PERFECT'), shotQuality('TOO LATE! • WHIFF'), shotQuality('EARLY'), shotQuality('PERFECT', { long: true }), null]) assert.equal(isPendingVerdict(q), false, JSON.stringify(q));
  const w = waitQuality(shotQuality('EARLY', { inCourt: false }));
  assert.deepEqual(w, { color: 'wait', label: 'Colpita', wait: true, verdict: 'Fuori' });
  assert.deepEqual(VIBRATION.wait, [25], 'al colpo una vibrazione breve, non quella dell\'errore');
  // motivo del motore diverso dalla previsione: vale il motore
  const V = { q: shotQuality('VERY EARLY', { inCourt: false }), grade: 'VERY EARLY' };
  assert.equal(settledQuality(V, 'Out').label, 'Fuori'); assert.equal(settledQuality(V, 'Net').label, 'In rete');
  assert.equal(gestureOutcome({ kind: 'hit' }, w).text, 'Colpita');
  assert.equal(gestureOutcome({ kind: 'hit', defensive: true }, w).text, 'Colpita', 'anche il colpo difensivo aspetta il verdetto');
});

test('punto 1 · telefono: al colpo niente «Fuori» (wait), poi il verdetto con la palla a terra e il punto che lo tiene', () => {
  const contact = eventFlash({ k: 'contact', wait: 1, label: 'anticipo', shot: 'drive' });
  assert.equal(contact.big, 'Colpo!'); assert.equal(contact.ring, ''); assert.deepEqual(contact.buzz, [20]);
  assert.equal(eventFlash({ k: 'contact', wait: 1, shot: 'lob' }).big, 'Lob!');
  const late = { k: 'contact', late: 1, out: true, why: 'in anticipo', label: 'anticipo', shot: 'drive' };
  assert.equal(eventFlash(late).big, 'Fuori'); assert.equal(eventFlash(late).ring, 'miss');
  assert.equal(verdictText(late), 'Fuori · In anticipo'); assert.equal(verdictText({ net: true }), 'In rete'); assert.equal(verdictText({}), '');
  const point = { k: 'point', mine: false, txt: 'Fuori' };
  assert.equal(eventFlash(point).sub, 'Fuori');
  assert.equal(eventFlash(point, { verdict: 'Fuori · In anticipo' }).sub, 'Fuori · In anticipo');
  assert.equal(eventFlash(point, { verdict: 'Fuori · In anticipo' }).big, 'Punto avversario');
});

test('punto 1 · partita: «Fuori», anello rosso, etichetta e telefono solo quando la palla tocca terra fuori', () => withDom(() => {
  const M = fakeMatch();
  const q = M.hit();
  assert.equal(q.label, 'Fuori', 'l\'esito vero c\'è già (allenamento, diagnostica, registro lo leggono come prima)');
  assert.equal(M.shown.length, 0, 'al colpo nessuna scritta «Fuori»');
  assert.ok(M.fb.markers.every(m => !m.active), 'al colpo nessun anello a terra');
  assert.equal(M.fb.flashes[0].s.material.color.getHex(), 0xffffff, 'lampo neutro sulla racchetta');
  assert.equal(M.sent.length, 1); assert.equal(M.sent[0].wait, 1); assert.equal(M.sent[0].out, false); assert.deepEqual(M.sent[0].vib, [25]);
  assert.equal(M.fb.shown(q).wait, true, 'etichetta del gesto: «Colpita»');
  // la palla vola: niente
  M.engine.elapsedTime += .5; M.fb.update(.5);
  assert.equal(M.shown.length, 0); assert.equal(M.sent.length, 1);
  // tocca terra fuori: game_engine._awardPoint (motivo «Out») chiama settle prima del punto
  M.engine.elapsedTime += .45;
  assert.equal(M.fb.settle('opponent', 'Out'), true);
  assert.equal(M.shown.length, 1); assert.equal(M.shown[0].grade, 'Fuori · troppo presto'); assert.equal(M.shown[0].at, 10.95);
  const ring = M.fb.markers.find(m => m.active);
  assert.ok(ring && ring.bounced === 1 && ring.mat.color.getHex() === 0xff4d5e, 'anello rosso dove è caduta, che pulsa');
  assert.equal(ring.g.position.x, 6); assert.equal(ring.g.position.z, -8);
  assert.equal(M.sent.length, 2); assert.equal(M.sent[1].late, 1); assert.equal(M.sent[1].out, true); assert.deepEqual(M.sent[1].vib, [25, 60, 25]);
  assert.equal(M.late.length, 1); assert.equal(M.late[0].label, 'Fuori');
  assert.equal(M.fb.settle('opponent', 'Out'), false, 'una volta sola');
}));

test('punto 1 · in rete: «In rete» quando la palla tocca la rete, senza anello', () => withDom(() => {
  const M = fakeMatch({ target: { x: 0, z: -8 }, net: true });
  M.hit('LATE • FOREHAND LINE!');
  assert.equal(M.shown.length, 0); assert.equal(M.sent[0].wait, 1); assert.equal(M.sent[0].net, false);
  M.engine.elapsedTime += .5;
  assert.equal(M.fb.settle('opponent', 'Net'), true);
  assert.equal(M.shown[0].grade, 'In rete · in ritardo'); assert.ok(M.fb.markers.every(m => !m.active), 'in rete: niente anello nel campo');
  assert.equal(M.sent[1].net, true); assert.equal(M.sent[1].late, 1);
}));

test('punto 1 · stesso schermo: il «Fuori» del Player 2 (scritta nella sua metà e suo telefono) arriva con la palla a terra', () => withDom(() => {
  const M = fakeMatch({ target: { x: 6, z: 8 } });   // il P2 tira verso z > 0: fuori largo nella metà del P1
  const P2 = phoneSink('p2');
  Object.assign(M.engine, { natpfSplit: { active: true }, natpfPhone2: P2.ph });
  M.engine.ball.lastHitter = 'opponent';
  // come natpf_ui.feedback: l'esito locale (anello, allenamento) è solo di chi gioca su questo computer (il P1)
  M.engine.natpfUi.feedback = ev => ((ev.role || 'p1') !== M.engine.playerRole ? null : M.fb.onLocalFeedback(ev));
  // come il motore: la scritta del colpo del P2, poi il giro dell'aptica con il ruolo del P2
  M.engine.hud.showTimingPopup({ grade: 'P2 VERY EARLY • FOREHAND CROSS!', detail: '98 KM/H' });
  assert.equal(relayPhoneFeedback(M.engine, { role: 'p2', kind: 'hit', grade: 'VERY EARLY • FOREHAND CROSS', shotType: 'TOPSPIN' }), null, 'il colpo del P2 non è di chi gioca sul P1 (come prima)');
  assert.equal(M.shown.length, 0, 'al colpo nessuna scritta «Fuori» nella metà del P2');
  assert.equal(P2.sent.length, 1); assert.equal(P2.sent[0].wait, 1); assert.equal(P2.sent[0].out, false, 'telefono del P2: al colpo esito neutro');
  assert.equal(M.sent.length, 0, 'il telefono del P1 non riceve il colpo del P2');
  M.engine.elapsedTime += .5; M.fb.update(.5);
  assert.equal(M.shown.length, 0); assert.equal(P2.sent.length, 1);
  // la palla tocca terra fuori: punto del P1
  M.engine.elapsedTime += .4;
  assert.equal(M.fb.settle('player', 'Out'), true);
  assert.equal(M.shown.length, 1); assert.match(M.shown[0].grade, /^Fuori/);
  assert.equal(P2.sent.length, 2); assert.equal(P2.sent[1].late, 1); assert.equal(P2.sent[1].out, true); assert.deepEqual(P2.sent[1].vib, [25, 60, 25]);
  assert.equal(M.sent.length, 0, 'il telefono del P1 resta fuori anche dal verdetto');
  assert.ok(M.fb.markers.every(m => !m.active), 'colpo del P2: nessun anello di chi gioca sul P1 (come prima)');
}));

test('punto 1 · palla ripresa al volo, punto interrotto o finito in un altro modo: nessun «Fuori»', () => withDom(() => {
  const A = fakeMatch(); A.hit();
  A.engine.ball.rallyStrokeCount = 4; A.engine.ball.lastHitter = 'opponent'; A.fb.update(1/60);   // la CPU la prende al volo
  assert.equal(A.fb.verdict, null); assert.equal(A.fb.settle('player', 'Out'), false); assert.equal(A.shown.length, 0);
  const B = fakeMatch(); B.hit(); B.engine.phase = 'SERVE_STANCE'; B.fb.update(1/60);              // menu, moviola, nuovo servizio
  assert.equal(B.fb.verdict, null); assert.equal(B.shown.length, 0);
  const C = fakeMatch(); C.hit(); C.engine.elapsedTime += 7; C.fb.update(1/60);                    // mai arrivato
  assert.equal(C.fb.verdict, null);
  const D = fakeMatch(); D.hit(); assert.equal(D.fb.settle('player', 'Nice Shot!'), false);       // altro motivo del motore
  assert.equal(D.fb.verdict, null); assert.equal(D.shown.length, 0);
}));

test('punto 1 · la previsione diceva fuori ma la palla cade dentro: al rimbalzo l\'esito in campo', () => withDom(() => {
  const M = fakeMatch({ target: { x: 4.2, z: -8 } });   // a 8 cm dalla riga: «Fuori» per la previsione (tolleranza 2 cm)
  M.hit('EARLY • FOREHAND CROSS!');
  assert.equal(M.shown.length, 0);
  M.engine._spawnBounceRing(4.2, -8);                    // per il motore è dentro (tolleranza delle righe 22 cm)
  assert.equal(M.shown.length, 1); assert.equal(M.shown[0].grade, 'Anticipo');
  assert.equal(M.sent[1].late, 1); assert.equal(M.sent[1].out, false); assert.equal(eventFlash(M.sent[1]).big, 'In anticipo');
  assert.equal(M.late[0].label, 'Anticipo');
}));

test('punto 1 · allenamento, minigiochi e colpi in campo: come prima (esito subito)', () => withDom(() => {
  const T = fakeMatch({ ui: { training: { active: true } } }); T.hit();
  assert.equal(T.shown.length, 1); assert.equal(T.shown[0].grade, 'Fuori · troppo presto'); assert.equal(T.sent[0].out, true);
  const I = fakeMatch({ target: { x: 1, z: -8 } }); I.hit('PERFECT • FOREHAND TOPSPIN!');
  assert.equal(I.shown.length, 1); assert.equal(I.shown[0].grade, 'Perfetto'); assert.equal(I.sent[0].wait, undefined);
  assert.ok(I.fb.markers.some(m => m.active), 'colpo in campo: anello subito, come prima');
}));

test('punto 1 · il servizio non va mai fuori (niente falli né doppi falli da rimandare)', () => {
  let n = 0;
  for (let i = 0; i < 400; i++){
    const r = k => Math.sin(i*12.9898 + k*78.233)*43758.5453 % 1;
    const o = serveOutcome({ intent: { power: Math.abs(r(1)), plane: r(2), rise: r(3)*2, face: r(4) }, tau: r(5)*.8, boxSign: i % 2 ? 1 : -1 });
    assert.ok(o.depth <= 6.4 && Math.abs(o.x) <= 4.115, JSON.stringify(o)); n++;
  }
  assert.equal(n, 400);
});

// motore vero senza grafica: colpo del P1 mandato fuori largo sul punto della partita (0-40, partita a 1 game)
const DT = 1/120;
const phoneSwing = (intent, { side = 'forehand' } = {}) => ({ source: 'natpf-phone', side, shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, ...intent }, power: intent.power, peak: 900, latency: 0, hand: 'right' } });
test('punto 1 · motore: sul punto della partita «Fuori», punto e fine partita arrivano insieme, quando la palla atterra', async () => {
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(17);
  await withDom(async () => {
    try {
      const e = createHeadlessEngine({ difficulty: 'casual' }); e.startNewMatch({ showStartBanner: false }); e.matchConfig.gamesToWin = 1;
      const log = [], stamp = k => x => log.push({ k, t: e.elapsedTime, ...x });
      const hud = e.hud; e.hud = new Proxy({}, { get: (t, k) => k in t ? t[k] : k === 'showTimingPopup' ? (o => stamp('scritta')({ txt: o.grade })) : k === 'showCenterBanner' ? (txt => stamp('banner')({ txt })) : hud[k] });
      e.scene = { add(){} };
      const fb = new NatpfShotFeedback(e), { ph, sent } = phoneSink('p1');
      e.natpfUi = { feedback: ev => fb.onLocalFeedback(ev), shot: fb }; e.natpfPhone = ph;
      e.motionController = { triggerHapticFeedback: ev => relayPhoneFeedback(e, ev) };
      const rs = e._natpfRacketShot.bind(e);
      e._natpfRacketShot = (...a) => { const r = rs(...a); if (r){ r.E = 5.7; r.N = -8.6; r.O = false; stamp('colpo')({}); } return r; };
      const aw = e._awardPoint.bind(e); e._awardPoint = (w, why) => { stamp('punto')({ why, y: +e.ball.pos.y.toFixed(3), x: +e.ball.pos.x.toFixed(2) }); return aw(w, why); };
      e.score.playerPoints = 0; e.score.opponentPoints = 3;
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
      e.player.pos.set(.4, 0, 11.7); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
      e.ball.pos.set(-.5, 1, -11);
      e._launchBallToTarget(e.ball.pos, new THREE.Vector3(1.6, 0, 8.5), 1.05, { topspin: 14 });
      e._natpfPlanPlayer();
      let sentSwing = false, atHit = null;
      for (let t = 0; t < 6; t += DT){
        const ttc = NI.timeToContact(e, e.player);
        if (!sentSwing && ttc != null && ttc <= .02){ e._handleUserSwingInput(phoneSwing({ shot: 'topspin', power: .6 })); sentSwing = true; }
        e.step(DT);
        if (atHit == null && log.some(l => l.k === 'colpo')) atHit = { phase: e.phase, games: e.score.opponentGames, popups: log.filter(l => l.k === 'scritta').length };
        if (e.phase === 'MATCH_OVER') break;
      }
      const hitAt = log.find(l => l.k === 'colpo')?.t, pt = log.find(l => l.k === 'punto'), out = log.find(l => l.k === 'scritta' && /^Fuori/.test(l.txt));
      assert.ok(hitAt != null && pt, JSON.stringify(log));
      assert.equal(pt.why, 'Out'); assert.ok(pt.y < .1, 'la palla è a terra'); assert.ok(Math.abs(pt.x) > 4.3, 'fuori largo');
      assert.deepEqual(atHit, { phase: 'RALLY', games: 0, popups: 0 }, 'al colpo: partita in corso, nessuna scritta');
      assert.ok(out && out.t === pt.t, `«Fuori» insieme al punto: colpo ${hitAt}, a terra ${pt.t}, scritta ${out?.t}`);
      assert.ok(pt.t - hitAt > .4, `la palla ha volato ${(pt.t - hitAt).toFixed(2)} s prima del verdetto`);
      assert.equal(e.phase, 'MATCH_OVER'); assert.equal(e.score.opponentGames, 1);
      // B43 (decisione dell'utente del 13/11 sera): la scritta grande della fine partita mezzo secondo DOPO l'atterraggio;
      // «Fuori», punto e telefono restano all'atterraggio
      assert.ok(!log.some(l => l.k === 'banner'), 'all\'atterraggio ancora nessuna scritta grande');
      for (let t = 0; t < .6; t += DT) e.step(DT);
      const bn = log.filter(l => l.k === 'banner');
      assert.ok(bn.length === 1 && Math.abs(bn[0].t - pt.t - .5) <= DT + 1e-6, `scritta della fine partita 0,5 s dopo l'atterraggio: ${JSON.stringify(bn)}, a terra ${pt.t}`);
      const contacts = sent.filter(m => m.k === 'contact');
      assert.equal(contacts.length, 2); assert.equal(contacts[0].wait, 1); assert.equal(contacts[1].late, 1); assert.equal(contacts[1].out, true);
      const point = sent.find(m => m.k === 'point'); assert.ok(point && point.mine === false && sent.indexOf(point) > sent.indexOf(contacts[1]), 'il punto dopo il verdetto');
    } finally { Math.random = real; }
  });
});

// ---------- 2 · chi deve servire: riquadro di servizio a terra e casella «Al servizio» sopra la testa ----------
// B37.1 (13/11 sera, l'utente: «il triangolino in alto è orribile, meglio la casella tonda che usavi prima "al servizio"»):
// niente gemma 3D sopra chi batte; la casella gialla del B35b sta appena sopra la testa misurata, il riquadro resta
import * as SM from '../src/natpf/natpf_serve_marker.js';
import { NatpfServeMarker, SERVE_MARK, serviceBox, serverOf, serveMarkOn, headTop, serveTagHeight } from '../src/natpf/natpf_serve_marker.js';
import { serveTagPoint, splitCameraPose } from '../src/natpf/natpf_split.js';
import { mem, engineOf, seen, useModels } from './mascotte-campo.mjs';
import { setCast, resetCast } from '../src/natpf/natpf_personaggi.js';
import { setMascotMode, resetMascotModels } from '../src/natpf/natpf_mascot_models.js';

test('punto 2 · riquadro di servizio: in diagonale, nella metà di chi riceve, come i servizi veri del motore', async () => {
  // regola pura
  assert.deepEqual(serviceBox({ sideSign: 1 }, true), { x0: -4.115, x1: 0, z0: -6.4, z1: 0 });
  assert.deepEqual(serviceBox({ sideSign: 1 }, false), { x0: 0, x1: 4.115, z0: -6.4, z1: 0 });
  assert.deepEqual(serviceBox({ sideSign: -1 }, true), { x0: 0, x1: 4.115, z0: 0, z1: 6.4 });
  assert.deepEqual(serviceBox({ sideSign: -1 }, false), { x0: -4.115, x1: 0, z0: 0, z1: 6.4 });
  // servizi veri (motore senza grafica): primo rimbalzo dentro il riquadro mostrato, per chi gioca e per la CPU, sui due
  // lati, con il servizio dal gesto (serveOutcome) e senza (bersaglio di prima)
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(5);
  let n = 0;
  try {
    for (const server of ['player', 'opponent']) for (const deuce of [true, false]) for (const gesture of [false, true]) for (const power of [.15, .55, .95]){
      const e = createHeadlessEngine({ difficulty: 'casual' }); e.startNewMatch({ showStartBanner: false });
      e.score.server = server; e.score.deuceSide = deuce; e._setupPointServe({ showBanner: false });
      const who = server === 'player' ? e.player : e.opponent, box = serviceBox(who, deuce);
      let bounce = null; e._spawnBounceRing = (x, z) => { bounce ??= { x, z }; };
      e.ball.pos.set(who.pos.x, 2.6, who.pos.z); e.ball.vel.set(0, 0, 0); e.phase = 'SERVE_TOSS';
      e._executeServeHit(who, gesture ? { natpfServeTau: .02, source: 'natpf-phone', speed: 1.2, natpf: { shot: 'flat', intent: { power, rise: 0, plane: 0, face: 0 }, power } } : { speed: 1.2 });
      for (let t = 0; t < 3 && !bounce; t += 1/240) e._stepPhysics(1/240);
      assert.ok(bounce, `rimbalzo (${server}, parità ${deuce}, gesto ${gesture})`);
      const tol = .25;
      assert.ok(bounce.x >= box.x0 - tol && bounce.x <= box.x1 + tol && bounce.z >= box.z0 - tol && bounce.z <= box.z1 + tol,
        `servizio di ${server} (parità ${deuce}, gesto ${gesture}, forza ${power}) a ${bounce.x.toFixed(2)}, ${bounce.z.toFixed(2)}; riquadro ${JSON.stringify(box)}`);
      n++;
    }
  } finally { Math.random = real; }
  assert.equal(n, 24);
});

function markerEngine({ server = 'player', phase = 'SERVE_STANCE', deuce = true } = {}){
  const added = [], mk = (x, z, s) => ({ pos: new THREE.Vector3(x, 0, z), sideSign: s });
  const e = { scene: { add: o => added.push(o) }, phase, cameraMode: 'RALLY_CAM', autoPlayMode: false, score: { server, deuceSide: deuce },
    player: mk(1.35, 12, 1), opponent: mk(-2.35, -12, -1), natpfUi: { lobby: { visible: false } } };
  return { e, added, M: new NatpfServeMarker(e) };
}
test('punto 2 · B37.1: niente gemma, solo il riquadro, finché il servizio non parte (chi gioca o la CPU)', () => {
  const { e, added, M } = markerEngine();
  assert.equal(added.length, 1, 'un solo oggetto nella scena: il riquadro');
  let cones = 0; added[0].traverse(o => { if (o.geometry?.type === 'ConeGeometry') cones++; });
  assert.equal(cones, 0, 'nessuna piramide');
  assert.equal(M.gem, undefined); assert.equal(SERVE_MARK.gem, undefined);
  for (const k of ['gemOn', 'gemBase', 'gemScale']) assert.equal(SM[k], undefined, `${k}: niente misura per camera`);
  M.update(1/60);
  assert.equal(M.box.visible, true); assert.equal(M.state.server, 'player');
  assert.deepEqual(Object.keys(M.state).sort(), ['box', 'rect', 'server']);
  assert.deepEqual(M.state.rect, serviceBox(e.player, true));
  assert.ok(M.box.position.z < 0 && M.box.position.x < 0, 'nella metà della CPU, in diagonale');
  // lancio della palla: ancora
  e.phase = 'SERVE_TOSS'; M.update(1/60); assert.equal(M.box.visible, true);
  // la palla parte: sparisce
  e.phase = 'RALLY'; M.update(1/60); assert.equal(M.box.visible, false); assert.equal(M.state.rect, null);
  // batte la CPU, sul lato del vantaggio
  e.phase = 'SERVE_STANCE'; e.score.server = 'opponent'; e.score.deuceSide = false; M.update(1/60);
  assert.equal(M.state.server, 'opponent');
  assert.deepEqual(M.state.rect, serviceBox(e.opponent, false)); assert.ok(M.box.position.z > 0, 'nella metà di chi gioca');
  // dimostrazione del menu, moviola, menu aperto: niente
  for (const set of [() => { e.autoPlayMode = true; }, () => { e.autoPlayMode = false; e.cameraMode = 'REPLAY_CAM'; }, () => { e.cameraMode = 'RALLY_CAM'; e.natpfUi.lobby.visible = true; }]){
    set(); M.update(1/60); assert.equal(M.box.visible, false);
  }
  e.natpfUi.lobby.visible = false; M.update(1/60); assert.equal(M.box.visible, true);
  // in prima persona il riquadro resta (la casella sopra di sé no: lo decide il motore, come nel B35b)
  e._isFirstPersonActive = () => true; e.localActor = e.opponent; M.update(1/60); assert.equal(M.box.visible, true);
  // il riquadro pulsa
  const o0 = M.fillMat.opacity; M.update(.3); assert.notEqual(M.fillMat.opacity, o0);
  assert.equal(serverOf({ score: { server: 'opponent' }, opponent: 1, player: 2 }), 1);
  assert.equal(serveMarkOn({ phase: 'SERVE_TOSS' }), true); assert.equal(serveMarkOn({ phase: 'POINT_OVER' }), false);
});
test('punto 2 · casella «Al servizio» appena sopra la testa misurata (un piccolo spazio), la stessa per ogni camera', () => {
  const actor = h => { const root = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(.5, h, .5)); m.position.y = h/2; root.add(m); return { root, pos: new THREE.Vector3() }; };
  assert.ok(Math.abs(headTop(actor(1.9)) - 1.9) < 1e-6);
  assert.ok(Math.abs(headTop(actor(2.4)) - 2.4) < 1e-6, 'mascotte con la testa grande');
  assert.equal(headTop(actor(4)), SERVE_MARK.head.max); assert.equal(headTop(actor(.5)), SERVE_MARK.head.min);
  assert.equal(headTop({}), SERVE_MARK.head.fallback);
  // appena sopra: né sotto la testa né lontana; senza modello i 2,25 m di prima del B37
  assert.ok(SERVE_MARK.tagGap >= .1 && SERVE_MARK.tagGap <= .3, `spazio sopra la testa ${SERVE_MARK.tagGap} m`);
  for (const top of [1.9, 2.15, 2.4]) assert.ok(Math.abs(serveTagHeight(top) - top - SERVE_MARK.tagGap) < 1e-9);
  assert.ok(Math.abs(serveTagHeight(SERVE_MARK.head.fallback) - 2.25) < 1e-9, 'senza modello come prima');
  const { e, M } = markerEngine(); const a = actor(1.9); e.player.root = a.root;
  assert.ok(Math.abs(M.tagHeight(e.player) - (1.9 + SERVE_MARK.tagGap)) < 1e-6);
  // nessuna camera: la stessa altezza per la vista di gioco, le due metà dello stesso schermo e il computer del Player 2
  const far = new THREE.PerspectiveCamera(); far.position.set(0, 5, 18); far.updateMatrixWorld();
  assert.equal(M.tagHeight(e.player, far), M.tagHeight(e.player));
  // si rimisura solo se cambia il modello del personaggio
  a.root.children[0].scale.y = 2; assert.ok(Math.abs(M.top(e.player) - 1.9) < 1e-6, 'stesso modello: valore tenuto');
  a.root.add(new THREE.Group()); assert.ok(Math.abs(M.top(e.player) - 2.85) < 1e-6, `modello cambiato: rimisurato (${M.top(e.player)})`);
  assert.ok(Math.abs(M.tagHeight(e.player) - (2.85 + SERVE_MARK.tagGap)) < 1e-6);
  // la scritta della metà dello stesso schermo segue l'altezza
  const cam = new THREE.PerspectiveCamera(50, 1, .1, 100); cam.position.set(0, 4, 18); cam.lookAt(0, 1, 0); cam.updateMatrixWorld();
  const v = { x: 0, y: 0, w: 640, h: 720 }, low = serveTagPoint(new THREE.Vector3(0, 0, 10), cam, v), high = serveTagPoint(new THREE.Vector3(0, 0, 10), cam, v, serveTagHeight(2.4));
  assert.ok(high.y < low.y, `più in alto sullo schermo: ${high.y} < ${low.y}`);
});
test('punto 2 · la cima si affina nei primi istanti del servizio (racchetta che sale), poi resta ferma', () => {
  const { e, M } = markerEngine(); e.elapsedTime = 10;
  const root = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.9, .5)), racket = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .05));
  body.position.y = .95; racket.position.y = 1.6; root.add(body, racket); e.player.root = root;
  assert.ok(Math.abs(M.top(e.player) - 1.9) < 1e-6, 'prima misura: la testa');
  // (le matrici le aggiorna il disegno: l'affinamento legge quelle dell'ultimo disegno e non le ricalcola)
  const pose = y => { racket.position.y = y; root.updateMatrixWorld(true); };
  pose(2); e.elapsedTime += .2;                                     // la racchetta sale mentre arriva la posa del servizio
  assert.ok(Math.abs(M.top(e.player) - 2.15) < 1e-6, `sopra la racchetta (${M.top(e.player)})`);
  pose(1.7); e.elapsedTime += .2;                                   // scende: la casella non scende (non sobbalza)
  assert.ok(Math.abs(M.top(e.player) - 2.15) < 1e-6);
  pose(2.6); e.elapsedTime += SERVE_MARK.settle;                    // passato il tempo (lancio, colpo): ferma
  assert.ok(Math.abs(M.top(e.player) - 2.15) < 1e-6);
  assert.ok(Math.abs(M.tagHeight(e.player) - 2.15 - SERVE_MARK.tagGap) < 1e-6);
  // solo mesh con la pelle (nessuna rigida in vista): l'affinamento non tocca la cima (non la porta a quella di base)
  const { e: e4, M: M4 } = markerEngine(); e4.elapsedTime = 5;
  const sk = new THREE.Group(); sk.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(.4, 1.7, .4)), { isSkinnedMesh: true, boundingBox: null, computeBoundingBox(){ this.geometry.computeBoundingBox(); this.boundingBox = this.geometry.boundingBox.clone(); } }));
  sk.children[0].position.y = .85; e4.player.root = sk;
  assert.ok(Math.abs(M4.top(e4.player) - 1.7) < 1e-6); e4.elapsedTime += .1;
  assert.ok(Math.abs(M4.top(e4.player) - 1.7) < 1e-6, `resta 1,7 (${M4.top(e4.player)})`);
  // orologio tornato indietro: niente affinamento; senza l'orologio del motore una misura sola
  e.elapsedTime = 0; pose(2.6); assert.ok(Math.abs(M.top(e.player) - 2.15) < 1e-6);
  const { e: e2, M: M2 } = markerEngine(); e2.player.root = root; pose(1.6);
  assert.ok(Math.abs(M2.top(e2.player) - 1.9) < 1e-6); pose(2); assert.ok(Math.abs(M2.top(e2.player) - 1.9) < 1e-6);
});
test('punto 2 · il punto della casella: al centro di chi batte, sopra la parte più alta e alla sua profondità (racchetta alzata davanti)', () => {
  const { e, M } = markerEngine();
  const build = (a, ahead, rh = 1.75) => { const root = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.6, .5)), racket = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .05));
    body.position.set(a.pos.x, .8, a.pos.z); racket.position.set(a.pos.x + .4, rh, a.pos.z - ahead*a.sideSign); root.add(body, racket); a.root = root; };
  build(e.player, .6); build(e.opponent, .6);
  const p = M.tagPoint(e.player), q = M.tagPoint(e.opponent);
  assert.ok(Math.abs(p.y - (1.9 + SERVE_MARK.tagGap)) < 1e-6 && p.x === e.player.pos.x, `sopra la racchetta, al centro di lato (${p.x}, ${p.y})`);
  // (il vertice più alto della racchetta: ±2,5 cm, metà del suo spessore)
  assert.ok(Math.abs(p.z - (e.player.pos.z - .6)) <= .026, `chi gioca: verso la rete, z più piccolo (${p.z})`);
  assert.ok(Math.abs(q.z - (e.opponent.pos.z + .6)) <= .026, `la CPU: verso la rete, z più grande (${q.z})`);
  assert.ok(Math.abs(M.tagHeight(e.player) - p.y) < 1e-9, 'tagHeight: la stessa altezza');
  // la testa più alta della racchetta: il punto sopra la testa, al centro; profondità tenuta tra i limiti
  const { e: e2, M: M2 } = markerEngine(); build(e2.player, .6, 1.2); build(e2.opponent, 5);
  // (un vertice in alto del corpo: entro metà del suo spessore, 25 cm, dal centro)
  assert.ok(Math.abs(M2.tagPoint(e2.player).z - e2.player.pos.z) <= .25 && Math.abs(M2.tagPoint(e2.player).y - (1.6 + SERVE_MARK.tagGap)) < 1e-6);
  assert.ok(Math.abs(M2.tagPoint(e2.opponent).z - (e2.opponent.pos.z + SERVE_MARK.ahead.max)) < 1e-6, 'al più 1 m davanti');
  // senza modello: 2,25 m sopra i piedi, al centro (come prima del B37)
  const { e: e3, M: M3 } = markerEngine(); const r = M3.tagPoint(e3.opponent);
  assert.deepEqual([r.x, +r.y.toFixed(6), r.z], [-2.35, 2.25, -12]);
});
test('punto 2 · personaggi veri: la casella sta appena sopra la testa con i Classici e con Lob & Drop (modelli 3D), chi gioca e la CPU', () => {
  // cima di quello che si vede del personaggio (mesh visibili, racchetta compresa) e di tutto il modello (anche i pezzi
  // nascosti: con Lob & Drop in 3D il tennista e la mascotte costruita nel codice restano nella radice, nascosti)
  const top = (o, all = false) => { const b = new THREE.Box3(), q = new THREE.Box3(); o.updateWorldMatrix(true, true); o.traverse(m => { if (m.isMesh && (all || seen(m))){ q.makeEmpty(); q.expandByObject(m); b.union(q); } }); return b.max.y; };
  const tops = {};
  try {
    for (const cast of ['sempre', 'lobdrop']){
      resetMascotModels(); resetCast();
      if (cast === 'lobdrop') useModels(); else { setMascotMode('3d'); setCast('sempre', { storage: mem() }); }
      const E = engineOf(); E.step(); E.step();
      const M = new NatpfServeMarker({ scene: null });
      for (const who of ['player', 'opponent']){
        const a = E[who], h = M.tagHeight(a), seenTop = top(a.root) - a.pos.y, allTop = top(a.root, true) - a.pos.y;
        const head = cast === 'sempre' && a.parts?.head ? top(a.parts.head) - a.pos.y : null;
        if (cast === 'lobdrop') assert.ok(a.natpfMascot3dOn, `${who}: modello 3D in campo`);
        assert.ok(h > seenTop, `${cast} ${who}: casella a ${h.toFixed(2)} m, sopra il personaggio (${seenTop.toFixed(2)} m): non lo copre`);
        assert.ok(h - seenTop <= .3, `${cast} ${who}: appena sopra (${(h - seenTop).toFixed(2)} m), non lontana`);
        if (head != null) assert.ok(h > head && h - head <= .3, `${cast} ${who}: sopra la testa (${head.toFixed(2)} m)`);
        // i pezzi nascosti non contano (nel B37 sì: con Lob & Drop la casella sarebbe stata mezzo metro più su)
        if (cast === 'lobdrop') assert.ok(allTop - seenTop > .2 && h < allTop, `${who}: pezzi nascosti fino a ${allTop.toFixed(2)} m, non contati`);
        tops[`${cast}-${who}`] = [+seenTop.toFixed(2), +h.toFixed(2)];
        // a schermo, con le camere del gioco (dietro chi batte e dal fondo opposto, 16:9): il fondo della casella sta sopra
        // la sagoma vera (tutti i vertici visibili, anche quelli del modello con la pelle) e vicino (meno del 5 % dell'altezza)
        const pt = M.tagPoint(a);
        for (const camSide of [a.sideSign, -a.sideSign]){
          const pose = splitCameraPose({ side: camSide, aspect: 16/9 }), cam = new THREE.PerspectiveCamera(pose.fov, 16/9, .1, 200);
          cam.position.fromArray(pose.pos); cam.lookAt(new THREE.Vector3().fromArray(pose.look)); cam.updateMatrixWorld();
          let sil = -Infinity; const v = new THREE.Vector3();
          a.root.updateWorldMatrix(true, true);
          a.root.traverseVisible(o => {
            if (!o.isMesh || !o.geometry?.attributes?.position) return;
            o.skeleton?.update?.();
            for (let k = 0, n = o.geometry.attributes.position.count; k < n; k++){ o.getVertexPosition(k, v); v.applyMatrix4(o.matrixWorld).project(cam); if (v.y > sil) sil = v.y; }
          });
          const y = pt.clone().project(cam).y, view = camSide === a.sideSign ? 'da dietro' : 'dal fondo opposto';
          assert.ok(y > sil, `${cast} ${who}, ${view}: casella sopra la sagoma (${y.toFixed(4)} > ${sil.toFixed(4)})`);
          assert.ok((y - sil)/2 < .05, `${cast} ${who}, ${view}: vicina alla testa (${((y - sil)/2*100).toFixed(1)} % dell'altezza)`);
        }
      }
    }
    // i modelli 3D di Lob e di Drop sono più bassi dei Classici: la casella scende con loro (prima del B37 sempre a 2,25 m)
    assert.ok(tops['lobdrop-player'][1] < tops['sempre-player'][1] && tops['lobdrop-opponent'][1] < tops['sempre-opponent'][1], JSON.stringify(tops));
  } finally { resetMascotModels(); setMascotMode(null); resetCast(); }
});
test('punto 2 · leggero: pochi oggetti, materiali senza luci, nessuna ombra', () => {
  const { M } = markerEngine();
  let meshes = 0, tris = 0;
  M.box.traverse(o => { if (!o.isMesh) return; meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count)/3; assert.equal(o.castShadow, false); assert.ok(o.material.isMeshBasicMaterial); });
  assert.ok(meshes === 5 && tris <= 10, `${meshes} mesh, ${tris} triangoli`);
});

// ---------- 3 · il segnale del momento giusto spiegato le prime volte ----------
import { NatpfTimingCue, CUE_HINT, cueHintFor, cueToast } from '../src/natpf/natpf_timing_cue.js';
import { installMatchStats } from '../src/natpf/natpf_match_stats.js';
import { readFileSync } from 'node:fs';

test('punto 3 · regola pura: spiegata solo una palla nuova tra le prime tre della partita', () => {
  assert.equal(CUE_HINT.text, 'Colpisci quando il cerchio diventa verde');
  assert.equal(CUE_HINT.balls, 3);
  assert.equal(cueHintFor({ fresh: true, shown: 0 }), true); assert.equal(cueHintFor({ fresh: true, shown: 2 }), true);
  assert.equal(cueHintFor({ fresh: true, shown: 3 }), false); assert.equal(cueHintFor({ fresh: false, shown: 0 }), false);
});

test('punto 3 · la guida, le Opzioni e la scritta dicono la stessa cosa con le stesse parole', () => {
  const guide = readFileSync(new URL('../src/natpf/natpf_onboarding.js', import.meta.url), 'utf8');
  assert.match(guide, /colpisci quando il cerchio diventa verde/i, 'guida: passo «Colpisci quando la palla arriva»');
  assert.match(cueToast('on', 'pro'), /colpisci quando il cerchio diventa verde/i);
  const cue = readFileSync(new URL('../src/natpf/natpf_timing_cue.js', import.meta.url), 'utf8');
  assert.match(cue, /Colpisci quando il cerchio diventa <b>verde<\/b>/, 'scritta a schermo');
  const np = readFileSync(new URL('../src/natpf/natpf_new_player.js', import.meta.url), 'utf8');
  assert.match(np, /ui\.cue\?\.resetHint\?\.\(\)/, '«Nuovo giocatore» la fa rivedere');
});

// motore vero senza grafica: palle della CPU verso chi gioca, il segnale e la sua scritta
function fakeHintDom(){
  const els = {}, body = { appendChild: el => { els[el.id] = el; } };
  const mk = () => { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c), toggle: (c, f) => ((f ?? !s.has(c)) ? s.add(c) : s.delete(c)), contains: c => s.has(c) }; };
  return { body, getElementById: id => els[id] || null, createElement: () => ({ classList: mk(), setAttribute(){}, set className(v){ for (const c of String(v).split(/\s+/)) if (c) this.classList.add(c); } }), els };
}
async function cueRun(level, flights, { between = null } = {}){
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random, had = globalThis.document, dom = fakeHintDom(); Math.random = mulberry32(3); globalThis.document = dom;
  try {
    const e = createHeadlessEngine({ difficulty: level }); installMatchStats(e);
    const sink = e.hud; e.hud = new Proxy({}, { get: (t, k) => (k === 'selectedDifficulty' ? undefined : sink[k]) });   // (livello dal motore)
    e.startNewMatch({ showStartBanner: false });
    const cue = new NatpfTimingCue(e); cue.pref = 'auto';
    const out = [];
    for (let f = 0; f < flights; f++){
      if (between) between(e, cue, f);
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 2*f + 1;
      e.player.pos.set(.4, 0, 11.7); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
      e.ball.pos.set(-.5, 1, -11);
      e._launchBallToTarget(e.ball.pos, new THREE.Vector3(1.6, 0, 8.5), 1.05, { topspin: 14 });
      e._natpfPlanPlayer();
      let ring = false, hint = false, hintAfter = false;
      for (let t = 0; t < 1.6; t += 1/60){
        e.elapsedTime += 1/60; e._stepPhysics(1/60); cue.update();
        ring ||= !!cue.view; hint ||= cue.hint.on;
        if (e.phase !== 'RALLY') break;
      }
      // la palla è passata: la scritta resta CUE_HINT.hold secondi, poi sparisce
      e.phase = 'POINT_OVER'; e.ball.inPlay = false;
      for (let t = 0; t < 1; t += 1/60){ e.elapsedTime += 1/60; cue.update(); }
      hintAfter = cue.hint.on;
      out.push({ ring, hint, hintAfter, el: !dom.els['natpf-cue-hint']?.classList.contains('hidden') });
    }
    return { out, e, cue, dom };
  } finally { Math.random = real; if (had === undefined) delete globalThis.document; else globalThis.document = had; }
}
test('punto 3 · motore: con il segnale acceso la scritta accompagna le prime tre palle della partita, poi basta', async () => {
  const { out, dom } = await cueRun('evento', 5);
  assert.ok(out.every(o => o.ring), `l'anello c'è su ogni palla: ${JSON.stringify(out)}`);
  assert.deepEqual(out.map(o => o.hint), [true, true, true, false, false]);
  assert.ok(out.every(o => !o.hintAfter && !o.el), 'sparisce dopo la palla');
  assert.ok(dom.els['natpf-cue-hint'], 'scritta creata nella pagina');
});
test('punto 3 · partita nuova o giocatore nuovo: la scritta si rivede; segnale spento: nessuna scritta', async () => {
  const again = await cueRun('evento', 5, { between: (e, cue, f) => { if (f === 3) e.startNewMatch({ showStartBanner: false }); } });
  assert.deepEqual(again.out.map(o => o.hint), [true, true, true, true, true], 'partita nuova dopo tre palle');
  const reset = await cueRun('evento', 5, { between: (e, cue, f) => { if (f === 4) cue.resetHint(); } });
  assert.deepEqual(reset.out.map(o => o.hint), [true, true, true, false, true], '«Nuovo giocatore»');
  const off = await cueRun('pro', 3);
  assert.deepEqual(off.out.map(o => [o.ring, o.hint]), [[false, false], [false, false], [false, false]], 'a Pro di base niente anello e niente scritta');
});

test('punto 1 · palla della CPU che va fuori: nessun segno prima che tocchi terra, punto e telefono all\'atterraggio', async () => {
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(9);
  await withDom(async () => {
    try {
      const e = createHeadlessEngine({ difficulty: 'casual' }); e.startNewMatch({ showStartBanner: false });
      const log = [], stamp = k => x => log.push({ k, t: e.elapsedTime, ...x });
      const hud = e.hud; e.hud = new Proxy({}, { get: (t, k) => k in t ? t[k] : k === 'showTimingPopup' ? (o => stamp('scritta')({ txt: o.grade })) : k === 'showCenterBanner' ? (txt => stamp('banner')({ txt })) : hud[k] });
      e.scene = { add(){} };
      const fb = new NatpfShotFeedback(e), { ph, sent } = phoneSink('p1');
      e.natpfUi = { feedback: ev => fb.onLocalFeedback(ev), shot: fb }; e.natpfPhone = ph;
      e.motionController = { triggerHapticFeedback: ev => { stamp('aptica')({ kind: ev.kind }); relayPhoneFeedback(e, ev); } };
      const aw = e._awardPoint.bind(e); e._awardPoint = (w, why) => { stamp('punto')({ w, why, y: +e.ball.pos.y.toFixed(3) }); return aw(w, why); };
      // la CPU colpisce largo, chi gioca è lontano e non la prende
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 4;
      e.player.pos.set(-3, 0, 11.7); e.player.targetPos.copy(e.player.pos);
      e.ball.pos.set(0, 1, -11); e._launchBallToTarget(e.ball.pos, new THREE.Vector3(5.6, 0, 9), 1.1, { topspin: 14 });
      const t0 = e.elapsedTime;
      for (let t = 0; t < 4 && e.phase === 'RALLY'; t += DT) e.step(DT);
      const pt = log.find(l => l.k === 'punto');
      assert.ok(pt && pt.w === 'player' && pt.why === 'Out' && pt.y < .1, JSON.stringify(log));
      assert.ok(pt.t - t0 > .8, 'la palla ha volato');
      assert.ok(log.filter(l => l.t < pt.t).every(l => l.k === 'punto'), `niente prima dell'atterraggio: ${JSON.stringify(log.filter(l => l.t < pt.t))}`);
      // B43: telefono e punto all'atterraggio, la scritta grande mezzo secondo dopo (prima: insieme)
      assert.ok(log.some(l => l.k === 'aptica' && l.kind === 'point_won' && l.t === pt.t) && !log.some(l => l.k === 'banner'));
      for (let t = 0; t < .6; t += DT) e.step(DT);
      const bn = log.filter(l => l.k === 'banner');
      assert.ok(bn.length === 1 && Math.abs(bn[0].t - pt.t - .5) <= DT + 1e-6, `scritta del punto 0,5 s dopo: ${JSON.stringify(bn)}, a terra ${pt.t}`);
      assert.ok(sent.some(m => m.k === 'point' && m.mine === true), 'telefono: «Punto tuo» all\'atterraggio');
    } finally { Math.random = real; }
  });
});

test('punto 1 · sfida tra due computer: sul computer del Player 2 il suo «Fuori» arriva con la palla a terra o con il punto dell\'host', () => withDom(() => {
  // il P2 tira verso z > 0: bersaglio fuori largo nella metà dell'host
  const M = fakeMatch({ target: { x: -6, z: 8 } });
  Object.assign(M.engine, { playerRole: 'p2', isMultiplayer: true });
  M.engine.ball.lastHitter = 'opponent';
  M.engine.natpfPhone = phoneSink('p2').ph; const sentP2 = []; M.engine.natpfPhone.link = { send: m => sentP2.push(m) };
  M.engine.hud.showTimingPopup({ grade: 'P2 VERY EARLY • CROSS-COURT!', detail: '90 KM/H' });
  relayPhoneFeedback(M.engine, { role: 'p2', kind: 'hit', grade: 'VERY EARLY • CROSS-COURT', shotType: 'TOPSPIN' });
  assert.equal(M.shown.length, 0, 'al colpo nessun «Fuori» sul computer del P2');
  assert.equal(sentP2[0].wait, 1, 'telefono del P2: neutro al colpo');
  // la palla dell'host comanda: il numero del colpo può cambiare con gli snapshot, il verdetto aspetta lo stesso
  M.engine.ball.rallyStrokeCount = 7; M.fb.update(1/60);
  assert.ok(M.fb.verdict, 'sul P2 il verdetto resta in attesa anche se lo snapshot cambia il numero del colpo');
  // arriva la scritta del punto dall'host (motivo «Out»)
  M.engine.elapsedTime += .9;
  assert.equal(M.fb.settle(null, 'Out', { remote: true }), true);
  assert.equal(M.shown.length, 1); assert.equal(M.shown[0].grade, 'Fuori · troppo presto');
  assert.equal(sentP2[1].late, 1); assert.equal(sentP2[1].out, true);
}));
