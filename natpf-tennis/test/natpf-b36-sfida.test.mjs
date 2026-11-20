// B36.1 «La cima comanda (interna)» (docs/b73/direzione-b36-1.md), con l'interfaccia vera sul motore senza disegno
// (ui-world.mjs: sostituisce variabili globali, per questo è un file a sé):
//   - sfida tra due computer: l'host manda la direzione dei colpi nello snapshot (campo dir) e il computer del P2 la usa per
//     la previsione locale del suo colpo; un host di prima (senza il campo) lascia «Classica», la regola di oggi;
//   - pannello dello stand: la voce «Direzione dei colpi» passa da «Classica» a «Nuova · in lavorazione» e ritorno, resta
//     salvata e non la toccano il chiosco né «Nuovo giocatore».
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, fetches, $ } from './ui-world.mjs';
import { DIR_KEY } from '../src/natpf/natpf_direction.js';
import { faceAimFromDev } from '../src/natpf/natpf_stroke_intent.js';

const snapshots = since => fetches.slice(since).filter(f => String(f.url).includes('/api/match/sync')).map(f => JSON.parse(f.body).snapshot);

// host della sfida: stanza creata, P2 pronto, partita avviata; saved: direzione salvata dallo staff (null: niente di salvato)
async function hostMatch(saved){
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  if (saved != null) localStorage.setItem(DIR_KEY, saved);
  const { E, lobby, hud } = w;
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('match'); w.advance(300);
  E._handleRoomStateUpdate({ p2Online: true, p2Ready: true }); w.advance(200);
  w.pressStart(); w.advance(300); if (w.ui.training?.active) w.ui.training.skip(); w.advance(300);
  assert.ok(E._versusInMatch(), `fase ${E.phase}`);
  const since = fetches.length; w.advance(600);
  return { E, match: snapshots(since).filter(s => !s.lobby && !s.paused && s.phase) };
}

test('B36.1, sfida tra due computer: l’host manda la direzione dei colpi nello snapshot della partita', async () => {
  for (const [saved, dir] of [[null, 'classica'], ['nuova', 'nuova'], ['classica', 'classica']]){
    const { E, match } = await hostMatch(saved);
    assert.equal(E.natpfDirModel, dir, `salvata ${saved}: direzione dell'host`);
    assert.ok(match.length && match.every(s => s.dir === dir), `salvata ${saved}: ${JSON.stringify(match.map(s => s.dir))}`);
  }
});

// colpo del telefono con la forma, scarto della cima dev (gradi)
const colpoTel = dev => ({ source: 'natpf-phone', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: 0, timing: null, role: 'p2',
  natpf: { aim: 'swing', shot: 'topspin', power: .5, latency: 0, hand: 'right', aimDev: dev, peak: 800, typical: 780, aimFull: 17,
    intent: { shot: 'topspin', power: .5, typePower: .5, depth: .5, rise: .3, face: faceAimFromDev(dev), conf: 1 } } });

test('B36.1, computer del P2: vale la direzione dell’host (anche con «Nuova» salvata qui), e la previsione del colpo del P2 la usa', async () => {
  const w = await makeWorld({ controller: 'mouse', role: 'p2' }); w.advance(300);
  const { E } = w;
  localStorage.setItem(DIR_KEY, 'nuova');                         // sul computer del P2 lo staff aveva scelto «Nuova»
  E.startNewMatch({ showStartBanner: false });
  assert.equal(E.natpfDirModel, 'classica', 'fino allo snapshot dell’host vale «Classica», la regola di un host di prima');
  let seq = 0;
  const snap = (extra = {}) => { E._handleRoomStateUpdate({ p1Online: true, hostName: 'Ada', epoch: 'x', snapshotSeq: ++seq,
    snapshot: { phase: 'RALLY', phaseTimer: 1, score: { ...E.score }, ball: { px: 0, py: 1.4, pz: 0, vx: 0, vy: 3, vz: -4, inPlay: true, lastHitter: 'player', shotType: 'TOPSPIN', rallyStrokeCount: 3 }, ...extra } }); w.advance(50); };
  E.autoPlayMode = false;
  snap({ dir: 'nuova' });
  assert.equal(E.natpfDirModel, 'nuova', 'la decide l’host');
  snap();                                                         // host di prima: nessun campo, resta com'era
  assert.equal(E.natpfDirModel, 'nuova');
  snap({ dir: 'boh' });                                           // valore sconosciuto: non cambia niente
  assert.equal(E.natpfDirModel, 'nuova');
  // previsione locale del colpo del P2 (stesso esito dell'host, specchiato): con la regola nuova
  const prova = () => {
    const p = E.opponent, real = Math.random; Math.random = () => .5;
    try {
      E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'player'; E.ball.bounceCountOnCurrentSide = 1; E.ball.rallyStrokeCount = 3;
      p.pos.set(0, 0, -11.4); p.vel.set(0, 0, 0); E.ball.pos.set(-.6, 1, -10.9); E.ball.vel.set(0, 0, -18);
      return E._natpfRacketShot({ ...colpoTel(10), natpfTau: .03, natpfLateSpan: .075 }, p, { lateral: .6 });
    } finally { Math.random = real; }
  };
  const nuova = prova();
  assert.equal(nuova.out.rule, 'nuova', 'previsione del P2 con la regola nuova dell’host');
  snap({ dir: 'classica' });
  assert.equal(E.natpfDirModel, 'classica');
  const classica = prova();
  assert.equal(classica.out.rule, undefined, 'con l’host su «Classica» la regola di oggi');
  assert.notEqual(classica.E, nuova.E, 'la palla prevista cambia con la regola dell’host');
});

test('B36.1, pannello dello stand: «Direzione dei colpi» Classica ↔ Nuova, salvata; il chiosco e «Nuovo giocatore» non la toccano', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const K = w.ui.kiosk, voce = () => $('natpf-staff').querySelector('[data-staff="dir"] b');
  K.open();
  assert.equal(voce().textContent, 'Classica', 'di base «Classica»');
  assert.equal(voce().parentElement.classList.contains('on'), false);
  K.run('dir');
  assert.equal(localStorage.getItem(DIR_KEY), 'nuova');
  assert.equal(voce().textContent, 'Nuova · in lavorazione');
  assert.equal(voce().parentElement.classList.contains('on'), true, '«Nuova» si vede accesa');
  assert.match($('natpf-toast').textContent, /Nuova \(in lavorazione, non da provare\).*Vale dalla prossima partita; resta salvata/);
  // il chiosco azzera chi gioca, non lo stand
  K.reset();
  assert.equal(localStorage.getItem(DIR_KEY), 'nuova', 'dopo il chiosco resta «Nuova»');
  w.ui.newPlayer(); w.advance(200);
  assert.equal(localStorage.getItem(DIR_KEY), 'nuova', 'dopo «Nuovo giocatore» resta «Nuova»');
  // la partita dopo la legge
  w.E.startNewMatch({ showStartBanner: false });
  assert.equal(w.E.natpfDirModel, 'nuova');
  K.open(); K.run('dir');
  assert.equal(localStorage.getItem(DIR_KEY), 'classica');
  assert.equal(voce().textContent, 'Classica');
  assert.match($('natpf-toast').textContent, /Classica, come sempre/);
});
