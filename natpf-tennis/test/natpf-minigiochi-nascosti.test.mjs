// Minigiochi nascosti (30/10/2026, richiesta dell'utente: «togli Radar del servizio, nascondilo, non eliminarlo; lo
// stesso per Survival»). Interruttore unico natpf_arcade.HIDDEN_MODES: non compaiono come scelta (pagina «Minigiochi»,
// classifica del menu e del chiosco), il codice resta e funziona.
// node --import ./test/register.mjs --test test/natpf-minigiochi-nascosti.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { MODES, HIDDEN_MODES, VISIBLE_MODES, isHiddenMode, modeById, SURVIVAL, survivalLevel, medalFor } from '../src/natpf/natpf_arcade.js';
import { CHALLENGES, ALL_CHALLENGES, HIDDEN_CHALLENGES, challengeById, pickableChallenge } from '../src/natpf/natpf_events.js';

test('interruttore unico: Radar e Survival nascosti, gli altri minigiochi visibili nello stesso ordine', () => {
  assert.deepEqual([...HIDDEN_MODES].sort(), ['radar', 'survival']);
  assert.equal(HIDDEN_CHALLENGES, HIDDEN_MODES);
  assert.deepEqual(VISIBLE_MODES.map(m => m.id), ['rush', 'precision', 'combo']);
  assert.deepEqual(CHALLENGES.map(c => c.id), ['rush', 'precision', 'combo']);
  assert.ok(isHiddenMode('radar') && isHiddenMode('survival') && !isHiddenMode('rush'));
  assert.equal(pickableChallenge('radar'), null); assert.equal(pickableChallenge('survival'), null);
  assert.equal(pickableChallenge('combo')?.id, 'combo');
});

test('il codice dei minigiochi nascosti c’è ancora: regole, medaglie, motore', async () => {
  assert.deepEqual(ALL_CHALLENGES.map(c => c.id), ['rush', 'precision', 'combo', 'survival', 'radar']);
  assert.equal(MODES.length, 5);
  assert.equal(modeById('radar')?.label, 'Radar del servizio'); assert.equal(challengeById('survival')?.label, 'Survival');
  assert.equal(SURVIVAL.lives, 3); assert.equal(survivalLevel(12), 2);
  assert.equal(medalFor('radar', 150), 'silver');
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  w.ui.events.start('survival'); assert.equal(w.ui.events.active?.id, 'survival', 'Survival si avvia ancora dal codice');
  w.ui.events.abort();
  w.ui.events.start('radar'); assert.equal(w.ui.events.active?.id, 'radar', 'Radar si avvia ancora dal codice');
});

test('menu: le tessere dei minigiochi e le schede della classifica non mostrano Radar né Survival; non si scelgono', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { lobby, ui } = w;
  lobby.menu('challenges'); lobby._paintChallenges();
  const tiles = $('challenge-tiles').innerHTML;
  assert.deepEqual([...tiles.matchAll(/data-challenge="([a-z]+)"/g)].map(m => m[1]), ['rush', 'precision', 'combo']);
  assert.doesNotMatch(tiles, /Radar|Survival|radar|survival/);
  ui.events.nickname = 'Ada';
  lobby.pickChallenge('radar'); lobby.pickChallenge('survival');
  assert.notEqual(lobby.challenge, 'radar'); assert.notEqual(lobby.challenge, 'survival');
  // classifica (dal menu e dal pannello dell'addetto del chiosco: stessa pagina), anche se la scheda era su un nascosto
  lobby.rankingTab = 'radar'; lobby.go('ranking'); lobby._paintRanking();
  const tabs = $('ranking-tabs').innerHTML;
  // (B33: prima la scheda «Partite», la classifica delle partite contro la CPU; il pannello dello stand apre quella)
  assert.deepEqual([...tabs.matchAll(/data-ranking="([a-z]+)"/g)].map(m => m[1]), ['partite', 'rush', 'precision', 'combo']);
  assert.equal(lobby.rankingTab, 'rush');
  ui.kiosk?.run?.('ranking');
  assert.equal(lobby.rankingTab, 'partite');
  assert.doesNotMatch($('ranking-tabs').innerHTML, /Radar|Survival/);
});
