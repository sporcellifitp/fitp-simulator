// Fine del punto (segnalazione del 23/10, sera): compariva «Fuori» sotto il punteggio e non si capiva chi avesse
// sbagliato né a chi andasse il punto. Ora in grande chi vince il punto (verde il proprio, rosa dell'avversario), sotto
// chi ha sbagliato o perché e il punteggio dal proprio lato; il Player 2 del 1v1 lo vede dal suo lato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pointCall, gameCall, viewScore, rivalOf, callFromBroadcast } from '../src/natpf/natpf_point_call.js';
import { t as tr, scoreText } from '../src/natpf/natpf_i18n.js';

test('palla fuori: chi vince il punto e chi ha sbagliato, contro la CPU', () => {
  const won = pointCall({ winner: 'player', why: 'Out', score: { player: '15', opponent: '0' } });
  assert.deepEqual([won.text, won.subText, won.style], ['Punto tuo', 'Errore della CPU: palla fuori · 15-0', 'style-won']);
  const lost = pointCall({ winner: 'opponent', why: 'Out', score: { player: '0', opponent: '15' } });
  assert.deepEqual([lost.text, lost.subText, lost.style], ['Punto della CPU', 'Errore tuo: palla fuori · 0-15', 'style-lost']);
  assert.match(pointCall({ winner: 'opponent', why: 'Net' }).subText, /Errore tuo: palla in rete/);
  assert.match(pointCall({ winner: 'player', why: 'Nice Shot!' }).subText, /^Vincente!/);
  assert.match(pointCall({ winner: 'opponent', why: 'Point' }).subText, /Palla non presa/);
  assert.match(pointCall({ winner: 'player', why: 'Point' }).subText, /La CPU non ci arriva/);
  assert.match(pointCall({ winner: 'opponent', why: 'Ace!' }).subText, /Ace della CPU/);
});

test('punteggio dal proprio lato, parità e vantaggio di chi', () => {
  assert.equal(viewScore({ player: '30', opponent: '15' }), '30-15');
  assert.equal(viewScore({ player: '15', opponent: '00' }), '15-0', 'lo zero del motore («00») come nei tabelloni');
  assert.equal(viewScore({ player: '30', opponent: '15' }, 'opponent', rivalOf({ multiplayer: true, viewer: 'opponent' })), '15-30');
  assert.equal(viewScore({ player: '40', opponent: '40' }), 'Parità');
  assert.equal(viewScore({ player: 'Ad', opponent: '40' }), 'Vantaggio tuo');
  assert.equal(viewScore({ player: '40', opponent: 'Ad' }), 'Vantaggio della CPU');
});

test('1v1: l’host e il Player 2 vedono lo stesso punto ciascuno dal suo lato', () => {
  const host = pointCall({ winner: 'player', why: 'Out', viewer: 'player', rival: rivalOf({ multiplayer: true, viewer: 'player' }), score: { player: '40', opponent: '15' } });
  assert.deepEqual([host.text, host.subText], ['Punto tuo', 'Errore di Player 2: palla fuori · 40-15']);
  const p2 = callFromBroadcast({ playerRole: 'p2', isMultiplayer: true }, { text: host.text, subText: host.subText, call: { kind: 'point', winner: 'player', why: 'Out', score: { player: '40', opponent: '15' } } });
  assert.deepEqual([p2.text, p2.subText, p2.style], ['Punto di Player 1', 'Errore tuo: palla fuori · 15-40', 'style-lost']);
  const g = callFromBroadcast({ playerRole: 'p2', isMultiplayer: true }, { call: { kind: 'game', winner: 'opponent', games: { player: 1, opponent: 2 } } });
  assert.deepEqual([g.text, g.subText], ['Game tuo', 'Game 2-1']);
  // host di prima, senza i dati: resta il suo testo
  assert.equal(callFromBroadcast({ playerRole: 'p2' }, { text: '15 - 0', subText: 'Out' }).text, '15 - 0');
});

test('game e partita: di chi sono', () => {
  assert.deepEqual(Object.values(gameCall({ winner: 'opponent', games: { player: 0, opponent: 1 } })).slice(1), ['Game della CPU', 'Game 0-1', 'style-lost']);
  assert.equal(gameCall({ winner: 'player', games: { player: 2, opponent: 1 }, match: true }).text, 'Partita tua!');
});

test('i testi passano intatti dalla traduzione dell’interfaccia', () => {
  for (const s of ['Punto tuo', 'Punto della CPU', 'Errore della CPU: palla fuori · 15-0', 'Errore tuo: palla in rete · 0-15', 'Vincente!', 'Ace della CPU', 'Vantaggio tuo', 'Game della CPU', 'Partita tua!', 'La CPU non ci arriva'])
    assert.equal(tr(scoreText(s)), s);
});
