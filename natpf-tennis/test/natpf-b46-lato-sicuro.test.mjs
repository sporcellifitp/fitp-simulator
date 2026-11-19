// B46 «dritto e rovescio al sicuro» (14/11/2026) · parte del computer. Segnalazione dell'utente sulla 2026-11-14.1
// (programma Windows, Android, stesso schermo, Player 1, «Calibrazione: Giocando», dal primo colpo): «se provavo a fare un
// rovescio mi veniva fuori un dritto lungolinea, se facevo un dritto veniva fuori un rovescio incrociato». L'indagine
// (scratchpad/swap/split-ruoli-mano) ha trovato tre casi che danno esattamente quelle scritte: mano del Player 1 salvata
// «sinistra» (un tocco sul telefono), segno dell'accelerazione del telefono cambiato dopo gli scambi di prova, segno del
// rilevatore cambiato dopo. Qui, punto per punto:
//   1. «Mancino» in vista (riga dei puntini, targhetta della metà, pagina «Pronto per la partita») e avviso grande di 3 s
//      quando la mano cambia dal telefono;
//   3. chi arriva dopo parte destro (chiosco, «Nuovo giocatore»), Player 1 e Player 2;
//   4. segni coerenti: segno dell'accelerazione cambiato → verso imparato da capo; voto del rilevatore registrato;
//   5. una riga «tel» del registro (e un evento della diagnostica) per ogni cambio di mano e di segno.
// (Il punto 2, i due tocchi sulla pagina del telefono, e la regola dei tocchi che votano: tools/test/b46-lato-sicuro.test.mjs;
// il caso dell'utente rifatto da capo: natpf-b46-caso-utente.test.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld, $, visible } from './ui-world.mjs';
import { phoneLike, stroke, hot, ballWant, secondPhone } from './trial-world.mjs';
const { NatpfPhoneRacket } = await import('../src/natpf/natpf_phone_racket.js');
const { HAND_KEY, P2_HAND_KEY, readHand, readP2Hand, resetHands } = await import('../src/natpf/natpf_hand.js');
const { handNoticeText, HAND_NOTICE_MS, LEFTY_TAG, noticeFor } = await import('../src/natpf/natpf_hand_notice.js');
const F = await import('../src/natpf/registro/registro_formato.js');

// eventi della diagnostica di un telefono (_diag): mano e segno del verso
const diagOf = P => { const out = []; P.onDiag((kind, d) => { if (kind === 'mano' || kind === 'verso') out.push({ kind, ...d }); }); return out; };
// righe «tel» del registro dello stand con un motivo (B46)
const telRows = ui => (ui.registro?.rec?.buf || []).map(l => JSON.parse(l)).filter(r => r.k === 'tel' && r.motivo);

/* ---------- 1. mano visibile ---------- */
test('B46 avviso: testi per Telefono 1 e 2, solo per un cambio arrivato dal telefono', () => {
  assert.deepEqual(handNoticeText({ ruolo: 'p1', mano: 'left' }).title, 'Telefono 1: mano sinistra (mancino)');
  assert.equal(handNoticeText({ ruolo: 'p2', mano: 'right' }).title, 'Telefono 2: mano destra');
  assert.match(handNoticeText({ ruolo: 'p1', mano: 'left' }).sub, /«Destra», due tocchi/);
  assert.equal(HAND_NOTICE_MS, 3000); assert.equal(LEFTY_TAG, 'Mancino');
  assert.equal(noticeFor('mano', { causa: 'telefono' }), true);
  for (const causa of ['gioco', 'nuovo giocatore', 'chiosco', 'fiera']) assert.equal(noticeFor('mano', { causa }), false, causa);
  assert.equal(noticeFor('verso', { causa: 'telefono' }), false);
});

test('B46 mano dal telefono del Player 1: personaggio, gioco e telefono mancini, avviso grande per 3 s, «Mancino» sulla pagina «Pronto per la partita»', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { ui, E } = w, P1 = ui.phone, ev = diagOf(P1);
  phoneLike(P1, w.link); w.advance(200);
  // il pulsante «Sinistra» confermato sulla pagina del telefono: messaggio «hand» → _onPhoneHand
  P1._onPhoneHand('left');
  assert.equal(ui.hand.hand, 'left'); assert.equal(P1.hand, 'left'); assert.equal(localStorage.getItem(HAND_KEY), 'left');
  assert.equal(E.player.natpfHand, 'left', 'personaggio specchiato');
  assert.deepEqual(ev, [{ kind: 'mano', mano: 'left', causa: 'telefono', ruolo: 'p1' }]);
  assert.ok(visible('natpf-hand-notice'), 'avviso grande in vista');
  assert.equal($('natpf-hand-notice').querySelector('b').textContent, 'Telefono 1: mano sinistra (mancino)');
  assert.equal($('natpf-hand-notice').dataset.hand, 'left');
  w.advance(HAND_NOTICE_MS - 300); assert.ok(visible('natpf-hand-notice'), 'ancora in vista prima dei 3 s');
  w.advance(500); assert.ok(!visible('natpf-hand-notice'), 'sparito dopo 3 s');
  // lo stesso messaggio di nuovo: niente (la mano è già quella)
  P1._onPhoneHand('left'); assert.equal(ev.length, 1); assert.ok(!visible('natpf-hand-notice'));
  // pagina «Pronto per la partita» contro la CPU: «Mancino» accanto al titolo
  w.lobby.go('mode'); w.lobby.setMode('cpu'); w.lobby.go('match'); w.lobby.paint();
  assert.ok(visible('match-hand'), '«Mancino» sulla pagina «Pronto per la partita»');
  // tornato destro dal gioco (pulsanti del computer): niente avviso, ma l'evento con la causa
  ui.hand.set('right', 'gioco'); w.lobby.paint();
  assert.ok(!visible('match-hand')); assert.ok(!visible('natpf-hand-notice'), 'cambio dal gioco: nessun avviso');
  assert.deepEqual(ev.at(-1), { kind: 'mano', mano: 'right', causa: 'gioco', ruolo: 'p1' });
  // registro dello stand: una riga «tel» per ogni cambio, con i campi già previsti (il Worker non va ricaricato)
  const rows = telRows(ui).filter(r => r.motivo === 'mano');
  assert.deepEqual(rows.map(r => [r.chi, r.mano, r.causa, r.ruolo]), [['g', 'left', 'telefono', 'p1'], ['g', 'right', 'gioco', 'p1']]);
  for (const r of rows) assert.deepEqual(F.controllaRiga(r), [], JSON.stringify(r));
});

test('B46 «Mancino» nella riga dei puntini degli scambi di prova e nella targhetta della metà dello stesso schermo', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { ui, E, lobby } = w, P1 = ui.phone;
  const { P2 } = secondPhone(E, NatpfPhoneRacket);
  phoneLike(P1, w.link); P1.markTutorialSeen('short'); P2.markTutorialSeen('short');
  P1._onPhoneHand('left');
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint(); w.advance(300);
  w.advance(3600);   // conto alla rovescia, «Gioca» da solo, scambi di prova
  assert.ok(ui.trial.active && ui.trial.S.split, 'scambi di prova nello stesso schermo');
  const rows = $('natpf-trial').querySelector('[data-trial="rows"]').innerHTML;
  const p1Row = rows.slice(rows.indexOf('data-trial-player="p1"'), rows.indexOf('data-trial-player="p2"')), p2Row = rows.slice(rows.indexOf('data-trial-player="p2"'));
  assert.match(p1Row, /class="hand-tag"[^>]*>Mancino</, 'riga del Player 1: «Mancino»');
  assert.doesNotMatch(p2Row, /Mancino/, 'il Player 2 è destro: niente');
  // in partita (e già durante gli scambi): targhetta della metà
  ui.split.tick();
  const tag = id => $('natpf-split-hud').querySelector(`[data-split-tag="${id}"] .hand-tag`);
  assert.ok(!tag('p1').classList.contains('hidden'), 'targhetta del P1: «Mancino»');
  assert.ok(tag('p2').classList.contains('hidden'), 'targhetta del P2: niente');
  // il Player 2 diventa mancino dal suo telefono: avviso «Telefono 2», targhetta, riga
  P2._onPhoneHand('left'); ui.split.tick(); ui.trial.paint();
  assert.equal($('natpf-hand-notice').querySelector('b').textContent, 'Telefono 2: mano sinistra (mancino)');
  assert.ok(!tag('p2').classList.contains('hidden'));
  assert.equal(E.motionController.p2HandPreference, 'left', 'come dalla casella del computer (prima cambiava solo il telefono)');
  assert.equal(readP2Hand(), 'left'); assert.equal(readHand(), 'left');
  const rows2 = $('natpf-trial').querySelector('[data-trial="rows"]').innerHTML;
  assert.match(rows2.slice(rows2.indexOf('data-trial-player="p2"')), /^data-trial-player="p2" data-hand="left">(?:<b>[^<]*<\/b>)?<span class="hand-tag"[^>]*>Mancino</);
});

/* ---------- 3. ogni visitatore nuovo parte destro ---------- */
test('B46 chiosco: il ritorno al menu per inattività rimette destri Player 1 e Player 2 (non al riavvio del programma)', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { ui, E } = w, P1 = ui.phone;
  const { P2 } = secondPhone(E, NatpfPhoneRacket), ev1 = diagOf(P1), ev2 = diagOf(P2);
  ui.hand.set('left', 'gioco'); P2.setHand('left', 'gioco');
  assert.equal(readHand(), 'left'); assert.equal(readP2Hand(), 'left');
  // «riavvio del programma»: la mano salvata resta
  assert.equal(new NatpfPhoneRacket(E).hand, 'left'); assert.equal(new NatpfPhoneRacket(E, { role: 'p2' }).hand, 'left');
  ui.kiosk.enabled = true; ui.kiosk.reset();
  assert.equal(ui.hand.hand, 'right'); assert.equal(P1.hand, 'right'); assert.equal(P2.hand, 'right');
  assert.equal(readHand(), 'right'); assert.equal(readP2Hand(), 'right');
  assert.deepEqual(ev1.at(-1), { kind: 'mano', mano: 'right', causa: 'chiosco', ruolo: 'p1' });
  assert.deepEqual(ev2.at(-1), { kind: 'mano', mano: 'right', causa: 'chiosco', ruolo: 'p2' });
  // destri già: il chiosco non scrive niente
  const n = ev1.length + ev2.length; ui.kiosk.reset(); assert.equal(ev1.length + ev2.length, n);
  // senza Telefono 2 (contro la CPU): la mano salvata del Player 2 torna destra lo stesso
  localStorage.setItem(P2_HAND_KEY, 'left'); E.natpfPhone2 = null;
  resetHands(ui, 'fiera'); assert.equal(readP2Hand(), 'right');
});

test('B46 «Nuovo giocatore» fuori dallo stesso schermo: anche il Player 2 torna destro, con la causa', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { ui, E } = w, P1 = ui.phone;
  const { P2 } = secondPhone(E, NatpfPhoneRacket), ev1 = diagOf(P1), ev2 = diagOf(P2);
  phoneLike(P1, w.link); ui.hand.set('left'); P2.setHand('left');
  w.lobby.go('menu'); ui.newPlayer();
  assert.equal(ui.hand.hand, 'right'); assert.equal(P2.hand, 'right');
  assert.equal(ev1.at(-1).causa, 'nuovo giocatore'); assert.equal(ev2.at(-1).causa, 'nuovo giocatore');
  const src = readFileSync(new URL('../src/natpf/natpf_new_player.js', import.meta.url), 'utf8');
  assert.match(src, /S\?\.setHand\?\.\(id, 'right', 'nuovo giocatore'\)/, 'stesso schermo: per ciascuno, con la causa');
});

/* ---------- 4. segni coerenti ---------- */
test('B46 segno dell\'accelerazione cambiato (messaggio «dev»): verso imparato da capo e riferimenti per verso da capo', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), P = w.ui.phone, ev = diagOf(P);
  w.link.L.joins = 1;
  assert.equal(P._accSignSeen(1), false, 'il primo «dev»: niente da confrontare');
  assert.equal(P._accSignSeen(1), false, 'lo stesso segno: niente');
  // compensazione imparata dagli scambi di prova (il telefono aveva il segno girato) e riferimenti per verso imparati
  P.learner.vote({ ball: 1, want: 1, s: { dir: -1, peak: 600 } }); P.learner.vote({ ball: 2, want: -1, s: { dir: 1, peak: 600 } });
  assert.equal(P.learner.sign, -1);
  P.aimModel.add(1, 40); P.aimModel.add(1, 42); P.riseModel.add(1, .2, 'topspin');
  const reset = { aim: 0, rise: 0, face: 0 };
  for (const k of ['aim', 'rise', 'face']){ const m = P[`${k}Model`], r = m.reset.bind(m); m.reset = (...a) => { reset[k]++; return r(...a); }; }
  // i tocchi l'hanno girato nello stesso collegamento
  assert.equal(P._accSignSeen(-1), true);
  assert.equal(P.learner.sign, 1, 'verso da capo: la compensazione di prima girerebbe di nuovo ogni colpo');
  assert.deepEqual(reset, { aim: 1, rise: 1, face: 1 });
  assert.deepEqual(ev.at(-1), { kind: 'verso', causa: 'tocchi', stato: -1, ruolo: 'p1' });
  // pagina nuova (collegamento nuovo) con il segno di prima: «pagina»
  w.link.L.joins = 2; assert.equal(P._accSignSeen(1), true);
  assert.deepEqual(ev.at(-1), { kind: 'verso', causa: 'pagina', stato: 1, ruolo: 'p1' });
  // B45.1 (revisione del B46, punto 6): un altro telefono tra due visitatori (abbinamento nuovo col QR, o telefono e browser
  // diversi nel «dev») è un «telefono nuovo», non una pagina ricaricata (un iPhone dopo un Android è normale)
  w.link.L.joins = 3; w.link.L.pairs = (w.link.L.pairs || 0) + 1; assert.equal(P._accSignSeen(-1), true);
  assert.deepEqual(ev.at(-1), { kind: 'verso', causa: 'telefono nuovo', stato: -1, ruolo: 'p1' });
  w.link.L.joins = 4; assert.equal(P._accSignSeen(1, { ua: 'Mozilla/5.0 (iPhone)', prevUa: 'Mozilla/5.0 (Linux; Android 14)' }), true);
  assert.deepEqual(ev.at(-1), { kind: 'verso', causa: 'telefono nuovo', stato: 1, ruolo: 'p1' });
  w.link.L.joins = 5; assert.equal(P._accSignSeen(-1, { ua: 'stesso', prevUa: 'stesso' }), true);
  assert.deepEqual(ev.at(-1), { kind: 'verso', causa: 'pagina', stato: -1, ruolo: 'p1' }, 'stesso telefono: pagina');
  // segni che non sono segni: niente
  assert.equal(P._accSignSeen(null), false); assert.equal(P._accSignSeen(0), false);
  // il «dev» del collegamento arriva qui
  const src = readFileSync(new URL('../src/natpf/natpf_phone_racket.js', import.meta.url), 'utf8');
  assert.match(src, /link\.on\('device', d => \{ const prevUa = this\.device\?\.ua \?\? null; this\.device = d; this\._diag\('dispositivo', d\); this\._accSignSeen\(d\?\.accSign, \{ ua: d\?\.ua \?\? null, prevUa \}\);/);
  assert.match(src, /link\.on\('sign', e => this\._detectorSign\(e\?\.detector, e\?\.votes\)\);/);
});

test('B46 voto del rilevatore: dal messaggio «sgn» o dal colpo, una volta sola, registrato; il verso imparato resta', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), P = w.ui.phone, ev = diagOf(P);
  phoneLike(P, w.link); w.advance(200);
  P.learner.vote({ ball: 1, want: 1, s: { dir: -1, peak: 600 } }); P.learner.vote({ ball: 2, want: -1, s: { dir: 1, peak: 600 } });
  assert.equal(P._detectorSign(-1), true, 'messaggio «sgn» del telefono');
  assert.equal(P._detectorSign(-1), false, 'il colpo con sg −1 dopo: niente di nuovo');
  assert.equal(P.phoneSign, -1); assert.equal(P.learner.sign, -1, 'il segno degli scambi di prova resta (il rilevatore lo corregge, non lo raddoppia)');
  assert.deepEqual(ev.filter(e => e.kind === 'verso'), [{ kind: 'verso', causa: 'rilevatore', stato: -1, ruolo: 'p1' }]);
  // dal colpo (pagine di prima, senza «sgn»): un colpo senza sg dice +1
  w.E.phase = 'POINT_OVER'; P._onSwing({ ...stroke({ dir: 1 }) });
  assert.equal(P.phoneSign, 1); assert.deepEqual(ev.at(-1), { kind: 'verso', causa: 'rilevatore', stato: 1, ruolo: 'p1' });
  // la calibrazione rimette a +1 il rilevatore sul telefono (swing-detect setProfile): con un segno girato lo si registra
  P._detectorSign(-1); P._onCal({ kind: 'done', step: 'done', profile: { simple: true, hand: 'right', version: 4 } });
  assert.equal(P.phoneSign, 1); assert.equal(P.learner.sign, 1);
  assert.deepEqual(ev.at(-1), { kind: 'verso', causa: 'calibrazione', stato: 1, ruolo: 'p1' });
  const n = ev.length; P._onCal({ kind: 'done', step: 'done', profile: { simple: true, hand: 'right', version: 4 } });
  assert.equal(ev.length, n, 'segni già a +1: niente');
});

test('B46 scambi di prova: ogni giro del segno imparato va nella diagnostica e nel registro («prova»)', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { ui, E, lobby } = w, P = ui.phone, ev = diagOf(P);
  phoneLike(P, w.link); w.advance(200); P.markTutorialSeen('short');
  lobby.go('mode'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); w.advance(300); lobby.next(); w.advance(300);
  assert.ok(ui.trial.active, 'scambi di prova prima della pagina «Pronto per la partita»');
  // telefono con il segno girato: ogni colpo al contrario del lato della palla
  const seen = new Set();
  for (let k = 0; k < 4000 && ui.trial.active; k++){
    w.advance(16);
    const ball = P.trial?.ball ?? -1; if (!hot(E, 'p1') || seen.has(ball)) continue; seen.add(ball);
    const want = ballWant(E, 'p1'); P._onSwing(stroke({ dir: -want, heading: want > 0 ? -10 : 10 }));
  }
  assert.ok(!ui.trial.active);
  assert.equal(P.learner.sign, -1);
  const prova = ev.filter(e => e.kind === 'verso' && e.causa === 'prova');
  // (B71: con i voti che hanno deciso il cambio, [d'accordo, contrari]; fuori dalla fiera bastano ancora 2 colpi)
  assert.deepEqual(prova, [{ kind: 'verso', causa: 'prova', stato: -1, ruolo: 'p1', voti: [0, 2] }], JSON.stringify(ev));
  assert.deepEqual(telRows(ui).filter(r => r.motivo === 'segno').map(r => [r.causa, r.stato, r.ruolo, r.voti]), [['prova', -1, 'p1', [0, 2]]]);
});

/* ---------- 5. registro e diagnostica ---------- */
test('B46 registro: righe «tel» con soli campi già previsti; diagnostica: tel.mano e tel.verso', async () => {
  for (const k of ['motivo', 'causa', 'stato', 'mano', 'ruolo', 'chi', 'inPartita']) assert.ok(F.CAMPI.includes(k), k);
  const { RegistroStand } = await import('../src/natpf/registro/registro_registratore.js');
  const { codaMemoria } = await import('../src/natpf/registro/registro_coda.js');
  let dg = null; const ph = { connected: true, hand: 'right', state: { state: 'on' }, onChange(){}, onCal(){}, onSwing(){}, onDropped(){}, onDiag(fn){ dg = fn; } };
  const E = { phase: 'MENU', autoPlayMode: true, natpfPhone: ph, playerRole: 'p1', score: {}, matchConfig: {}, ball: {} };
  const R = new RegistroStand({ engine: E, ui: { hand: { hand: 'right' } }, coda: codaMemoria(), now: () => 0, wallNow: () => Date.UTC(2026, 10, 14, 12), timers: false, storage: { getItem: () => null, setItem(){} } });
  dg('mano', { mano: 'left', causa: 'telefono', ruolo: 'p1' });
  dg('verso', { causa: 'tocchi', stato: -1, ruolo: 'p1' });
  dg('verso', { causa: 'rilevatore', stato: 1, ruolo: 'p2' });
  dg('scartato', { why: 'debole' });
  const rows = R.buf.map(l => JSON.parse(l)).filter(r => r.k === 'tel');
  assert.deepEqual(rows.map(({ t, ...r }) => r), [
    { k: 'tel', chi: 'g', motivo: 'mano', mano: 'left', causa: 'telefono', ruolo: 'p1' },
    { k: 'tel', chi: 'g', motivo: 'segno', stato: -1, causa: 'tocchi', ruolo: 'p1' },
    { k: 'tel', chi: 'g', motivo: 'segno', stato: 1, causa: 'rilevatore', ruolo: 'p2' }]);
  for (const r of rows) assert.deepEqual(F.controllaRiga(r), []);
  // registro spento: niente
  R.accendi(false, { salva: false }); const n = R.buf.length; dg('mano', { mano: 'right', causa: 'gioco', ruolo: 'p1' }); assert.equal(R.buf.length, n);
  // diagnostica (?diag=1): gli stessi eventi come tel.mano e tel.verso (tel2.* per il secondo telefono)
  const rec = readFileSync(new URL('../src/natpf/diag/diag_recorder.js', import.meta.url), 'utf8');
  assert.match(rec, /else if \(kind === 'mano' \|\| kind === 'verso'\) this\.log\(`\$\{who\}\.\$\{kind\}`, \{ \.\.\.d \}\);/);
  const viewer = readFileSync(new URL('../src/natpf/diag/diag_viewer.js', import.meta.url), 'utf8');
  for (const k of ['tel.mano', 'tel2.mano', 'tel.verso', 'tel2.verso']) assert.ok(viewer.includes(`'${k}'`), k);
});

test('B46 diagnostica: il riassunto della registrazione dice se la mano o un segno sono cambiati, e perché', async () => {
  const { computeMetrics, summaryLines, METRIC_KINDS } = await import('../src/natpf/diag/diag_metrics.js');
  for (const k of ['tel.mano', 'tel.verso', 'tel2.mano', 'tel2.verso']) assert.ok(METRIC_KINDS.has(k), k);
  const ev = [{ t: 10, k: 'tel.mano', mano: 'left', causa: 'telefono', ruolo: 'p1' }, { t: 30, k: 'tel.verso', causa: 'tocchi', stato: -1, ruolo: 'p1' },
    { t: 20, k: 'tel2.mano', mano: 'right', causa: 'chiosco', ruolo: 'p2' }, { t: 40, k: 'tel.verso', causa: 'rilevatore', stato: 1, ruolo: 'p1' }];
  const T = computeMetrics(ev).telefono;
  assert.deepEqual(T.mano, ['sinistra · telefono · p1', 'destra · chiosco · p2']);
  assert.deepEqual(T.segnoVerso, ['tocchi · −1 · p1', 'rilevatore · +1 · p1']);
  const L = summaryLines(computeMetrics(ev)).join('\n');
  assert.match(L, /Mano cambiata: sinistra · telefono · p1, destra · chiosco · p2/);
  assert.match(L, /Segno del verso del telefono cambiato: tocchi · −1 · p1, rilevatore · \+1 · p1/);
  // registrazioni senza cambi: nessuna riga in più
  assert.ok(!('mano' in (computeMetrics([{ t: 1, k: 'tel.dispositivo', ua: 'x' }]).telefono || {})));
});
