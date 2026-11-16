// B54 · nome del giocatore scritto sul telefono prima di «Sono pronto» (richiesta dell'utente del 16/11/2026; decisioni:
// facoltativo con «Salta» in alto a destra, prima di «Sono pronto», campo vuoto per un giocatore nuovo e con il nome di
// prima nella rivincita, filtro delle parole volgari più la correzione dello staff dal PC). Lato computer:
// natpf_ready_go.js (richiesta, risposta, dove va il nome), natpf_phone_racket.js (messaggi nm), natpf_scoreboard.js (nome
// al posto di «Tu»); le regole del nome stanno in site/js/tennis/player-name.js (anche per il telefono).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { phoneLike, playWorld, secondPhone } from './trial-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { readyGoState, readyGoChip, namePrefill, nameAnswer, READY_GO } from '../src/natpf/natpf_ready_go.js';
import { validNickname } from '../src/natpf/natpf_events.js';
import { rudeName } from '../../site/js/tennis/player-name.js';
import { rowNames, scoreboardView } from '../src/natpf/natpf_scoreboard.js';
import { resetFairVisitor } from '../src/natpf/natpf_new_player.js';

/* ---------- regole del nome ---------- */
const REAL = ['Marco', 'Giulia', 'Francesco', 'Francesca', 'Alessandro', 'Sofia', 'Nazario', 'Troiano', 'Yamashita', 'Fagotto',
  'Cazorla', 'Federica', 'Ercole', 'Pasquale', 'Nicola', 'Domenico', 'Sergio', 'Giorgio', 'Gianluca', 'Negri', 'Negroni', 'Cosimo',
  'Scunthorpe', 'Dickens', 'Sexton', 'Essex', 'Cocker', 'Ducea', 'Anna Maria', 'J.Rossi', 'Mario-Rossi', 'Saverio', 'Zoccoli',
  'Culotta', 'Assunta', 'Concetta', 'Penelope', 'Segantini', 'Figaro', 'Shitara', 'Nigel', 'Niccolò', 'Raffaele', 'Vito', 'Mattia',
  'Lorenzo', 'Tommaso', 'Riccardo', 'Gabriele', 'Andrea', 'Matteo', 'Davide', 'Emma', 'Aurora', 'Ginevra', 'Beatrice', 'Vittoria',
  'Chiara', 'Martina', 'Bianca', 'Diego', 'Dioniso', 'Porcu', 'Madonna', 'Cornelia', 'Bastiano', 'Ace 99', 'Ospite 2', 'José'];
const RUDE = ['cazzo', 'Caaazzo', 'c4zz0', 'C A Z Z O', 'merda', 'M3rda', 'Stronzo', 'vaffanculo', 'puttana', 'coglione', 'minchia',
  'porcodio', 'Dio Cane', 'diocane', 'troia', 'Negro', 'nazi', 'Hitler', 'fuck', 'FuckYou', 'shit', 'bitch', 'Mario Culo',
  'culone', 'suca', 'Sieg Heil', 'zoccola', 'sborra', 'bastardo', 'frocio', 'ricchione', 'pompino', 'cornuto', 'dux', 'duce',
  'figa', 'tette', 'asshole', 'pussy', 'nigger', 'sex', 'dick'];

test('regole del nome: i nomi veri passano, le parolacce no (anche con numeri, lettere doppie e spazi)', () => {
  const refused = REAL.filter(n => !validNickname(n).ok).map(n => `${n}: ${validNickname(n).why}`);
  assert.deepEqual(refused, [], 'nomi veri rifiutati');
  const passed = RUDE.filter(n => !rudeName(n));
  assert.deepEqual(passed, [], 'parole da non mostrare che passano');
  for (const n of RUDE) if (n.replace(/\s/g, '').length >= 2 && n.length <= 14) assert.equal(validNickname(n).why, 'Scegli un altro nome', n);
  // le regole di sempre restano
  assert.deepEqual(validNickname('  Ace   99 '), { ok: true, nick: 'Ace 99' });
  assert.equal(validNickname('a').ok, false);
  assert.equal(validNickname('x'.repeat(15)).ok, false);
  assert.equal(validNickname('<b>').ok, false);
  assert.equal(validNickname('Ospite').ok, false);
  // i nomi che il gioco dà da solo non si scelgono
  for (const n of ['Player 1', 'giocatore 2', 'Visitatore 12', 'Telefono']) assert.equal(validNickname(n).ok, false, n);
});

test('nome da proporre e risposta del telefono (funzioni pure)', () => {
  assert.equal(namePrefill('', 'p1'), '');
  assert.equal(namePrefill('Player 1', 'p1'), '', 'nome dato dal gioco: campo vuoto');
  assert.equal(namePrefill('Player 2', 'p2'), '');
  assert.equal(namePrefill('Visitatore 7', 'p1'), '');
  assert.equal(namePrefill('Marco', 'p1'), 'Marco', 'rivincita: il nome di prima');
  assert.deepEqual(nameAnswer({ skip: true }), { ok: true, name: null, why: '' });
  assert.deepEqual(nameAnswer({ name: '  Giulia ' }), { ok: true, name: 'Giulia', why: '' });
  assert.deepEqual(nameAnswer({ name: 'merda' }), { ok: false, name: null, why: 'Scegli un altro nome' });
  assert.equal(nameAnswer({ name: '' }).ok, false);
  const st = readyGoState([{ id: 'p1', name: 'Marco', naming: true, tapped: true }]);
  assert.equal(st.all, false, 'chi scrive il nome non è ancora pronto');
  assert.equal(st.list[0].tapped, false);
  assert.deepEqual(readyGoChip(st.list[0]), { cls: 'is-wait', text: 'Marco: scrive il nome' });
  assert.deepEqual(readyGoChip(st.list[0], { solo: true }), { cls: 'is-wait', text: 'Telefono: scrive il nome' });
});

test('tabellone contro la CPU: il nome di chi gioca al posto di «Tu»; senza nome «Tu»', () => {
  assert.deepEqual(rowNames({ myName: 'Marco' }), { me: 'Marco', them: 'CPU' });
  assert.deepEqual(rowNames({}), { me: 'Tu', them: 'CPU' });
  assert.deepEqual(rowNames({ myName: 'Marco', doubles: true }), { me: 'Marco + CPU', them: '2 CPU' });
  assert.deepEqual(rowNames({ split: true, splitNames: { p1: 'Anna', p2: 'Luca' }, myName: 'X' }), { me: 'Anna', them: 'Luca' });
  const v = scoreboardView({ playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player' }, { myName: 'Giulia' });
  assert.equal(v.rows[0].name, 'Giulia'); assert.equal(v.rows[0].short, 'GIU');
});

/* ---------- nel gioco ---------- */
const nameMsgs = link => link.sent.filter(m => m.t === 'nm');
const offers = link => link.sent.filter(m => m.t === 'nx');
const answer = (P, r) => { const o = nameMsgs(P.link).at(-1); P._onName({ id: o?.id ?? null, v: r.v ?? '', skip: !!r.skip }); };
// pagina del telefono del B54: lo dice con il messaggio dev (nm 1)
const newPage = P => { P.device = { ...(P.device || {}), names: true }; };

test('contro la CPU: prima il nome (campo vuoto), poi «Sono pronto»; il nome va nel nickname, nel tabellone e mai nel registro', async () => {
  const w = await playWorld({ cal: 'none' }), { E, ui, lobby, link, P } = w;
  newPage(P);
  const logs = [], R = ui.diag.recorder || (ui.diag.recorder = {}), orig = R.log?.bind(R);
  R.log = (k, d) => { logs.push([k, d]); return orig?.(k, d); };
  w.advance(300);
  assert.ok(lobby.visible && lobby.step === 'match');
  assert.deepEqual({ ...nameMsgs(link).at(-1), id: 0 }, { t: 'nm', on: 1, v: '', id: 0 }, 'richiesta del nome, campo vuoto');
  assert.deepEqual(offers(link).at(-1), { t: 'nx', on: 0 }, 'niente «Sono pronto» prima del nome (quello offerto prima del B54 tolto)');
  assert.match($('ready-go').innerHTML, /scrive il nome/);
  // un tocco «Sono pronto» arrivato adesso non vale
  for (const fn of P.nextListeners) fn(P); w.advance(300); assert.equal(E.natpfMatchSeq || 0, 0);
  answer(P, { v: 'Marco' }); w.advance(300);
  assert.equal(ui.events.nickname, 'Marco');
  assert.deepEqual(nameMsgs(link).at(-1), { t: 'nm', on: 0 }, 'richiesta tolta');
  const rd = offers(link).at(-1); assert.ok(rd.on === 1 && rd.rd === 1 && rd.lb === READY_GO.label, 'poi «Sono pronto»');
  assert.match($('ready-go').innerHTML, /tocca «Sono pronto»/);
  // il registro dello stand: solo se il nome c'è
  assert.deepEqual(logs.filter(l => l[0] === 'pronto.nome'), [['pronto.nome', { chi: 'p1', nome: 'sì' }]]);
  assert.equal(JSON.stringify(logs).includes('Marco'), false, 'mai il nome nel registro');
  // partita: il tabellone dice Marco
  for (const fn of P.nextListeners) fn(P); w.advance(300);
  assert.equal(E.natpfMatchSeq, 1);
  ui.onScore({ playerPoints: 1, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  assert.match($('natpf-scoreboard').innerHTML, /data-sb-name="Marco"/);
});

test('rivincita: il nome di prima nel campo; giocatore nuovo («Prossimo giocatore»): campo vuoto; «Salta» tiene quello che c\'è', async () => {
  const w = await playWorld({ cal: 'none' }), { E, ui, lobby, link, P } = w;
  newPage(P); w.advance(300);
  answer(P, { v: 'Marco' }); w.advance(300);
  for (const fn of P.nextListeners) fn(P); w.advance(300);
  assert.equal(E.natpfMatchSeq, 1);
  // di nuovo sulla pagina (partita dopo, stessa persona): si richiede, con il nome di prima
  ui.backToMenu('match'); w.advance(300);
  assert.equal(lobby.step, 'match');
  const again = nameMsgs(link).at(-1); assert.ok(again.on === 1 && again.v === 'Marco', `rivincita: ${JSON.stringify(again)}`);
  answer(P, { skip: true }); w.advance(300);
  assert.equal(ui.events.nickname, 'Marco', '«Salta» tiene il nome');
  assert.ok(offers(link).at(-1).rd === 1);
  // giocatore nuovo: nickname dimenticato, campo vuoto
  ui.events.nickname = ''; ui.backToMenu('menu'); w.advance(200); ui.backToMenu('match'); w.advance(300);
  const fresh = nameMsgs(link).at(-1); assert.ok(fresh.on === 1 && fresh.v === '', `giocatore nuovo: ${JSON.stringify(fresh)}`);
  answer(P, { skip: true }); w.advance(300);
  assert.equal(ui.events.nickname, '', 'senza nome si gioca lo stesso');
  for (const fn of P.nextListeners) fn(P); w.advance(300);
  assert.equal(E.natpfMatchSeq, 2);
  ui.onScore({ playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  assert.match($('natpf-scoreboard').innerHTML, /data-sb-name="Tu"/);
});

test('nome volgare: rifiutato dal computer con il perché e richiesto di nuovo; il telefono può sempre saltare', async () => {
  const w = await playWorld({ cal: 'none' }), { ui, link, P } = w;
  newPage(P); w.advance(300);
  const first = nameMsgs(link).at(-1);
  answer(P, { v: 'merda' }); w.advance(300);
  const again = nameMsgs(link).at(-1);
  assert.ok(again.on === 1 && again.er === 'Scegli un altro nome' && again.id !== first.id, JSON.stringify(again));
  assert.equal(ui.events.nickname, '');
  assert.deepEqual(offers(link).at(-1), { t: 'nx', on: 0 }, 'ancora niente «Sono pronto»');
  // risposta con il numero di una richiesta vecchia: non vale
  P._onName({ id: first.id, v: 'Luca' }); w.advance(300);
  assert.equal(ui.events.nickname, '');
  answer(P, { v: 'Luca' }); w.advance(300);
  assert.equal(ui.events.nickname, 'Luca');
});

test('foglio dello staff aperto e chiuso: il nome scritto resta; una pagina del telefono di prima va dritta a «Sono pronto»', async () => {
  const w = await playWorld({ cal: 'none' }), { ui, link, P } = w;
  newPage(P); w.advance(300);
  answer(P, { v: 'Marco' }); w.advance(300);
  const staff = ui.staffOpen; ui.staffOpen = () => true; w.advance(300);
  assert.deepEqual(offers(link).at(-1), { t: 'nx', on: 0 }, 'col foglio dello staff niente offerte');
  ui.staffOpen = staff; w.advance(300);
  assert.equal(nameMsgs(link).at(-1).on, 0, 'il nome non si richiede');
  assert.ok(offers(link).at(-1).rd === 1, 'di nuovo «Sono pronto»');
});

test('una pagina del telefono di prima (senza dev nm 1) va dritta a «Sono pronto», come prima del B54', async () => {
  const w = await playWorld({ cal: 'none' }); w.advance(300);
  assert.equal(nameMsgs(w.link).length, 0, 'niente richiesta del nome');
  assert.ok(offers(w.link).at(-1).rd === 1, '«Sono pronto» come prima');
});

test('stesso schermo: ognuno scrive il suo nome sul suo telefono; nome nella metà del campo e nel tabellone; «Nuovo giocatore» li azzera', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'none' }), { E, ui, lobby, link } = w, P1 = ui.phone;
  const { P2, l2 } = secondPhone(E, NatpfPhoneRacket);
  phoneLike(P1, link); P1.markTutorialSeen('short'); P2.markTutorialSeen('short');
  newPage(P1); newPage(P2);
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint(); w.advance(300);
  link.cmd('skip'); l2.cmd('skip'); w.advance(300);
  lobby.go('match'); w.advance(300);
  assert.ok(nameMsgs(link).at(-1)?.on === 1 && nameMsgs(l2).at(-1)?.on === 1, 'richiesta a tutti e due');
  answer(P1, { v: 'Anna' }); w.advance(300);
  assert.equal(E.natpfSplitNames.p1, 'Anna');
  assert.ok(offers(link).at(-1).rd === 1 && !offers(l2).some(m => m.rd === 1 && m.on === 1), 'Anna è a «Sono pronto», l\'altro scrive ancora');
  assert.match($('ready-go').innerHTML, /Player 2: scrive il nome/);
  answer(P2, { v: 'Luca' }); w.advance(300);
  assert.equal(E.natpfSplitNames.p2, 'Luca');
  assert.equal(ui.split.name('p2'), 'Luca');
  for (const fn of P1.nextListeners) fn(P1); for (const fn of P2.nextListeners) fn(P2); w.advance(300);
  assert.equal(E.natpfMatchSeq, 1, 'partita in due');
  ui.onScore({ playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  assert.match($('natpf-scoreboard').innerHTML, /data-sb-name="Anna"/); assert.match($('natpf-scoreboard').innerHTML, /data-sb-name="Luca"/);
  // giocatori nuovi: nomi da capo, campi vuoti alla partita dopo
  ui.split.resetNames();
  assert.equal(ui.split.name('p1'), 'Player 1');
  assert.equal(typeof resetFairVisitor, 'function');
});
