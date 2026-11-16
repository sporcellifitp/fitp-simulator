// B40.2 · i 12 trofei della card (natpf_trofei.js): soglie lette dalla tabella unica (sotto, uguale, sopra), scala con la
// durata, Game a zero per livello, Rimonta solo vinta, doppioni, computer del Player 2, Re di oggi (vinta, da 5 partite,
// mai «Ospite»), Prima volta, scelta dei 3 per la card, prossimo trofeo in positivo; banco delle soglie deterministico.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TROPHY_IDS, TROPHY_TIERS, TROPHIES, TIER_NAME, LOVE_BASE, RE_MIN, RARITY, NEAR, scaledTiers, trophyValue, trophyTier, trophiesOf, cardTrophies, nextTrophy, frameOf, tierOf } from '../src/natpf/natpf_trofei.js';
import { plan, runGroup, tables } from '../scripts/audit/b40-trofei.mjs';

const NEG = /errori|errore|rete|fuori|anticipo|ritardo|vuoto|migliora|sbagli|-\d/i;
// vista finta di un giocatore (come sideSummary con i contatori del B40.1)
const sumOf = (o = {}) => ({ points: 4, lost: 1, won: true, aces: 0, winners: 0, hits: 20, fastest: 0, superOk: 0, timing: { perfetto: 0 }, longest: 0,
  streak: 0, love: 0, comeback: 0, mpSaved: 0, gameComeback: 0, missed: 0, unreturned: 0, wall: 0, gamesPlayed: 1, ...o });
// vista con il valore di un trofeo a soglie
const withValue = (id, v, o = {}) => {
  const k = { cecchino: 'timing', razzo: 'fastest', maratoneta: 'longest', asso: 'unreturned', vincente: 'winners', super: 'superOk', serie: 'streak', muro: 'wall' }[id];
  return sumOf({ ...(k === 'timing' ? { timing: { perfetto: v } } : { [k]: v }), ...o });
};

test('B40.2: catalogo di 12 trofei, tabella unica delle soglie (bronzo < argento < oro), nomi e testi', () => {
  assert.equal(TROPHY_IDS.length, 12);
  assert.deepEqual(TROPHY_IDS.map(id => TROPHIES[id].name), ['Cecchino', 'Razzo', 'Maratoneta', 'Asso', 'Vincente', 'Super', 'Game a zero', 'Rimonta', 'In serie', 'Muro', 'Prima volta', 'Re di oggi']);
  for (const [id, T] of Object.entries(TROPHY_TIERS)){ assert.equal(T.tiers.length, 3, id); assert.ok(T.tiers[0] < T.tiers[1] && T.tiers[1] < T.tiers[2], id); }
  assert.deepEqual(TIER_NAME, ['', 'bronzo', 'argento', 'oro']);
  assert.deepEqual(RARITY.slice().sort(), TROPHY_IDS.slice().sort());
  assert.equal(RARITY.at(-1), 'prima');
  assert.equal(tierOf(1), 'di bronzo'); assert.equal(tierOf(2), 'd’argento'); assert.equal(tierOf(3), 'd’oro');
});

test('B40.2: ogni trofeo a soglie, sotto / uguale / sopra le tre soglie (lette dalla tabella)', () => {
  for (const id of Object.keys(TROPHY_TIERS)){
    const [b, a, o] = TROPHY_TIERS[id].tiers;
    assert.equal(trophyTier(id, withValue(id, b - 1)), 0, `${id} sotto il bronzo`);
    assert.equal(trophyTier(id, withValue(id, b)), 1, `${id} bronzo`);
    assert.equal(trophyTier(id, withValue(id, a - 1)), 1, `${id} sotto l'argento`);
    assert.equal(trophyTier(id, withValue(id, a)), 2, `${id} argento`);
    assert.equal(trophyTier(id, withValue(id, o)), 3, `${id} oro`);
    assert.equal(trophyTier(id, withValue(id, o + 10)), 3, `${id} sopra l'oro`);
    assert.equal(trophyValue(id, withValue(id, b)), b);
  }
});

test('B40.2: soglie che crescono con la durata della partita', () => {
  const [c] = TROPHY_TIERS.cecchino.tiers;
  assert.equal(trophyTier('cecchino', withValue('cecchino', c)), 1, 'a 1 game');
  assert.equal(trophyTier('cecchino', withValue('cecchino', c, { gamesPlayed: 2 })), 0, 'a 2 game ne servono il doppio');
  assert.equal(trophyTier('cecchino', withValue('cecchino', 2*c, { gamesPlayed: 2 })), 1);
  const [m] = TROPHY_TIERS.muro.tiers, m2 = Math.round(m*Math.sqrt(2));
  assert.deepEqual(scaledTiers('muro', sumOf({ gamesPlayed: 2 }))[0], m2, 'Muro × √2 al meglio di 3');
  assert.equal(trophyTier('muro', withValue('muro', m2 - 1, { gamesPlayed: 2 })), 0);
  assert.equal(trophyTier('muro', withValue('muro', m2, { gamesPlayed: 2 })), 1);
  assert.deepEqual(scaledTiers('serie', sumOf({ gamesPlayed: 3 })), TROPHY_TIERS.serie.tiers.map(x => x + 4), 'In serie: due punti in più per game');
  assert.deepEqual(scaledTiers('razzo', sumOf({ gamesPlayed: 3 })), TROPHY_TIERS.razzo.tiers, 'il colpo più forte non dipende dalla durata');
});

test('B40.2: Game a zero dal livello della CPU, Rimonta solo se vinta', () => {
  const z = n => sumOf({ love: n });
  assert.equal(trophyTier('zero', z(0), { mode: 'cpu', level: 'evento' }), 0);
  assert.equal(trophyTier('zero', z(1), { mode: 'cpu', level: 'bambini' }), 1);
  assert.equal(trophyTier('zero', z(1), { mode: 'cpu', level: 'evento' }), 1);
  assert.equal(trophyTier('zero', z(1), { mode: 'cpu', level: 'pro' }), 2);
  assert.equal(trophyTier('zero', z(1), { mode: 'cpu', level: 'leggenda' }), 3);
  assert.equal(trophyTier('zero', z(2), { mode: 'cpu', level: 'evento' }), 2);
  assert.equal(trophyTier('zero', z(3), { mode: 'cpu', level: 'casual' }), 3);
  assert.equal(trophyTier('zero', z(2), { mode: 'cpu', level: 'pro' }), 3);
  assert.equal(trophyTier('zero', z(1), { mode: 'split' }), 1, 'stesso schermo: bronzo');
  assert.equal(trophyTier('zero', z(1), { mode: 'versus' }), 1, 'due computer: bronzo');
  assert.deepEqual(LOVE_BASE, { bambini: 1, casual: 1, evento: 1, pro: 2, leggenda: 3 });
  // Rimonta
  assert.equal(trophyTier('rimonta', sumOf({ comeback: 2 })), 1, 'da 0-30');
  assert.equal(trophyTier('rimonta', sumOf({ comeback: 1 })), 0);
  assert.equal(trophyTier('rimonta', sumOf({ gameComeback: 1 })), 1, 'da un game sotto');
  assert.equal(trophyTier('rimonta', sumOf({ mpSaved: 1 })), 1);
  assert.equal(trophyTier('rimonta', sumOf({ mpSaved: 2 })), 2);
  assert.equal(trophyTier('rimonta', sumOf({ mpSaved: 3, comeback: 3 })), 3, 'da 0-40');
  assert.equal(trophyTier('rimonta', sumOf({ mpSaved: 3, comeback: 3, won: false })), 0, 'solo se vinta');
});

test('B40.2: doppioni (In serie dentro Game a zero e Rimonta), computer del Player 2', () => {
  // 4-0: Game a zero di bronzo e 4 punti di fila (In serie di bronzo) → solo Game a zero
  let l = trophiesOf(sumOf({ love: 1, streak: 4 }), { mode: 'cpu', level: 'evento' });
  assert.deepEqual(l.map(t => t.id), ['zero']);
  // da 0-40: Rimonta d'oro e 5 punti di fila (In serie d'argento) → solo Rimonta
  l = trophiesOf(sumOf({ mpSaved: 3, comeback: 3, streak: 5 }), { mode: 'cpu', level: 'evento' });
  assert.deepEqual(l.map(t => t.id), ['rimonta']);
  // In serie più alto di Game a zero: restano tutti e due
  l = trophiesOf(sumOf({ love: 1, streak: 7 }), { mode: 'cpu', level: 'evento' });
  assert.deepEqual(l.map(t => [t.id, t.tier]), [['serie', 3], ['zero', 1]]);
  // computer del Player 2: niente Asso, Vincente, Muro
  const s = sumOf({ unreturned: 9, winners: 9, wall: 99, fastest: 160 });
  assert.deepEqual(trophiesOf(s, { mode: 'versus', guest: true }).map(t => t.id), ['razzo']);
  assert.deepEqual(trophiesOf(s, { mode: 'versus' }).map(t => t.id).sort(), ['asso', 'muro', 'razzo', 'vincente']);
});

test('B40.2: Re di oggi (vinta, in classifica con un nome, da 5 partite) e Prima volta', () => {
  const ctx = (rank, total, o = {}) => ({ mode: 'cpu', level: 'evento', rank: { rank, total, score: 100, ...o } });
  assert.equal(trophyTier('re', sumOf(), ctx(1, RE_MIN)), 3);
  assert.equal(trophyTier('re', sumOf(), ctx(2, 9)), 2);
  assert.equal(trophyTier('re', sumOf(), ctx(3, 9)), 1);
  assert.equal(trophyTier('re', sumOf(), ctx(4, 9)), 0);
  assert.equal(trophyTier('re', sumOf(), ctx(1, RE_MIN - 1)), 0, 'meno di 5 partite in classifica');
  assert.equal(trophyTier('re', sumOf({ won: false }), ctx(1, 9)), 0, 'solo partite vinte');
  assert.equal(trophyTier('re', sumOf(), ctx(1, 9, { guest: true })), 0, 'Ospite: mai');
  assert.equal(trophyTier('re', sumOf(), ctx(0, 60)), 0, 'fuori dalle prime');
  assert.equal(trophyTier('re', sumOf(), { mode: 'split', rank: { rank: 1, total: 9 } }), 0, 'solo contro la CPU');
  assert.equal(trophyTier('prima', sumOf(), { first: true }), 1);
  assert.equal(trophyTier('prima', sumOf(), { first: false }), 0);
  assert.equal(trophyTier('prima', sumOf({ won: false }), { first: true }), 1, 'anche a chi perde');
  const l = trophiesOf(sumOf(), ctx(1, 7));
  assert.equal(l[0].text, '1° nella classifica di oggi');
});

test('B40.2: i tre trofei della card (dal più alto, poi dal più raro; Prima volta sempre in vista)', () => {
  // (soglie di Torino del 16/11: Cecchino 8 · 12 · 15 a game, Vincente 3 · 4 · 5 a game, Maratoneta 23 · 29 · 37)
  const s = sumOf({ fastest: 156, timing: { perfetto: 9 }, longest: 38, winners: 3, streak: 4 });
  const all = trophiesOf(s, { mode: 'cpu', level: 'evento' });
  assert.deepEqual(all.map(t => [t.id, t.tier]), [['maratoneta', 3], ['razzo', 2], ['cecchino', 1], ['vincente', 1], ['serie', 1]]);
  assert.deepEqual(cardTrophies(all).map(t => t.id), ['maratoneta', 'razzo', 'cecchino']);
  // Prima volta prende il posto del terzo
  const allFirst = trophiesOf(s, { mode: 'cpu', level: 'evento', first: true });
  assert.deepEqual(cardTrophies(allFirst).map(t => t.id), ['maratoneta', 'razzo', 'prima']);
  assert.equal(allFirst.at(-1).id, 'prima', 'sempre per ultima');
  assert.deepEqual(cardTrophies(trophiesOf(sumOf(), { first: true })).map(t => t.id), ['prima']);
  assert.deepEqual(cardTrophies(trophiesOf(sumOf({ fastest: 140 }), { first: true })).map(t => t.id), ['razzo', 'prima']);
  assert.ok(cardTrophies(all, 3).length <= 3);
  for (const t of allFirst){ assert.doesNotMatch(t.text, NEG, t.text); assert.ok(t.medal, t.id); }
});

test('B40.2: prossimo trofeo, il più vicino sotto il 50 % e detto in positivo', () => {
  // 143 km/h (già Razzo di bronzo): 12 all'argento (155) = 7,7 %; 6 Perfetti: 2 al Cecchino di bronzo (8) = 25 %
  const n = nextTrophy(sumOf({ fastest: 143, timing: { perfetto: 6 } }));
  assert.equal(n.id, 'razzo'); assert.equal(n.tier, 2); assert.equal(n.text, 'Prossimo trofeo: Razzo d’argento a 155 km/h · 12 km/h in più');
  const r = nextTrophy(sumOf({ fastest: 128, timing: { perfetto: 6 } }));
  assert.equal(r.id, 'razzo'); assert.equal(r.tier, 1); assert.equal(r.missing, 12);
  assert.equal(r.text, 'Prossimo trofeo: Razzo di bronzo a 140 km/h · 12 km/h in più');
  const c = nextTrophy(sumOf({ fastest: 60, timing: { perfetto: 5 } }));
  assert.equal(c.id, 'cecchino'); assert.equal(c.text, 'Prossimo trofeo: Cecchino di bronzo · 3 colpi Perfetti in più');
  // niente di vicino: consiglio gentile
  const t = nextTrophy(sumOf());
  assert.equal(t.id, 'cecchino'); assert.match(t.text, /anello diventa verde/);
  // computer del Player 2: niente Asso, Vincente, Muro
  assert.notEqual(nextTrophy(sumOf({ wall: 16 }), { guest: true })?.id, 'muro');
  assert.equal(nextTrophy(sumOf({ wall: 16 }))?.id, 'muro');
  // singolare
  assert.equal(nextTrophy(sumOf({ winners: 2 })).text, 'Prossimo trofeo: Vincente di bronzo · 1 vincente in più');
  for (const s of [sumOf({ fastest: 150 }), sumOf({ longest: 29 }), sumOf({ streak: 3 }), sumOf({ unreturned: 2 }), sumOf({ superOk: 0 }), sumOf({ wall: 40, gamesPlayed: 2 })]){
    const x = nextTrophy(s); assert.ok(x && NEAR.includes(x.id)); assert.doesNotMatch(x.text, NEG, x.text);
  }
});

test('B40.2: cornice della card (livello, fascia dello stesso schermo, due computer)', () => {
  assert.equal(frameOf({ mode: 'cpu', level: 'bambini' }), 'bambini');
  assert.equal(frameOf({ mode: 'cpu', level: 'casual' }), 'facile');
  assert.equal(frameOf({ mode: 'cpu', level: 'evento' }), 'evento');
  assert.equal(frameOf({ mode: 'cpu', level: 'pro' }), 'pro');
  assert.equal(frameOf({ mode: 'cpu', level: 'leggenda' }), 'leggenda');
  assert.equal(frameOf({ mode: 'split', band: 'bambino' }), 'bambini');
  assert.equal(frameOf({ mode: 'split', band: 'ragazzo' }), 'facile');
  assert.equal(frameOf({ mode: 'split', band: 'adulto' }), 'evento');
  assert.equal(frameOf({ mode: 'versus' }), 'evento');
});

test('B40.2: banco delle soglie deterministico (stesse righe due volte di seguito)', () => {
  const P = plan({ veloce: true }).map(g => ({ ...g, matches: 12 }));
  const a = P.flatMap(runGroup), b = P.flatMap(runGroup);
  assert.equal(a.length, 24);
  assert.deepEqual(a, b);
  assert.equal(tables(a), tables(b));
  for (const r of a){ assert.ok(r.gamesPlayed >= 1 && r.points + r.lost >= 4); assert.ok(r.unreturned >= r.aces); }
});
