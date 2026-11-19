// B72 · unione dei tre rami (b72-avversario, b72-servizio, b72-lingua): le tre funzioni insieme.
//   • i testi di partita che il ramo b72-avversario scrive adesso («dell'avversario», «degli avversari», «Ha vinto
//     l'avversario», «Batte per primo l'avversario», «Tu + compagno», «Avversario esperto»…), presi dalle funzioni vere del
//     gioco, in inglese non lasciano parole italiane (il dizionario del ramo b72-lingua li deve conoscere tutti);
//   • la casella «Al servizio» che lampeggia e l'alone dopo 3 s (b72-servizio) restano gli stessi con il giocatore in
//     inglese, e le istruzioni del servizio sono nella lingua di chi batte (a una vista e nello stesso schermo, per metà).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld, $ } from './ui-world.mjs';
import { secondPhone } from './trial-world.mjs';
const { NatpfPhoneRacket } = await import('../src/natpf/natpf_phone_racket.js');
const L = await import('../src/natpf/natpf_lang.js');
const { t: itText } = await import('../src/natpf/natpf_i18n.js');
const PC = await import('../src/natpf/natpf_point_call.js');
const MS = await import('../src/natpf/natpf_match_stats.js');
const SB = await import('../src/natpf/natpf_scoreboard.js');
const W = await import('../src/natpf/natpf_who.js');
const { prematchServeLine } = await import('../src/natpf/natpf_prematch.js');
const { SERVE_HALO } = await import('../src/natpf/natpf_serve_alert.js');
const en = s => L.tx(s, 'en');
// parole italiane che in inglese non devono restare (anche le forme nuove del ramo b72-avversario)
const ITALIAN = /\b(della|dell[’']|degli|del|Punto|Errore|palla|Vince|Vincono|Ha|Hanno|vinto|Batte|batte|Sorteggio|Partita|tuo|batti|Parità|Vantaggio|Avversari[oi]?|avversari[oi]?|compagno|Tu|sempre|primo|esperto|Esperto|Leggenda|Facile|Bambini|Evento|questa|volta|preso|arriva|arrivano|corta)\b|l[’']avversario|gli avversari/;
const noItalian = (it, ctx) => { const s = en(it); assert.doesNotMatch(String(s), ITALIAN, `resta italiano: «${it}» → «${s}» (${ctx})`); return s; };

/* ---------- testi del ramo b72-avversario in inglese ---------- */
test('B72 unione: punti, game, fine partita e chi batte, dalle funzioni vere, in inglese senza parole italiane (singolo, doppio, rete)', () => {
  let n = 0;
  for (const multiplayer of [false, true]) for (const doubles of [false, true]) for (const viewer of ['player', 'opponent']){
    const rival = PC.rivalOf({ multiplayer, viewer, doubles }), ctx = `${multiplayer ? 'rete' : 'contro il gioco'} ${doubles ? 'doppio' : 'singolo'} ${viewer}`;
    for (const winner of ['player', 'opponent']){
      for (const why of ['Out', 'Net', 'Nice Shot!', 'Ace!', 'Point'])
        for (const score of [null, { player: '40', opponent: '40' }, { player: 'Ad', opponent: '40' }, { player: '40', opponent: 'Ad' }, { player: '15', opponent: '00' }]){
          const p = PC.pointCall({ winner, why, viewer, rival, score });
          noItalian(p.text, ctx); noItalian(p.subText, ctx); n += 2;
        }
      for (const match of [false, true]){
        const g = PC.gameCall({ winner, viewer, rival, games: { player: 1, opponent: 2 }, match });
        noItalian(g.text, ctx); noItalian(g.subText, ctx); n += 2;
        for (const nickname of ['', 'Luca']){
          const m = PC.matchEndView({ winner, viewer, rival, games: { player: 1, opponent: 2 }, multiplayer, doubles, nickname });
          noItalian(m.title, ctx); for (const r of m.rows) noItalian(r.name, ctx); n += 3;
        }
      }
    }
  }
  for (const fixed of [false, true]) for (const drawn of [false, true]) for (const server of ['player', 'opponent']){
    noItalian(prematchServeLine({ server, fixed, drawn }), 'conto'); n++;
  }
  assert.ok(n > 300, `testi provati: ${n}`);
  // le forme esatte
  assert.equal(en("Punto dell'avversario"), "Opponent's point"); assert.equal(en('Gli avversari non ci arrivano'), 'The opponents can’t reach it');
  assert.equal(en("Vince l'avversario"), 'The opponent wins'); assert.equal(en('Vincono gli avversari'), 'The opponents win');
  assert.equal(en("Batte sempre l'avversario"), 'The opponent always serves'); assert.equal(en("Batte per primo l'avversario"), 'The opponent serves first');
  assert.equal(en('Avversario'), 'Opponent'); assert.equal(en('Avversari'), 'Opponents'); assert.equal(en('Tu + compagno'), 'You + partner'); assert.equal(en('compagno'), 'partner');
});

test('B72 unione: schermata finale contro l\'avversario (singolo e doppio): «Ha vinto l\'avversario questa volta…» in inglese', () => {
  // la riga sotto il titolo quando si perde (natpf_match_stats.endScreen, forma del ramo b72-avversario)
  assert.equal(en("Ha vinto l'avversario questa volta. Ecco cosa ti è venuto meglio:"), 'The opponent won this time. Here is what you did best:');
  assert.equal(en('Ha vinto l’avversario questa volta. Ecco cosa ti è venuto meglio:'), 'The opponent won this time. Here is what you did best:');
  assert.equal(en('Hanno vinto gli avversari questa volta. Ecco cosa ti è venuto meglio:'), 'The opponents won this time. Here is what you did best:');
  // i nomi restano come sono (anche minuscoli), il compagno diventa «partner»
  assert.equal(en('Ha vinto Marco questa volta. Ecco cosa ti è venuto meglio:'), 'Marco won this time. Here is what you did best:');
  assert.equal(en('Ha vinto luca questa volta. Ecco cosa ti è venuto meglio:'), 'luca won this time. Here is what you did best:');
  assert.equal(en('Hanno vinto Player 2 + compagno questa volta. Ecco cosa ti è venuto meglio:'), 'Player 2 + partner won this time. Here is what you did best:');
  // dalla funzione vera, partita persa contro il gioco: tutte le scritte della schermata (titolo, riga, pillole, riquadri)
  for (const doubles of [false, true]) for (const level of W.CPU_LEVELS){
    const m = MS.newMatch({ mode: 'cpu', level, gamesToWin: 1, doubles });
    MS.addShot(m, { side: 'player', grade: 'Perfetto', kmh: 120 }); MS.addPoint(m, { winner: 'player', why: 'Nice Shot!', strokes: 5 });
    MS.addPoint(m, { winner: 'opponent', why: 'Out', strokes: 3, gameWinner: 'opponent', gamesAfter: { player: 0, opponent: 1 } });
    const base = PC.matchEndView({ winner: 'opponent', games: { player: 0, opponent: 1 }, doubles });
    const v = MS.viewOf(m, { viewer: 'player' });
    const es = MS.endScreen(base, v);
    assert.ok(es && !es.won, 'partita persa');
    const ctx = `${doubles ? 'doppio' : 'singolo'} ${level}`;
    assert.match(es.sub, doubles ? /^Hanno vinto gli avversari questa volta/ : /^Ha vinto l'avversario questa volta/, ctx);
    for (const t of [base.title, es.kicker, es.title, es.sub, es.pill, ...base.rows.map(r => r.name), ...es.tiles.map(x => x.label)]) if (t) noItalian(t, ctx);
  }
  // riquadro dei vincenti contro il gioco
  assert.equal(en("vincenti che l'avversario non ha preso"), 'winners the opponent didn’t reach');
  assert.equal(en('vincenti che gli avversari non hanno preso'), 'winners the opponents didn’t reach');
});

test('B72 unione: tabellone (Tu + compagno, Avversari), livelli per nome e palla corta dell\'avversario in inglese; in italiano niente cambia', () => {
  const d = L.localizeBoard(SB.scoreboardView({}, { doubles: true }), 'en');
  assert.deepEqual(d.rows.map(r => [r.name, r.short]), [['You + partner', 'YOU+PAR'], ['Opponents', 'OPP']]);
  const it = SB.scoreboardView({}, { doubles: true });
  assert.deepEqual(it.rows.map(r => [r.name, r.short]), [['Tu + compagno', 'TU+COM'], ['Avversari', 'AVV']], 'in italiano le sigle del ramo b72-avversario');
  assert.equal(L.localizeBoard(it, 'it'), it);
  // avversario con il livello scelto per nome (natpf_who.opponentLevelName)
  assert.equal(en(W.opponentLevelName('pro')), 'Expert opponent'); assert.equal(en(W.opponentLevelName('leggenda')), 'Legend opponent');
  for (const l of W.CPU_LEVELS) noItalian(W.opponentLevelName(l), l);
  assert.equal(en('Fine partita · livello Esperto'), 'Match over · Expert level'); assert.equal(en('Prossima volta prova il livello Esperto'), 'Next time try the Expert level');
  // palla corta dichiarata: la chiave del motore e il testo già italiano
  assert.equal(en('CPU DROP SHOT'), 'Opponent’s drop shot'); assert.equal(en("Palla corta dell'avversario"), 'Opponent’s drop shot');
  assert.equal(en('Palla corta degli avversari'), 'Opponents’ drop shot');
  // in italiano: l'HUD di sempre (natpf_i18n) e i testi del gioco identici
  for (const s of ["Ha vinto l'avversario questa volta. Ecco cosa ti è venuto meglio:", 'Avversario esperto', "Palla corta dell'avversario", 'CPU DROP SHOT', "Punto dell'avversario"])
    assert.equal(L.tx(s, 'it'), itText(s), s);
  assert.match(itText('CPU DROP SHOT'), /^Palla corta dell'avversario$/i, 'in italiano la scritta del ramo b72-avversario');
  for (const s of ["Batte per primo l'avversario", 'Avversario Leggenda']) assert.equal(L.say(s, 'it'), s);
  // telecomando dello staff: niente «CPU» nemmeno nella risposta di «Gioca» dal menu
  assert.doesNotMatch(readFileSync(new URL('../src/natpf/natpf_remote.js', import.meta.url), 'utf8'), /msg: 'Contro la CPU'/);
});

/* ---------- casella che lampeggia e alone con la lingua di chi gioca ---------- */
const coachText = () => [$('natpf-serve-coach').querySelector('[data-c="big"]').textContent, $('natpf-serve-coach').querySelector('[data-c="sub"]').textContent];
// (l'alone nasce la prima volta che serve: NatpfServeAlert.halo; nel DOM finto getElementById crea sempre un elemento)
let ALERT = null;
const halo = () => !!ALERT?.halo && !ALERT.halo.classList.contains('hidden');

for (const lang of ['en', 'it']) test(`B72 unione: contro l'avversario con il telefono in ${lang === 'en' ? 'inglese' : 'italiano'}: lampeggio subito, alone dopo 3 s, istruzioni nella lingua, via al lancio e in pausa`, async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, E, link } = w;
  ALERT = ui.serveCoach.alert;
  ui.phone._onPhoneLang(lang); link.cmd('skip');
  assert.equal(L.langAt(E, 'center'), lang);
  E.hud.hideTitleModal(); Object.assign(E, { autoPlayMode: false, userHasInteracted: true, persistentStateLock: false });
  E.startNewMatch({ showStartBanner: false });
  E.score.server = 'player'; E._setupPointServe({ showBanner: false });
  w.advance(500);
  assert.equal(E.phase, 'SERVE_STANCE');
  assert.ok($('server-tag').classList.contains('serve-blink'), 'la casella «Al servizio» lampeggia');
  assert.equal(halo(), false, 'prima dei 3 s niente alone');
  assert.equal(L.tx('Al servizio', L.langAt(E, 'center')), lang === 'en' ? 'Serving' : 'Al servizio', 'scritta della casella');
  w.advance((SERVE_HALO.afterS - .5)*1000 + 200);
  assert.ok(ui.serveCoach.state.idle >= SERVE_HALO.afterS, `tempo fermo ${ui.serveCoach.state.idle}`);
  assert.equal(halo(), true, 'dopo 3 s fermo l’alone'); assert.equal(ALERT.halo.dataset.half, undefined, 'a una vista: tutta l’area');
  assert.ok($('server-tag').classList.contains('serve-blink'));
  // il lancio: casella ferma, niente alone, istruzione nella lingua di chi batte
  E._handleUserTossInput({}); w.advance(100);
  assert.equal(E.phase, 'SERVE_TOSS');
  assert.equal($('server-tag').classList.contains('serve-blink'), false); assert.equal(halo(), false);
  assert.deepEqual(coachText(), lang === 'en' ? ['Wait for it to rise…', 'Hit when the ball is high'] : ['Aspetta che salga…', 'Colpisci quando la palla è in alto']);
  // di nuovo in posizione (punto dopo): lampeggio; la pausa spegne tutto e azzera il tempo fermo
  E.score.server = 'player'; E._setupPointServe({ showBanner: false }); w.advance(3500);
  assert.ok($('server-tag').classList.contains('serve-blink')); assert.equal(halo(), true);
  ui.pause.open();
  assert.equal(E.natpfPaused, true);
  assert.equal($('server-tag').classList.contains('serve-blink'), false, 'in pausa la casella è ferma'); assert.equal(halo(), false, 'in pausa niente alone');
  assert.equal(ui.serveCoach.state.idle, 0, 'tempo fermo da capo');
  ui.pause.close(); w.advance(500);
  assert.ok($('server-tag').classList.contains('serve-blink'), 'alla ripresa di nuovo il lampeggio'); assert.equal(halo(), false, 'l’alone dopo altri 3 s');
});

test('B72 unione: stesso schermo, P2 in inglese e P1 in italiano: lampeggio e alone nella metà di chi batte, istruzioni nella sua lingua', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, E, link } = w;
  ALERT = ui.serveCoach.alert;
  const { P2, l2 } = secondPhone(E, NatpfPhoneRacket);
  ui.split.prepare?.();
  E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' };
  assert.ok(E.startSplit(), 'stesso schermo');
  link.cmd('skip'); l2.cmd('skip');
  P2._onPhoneLang('en'); ui.phone._onPhoneLang('it');
  assert.deepEqual(L.langView(E), { left: 'it', right: 'en', center: 'it' });
  E.hud.hideTitleModal(); Object.assign(E, { autoPlayMode: false, userHasInteracted: true, persistentStateLock: false });
  E.startNewMatch({ showStartBanner: false });
  for (const [server, half, other, lang] of [['opponent', 'p2', 'p1', 'en'], ['player', 'p1', 'p2', 'it']]){
    E.score.server = server; E._setupPointServe({ showBanner: false });
    w.advance(500);
    assert.equal(E.phase, 'SERVE_STANCE', half);
    assert.ok($(`server-tag-${half}`).classList.contains('serve-blink'), `lampeggia la casella della metà ${half}`);
    assert.equal($(`server-tag-${other}`).classList.contains('serve-blink'), false, `la casella dell’altra metà è ferma (${other})`);
    w.advance(3000);
    assert.equal(halo(), true, `alone (${half})`); assert.equal(ALERT.halo.dataset.half, half, 'solo attorno alla metà di chi batte');
    // il lancio di chi batte (il Player 2 dal suo telefono, il Player 1 dal suo)
    if (half === 'p2') E._handleP2TossInput({ role: 'p2' }); else E._handleUserTossInput({});
    w.advance(100);
    assert.equal(E.phase, 'SERVE_TOSS', half);
    assert.equal(halo(), false, `al lancio niente alone (${half})`); assert.equal($(`server-tag-${half}`).classList.contains('serve-blink'), false);
    assert.deepEqual(coachText(), lang === 'en' ? ['Wait for it to rise…', 'Hit when the ball is high'] : ['Aspetta che salga…', 'Colpisci quando la palla è in alto'], `istruzione nella lingua di chi batte (${half})`);
  }
});
