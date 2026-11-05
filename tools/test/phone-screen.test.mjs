// Pagina del telefono (B9, 05/11): una sola schermata alla volta (phone-screen.js), «Tutto chiaro, ho capito» spento finché
// il computer non dice che si sono viste tutte le schede, mai sopra «Pronto»; Ricalibra/Ricollega/Scollega solo sotto
// «Pronto». Più la correzione del CSS che mostrava la riga «Presa» nascosta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { phoneView, screenOf, PHONE_SCREENS, gateOnCfg, gateOnProgress, gateRestore, gateNav, tutConfirmable, sensorOnGateOpen,
  sensorOnGateClose, sensorForCal, reportedSensor, tutorialTexts } from '../../site/js/tennis/phone-screen.js';

const LINKS = ['off', 'connecting', 'on', 'lost', 'denied'];
const SENSORS = ['off', 'denied', 'nomotion', 'insecure', 'idle', 'cal', 'ready'];
const STEPS = [null, 'still', 'grip', 'swings', 'review', 'free', 'done'];
const G2 = { v: 2, i: 3, n: 11, s: 4, m: 0b1111, all: false, name: 'Rovescio' };
const GATES = [null, { ...G2 }, { ...G2, all: true, s: 11 }, { v: 1, i: 0, n: 0, s: 0, m: 0, all: false, name: '' }];

test('schermate esclusive: in ogni combinazione una sola, «ho capito» solo nel tutorial, strumenti solo in «Pronto»', () => {
  let n = 0;
  for (const linkState of LINKS) for (const sensor of SENSORS) for (const gate of GATES) for (const inputMode of ['motion', 'touch']) for (const calStep of STEPS){
    const v = phoneView({ linkState, sensor, gate, inputMode, calStep, hasPair: true });
    n++;
    assert.ok(PHONE_SCREENS.includes(v.screen));
    assert.equal(v.screen, screenOf({ linkState, sensor, gate }));
    const ctx = JSON.stringify({ linkState, sensor, gate: !!gate, inputMode, calStep, screen: v.screen });
    // il difetto del 05/11: «Tutto chiaro» e «Pronto» (con Ricalibra, Ricollega, Scollega) insieme
    assert.ok(!(v.show['#tutOk'] && v.show['#tools']), ctx);
    assert.equal(v.show['#tutOk'], v.screen === 'tutorial', ctx);
    assert.equal(v.show['#tutBox'], v.screen === 'tutorial', ctx);
    assert.equal(v.show['#tools'], v.screen === 'ready', ctx);
    // nel tutorial: niente opzioni, «Gioca con i tocchi», pannello dei colpi
    if (v.screen === 'tutorial') for (const k of ['#profileOptions', '#enableTouch', '#shotPanel', '#enable', '#retry']) assert.equal(v.show[k], false, `${k} ${ctx}`);
    // in calibrazione niente Ricalibra/Ricollega/Scollega (scelta del 05/11)
    if (v.screen === 'cal') assert.equal(v.show['#tools'], false, ctx);
    if (linkState !== 'on') assert.equal(v.screen, 'link', ctx);
    // telefono pronto con il tutorial aperto dal computer: schermata del tutorial, non «Pronto»
    if (linkState === 'on' && sensor === 'ready' && gate) assert.equal(v.screen, 'tutorial', ctx);
  }
  assert.ok(n > 1000);
});

test('«Tutto chiaro, ho capito»: spento fino all\'ultima scheda vista (computer v2), acceso subito con un computer di prima', () => {
  const on = gate => phoneView({ linkState: 'on', sensor: 'idle', gate }).tutOk.on;
  let g = gateOnCfg(null, { tut: 1, tv: 2 });
  assert.deepEqual(g, { v: 2, i: 0, n: 0, s: 0, m: 0, all: false, name: '' });
  assert.equal(on(g), false, 'appena aperto: spento');
  for (let s = 1; s < 11; s++){ g = gateOnProgress(g, { i: s - 1, n: 11, s, m: (1 << s) - 1, all: 0, nm: 'X' }); assert.equal(on(g), false, `viste ${s}`); }
  g = gateOnProgress(g, { i: 10, n: 11, s: 11, m: 2047, all: 1, nm: 'Volée' });
  assert.equal(on(g), true, 'tutte viste: acceso'); assert.equal(g.name, 'Volée');
  // indietro: resta acceso (il computer è la fonte di verità, «all» non torna falso nella stessa apertura)
  g = gateOnProgress(g, { i: 2, n: 11, s: 11, m: 2047, all: 0 });
  assert.equal(on(g), true); assert.equal(g.i, 2);
  // cfg ripetuto (ricollegamento, cambio di mano) con il tutorial aperto: l'avanzamento resta
  assert.equal(gateOnCfg(g, { tut: 1, tv: 2 }).all, true); assert.equal(gateOnCfg(g, { tut: 1, tv: 2 }).i, 2);
  // il computer chiude il tutorial: niente cancello
  assert.equal(gateOnCfg(g, {}), null);
  // computer di prima (cfg tut senza tv): pulsante acceso subito, niente frecce (non le capirebbe)
  const old = gateOnCfg(null, { tut: 1 });
  assert.equal(on(old), true); assert.deepEqual(gateNav(old), { show: false, prev: false, next: false });
  assert.equal(tutConfirmable(null), false);
  // valori strani dal computer: limitati
  const odd = gateOnProgress(gateOnCfg(null, { tut: 1, tv: 2 }), { i: 99, n: 5, s: -3 });
  assert.equal(odd.i, 4); assert.equal(odd.s, 0);
});

test('frecce del telefono: spente agli estremi', () => {
  assert.deepEqual(gateNav({ ...G2, i: 0 }), { show: true, prev: false, next: true });
  assert.deepEqual(gateNav({ ...G2, i: 5 }), { show: true, prev: true, next: true });
  assert.deepEqual(gateNav({ ...G2, i: 10 }), { show: true, prev: true, next: false });
  assert.deepEqual(gateNav(null), { show: false, prev: false, next: false });
});

// Simulazione della pagina con le funzioni pure, nell'ordine in cui le usa racchetta.js
function phone(){
  const setGate = g => { P.gate = g; P.store = g ? JSON.parse(JSON.stringify(g)) : null; };
  const P = {
    linkState: 'on', sensor: 'off', gate: null, store: null, sent: [],
    get screen(){ return phoneView(P).screen; },
    get okOn(){ return phoneView(P).tutOk.on; },
    enable(profile = false){ P.sensor = profile ? 'ready' : sensorForCal(P.gate); },
    cfg(d){ const was = P.gate; setGate(gateOnCfg(P.gate, d)); if (P.gate){ P.sent.push({ t: 'tut', w: 1, v: 2 }); if (!was) P.sensor = sensorOnGateOpen(P.sensor); } else if (was && P.sensor === 'idle') P.sensor = 'cal'; },
    tp(d){ if (P.gate) setGate(gateOnProgress(P.gate, d)); },
    ok(){ if (!tutConfirmable(P.gate)) return false; setGate(null); P.sent.push({ t: 'tut', ok: 1 }); P.sensor = sensorOnGateClose(P.sensor); return true; },
    recal(){ P.sensor = sensorForCal(P.gate); },
    confirm(){ P.sensor = 'ready'; },
    reload(){ P.gate = gateRestore(P.store); P.sensor = 'off'; P.linkState = 'connecting'; },
    welcome(){ P.linkState = 'on'; },
  };
  return P;
}
const ALL = { i: 10, n: 11, s: 11, m: 2047, all: 1 };

test('macchina del telefono: tutorial → calibrazione → «Pronto»; mai «ho capito» sopra «Pronto»', () => {
  const p = phone();
  assert.equal(p.screen, 'enable');
  p.cfg({ tut: 1, tv: 2 });                  // il computer apre il tutorial prima che si attivino i sensori
  assert.equal(p.screen, 'enable', 'prima «Attiva i sensori»');
  p.enable();
  assert.equal(p.sensor, 'idle'); assert.equal(p.screen, 'tutorial'); assert.equal(p.okOn, false);
  assert.equal(reportedSensor(p.sensor), 'tut', 'il computer legge «tut» (non pronto)');
  assert.equal(p.ok(), false, 'spento: il tocco non fa niente');
  p.tp({ i: 0, n: 11, s: 1, m: 1, all: 0 }); assert.equal(p.okOn, false);
  p.tp(ALL); assert.equal(p.okOn, true);
  assert.equal(p.ok(), true); assert.equal(p.sensor, 'cal'); assert.equal(p.screen, 'cal');
  p.confirm(); assert.equal(p.screen, 'ready');
  // «Ricalibra» da «Pronto»: calibrazione, il tutorial non torna
  p.recal(); assert.equal(p.screen, 'cal'); p.confirm(); assert.equal(p.screen, 'ready');
});

test('macchina del telefono: già calibrato quando il computer apre il tutorial → tutorial, poi direttamente «Pronto»', () => {
  const p = phone();
  p.enable(true); assert.equal(p.screen, 'ready');
  p.cfg({ tut: 1, tv: 2 });
  assert.equal(p.sensor, 'ready', 'il profilo resta'); assert.equal(p.screen, 'tutorial', 'non «Pronto»');
  assert.equal(reportedSensor(p.sensor), 'ready', 'per il computer resta pronto (niente pausa sopra la modale)');
  p.tp(ALL); p.ok();
  assert.equal(p.screen, 'ready', 'dopo «ho capito» niente calibrazione');
  assert.match(tutorialTexts({ ...G2, all: true }, { sensor: 'ready' }).sub, /poi si gioca/);
  assert.match(tutorialTexts({ ...G2, all: true }, { sensor: 'idle' }).sub, /poi si calibra/);
});

test('macchina del telefono: calibrazione in corso interrotta dal tutorial riparte dopo; il computer che chiude il tutorial fa calibrare', () => {
  const p = phone();
  p.enable(); assert.equal(p.sensor, 'cal');
  p.cfg({ tut: 1, tv: 2 }); assert.equal(p.sensor, 'idle'); assert.equal(p.screen, 'tutorial');
  // «Ricalibra» (comando del computer) o segno dei sensori cambiato con il tutorial aperto: si aspetta la fine
  p.recal(); assert.equal(p.sensor, 'idle'); assert.equal(p.screen, 'tutorial');
  // Esc sul computer: cfg senza tut → si calibra
  p.cfg({}); assert.equal(p.gate, null); assert.equal(p.sensor, 'cal'); assert.equal(p.screen, 'cal');
});

test('macchina del telefono: ricollegamento e pagina ricaricata riprendono dalla scheda raggiunta, mai un lampo di «Pronto»', () => {
  const p = phone();
  p.enable(true); p.cfg({ tut: 1, tv: 2 }); p.tp({ i: 6, n: 11, s: 7, m: 127, all: 0 });
  // ricollegamento (schermo spento, «Ricollega»): il cancello resta, il computer rimanda cfg e tp
  p.linkState = 'lost'; assert.equal(p.screen, 'link'); p.welcome();
  assert.equal(p.screen, 'tutorial'); assert.equal(p.gate.i, 6);
  p.cfg({ tut: 1, tv: 2 }); p.tp({ i: 6, n: 11, s: 7, m: 127, all: 0 }); assert.equal(p.gate.s, 7);
  // pagina ricaricata: il cancello torna dalla scheda (sessionStorage); dopo «Attiva i sensori» il tutorial, non «Pronto»
  p.reload(); assert.equal(p.gate.i, 6); assert.equal(p.gate.all, false); p.welcome();
  assert.equal(p.screen, 'enable'); p.enable(true); assert.equal(p.screen, 'tutorial'); assert.equal(p.okOn, false);
  // il computer nel frattempo ha chiuso il tutorial (Esc): al primo cfg il cancello sparisce
  p.cfg({}); assert.equal(p.screen, 'ready');
  assert.equal(gateRestore(null), null); assert.equal(gateRestore({ v: 3 }), null); assert.equal(gateRestore('x'), null);
});

test('stato per il computer e tocco del telefono: «sensors», «tut», poi gli altri come sono', () => {
  assert.equal(reportedSensor('off'), 'sensors'); assert.equal(reportedSensor('idle'), 'tut');
  for (const s of ['cal', 'ready', 'denied']) assert.equal(reportedSensor(s), s);
  assert.equal(sensorOnGateOpen('cal'), 'idle'); assert.equal(sensorOnGateOpen('ready'), 'ready'); assert.equal(sensorOnGateOpen('off'), 'off');
  assert.equal(sensorOnGateClose('idle'), 'cal'); assert.equal(sensorOnGateClose('ready'), 'ready');
  assert.equal(sensorForCal(null), 'cal'); assert.equal(sensorForCal(G2), 'idle');
});

const HTML = readFileSync(new URL('../../site/tennis/racchetta.html', import.meta.url), 'utf8');
const JS = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
test('pagina del telefono: [hidden] vince sulle regole dei label (riga «Presa» nascosta), elementi del tutorial e del velo', () => {
  assert.match(HTML, /\[hidden\]\{display:none!important\}/);
  assert.match(HTML, /<label hidden>Presa/);
  for (const id of ['tutOk', 'tutBox', 'tutWhere', 'tutDots', 'tutHint', 'tutPrev', 'tutNext', 'wakeVeil']) assert.match(HTML, new RegExp(`id="${id}"`), id);
  assert.match(HTML, /id="tutOk"[^>]*disabled/, '«ho capito» parte spento');
  // nessuna condizione propria per «ho capito» e per gli strumenti: solo phoneView
  assert.doesNotMatch(JS, /show\('#tutOk'/); assert.doesNotMatch(JS, /show\('#tools'/);
  assert.doesNotMatch(JS, /tutWait/);
});
