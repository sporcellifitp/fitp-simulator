// B42 · sfida tra due computer (docs/b42/scambi-lunghi.md): lo «scambio che si scalda» lo decide l'host (acceso di base,
// spento solo se lo staff l'ha spento sul suo computer) e lo manda al computer del Player 2 con lo snapshot della partita
// (campo `hot`); lì serve per la scritta «Scambio caldo · colpo N». Un host di prima (senza il campo) non cambia niente.
// Mondo di prova (ui-world.mjs: interfaccia vera sul motore senza disegno). File a sé: ui-world sostituisce variabili
// globali (node --test esegue ogni file in un processo a sé).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, fetches } from './ui-world.mjs';
import { HOT_KEY } from '../src/natpf/natpf_hot_rally.js';

const snapshots = since => fetches.slice(since).filter(f => String(f.url).includes('/api/match/sync')).map(f => JSON.parse(f.body).snapshot);

// host della sfida: stanza creata, P2 pronto, partita avviata; saved: valore salvato dallo staff (null: niente di salvato)
async function hostMatch(saved){
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  if (saved != null) localStorage.setItem(HOT_KEY, saved);
  const { E, lobby, hud } = w;
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('match'); w.advance(300);
  E._handleRoomStateUpdate({ p2Online: true, p2Ready: true }); w.advance(200);
  w.pressStart(); w.advance(300); if (w.ui.training?.active) w.ui.training.skip(); w.advance(300);
  assert.ok(E._versusInMatch(), `fase ${E.phase}`);
  const since = fetches.length; w.advance(600);
  return { E, match: snapshots(since).filter(s => !s.lobby && !s.paused && s.phase) };
}

test('B42, sfida tra due computer: l’host manda lo scambio caldo nello snapshot della partita (acceso di base, spento se lo staff l’ha spento)', async () => {
  for (const [saved, on] of [[null, true], ['0', false], ['1', true]]){
    const { E, match } = await hostMatch(saved);
    assert.equal(E.natpfHot, on, `salvato ${saved}: scambio caldo dell'host`);
    assert.ok(match.length && match.every(s => s.hot === on), `salvato ${saved}: ${JSON.stringify(match.map(s => s.hot))}`);
  }
});

test('B42, computer del P2: vale la scelta dell’host (anche se il P2 l’ha spento) e la scritta «colpo N» compare dal 20° colpo', async () => {
  const w = await makeWorld({ controller: 'mouse', role: 'p2' }); w.advance(300);
  const { E } = w;
  let seq = 0;
  const snap = (strokes, extra = {}) => { E._handleRoomStateUpdate({ p1Online: true, hostName: 'Ada', epoch: 'x', snapshotSeq: ++seq,
    snapshot: { phase: 'RALLY', phaseTimer: 1, score: { ...E.score }, ball: { px: 0, py: 1.4, pz: 0, vx: 0, vy: 3, vz: -4, inPlay: true, lastHitter: 'player', shotType: 'TOPSPIN', rallyStrokeCount: strokes }, ...extra } }); w.advance(50); };
  E.autoPlayMode = false;
  E.natpfHot = false;                                               // sul computer del P2 lo staff l'aveva spento
  snap(22, { hot: true });
  assert.equal(E.natpfHot, true, 'lo decide l’host');
  assert.equal(w.ui.hotRally.shown, 'colpo 22|1', 'scritta «Scambio caldo · colpo 22» (primo grado)');
  snap(19, { hot: true });
  assert.equal(w.ui.hotRally.shown, '', 'prima del 20° colpo nessuna scritta');
  snap(23);                                                         // host di prima: nessun campo, resta com'era
  assert.equal(E.natpfHot, true);
  assert.equal(w.ui.hotRally.shown, 'colpo 23|1');
  snap(24, { hot: false });                                         // host con lo scambio caldo spento
  assert.equal(E.natpfHot, false);
  assert.equal(w.ui.hotRally.shown, '', 'spento dall’host: nessuna scritta');
});
