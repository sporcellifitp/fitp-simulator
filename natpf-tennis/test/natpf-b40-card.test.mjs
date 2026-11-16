// B40.4 · card della partita (natpf_end_card.js): vittoria contro la CPU (MVP, cornice del livello, trofei, record),
// sconfitta (Bella sfida, prossimo trofeo), stesso schermo (due card, corona solo su chi vince, cornice dalla fascia,
// nome, nastro e riquadri del B35 dentro la card), sfida tra due computer (Player 2), doppio; mai parole negative, al più
// tre medaglie, nessun nome di altri visitatori.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newMatch, addShot, addPoint, viewOf, endScreen } from '../src/natpf/natpf_match_stats.js';
import { matchEndView } from '../src/natpf/natpf_point_call.js';
import { gameWinner } from '../src/natpf/natpf_fair_format.js';
import { cardModel, cardsHtml, recordLine, ART_BG, BADGE_WON, BADGE_LOST, TROPHY_ICON } from '../src/natpf/natpf_end_card.js';
import { TROPHIES } from '../src/natpf/natpf_trofei.js';

const NEG = /errori|errore|rete|fuori|anticipo|ritardo|vuoto|migliora|sbagli|-\d/i;
function match(seq, { mode = 'cpu', level = 'evento', perf = 0, kmh = 0, p2kmh = 0, strokes = 6 } = {}){
  const m = newMatch({ mode, level });
  for (let i = 0; i < perf; i++) addShot(m, { side: 'player', grade: 'PERFECT', kmh: kmh || 90 });
  if (p2kmh) addShot(m, { side: 'opponent', grade: 'PERFECT', kmh: p2kmh });
  for (const c of seq){
    const winner = c === 'p' ? 'player' : 'opponent';
    addPoint(m, { winner, why: 'Out', strokes, gameWinner: gameWinner(m.cur.player + (c === 'p'), m.cur.opponent + (c === 'o')) });
  }
  return m;
}
const REC = { kmh: { value: 128, mine: true, tie: false, prev: 120, side: 'player' }, scambio: { value: 31, mine: false, tie: false, prev: 31 } };

test('B40.4: vittoria contro la CPU, card con MVP, cornice Evento, trofei, record di oggi', () => {
  const m = match('oopppp', { perf: 5, kmh: 128 });
  const v = viewOf(m, { nick: 'Ada', rank: { rank: 1, total: 6, score: 93 }, first: { player: true, opponent: false }, record: REC });
  const base = matchEndView({ winner: 'player', games: { player: 1, opponent: 0 }, nickname: 'Ada' });
  const M = cardModel(v, base, { looks: { player: 'p1', opponent: 'cpu' } });
  assert.equal(M.cards.length, 1); assert.equal(M.split, false);
  const c = M.cards[0];
  assert.equal(c.name, 'Ada'); assert.equal(c.sub, 'Livello Evento'); assert.equal(c.frame, 'evento'); assert.equal(c.art, ART_BG.evento);
  assert.equal(c.badge, BADGE_WON); assert.equal(c.crown, false); assert.equal(c.look, 'p1');
  assert.deepEqual(c.trophies.map(t => t.id), ['re', 'rimonta', 'prima'], 'Re di oggi d\'oro, Rimonta, Prima volta al posto del terzo');
  assert.equal(c.trophies[0].tier, 3);
  assert.deepEqual(c.record, { mine: true, text: 'Record di oggi! 128 km/h' });
  assert.equal(c.next, null, 'chi vince con dei trofei: niente prossimo trofeo');
  const html = cardsHtml(M);
  assert.match(html, /class="end-card won" data-side="player" data-frame="evento" data-won="1" data-look="p1"/);
  assert.match(html, /<ul class="card-trophies" data-n="3"/);
  assert.match(html, /MVP della partita/); assert.match(html, /Record di oggi! 128 km\/h/);
  assert.match(html, /<svg[^>]*class="card-portrait-svg"/, 'ritratto SVG dentro la finestra (prima dei fotogrammi 3D)');
  assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), NEG);
  for (const id of Object.keys(TROPHIES)) assert.ok(TROPHY_ICON[TROPHIES[id].icon], `icona di ${id}`);
});

test('B40.4: sconfitta, «Bella sfida» e prossimo trofeo; chi vince senza trofei ha il prossimo trofeo', () => {
  const m = match('ppoooo', { perf: 6, kmh: 100 });
  const v = viewOf(m, { nick: 'Bea', record: { kmh: { value: 141, mine: false, prev: 141, side: null }, scambio: { value: 31, mine: false, prev: 31 } } });
  const c = cardModel(v, matchEndView({ winner: 'opponent', games: { player: 0, opponent: 1 }, nickname: 'Bea' })).cards[0];
  assert.equal(c.won, false); assert.equal(c.badge, BADGE_LOST);
  assert.equal(c.next, 'Prossimo trofeo: Cecchino di bronzo · 2 colpi Perfetti in più');
  assert.deepEqual(c.record, { mine: false, text: 'Record di oggi: 141 km/h' }, 'il record da battere, solo il valore');
  const html = cardsHtml({ split: false, cards: [c] });
  assert.match(html, /data-won="0"/); assert.match(html, /class="card-next"/);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), NEG);
  // vince senza trofei della partita: prossimo trofeo anche a lui
  const w = cardModel(viewOf(match('pppopp'), { nick: 'Cia' }), {}).cards[0];
  assert.equal(w.won, true); assert.equal(w.trophies.length, 0); assert.ok(w.next, 'prossimo trofeo');
  // vince senza trofei ma alla prima partita: «Prima volta» non toglie il prossimo trofeo
  const f = cardModel(viewOf(match('pppopp'), { nick: 'Dan', first: { player: true } }), {}).cards[0];
  assert.deepEqual(f.trophies.map(t => t.id), ['prima']); assert.ok(f.next);
  // senza nome: «Tu»
  assert.equal(cardModel(viewOf(match('pppp')), matchEndView({ winner: 'player', games: { player: 1, opponent: 0 } })).cards[0].name, 'Tu');
});

test('B40.4: cornice per livello (Bambini azzurra, Facile argento, Esperta oro, Leggenda arcobaleno)', () => {
  for (const [level, frame] of [['bambini', 'bambini'], ['casual', 'facile'], ['evento', 'evento'], ['pro', 'pro'], ['leggenda', 'leggenda']]){
    const c = cardModel(viewOf(match('pppp', { level })), {}).cards[0];
    assert.equal(c.frame, frame, level); assert.equal(c.art, ART_BG[frame]);
  }
});

test('B40.4: stesso schermo, due card una contro l\'altra, corona su chi vince, cornice dalla fascia, schede del B35 dentro', () => {
  const m = match('pooooo', { mode: 'split', perf: 2, kmh: 96, p2kmh: 104 });
  const v = viewOf(m, { names: { player: 'Giulia', opponent: 'Marco' }, first: { player: true, opponent: false }, record: { kmh: { value: 104, mine: true, side: 'opponent' }, scambio: { value: 12, mine: true } }, bands: { p1: 'bambino', p2: 'ragazzo' } });
  const base = matchEndView({ winner: 'opponent', games: { player: 0, opponent: 1 }, sharedNames: { player: 'Giulia', opponent: 'Marco' } });
  const M = cardModel(v, base, { looks: { player: 'p1', opponent: 'p2' }, bands: v.bands });
  assert.equal(M.split, true); assert.equal(M.cards.length, 2);
  const [g, k] = M.cards;
  assert.deepEqual([g.name, k.name], ['Giulia', 'Marco']);
  assert.deepEqual([g.crown, k.crown], [false, true], 'corona solo su chi vince');
  assert.deepEqual([g.frame, k.frame], ['bambini', 'facile'], 'cornice dalla fascia');
  assert.deepEqual([g.sub, k.sub], ['Bambino', 'Ragazzo']);
  assert.deepEqual([g.look, k.look], ['p1', 'p2']);
  assert.deepEqual([g.badge, k.badge], [BADGE_LOST, BADGE_WON]);
  assert.equal(g.record.text, 'Record di oggi! Scambio di 12 colpi', 'il colpo più forte è di Marco: Giulia ha lo scambio');
  assert.equal(k.record.text, 'Record di oggi! 104 km/h');
  // i due riquadri del B35 di ciascuno, uguali a quelli di endScreen
  const S = endScreen(base, v);
  assert.deepEqual(g.tiles, S.players[0].tiles); assert.deepEqual(k.tiles, S.players[1].tiles);
  const html = cardsHtml(M);
  assert.equal((html.match(/class="end-card end-player/g) || []).length, 2, 'la card è anche la scheda del giocatore');
  assert.equal((html.match(/class="card-crown"/g) || []).length, 1);
  assert.match(html, /<h3 class="card-name end-pname" title="Giulia">Giulia<\/h3>/);
  assert.match(html, /class="card-badge end-chip">MVP della partita/);
  assert.match(html, /<span class="end-vs"/);
  assert.equal((html.match(/class="end-tile"/g) || []).length, g.tiles.length + k.tiles.length);
  assert.ok(g.next && !/a \d+ km\/h|con uno scambio di/.test(g.next) || g.next === null, 'nello stesso schermo il prossimo trofeo corto');
  assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), NEG);
});

test('B40.4: sfida tra due computer (Player 2) e doppio; niente nomi di altri visitatori', () => {
  // computer del Player 2: la card è sua (lato opponent), niente Asso, Vincente, Muro, niente record (non passa di qui)
  const m = newMatch({ mode: 'versus', guest: true });
  for (let i = 0; i < 4; i++) addPoint(m, { winner: 'opponent', why: null, strokes: 3, gameWinner: i === 3 ? 'opponent' : null });
  const v = viewOf(m, { viewer: 'opponent', nick: 'Pia' });
  const c = cardModel(v, matchEndView({ winner: 'opponent', games: { player: 0, opponent: 1 }, viewer: 'opponent', multiplayer: true, nickname: 'Pia' }), { looks: { player: 'p1', opponent: 'p2' } }).cards[0];
  assert.equal(c.side, 'opponent'); assert.equal(c.look, 'p2'); assert.equal(c.frame, 'evento'); assert.equal(c.sub, 'Sfida a due');
  assert.equal(c.record, null);
  assert.ok(!c.trophies.some(t => ['asso', 'vincente', 'muro'].includes(t.id)));
  // doppio contro la CPU: una card per la squadra di chi gioca, niente Re di oggi
  const d = newMatch({ mode: 'cpu', level: 'evento', doubles: true });
  for (let i = 0; i < 4; i++) addPoint(d, { winner: 'player', why: 'Out', strokes: 4, gameWinner: i === 3 ? 'player' : null });
  const dv = viewOf(d, { nick: 'Ugo', rank: { rank: 1, total: 9, score: 140 } });
  const dc = cardModel(dv, matchEndView({ winner: 'player', games: { player: 1, opponent: 0 }, nickname: 'Ugo', doubles: true }));
  assert.equal(dc.cards.length, 1); assert.ok(!dc.cards[0].trophies.some(t => t.id === 're'));
  // la card ha solo il nome di chi ha giocato, mai quello di altri visitatori in classifica
  const html = cardsHtml(cardModel(viewOf(match('pppp'), { nick: 'Ada', rank: { rank: 2, total: 8, score: 100 }, record: REC }), {}));
  assert.ok(!/Bea|Visitatore/.test(html));
  assert.equal(cardModel(null, {}), null); assert.equal(cardsHtml(null), '');
  assert.equal(recordLine(null, 'player'), null);
  assert.deepEqual(recordLine({ kmh: { value: 0 }, scambio: { value: 0 } }, 'player'), null);
  // uno scambio corto pareggiato non è un record da mostrare; il colpo più forte da battere sì
  assert.deepEqual(recordLine({ kmh: { value: 150, mine: false }, scambio: { value: 3, mine: true, tie: true } }, 'player'), { mine: false, text: 'Record di oggi: 150 km/h' });
  assert.deepEqual(recordLine({ kmh: { value: 0 }, scambio: { value: 8, mine: true } }, 'player'), { mine: true, text: 'Record di oggi! Scambio di 8 colpi' });
});

test('B57: stesso schermo, la card di chi vince va sopra (per prima), quella di chi perde dopo e attenuata', async () => {
  const { cardsHtml, splitOrder } = await import('../src/natpf/natpf_end_card.js');
  const p1 = { side: 'player', name: 'Gabriele', won: false, trophies: [], frame: 'evento', look: 'p1', badge: 'x' };
  const p2 = { side: 'opponent', name: 'Matteo', won: true, trophies: [], frame: 'evento', look: 'p2', badge: 'y' };
  assert.deepEqual(splitOrder([p1, p2]).map(c => c.name), ['Matteo', 'Gabriele'], 'vince il Player 2: sopra lui');
  assert.deepEqual(splitOrder([{ ...p1, won: true }, { ...p2, won: false }]).map(c => c.name), ['Gabriele', 'Matteo']);
  assert.deepEqual(splitOrder([{ ...p1, won: false }, { ...p2, won: false }]).map(c => c.name), ['Gabriele', 'Matteo'], 'nessun vincitore: ordine dei giocatori');
  const html = cardsHtml({ split: true, cards: [p1, p2] });
  assert.ok(html.indexOf('data-side="opponent"') < html.indexOf('data-side="player"'), 'nell\'HTML prima chi vince');
  const css = (await import('node:fs')).readFileSync(new URL('../natpf-hud.css', import.meta.url), 'utf8');
  assert.match(css, /\.end-card\.end-player\[data-won="0"\] \{[^}]*opacity: 0\.82/, 'chi perde attenuato');
  assert.match(css, /\.end-card\.end-player\[data-won="1"\] \{ flex-grow: 1\.3; \}/, 'chi vince più grande');
});
