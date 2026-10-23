// Campo aperto (richiesta del 23/10, docs/NATPF_DIAGNOSI_2026-10-23.md C3): con il solo tempo dentro la finestra si va da
// una riga all'altra, da tutte e due le parti (lungolinea pieno in ritardo, incrociato pieno in anticipo), il centro si
// sceglie con il tempo giusto, e il livello non cambia dove si può mandare la palla (cambia la precisione richiesta).
// Prima: il lungolinea pieno chiedeva anche il piatto (in ritardo al bordo della finestra il 57% della mira, a Leggenda il
// 43%): il 23/10 i dritti non sono mai andati oltre 1,7 m dal centro dalla parte del lungolinea.
import test from 'node:test';
import assert from 'node:assert/strict';
import { strokeOutcome, directionSpan } from '../src/natpf/natpf_stroke_outcome.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';

const LEVELS = ['casual', 'pro', 'leggenda', '1v1'];
const shot = (lv, o = {}) => strokeOutcome({ contact: 1, hitX: 0, quality: 1, contactY: 1, level: lv, ...o, intent: { shot: 'topspin', power: .6, depth: .6, rise: .25, face: 0, ...(o.intent || {}) } });

test('lungolinea e incrociato pieni con il solo tempo, da tutte e due le parti e da ogni posizione, a tutti i livelli', () => {
  for (const name of LEVELS){
    const lv = skillLevel(name), span = directionSpan(lv);
    for (const contact of [1, -1]) for (const hitX of [-2.5, 0, 2.5]){
      // in ritardo al bordo della finestra: lungolinea, dalla parte del lato del colpo
      const line = shot(lv, { contact, hitX, timing: -span, lateSpan: span }).x*contact;
      // in anticipo al bordo: incrociato, dalla parte opposta
      const cross = -shot(lv, { contact, hitX, timing: span, lateSpan: span }).x*contact;
      assert.ok(line > 3.2, `${name} lato ${contact} da ${hitX}: lungolinea a ${line.toFixed(2)} m dal centro`);
      assert.ok(cross > 3.2, `${name} lato ${contact} da ${hitX}: incrociato a ${cross.toFixed(2)} m dal centro`);
      assert.ok(line < 4.05 && cross < 4.05, `${name}: dentro le righe con il tempo giusto (${line}, ${cross})`);
    }
  }
});

test('stessa ampiezza del campo a tutti i livelli: il livello cambia la precisione, non dove va la palla', () => {
  const range = name => { const lv = skillLevel(name), span = directionSpan(lv); return [shot(lv, { timing: -span, lateSpan: span }).x, shot(lv, { timing: span, lateSpan: span }).x]; };
  const [l0, c0] = range('casual');
  for (const name of LEVELS){ const [l, c] = range(name); assert.ok(Math.abs(l - l0) < .05 && Math.abs(c - c0) < .05, `${name}: ${l}/${c} contro ${l0}/${c0}`); }
});

test('centro voluto: con il tempo giusto la palla va al centro; il colpo neutro va un poco incrociato (il più sicuro)', () => {
  for (const name of LEVELS){
    const lv = skillLevel(name), span = directionSpan(lv);
    for (const contact of [1, -1]){
      const xs = Array.from({ length: 81 }, (_, i) => -span + 2*span*i/80).map(timing => shot(lv, { contact, timing, lateSpan: span }).x);
      assert.ok(xs.some(x => Math.abs(x) < .2), `${name} ${contact}: nessun tempo dà il centro (${Math.min(...xs.map(Math.abs)).toFixed(2)})`);
      const neutral = shot(lv, { contact, timing: 0, lateSpan: span }).x*contact;
      assert.ok(neutral < 0 && neutral > -1, `${name} ${contact}: colpo neutro a ${neutral.toFixed(2)} (un poco incrociato)`);
    }
  }
});

test('il piatto corregge poco: a tempo neutro sposta la palla al più di un metro e mezzo, e non scavalca il tempo', () => {
  const lv = skillLevel('pro'), span = directionSpan(lv);
  const base = shot(lv, { timing: 0, lateSpan: span }).x, right = shot(lv, { timing: 0, lateSpan: span, intent: { face: 1 } }).x, left = shot(lv, { timing: 0, lateSpan: span, intent: { face: -1 } }).x;
  assert.ok(Math.abs(right - base) < 1.5 && Math.abs(left - base) < 1.5 && right > base && left < base, `${left} ${base} ${right}`);
  // incrociato pieno con il piatto tutto verso il lungolinea: resta incrociato
  assert.ok(shot(lv, { timing: span, lateSpan: span, intent: { face: 1 } }).x < -1.5);
});

test('profondità dall\'intensità rispetto al proprio colpo tipico imparato giocando (C4): più forte del solito va più in fondo, più morbido più corto', async () => {
  const { simPhone } = await import('./phone-sim.mjs');
  const { powerRefs } = await import('../src/natpf/natpf_phone_racket.js');
  assert.deepEqual(powerRefs({ ref: 150, rawRef: 180 }, null), { ref: 150, rawRef: 180 });
  assert.deepEqual(powerRefs({ ref: 150, rawRef: 180 }, 700), { ref: 700, rawRef: null });
  assert.deepEqual(powerRefs({ simple: true, ref: 150 }, null), { ref: null, rawRef: null });
  // calibrazione con colpetti piccoli (come il 23/10), poi lo scambio con il proprio colpo a ~700 °/s
  const p = simPhone({ hand: 'right', seed: 21, shape: true });
  p.rest(500, 3); p.calibrate({ tremor: 3, peak: 260 });
  const hit = peak => { const n0 = p.msgs.length; p.swing({ tremor: 4, axis: [0, 1, 0], peak }); p.rest(700, 4); return p.msgs.slice(n0).map(d => p.game(d).ev).at(-1).natpf.intent; };
  const first = [hit(700), hit(950), hit(450)];                 // prima del colpo tipico: riferimento della calibrazione
  for (let i = 0; i < 4; i++) hit(700);
  const typ = hit(700), strong = hit(950), soft = hit(450);
  assert.ok(strong.depth - typ.depth > .1 && typ.depth - soft.depth > .1, `con il colpo tipico: morbido ${soft.depth}, solito ${typ.depth}, forte ${strong.depth}`);
  // con il riferimento dei colpetti la parte relativa della forza era piena: le differenze erano metà
  assert.ok((strong.depth - soft.depth) > 1.3*(first[1].depth - first[2].depth), `prima ${first[2].depth}…${first[1].depth}, ora ${soft.depth}…${strong.depth}`);
  assert.ok(typ.depth > .4 && typ.depth < .6, `il proprio colpo solito cade a metà campo-fondo: ${typ.depth}`);
});
