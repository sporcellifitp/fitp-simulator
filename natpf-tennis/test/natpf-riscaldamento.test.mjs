// B16 (decisione dell'utente dell'08/11 sera: «riscaldamento facoltativo, di base si va alla partita»). Prima la pagina
// «Collega» portava in campo al riscaldamento (2 dritti, 2 rovesci, un servizio, o «Salta»), che insegnava al gioco il
// colpo tipico prima della partita. Ora: calibrazione (con il tutorial corto) → pagina «Partita» con «Gioca» e «Riscaldati
// prima». Senza riscaldamento i primi colpi della partita avevano come riferimento della forza la calibrazione, spesso un
// colpetto: il pavimento del riferimento (natpf_phone_racket.BOOT) li riporta vicino a quelli letti dopo il riscaldamento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld, $ } from './ui-world.mjs';
import { powerRefs, BOOT, createTypicalModel } from '../src/natpf/natpf_phone_racket.js';
import { run, totals } from '../scripts/audit/riscaldamento.mjs';
import { connectNextLabel, progressSteps } from '../src/natpf/natpf_lobby.js';

test('riferimento della forza dei primi colpi: la calibrazione non sta sotto i colpi già fatti né sotto BOOT.self del colpo', () => {
  const cal = { ref: 300, rawRef: 360 };
  // colpo tipico già imparato: vale quello (come prima)
  assert.deepEqual(powerRefs(cal, 700, { seen: [650, 700, 720], peak: 900 }), { ref: 700, rawRef: null });
  // senza colpi e senza il colpo: la calibrazione (come prima)
  assert.deepEqual(powerRefs(cal, null), { ref: 300, rawRef: 360 });
  // primo colpo a 640 °/s con la calibrazione a 300: riferimento 0,75 × 640 = 480, rawRef nella stessa proporzione
  assert.deepEqual(powerRefs(cal, null, { seen: [], peak: 640 }), { ref: 480, rawRef: 576 });
  assert.equal(BOOT.self, .75);
  // secondo e terzo colpo: la mediana dei colpi già fatti, se più alta
  assert.deepEqual(powerRefs(cal, null, { seen: [640], peak: 500 }), { ref: 640, rawRef: 768 });
  assert.deepEqual(powerRefs(cal, null, { seen: [600, 700], peak: 400 }), { ref: 650, rawRef: 780 });
  // calibrazione giusta o decisa: non cambia (il pavimento alza solo, mai abbassa); colpo morbido: non cambia
  assert.deepEqual(powerRefs({ ref: 700, rawRef: 800 }, null, { seen: [650], peak: 600 }), { ref: 700, rawRef: 800 });
  assert.deepEqual(powerRefs(cal, null, { seen: [], peak: 350 }), { ref: 300, rawRef: 360 });
  // profilo semplice («Salta»): nessun riferimento, forza assoluta (come prima)
  assert.deepEqual(powerRefs({ simple: true, ref: 300 }, null, { seen: [640], peak: 640 }), { ref: null, rawRef: null });
  // il modello del colpo tipico dice i colpi già imparati anche prima di averne abbastanza
  const t = createTypicalModel(); t.add(640); t.add(150); assert.deepEqual(t.seen, [640]); assert.equal(t.value, null);
});

test('senza riscaldamento i primi colpi si leggono quasi come dopo il riscaldamento (telefono simulato, calibrazione a colpetto)', () => {
  // calibrazione con gesti a 0,5 del proprio colpo (il colpetto delle diagnostiche: 143 °/s il 23/10), 6 semi
  for (const hand of ['right', 'left']){
    const rows = run(.5, { seeds: 6, n: 6, hand }), a = totals(rows, 'A'), b = totals(rows, 'B');
    // prima del pavimento: |Δforza| dei primi 3 colpi 0,21, tipo diverso in 8 colpi su 36 (prova fatta togliendo BOOT)
    assert.ok(a.dp3 < .14, `${hand}: primi 3 colpi senza riscaldamento |Δforza| ${a.dp3.toFixed(3)} (con ${b.dp3.toFixed(3)})`);
    assert.ok(a.type <= b.type + 3, `${hand}: tipo di colpo diverso dal riferimento ${a.type} senza, ${b.type} con il riscaldamento`);
    assert.equal(a.side, 0, `${hand}: lato sempre giusto`);
  }
  // calibrazione con il proprio colpo: senza riscaldamento come con
  const rows = run(1, { seeds: 6, n: 6 }), a = totals(rows, 'A'), b = totals(rows, 'B');
  assert.ok(a.dp3 <= b.dp3 + .02, `calibrazione giusta: ${a.dp3.toFixed(3)} / ${b.dp3.toFixed(3)}`);
});

// percorso: la pagina «Collega» porta in campo solo per la calibrazione, poi alla pagina «Partita»; il riscaldamento è
// «Riscaldati prima»; con il telefono già calibrato (o la webcam) subito la pagina «Partita»
test('flusso: calibrazione → «Partita» (niente riscaldamento); «Riscaldati prima» lo fa partire e poi torna a «Partita»', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, lobby, link } = w, T = ui.training, P = ui.phone;
  link.L.phone = 'sensors'; lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect');
  link.L.phone = 'cal'; w.advance(1500);
  assert.ok(T.active && !lobby.visible, 'in campo'); assert.ok(T.calOnly, 'solo la calibrazione'); assert.ok(T.tutorialOpen, 'prima il tutorial corto');
  assert.equal(T.tutorial.set, 'short');
  // tutorial e calibrazione finiti dal telefono: la pagina «Partita», con «Gioca» e «Riscaldati prima»
  T._tutorialDone('skip'); link.ready = true; link.L.phone = 'ready'; w.advance(400);
  assert.ok(!T.active, 'niente riscaldamento dopo la calibrazione');
  assert.equal(lobby.step, 'match'); assert.ok(lobby.visible);
  assert.equal($('lobby-practice-result').innerHTML, '<b>Racchetta pronta ✓</b>');
  assert.ok(!$('lobby-warmup').classList.contains('hidden'), '«Riscaldati prima» in vista'); assert.ok(!$('btn-start-match').classList.contains('hidden'));
  // «Riscaldati prima»: il riscaldamento (dritto, rovescio, servizio), senza tutorial (già visto)
  $('lobby-warmup').click();
  assert.ok(T.active && !T.calOnly && !T.tutorialOpen); assert.deepEqual(T.drills.map(d => d.id), ['forehand', 'backhand', 'serve']);
  T.skip();
  assert.equal(lobby.step, 'match'); assert.match($('lobby-practice-result').innerHTML, /Riscaldamento saltato/);
  // di nuovo da «Collega» (telefono pronto e tutorial visto): subito la pagina «Partita»
  lobby.go('connect'); lobby.next();
  assert.equal(lobby.step, 'match'); assert.ok(!T.active);
  // barra delle tappe: «Calibrazione» al posto di «Riscaldamento»
  assert.match($('lobby-progress').innerHTML, /Calibrazione/); assert.doesNotMatch($('lobby-progress').innerHTML, /Riscaldamento/);
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /id="lobby-warmup"[^>]*>Riscaldati prima</);
  void P;
});

test('flusso: «Salta» durante la calibrazione → «Partita» con «Calibrazione saltata»; webcam subito «Partita»', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, lobby, link } = w, T = ui.training;
  ui.phone.markTutorialSeen('short');
  link.L.phone = 'sensors'; lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect');
  link.L.phone = 'cal'; w.advance(1500);
  assert.ok(T.active && T.calOnly && !T.tutorialOpen);
  T.skip();
  assert.equal(lobby.step, 'match'); assert.match($('lobby-practice-result').innerHTML, /Calibrazione saltata.*Senza calibrazione/);
  const w2 = await makeWorld({ controller: 'webcam' });
  w2.lobby.menu('play'); w2.lobby.setMode('cpu'); w2.lobby.go('controller'); w2.lobby.go('connect'); w2.lobby.next();
  assert.equal(w2.lobby.step, 'match'); assert.ok(!w2.ui.training.active, 'webcam: niente in campo prima della partita');
});

test('flusso: telefono già calibrato ma tutorial corto da vedere (visitatore nuovo, stesso telefono): solo il tutorial, poi «Partita»', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, lobby, link } = w, T = ui.training;
  link.ready = true; link.L.phone = 'ready';
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next(); w.advance(300);
  assert.ok(T.active && T.tutorialOpen && !T.cal, 'il tutorial, senza calibrazione');
  T._tutorialDone('skip');
  assert.ok(!T.active); assert.equal(lobby.step, 'match');
});

// Revisione del B16. Il pulsante della pagina «Collega» dice dove porta: con mouse e tastiera, webcam o telefono già pronto
// diceva «In campo ›» e portava alla pagina «Partita»
test('pagina «Collega»: il pulsante dice dove porta («Alla partita ›» o «In campo ›»)', async () => {
  for (const s of [{ controller: 'mouse' }, { controller: 'webcam' }, { controller: 'phone', phoneReady: true }])
    assert.equal(connectNextLabel({ mode: 'cpu', ...s }), 'Alla partita ›', JSON.stringify(s));
  assert.equal(connectNextLabel({ mode: 'friend', controller: 'mouse' }), 'Alla partita ›');
  // in campo: telefono da calibrare, tutorial corto da vedere, riscaldamento chiesto, sfida
  for (const s of [{ controller: 'phone' }, { controller: 'phone', phoneReady: true, tutorialDue: true }, { controller: 'mouse', wantWarmup: true }])
    assert.equal(connectNextLabel({ mode: 'cpu', ...s }), 'In campo ›', JSON.stringify(s));
  assert.equal(connectNextLabel({ mode: 'challenge', controller: 'mouse' }), 'In campo ›');
  assert.equal(connectNextLabel({ mode: 'training', controller: 'mouse' }), 'Al campo d’allenamento ›');
  assert.equal(connectNextLabel({ mode: 'split', controller: 'phone' }), 'Impostazioni partita ›');
  // nel menu vero: mouse e tastiera → «Alla partita ›», e porta davvero alla pagina «Partita»
  const w = await makeWorld({ controller: 'mouse' }), { lobby } = w;
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect');
  assert.equal($('lobby-next').textContent, 'Alla partita ›');
  lobby.next();
  assert.equal(lobby.step, 'match'); assert.ok(!w.ui.training.active);
  // telefono collegato ma da calibrare: «In campo ›», e porta in campo (tutorial corto e calibrazione)
  const wp = await makeWorld({ controller: 'phone' });
  wp.link.L.phone = 'sensors'; wp.lobby.menu('play'); wp.lobby.setMode('cpu'); wp.lobby.go('controller'); wp.lobby.go('connect');
  wp.link.L.phone = 'cal'; wp.lobby.paint();
  assert.equal($('lobby-next').textContent, 'In campo ›');
  wp.lobby.next();
  assert.ok(wp.ui.training.active && wp.ui.training.calOnly);
});

// «Riscaldati prima» con il telefono caduto porta a «Collega»; chi lascia la pagina (o torna al menu) senza entrare in campo
// non l'ha più chiesto. Prima la richiesta restava e il riscaldamento partiva alla partita dopo (in fiera: del visitatore
// successivo)
test('«Riscaldati prima» con il telefono caduto, poi menu e nuova partita: niente riscaldamento non chiesto', async () => {
  for (const leave of ['menu', 'back']){
    const w = await makeWorld({ controller: 'phone' }), { ui, lobby, link } = w, T = ui.training;
    ui.phone.markTutorialSeen('short'); link.ready = true;
    link.L.phone = 'sensors'; lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect');
    link.L.phone = 'ready'; w.advance(1500);
    assert.equal(lobby.step, 'match', `${leave}: telefono pronto, subito «Partita»`); assert.ok(!T.active);
    // il telefono cade; «Riscaldati prima» → «Collega» (la richiesta resta finché si è lì)
    link.L.phone = 'sensors';
    $('lobby-warmup').click();
    assert.equal(lobby.step, 'connect'); assert.ok(lobby.wantWarmup, 'riscaldamento chiesto');
    assert.equal($('lobby-next').textContent, 'In campo ›');
    // si lascia «Collega» senza entrare in campo
    if (leave === 'menu') lobby.go('menu'); else lobby.back();
    assert.ok(!lobby.wantWarmup, `${leave}: la richiesta non vale più`);
    // nuova partita, il telefono torna: subito la pagina «Partita», nessun riscaldamento
    lobby.go('menu'); lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect');
    link.L.phone = 'ready'; w.advance(1500);
    assert.equal(lobby.step, 'match', `${leave}: alla partita`); assert.ok(!T.active, `${leave}: riscaldamento partito senza chiederlo`);
  }
  // la richiesta resta finché si è nella pagina «Collega»: il telefono torna e il riscaldamento parte
  const w = await makeWorld({ controller: 'phone' }), { ui, lobby, link } = w, T = ui.training;
  ui.phone.markTutorialSeen('short'); link.ready = true;
  link.L.phone = 'sensors'; lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect');
  link.L.phone = 'ready'; w.advance(1500); assert.equal(lobby.step, 'match');
  link.L.phone = 'sensors'; $('lobby-warmup').click(); assert.equal(lobby.step, 'connect');
  link.L.phone = 'ready'; w.advance(1500);
  assert.ok(T.active && !T.calOnly, 'il riscaldamento chiesto parte'); assert.deepEqual(T.drills.map(d => d.id), ['forehand', 'backhand', 'serve']);
});

test('barra delle tappe: «Calibrazione» solo con il telefono; «Rifai il riscaldamento» dopo un riscaldamento finito', async () => {
  assert.deepEqual(progressSteps('cpu', { controller: 'mouse' }).map(([id]) => id), ['mode', 'controller', 'connect', 'match']);
  assert.deepEqual(progressSteps('friend', { controller: 'webcam' }).map(([id]) => id), ['mode', 'controller', 'connect', 'match']);
  assert.deepEqual(progressSteps('cpu', { controller: 'phone' }).map(([, l]) => l), ['Modalità', 'Racchetta', 'Collega', 'Calibrazione', 'Partita']);
  assert.deepEqual(progressSteps('training', { controller: 'mouse' }).map(([id]) => id), ['controller', 'connect', 'warmup']);
  const w = await makeWorld({ controller: 'webcam' }), { lobby, ui } = w;
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next();
  assert.equal(lobby.step, 'match');
  assert.doesNotMatch($('lobby-progress').innerHTML, /Calibrazione/); assert.match($('lobby-progress').innerHTML, /Partita/);
  // riscaldamento con la webcam dalla pagina «Partita», finito: il pulsante diventa «Rifai il riscaldamento»
  assert.equal($('lobby-warmup').textContent, 'Riscaldati prima');
  $('lobby-warmup').click(); assert.ok(ui.training.active && ui.training.drills.length);
  ui.training.stop({ completed: true });
  assert.equal(lobby.step, 'match'); assert.equal($('lobby-warmup').textContent, 'Rifai il riscaldamento');
  // un visitatore nuovo (menu principale): di nuovo «Riscaldati prima»
  lobby.go('menu'); lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next();
  assert.equal($('lobby-warmup').textContent, 'Riscaldati prima');
  // riscaldamento saltato: resta «Riscaldati prima»
  $('lobby-warmup').click(); ui.training.skip();
  assert.equal(lobby.step, 'match'); assert.equal($('lobby-warmup').textContent, 'Riscaldati prima');
});
