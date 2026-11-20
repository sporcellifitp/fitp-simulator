// B36.1, revisione del B73 (docs/b73/unione.md, «Revisione e sistemazione», rilievo «dir-stantia-fuori-partita»): la
// direzione dei colpi si legge a inizio partita E all'inizio di ogni attività fuori dalla partita (scambi di prova,
// riscaldamento e allenamento, minigiochi), con la stessa regola di startNewMatch (engine.natpfReadDir). Prima la leggeva solo
// startNewMatch: con il pannello di nuovo su «Classica» gli scambi di prova e i minigiochi tenevano la «Nuova» dell'ultima
// partita, e con «Nuova» salvata a PC appena acceso Precision giocava «Classica». «Ricalibra» a partita in corso (scambi di
// prova con resume) non la rilegge: la partita tiene la regola con cui è cominciata.
// Interfaccia vera sul motore senza disegno (ui-world.mjs: sostituisce variabili globali, per questo è un file a sé).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './ui-world.mjs';
import { DIR_KEY } from '../src/natpf/natpf_direction.js';
import { lateSpanOf, directionSpan, slowFactor } from '../src/natpf/natpf_stroke_outcome.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';

// colpo del telefono con la forma del colpo (piatto 0,5, scarto della cima 10°)
const colpoTel = () => ({ source: 'natpf-phone', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: 0, timing: null,
  natpf: { aim: 'swing', shot: 'topspin', power: .5, latency: 0, hand: 'right', aimDev: 10, peak: 800, typical: 780, aimFull: 17,
    intent: { shot: 'topspin', power: .5, typePower: .5, depth: .5, rise: .3, face: .5, conf: 1 } } });
// un colpo di chi gioca qui, a tempo, come nel banco della direzione: la regola usata (out.rule: 'nuova' o niente)
function regola(e){
  const real = Math.random; Math.random = () => .5;
  try {
    const vz = 18, lv = skillLevel(e.matchConfig.difficulty), span = directionSpan(lv)*slowFactor(vz), late = lateSpanOf(vz, lv);
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 3; e.pendingUserSwing = null;
    e.player.pos.set(0, 0, 11.4); e.player.vel.set(0, 0, 0); e.player.targetPos.copy(e.player.pos); e.player.swingCooldown = 0;
    e.ball.pos.set(.6, 1, 10.9); e.ball.vel.set(0, 0, vz); e.ball.targetLanding.set(.6, 0, 9);
    assert.ok(e._attemptPlayerRallyStrike({ ...colpoTel(), natpfTau: 0*span, natpfLateSpan: late }, false), 'colpo preso');
    return e.natpfLastRacket.out.rule;
  } finally { Math.random = real; }
}
// righe del registro dello stand scritte da qui in poi (come natpf-b45-2-rifiniture.test.mjs)
function regRows(ui){
  const rec = ui.registro?.rec, out = [];
  assert.ok(rec, 'registro dello stand acceso');
  const orig = rec._scrivi.bind(rec);
  rec._scrivi = raw => { const n = rec.buf.length; orig(raw); if (rec.buf.length > n) out.push(JSON.parse(rec.buf[rec.buf.length - 1])); };
  return out;
}
// le quattro attività fuori dalla partita, come le fa partire il gioco
const ATTIVITA = {
  precision: ui => { ui.events.start('precision'); assert.ok(ui.events.active, 'Precision avviato'); },
  riscaldamento: ui => { ui.training.start({}); assert.ok(ui.training.active, 'riscaldamento avviato'); },
  'scambi di prova': (ui, w) => { assert.ok(ui.trial.start({ split: false, force: true, then: () => {} })); w.advance(500); assert.ok(ui.trial.active, 'scambi di prova avviati'); },
};

test('B36.1 (revisione B73): dopo una partita con «Nuova» e il pannello di nuovo su «Classica», scambi di prova, riscaldamento e minigiochi giocano «Classica»', async () => {
  for (const [nome, avvia] of Object.entries(ATTIVITA)){
    const w = await makeWorld({ controller: 'mouse', cal: 'play' }); w.advance(300);
    const { E, ui } = w, K = ui.kiosk;
    K.open(); K.run('dir');                                         // staff: «Nuova»
    E.startNewMatch({ showStartBanner: false });                    // una partita di prova con «Nuova»
    assert.equal(E.natpfDirModel, 'nuova'); assert.equal(regola(E), 'nuova', `${nome}: partita con «Nuova»`);
    K.open(); K.run('dir');                                         // staff: di nuovo «Classica»
    assert.equal(localStorage.getItem(DIR_KEY), 'classica');
    const righe = regRows(ui);
    avvia(ui, w);
    assert.equal(E.natpfDirModel, 'classica', `${nome}: vale la scelta del pannello, non l’ultima partita`);
    assert.equal(regola(E), undefined, `${nome}: colpo del telefono con la regola di oggi`);
    if (nome === 'precision'){
      ui.events.abort();
      const m = righe.find(r => r.k === 'minigioco');
      assert.equal(m?.dir, 'classica', `riga «minigioco»: ${JSON.stringify(m)}`);
    }
  }
});

test('B36.1 (revisione B73): «Nuova» salvata a PC appena acceso: Precision, riscaldamento e scambi di prova la usano subito, senza una partita prima', async () => {
  for (const [nome, avvia] of Object.entries(ATTIVITA)){
    const w = await makeWorld({ controller: 'mouse', cal: 'play' }); w.advance(300);
    const { E, ui } = w;
    localStorage.setItem(DIR_KEY, 'nuova');                         // salvata dallo staff il giorno prima
    const righe = regRows(ui);
    avvia(ui, w);
    assert.equal(E.natpfDirModel, 'nuova', nome);
    assert.equal(regola(E), 'nuova', `${nome}: colpo del telefono con la regola nuova`);
    if (nome === 'precision'){
      ui.events.abort();
      const m = righe.find(r => r.k === 'minigioco');
      assert.equal(m?.dir, 'nuova', `riga «minigioco»: ${JSON.stringify(m)}`);
    }
  }
});

test('B36.1 (revisione B73): «Ricalibra» a partita in corso (scambi di prova con resume) non cambia la regola della partita', async () => {
  for (const [inizio, pannello] of [['nuova', 'classica'], ['classica', 'nuova']]){
    const w = await makeWorld({ controller: 'mouse', cal: 'play' }); w.advance(300);
    const { E, ui } = w;
    localStorage.setItem(DIR_KEY, inizio);
    E.startNewMatch({ showStartBanner: false });
    assert.equal(E.natpfDirModel, inizio);
    localStorage.setItem(DIR_KEY, pannello);                        // lo staff la cambia a partita in corso
    assert.ok(ui.trial.start({ split: false, resume: true, force: true, then: () => {} })); w.advance(500);
    assert.ok(ui.trial.active);
    assert.equal(E.natpfDirModel, inizio, `partita cominciata con «${inizio}», pannello su «${pannello}»: resta «${inizio}»`);
  }
});

test('B36.1 (revisione B73): la regola dell’attività è quella di startNewMatch (un solo metodo, natpfReadDir; il forzato dei banchi comanda)', async () => {
  const w = await makeWorld({ controller: 'mouse', cal: 'play' }); w.advance(300);
  const { E, ui } = w;
  assert.equal(typeof E.natpfReadDir, 'function');
  localStorage.setItem(DIR_KEY, 'classica');
  E.natpfDirRule = 'nuova';                                         // forzato a mano (test e banchi)
  ui.events.start('precision');
  assert.equal(E.natpfDirModel, 'nuova', 'il forzato comanda anche nei minigiochi');
  ui.events.abort();
  E.natpfDirRule = null;
  ui.events.start('precision');
  assert.equal(E.natpfDirModel, 'classica');
});
