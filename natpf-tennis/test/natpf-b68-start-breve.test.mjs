// B68 (richiesta dell'utente del 18/11: «"batte per primo X" compare in sovrapposizione per troppo tempo, devi diminuire la
// sua durata»): chi batte lo dice il conto alla rovescia grande (anche il sorteggio); dopo il conto la scritta «Start» non
// lo ripete e dura meno (prima 2,6 s con la riga di chi batte, 1,8 s senza).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prematchServeLine, START_AFTER_COUNT_MS } from '../src/natpf/natpf_prematch.js';

const SRC = readFileSync(new URL('../src/game_engine.js', import.meta.url), 'utf8');

test('B68: il conto dice chi batte e se è uscito dal sorteggio', () => {
  const names = { player: 'Giulia', opponent: 'Marco' };
  assert.equal(prematchServeLine({ names, server: 'player' }), 'Batte per primo Giulia');
  assert.equal(prematchServeLine({ names, server: 'opponent', fixed: true }), 'Batte sempre Marco');
  assert.equal(prematchServeLine({ names, server: 'player', drawn: true }), 'Sorteggio: batte per primo Giulia');
  assert.equal(prematchServeLine({ names, server: 'opponent', fixed: true, drawn: true }), 'Sorteggio: batte sempre Marco');
  // contro la CPU il sorteggio non c'è: testo di sempre
  assert.equal(prematchServeLine({ server: 'opponent', drawn: true }), 'Batte per prima la CPU');
});

test('B68: dopo il conto «Start» senza chi batte e più breve', () => {
  assert.equal(START_AFTER_COUNT_MS(''), 1300);
  assert.equal(START_AFTER_COUNT_MS('Formato veloce: il servizio cambia ogni 2 punti'), 2000);
  assert.ok(START_AFTER_COUNT_MS('') < 1800 && START_AFTER_COUNT_MS('x') < 2600, 'più breve di prima');
  // natpfStartCall usa la riga senza chi batte (solo il formato veloce), non natpfStartSub
  const at = SRC.indexOf('natpfStartCall() {'), call = SRC.slice(at, SRC.indexOf('_setupPointServe({', at));
  assert.match(call, /natpfStartSubAfterCount/);
  assert.doesNotMatch(call, /this\.natpfStartSub\b(?!AfterCount)/);
  assert.match(SRC, /natpfStartSubAfterCount = ND\.altServe\(this, !!this\.score\.fair\) && !this\.score\.fixed \? NF\.FAST_SERVE_LINE : ""/);
});
