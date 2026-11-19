// B72 (richiesta dell'utente del 19/11): «selettore lingua IT/EN dall'app del telefono: permette di tradurre anche solo uno
// dei due campi in modalità doppio». Parte del computer: dizionario dei testi di partita (natpf_lang.js), regola dello
// schermo (a una vista la lingua di chi gioca qui; nello stesso schermo ogni metà la sua, i testi a tutta larghezza in
// inglese solo se lo hanno scelto tutti e due), lingua per telefono (messaggio «lang», cfg lg), «Nuovo giocatore» → IT
// come la mano, tabellone di ciascuna metà. La pagina del telefono: tools/test/b72-lingua.test.mjs; nel browser
// tools/e2e/natpf-lingua.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld, $ } from './ui-world.mjs';
import { secondPhone } from './trial-world.mjs';
const { NatpfPhoneRacket } = await import('../src/natpf/natpf_phone_racket.js');
const L = await import('../src/natpf/natpf_lang.js');
const { t: itText } = await import('../src/natpf/natpf_i18n.js');
const PC = await import('../src/natpf/natpf_point_call.js');
const SB = await import('../src/natpf/natpf_scoreboard.js');
const SF = await import('../src/natpf/natpf_shot_feedback.js');
const PW = await import('../src/natpf/natpf_phone_watch.js');
const { serveCoachView } = await import('../src/natpf/natpf_serve_coach.js');
const { prematchTexts, prematchServeLine } = await import('../src/natpf/natpf_prematch.js');
const { helpLabel } = await import('../src/natpf/natpf_duo_rules.js');
const { resetHands } = await import('../src/natpf/natpf_hand.js');
const { tx, say, screenLangs, localizeBoard, langOfPhone } = L;
const en = s => tx(s, 'en');
// parole italiane che in inglese non devono restare
const ITALIAN = /\b(della|dell[’']|degli|Punto|Errore|palla|Vince|Vincono|Telefono|Batte|Sorteggio|Partita|tuo|batti|servizio|Parità|Vantaggio|Fuori|Perfetto|Colpisci|Aspetta|Lancio|riprova|pausa|Avversari[oi]?|compagno|Tu)\b/;
const noItalian = (s, ctx = s) => assert.doesNotMatch(String(s), ITALIAN, `resta italiano: «${s}» (${ctx})`);

/* ---------- regola dello schermo ---------- */
test('B72 regola dello schermo: a una vista tutto nella lingua di chi gioca qui; stesso schermo per metà, al centro EN solo con tutti e due EN', () => {
  assert.deepEqual(screenLangs({ split: false, local: 'en' }), { left: 'en', right: 'en', center: 'en' });
  assert.deepEqual(screenLangs({ split: false, local: 'it', p2: 'en' }), { left: 'it', right: 'it', center: 'it' }, 'a una vista il P2 non conta');
  assert.deepEqual(screenLangs({ split: true, p1: 'it', p2: 'en' }), { left: 'it', right: 'en', center: 'it' });
  assert.deepEqual(screenLangs({ split: true, p1: 'en', p2: 'it' }), { left: 'en', right: 'it', center: 'it' });
  assert.deepEqual(screenLangs({ split: true, p1: 'en', p2: 'en' }), { left: 'en', right: 'en', center: 'en' });
  assert.deepEqual(screenLangs({}), { left: 'it', right: 'it', center: 'it' });
  // telefono di prima (nessuna lingua) o valore strano: IT
  assert.equal(langOfPhone(null), 'it'); assert.equal(langOfPhone({ lang: null }), 'it'); assert.equal(langOfPhone({ lang: 'fr' }), 'it'); assert.equal(langOfPhone({ lang: 'en' }), 'en');
});

/* ---------- con IT niente cambia ---------- */
test('B72 IT: i testi dell\'HUD sono quelli di natpf_i18n e i testi italiani del gioco restano identici', () => {
  for (const s of ['PERFECT • FOREHAND TOPSPIN!', 'Game Point', 'Deuce', 'Start', 'CPU DROP SHOT', 'Perfetto', 'Fuori · troppo presto', 'Punto della CPU', 'Errore tuo: palla fuori · 15-30'])
    assert.equal(tx(s, 'it'), itText(s), s);
  for (const s of ['Colpisci!', 'Giulia, batti tu', 'Telefono in pausa', 'Aiuto: Bambino', 'Si riprende tra 3…', 'Net', null, undefined, ''])
    assert.equal(say(s, 'it'), s, String(s));
  assert.equal(L.scoreTx('Ad In', 'it'), 'Vantaggio'); assert.equal(L.scoreTx('Deuce', 'it', { short: true }), 'PARITÀ');
});

/* ---------- dizionario: testi veri del gioco ---------- */
test('B72 EN: esito dei colpi (scritta grande e riga piccola), con le maiuscole come oggi', () => {
  const cases = [['PERFECT • FOREHAND TOPSPIN', 'Perfect'], ['EARLY • FOREHAND', 'Early'], ['LATE • BACKHAND', 'Late'], ['GOOD', 'Good'], ['TOO LATE! • WHIFF', 'Too late'],
    ['WHIFF EARLY', 'Too early'], ['WHIFF REACH', 'Too far'], ['WHIFF', 'Missed']];
  for (const [g, want] of cases) assert.equal(en(SF.qualityText(SF.shotQuality(g))), want, g);
  assert.equal(en(SF.qualityText(SF.shotQuality('VERY EARLY', { inCourt: false }))), 'Out · too early');
  assert.equal(en(SF.qualityText(SF.shotQuality('LATE', { net: true }))), 'Net · late');
  assert.equal(en(SF.qualityText(SF.shotQuality('PERFECT', { long: true, cause: 'da troppo lontano' }))), 'Too long');
  assert.equal(en(SF.qualityText(SF.waitQuality({ label: 'Fuori' }))), 'Hit');
  assert.equal(en('compagno · Palla corta · palla debole: in corsa · 120 km/h'), 'partner · Drop shot · weak ball: on the run · 120 km/h');
  assert.equal(en('avversario · Schiacciata · in allungo'), 'opponent · Smash · stretched');
  for (const w of ['scambio lungo', 'gesto troppo forte', 'senza preparazione', 'palla veloce', 'palla lontana', 'colpo difficile']) noItalian(en(w), w);
  // maiuscolo dell'originale (CSS a parte): resta maiuscolo
  assert.equal(en('PERFETTO'), 'PERFECT'); assert.equal(en('FUORI · TROPPO PRESTO'), 'OUT · TOO EARLY');
  // la palla corta dichiarata dall'avversario (chiave del motore)
  assert.equal(en('CPU DROP SHOT'), 'Opponent’s drop shot');
});

test('B72 EN: istruzioni del servizio (Colpisci!, Aspetta che salga…, Lancio a vuoto, X batti tu, lancio automatico)', () => {
  const v = (s, g) => serveCoachView(s, { mine: true, phase: 'SERVE_STANCE', ...g });
  const views = [
    v({ missAt: 0 }, { now: 1 }), v({}, { name: 'Giulia', idle: 20, split: true }), v({}, { auto: { left: 4, what: 'toss' }, name: 'Marco' }), v({}, { auto: { left: 3, what: 'serve' } }),
    serveCoachView({}, { mine: true, phase: 'SERVE_TOSS', tossT: 0, controller: 'phone' }), serveCoachView({}, { mine: true, phase: 'SERVE_TOSS', tossT: .5 }),
    serveCoachView({}, { mine: true, phase: 'SERVE_TOSS', tossT: 0, autoLive: 'toss' }), serveCoachView({}, { mine: true, phase: 'SERVE_TOSS', autoLive: 'serve', name: 'Giulia' }),
  ];
  const out = views.map(x => [en(x.big), en(x.sub)]);
  assert.deepEqual(out, [
    ['Hit when the ball is high', 'Missed toss: try again'], ['Giulia, your serve', ''], ['Marco, your serve', 'In 4 s the game tosses the ball'], ['Your serve', 'In 3 s the game serves'],
    ['Hit!', 'Before the highest point: ball to the center · after: wide'], ['Wait for it to rise…', 'Hit when the ball is high'], ['Hit!', 'Automatic toss'],
    ['Automatic serve', 'The game serves for Giulia'],
  ]);
  assert.equal(en('Al servizio'), 'Serving');
});

test('B72 EN: punti, game e partita contro l\'avversario (con «CPU» e con «Avversario»), tra due computer e nello stesso schermo', () => {
  const r = PC.rivalOf();
  const pts = [['player', 'Out'], ['opponent', 'Out'], ['player', 'Net'], ['opponent', 'Nice Shot!'], ['player', 'Ace!'], ['opponent', 'Ace!'], ['player', 'Point'], ['opponent', 'Point']]
    .map(([winner, why]) => PC.pointCall({ winner, why, rival: r, score: { player: '30', opponent: '15' } }));
  assert.deepEqual(pts.map(p => [en(p.text), en(p.subText)]), [
    ['Your point', 'Opponent\'s error: ball out · 30-15'], ['Opponent\'s point', 'Your error: ball out · 30-15'], ['Your point', 'Opponent\'s error: ball in the net · 30-15'],
    ['Opponent\'s point', 'Opponent\'s winner · 30-15'], ['Your point', 'Ace! · 30-15'], ['Opponent\'s point', 'Opponent\'s ace · 30-15'],
    ['Your point', 'The opponent can’t reach it · 30-15'], ['Opponent\'s point', 'Missed ball · 30-15'],
  ]);
  // le forme del ramo b72-avversario
  assert.equal(en("Punto dell'avversario"), "Opponent's point"); assert.equal(en('Punto degli avversari'), "Opponents' point");
  assert.equal(en("L'avversario non ci arriva"), 'The opponent can’t reach it'); assert.equal(en('Gli avversari non ci arrivano'), 'The opponents can’t reach it');
  assert.equal(en("Vantaggio dell'avversario"), "Opponent's advantage"); assert.equal(en("Vince l'avversario"), 'The opponent wins'); assert.equal(en('Vincono gli avversari'), 'The opponents win');
  assert.equal(en('Avversario'), 'Opponent'); assert.equal(en('Avversari'), 'Opponents'); assert.equal(en('Tu + compagno'), 'You + partner'); assert.equal(en('Marco + compagno'), 'Marco + partner');
  assert.equal(en('CPU'), 'Opponent'); assert.equal(en('2 CPU'), 'Opponents'); assert.equal(en('Tu + CPU'), 'You + partner');
  // punteggio a parole
  assert.equal(en(PC.viewScore({ player: '40', opponent: '40' })), 'Deuce'); assert.equal(en(PC.viewScore({ player: '40', opponent: '40', deciding: true })), 'Deciding point');
  assert.equal(en(PC.viewScore({ player: 'Ad', opponent: '40' })), 'Your advantage'); assert.equal(en(PC.viewScore({ player: '40', opponent: 'Ad' }, 'player', r)), "Opponent's advantage");
  // game e partita
  const g = [PC.gameCall({ winner: 'player', games: { player: 1, opponent: 0 } }), PC.gameCall({ winner: 'opponent', games: { player: 1, opponent: 2 }, match: true })];
  assert.deepEqual(g.map(x => [en(x.text), en(x.subText)]), [['Your game', 'Games 1-0'], ['The opponent wins the match', 'Games 1-2']]);
  assert.equal(en(PC.gameCall({ winner: 'player', games: { player: 2, opponent: 0 }, match: true }).text), 'You win the match!');
  // tra due computer (dal computer del Player 2)
  const r2 = PC.rivalOf({ multiplayer: true, viewer: 'opponent' });
  assert.equal(en(PC.pointCall({ winner: 'player', why: 'Out', viewer: 'opponent', rival: r2 }).text), "Player 1's point");
  assert.equal(en(PC.pointCall({ winner: 'player', why: 'Out', viewer: 'opponent', rival: r2 }).subText), 'Your error: ball out');
  // stesso schermo: nomi
  const sn = { player: 'Giulia', opponent: 'Marco' };
  const s1 = PC.pointCall({ winner: 'opponent', why: 'Out', sharedNames: sn, score: { player: '0', opponent: '15' } });
  assert.deepEqual([en(s1.text), en(s1.subText)], ['Point Marco', "Giulia's error: ball out · Giulia 0 · Marco 15"]);
  const s2 = PC.pointCall({ winner: 'player', why: 'Nice Shot!', whiff: true, sharedNames: sn, score: { player: 'Ad', opponent: '40' } });
  assert.deepEqual([en(s2.text), en(s2.subText)], ['Point Giulia', 'Missed swing by Marco · Advantage Giulia']);
  const s3 = PC.gameCall({ winner: 'opponent', match: true, sharedNames: sn, games: { player: 0, opponent: 1 } });
  assert.deepEqual([en(s3.text), en(s3.subText)], ['Marco wins!', 'Giulia 0 · Marco 1']);
  assert.equal(en(PC.firstServeText({ sharedNames: sn, server: 'opponent', drawn: true })), 'Coin toss: Marco serves');
  assert.equal(en(PC.firstServeText({ sharedNames: sn, server: 'player', fixed: true })), 'Giulia always serves');
  // etichette del motore restano inglesi (nello stesso schermo con il nome)
  assert.equal(en(PC.stakesText('Break Point', { sharedNames: sn, points: [3, 1] })), 'Break Point Giulia');
  assert.equal(en('Start'), 'Play'); assert.equal(L.scoreTx('Ad In', 'en'), 'Advantage'); assert.equal(L.scoreTx('00', 'en'), '0');
  for (const p of [...pts, ...g, s1, s2, s3]) { noItalian(en(p.text), p.text); noItalian(en(p.subText).replace(/Giulia|Marco/g, ''), p.subText); }
});

test('B72 EN: titolo e righe della fine partita, rivincita dai telefoni', async () => {
  const cpu = PC.matchEndView({ winner: 'opponent', games: { player: 0, opponent: 1 } });
  assert.equal(en(cpu.title), 'The opponent wins'); assert.deepEqual(cpu.rows.map(r => en(r.name)), ['You', 'Opponent']);
  const won = PC.matchEndView({ winner: 'player', games: { player: 1, opponent: 0 }, doubles: true });
  assert.equal(en(won.title), 'You win!'); assert.deepEqual(won.rows.map(r => en(r.name)), ['You + partner', 'Opponents']);
  assert.equal(en(PC.matchEndView({ winner: 'player', nickname: 'Luca' }).title), 'Luca wins!');
  assert.equal(en(PC.matchEndView({ winner: 'opponent', sharedNames: { player: 'Giulia', opponent: 'Marco' } }).title), 'Marco wins!');
  assert.equal(en('Fine partita'), 'Match over'); assert.equal(en('Fine partita · livello Esperta'), 'Match over · Expert level');
  assert.equal(en('Fine partita · 2 game a 1'), 'Match over · 2 games to 1'); assert.equal(en('Bella sfida, Luca!'), 'Great match, Luca!');
  assert.equal(en('La CPU ha vinto questa volta. Ecco cosa ti è venuto meglio:'), 'The opponent won this time. Here is what you did best:');
  assert.equal(en("L'avversario ha vinto questa volta. Ecco cosa ti è venuto meglio:"), 'The opponent won this time. Here is what you did best:');
  assert.equal(en('Hanno vinto gli avversari questa volta. Ecco cosa ti è venuto meglio:'), 'The opponents won this time. Here is what you did best:');
  assert.equal(en('Game 1-0'), 'Games 1-0'); assert.equal(en('2° posto nella classifica di oggi'), '2nd place in today’s ranking');
  assert.equal(en('Scambio più lungo della partita: 9 colpi'), 'Longest rally of the match: 9 shots');
  // rivincita dai telefoni nello stesso schermo (natpf_split_ui.rematchLine)
  const { rematchLine } = await import('../src/natpf/natpf_split_ui.js');
  assert.equal(L.say(rematchLine({ p1: true }, { p1: 'Giulia', p2: 'Marco' }), 'en'), 'Giulia wants a rematch · Marco is missing');
  assert.equal(L.say(rematchLine({ p1: true, p2: true }), 'en'), 'Rematch!');
  assert.equal(L.say(rematchLine({}), 'en'), 'Rematch from the phones: both of you tap “Rematch”');
  // card della partita: nastro, livello, trofei con i loro numeri, «Prossimo trofeo», record, riquadri dei numeri
  const { TROPHIES, nextTrophy } = await import('../src/natpf/natpf_trofei.js');
  const { BADGE_WON, BADGE_LOST, recordLine } = await import('../src/natpf/natpf_end_card.js');
  const { bestOf } = await import('../src/natpf/natpf_match_stats.js');
  assert.deepEqual([BADGE_WON, BADGE_LOST, 'Livello Evento', 'Livello Leggenda', 'Sfida a due'].map(en), ['Match MVP', 'Great match', 'Event level', 'Legend level', 'Head to head']);
  const sum = { timing: { perfetto: 3 }, fastest: 121, longest: 9, unreturned: 1, winners: 2, superOk: 1, love: 1, mpSaved: 2, streak: 4, wall: 6, comeback: 3, gameComeback: 0 };
  for (const [id, t] of Object.entries(TROPHIES)){
    const name = en(t.name), text = en(t.text(sum, { rank: { rank: 2 } }));
    assert.notEqual(name, t.name === 'Super' ? null : t.name, id); noItalian(text, `${id}: ${text}`);
  }
  assert.equal(en(TROPHIES.cecchino.text(sum)), '3 Perfect shots'); assert.equal(en(TROPHIES.rimonta.text(sum)), '2 match points saved'); assert.equal(en(TROPHIES.re.text(sum, { rank: { rank: 2 } })), '2nd in today’s ranking');
  const nx = nextTrophy({ timing: { perfetto: 1 }, fastest: 60, longest: 3, hits: 6 }, {});
  if (nx){ noItalian(en(nx.text), nx.text); assert.match(en(nx.text), /^Next trophy: /); }
  assert.equal(en('Prossimo trofeo: Cecchino d’argento · 2 colpi Perfetti in più'), 'Next trophy: Silver Sharpshooter · 2 more Perfect shots');
  assert.equal(en('Prossimo trofeo: Razzo di bronzo a 110 km/h · 5 km/h in più'), 'Next trophy: Bronze Rocket at 110 km/h · 5 more km/h');
  for (const r of [{ kmh: { mine: true, value: 128 } }, { scambio: { mine: true, value: 9 } }, { kmh: { value: 130 } }, { scambio: { value: 10 } }]) noItalian(en(recordLine(r, 'player').text), JSON.stringify(r));
  for (const t of bestOf({ winners: 3, aces: 1, superOk: 2, timing: { perfetto: 4 }, fastest: 120, longest: 8, points: 5, hits: 10 }, { limit: 7, vsCpu: true })) noItalian(en(t.label), t.label);
  assert.equal(en("vincenti che l'avversario non ha preso"), 'winners the opponent didn’t reach');
  // barre della potenza e dell'energia
  assert.deepEqual(['Potenza', 'Forte', 'Fortissimo', 'SUPER!', 'Energia', 'Stanco!', 'Affaticato'].map(s => L.say(s, 'en')), ['Power', 'Strong', 'Very strong', 'SUPER!', 'Energy', 'Tired!', 'Weary']);
});

test('B72 EN: riquadro della pausa per il telefono caduto (titoli e testi con il nome, i secondi, il QR)', () => {
  const P = (L, extra = {}) => ({ state: { beatAt: 0, ...L }, dropMotivo: null, ...extra });
  const views = [
    PW.phoneHoldView(P({ vis: false, hiddenAt: 0 }), 'pagina nascosta', { now: 5200 }),
    PW.phoneHoldView(P({}), 'segnale debole', { now: 1000 }),
    PW.phoneHoldView(P({}), 'scollegato', { now: 7000 }),
    PW.phoneHoldView(P({}), 'scollegato', { name: 'Giulia', slot: 'p2', now: 0 }),
    PW.phoneHoldView(P({}, { dropMotivo: 'telefono: pagina chiusa' }), 'scollegato', { now: 0 }),
    PW.phoneHoldView(P({}, { dropMotivo: 'telefono: scollegato' }), 'scollegato', { now: 0 }),
    PW.phoneHoldView(P({}), 'sensori fermi', { name: 'Player 2', slot: 'p2' }),
    PW.phoneHoldView(P({}), 'non pronto', { name: 'Marco' }),
  ];
  const out = views.map(v => [L.say(v.title, 'en'), L.say(v.text, 'en')]);
  assert.deepEqual(out, [
    ['Phone paused', 'Phone screen off for 5 s: turn the screen on and tap the game page, it resumes by itself.'],
    ['Phone 1: weak signal, waiting for it to come back…', 'The match is paused and resumes by itself as soon as the phone is back.'],
    ['Phone 1 disconnected · reconnects by itself', 'No signal for 7 s: it reconnects by itself as soon as the network is back. If it does not come back, reopen the game page on the phone.'],
    ["Giulia's phone disconnected · reconnects by itself", 'The phone reconnects by itself as soon as the network is back. If it does not come back, reopen the game page on the phone.'],
    ['Phone 1: page closed', 'If it does not come back in a few seconds (page reloaded), scan the QR code again.'],
    ['Phone 1 disconnected from the phone · scan the QR code', '“Disconnect” was tapped on the phone: to play again, scan the QR code again.'],
    ["Player 2's phone paused", 'The phone no longer sends movement: on the phone tap “Restart the sensors”.'],
    ["Marco's phone paused", 'Phone not ready: finish the calibration on the phone.'],
  ]);
  assert.equal(L.say(PW.holdTitle('Giulia', 'ready'), 'en'), "Giulia's phone ready again");
  assert.equal(L.say('Si riprende tra 2…', 'en'), 'Resuming in 2…');
  assert.equal(L.say(`${PW.holdTitle('Giulia')}: aspetto il telefono ${PW.phoneOf('Player 2')}`, 'en'), "Giulia's phone paused: waiting for Player 2's phone");
  assert.equal(L.say('Partita in pausa', 'en'), 'Match paused'); assert.equal(L.say('Ricollega il telefono', 'en'), 'Reconnect the phone');
  assert.equal(L.say('Telefono di Giulia: inquadra questo QR', 'en'), "Giulia's phone: scan this QR code");
});

test('B72 EN: tabellone (nomi dati dal gioco e sigle, etichetta nel riquadro), etichette sotto le metà, conto alla rovescia', () => {
  const v = SB.scoreboardView({ playerPoints: 3, opponentPoints: 3, playerGames: 1, server: 'player' }, { gamesToWin: 2 });
  const e = localizeBoard(v, 'en');
  assert.deepEqual(e.rows.map(r => [r.name, r.short]), [['You', 'YOU'], ['Opponent', 'OPP']]);
  assert.equal(e.tag.text, 'Deuce'); assert.equal(e.label, 'Deuce'); assert.equal(e.format, 'Best of 3 games');
  assert.equal(localizeBoard(v, 'it'), v, 'in italiano la stessa vista');
  const d = localizeBoard(SB.scoreboardView({}, { doubles: true }), 'en');
  assert.deepEqual(d.rows.map(r => [r.name, r.short]), [['You + partner', 'YOU+PAR'], ['Opponents', 'OPP']]);
  assert.equal(d.tag.text, '1 game');
  const s = localizeBoard(SB.scoreboardView({ playerPoints: 4, opponentPoints: 3 }, { split: true, splitNames: { p1: 'Giulia', p2: 'Marco' } }), 'en');
  assert.deepEqual(s.rows.map(r => r.short), ['GIU', 'MAR'], 'i nomi scritti restano'); assert.equal(s.label, 'Advantage Giulia'); assert.equal(s.tag.text, 'Advantage');
  const nick = localizeBoard(SB.scoreboardView({}, { myName: 'Tullio' }), 'en');
  assert.equal(nick.rows[0].name, 'Tullio', 'un nome che comincia come «Tu» resta');
  assert.match(SB.scoreboardHtml(e, { serving: L.servingNote('en') }), /You \(serving\)/);
  assert.match(SB.scoreboardHtml(v), /Tu \(al servizio\)/, 'senza opzioni come prima');
  // etichetta sotto la metà e aiuto al più giovane
  assert.equal(L.say('Telefono in pausa', 'en'), 'Phone paused'); assert.equal(L.say(helpLabel({ band: 'bambino' }), 'en'), 'Help: Child');
  assert.equal(L.say('Mancino', 'en'), 'Left-handed');
  // conto alla rovescia prima della partita
  const T = prematchTexts('match'), T2 = prematchTexts('trial', { split: true });
  assert.deepEqual([T.kicker, T.title, T2.title, T2.line].map(x => L.say(x, 'en')), ['Get ready', 'The match is about to start', 'First a few practice rallies', 'Rally with each other: the game learns your shots']);
  assert.equal(L.say(prematchServeLine({ server: 'player' }), 'en'), 'Your serve: toss the ball and hit');
  assert.equal(L.say(prematchServeLine({ server: 'opponent' }), 'en'), 'The opponent serves first');
  assert.equal(L.say("Batte per primo l'avversario", 'en'), 'The opponent serves first');
  assert.equal(L.say(prematchServeLine({ names: { player: 'Giulia', opponent: 'Marco' }, server: 'opponent', drawn: true }), 'en'), 'Coin toss: Marco serves first');
});

/* ---------- lingua per telefono ---------- */
test('B72 telefono del Player 1: un telefono di prima vale IT; lingua toccata → gioco in inglese e cfg lg; annuncio al collegamento solo se non si sa', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, E, link } = w, P = ui.phone;
  assert.equal(P.lang, null); assert.equal(ui.lang.at('center'), 'it');
  assert.ok(!('lg' in P._cfg()), 'senza lingua il cfg non la porta (telefoni di prima: niente di nuovo)');
  const heard = []; P.onLang((l, c) => heard.push([l, c]));
  // annuncio al collegamento di un telefono con EN salvato: il gioco non la conosceva → la prende
  P._onPhoneLang('en', { link: true });
  assert.equal(P.lang, 'en'); assert.deepEqual(heard, [['en', 'telefono']]);
  assert.equal(link.sent.at(-1).t, 'cfg'); assert.equal(link.sent.at(-1).lg, 'en');
  assert.deepEqual(L.langView(E), { left: 'en', right: 'en', center: 'en' });
  assert.equal(E.hud.natpfLang, ui.lang, 'l\'HUD del motore legge la lingua');
  // valori strani: niente
  const n = link.sent.length; P._onPhoneLang('fr'); P._onPhoneLang(undefined); assert.equal(P.lang, 'en'); assert.equal(link.sent.length, n);
  // tocco IT → IT (e cfg)
  P._onPhoneLang('it'); assert.equal(P.lang, 'it'); assert.equal(link.sent.at(-1).lg, 'it');
  // un annuncio EN dopo che il gioco la conosce (per esempio un telefono che si ricollega): non vale, il gioco rimanda la sua
  P._onPhoneLang('en', { link: true }); assert.equal(P.lang, 'it'); assert.equal(link.sent.at(-1).lg, 'it');
  // il tocco ripetuto uguale conferma al telefono (cfg con la stessa lingua)
  const m = link.sent.length; P._onPhoneLang('it'); assert.equal(link.sent.length, m + 1); assert.equal(link.sent.at(-1).lg, 'it');
  assert.deepEqual(heard.map(h => h[0]), ['en', 'it']);
});

test('B72 «Nuovo giocatore» e chiosco: la lingua torna IT per Player 1 e Player 2 con la mano (resetHands), il telefono la riceve', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, E, link } = w;
  const { P2, l2 } = secondPhone(E, NatpfPhoneRacket);
  ui.phone._onPhoneLang('en'); P2._onPhoneLang('en'); ui.hand.set('left');
  for (const causa of ['nuovo giocatore', 'chiosco', 'fiera']){
    ui.phone._onPhoneLang('en'); P2._onPhoneLang('en');
    resetHands(ui, causa);
    assert.equal(ui.phone.lang, 'it', causa); assert.equal(P2.lang, 'it', causa); assert.equal(ui.hand.hand, 'right', causa);
    assert.equal(link.sent.filter(m => m.t === 'cfg').at(-1).lg, 'it', `${causa}: il telefono del P1 lo sa`);
    assert.equal(l2.sent.filter(m => m.t === 'cfg').at(-1).lg, 'it', `${causa}: il telefono del P2 lo sa`);
    // il telefono che si ricollega con EN salvato non la riporta (annuncio): vale IT finché chi gioca non la tocca
    ui.phone._onPhoneLang('en', { link: true }); assert.equal(ui.phone.lang, 'it', causa);
  }
  // il «Nuovo giocatore» vero (natpf_new_player.resetVisitor) passa da resetHands
  ui.phone._onPhoneLang('en');
  ui.newPlayer(); w.advance(200);
  assert.equal(ui.phone.lang, 'it', 'ui.newPlayer');
});

test('B72 stesso schermo: P2 EN e P1 IT → metà del P2 in inglese (tabellone della metà compreso), metà del P1 in italiano, centro in italiano', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, E } = w;
  const { P2 } = secondPhone(E, NatpfPhoneRacket);
  ui.split.prepare?.();
  E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' };
  assert.ok(E.startSplit(), 'stesso schermo');
  P2._onPhoneLang('en');
  assert.deepEqual(L.langView(E), { left: 'it', right: 'en', center: 'it' });
  assert.equal(L.langAt(E, 'p2'), 'en'); assert.equal(L.langAt(E, 'p1'), 'it');
  // tabellone: la copia nella metà del P2 in inglese, quella del P1 in italiano
  Object.assign(E.score, { playerPoints: 3, opponentPoints: 3, server: 'opponent' });
  ui.onScore(E.score, 2);
  assert.match($('natpf-scoreboard').innerHTML, /data-sb-tag="deuce"[^>]*>Parità</); assert.match($('natpf-scoreboard').innerHTML, /Marco \(al servizio\)/);
  assert.match($('natpf-scoreboard-p2').innerHTML, /data-sb-tag="deuce"[^>]*>Deuce</); assert.match($('natpf-scoreboard-p2').innerHTML, /Marco \(serving\)/);
  // tutti e due EN: anche il centro
  ui.phone._onPhoneLang('en');
  assert.deepEqual(L.langView(E), { left: 'en', right: 'en', center: 'en' });
  ui.onScore(E.score, 2);
  assert.equal($('natpf-scoreboard').innerHTML, $('natpf-scoreboard-p2').innerHTML);
  // fuori dallo stesso schermo conta solo il telefono di questo computer
  P2._onPhoneLang('it'); E.endSplit();
  assert.deepEqual(L.langView(E), { left: 'en', right: 'en', center: 'en' });
});

test('B72 scritta dei colpi nella metà di chi ha colpito (natpf_shot_feedback passa la lingua all\'HUD); il resto non cambia formato', () => {
  const src = readFileSync(new URL('../src/natpf/natpf_shot_feedback.js', import.meta.url), 'utf8');
  assert.match(src, /lang: langAt\(engine, place\.side\)/);
  const hud = readFileSync(new URL('../src/hud_ui.js', import.meta.url), 'utf8');
  assert.match(hud, /lang: lg = null/); assert.match(hud, /ltx\(t, L\)/); assert.match(hud, /ltx\(n, L\)/);
  // stesso schermo: sinistra = P1, destra = P2; a una vista i due angoli sono di chi gioca qui
  const E = { natpfSplit: { active: true }, natpfPhone: { lang: 'it' }, natpfPhone2: { lang: 'en' } };
  assert.equal(L.langAt(E, SF.popupPlace({ p2: true, split: true }).side), 'en');
  assert.equal(L.langAt(E, SF.popupPlace({ p2: false, split: true }).side), 'it');
  const E1 = { natpfPhone: { lang: 'en' } };
  assert.equal(L.langAt(E1, SF.popupPlace({ p2: true, role: 'p1' }).side), 'en'); assert.equal(L.langAt(E1, SF.popupPlace({}).side), 'en');
  // il registro dello stand non conosce la lingua (formato invariato)
  for (const f of ['registro_formato.js', 'registro_registratore.js']){
    let s = ''; try { s = readFileSync(new URL(`../src/natpf/registro/${f}`, import.meta.url), 'utf8'); } catch {}
    assert.doesNotMatch(s, /\blang\b|lingua/, f);
  }
});

test('B72 traduzioni ricordate: la stessa frase non si ritraduce (niente lavoro per fotogramma)', () => {
  const a = L.gameEn('Fuori · troppo presto'), b = L.gameEn('Fuori · troppo presto');
  assert.equal(a, b); assert.equal(a, 'Out · too early');
  // 2000 frasi diverse non fanno crescere la memoria senza limite (la cache si svuota)
  for (let i = 0; i < 2000; i++) L.gameEn(`Giulia ${i}`);
  assert.equal(L.gameEn('Perfetto'), 'Perfect');
});
