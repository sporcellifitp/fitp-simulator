// Impugnatura di taglio (richiesta del 23/10): telefono come il manico, il palmo sui lati lunghi, il display verso
// destra o verso sinistra invece che verso chi gioca. È il telefono ruotato di 90° attorno al proprio lato lungo: verso
// del colpo, lato (dritto/rovescio) e tipo di colpo devono restare quelli della presa di riferimento, per destri e
// mancini, con il telefono dritto o inclinato in avanti, con la calibrazione fatta nella stessa presa. Telefono
// simulato completo (test/phone-sim.mjs: stessa catena della pagina del telefono e del computer).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simPhone } from './phone-sim.mjs';

const GRIPS = [[0, 'display verso di sé (riferimento)'], [90, 'display a destra'], [-90, 'display a sinistra']];
// la serie di gesti: dritti e rovesci normali, un dritto in salita (top spin), un rovescio in discesa (tagliato), un
// pallonetto (braccio che sale con lo swing verticale). Gesti descritti nel campo, come si vedono da fuori
function play(hand, yaw, tilt){
  const p = simPhone({ hand, seed: 11, shape: true }), fh = hand === 'left' ? -1 : 1;
  p.pose([0, 1, 0], yaw); if (tilt) p.pose([1, 0, 0], -tilt); p.rest(500, 4);
  p.calibrate({ tremor: 4 });
  const tilted = (dir, rise) => [0, Math.cos(rise*Math.PI/180)*dir, Math.sin(rise*Math.PI/180)*dir];
  const gestures = [
    ['dritto', { axis: [0, fh, 0], peak: 750 }], ['dritto', { axis: [0, fh, 0], peak: 900 }],
    ['rovescio', { axis: [0, -fh, 0], peak: 700 }], ['rovescio', { axis: [0, -fh, 0], peak: 850 }],
    ['dritto in salita', { axis: tilted(fh, 30), peak: 800, vy: 4 }],
    ['rovescio in discesa', { axis: tilted(-fh, -35), peak: 800, vy: -14 }],
  ];
  const n0 = p.msgs.length;
  for (const [, g] of gestures){ p.swing({ tremor: 6, ...g }); p.rest(700, 5); }
  const out = p.msgs.slice(n0).map(d => p.game(d).ev);
  return { names: gestures.map(g => g[0]), out };
}

test('impugnatura di taglio: display a destra o a sinistra, destri e mancini, dritto o inclinato: stessi lati e stessi colpi della presa di riferimento', () => {
  for (const hand of ['right', 'left']) for (const tilt of [0, 35]){
    const ref = play(hand, 0, tilt);
    assert.equal(ref.out.length, ref.names.length, `${hand} ${tilt}°: riferimento, ${ref.out.length} colpi`);
    assert.deepEqual(ref.out.map(e => e.side), ['forehand', 'forehand', 'backhand', 'backhand', 'forehand', 'backhand'], `${hand} ${tilt}°`);
    for (const [yaw, label] of GRIPS.slice(1)){
      const g = play(hand, yaw, tilt), tag = `${hand}, ${label}, inclinato ${tilt}°`;
      assert.equal(g.out.length, ref.out.length, `${tag}: ${g.out.length} colpi`);
      assert.deepEqual(g.out.map(e => e.side), ref.out.map(e => e.side), tag);
      assert.deepEqual(g.out.map(e => e.natpf.shot), ref.out.map(e => e.natpf.shot), `${tag}: ${g.out.map(e => e.natpf.shot)} invece di ${ref.out.map(e => e.natpf.shot)}`);
      // la forza non cambia con la presa (stesso gesto, stessa velocità del telefono)
      g.out.forEach((e, i) => assert.ok(Math.abs(e.natpf.intent.power - ref.out[i].natpf.intent.power) < .05, `${tag} ${g.names[i]}: forza ${e.natpf.intent.power} contro ${ref.out[i].natpf.intent.power}`));
    }
  }
});

test('impugnatura di taglio: i colpi normali restano normali (né pallonetti né palle corte) e il dritto in salita resta top spin', () => {
  for (const hand of ['right', 'left']) for (const yaw of [90, -90]){
    const { names, out } = play(hand, yaw, 0);
    out.forEach((e, i) => {
      if (/^(dritto|rovescio)$/.test(names[i])) assert.ok(['topspin', 'flat'].includes(e.natpf.shot), `${hand} ${yaw}° ${names[i]}: ${e.natpf.shot}`);
    });
    assert.equal(out[4].natpf.shot, 'topspin', `${hand} ${yaw}°: dritto in salita ${out[4].natpf.shot}`);
    assert.ok(['slice', 'drop'].includes(out[5].natpf.shot), `${hand} ${yaw}°: rovescio in discesa ${out[5].natpf.shot}`);
  }
});
