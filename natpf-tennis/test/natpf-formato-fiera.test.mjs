// B18, ramo R4: formato in fiera (audit B16 miglioramento 1; decisione dell'utente del 10/11: opzione SPENTA di base,
// «dimmi come attivarlo»). Accesa: punto decisivo sul 40-40 e servizio come nel tie-break (A, B B, A A…), così batte
// anche la CPU o il Player 2; «Al meglio di 5» diventa «Al meglio di 3». Spenta: tutto come prima.
// Più il servizio della CPU (audit B16, punto 17): velocità vera sul tabellone e niente tremolio della telecamera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAIR_KEY, fairFromUrl, readFairFormat, writeFairFormat, fairForcedByUrl, pointServer, gameWinner, isDecidingPoint, nextServe, decidingVoice, fairGamesToWin, installGamesToWin } from '../src/natpf/natpf_fair_format.js';
import { scoreboardView } from '../src/natpf/natpf_scoreboard.js';
import { pointCall, viewScore, callFromBroadcast } from '../src/natpf/natpf_point_call.js';
import { makeCheckpoint, checkpointFor } from '../src/natpf/natpf_versus.js';
import { fairButton, fairToast } from '../src/natpf/natpf_kiosk.js';
import { matchSummary, fairLengthStep } from '../src/natpf/natpf_lobby.js';
import { phoneGamePhase } from '../src/natpf/natpf_phone_racket.js';
import { t as hudText } from '../src/natpf/natpf_i18n.js';
import { callout } from '../src/natpf/natpf_voice.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('opzione: spenta di base, salvata in natpf-tennis.formatoFiera, l\'indirizzo la forza (?formato=fiera / classico)', () => {
  assert.equal(FAIR_KEY, 'natpf-tennis.formatoFiera');
  assert.equal(readFairFormat({ search: '', storage: memory() }), false, 'spenta di base');
  assert.equal(readFairFormat({ search: '', storage: null }), false);
  assert.equal(readFairFormat({ search: '', storage: { getItem(){ throw new Error('bloccato'); } } }), false, 'storage bloccato: spenta');
  const s = memory();
  assert.equal(writeFairFormat(true, { storage: s }), true);
  assert.equal(s.m.get(FAIR_KEY), '1');
  assert.equal(readFairFormat({ search: '', storage: s }), true, 'resta salvata');
  writeFairFormat(false, { storage: s });
  assert.equal(readFairFormat({ search: '', storage: s }), false);
  assert.equal(readFairFormat({ search: '?formato=fiera', storage: memory() }), true, 'indirizzo: accesa');
  assert.equal(readFairFormat({ search: '?mode=casual&formato=FIERA', storage: memory() }), true);
  assert.equal(readFairFormat({ search: '?formato=classico', storage: memory({ [FAIR_KEY]: '1' }) }), false, 'indirizzo: spenta anche se salvata accesa');
  assert.equal(fairFromUrl('?formato=boh'), null);
  assert.equal(fairFromUrl(''), null);
  assert.equal(fairForcedByUrl('?formato=evento'), true);
  assert.equal(fairForcedByUrl('?x=1'), false);
});

test('servizio come nel tie-break: il primo punto lo batte uno, poi due punti a testa', () => {
  const seq = n => Array.from({ length: n }, (_, i) => (pointServer('player', i) === 'player' ? 'A' : 'B')).join('');
  assert.equal(seq(7), 'ABBAABB');
  assert.equal(Array.from({ length: 7 }, (_, i) => (pointServer('opponent', i) === 'opponent' ? 'A' : 'B')).join(''), 'ABBAABB');
  // in un game di 7 punti (fino al punto decisivo) chi inizia batte 3 punti, l'altro 4: il punto decisivo lo batte chi
  // non ha iniziato; il game dopo lo inizia l'altro, quindi su due game si pareggia
  assert.equal(pointServer('player', 6), 'opponent');
});

test('chi vince il game: classico con 2 punti di scarto, fiera al punto decisivo', () => {
  assert.equal(gameWinner(4, 0), 'player');
  assert.equal(gameWinner(3, 3), null);
  assert.equal(gameWinner(4, 3), null, 'classico: vantaggio');
  assert.equal(gameWinner(5, 3), 'player');
  assert.equal(gameWinner(6, 8), 'opponent');
  assert.equal(gameWinner(4, 3, { fair: true }), 'player', 'fiera: il punto decisivo vale il game');
  assert.equal(gameWinner(3, 4, { fair: true }), 'opponent');
  assert.equal(gameWinner(3, 2, { fair: true }), null);
  assert.equal(gameWinner(4, 2, { fair: true }), 'player');
  assert.equal(isDecidingPoint(3, 3, { fair: true }), true);
  assert.equal(isDecidingPoint(3, 3), false, 'spenta: è parità');
  assert.equal(isDecidingPoint(3, 2, { fair: true }), false);
});

test('battitore dopo il punto: spenta come prima (cambia solo a fine game), accesa ogni due punti', () => {
  assert.deepEqual(nextServe({ server: 'player', played: 1 }), { server: 'player', gameServer: 'player' });
  assert.deepEqual(nextServe({ server: 'player', played: 5, gameOver: true }), { server: 'opponent', gameServer: 'opponent' });
  // spenta: dal battitore del momento, anche se gameServer è vecchio (allenamento e minigiochi cambiano server a mano)
  assert.deepEqual(nextServe({ server: 'player', gameServer: 'opponent', played: 2, gameOver: true }), { server: 'opponent', gameServer: 'opponent' });
  assert.deepEqual(nextServe({ server: 'player', gameServer: 'player', played: 1, fair: true }), { server: 'opponent', gameServer: 'player' });
  assert.deepEqual(nextServe({ server: 'opponent', gameServer: 'player', played: 3, fair: true }), { server: 'player', gameServer: 'player' });
  assert.deepEqual(nextServe({ server: 'opponent', gameServer: 'player', played: 7, gameOver: true, fair: true }), { server: 'opponent', gameServer: 'opponent' });
});

test('voce del punto decisivo con le clip che ci sono già: «Match point» se il game chiude la partita, altrimenti «Game point»', () => {
  assert.equal(decidingVoice({ playerGames: 0, opponentGames: 0 }, 1), 'Match Point');
  assert.equal(decidingVoice({ playerGames: 0, opponentGames: 0 }, 2), 'Game Point');
  assert.equal(decidingVoice({ playerGames: 1, opponentGames: 0 }, 2), 'Match Point');
  for (const p of ['Match Point', 'Game Point']) assert.ok(callout(p), `clip per ${p}`);
  assert.equal(callout('Deciding Point'), null, 'nessuna clip «deciding point»: non si genera voce nuova');
  assert.equal(hudText('Deciding Point'), 'Punto decisivo');
  assert.equal(hudText('DECIDING POINT'), 'PUNTO DECISIVO');
});

test('partite lunghe con l\'opzione accesa: «Al meglio di 5» diventa «Al meglio di 3», il resto non cambia', () => {
  assert.equal(fairGamesToWin(3, true), 2);
  assert.equal(fairGamesToWin(3, false), 3);
  for (const n of [1, 2, 999]) assert.equal(fairGamesToWin(n, true), n);
  assert.equal(matchSummary({ games: 1, fair: true }), '1 game · formato fiera · singolare · 3ª persona');
  assert.equal(matchSummary({ games: 1 }), '1 game · singolare · 3ª persona');
});

test('tabellone: «Punto decisivo» al posto di «Parità» e mai «Vantaggio» con l\'opzione accesa', () => {
  const sc = (pp, op, server = 'player', fair = true) => ({ playerPoints: pp, opponentPoints: op, playerGames: 0, opponentGames: 0, server, fair });
  assert.equal(scoreboardView(sc(3, 3)).label, 'Punto decisivo');
  assert.equal(scoreboardView(sc(3, 3, 'player', false)).label, 'Parità');
  assert.equal(scoreboardView(sc(3, 3), { split: true }).label, 'Punto decisivo');
  assert.equal(scoreboardView(sc(3, 3), { multiplayer: true, viewer: 'opponent' }).label, 'Punto decisivo');
  assert.equal(scoreboardView(sc(3, 2)).label, '');
  // la pallina di chi serve segue score.server
  const v = scoreboardView(sc(1, 0, 'opponent'));
  assert.deepEqual(v.rows.map(r => r.serving), [false, true]);
});

test('banner del punto: «Punto decisivo» dal lato di chi guarda, anche nello stesso schermo; il P2 tiene il messaggio dell\'host senza «kind»', () => {
  assert.equal(viewScore({ player: '40', opponent: '40', deciding: true }), 'Punto decisivo');
  assert.equal(viewScore({ player: '40', opponent: '40' }), 'Parità');
  assert.equal(pointCall({ winner: 'player', why: 'Out', score: { player: '40', opponent: '40', deciding: true } }).subText, 'Errore della CPU: palla fuori · Punto decisivo');
  assert.equal(pointCall({ winner: 'player', why: 'Out', score: { player: '40', opponent: '40', deciding: true }, sharedNames: { player: 'Anna', opponent: 'Marco' } }).subText, 'Errore di Marco: palla fuori · Punto decisivo');
  const e = createHeadlessEngine();
  e.playerRole = 'p2'; e.isMultiplayer = true;
  assert.deepEqual(callFromBroadcast(e, { text: 'Deciding Point', style: 'style-gold', subText: '', call: { voice: 'Match Point' } }), { text: 'Deciding Point', subText: '', style: 'style-gold' });
});

test('sfida tra due computer: la ripresa dopo un ricaricamento tiene regola e primo battitore del game, e non mescola le regole', () => {
  const info = { roomId: 'AT-ABCD', fmt: 'singles', gamesToWin: 1 };
  const zero = { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true };
  const cp = makeCheckpoint({ ...info, score: { playerPoints: 2, opponentPoints: 1, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: false, fair: true, gameServer: 'opponent' } }, 1000);
  assert.deepEqual(checkpointFor(cp, { ...info, score: { ...zero, fair: true } }, 2000), { playerPoints: 2, opponentPoints: 1, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: false, fair: true, gameServer: 'opponent' });
  assert.equal(checkpointFor(cp, { ...info, score: { ...zero, fair: false } }, 2000), null, 'regola cambiata nel frattempo: si riparte da 0-0');
  // punteggio di prima del B18 (senza fair né gameServer): vale per la regola classica
  const old = makeCheckpoint({ ...info, score: { ...zero, playerPoints: 1 } }, 1000);
  assert.equal('fair' in old.score, false);
  assert.ok(checkpointFor(old, { ...info, score: { ...zero, fair: false } }, 2000));
});

test('pannello dello stand: scritte del pulsante e dell\'avviso', () => {
  assert.equal(fairButton(false), 'No');
  assert.equal(fairButton(true), 'Sì · punto decisivo');
  assert.equal(fairButton(true, true), 'Sì · punto decisivo (indirizzo)');
  assert.match(fairToast(true), /punto decisivo sul 40-40.*Vale dalla prossima partita; resta salvata/);
  assert.match(fairToast(false), /un battitore per game/);
  assert.match(fairToast(true, true), /comanda l’indirizzo/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /data-staff="fair"[^>]*><span>Formato in fiera<\/span><b>Solo stesso schermo<\/b>/);   // B20: valore di base
});

/* ---------- motore ---------- */
const engine = ({ fair, gamesToWin = 1, first = 'player' } = {}) => {
  const e = createHeadlessEngine({ difficulty: 'casual' });
  e.natpfFair = fair; e.natpfServeFirst = first; e.matchConfig.gamesToWin = gamesToWin;
  e.natpfArena = { setScore(){}, setSpeed(){}, update(){}, setPractice(){} };
  e.startNewMatch({ showStartBanner: false });
  return e;
};
const play = (e, winners) => winners.split('').map(w => { const server = e.score.server; e._awardPoint(w === 'P' ? 'player' : 'opponent', 'Out'); return server === 'player' ? 'A' : 'B'; }).join('');

test('motore, opzione accesa: battitore A B B A A B B nel game, punto decisivo sul 40-40, il game dopo lo inizia l\'altro', () => {
  const e = engine({ fair: true, gamesToWin: 2 });
  assert.equal(e.score.fair, true);
  assert.equal(e.score.gameServer, 'player');
  assert.equal(play(e, 'PPPOOO'), 'ABBAAB', 'chi batte i primi sei punti');
  assert.deepEqual([e.score.playerPoints, e.score.opponentPoints], [3, 3]);
  assert.equal(e.score.server, 'opponent', 'il punto decisivo lo batte chi non ha iniziato il game');
  assert.equal(e._getHighStakesPointLabel(), 'Deciding Point');
  const f = e._formatCurrentScore();
  assert.equal(f.deciding, true); assert.equal(f.deuceLabel, null); assert.equal(f.bannerScoreText, 'Deuce');
  e._awardPoint('opponent', 'Out');
  assert.deepEqual([e.score.playerGames, e.score.opponentGames, e.score.playerPoints, e.score.opponentPoints], [0, 1, 0, 0], 'il punto decisivo vale il game');
  assert.equal(e.score.gameServer, 'opponent'); assert.equal(e.score.server, 'opponent');
  assert.equal(e.phase, 'POINT_OVER');
  assert.equal(play(e, 'PPP'), 'BAA', 'secondo game: lo inizia la CPU');
});

test('motore, opzione accesa: banner del 40-40 con «Punto decisivo» e voce «Match point» per il P2 della sfida', () => {
  const e = engine({ fair: true });
  play(e, 'PPPOO');
  e._awardPoint('opponent', 'Out');
  const b = e.lastBannerBroadcast;
  assert.equal(b.call.kind, 'point'); assert.equal(b.call.score.deciding, true);
  assert.match(b.subText, /Punto decisivo$/);
  e._setupPointServe({ showBanner: true });
  assert.equal(e.lastBannerBroadcast.text, 'Deciding Point');
  assert.deepEqual(e.lastBannerBroadcast.call, { voice: 'Match Point' });
});

test('motore, opzione spenta: tutto come prima (un battitore per game, parità e vantaggi, «Break Point»)', () => {
  const e = engine({ fair: false, gamesToWin: 2 });
  assert.equal(e.score.fair, false);
  assert.equal(play(e, 'PPPOOOP'), 'AAAAAAA');
  assert.deepEqual([e.score.playerPoints, e.score.opponentPoints, e.score.playerGames], [4, 3, 0], 'vantaggio, il game continua');
  assert.equal(e._formatCurrentScore().bannerScoreText, 'Ad In');
  play(e, 'O');
  assert.equal(e._formatCurrentScore().deuceLabel, 'Deuce');
  play(e, 'PP');
  assert.equal(e.score.playerGames, 1); assert.equal(e.score.server, 'opponent');
  play(e, 'OOO');
  assert.equal(e.score.server, 'opponent');
  assert.equal(e._getHighStakesPointLabel(), 'Game Point');
  const e2 = engine({ fair: false, gamesToWin: 2 }); play(e2, 'OOO');
  assert.equal(e2._getHighStakesPointLabel(), 'Break Point', 'classico: palla break di chi risponde');
  const e3 = engine({ fair: true, gamesToWin: 2 }); play(e3, 'OOO');
  assert.equal(e3.score.server, 'player');
  assert.equal(e3._getHighStakesPointLabel(), 'Game Point', 'fiera: niente «Break Point»');
});

test('motore: «Al meglio di 5» diventa al meglio di 3 solo con l\'opzione accesa; il P2 della sfida non usa la sua scelta', () => {
  assert.equal(engine({ fair: true, gamesToWin: 3 }).matchConfig.gamesToWin, 2);
  assert.equal(engine({ fair: false, gamesToWin: 3 }).matchConfig.gamesToWin, 3);
  const e = createHeadlessEngine();
  e.natpfFair = true; e.playerRole = 'p2'; e.isMultiplayer = true; e.matchConfig.gamesToWin = 3;
  e.natpfArena = { setScore(){}, setSpeed(){}, update(){}, setPractice(){} };
  e.startNewMatch({ showStartBanner: false });
  assert.equal(e.score.fair, false, 'decide l\'host con lo snapshot');
  assert.equal(e.matchConfig.gamesToWin, 3);
});

test('stesso schermo con l\'opzione accesa: il telefono del P2 è al servizio nei suoi punti, anche in una partita a 1 game', () => {
  const e = engine({ fair: true });
  e.isMultiplayer = true; e.natpfSplit.active = true;
  const phases = [];
  for (const w of 'POPO'){
    e._setupPointServe({ showBanner: false });
    phases.push(`${phoneGamePhase(e, 'p1')}/${phoneGamePhase(e, 'p2')}`);
    e._awardPoint(w === 'P' ? 'player' : 'opponent', 'Out');
  }
  assert.deepEqual(phases, ['serve/play', 'play/serve', 'play/serve', 'serve/play']);
  // spenta: in una partita a 1 game il P2 non batte mai
  const c = engine({ fair: false }); c.isMultiplayer = true; c.natpfSplit.active = true;
  const p2 = [];
  for (const w of 'POPO'){ c._setupPointServe({ showBanner: false }); p2.push(phoneGamePhase(c, 'p2')); c._awardPoint(w === 'P' ? 'player' : 'opponent', 'Out'); }
  assert.deepEqual(p2, ['play', 'play', 'play', 'play']);
});

test('servizio della CPU: velocità vera sul tabellone (non 194 km/h fissi) e niente tremolio della telecamera', () => {
  // B18.2 passo 2 (revisione): il test era instabile. Il servizio della CPU ha una velocità a caso e con Math.random non
  // seminato ogni tanto è proprio 194 km/h (circa 4 volte su 100): la riga «diverso da 194» falliva senza che ci fosse
  // un difetto. Ora il caso è seminato (sei servizi per livello, sempre gli stessi) e «non 194 fissi» si prova così:
  // il tabellone mostra la velocità vera di ogni servizio, e i sei servizi non hanno tutti la stessa velocità
  for (const difficulty of ['casual', 'pro']){
    const shown = [];
    for (const seed of [1, 2, 3, 4, 5, 6]){
      const real = Math.random; Math.random = mulberry32(seed);
      try {
        const e = createHeadlessEngine({ difficulty });
        const speeds = [];
        e.natpfArena = { setScore(){}, setSpeed: v => { if (v != null) speeds.push({ shown: v, real: Math.round(e.ball.vel.length()*3.6) /* B34: km/h veri (prima × 6,8) */ }); }, update(){}, setPractice(){} };
        e.natpfFair = false; e.natpfServeFirst = 'opponent';
        e.startNewMatch({ showStartBanner: false });
        let trauma = 0;
        for (let i = 0; i < 600 && e.phase !== 'RALLY'; i++){ e.step(1/120); if (e.phase === 'RALLY') trauma = e.cameraTrauma; }
        assert.equal(e.phase, 'RALLY', `${difficulty}: la CPU ha servito`);
        assert.equal(speeds.length, 1);
        assert.equal(speeds[0].shown, speeds[0].real, `${difficulty}: ${JSON.stringify(speeds)}`);
        assert.equal(trauma, 0, `${difficulty}: niente tremolio`);
        shown.push(speeds[0].shown);
      } finally { Math.random = real; }
    }
    assert.ok(new Set(shown).size > 1 && shown.some(v => v !== 194), `${difficulty}: velocità dei sei servizi ${shown.join(', ')} km/h`);
  }
});

/* ---------- revisione del ramo R4 ---------- */
test('revisione: la scelta del menu resta separata dal valore in partita (installGamesToWin)', () => {
  let fair = true;
  const mc = installGamesToWin({ gamesToWin: 3, inputMode: 'mouse' }, () => fair);
  assert.equal(mc.gamesToWinChosen, 3);
  assert.equal(mc.gamesToWin, 2, 'acceso: al meglio di 3');
  fair = false;
  assert.equal(mc.gamesToWin, 3, 'spento: torna la scelta del menu');
  mc.gamesToWin = 1;
  assert.equal(mc.gamesToWinChosen, 1, 'chi scrive gamesToWin scrive la scelta');
  assert.equal(installGamesToWin(mc, () => true), mc, 'idempotente');
  assert.equal(mc.gamesToWinChosen, 1);
  assert.ok(Object.keys(mc).includes('gamesToWin'), 'resta tra le chiavi (snapshot e diagnostica)');
});

test('revisione: «Rigioca» dopo aver spento l\'opzione torna al meglio di 5 scelto nel menu', () => {
  const e = engine({ fair: true, gamesToWin: 3 });
  assert.equal(e.matchConfig.gamesToWin, 2);
  assert.equal(e.matchConfig.gamesToWinChosen, 3, 'la scelta del menu non si tocca');
  e.natpfFair = false;
  e.startNewMatch({ showStartBanner: false });   // come «Rigioca» della schermata finale, senza passare dal menu
  assert.equal(e.matchConfig.gamesToWin, 3);
  e.natpfFair = true; e.startNewMatch({ showStartBanner: false });
  assert.equal(e.matchConfig.gamesToWin, 2);
  // il P2 della sfida tra due computer: il valore dell'host arriva con lo snapshot, anche con score.fair vero
  const p2 = createHeadlessEngine();
  p2.playerRole = 'p2'; p2.isMultiplayer = true;
  p2.natpfArena = { setScore(){}, setSpeed(){}, update(){}, setPractice(){} };
  p2.startNewMatch({ showStartBanner: false });
  p2.matchConfig.gamesToWin = 2; p2.score = { ...p2.score, fair: true };
  assert.equal(p2.matchConfig.gamesToWin, 2);
  p2.matchConfig.gamesToWin = 1;
  assert.equal(p2.matchConfig.gamesToWin, 1);
});

test('revisione: pagina «Partita», il 5 scelto dallo staff torna quando l\'opzione si spegne (fairLengthStep)', () => {
  // acceso con il 5: si passa al 3 e ci si ricorda del 5
  let st = fairLengthStep({ fair: true, selected: '5' });
  assert.deepEqual(st, { click: '3', fiveBeforeFair: true });
  // ridisegni con l'opzione accesa e il 3 selezionato: il ricordo resta
  st = fairLengthStep({ fair: true, selected: '3', fiveBeforeFair: st.fiveBeforeFair });
  assert.deepEqual(st, { click: null, fiveBeforeFair: true });
  // spento: si torna al 5
  assert.deepEqual(fairLengthStep({ fair: false, selected: '3', fiveBeforeFair: true }), { click: '5', fiveBeforeFair: false });
  // se nel frattempo qualcuno ha scelto 1 game, vale la sua scelta
  st = fairLengthStep({ fair: true, selected: '1', fiveBeforeFair: true });
  assert.deepEqual(st, { click: null, fiveBeforeFair: false });
  assert.deepEqual(fairLengthStep({ fair: false, selected: '3', fiveBeforeFair: st.fiveBeforeFair }), { click: null, fiveBeforeFair: false });
  // il 3 scelto a mano (senza 5 prima) non diventa 5
  assert.deepEqual(fairLengthStep({ fair: false, selected: '3' }), { click: null, fiveBeforeFair: false });
  assert.deepEqual(fairLengthStep({ fair: true, selected: '3' }), { click: null, fiveBeforeFair: false });
});

test('revisione: servizio della CPU senza stelline e con la scia normale; nello scambio, nel servizio del giocatore e nello stesso schermo restano', () => {
  const e = createHeadlessEngine({ difficulty: 'pro' });
  const bursts = [], styles = [];
  e._spawnStarBurst = (_p, n) => bursts.push(n);
  e.ballTrail = { setStyle: (t, p) => styles.push(`${t}/${p}`), clear(){}, pushPoint(){}, seedArc(){}, update(){} };
  e.natpfArena = { setScore(){}, setSpeed(){}, update(){}, setPractice(){} };
  e.natpfFair = false; e.natpfServeFirst = 'opponent';
  e.startNewMatch({ showStartBanner: false });
  for (let i = 0; i < 600 && e.phase !== 'RALLY'; i++) e.step(1/120);
  assert.equal(e.phase, 'RALLY');
  assert.equal(e.ball.isPowerShot, true, 'per la risposta resta un servizio potente (gioco invariato)');
  assert.deepEqual(bursts.filter(n => n > 1), [], 'niente stelline al servizio');
  assert.equal(styles.at(-1), 'TOPSPIN/false', 'scia normale');
  assert.equal(e._natpfQuietCpuServe(), true);
  for (let i = 0; i < 30; i++) e.step(1/120);
  assert.deepEqual(bursts, [], 'niente scintille in volo');
  // stesso schermo (due persone): il servizio del P2 non è della CPU
  e.isMultiplayer = true; assert.equal(e._natpfQuietCpuServe(), false); e.isMultiplayer = false;
  e.ball.rallyStrokeCount = 2; assert.equal(e._natpfQuietCpuServe(), false, 'nello scambio la CPU ha i suoi effetti');
  e.ball.rallyStrokeCount = 1; e.ball.lastHitter = 'player'; assert.equal(e._natpfQuietCpuServe(), false, 'servizio del giocatore');
});
