// B46 «dritto e rovescio al sicuro» · il caso dell'utente rifatto da capo (dallo script dell'indagine
// scratchpad/swap/split-ruoli-mano/B-stesso-schermo.mjs, 14/11). Segnalazione sulla 2026-11-14.1: programma Windows,
// telefono Android, STESSO SCHERMO, giocatore di SINISTRA (Telefono 1 = Player 1), «Calibrazione: Giocando», dal primo
// colpo: «se provavo a fare un rovescio mi veniva fuori un dritto lungolinea, se facevo un dritto veniva fuori un rovescio
// incrociato».
// Interfaccia vera (NatpfUi, NatpfSplitUi, NatpfTrial, NatpfHand, due NatpfPhoneRacket veri), motore senza disegno,
// telefoni finti che rispondono come la pagina vera (ui-world.mjs, trial-world.mjs). Il Player 1 è un destro: sulla palla
// alla sua destra fa il dritto (verso +1), a sinistra il rovescio (−1). Le scritte sono quelle del motore vero
// (_attemptPlayerRallyStrike: «FOREHAND/BACKHAND …» → «Dritto/Rovescio» a schermo).
// La pagina del telefono è simulata con le sue funzioni pure (phone-screen.js: handTap per i due tocchi della mano,
// tapVotesSign per i tocchi che votano il segno; motion-sign.js: createAccSign): gli stessi passi di racchetta.js.
//   1. un tocco solo su «Sinistra» → la mano resta destra, la partita legge giusto;
//   2. due tocchi → mancino, con l'avviso grande e «Mancino» in vista (riga dei puntini, targhetta della metà);
//   3. il chiosco (nessuno per un po') → di nuovo destro, la partita del visitatore dopo legge giusto;
//   4. segno del telefono cambiato dopo gli scambi di prova (i tocchi al menu) → in partita il lato resta giusto (prima:
//      doppia inversione, ogni colpo con il nome sbagliato);
//   5. tocchi per il lancio al servizio con il telefono storto → il segno non cambia, il lato resta giusto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, visible } from './ui-world.mjs';
import { phoneLike, stroke, hot, ballWant } from './trial-world.mjs';
const { NatpfPhoneRacket } = await import('../src/natpf/natpf_phone_racket.js');
const { readHand, readP2Hand } = await import('../src/natpf/natpf_hand.js');
const { skillLevel } = await import('../src/natpf/natpf_skill.js');
const { lateSpanOf, directionSpan, slowFactor } = await import('../src/natpf/natpf_stroke_outcome.js');
const { handTap, tapVotesSign } = await import('../../site/js/tennis/phone-screen.js');
const { createAccSign } = await import('../../site/js/tennis/motion-sign.js');

// colpo della partita giocato dal motore vero (come nello script dell'indagine): palla dal lato vero, tempo neutro
function strikeReal(ev, { e, realSide, lateral = .6, rally = 3 }){
  const real = Math.random; Math.random = () => .5;
  try {
    const side = realSide === 'backhand' ? -1 : 1, vz = 18, ballZ = 10.9;
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = rally;
    e.ball.natpfSuper = null; e.pendingUserSwing = null; e.natpfPaused = false;
    e.player.pos.set(0, 0, ballZ + .5); e.player.vel.set(0, 0, 0); e.player.targetPos.copy(e.player.pos); e.player.swingCooldown = 0;
    const bx = lateral*side;
    e.ball.pos.set(bx, 1, ballZ); e.ball.vel.set(0, 0, vz); e.ball.targetLanding.set(bx, 0, 9);
    const lv = skillLevel(e.matchConfig?.difficulty || '1v1'), late = lateSpanOf(vz, lv);
    void directionSpan; void slowFactor;
    e._pop = null;
    const ok = e._attemptPlayerRallyStrike({ ...ev, natpf: { ...ev.natpf, latency: 0 }, natpfTau: 0, natpfLateSpan: late }, false);
    if (!ok) return { label: '(colpo non riuscito)' };
    return { label: (e._pop?.grade || '').split('•')[1]?.trim().replace(/!$/, '') || '', swingType: e.player.swingType };
  } finally { Math.random = real; }
}

// Pagina del telefono simulata: due tocchi per la mano (handTap) e segno dell'accelerazione votato dai tocchi solo dove
// tapVotesSign lo permette. phoneOk: il telefono legge il verso giusto con il segno +1 (Android)
// recal (revisione del B46, punto 1): come la pagina vera, a segno cambiato dai tocchi il telefono torna a calibrare
// (racchetta.js: needCal dopo sendDevice) e il computer, con «Giocando», gli dà subito il profilo semplice (evento «done»)
function phonePage(P, { now = () => performance.now(), recal = null } = {}){
  let armed = null;
  const acc = createAccSign({ prior: 1 }), sent = [];
  return {
    acc, sent,
    // tocco sul pulsante «Sinistra» o «Destra» (racchetta.js: #profileOptions)
    tapHand(want){
      const r = handTap(armed, { want, current: P.hand, now: now() }); armed = r.armed;
      if (r.commit){ sent.push({ t: 'hand', h: r.commit }); P._onPhoneHand(r.commit); }   // messaggio «hand» → link.js → _onPhoneHand
      return r;
    },
    // tocco sullo schermo con il telefono tenuto così (accelerazione con la gravità grezza), nella schermata e fase date
    tap(raw, { screen = 'ready', phase = 'menu', trial = false } = {}){
      if (!tapVotesSign({ screen, phase, trial })) return false;
      const changed = acc.vote(raw);
      if (changed){ sent.push({ t: 'dev', as: acc.sign }); P._accSignSeen(acc.sign); recal?.(); }   // racchetta.js: sendDevice(), needCal()
      return changed;
    },
    // verso letto dal telefono per un gesto vero: girato se il segno dell'accelerazione è sbagliato (Android: +1 giusto)
    dir(trueDir){ return acc.sign === 1 ? trueDir : -trueDir; },
  };
}

// righe del registro dello stand scritte da qui in poi (anche quelle già passate in un blocco: ogni 45 s il registro svuota
// la memoria nella coda)
function regRows(ui){
  const rec = ui.registro?.rec, out = [];
  assert.ok(rec, 'registro dello stand acceso');
  const orig = rec._scrivi.bind(rec);
  rec._scrivi = raw => { const n = rec.buf.length; orig(raw); if (rec.buf.length > n) out.push(JSON.parse(rec.buf[rec.buf.length - 1])); };
  return out;
}
// Mondo dello stesso schermo con i due telefoni (Telefono 1 = Player 1 a sinistra, Telefono 2 = Player 2 a destra)
async function splitWorld(){
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { E, ui, link } = w, P1 = ui.phone;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  P2.link = { connected: true, ready: false, L: { state: 'connected', phone: 'cal' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); if (c === 'skip' || c === 'confirm'){ this.ready = true; this.L.phone = 'ready'; } if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){} };
  phoneLike(P1, link); phoneLike(P2, P2.link);
  P1.markTutorialSeen('short'); P2.markTutorialSeen('short');
  E.hud.showTimingPopup = o => { E._pop = o; };
  const reg = regRows(ui);
  w.advance(1100);   // (il registro aggancia il Telefono 2 al suo controllo di ogni secondo, come quando nasce nel gioco)
  return { ...w, P1, P2, reg };
}
// «Collega», conto alla rovescia, scambi di prova: ognuno colpisce dal lato in cui vede la palla, con il verso che legge
// il suo telefono (dir1: verso letto dal Telefono 1 per il verso vero)
function playTrial(w, { dir1 = d => d } = {}){
  const { E, ui, lobby, P1, P2 } = w, seen = { p1: -1, p2: -1 }, phones = { p1: P1, p2: P2 }, log = [];
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint(); w.advance(300);
  w.advance(3600);
  assert.ok(ui.trial.active && ui.trial.S.split, 'scambi di prova nello stesso schermo');
  let rowsSeen = '';
  for (let k = 0; k < 4000 && ui.trial.active; k++){
    w.advance(16);
    if (!rowsSeen) rowsSeen = $('natpf-trial').querySelector('[data-trial="rows"]').innerHTML;
    for (const id of ['p1', 'p2']){
      const ball = phones[id].trial?.ball ?? -1;
      if (!hot(E, id) || seen[id] === ball) continue;
      seen[id] = ball;
      const want = ballWant(E, id), d = id === 'p1' ? dir1(want) : want;
      phones[id]._onSwing(stroke({ dir: d, peak: 700, heading: d > 0 ? 10 : -10 }));
      if (id === 'p1') log.push({ want, dir: d, sign: P1.learner.sign });
    }
  }
  assert.ok(!ui.trial.active, 'scambi di prova finiti');
  return { log, rowsSeen };
}
// quattro colpi veri del Player 1 in partita: dritto, rovescio, dritto, rovescio; dir1 come sopra
function playMatch(w, { dir1 = d => d } = {}){
  const { E, P1 } = w, out = [];
  for (const realSide of ['forehand', 'backhand', 'forehand', 'backhand']){
    const want = realSide === 'forehand' ? 1 : -1, d = dir1(want);
    let ev = null; const off = P1.onSwing(e => { ev = e; });
    E.phase = 'POINT_OVER'; E.ball.inPlay = false;
    P1._onSwing(stroke({ dir: d, peak: 700, heading: d > 0 ? 10 : -10 }));
    off();
    if (!ev || ev.ignored){ out.push({ realSide, read: null }); continue; }
    const r = strikeReal(ev, { e: E, realSide });
    out.push({ realSide, read: ev.side, label: r.label });
  }
  return out;
}
const RIGHT = [['forehand', 'forehand', 'FOREHAND TOPSPIN'], ['backhand', 'backhand', 'BACKHAND TOPSPIN'], ['forehand', 'forehand', 'FOREHAND TOPSPIN'], ['backhand', 'backhand', 'BACKHAND TOPSPIN']];
const rows = m => m.map(x => [x.realSide, x.read, x.label]);

test('caso dell\'utente 1 · un tocco solo su «Sinistra» del Telefono 1: la mano resta destra, in partita dritto e rovescio giusti', async () => {
  const w = await splitWorld(), page = phonePage(w.P1);
  const r = page.tapHand('left');
  assert.equal(r.commit, null); assert.deepEqual(page.sent, [], 'nessun messaggio al computer');
  assert.equal(w.P1.hand, 'right'); assert.equal(w.ui.hand.hand, 'right'); assert.equal(readHand(), 'right');
  w.advance(5000);   // la domanda «Mancino? Tocca di nuovo» scade
  assert.equal(page.tapHand('left').commit, null, 'un altro tocco dopo 4 s è di nuovo il primo');
  assert.ok(!visible('natpf-hand-notice'));
  const { rowsSeen } = playTrial(w);
  assert.doesNotMatch(rowsSeen, /Mancino/);
  assert.deepEqual(rows(playMatch(w)), RIGHT);
});

test('caso dell\'utente 2 · due tocchi su «Sinistra»: mancino, avviso grande «Telefono 1: mano sinistra (mancino)» e «Mancino» in vista', async () => {
  const w = await splitWorld(), page = phonePage(w.P1);
  page.tapHand('left'); w.advance(1500); const r = page.tapHand('left');
  assert.equal(r.commit, 'left'); assert.deepEqual(page.sent, [{ t: 'hand', h: 'left' }]);
  assert.equal(w.P1.hand, 'left'); assert.equal(w.ui.hand.hand, 'left'); assert.equal(readHand(), 'left'); assert.equal(w.P2.hand, 'right', 'il Player 2 non si tocca');
  assert.ok(visible('natpf-hand-notice')); assert.equal($('natpf-hand-notice').querySelector('b').textContent, 'Telefono 1: mano sinistra (mancino)');
  const { rowsSeen } = playTrial(w);
  const p1 = rowsSeen.slice(rowsSeen.indexOf('data-trial-player="p1"'), rowsSeen.indexOf('data-trial-player="p2"'));
  assert.match(p1, /Mancino/, '«Mancino» nella riga dei puntini del Player 1');
  w.ui.split.tick();
  assert.ok(!$('natpf-split-hud').querySelector('[data-split-tag="p1"] .hand-tag').classList.contains('hidden'), '«Mancino» nella targhetta della sua metà');
  // chi tiene il telefono è un destro: ora che la mano sinistra si vede, il nome dei colpi è quello di un mancino (atteso)
  assert.deepEqual(playMatch(w).map(x => x.read), ['backhand', 'forehand', 'backhand', 'forehand']);
  // la riga «tel» del registro dice il perché
  const tel = w.reg.filter(x => x.k === 'tel' && x.motivo === 'mano');
  assert.deepEqual(tel.map(x => [x.mano, x.causa, x.ruolo]), [['left', 'telefono', 'p1']]);
});

test('caso dell\'utente 3 · il chiosco (nessuno per un po\') rimette destri tutti e due: il visitatore dopo gioca giusto', async () => {
  const w = await splitWorld(), page = phonePage(w.P1), page2 = phonePage(w.P2);
  page.tapHand('left'); page.tapHand('left'); page2.tapHand('left'); page2.tapHand('left');
  assert.equal(readHand(), 'left'); assert.equal(readP2Hand(), 'left');
  // il visitatore se ne va lasciando il gioco nella pagina «Partita» dello stesso schermo; nessuno tocca niente per il tempo
  // del chiosco (fuori dal menu non è «a riposo»: il chiosco riparte)
  let resets = 0; const reset = w.ui.kiosk.reset.bind(w.ui.kiosk); w.ui.kiosk.reset = () => { resets++; return reset(); };
  w.ui.kiosk.enabled = true; w.ui.kiosk.last = performance.now(); w.lobby.go('mode'); w.lobby.setMode('split'); w.lobby.go('match'); w.advance(200);
  w.advance((w.ui.kiosk.limit + 2)*1000);
  assert.ok(resets >= 1, 'il chiosco è ripartito'); assert.equal(w.lobby.step, 'menu', 'di nuovo al menu');
  assert.equal(w.P1.hand, 'right'); assert.equal(w.P2.hand, 'right'); assert.equal(readHand(), 'right'); assert.equal(readP2Hand(), 'right');
  // il visitatore dopo: dal B45.1 il chiosco non scollega più i telefoni (prima il Telefono 1, racchetta normale, andava
  // ricollegato con il QR): restano collegati, azzerati come con «Nuovo giocatore» (profilo da capo, tutorial da rivedere)
  assert.ok(w.P1.connected && w.P2.connected, 'i due telefoni restano collegati');
  assert.equal(w.P1.tutorialSeen, false); assert.equal(w.P2.tutorialSeen, false);
  // il tutorial lo ha già visto (qui si salta)
  w.P1.markTutorialSeen('short'); w.P2.markTutorialSeen('short'); w.advance(300);
  const { rowsSeen } = playTrial(w);
  assert.doesNotMatch(rowsSeen, /Mancino/);
  assert.deepEqual(rows(playMatch(w)), RIGHT);
  const tel = w.reg.filter(x => x.k === 'tel' && x.motivo === 'mano');
  assert.deepEqual(tel.map(x => [x.mano, x.causa, x.ruolo]), [['left', 'telefono', 'p1'], ['left', 'telefono', 'p2'], ['right', 'chiosco', 'p1'], ['right', 'chiosco', 'p2']]);
});

// (revisione del B46, punto 1: con la pagina vera il segno cambiato dai tocchi fa ricalibrare il telefono, e il profilo
// semplice rimette a +1 anche il verso imparato: la «doppia inversione» non si produceva. Il B46 la scrive nel registro e
// azzera da sé i riferimenti per verso)
test('caso dell\'utente 4 · segno del telefono cambiato dopo gli scambi di prova: in partita il lato resta giusto (con la ricalibrazione della pagina vera)', async () => {
  // (il profilo semplice si richiede al più ogni 700 ms. Nel gioco lo chiede anche il segnale «st» del telefono che dice
  // «calibrazione», evento «change» del collegamento: vale anche a partita ferma, come nel conto alla rovescia grande del
  // B47, dove update() non gira. Il collegamento finto non ha eventi: lo si chiama come farebbe quello vero)
  const w = await splitWorld(), recal = () => { w.link.ready = false; w.link.L.phone = 'cal'; w.advance(900); w.P1._autoProfile(); };
  const page = phonePage(w.P1, { recal }), up = [0.2, 9.5, 1.5], down = [0.3, -9.6, 1.2];
  // il telefono arriva con il segno dell'accelerazione al contrario (quattro tocchi con il telefono a testa in giù al menu)
  w.P1._accSignSeen(page.acc.sign);                                            // «dev» del collegamento
  for (let k = 0; k < 4; k++) page.tap(down, { screen: 'ready', phase: 'menu' });
  assert.equal(page.acc.sign, -1, 'segno girato prima degli scambi di prova');
  // scambi di prova: il gioco impara la compensazione (−1)
  playTrial(w, { dir1: d => page.dir(d) });
  assert.equal(w.P1.learner.sign, -1, 'compensazione imparata');
  // dopo gli scambi di prova, al menu, i tocchi con il telefono dritto rimettono il segno giusto
  for (let k = 0; k < 20 && page.acc.sign === -1; k++) page.tap(up, { screen: 'ready', phase: 'menu' });
  assert.equal(page.acc.sign, 1);
  assert.ok(page.sent.some(m => m.t === 'dev' && m.as === 1));
  assert.equal(w.P1.learner.sign, 1, 'la compensazione di prima non vale più: verso da capo');
  assert.deepEqual(rows(playMatch(w, { dir1: d => page.dir(d) })), RIGHT, 'dritto e rovescio giusti');
  const tel = w.reg.filter(x => x.k === 'tel' && x.motivo === 'segno');
  assert.deepEqual(tel.map(x => [x.causa, x.stato]), [['tocchi', -1], ['prova', -1], ['tocchi', 1]], JSON.stringify(tel));
  // com'era prima del B46 (_accSignSeen che non azzera niente): la ricalibrazione della pagina vera rimette lo stesso il
  // verso imparato a +1, e il lato resta giusto (revisione del B46, punto 1)
  w.P1.learner.vote({ ball: 900, want: 1, s: { dir: -1, peak: 700 } }); w.P1.learner.vote({ ball: 901, want: -1, s: { dir: 1, peak: 700 } });
  assert.equal(w.P1.learner.sign, -1);
  recal();
  assert.equal(w.P1.learner.sign, 1, 'il profilo semplice dopo la ricalibrazione rimette il verso a +1');
  assert.deepEqual(rows(playMatch(w, { dir1: d => page.dir(d) })), RIGHT);
});

test('caso dell\'utente 5 · tocchi per il lancio al servizio con il telefono a testa in giù: il segno non cambia, il lato resta giusto', async () => {
  const w = await splitWorld(), page = phonePage(w.P1), down = [0.3, -9.6, 1.2];
  w.P1._accSignSeen(page.acc.sign);
  playTrial(w, { dir1: d => page.dir(d) });
  assert.equal(w.P1.learner.sign, 1);
  // in partita, a ogni servizio un tocco sullo schermo per lanciare la palla, con il telefono storto (fase «serve»)
  for (let k = 0; k < 8; k++) page.tap(down, { screen: 'ready', phase: 'serve' });
  for (let k = 0; k < 4; k++) page.tap(down, { screen: 'ready', phase: 'play' });
  for (let k = 0; k < 4; k++) page.tap(down, { screen: 'ready', phase: 'play', trial: true });
  assert.equal(page.acc.sign, 1, 'nessun voto in gioco'); assert.deepEqual(page.sent, []);
  assert.deepEqual(rows(playMatch(w, { dir1: d => page.dir(d) })), RIGHT);
  // prima del B46 quei tocchi votavano: quattro concordi bastavano a girare il segno a metà partita
  const old = createAccSign({ prior: 1 }); for (let k = 0; k < 4; k++) old.vote(down);
  assert.equal(old.sign, -1, 'il caso che il B46 toglie');
});
