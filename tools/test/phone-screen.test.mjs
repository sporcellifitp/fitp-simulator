// Pagina del telefono (B9, 05/11): una sola schermata alla volta (phone-screen.js), «Tutto chiaro, ho capito» mai sopra
// «Pronto»; Ricalibra/Ricollega/Scollega solo sotto «Pronto». Più la correzione del CSS che mostrava la riga «Presa»
// nascosta. B28 (12/11, richiesta dell'utente allo stand): «Tutto chiaro, ho capito» è acceso DA SUBITO, da qualunque
// scheda (prima restava spento finché il computer non diceva che si erano viste tutte le schede).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countFlash, eventFlash, phoneView, screenOf, PHONE_SCREENS, gateOnCfg, gateOnProgress, gateRestore, gateNav, tutConfirmable, sensorOnGateOpen,
  sensorOnGateClose, sensorForCal, reportedSensor, tutorialTexts, veilText, VEIL_LEAD } from '../../site/js/tennis/phone-screen.js';

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
    if (v.screen === 'tutorial') for (const k of ['#profileOptions', '#moreOpts', '#enableTouch', '#shotPanel', '#enable', '#retry']) assert.equal(v.show[k], false, `${k} ${ctx}`);
    // «Opzioni» (movimento, «solo mentre tengo premuto») insieme alla riga della mano (B15): prima di attivare i sensori,
    // con i sensori che non vanno e alla verifica della calibrazione
    assert.equal(v.show['#moreOpts'], v.show['#profileOptions'], ctx);
    if (v.screen === 'enable') assert.equal(v.show['#profileOptions'], true, `mano in vista prima di «Attiva i sensori» ${ctx}`);
    // «Gioca con i tocchi» resta come via d'uscita nella calibrazione (prova del sito gesture-calibration), mai in «Pronto»
    if (v.screen === 'cal' || v.screen === 'enable') assert.equal(v.show['#enableTouch'], inputMode !== 'touch', `#enableTouch ${ctx}`);
    if (v.screen === 'ready') assert.equal(v.show['#enableTouch'], false, `#enableTouch ${ctx}`);
    // in calibrazione niente Ricalibra/Ricollega/Scollega (scelta del 05/11)
    if (v.screen === 'cal') assert.equal(v.show['#tools'], false, ctx);
    if (linkState !== 'on') assert.equal(v.screen, 'link', ctx);
    // telefono pronto con il tutorial aperto dal computer: schermata del tutorial, non «Pronto»
    if (linkState === 'on' && sensor === 'ready' && gate) assert.equal(v.screen, 'tutorial', ctx);
  }
  assert.ok(n > 1000);
});

test('«Tutto chiaro, ho capito»: acceso da subito, da qualunque scheda (B28); le schede viste restano come informazione', () => {
  const on = gate => phoneView({ linkState: 'on', sensor: 'idle', gate }).tutOk.on;
  let g = gateOnCfg(null, { tut: 1, tv: 2 });
  assert.deepEqual(g, { v: 2, i: 0, n: 0, s: 0, m: 0, all: false, name: '' });
  assert.equal(on(g), true, 'appena aperto: acceso'); assert.equal(tutConfirmable(g), true);
  // anche con un computer di prima che manda all 0 finché non si sono viste tutte: il pulsante è acceso lo stesso
  for (let s = 1; s < 11; s++){ g = gateOnProgress(g, { i: s - 1, n: 11, s, m: (1 << s) - 1, all: 0, nm: 'X' }); assert.equal(on(g), true, `viste ${s}`); assert.equal(g.s, s); }
  assert.equal(g.all, false, 'schede non tutte viste (informazione)');
  g = gateOnProgress(g, { i: 10, n: 11, s: 11, m: 2047, all: 1, nm: 'Volée' });
  assert.equal(on(g), true); assert.equal(g.name, 'Volée'); assert.equal(g.all, true);
  // indietro: «all» non torna falso nella stessa apertura
  g = gateOnProgress(g, { i: 2, n: 11, s: 11, m: 2047, all: 0 });
  assert.equal(on(g), true); assert.equal(g.i, 2);
  // fuori dal tutorial il pulsante non c'è
  assert.equal(phoneView({ linkState: 'on', sensor: 'ready', gate: null }).tutOk.on, false);
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
  assert.equal(p.sensor, 'idle'); assert.equal(p.screen, 'tutorial'); assert.equal(p.okOn, true, 'acceso da subito (B28)');
  assert.equal(reportedSensor(p.sensor), 'tut', 'il computer legge «tut» (non pronto)');
  p.tp({ i: 0, n: 11, s: 1, m: 1, all: 0 }); assert.equal(p.okOn, true);
  // «ho capito» dalla prima scheda: il tutorial si chiude e il telefono va avanti
  assert.equal(p.ok(), true); assert.equal(p.sensor, 'cal'); assert.equal(p.screen, 'cal');
  assert.deepEqual(p.sent.at(-1), { t: 'tut', ok: 1 });
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
  // testi (B28): una frase sola, «quando vuoi», senza «poi si calibra» (di base la calibrazione si fa giocando)
  for (const g of [{ ...G2 }, { ...G2, all: true }, { v: 1, i: 0, n: 0, s: 0, m: 0, all: false, name: '' }]) for (const sensor of ['ready', 'idle']){
    const t = tutorialTexts(g, { sensor });
    assert.match(t.sub, /Quando vuoi tocca «Tutto chiaro, ho capito»/); assert.doesNotMatch(t.sub + t.hint, /si calibra|alla fine si accende/);
  }
  assert.equal(tutorialTexts({ ...G2 }).hint, 'Viste 4 di 11'); assert.equal(tutorialTexts({ ...G2 }).where, 'Scheda 4 di 11 · Rovescio');
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
  assert.equal(p.screen, 'enable'); p.enable(true); assert.equal(p.screen, 'tutorial'); assert.equal(p.okOn, true);
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

// «Attiva i sensori» (B15, 2° giro): un pulsante grande; la mano resta in vista sopra (Destra / Sinistra, la scelta vera è
// il <select id="hand"> nascosto, che il computer aggiorna con cfg); movimento e «solo mentre tengo premuto» in «Opzioni»,
// chiuse; «Gioca con i tocchi» resta (link sotto il pulsante)
test('pagina del telefono: «Attiva i sensori» con la mano in vista, il resto sotto «Opzioni» chiuse', () => {
  const opts = HTML.slice(HTML.indexOf('<div id="profileOptions"'), HTML.indexOf('</div>', HTML.indexOf('<div id="profileOptions"')));
  assert.match(opts, /data-hand="right"[^>]*>Destra</); assert.match(opts, /data-hand="left"[^>]*>Sinistra</);
  assert.match(opts, /<label hidden>Mano <select id="hand">/, 'la scelta resta nel select (nascosto)');
  assert.doesNotMatch(opts, /motionRange|intentGate/, 'movimento e «tengo premuto» non sono nella riga della mano');
  const more = HTML.slice(HTML.indexOf('<details id="moreOpts"'), HTML.indexOf('</details>'));
  assert.match(more, /^<details id="moreOpts" class="hidden"><summary>Opzioni<\/summary>/, 'chiuse (niente «open»)');
  assert.match(more, /id="motionRange"/); assert.match(more, /id="intentGate"/);
  assert.ok(HTML.indexOf('<div id="profileOptions"') < HTML.indexOf('id="enable"'), 'la mano sta sopra «Attiva i sensori»');
  assert.ok(HTML.indexOf('id="enable"') < HTML.indexOf('<details id="moreOpts"'), '«Opzioni» sotto il pulsante');
  assert.match(HTML, /id="enableTouch"/);
  // i due pulsanti cambiano il select e passano dallo stesso «change» (applyHand + messaggio al computer)
  assert.match(JS, /\$\('#hand'\)\.dispatchEvent\(new Event\('change'\)\)/);
  assert.match(JS, /function paintHand\(\)/);
});

// conto alla rovescia dello stesso schermo sul telefono (revisione B9 del 06/11): anello rosso solo per un problema,
// «Aspetta» premuto sul computer (soft) con l'anello neutro; il velo dopo il ritorno non dice «lo schermo si era spento»
// (si torna anche da un'altra app)
test('telefono: conto 3, 2, 1, «Si gioca!»; «Aspetta» dal computer neutro, annullato per un telefono in rosso; velo neutro', () => {
  assert.deepEqual(countFlash({ n: 3 }), { ring: 'ready', big: 'Si gioca tra', sub: 'Tieni il telefono come in partita.', ms: 1150, arrow: '3', buzz: [25] });
  assert.deepEqual(countFlash({ n: 0 }), { ring: 'ready', big: 'Si gioca!', sub: '', ms: 1000, arrow: '', buzz: [70] });
  const held = countFlash({ stop: 1, soft: 1, txt: 'Partenza fermata sul computer.' });
  assert.equal(held.ring, '', '«Aspetta» sul computer: niente anello rosso'); assert.equal(held.big, 'Aspetta'); assert.equal(held.sub, 'Partenza fermata sul computer.');
  const ko = countFlash({ stop: 1, txt: 'Conto annullato · Marco: schermo spento' });
  assert.equal(ko.ring, 'miss', 'un telefono non più pronto: rosso'); assert.match(ko.sub, /Marco: schermo spento/);
  assert.equal(countFlash({ stop: 1 }).sub, 'Guarda il computer.');
  assert.equal(countFlash({ stop: 1, txt: 'x'.repeat(300) }).sub.length, 140);
  assert.match(JS, /countFlash\(d\)/, 'la pagina usa countFlash');
  assert.doesNotMatch(HTML, /si era spento/); assert.match(HTML, /id="wakeVeilText">Bentornato:/);
});

// Revisione B9 (06/11), minore: il velo dello schermo riacceso diceva sempre «Il collegamento e la calibrazione sono
// rimasti», anche nel tutorial o a calibrazione non finita. Ora la calibrazione solo se il telefono era calibrato
test('telefono: velo dello schermo riacceso con il testo giusto (calibrato, tutorial, calibrazione in corso, collegamento perso)', () => {
  const kept = o => veilText(o).slice(VEIL_LEAD.length + 1);
  for (const o of [{ sensor: 'ready' }, { sensor: 'ready', gate: { v: 2 } }, { sensor: 'idle', gate: { v: 2 } }, { sensor: 'cal' }, { sensor: 'idle' }, { linkState: 'lost', sensor: 'cal' }, { linkState: 'lost', sensor: 'ready' }])
    assert.ok(veilText(o).startsWith(VEIL_LEAD + ' '), JSON.stringify(o));
  assert.equal(kept({ sensor: 'ready' }), 'Il collegamento e la calibrazione sono rimasti.');
  assert.equal(kept({ sensor: 'ready', gate: { v: 2 } }), 'Il collegamento e la calibrazione sono rimasti; il tutorial è ancora sul computer.');
  assert.equal(kept({ sensor: 'idle', gate: { v: 2, i: 3, n: 11 } }), 'Il collegamento è rimasto e il tutorial è ancora sul computer: riprendi da dove eri, poi si calibra.');
  assert.equal(kept({ sensor: 'cal' }), 'Il collegamento è rimasto: la calibrazione continua dal passo in cui eri.');
  assert.equal(kept({ linkState: 'lost', sensor: 'ready' }), 'La calibrazione è rimasta; il collegamento riparte da solo.');
  // «calibrazione» rimasta solo con il telefono calibrato
  for (const linkState of LINKS) for (const sensor of SENSORS) for (const gate of [null, { v: 2 }])
    assert.equal(/calibrazione (sono|è) rimast/.test(veilText({ linkState, sensor, gate })), sensor === 'ready', JSON.stringify({ linkState, sensor, gate }));
  // la pagina lo usa quando mostra il velo; il testo fisso dell'HTML non promette la calibrazione
  assert.match(JS, /veilText\(\{ linkState, sensor, gate \}\)/);
  assert.match(HTML, /id="wakeVeilText">Bentornato: un tocco tiene acceso lo schermo e riattiva i sensori\.<\/p>/);
});

// B15 (secondo giro, 08/11): la scritta della calibrazione legge il percorso fissato all'avvio (calibration.js S.plan),
// non quello ricalcolato dalla mano di adesso: cambiando mano a metà (applyHand) i passi ancora da fare non si girano
test('telefono: la scritta della calibrazione segue il percorso fissato all’avvio, non la mano cambiata a metà', () => {
  assert.match(JS, /const plan = st\.plan \|\| calibrationPlan\(st\.options\)/);
  assert.doesNotMatch(JS, /const plan = calibrationPlan\(st\.options\)/);
});

// B18 (difetto 10 dell'audit B16): il telefono dice la stessa cosa del computer. Prima ignorava «fuori» e diceva
// «In anticipo» mentre il grande schermo diceva «Fuori»; «Punto avversario» compariva anche per un colpo difensivo con la
// palla ancora in gioco (il computer mandava «fault»: ora solo a punto finito)
test('telefono: esito del colpo come il computer (Fuori/In rete con il perché), punto con il motivo in italiano', () => {
  assert.deepEqual(eventFlash({ k: 'contact', label: 'anticipo', shot: 'drive', out: true, net: false, why: 'troppo presto' }),
    { ring: 'miss', big: 'Fuori', sub: 'Troppo presto', ms: 900, buzz: [20] });
  assert.deepEqual(eventFlash({ k: 'contact', label: 'ritardo', shot: 'slice', net: true, why: 'in ritardo' }),
    { ring: 'miss', big: 'In rete', sub: 'In ritardo · Tagliato', ms: 900, buzz: [20] });
  assert.equal(eventFlash({ k: 'contact', label: 'perfetto', shot: 'drive', out: true }).sub, '', 'fuori senza errore di tempo: niente perché');
  // in campo come prima
  assert.deepEqual(eventFlash({ k: 'contact', label: 'anticipo', shot: 'drive' }), { ring: 'hit', big: 'In anticipo', sub: '', ms: 650, buzz: [20] });
  assert.equal(eventFlash({ k: 'contact', label: 'perfetto', shot: 'lob' }).big, 'Lob!');
  assert.deepEqual(eventFlash({ k: 'contact', label: 'perfetto' }).buzz, [40]);
  // messaggio di un gioco di una versione precedente (solo out): resta leggibile
  assert.equal(eventFlash({ k: 'contact', label: 'anticipo', out: true }).big, 'Fuori');
  // colpi a vuoto e punti
  assert.equal(eventFlash({ k: 'miss', why: 'tardi' }).big, 'Troppo tardi');
  assert.equal(eventFlash({ k: 'miss', why: 'boh' }).big, 'Mancata');
  // lancio del servizio senza battuta (B18, miglioramento 2): come il grande schermo, più a lungo
  assert.deepEqual(eventFlash({ k: 'miss', why: 'lancio' }), { ring: 'miss', big: 'Lancio a vuoto', sub: 'Colpisci quando la palla è in alto. Alza il telefono e riprova.', ms: 1800, buzz: [90] });
  assert.deepEqual(eventFlash({ k: 'point', mine: false, txt: 'Fuori' }), { ring: 'miss', big: 'Punto avversario', sub: 'Fuori', ms: 1300, buzz: null });
  assert.equal(eventFlash({ k: 'point', mine: true, txt: 'Vincente' }).big, 'Punto tuo');
  assert.equal(eventFlash({ k: 'contact', why: 'x'.repeat(100), out: true }).sub.length, 40);
  assert.equal(eventFlash({ k: 'count' }), null);
  assert.match(JS, /eventFlash\(d\)/, 'la pagina usa eventFlash');
});

/* ---------- B20: stesso schermo, «Rivincita» dai telefoni e pausa per il telefono dell'altro ---------- */
import { rematchOnMsg, rematchView, pauseNote } from '../../site/js/tennis/phone-screen.js';

test('B20: «Rivincita» solo a fine partita, sotto «Pronto», quando il computer la offre', () => {
  const base = { linkState: 'on', sensor: 'ready', gate: null };
  const r = rematchOnMsg({ t: 'rm', on: 1, me: 0, ot: 0, nm: 'Giulia' });
  assert.deepEqual(r, { me: false, other: false, name: 'Giulia' });
  assert.equal(phoneView({ ...base, phase: 'over', rematch: r }).show['#rematch'], true);
  assert.equal(phoneView({ ...base, phase: 'over', rematch: null }).show['#rematch'], false, 'computer di prima o contro la CPU: niente pulsante');
  assert.equal(phoneView({ ...base, phase: 'play', rematch: r }).show['#rematch'], false, 'in partita mai');
  assert.equal(phoneView({ ...base }).show['#rematch'], false);
  assert.equal(phoneView({ ...base, sensor: 'cal', phase: 'over', rematch: r }).show['#rematch'], false, 'solo sotto «Pronto»');
  assert.equal(phoneView({ ...base, linkState: 'lost', phase: 'over', rematch: r }).show['#rematch'], false);
  assert.equal(rematchOnMsg({ t: 'rm', on: 0 }), null);
  assert.equal(rematchOnMsg({}), null);
  assert.equal(rematchOnMsg({ on: 1, nm: 'x'.repeat(80) }).name.length, 24);
});

test('B20: testi della rivincita sul telefono (chi l\'ha chiesta, chi manca)', () => {
  assert.deepEqual(rematchView({ me: false, other: false, name: 'Giulia' }), { label: 'Rivincita', disabled: false, big: 'Partita finita', sub: 'Tocca «Rivincita» per rigiocare: si riparte quando la chiedete tutti e due.' });
  assert.deepEqual(rematchView({ me: false, other: true, name: 'Giulia' }), { label: 'Rivincita', disabled: false, big: 'Partita finita', sub: 'Giulia vuole la rivincita: tocca «Rivincita».' });
  assert.deepEqual(rematchView({ me: true, other: false, name: 'Giulia' }), { label: 'Rivincita chiesta ✓', disabled: true, big: 'Rivincita chiesta', sub: 'Aspetto Giulia: deve toccare «Rivincita» sul suo telefono.' });
  assert.equal(rematchView({ me: true, other: true, name: 'Giulia' }).sub, 'Si riparte…');
  assert.match(rematchView({ me: true, other: false, name: '' }).sub, /Aspetto l’altro giocatore/);
  assert.equal(rematchView(null), null);
});

test('B20: la pausa per il telefono dell\'altro giocatore dice perché; senza testo resta la frase di sempre', () => {
  assert.equal(pauseNote({ t: 'ph', ph: 'pause', txt: 'Partita in pausa: aspetto il telefono di Giulia. Si riprende da soli.' }), 'Partita in pausa: aspetto il telefono di Giulia. Si riprende da soli.');
  assert.equal(pauseNote({ t: 'ph', ph: 'pause' }), '');
  assert.equal(pauseNote({ t: 'ph', ph: 'play', txt: 'x' }), '', 'solo per la pausa');
  assert.equal(pauseNote({ t: 'ph', ph: 'pause', txt: 'x'.repeat(400) }).length, 160);
});

test('B20: pagina del telefono, pulsante «Rivincita» e messaggi (rm, ph con txt) collegati', () => {
  assert.match(HTML, /<button class="btn hidden" id="rematch">Rivincita<\/button>/);
  assert.match(JS, /case 'rm': rematch = rematchOnMsg\(d\)/);
  assert.match(JS, /send\(\{ t: 'rm', y: 1 \}\)/);
  assert.match(JS, /phaseNote = pauseNote\(d\)/);
  assert.match(JS, /pause: phaseNote \|\| 'Partita in pausa: guarda il computer/);
  // la fase che non è più «fine partita» toglie il pulsante
  assert.match(JS, /if \(phase !== 'over'\) rematch = null/);
  const link = readFileSync(new URL('../../site/js/tennis/link.js', import.meta.url), 'utf8');
  assert.match(link, /case 'rm': if \(d\.y === 1\) emit\('rematch', \{\}\)/);
});
