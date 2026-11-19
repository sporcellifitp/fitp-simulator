// B47 · battuta a un solo giocatore (richiesta dell'utente del 14/11: «ha più senso lasciare la battuta ad un solo
// giocatore piuttosto che alternata perché la gente non lo capisce»). Opzione del pannello dello stand «Battuta: Sempre
// lo stesso · Alternata», di base «Sempre lo stesso»: contro la CPU batte sempre chi gioca, nello stesso schermo chi batte
// il primo game, per tutta la partita e in tutti i formati; nella sfida tra due computer resta alternata.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SERVE_RULE_KEY, SERVE_RULE_DEFAULT, serveRuleOf, nextServeRule, serveRuleFromUrl, readServeRule, writeServeRule, serveRuleForcedByUrl, serveRuleButton, serveRuleToast, matchServe, fairServer } from '../src/natpf/natpf_battuta.js';
import { fairServer as fieraFairServer } from '../src/natpf/natpf_fiera.js';
import { nextServe } from '../src/natpf/natpf_fair_format.js';
import { firstServeText } from '../src/natpf/natpf_point_call.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('opzione: di base «Sempre lo stesso», salvata in natpf-tennis.battuta, l\'indirizzo la forza (?battuta=…)', () => {
  assert.equal(SERVE_RULE_KEY, 'natpf-tennis.battuta');
  assert.equal(SERVE_RULE_DEFAULT, 'fissa');
  assert.equal(readServeRule({ search: '', storage: memory() }), 'fissa', 'di base sempre lo stesso');
  assert.equal(readServeRule({ search: '', storage: null }), 'fissa');
  assert.equal(readServeRule({ search: '', storage: { getItem(){ throw new Error('bloccato'); } } }), 'fissa');
  const s = memory();
  assert.equal(writeServeRule('alternata', { storage: s }), 'alternata');
  assert.equal(s.m.get(SERVE_RULE_KEY), 'alternata');
  assert.equal(readServeRule({ search: '', storage: s }), 'alternata', 'resta salvata');
  assert.equal(writeServeRule('boh', { storage: s }), 'fissa', 'valore sconosciuto: quello di base');
  assert.equal(readServeRule({ search: '?battuta=alternata', storage: memory() }), 'alternata', 'indirizzo');
  assert.equal(readServeRule({ search: '?mode=casual&battuta=FISSA', storage: memory({ [SERVE_RULE_KEY]: 'alternata' }) }), 'fissa');
  assert.equal(serveRuleFromUrl('?battuta=boh'), null);
  assert.equal(serveRuleForcedByUrl('?battuta=alterna'), true);
  assert.equal(serveRuleForcedByUrl('?x=1'), false);
  assert.equal(serveRuleOf(undefined), 'fissa');
  assert.equal(nextServeRule('fissa'), 'alternata');
  assert.equal(nextServeRule('alternata'), 'fissa');
  assert.equal(serveRuleButton('fissa'), 'Sempre lo stesso');
  assert.equal(serveRuleButton('alternata', true), 'Alternata (indirizzo)');
  assert.match(serveRuleToast('fissa'), /contro l’avversario batte sempre chi gioca, nello stesso schermo chi batte il primo game/);
  assert.match(serveRuleToast('alternata'), /a ogni game/);
  assert.match(serveRuleToast('fissa', true), /comanda l’indirizzo/);
});

test('chi batte la partita: CPU → sempre chi gioca (anche con «Chi serve: CPU»), stesso schermo → chi batte il primo game, due computer → alternata', () => {
  assert.deepEqual(matchServe({ rule: 'fissa', mode: 'cpu', first: 'opponent' }), { server: 'player', fixed: true });
  assert.deepEqual(matchServe({ rule: 'fissa', mode: 'cpu', first: 'player' }), { server: 'player', fixed: true });
  assert.deepEqual(matchServe({ rule: 'fissa', mode: 'split', first: 'opponent' }), { server: 'opponent', fixed: true });
  assert.deepEqual(matchServe({ rule: 'fissa', mode: 'split', first: 'player' }), { server: 'player', fixed: true });
  assert.deepEqual(matchServe({ rule: 'fissa', mode: 'versus', first: 'opponent' }), { server: 'opponent', fixed: false });
  assert.deepEqual(matchServe({ rule: 'alternata', mode: 'cpu', first: 'opponent' }), { server: 'opponent', fixed: false });
  assert.deepEqual(matchServe({ rule: 'alternata', mode: 'split', first: 'player' }), { server: 'player', fixed: false });
  // la regola della B41 è la stessa funzione (natpf_fiera la riesporta)
  assert.equal(fieraFairServer, fairServer);
  assert.equal(fairServer({ fair: true, mode: 'cpu', normal: 'opponent' }), 'player');
});

test('nextServe con fixed: il servizio non cambia mai (fine game, formato veloce), senza resta come prima', () => {
  for (const fair of [false, true]){
    for (const played of [0, 1, 2, 5, 6]){
      for (const gameOver of [false, true]){
        assert.deepEqual(nextServe({ server: 'opponent', gameServer: 'opponent', played, gameOver, fair, fixed: true }), { server: 'opponent', gameServer: 'opponent' });
        assert.deepEqual(nextServe({ server: 'player', gameServer: 'player', played, gameOver, fair, fixed: true }), { server: 'player', gameServer: 'player' });
      }
    }
  }
  assert.deepEqual(nextServe({ server: 'player', gameOver: true }), { server: 'opponent', gameServer: 'opponent' }, 'senza fixed: come prima');
  assert.deepEqual(nextServe({ server: 'player', gameServer: 'player', played: 1, fair: true }), { server: 'opponent', gameServer: 'player' });
});

test('scritta d\'inizio dello stesso schermo: «Sorteggio: batte sempre Giulia»', () => {
  const names = { player: 'Giulia', opponent: 'Marco' };
  assert.equal(firstServeText({ sharedNames: names, server: 'player', drawn: true, fixed: true }), 'Sorteggio: batte sempre Giulia');
  assert.equal(firstServeText({ sharedNames: names, server: 'opponent', fixed: true }), 'Batte sempre Marco');
  assert.equal(firstServeText({ sharedNames: names, server: 'opponent', drawn: true }), 'Sorteggio: batte Marco', 'alternata: come prima');
});

// partita vera del motore senza grafica: chi batte ogni punto, finché uno vince `games` game
function servers(e, { games = 3, pattern = ['player', 'player', 'player', 'player', 'opponent', 'opponent', 'opponent', 'opponent'] } = {}){
  e.matchConfig.gamesToWin = games;
  e.startNewMatch({ showStartBanner: false });
  const seq = [];
  for (let i = 0; i < 200 && e.phase !== 'MATCH_OVER'; i++){
    seq.push(e.score.server);
    e._awardPoint(pattern[i % pattern.length], 'Out');
    if (e.phase === 'POINT_OVER') e._setupPointServe({ showBanner: false });
  }
  return { seq, games: [e.score.playerGames, e.score.opponentGames], fixed: e.score.fixed };
}
const cpuEngine = (rule, { fair = false, first = 'opponent' } = {}) => { const e = createHeadlessEngine({ difficulty: 'casual' }); e.natpfServeRule = rule; e.natpfFair = fair; e.natpfServeFirst = first; return e; };
const splitEngine = (rule, { fair = false, first = 'random', seed = 3, draw = null } = {}) => { const e = createHeadlessEngine({ difficulty: '1v1' }); e.startSplit(); e.natpfP2Hand = 'right'; e.natpfServeRule = rule; e.natpfFair = fair; e.natpfServeFirst = first; e.natpfRng = draw == null ? mulberry32(seed) : () => draw; return e; };

test('motore, contro la CPU con «Sempre lo stesso»: batte sempre chi gioca, in tutti i game e nel formato veloce, anche con «Chi serve: CPU»', () => {
  for (const fair of [false, true]){
    const r = servers(cpuEngine('fissa', { fair }), { games: 3 });
    assert.equal(r.fixed, true);
    assert.ok(r.seq.length >= 12, `partita giocata (${r.seq.length} punti)`);
    assert.ok(r.games[0] + r.games[1] >= 3, `più game giocati (${r.games})`);
    assert.ok(r.seq.every(s => s === 'player'), `fair=${fair}: ${r.seq.join(',')}`);
  }
});

test('motore, contro la CPU con «Alternata»: come prima (il servizio passa a fine game; nel formato veloce ogni due punti)', () => {
  const classic = servers(cpuEngine('alternata', { fair: false, first: 'player' }), { games: 3 });
  assert.equal(classic.fixed, false);
  assert.equal(classic.seq[0], 'player');
  assert.ok(classic.seq.includes('opponent'), 'la CPU batte anche lei');
  // un game di 4 punti di fila: 4 servizi del player, poi 4 della CPU
  assert.deepEqual(classic.seq.slice(0, 8), ['player', 'player', 'player', 'player', 'opponent', 'opponent', 'opponent', 'opponent']);
  const fast = servers(cpuEngine('alternata', { fair: true, first: 'player' }), { games: 2 });
  assert.deepEqual(fast.seq.slice(0, 4), ['player', 'opponent', 'opponent', 'player'], 'formato veloce: A, B B, A…');
});

test('motore, stesso schermo con «Sempre lo stesso»: batte per tutta la partita chi batte il primo game (sorteggio o «Chi serve»), anche con il formato veloce e il campo aperto', () => {
  const seen = new Set();
  for (const [seed, draw] of [[1, .1], [2, .9], [3, null], [4, .3], [5, .7], [6, null]]){
    for (const fair of [false, true]){
      const e = splitEngine('fissa', { fair, seed, draw });
      e.natpfOpenCourt = seed % 2 === 0;
      const r = servers(e, { games: 2 });
      assert.equal(r.fixed, true);
      const first = r.seq[0]; seen.add(first);
      assert.ok(r.seq.every(s => s === first), `seme ${seed}, fair=${fair}: ${r.seq.join(',')}`);
    }
  }
  assert.deepEqual([...seen].sort(), ['opponent', 'player'], 'il sorteggio sceglie ancora chi batte');
  for (const first of ['player', 'opponent']){
    const r = servers(splitEngine('fissa', { fair: true, first }), { games: 2 });
    assert.ok(r.seq.every(s => s === first), `«Chi serve» ${first}: ${r.seq.join(',')}`);
  }
  // alternata nello stesso schermo: come prima, il formato veloce passa il servizio ogni due punti
  const alt = servers(splitEngine('alternata', { fair: true, first: 'player' }), { games: 2 });
  assert.deepEqual(alt.seq.slice(0, 4), ['player', 'opponent', 'opponent', 'player']);
});

test('motore: lato del servizio secondo il punteggio come sempre, palla break per chi batte sempre, sfida tra due computer alternata', () => {
  const e = cpuEngine('fissa', { first: 'player' });
  e.matchConfig.gamesToWin = 3; e.startNewMatch({ showStartBanner: false });
  const sides = [e.score.deuceSide];
  for (const w of ['opponent', 'opponent', 'opponent']){ e._awardPoint(w, 'Out'); sides.push(e.score.deuceSide); e._setupPointServe({ showBanner: false }); }
  assert.deepEqual(sides, [true, false, true, false], 'destra, sinistra, destra… a ogni punto');
  assert.equal(e._getHighStakesPointLabel(), 'Break Point', 'chi batte sempre è sotto 0-40: palla break');
  e._awardPoint('opponent', 'Out');
  assert.equal(e.score.deuceSide, true, 'game nuovo: di nuovo da destra');
  assert.equal(e.score.server, 'player');
  // sfida tra due computer (host): la regola fissa non vale, si alterna come prima
  const v = cpuEngine('fissa', { first: 'player' }); v.isMultiplayer = true;
  const r = servers(v, { games: 2 });
  assert.equal(r.fixed, false);
  assert.ok(r.seq.includes('opponent'));
});

test('pannello dello stand e motore: la voce «Battuta» c\'è, il motore legge la regola a inizio partita, il banco resta «Alternata»', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /data-staff="battuta"[^>]*><span>Battuta<\/span><b>Sempre lo stesso<\/b>/);
  const kiosk = readFileSync(new URL('../src/natpf/natpf_kiosk.js', import.meta.url), 'utf8');
  assert.match(kiosk, /cmd === 'battuta'/);
  assert.match(kiosk, /set\('battuta', serveRuleButton\(/);
  const engine = readFileSync(new URL('../src/game_engine.js', import.meta.url), 'utf8');
  assert.match(engine, /NB\.matchServe\(/);
  assert.match(engine, /fixed: !!this\.score\.fixed \}\)/);
  assert.equal(createHeadlessEngine({ difficulty: 'casual' }).natpfServeRule, 'alternata');
});
