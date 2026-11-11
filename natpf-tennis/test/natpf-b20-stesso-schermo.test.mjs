// B20 · 1v1 tra due persone nello stesso schermo (decisioni dell'utente del 10/11 sull'audit B19,
// docs/b19/audit-1v1-utenti.md; documento docs/b20/tappa-a.md):
//   • chi batte per primo: «Sorteggio» di base nello stesso schermo, riproducibile (rng iniettabile), scritto nel banner;
//   • formato in fiera a tre valori (No · Solo stesso schermo · Sì), di base «Solo stesso schermo»;
//   • scritte: «Palla match <nome>», sottotitolo «1 game · punto decisivo sul 40-40», «Colpo a vuoto di <nome>»;
//   • richiamo per nome a chi deve battere e resta fermo.
// node --import ./test/register.mjs --test test/natpf-b20-stesso-schermo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { firstServer, serveChoice, splitServeChoice, SERVE_KEY, SPLIT_SERVE_KEY } from '../src/natpf/match_format.js';
import { FAIR_KEY, FAIR_MODES, FAIR_DEFAULT, fairModeOf, nextFairMode, readFairMode, writeFairMode, readFairFormat, writeFairFormat } from '../src/natpf/natpf_fair_format.js';
import { fairButton, fairToast } from '../src/natpf/natpf_kiosk.js';
import { firstServeText, stakesText, pointCall } from '../src/natpf/natpf_point_call.js';
import { formatText, scoreboardView } from '../src/natpf/natpf_scoreboard.js';
import { serveCoachView, SERVE_COACH } from '../src/natpf/natpf_serve_coach.js';
import { t as hudText } from '../src/natpf/natpf_i18n.js';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const NAMES = { player: 'Marco', opponent: 'Giulia' };
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/* ---------- B: chi batte per primo ---------- */
test('B: nello stesso schermo la scelta ha la sua chiave e di base è «Sorteggio»; le altre partite restano «chi gioca qui»', () => {
  assert.equal(SPLIT_SERVE_KEY, 'natpf-tennis.serve.split');
  assert.notEqual(SPLIT_SERVE_KEY, SERVE_KEY);
  assert.equal(splitServeChoice(null), 'random');
  assert.equal(splitServeChoice('boh'), 'random');
  assert.equal(splitServeChoice('player'), 'player');
  assert.equal(splitServeChoice('opponent'), 'opponent');
  assert.equal(serveChoice(null), 'player', 'contro la CPU come prima');
  // la pagina «Partita» ha i tre pulsanti (i nomi li scrive la lobby: Player 1 · Player 2 · Sorteggio)
  for (const v of ['player', 'opponent', 'random']) assert.match(html, new RegExp(`data-natpf-serve="${v}"`));
  const lobby = readFileSync(new URL('../src/natpf/natpf_lobby.js', import.meta.url), 'utf8');
  assert.match(lobby, /localStorage\.setItem\(this\.mode === 'split' \? SPLIT_SERVE_KEY : SERVE_KEY, this\.serve\)/);
});

test('B: sorteggio riproducibile (rng iniettabile) e scritto nel banner «Sorteggio: batte <nome>»', () => {
  assert.equal(firstServer('random', () => .2), 'player');
  assert.equal(firstServer('random', () => .7), 'opponent');
  const start = (rng, first = 'random') => {
    const banners = [];
    const e = createHeadlessEngine({ difficulty: '1v1' });
    e.hud = new Proxy({}, { get: (t, k) => (k === 'showCenterBanner' ? (text, o) => banners.push({ text, ...o }) : () => {}) });
    e.startSplit(); e.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' };
    e.natpfServeFirst = first; e.natpfRng = rng; e.natpfFair = false;
    e.startNewMatch({ showStartBanner: true });
    return { server: e.score.server, gameServer: e.score.gameServer, banner: banners.at(-1) };
  };
  const a = start(() => .2), b = start(() => .7);
  assert.equal(a.server, 'player'); assert.equal(a.gameServer, 'player');
  assert.equal(a.banner.text, 'Start'); assert.equal(a.banner.subText, 'Sorteggio: batte Marco');
  assert.equal(b.server, 'opponent'); assert.equal(b.banner.subText, 'Sorteggio: batte Giulia');
  // stessa sequenza → stessi battitori, partita dopo partita
  const seq = seed => { const r = mulberry32(seed); return Array.from({ length: 12 }, () => start(r).server).join(','); };
  assert.equal(seq(42), seq(42));
  assert.ok(seq(42).includes('player') && seq(42).includes('opponent'), 'escono tutti e due');
  // scelta fissa: «Batte Giulia», senza la parola «Sorteggio»
  assert.equal(start(() => .1, 'opponent').banner.subText, 'Batte Giulia');
  assert.equal(start(() => .9, 'player').banner.subText, 'Batte Marco');
});

test('B: fuori dallo stesso schermo il banner d\'inizio resta senza sottotitolo e il sorteggio usa Math.random come prima', () => {
  const banners = [];
  const e = createHeadlessEngine({ difficulty: 'casual' });
  e.hud = new Proxy({}, { get: (t, k) => (k === 'showCenterBanner' ? (text, o) => banners.push({ text, ...o }) : () => {}) });
  e.natpfServeFirst = 'random';
  const real = Math.random; Math.random = () => .9;
  try { e.startNewMatch({ showStartBanner: true }); } finally { Math.random = real; }
  assert.equal(e.score.server, 'opponent');
  assert.equal(banners.at(-1).text, 'Start');
  assert.equal(banners.at(-1).subText, undefined);
  assert.equal(banners.at(-1).durationMs, 1800);
  assert.equal(firstServeText({ sharedNames: null, server: 'player', drawn: true }), '');
  assert.equal(firstServeText({ sharedNames: NAMES, server: 'opponent', drawn: true }), 'Sorteggio: batte Giulia');
});

/* ---------- C: formato in fiera a tre valori ---------- */
test('C: tre valori, di base «Solo stesso schermo»; chi aveva salvato «Sì» resta «Sì»', () => {
  assert.deepEqual([...FAIR_MODES], ['no', 'split', 'si']);
  assert.equal(FAIR_DEFAULT, 'split');
  assert.equal(readFairMode({ search: '', storage: memory() }), 'split', 'niente di salvato');
  assert.equal(readFairMode({ search: '', storage: null }), 'split');
  assert.equal(readFairMode({ search: '', storage: { getItem(){ throw new Error('bloccato'); } } }), 'split');
  assert.equal(readFairMode({ search: '', storage: memory({ [FAIR_KEY]: '1' }) }), 'si', 'il «Sì» di prima resta «Sì»');
  assert.equal(readFairMode({ search: '', storage: memory({ [FAIR_KEY]: 'no' }) }), 'no');
  assert.equal(readFairMode({ search: '', storage: memory({ [FAIR_KEY]: 'split' }) }), 'split');
  // '0' era il «No» a due valori (il valore di base di allora): oggi vale il valore di base
  assert.equal(fairModeOf('0'), 'split');
  assert.equal(fairModeOf(null), 'split');
  // giro del pulsante: No → Solo stesso schermo → Sì → No
  assert.equal(nextFairMode('no'), 'split'); assert.equal(nextFairMode('split'), 'si'); assert.equal(nextFairMode('si'), 'no');
  const s = memory();
  assert.equal(writeFairMode('si', { storage: s }), 'si'); assert.equal(s.m.get(FAIR_KEY), '1', 'il «Sì» si salva come prima');
  assert.equal(writeFairMode('no', { storage: s }), 'no'); assert.equal(s.m.get(FAIR_KEY), 'no');
  assert.equal(writeFairMode('split', { storage: s }), 'split'); assert.equal(s.m.get(FAIR_KEY), 'split');
  assert.equal(writeFairFormat(true, { storage: s }), true); assert.equal(readFairMode({ search: '', storage: s }), 'si');
  assert.equal(writeFairFormat(false, { storage: s }), false); assert.equal(readFairMode({ search: '', storage: s }), 'no');
});

test('C: «Solo stesso schermo» vale tra due persone nello stesso schermo, non contro la CPU; l\'indirizzo comanda', () => {
  const none = memory(), no = memory({ [FAIR_KEY]: 'no' }), si = memory({ [FAIR_KEY]: '1' });
  assert.equal(readFairFormat({ search: '', storage: none, split: true }), true, 'di base, stesso schermo');
  assert.equal(readFairFormat({ search: '', storage: none, split: false }), false, 'di base, contro la CPU');
  assert.equal(readFairFormat({ search: '', storage: none }), false);
  assert.equal(readFairFormat({ search: '', storage: no, split: true }), false);
  assert.equal(readFairFormat({ search: '', storage: si, split: false }), true);
  assert.equal(readFairFormat({ search: '', storage: si, split: true }), true);
  // ?formato=fiera e ?formato=classico comandano per quella pagina, in tutte le modalità
  for (const split of [false, true]){
    assert.equal(readFairFormat({ search: '?formato=fiera', storage: no, split }), true);
    assert.equal(readFairFormat({ search: '?formato=classico', storage: si, split }), false);
    assert.equal(readFairFormat({ search: '?formato=classico', storage: none, split }), false);
  }
  assert.equal(readFairMode({ search: '?formato=fiera', storage: no }), 'si');
  assert.equal(readFairMode({ search: '?formato=classico', storage: si }), 'no');
});

test('C: nel motore di base lo stesso schermo gioca con il formato in fiera; CPU e sfida tra due computer con il classico', () => {
  // (nei test non c'è niente di salvato: vale il valore di base)
  const cpu = createHeadlessEngine({ difficulty: 'casual' }); cpu.startNewMatch({ showStartBanner: false });
  assert.equal(cpu.score.fair, false, 'contro la CPU');
  const split = createHeadlessEngine({ difficulty: '1v1' }); split.startSplit(); split.startNewMatch({ showStartBanner: false });
  assert.equal(split.score.fair, true, 'stesso schermo');
  const host = createHeadlessEngine({ difficulty: '1v1' }); host.versus = { active: true }; host.roomId = 'AT-AB12'; host.isMultiplayer = true;
  host.startNewMatch({ showStartBanner: false });
  assert.equal(host.score.fair, false, 'sfida tra due computer');
  // natpfFair a mano (test e simulazioni) comanda sempre
  const off = createHeadlessEngine({ difficulty: '1v1' }); off.startSplit(); off.natpfFair = false; off.startNewMatch({ showStartBanner: false });
  assert.equal(off.score.fair, false);
});

test('C: pannello dello stand, scritte dei tre valori e dell\'avviso', () => {
  assert.equal(fairButton('no'), 'No');
  assert.equal(fairButton('split'), 'Solo stesso schermo');
  assert.equal(fairButton('si'), 'Sì · punto decisivo');
  assert.equal(fairButton('no', true), 'No (indirizzo)');
  assert.equal(fairButton('si', true), 'Sì · punto decisivo (indirizzo)');
  assert.match(fairToast('split'), /solo nello stesso schermo.*contro la CPU formato classico.*Vale dalla prossima partita; resta salvata/);
  assert.match(fairToast('si'), /punto decisivo sul 40-40/);
  assert.match(fairToast('no'), /un battitore per game/);
  assert.match(fairToast('split', true), /salvato solo per lo stesso schermo.*comanda l’indirizzo/);
  assert.match(html, /data-staff="fair"[^>]*title="No · Solo stesso schermo · Sì\./);
});

/* ---------- A4: scritte ---------- */
test('A4: «Palla match <nome>» nello stesso schermo; il punto decisivo e le altre partite restano senza nome', () => {
  assert.equal(stakesText('Match Point', { sharedNames: NAMES, points: [3, 1] }), 'Match Point Marco');
  assert.equal(stakesText('Match Point', { sharedNames: NAMES, points: [2, 3] }), 'Match Point Giulia');
  assert.equal(stakesText('Game Point', { sharedNames: NAMES, points: [4, 3] }), 'Game Point Marco');
  assert.equal(stakesText('Break Point', { sharedNames: NAMES, points: [3, 4] }), 'Break Point Giulia');
  assert.equal(stakesText('Deciding Point', { sharedNames: NAMES, points: [3, 3] }), 'Deciding Point');
  assert.equal(stakesText('Match Point', { sharedNames: null, points: [3, 1] }), 'Match Point', 'contro la CPU come prima');
  assert.equal(stakesText(null, { sharedNames: NAMES, points: [3, 1] }), null);
  assert.equal(hudText('Match Point Giulia'), 'Palla match Giulia');
  assert.equal(hudText('Game Point Marco'), 'Palla game Marco');
  // nel motore: stesso schermo, 40-15 per il Player 2 in una partita a 1 game → banner «Match Point Giulia», voce di prima
  const banners = [], said = [];
  const e = createHeadlessEngine({ difficulty: '1v1' });
  e.hud = new Proxy({}, { get: (t, k) => (k === 'showCenterBanner' ? (text, o) => banners.push({ text, ...o }) : () => {}) });
  e.audioEngine = new Proxy({}, { get: (t, k) => (k === 'announceScore' ? v => said.push(v) : () => {}) });
  e.startSplit(); e.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' }; e.natpfFair = true; e.natpfServeFirst = 'player'; e.matchConfig.gamesToWin = 1;
  e.startNewMatch({ showStartBanner: false });
  e.score.playerPoints = 1; e.score.opponentPoints = 3;
  e._setupPointServe({ showBanner: true });
  assert.equal(banners.at(-1).text, 'Match Point Giulia');
  assert.equal(said.at(-1), 'Match Point', 'la voce non dice il nome (nessuna clip nuova)');
  // contro la CPU: «Match Point» come prima
  const c = createHeadlessEngine({ difficulty: 'casual' }), cb = [];
  c.hud = new Proxy({}, { get: (t, k) => (k === 'showCenterBanner' ? (text, o) => cb.push({ text, ...o }) : () => {}) });
  c.matchConfig.gamesToWin = 1; c.startNewMatch({ showStartBanner: false }); c.score.playerPoints = 3; c.score.opponentPoints = 1;
  c._setupPointServe({ showBanner: true });
  assert.equal(cb.at(-1).text, 'Match Point');
});

test('A4: sottotitolo del tabellone «1 game · punto decisivo sul 40-40» con il formato in fiera; classico come prima', () => {
  assert.equal(formatText(1), 'Partita a 1 game');
  assert.equal(formatText(2), 'Al meglio di 3 game');
  assert.equal(formatText(1, { fair: true }), '1 game · punto decisivo sul 40-40');
  assert.equal(formatText(2, { fair: true }), 'Al meglio di 3 · punto decisivo sul 40-40');
  assert.equal(formatText(1, { fair: true, short: true }), '1 game');
  const sc = (pp, op, fair) => ({ playerPoints: pp, opponentPoints: op, playerGames: 0, opponentGames: 0, server: 'player', fair });
  const opt = { gamesToWin: 1, split: true, splitNames: { p1: 'Marco', p2: 'Giulia' } };
  assert.equal(scoreboardView(sc(1, 0, true), opt).format, '1 game · punto decisivo sul 40-40');
  // sul 40-40 la scritta del momento dice già «Punto decisivo»: il formato resta corto, così ci stanno tutti e due
  const d = scoreboardView(sc(3, 3, true), opt);
  assert.equal(d.label, 'Punto decisivo'); assert.equal(d.format, '1 game');
  assert.equal(scoreboardView(sc(1, 0, false), opt).format, 'Partita a 1 game');
  assert.equal(scoreboardView(sc(1, 0, true), { gamesToWin: 1 }).format, '1 game · punto decisivo sul 40-40', 'anche contro la CPU, se lo staff ha scelto «Sì»');
});

test('A4: banner del punto, «Colpo a vuoto di <chi ha perso>» quando ha fatto il gesto a vuoto; altrimenti «Vincente di <chi ha vinto>»', () => {
  const base = { winner: 'opponent', why: 'Nice Shot!', sharedNames: NAMES, score: { player: '15', opponent: '30' } };
  assert.equal(pointCall(base).subText, 'Vincente di Giulia · Marco 15 · Giulia 30');
  assert.equal(pointCall({ ...base, whiff: true }).subText, 'Colpo a vuoto di Marco · Marco 15 · Giulia 30');
  assert.equal(pointCall({ ...base, whiff: true }).text, 'Punto Giulia');
  // gli altri motivi non cambiano con whiff
  assert.match(pointCall({ ...base, why: 'Out', whiff: true }).subText, /^Errore di Marco: palla fuori/);
  assert.match(pointCall({ ...base, why: 'Ace!', whiff: true }).subText, /^Ace di Giulia/);
  // contro la CPU niente cambia
  assert.equal(pointCall({ winner: 'opponent', why: 'Nice Shot!', whiff: true }).subText, 'Vincente della CPU');
});

test('A4: nel motore il gesto a vuoto di chi perde il punto arriva al banner, e vale solo per quel punto', () => {
  const banners = [];
  const e = createHeadlessEngine({ difficulty: '1v1' });
  e.hud = new Proxy({}, { get: (t, k) => (k === 'showCenterBanner' ? (text, o) => banners.push({ text, ...o }) : () => {}) });
  e.startSplit(); e.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' }; e.natpfFair = false; e.natpfServeFirst = 'player';
  e.startNewMatch({ showStartBanner: false });
  // scambio: il P1 fa il gesto troppo presto (a vuoto) sulla palla n. 4, che poi passa
  e.phase = 'RALLY'; e.ball.rallyStrokeCount = 4; e.ball.lastHitter = 'opponent';
  e._natpfEarlyWhiff({ actor: e.player, evt: {} });
  assert.deepEqual(e.natpfLastWhiff, { side: 'player', stroke: 4 });
  e._awardPoint('opponent', 'Nice Shot!');
  assert.match(banners.at(-1).subText, /^Colpo a vuoto di Marco/);
  assert.equal(e.natpfLastWhiff, null);
  // punto dopo, stessa palla n. 4, nessun gesto: «Vincente di Giulia»
  e.phase = 'RALLY'; e.ball.rallyStrokeCount = 4; e.ball.lastHitter = 'opponent';
  e._awardPoint('opponent', 'Nice Shot!');
  assert.match(banners.at(-1).subText, /^Vincente di Giulia/);
  // gesto a vuoto su una palla, poi colpita la palla dopo: non vale più
  e.phase = 'RALLY'; e.ball.rallyStrokeCount = 2; e.ball.lastHitter = 'player';
  e._natpfEarlyWhiff({ actor: e.opponent, evt: {} });
  e.ball.rallyStrokeCount = 5; e.ball.lastHitter = 'player';
  e._awardPoint('player', 'Nice Shot!');
  assert.match(banners.at(-1).subText, /^Vincente di Marco/);
  // il gesto a vuoto di chi VINCE il punto non conta
  e.phase = 'RALLY'; e.ball.rallyStrokeCount = 3; e.ball.lastHitter = 'opponent';
  e._natpfEarlyWhiff({ actor: e.opponent, evt: {} });
  e._awardPoint('opponent', 'Nice Shot!');
  assert.match(banners.at(-1).subText, /^Vincente di Giulia/);
  // (revisione) gesto su una palla fuori portata: è un vincente dell'altro, non un colpo a vuoto
  e.score.playerPoints = 0; e.score.opponentPoints = 0;   // (game da capo: i punti di prima non devono chiuderlo)
  e.phase = 'RALLY'; e.ball.rallyStrokeCount = 6; e.ball.lastHitter = 'opponent';
  e._natpfEarlyWhiff({ actor: e.player, evt: {}, natpfWhy: 'portata' });
  assert.equal(e.natpfLastWhiff, null);
  e._awardPoint('opponent', 'Nice Shot!');
  assert.match(banners.at(-1).subText, /^Vincente di Giulia/);
  // … troppo tardi invece sì
  e.phase = 'RALLY'; e.ball.rallyStrokeCount = 6; e.ball.lastHitter = 'opponent';
  e._natpfEarlyWhiff({ actor: e.player, evt: {}, natpfWhy: 'tardi' });
  e._awardPoint('opponent', 'Nice Shot!');
  assert.match(banners.at(-1).subText, /^Colpo a vuoto di Marco/);
  // (revisione) il colpo a vuoto vale solo per il suo punto: il servizio dopo lo azzera (per esempio un punto rigiocato)
  e.phase = 'RALLY'; e.ball.rallyStrokeCount = 2; e.ball.lastHitter = 'opponent';
  e._natpfEarlyWhiff({ actor: e.player, evt: {} });
  assert.ok(e.natpfLastWhiff);
  e._setupPointServe({ showBanner: false });
  assert.equal(e.natpfLastWhiff, null);
});

/* ---------- A5: richiamo per nome ---------- */
test('A5: chi deve battere e resta fermo viene chiamato per nome dopo 9 s, solo nello stesso schermo', () => {
  assert.equal(SERVE_COACH.callS, 9);
  const s = { served: { player: 5, opponent: 5 }, missAt: null };
  const g = { phase: 'SERVE_STANCE', mine: true, server: 'opponent', controller: 'phone', name: 'Giulia' };
  assert.equal(serveCoachView(s, { ...g, idle: 5 }), null, 'prima niente (ha già servito)');
  assert.deepEqual(serveCoachView(s, { ...g, idle: 6 }), { state: 'toss', big: 'Alza il telefono: lanci la palla', sub: 'Poi colpisci quando la palla è in alto' });
  assert.deepEqual(serveCoachView(s, { ...g, idle: 9 }), { state: 'toss', call: true, big: 'Giulia, batti tu', sub: 'Alza il telefono: lanci la palla' });
  assert.deepEqual(serveCoachView(s, { ...g, idle: 40, controller: 'webcam' }), { state: 'toss', call: true, big: 'Giulia, batti tu', sub: 'Alza la mano: lanci la palla' });
  // anche nei primi servizi (istruzioni piene): dopo 9 s il nome
  assert.equal(serveCoachView({ served: { player: 0, opponent: 0 } }, { ...g, idle: 12 }).big, 'Giulia, batti tu');
  // fuori dallo stesso schermo (nessun nome): come prima
  assert.deepEqual(serveCoachView(s, { ...g, name: '', idle: 40 }), { state: 'toss', big: 'Alza il telefono: lanci la palla', sub: 'Poi colpisci quando la palla è in alto' });
  // durante il lancio niente richiamo
  assert.equal(serveCoachView(s, { ...g, phase: 'SERVE_TOSS', idle: 40, tossT: .5 }), null);
});

/* ---------- D: «scambio che si scalda» (opzione dello staff, spenta di base) ---------- */
import * as THREE from 'three';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';
import { HOT_KEY, HOT_RALLY, readHotRally, writeHotRally, hotSteps, hotFlight, hotHeat, hotOutcome, hotRallyFor, hotRallyView, hotButton, hotToast } from '../src/natpf/natpf_hot_rally.js';

test('D: opzione spenta di base, salvata in natpf-tennis.scambioCaldo; nel pannello dello stand «No · Sì»', () => {
  assert.equal(HOT_KEY, 'natpf-tennis.scambioCaldo');
  assert.equal(readHotRally({ storage: memory() }), false, 'spenta di base');
  assert.equal(readHotRally({ storage: null }), false);
  assert.equal(readHotRally({ storage: { getItem(){ throw new Error('bloccato'); } } }), false);
  const s = memory();
  assert.equal(writeHotRally(true, { storage: s }), true); assert.equal(s.m.get(HOT_KEY), '1');
  assert.equal(readHotRally({ storage: s }), true, 'resta salvata');
  writeHotRally(false, { storage: s }); assert.equal(readHotRally({ storage: s }), false);
  assert.equal(hotButton(false), 'No'); assert.equal(hotButton(true), 'Sì · dal 10° colpo');
  assert.match(hotToast(true), /dal 10° colpo la palla va sempre più veloce per tutti e due.*Vale dalla prossima partita; resta salvata/);
  assert.match(hotToast(false), /spento/);
  assert.match(html, /data-staff="hot"[^>]*><span>Scambio che si scalda<\/span><b>No<\/b>/);
  assert.match(html, /id="natpf-hot-rally"/);
});

test('D: vale solo tra due persone nello stesso schermo con i due telefoni', () => {
  const on = memory({ [HOT_KEY]: '1' });
  assert.equal(hotRallyFor({ split: true, storage: on }), true);
  assert.equal(hotRallyFor({ split: false, storage: on }), false, 'contro la CPU e nella sfida tra due computer mai');
  assert.equal(hotRallyFor({ split: true, webcam: true, storage: on }), false, 'webcam per due: no');
  assert.equal(hotRallyFor({ split: true, storage: memory() }), false, 'spenta di base');
  assert.equal(hotRallyFor({ split: true, forced: true, storage: memory() }), true, 'a mano (test e simulazioni)');
  assert.equal(hotRallyFor({ split: true, forced: false, storage: on }), false);
  assert.equal(hotRallyFor({ split: false, forced: true }), false);
  // nel motore: deciso a inizio partita
  const mk = (split, forced) => { const e = createHeadlessEngine({ difficulty: split ? '1v1' : 'casual' }); if (split) e.startSplit(); if (forced !== undefined) e.natpfHotRally = forced; e.startNewMatch({ showStartBanner: false }); return e.natpfHot; };
  assert.equal(mk(true), false, 'stesso schermo, di base spenta');
  assert.equal(mk(true, true), true);
  assert.equal(mk(false, true), false, 'contro la CPU niente, anche forzata');
  // (revisione) finito lo stesso schermo l'opzione non resta accesa nel motore
  const e = createHeadlessEngine({ difficulty: '1v1' }); e.startSplit(); e.natpfHotRally = true; e.startNewMatch({ showStartBanner: false });
  assert.equal(e.natpfHot, true);
  e.endSplit();
  assert.equal(e.natpfHot, false);
});

test('D: dal 10° colpo la palla passa via via più bassa e più carica; spenta o prima del 10° niente cambia', () => {
  assert.equal(HOT_RALLY.from, 10);
  for (let n = 0; n <= 200; n++){ assert.equal(hotFlight(n, false), 1); assert.equal(hotSteps(n, false), 0); assert.equal(hotHeat(n, false), 0); }
  for (let n = 0; n < 10; n++){ assert.equal(hotFlight(n, true), 1); assert.equal(hotHeat(n, true), 0); }
  assert.equal(hotSteps(10, true), 1); assert.equal(hotSteps(19, true), 10);
  assert.ok(hotFlight(10, true) < 1 && hotFlight(15, true) < hotFlight(10, true));
  assert.equal(hotFlight(200, true), HOT_RALLY.min);
  // (revisione) il 10° colpo parte già da 4 passi su 10: la palla accelera davvero da quando compare la scritta
  assert.ok(Math.abs(hotHeat(10, true) - .4) < 1e-9); assert.equal(hotHeat(16, true), 1); assert.equal(hotHeat(26, true), 2); assert.equal(hotHeat(100, true), HOT_RALLY.maxHeat);
  const out = { shot: 'TOPSPIN', clear: 1.8, topspin: 18, depth: 9 };
  assert.equal(hotOutcome(out, 15, false), out, 'spenta: lo stesso oggetto');
  assert.equal(hotOutcome(out, 9, true), out, 'prima del 10° colpo: lo stesso oggetto');
  const h10 = hotOutcome(out, 10, true), h19 = hotOutcome(out, 16, true), h29 = hotOutcome(out, 26, true);
  assert.ok(h10.clear < out.clear && h19.clear < h10.clear, 'sempre più bassa sulla rete');
  assert.ok(h10.clear < out.clear - .25, `già dal 10° colpo più bassa di un bel po' (${h10.clear})`);
  assert.ok(Math.abs(h19.clear - (.914 + HOT_RALLY.netGap)) < 1e-9, 'al massimo a 16 cm dal nastro');
  assert.equal(h29.clear, h19.clear);
  assert.ok(h10.topspin > out.topspin && h19.topspin > h10.topspin && h29.topspin > h19.topspin, 'sempre più carica');
  assert.equal(h19.depth, 9, 'la profondità non cambia');
  // (revisione) il tagliato resta un tagliato: più basso sulla rete, ma l'effetto all'indietro non cambia mai
  const slice = { shot: 'SLICE', clear: 1.5, topspin: -6.5 };
  for (const n of [10, 16, 26, 60]){ const s = hotOutcome(slice, n, true); assert.equal(s.topspin, -6.5, `tagliato al colpo ${n}`); assert.ok(s.clear < slice.clear); assert.ok(s.hot > 0); }
  // pallonetto, palla corta, schiacciata e colpi sbagliati restano come sono
  for (const shot of ['LOB', 'DROP', 'SMASH']) { const o = { shot, clear: 2, topspin: 5 }; assert.equal(hotOutcome(o, 25, true), o); }
  const net = { shot: 'TOPSPIN', clear: 1.5, topspin: 15, netFault: true }; assert.equal(hotOutcome(net, 25, true), net);
  const fail = { shot: 'TOPSPIN', clear: 1.5, topspin: 15, failed: true }; assert.equal(hotOutcome(fail, 25, true), fail);
  // una palla già più bassa del minimo non si alza
  assert.equal(hotOutcome({ shot: 'FLAT', clear: 1.0, topspin: 12 }, 19, true).clear, 1.0);
});

test('D (revisione): nel motore la palla è più veloce già al 10° colpo, quando compare la scritta', () => {
  const off = rallyFlight('p1', 9, false), on = rallyFlight('p1', 9, true), before = rallyFlight('p1', 8, true), beforeOff = rallyFlight('p1', 8, false);
  assert.deepEqual(before, beforeOff, 'il 9° colpo è ancora quello di sempre');
  assert.ok(on.hot > 0 && on.speed > off.speed*1.05, `10° colpo: ${off.speed.toFixed(1)} → ${on.speed.toFixed(1)} m/s`);
  assert.equal(hotRallyView({ on: true, phase: 'RALLY', inPlay: true, strokes: 10 }).sub, 'Colpo 10 · palla sempre più veloce');
});

test('D: scritta «Scambio caldo» solo nello scambio, dal 10° colpo, con tre gradi', () => {
  const g = { on: true, phase: 'RALLY', inPlay: true };
  assert.equal(hotRallyView({ ...g, strokes: 9 }), null);
  assert.deepEqual(hotRallyView({ ...g, strokes: 10 }), { big: 'Scambio caldo', sub: 'Colpo 10 · palla sempre più veloce', level: 1 });
  assert.equal(hotRallyView({ ...g, strokes: 14 }).level, 2);
  assert.equal(hotRallyView({ ...g, strokes: 18 }).level, 3);
  assert.equal(hotRallyView({ ...g, strokes: 40 }).level, 3);
  assert.equal(hotRallyView({ ...g, on: false, strokes: 30 }), null, 'opzione spenta: mai');
  assert.equal(hotRallyView({ ...g, phase: 'POINT_OVER', strokes: 30 }), null);
  assert.equal(hotRallyView({ ...g, inPlay: false, strokes: 30 }), null);
});

// stessa palla per il P1 e per il P2 (specchiata), al colpo numero `rally` + 1 dello scambio: tempo di volo del colpo
function rallyFlight(who, rally, hot){
  const real = Math.random; Math.random = mulberry32(17);
  try {
    const e = createHeadlessEngine({ difficulty: '1v1' });
    e.startSplit(); e.natpfFair = false; e.natpfHotRally = hot; e.natpfP2Hand = 'right'; e.startNewMatch({ showStartBanner: false });
    const m = who === 'p2' ? -1 : 1, A = who === 'p2' ? e.opponent : e.player, mine = who === 'p2' ? 'opponent' : 'player';
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = who === 'p2' ? 'player' : 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
    A.pos.set(m*.4, 0, m*11.7); A.targetPos.copy(A.pos); A.vel.set(0, 0, 0);
    e.pendingUserSwing = null; e.pendingP2Swing = null;
    e.ball.pos.set(-m*.5, 1, -m*11); e.ball.spin.set(0, 0, 0);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(m*1.6, 0, m*8.5), 1.05, { topspin: 14 });
    who === 'p2' ? e._natpfPlanOpponent(e.opponent) : e._natpfPlanPlayer();
    const intent = { shot: 'topspin', power: .6, depth: .6, rise: .3, face: 0 };
    const swing = { source: 'natpf-phone', side: 'forehand', hand: 'right', shotType: ENGINE_SHOT.topspin, speed: .8 + .6*.85, dirX: 0, natpf: { aim: 'swing', shot: 'topspin', intent, power: .6, peak: 900, typical: 900, angle: 60, latency: 0, hand: 'right' } };
    let sent = false;
    for (let t = 0; t < 3; t += 1/120){
      const ttc = NI.timeToContact(e, A);
      if (!sent && ttc != null && ttc <= .02){ sent = true; who === 'p2' ? e._handleP2SwingInput(swing) : e._handleUserSwingInput(swing); }
      if (e.ball.lastHitter === mine || e.phase !== 'RALLY') break;
      e.step(1/120);
    }
    assert.equal(e.ball.lastHitter, mine, `${who}: colpita`);
    return { flight: e.natpfLastRacket.flight, speed: e.ball.vel.length(), shot: e.natpfLastRacket.out.shot, hot: e.natpfLastRacket.out.hot || 0 };
  } finally { Math.random = real; }
}

test('D: nel motore, stessa palla al 15° colpo: accesa vola più veloce, uguale per il P1 e per il P2; spenta e prima del 10° identica', () => {
  const off = { p1: rallyFlight('p1', 14, false), p2: rallyFlight('p2', 14, false) };
  const on = { p1: rallyFlight('p1', 14, true), p2: rallyFlight('p2', 14, true) };
  const early = { p1: rallyFlight('p1', 5, true), p1off: rallyFlight('p1', 5, false) };
  for (const who of ['p1', 'p2']){
    assert.equal(off[who].hot, 0);
    assert.ok(on[who].hot > 0, `${who}: colpo caldo`);
    assert.ok(on[who].flight < off[who].flight*.92, `${who}: volo ${off[who].flight} → ${on[who].flight} s`);
    assert.ok(on[who].speed > off[who].speed*1.08, `${who}: velocità ${off[who].speed.toFixed(1)} → ${on[who].speed.toFixed(1)} m/s`);
  }
  assert.ok(Math.abs(on.p1.flight - on.p2.flight) < .011, `uguale per i due: P1 ${on.p1.flight} s, P2 ${on.p2.flight} s`);
  assert.ok(Math.abs(off.p1.flight - off.p2.flight) < .011);
  assert.deepEqual(early.p1, early.p1off, 'prima del 10° colpo niente cambia');
});
