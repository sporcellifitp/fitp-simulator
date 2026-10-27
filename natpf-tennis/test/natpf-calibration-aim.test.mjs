// Riferimento assoluto della calibrazione fino al primo colpo, non soltanto il modello isolato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { faceReference } from '@natpf/tennis/face-tracker.js';
import { NatpfPhoneRacket, natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';
import { createAimModel } from '../src/natpf/natpf_gestures.js';
import { simPhone } from './phone-sim.mjs';

test('calibrazione vera: il primo colpo ha la mira, nei due versi e con entrambe le mani', () => {
  for (const hand of ['right', 'left']){
    const p = simPhone({ hand, seed: 21, shape: true }); p.calibrate({ tremor: 3 });
    const phone = new NatpfPhoneRacket({ playerRole: 'p1' }); phone.setHand(hand);
    phone._onCal({ kind: 'done', profile: p.det.profile });
    phone._sendGrip(); // il normale tick dopo la conferma non deve cancellare il riferimento appena imparato
    for (const dir of [1, -1]){
      const heading = p.det.profile.faceRef?.[dir]?.heading;
      assert.ok(Number.isFinite(heading), `${hand} ${dir}: heading della calibrazione`);
      assert.equal(phone.aimModel.center(dir), heading);
      const swing = { dir, peak: 700, rawPeak: 700, angle: 90, shape: { rise: .1, plane: .9, tilt: 0, speed: 1 } };
      const read = delta => natpfSwingToEngine({ ...swing, heading: heading + delta }, { hand, aimModel: phone.aimModel }).natpf;
      assert.equal(read(0).intent.face, 0);
      assert.ok(read(15).intent.face > .35 && read(-15).intent.face < -.35, `${hand} ${dir}: mira dal primo colpo`);
      assert.equal(read(0).shot, 'topspin', 'un gesto normale non diventa un pallonetto');
      const side = natpfSwingToEngine({ ...swing, heading }, { hand, aimModel: phone.aimModel }).side;
      assert.equal(side, dir === (hand === 'left' ? -1 : 1) ? 'forehand' : 'backhand');
    }
  }
});

test('heading circolare separato dalla rotazione dello swing: +179 e −179 non diventano zero', () => {
  const ref = faceReference([
    { dir: 1, yaw: -12, pitch: 0, abs: 179, angle: 40 },
    { dir: 1, yaw: -10, pitch: 0, abs: -179, angle: 40 },
    { dir: -1, yaw: 15, pitch: 0, abs: 30, angle: 40 },
  ]);
  assert.equal(Math.abs(ref[1].heading), 180);
  assert.equal(ref[1].yaw, -11);
  assert.equal(ref[-1].heading, 30);
  const model = createAimModel(); model.seed(1, ref[1].heading);
  assert.ok(Math.abs(model.aim(1, -179).dev) <= 1);
});

test('inversione della calibrazione: piatto, heading e altezza seguono il verso invertito', () => {
  const p = simPhone({ shape: true }); p.calibrate();
  const before = structuredClone(p.cal.state.profile);
  p.cal.invert();
  for (const field of ['faceRef', 'heads', 'rises']){
    assert.deepEqual(p.cal.state.profile[field]?.[1], before[field]?.[-1], field);
    assert.deepEqual(p.cal.state.profile[field]?.[-1], before[field]?.[1], field);
  }
});

test('ricalibrazione e Salta: nessun heading del profilo precedente viene riusato', () => {
  const phone = new NatpfPhoneRacket({ playerRole: 'p2' });
  const done = profile => phone._onCal({ kind: 'done', profile: { version: 4, hand: 'right', ...profile } });
  done({ faceRef: { 1: { heading: 20 }, '-1': { heading: -30 } } });
  assert.equal(phone.aimModel.center(-1), -30);
  done({ faceRef: { 1: { heading: 40 } } });
  assert.equal(phone.aimModel.center(1), 40); assert.equal(phone.aimModel.center(-1), null);
  done({ simple: true, faceRef: { 1: { heading: 90 } } });
  assert.equal(phone.aimModel.center(1), null);
  // Vecchi telefoni: yaw relativo non è un sostituto dell'heading assoluto.
  done({ faceRef: { 1: { yaw: 25 } } });
  assert.equal(phone.aimModel.center(1), null);
  for (const heading of [2, 3, 4]) phone.aimModel.add(1, heading);
  assert.equal(phone.aimModel.center(1), 3);
});

test('nuovo collegamento: una pagina con frame nuovo non eredita la mira del telefono precedente', () => {
  const phone = new NatpfPhoneRacket({ playerRole: 'p1' });
  phone.link = { connected: true, L: { joins: 1 }, send(){}, cmd(){} };
  phone._onCal({ kind: 'done', profile: { hand: 'right', faceRef: { 1: { heading: 40 } } } });
  assert.equal(phone.aimModel.center(1), 40);
  phone.link.L.joins = 2; phone._sendGrip();
  assert.equal(phone.aimModel.center(1), null);
});

test('primi colpi mirati ripetuti: il centro seminato non insegue il bersaglio voluto', () => {
  for (const dir of [1, -1]){
    const model = createAimModel(); model.seed(dir, 20);
    for (let i = 0; i < 5; i++){
      const ev = natpfSwingToEngine({ dir, peak: 700, angle: 90, heading: 35, shape: { rise: .1, plane: .9 } }, { aimModel: model });
      assert.ok(ev.natpf.intent.face > .3, `colpo ${i + 1}: ${ev.natpf.intent.face}`);
      model.add(dir, 35);
    }
  }
});
